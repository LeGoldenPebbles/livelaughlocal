/**
 * Publish a batch of generated articles, safely.
 *
 *   node scripts/publish-batch.mjs <articles.json> [--dry] [--draft]
 *
 * WHY THIS EXISTS: an earlier batch was inserted with a strict:false schema,
 * which silently skipped Mongoose validation. One article went in with a
 * 161-character metaDesc against a 160 limit. It looked fine until the admin
 * tried to publish it, because the admin re-saves through the REAL model, which
 * rejected it with a generic 500. So this script validates against a mirror of
 * models/Article.js BEFORE writing anything.
 *
 * It also refuses to publish an article containing a broken internal link.
 * Writers have invented plausible routes like /events?location=cardiff that
 * 404 on this site, and a broken link in a published piece is worse than a
 * late one.
 *
 * Remote hero images are re-hosted into R2 at 1600px first, never left pointing
 * at the source. Full-size Wikimedia originals OOM-killed the service on
 * 26 July 2026: the image optimiser decodes the whole source into memory.
 *
 * Input JSON: array of objects with category, slug, title, dek, bodyHtml,
 * metaTitle, metaDesc, locations, tags, heroAlt and hero {directUrl, licence,
 * credit}.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sanitizeBody } from '../lib/sanitize.js';
import { CATEGORY_SLUGS } from '../lib/constants.js';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..');

const DRY = process.argv.includes('--dry');
const DRAFT = process.argv.includes('--draft');
const CHECK_LINKS = process.argv.includes('--check-links');
const input = process.argv[2];
if (!input || input.startsWith('--')) {
  console.error(
    'usage: node scripts/publish-batch.mjs <articles.json> [--dry] [--draft] [--check-links]'
  );
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);

const MAX_WIDTH = 1600;
const STATIC_ROUTES = new Set(['/', '/whats-on', '/submit', '/about', '/contact', '/terms', '/privacy', '/cookies', '/remove']);

const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br',
]);

/**
 * The mechanical half of docs/NEWS_COMPLIANCE.md.
 *
 * Everything checkable without judgement is checked here, because a rule that
 * lives only in a document is a rule that eventually gets skipped. Judgement
 * calls (is the headline honest, was the source really opened, does the article
 * belong in this category) still need a human or a verifying agent.
 *
 * Blockers abort the whole batch. Warnings print and continue.
 */
function complianceCheck(a, body) {
  const errors = [];
  const warnings = [];
  const text = body.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;

  // Google truncates news headlines past ~110 characters.
  if (a.title.length > 110) {
    errors.push(`title ${a.title.length} chars, over the 110 news-headline limit`);
  }
  const titleWords = a.title.split(/\s+/).filter(Boolean).length;
  if (titleWords < 2 || titleWords > 22) {
    warnings.push(`title is ${titleWords} words; Google's guidance is 2 to 22`);
  }

  if (words < 800 || words > 950) {
    (words < 700 || words > 1100 ? errors : warnings).push(`body is ${words} words, target 800 to 950`);
  }

  // A named, sourced quote is the thing a generic model cannot fake.
  const quotes = (body.match(/<blockquote>/g) || []).length;
  if (quotes < 2) errors.push(`${quotes} blockquote(s), at least 2 required`);

  const h2 = (body.match(/<h2>/g) || []).length;
  if (h2 < 3 || h2 > 5) warnings.push(`${h2} h2 headings, target 3 to 5`);

  const tags = new Set([...body.matchAll(/<\s*\/?\s*([a-zA-Z0-9]+)/g)].map((m) => m[1].toLowerCase()));
  const badTags = [...tags].filter((t) => !ALLOWED_TAGS.has(t));
  if (badTags.length) errors.push(`disallowed tags: ${badTags.join(', ')}`);

  const attrs = new Set([...body.matchAll(/<[a-z0-9]+\s+([a-zA-Z-]+)=/g)].map((m) => m[1]));
  const badAttrs = [...attrs].filter((x) => x !== 'href');
  if (badAttrs.length) errors.push(`disallowed attributes: ${badAttrs.join(', ')}`);

  // House style, and the owner has asked for this repeatedly.
  for (const [field, value] of Object.entries({
    title: a.title, dek: a.dek, metaTitle: a.metaTitle, metaDesc: a.metaDesc,
    heroAlt: a.heroAlt, bodyHtml: body,
  })) {
    if (/[–—]/.test(value || '')) errors.push(`em or en dash in ${field}`);
  }

  // Every article needs an image, and the image needs alt text.
  if (!a.hero?.directUrl) errors.push('no hero image');
  if (!a.heroAlt || a.heroAlt.trim().length < 10) errors.push('hero alt text missing or too short');
  if (a.heroAlt && a.heroAlt.length > 160) errors.push(`heroAlt ${a.heroAlt.length} chars, max 160`);
  if (a.hero?.directUrl && !a.hero?.licence) warnings.push('hero has no licence recorded');

  const external = [...body.matchAll(/href="(https?:\/\/[^"]*)"/g)].map((m) => m[1]);
  if (external.length < 3) warnings.push(`${external.length} outbound link(s), target 3 to 6`);

  const internal = [...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
  if (internal.length < 2) warnings.push(`${internal.length} internal link(s), target 2 to 4`);

  // Conflict of interest: one mention, not a drumbeat.
  const spMentions = (body.match(/spacesplease\.com/g) || []).length;
  if (spMentions > 1) errors.push(`Spaces Please linked ${spMentions} times, maximum is 1`);

  if (a.metaDesc && (a.metaDesc.length < 120 || a.metaDesc.length > 160)) {
    warnings.push(`metaDesc ${a.metaDesc.length} chars, target 140 to 158`);
  }

  return { errors, warnings, external };
}

async function checkLinks(urls) {
  const dead = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(20000),
      });
      // 403 is usually a WAF turning away a script, not a dead page. 404 and
      // 410 are real. Anything else 4xx/5xx is worth a look.
      if (res.status === 404 || res.status === 410) dead.push(`${res.status} ${url}`);
      else if (!res.ok && res.status !== 403) dead.push(`${res.status} ${url}`);
    } catch (err) {
      dead.push(`unreachable ${url} (${err.message})`);
    }
  }
  return dead;
}

// Mirror of models/Article.js. Kept deliberately verbose: if the real model
// gains a constraint, this must gain it too, or we are back to writing rows the
// app cannot re-save.
const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dek: { type: String, required: true, trim: true, maxlength: 160 },
    heroImage: { url: String, alt: String, credit: String },
    bodyHtml: { type: String, required: true },
    category: { type: String, enum: CATEGORY_SLUGS, required: true },
    locations: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    byline: {
      name: { type: String, default: 'Live Laugh Local team', trim: true, maxlength: 80 },
      kind: { type: String, enum: ['staff', 'contributor'], default: 'staff' },
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected', 'removed'],
      default: 'draft',
    },
    origin: { type: String, enum: ['generated', 'submission'], required: true },
    submitterEmail: { type: String, lowercase: true, trim: true },
    emailConfirmed: { type: Boolean, default: false },
    featured: { active: { type: Boolean, default: false }, until: Date, category: String },
    stripe: { customerId: String, paymentMethodId: String, checkoutSessionId: String, chargeId: String },
    seo: {
      metaTitle: { type: String, maxlength: 70 },
      metaDesc: { type: String, maxlength: 160 },
    },
    sourceEventIds: [String],
    rejectionReason: String,
    publishedAt: Date,
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'articles' }
);

const Article = mongoose.model('Article', ArticleSchema);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

async function rehost(slug, directUrl) {
  if (!directUrl) return null;
  if (new URL(directUrl).hostname === env.R2_PUBLIC_HOST) return directUrl;

  const res = await fetch(directUrl, {
    headers: { 'User-Agent': 'LiveLaughLocal/1.0 (hello@spacesplease.com)' },
  });
  if (!res.ok) throw new Error(`hero fetch ${res.status} for ${slug}`);
  const inputBuf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(inputBuf).metadata();
  const output = await sharp(inputBuf)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const key = `heroes/${slug}-${crypto.randomBytes(3).toString('hex')}.jpg`;
  console.log(
    `   hero ${meta.width}x${meta.height} ${(inputBuf.length / 1048576).toFixed(1)}MB` +
      ` -> max${MAX_WIDTH} ${(output.length / 1024).toFixed(0)}KB`
  );
  if (DRY) return `https://${env.R2_PUBLIC_HOST}/${key} (dry)`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: output,
      ContentType: 'image/jpeg',
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `https://${env.R2_PUBLIC_HOST}/${key}`;
}

const articles = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
await mongoose.connect(env.MONGODB_URI);

// Build the set of internal routes that actually resolve today, including the
// slugs in this batch so the batch may cross-link itself.
const live = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1 } })
  .toArray();
const valid = new Set([
  ...STATIC_ROUTES,
  ...CATEGORY_SLUGS.map((c) => `/${c}`),
  ...live.map((d) => `/${d.category}/${d.slug}`),
  ...articles.map((a) => `/${a.category}/${a.slug}`),
]);

let failed = 0;
const prepared = [];

for (const a of articles) {
  console.log(`\n${a.category}/${a.slug}`);
  const body = sanitizeBody(a.bodyHtml, { linkRel: 'none' });

  // Sanitising must not quietly eat the article.
  const before = a.bodyHtml.replace(/<[^>]+>/g, '').trim().length;
  const after = body.replace(/<[^>]+>/g, '').trim().length;
  if (after < before * 0.95) {
    console.log(`   FAIL sanitiser removed text: ${before} -> ${after} chars`);
    failed += 1;
    continue;
  }

  const broken = [...body.matchAll(/href="(\/[^"]*)"/g)]
    .map((m) => m[1])
    .filter((h) => !valid.has(h));
  if (broken.length) {
    console.log(`   FAIL broken internal links: ${broken.join(', ')}`);
    failed += 1;
    continue;
  }

  // docs/NEWS_COMPLIANCE.md, enforced.
  const { errors, warnings, external } = complianceCheck(a, body);
  for (const w of warnings) console.log(`   warn ${w}`);
  if (CHECK_LINKS) {
    const dead = await checkLinks(external);
    for (const d of dead) errors.push(`dead outbound link: ${d}`);
    if (!dead.length) console.log(`   OK ${external.length} outbound link(s) resolve`);
  }
  if (errors.length) {
    console.log('   FAIL compliance:');
    for (const e of errors) console.log(`      ${e}`);
    failed += 1;
    continue;
  }

  let heroUrl = null;
  try {
    heroUrl = await rehost(a.slug, a.hero?.directUrl);
  } catch (err) {
    console.log(`   FAIL ${err.message}`);
    failed += 1;
    continue;
  }

  const doc = new Article({
    title: a.title,
    slug: a.slug,
    dek: a.dek,
    bodyHtml: body,
    category: a.category,
    locations: a.locations || [],
    tags: a.tags || [],
    byline: { name: 'Live Laugh Local team', kind: 'staff' },
    status: DRAFT ? 'draft' : 'published',
    origin: 'generated',
    emailConfirmed: false,
    viewCount: 0,
    seo: { metaTitle: a.metaTitle, metaDesc: a.metaDesc },
    ...(heroUrl
      ? {
          heroImage: {
            url: heroUrl,
            alt: a.heroAlt || '',
            credit: [a.hero?.credit, a.hero?.licence].filter(Boolean).join(', '),
          },
        }
      : {}),
    ...(DRAFT ? {} : { publishedAt: new Date() }),
  });

  // The whole point: validate through the real constraints before writing.
  try {
    await doc.validate();
  } catch (err) {
    console.log('   FAIL validation:');
    for (const [field, e] of Object.entries(err.errors || {})) {
      console.log(`      ${field}: ${e.message}`);
    }
    failed += 1;
    continue;
  }

  console.log('   OK validated');
  prepared.push(doc);
}

if (failed) {
  console.log(`\nABORTED: ${failed} article(s) failed. Nothing written.`);
  await mongoose.disconnect();
  process.exit(1);
}

if (DRY) {
  console.log(`\n[dry run] ${prepared.length} article(s) would be written.`);
  await mongoose.disconnect();
  process.exit(0);
}

for (const doc of prepared) {
  const existing = await Article.findOne({ slug: doc.slug });
  if (existing) {
    console.log(`SKIP (slug exists): ${doc.slug}`);
    continue;
  }
  await doc.save();
  console.log(`${DRAFT ? 'drafted' : 'PUBLISHED'}: /${doc.category}/${doc.slug}`);
}

await mongoose.disconnect();
