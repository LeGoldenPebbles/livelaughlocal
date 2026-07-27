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
const input = process.argv[2];
if (!input || input.startsWith('--')) {
  console.error('usage: node scripts/publish-batch.mjs <articles.json> [--dry] [--draft]');
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
