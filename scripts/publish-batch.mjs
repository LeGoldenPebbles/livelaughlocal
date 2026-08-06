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
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sanitizeBody } from '../lib/sanitize.js';
import { CATEGORY_SLUGS } from '../lib/constants.js';
import os from 'node:os';
import { checkQuote, normaliseText, stripHtml, pdfToText, isUsableText } from '../lib/quoteCheck.js';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..');

const DRY = process.argv.includes('--dry');
const DRAFT = process.argv.includes('--draft');
const CHECK_LINKS = process.argv.includes('--check-links');
// Rewrite an article that already exists, rather than skipping it. Required to
// fix thin content in place without abandoning an indexed URL.
const UPDATE = process.argv.includes('--update');
const input = process.argv[2];
if (!input || input.startsWith('--')) {
  console.error(
    'usage: node scripts/publish-batch.mjs <articles.json> [--dry] [--draft] [--check-links] [--update]'
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

// Above this word count an article is a feature and must carry sourced quotes;
// below it, it is a short listing piece and legitimately has none.
const FEATURE_WORDS = 700;

const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br',
]);

// Must match the enum in models/Article.js.
const ARTICLE_TYPES = new Set(['news', 'listing', 'guide']);
const DEFAULT_TYPE = 'listing';

// Words too common in our headlines to say anything about whether two articles
// are the same story.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'what', 'when', 'where', 'how', 'why',
  'with', 'from', 'that', 'this', 'are', 'now', 'its', 'uk', 'plus', 'best',
  'guide', 'new', 'out', 'get', 'all', 'can', 'but', 'not', 'has', 'have',
]);

function titleWords(title) {
  return [
    ...new Set(
      String(title)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    ),
  ];
}

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

  // Which of the three this is drives the JSON-LD @type and whether it enters
  // the news sitemap, so a typo must not silently fall back to the default.
  // Absent is tolerated (it defaults to a listing, the safe option); wrong is
  // not.
  if (a.articleType && !ARTICLE_TYPES.has(a.articleType)) {
    errors.push(
      `articleType "${a.articleType}" is not one of: ${[...ARTICLE_TYPES].join(', ')}`
    );
  } else if (!a.articleType) {
    warnings.push(`no articleType, treating as "${DEFAULT_TYPE}" (not news, not in the news sitemap)`);
  }

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

  // A named, sourced quote is the thing a generic model cannot fake, so feature
  // articles need two. Short listing pieces ("market comes to X on Saturday")
  // legitimately have none: there is nobody to quote about a stall booking.
  // The threshold is what separates the two in practice.
  const quotes = (body.match(/<blockquote>/g) || []).length;
  if (words >= FEATURE_WORDS && quotes < 2) {
    errors.push(`${quotes} blockquote(s), at least 2 required for a feature`);
  }

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
  // `hero.keep` reuses the stored image on a rewrite; either that or a fresh
  // source URL, but one of them has to be there.
  if (!a.hero?.directUrl && !a.hero?.keep) errors.push('no hero image');
  if (!a.heroAlt || a.heroAlt.trim().length < 10) errors.push('hero alt text missing or too short');
  if (a.heroAlt && a.heroAlt.length > 160) errors.push(`heroAlt ${a.heroAlt.length} chars, max 160`);
  if (a.hero?.directUrl && !a.hero?.licence) warnings.push('hero has no licence recorded');

  const external = [...body.matchAll(/href="(https?:\/\/[^"]*)"/g)].map((m) => m[1]);
  if (external.length < 3) warnings.push(`${external.length} outbound link(s), target 3 to 6`);

  const internal = [...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
  if (internal.length < 2) warnings.push(`${internal.length} internal link(s), target 2 to 4`);

  // Conflict of interest, and the distinction matters.
  //
  // A link to the Spaces Please HOMEPAGE is promotion of our owner's commercial
  // product, so one per article at most. That is the thing Google's policy on
  // "sponsored content presented as independent editorial" is about.
  //
  // A link to a specific /events/<slug> page is a CITATION. When a listings
  // article says a market is on this Saturday, the event page is the source,
  // exactly as an organiser's own site would be for any other event. Capping
  // those would mean sourcing our claims worse, not better.
  const spLinks = [...body.matchAll(/href="https:\/\/spacesplease\.com([^"]*)"/g)].map((m) => m[1]);
  const promo = spLinks.filter((p) => !p.startsWith('/events/')).length;
  if (promo > 1) {
    errors.push(`Spaces Please homepage linked ${promo} times, maximum is 1 (event-page citations are unlimited)`);
  }

  if (a.metaDesc && (a.metaDesc.length < 120 || a.metaDesc.length > 160)) {
    warnings.push(`metaDesc ${a.metaDesc.length} chars, target 140 to 158`);
  }

  return { errors, warnings, external };
}

// Statuses that mean "this server does not like robots", NOT "this page is
// gone". Blocking a publish on these produces false failures: the Science
// Museum returns 405 to an automated GET on a page that loads perfectly in a
// browser, and Cloudflare-fronted sites routinely return 403.
const BOT_BLOCKED = new Set([401, 403, 405, 429, 503, 999]);

/**
 * Fetch a cited page as normalised text, so quotes can be checked against it.
 * Cached per run: the same source usually backs several quotes in one article.
 *
 * curl gets --fail deliberately. Without it curl exits 0 on a 403 and hands
 * back the error page, which reads as "source loaded, quote absent" and turns
 * a correct quotation into a confident accusation of fabrication.
 */
const sourceTextCache = new Map();
async function loadSourceText(u) {
  if (sourceTextCache.has(u)) return sourceTextCache.get(u);
  let out = { ok: false, text: '', why: '' };
  try {
    const res = await fetch(u, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      // Council committee papers, budgets and pitch-fee schedules are PDFs, and
      // they are the best primary sources a local story has. Treating them as
      // unreadable would report a sound council quotation as fabricated and
      // train writers away from the strongest sourcing available to them.
      if (/pdf/i.test(res.headers.get('content-type') || '')) {
        const tmp = path.join(os.tmpdir(), `lll-src-${crypto.createHash('sha1').update(u).digest('hex').slice(0, 16)}.pdf`);
        try {
          fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
          const t = await pdfToText(tmp);
          out = t
            ? { ok: true, text: ` ${normaliseText(t)} `, why: '' }
            : { ok: false, text: '', why: 'PDF text could not be extracted' };
        } finally {
          try { fs.unlinkSync(tmp); } catch { /* best effort */ }
        }
      } else {
        const txt = normaliseText(stripHtml(await res.text()));
        out = isUsableText(txt)
          ? { ok: true, text: ` ${txt} `, why: '' }
          : { ok: false, text: '', why: `HTTP ${res.status} but only ${txt.length} chars of text` };
      }
    } else out.why = `HTTP ${res.status}`;
  } catch (err) {
    out.why = String(err.message || err).slice(0, 60);
  }
  if (!out.ok) {
    try {
      const html = execFileSync(
        'curl',
        ['-s', '--fail', '-L', '--max-time', '30', '-A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '-H', 'Accept: text/html,application/xhtml+xml,*/*', u],
        { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      const txt = html ? normaliseText(stripHtml(html)) : '';
      if (isUsableText(txt)) out = { ok: true, text: ` ${txt} `, why: '' };
      else out.why += ' (curl returned too little text)';
    } catch {
      out.why += ' (curl also failed)';
    }
  }
  sourceTextCache.set(u, out);
  return out;
}

async function checkLinks(urls) {
  const dead = [];
  const blocked = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) continue;
      // 404 and 410 are unambiguous: the page is not there.
      if (res.status === 404 || res.status === 410) dead.push(`${res.status} ${url}`);
      else if (BOT_BLOCKED.has(res.status)) blocked.push(`${res.status} ${url}`);
      else dead.push(`${res.status} ${url}`);
    } catch (err) {
      // Node's fetch is stricter about TLS than a browser is, and throws on
      // hosts that work fine in practice: cheesefestival.ticketsrv.co.uk threw
      // "fetch failed" while curl got a clean 200. Falling back to curl before
      // calling a link dead, because a false dead-link failure blocks a publish
      // for no reason and trains you to skip the check.
      const viaCurl = curlStatus(url);
      if (viaCurl >= 200 && viaCurl < 400) continue;
      if (viaCurl === 404 || viaCurl === 410) dead.push(`${viaCurl} ${url}`);
      else if (BOT_BLOCKED.has(viaCurl)) blocked.push(`${viaCurl} ${url}`);
      else dead.push(`unreachable ${url} (${err.message}${viaCurl ? `, curl ${viaCurl}` : ''})`);
    }
  }
  return { dead, blocked };
}

// Second opinion for hosts Node's fetch refuses to talk to. Returns 0 if curl
// is unavailable or also fails.
//
// The null device MUST be platform-correct. execFileSync runs curl.exe with no
// shell, so "/dev/null" reaches Windows curl as a literal path, curl fails to
// create \dev\null and exits 23 (write error) for EVERY url. That silently
// turned this whole fallback into a constant 0, so the thing it was written to
// prevent - a live page called dead because Node's fetch is fussier than curl -
// happened anyway. ukcraftfairs.com sends a header Node rejects with
// HPE_INVALID_HEADER_TOKEN while curl fetches it at 200, and the publish was
// blocked on it.
const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null';

function curlStatus(url) {
  try {
    const out = execFileSync(
      'curl',
      ['-s', '-o', NULL_DEVICE, '-w', '%{http_code}', '-L', '--max-time', '20',
       '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
       url],
      { encoding: 'utf8', timeout: 25000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

// Mirror of models/Article.js. Kept deliberately verbose: if the real model
// gains a constraint, this must gain it too, or we are back to writing rows the
// app cannot re-save.
const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dek: { type: String, required: true, trim: true, maxlength: 160 },
    heroImage: {
      url: String,
      alt: String,
      credit: String,
      social: { url: String, width: Number, height: Number },
    },
    bodyHtml: { type: String, required: true },
    articleType: { type: String, enum: [...ARTICLE_TYPES], default: DEFAULT_TYPE },
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

async function put(key, body) {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `https://${env.R2_PUBLIC_HOST}/${key}`;
}

/**
 * Rehost the hero into R2 at a sane size, AND build the 1200x630 share card.
 *
 * The card is not optional. Facebook renders a large image card only above
 * 600x315 and wants 1.91:1; article heroes are whatever shape the photograph
 * happened to be, and portrait or square ones get demoted to a thumbnail or
 * dropped, which reads as "sharing does not pick up the image".
 */
async function rehost(slug, directUrl) {
  if (!directUrl) return null;

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

  // Too small to crop without turning to mush: letterbox onto brand paper.
  const bigEnough = meta.width >= 1000 && meta.height >= 525;
  const card = await (bigEnough
    ? sharp(inputBuf)
        .rotate()
        .resize({ width: 1200, height: 630, fit: 'cover', position: sharp.strategy.attention })
    : sharp(inputBuf).rotate().resize({
        width: 1200,
        height: 630,
        fit: 'contain',
        background: { r: 247, g: 242, b: 234, alpha: 1 },
      })
  )
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  console.log(
    `   hero ${meta.width}x${meta.height} ${(inputBuf.length / 1048576).toFixed(1)}MB` +
      ` -> max${MAX_WIDTH} ${(output.length / 1024).toFixed(0)}KB` +
      ` | share card 1200x630 ${bigEnough ? 'cover' : 'letterbox'} ${(card.length / 1024).toFixed(0)}KB`
  );
  if (DRY) return { url: `https://${env.R2_PUBLIC_HOST}/heroes/${slug} (dry)`, social: null };

  const rand = crypto.randomBytes(3).toString('hex');
  const url = await put(`heroes/${slug}-${rand}.jpg`, output);
  const socialUrl = await put(`social/${slug}-${rand}.jpg`, card);
  return { url, social: { url: socialUrl, width: 1200, height: 630 } };
}

const articles = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
await mongoose.connect(env.MONGODB_URI);

// Build the set of internal routes that actually resolve today, including the
// slugs in this batch so the batch may cross-link itself.
const live = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1, heroImage: 1 } })
  .toArray();
// Stored hero images, so `"hero": { "keep": true }` can carry one across a
// rewrite instead of re-uploading an identical picture under a new name.
const heroBySlug = new Map(live.map((d) => [d.slug, d.heroImage]));
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

  // Near-duplicate guard. An exact-slug check is not enough: a re-run that
  // regenerates the same commission produces a DIFFERENT slug for the same
  // story ("christmas-market-stall-applications..." vs "christmas-fair-stall-
  // applications..."), which would sail through and publish the same article
  // twice. That is textbook scaled-content abuse, self-inflicted.
  const overlap = live
    // An article is never a duplicate of itself. Re-publishing the same slug is
    // an UPDATE, which is how a weak piece gets rewritten in place, and without
    // this the guard makes the documented tool unusable for the exact job of
    // fixing thin content that AdSense objected to.
    .filter((d) => d.category === a.category && d.slug !== a.slug)
    .map((d) => {
      const mine = new Set(titleWords(a.title));
      const theirs = titleWords(d.title || '');
      if (!theirs.length) return { slug: d.slug, score: 0 };
      const shared = theirs.filter((w) => mine.has(w)).length;
      return { slug: d.slug, score: shared / Math.max(mine.size, theirs.length) };
    })
    .filter((x) => x.score >= 0.5)
    .sort((x, y) => y.score - x.score);
  if (overlap.length) {
    console.log(
      `   FAIL looks like a duplicate of /${a.category}/${overlap[0].slug}` +
        ` (${Math.round(overlap[0].score * 100)}% title overlap)`
    );
    failed += 1;
    continue;
  }

  // docs/NEWS_COMPLIANCE.md, enforced.
  const { errors, warnings, external } = complianceCheck(a, body);
  for (const w of warnings) console.log(`   warn ${w}`);
  if (CHECK_LINKS) {
    const { dead, blocked } = await checkLinks(external);
    for (const d of dead) errors.push(`dead outbound link: ${d}`);
    // Reported, never fatal. Spot-check these by hand if a batch looks off.
    for (const b of blocked) console.log(`   note bot-blocked, not verified: ${b}`);
    if (!dead.length) {
      console.log(
        `   OK ${external.length - blocked.length}/${external.length} outbound link(s) verified`
      );
    }

    // Every quotation must actually exist at a source this article cites.
    // This is the most important check in the file. A wrong word count is
    // cosmetic; inventing words and attributing them to a named, real person
    // is the one error that cannot be walked back, and it very nearly shipped
    // on 6 August 2026 from a research summary that paraphrased a CMA
    // executive and presented the paraphrase as a quotation.
    const quoted = [...body.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>/g)].map((m) =>
      stripHtml(m[1])
    );
    if (quoted.length && external.length) {
      let unresolved = 0;
      for (const q of quoted) {
        const r = await checkQuote(q, external, loadSourceText);
        const short = q.replace(/\s+/g, ' ').trim().slice(0, 80);
        if (r.verdict === 'FAIL') {
          errors.push(`quote not found at any cited source (${r.detail}): "${short}"`);
        } else if (r.verdict === 'WEAK') {
          errors.push(`quote only partly matches its source (${r.detail}): "${short}"`);
        } else if (r.verdict === 'UNCHECKED') {
          unresolved += 1;
          console.log(`   note quote UNVERIFIED, source unreadable: "${short}"`);
          console.log(`        ${r.detail}`);
        }
      }
      const ok = quoted.length - unresolved - errors.filter((e) => e.startsWith('quote')).length;
      console.log(`   OK ${ok}/${quoted.length} quote(s) found verbatim at a cited source`);
    } else if (quoted.length) {
      errors.push(`${quoted.length} quote(s) but no outbound sources to verify them against`);
    }
  }
  if (errors.length) {
    console.log('   FAIL compliance:');
    for (const e of errors) console.log(`      ${e}`);
    failed += 1;
    continue;
  }

  // Rewriting the words of an existing article should not churn its picture.
  // `"hero": { "keep": true }` carries the stored heroImage across untouched,
  // which matters for two reasons beyond saving an upload: the share card URL
  // stays stable so anything already shared keeps working, and the rewrite does
  // not need R2 write credentials at all.
  let hero = null;
  let keptHero = null;
  if (a.hero?.keep) {
    keptHero = heroBySlug.get(a.slug) || null;
    if (!keptHero?.url) {
      console.log(`   FAIL hero.keep set but no stored hero image found for ${a.slug}`);
      failed += 1;
      continue;
    }
    console.log(`   hero kept: ${keptHero.url.slice(0, 72)}`);
  } else {
    try {
      hero = await rehost(a.slug, a.hero?.directUrl);
    } catch (err) {
      console.log(`   FAIL ${err.message}`);
      failed += 1;
      continue;
    }
  }

  const doc = new Article({
    title: a.title,
    slug: a.slug,
    dek: a.dek,
    bodyHtml: body,
    articleType: a.articleType || DEFAULT_TYPE,
    category: a.category,
    locations: a.locations || [],
    tags: a.tags || [],
    byline: { name: 'Live Laugh Local team', kind: 'staff' },
    status: DRAFT ? 'draft' : 'published',
    origin: 'generated',
    emailConfirmed: false,
    viewCount: 0,
    seo: { metaTitle: a.metaTitle, metaDesc: a.metaDesc },
    ...(keptHero
      ? {
          heroImage: {
            url: keptHero.url,
            // Alt text and credit are words, so a rewrite may legitimately
            // improve them even when the picture stays.
            alt: a.heroAlt || keptHero.alt || '',
            credit: [a.hero?.credit, a.hero?.licence].filter(Boolean).join(', ') || keptHero.credit || '',
            // Landmine 8: `social` must be carried explicitly or Mongoose drops
            // it and every share reverts to the wrongly-shaped hero.
            ...(keptHero.social ? { social: keptHero.social } : {}),
          },
        }
      : hero
        ? {
            heroImage: {
              url: hero.url,
              alt: a.heroAlt || '',
              credit: [a.hero?.credit, a.hero?.licence].filter(Boolean).join(', '),
              ...(hero.social ? { social: hero.social } : {}),
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
  if (existing && !UPDATE) {
    console.log(`SKIP (slug exists): ${doc.slug}  [use --update to rewrite it]`);
    continue;
  }
  if (existing) {
    // Rewriting a published article in place. This is how a thin piece gets
    // fixed, and the alternative - a new slug - abandons an indexed URL and
    // leaves the weak page live, which is the opposite of the goal.
    //
    // publishedAt is deliberately NOT touched. Correcting or deepening an
    // article is not new information, and re-dating for freshness is exactly
    // the manipulation Google's policies name. Views and the original byline
    // stay with the URL too.
    const keep = ['publishedAt', 'viewCount', 'createdAt', 'origin', 'author', 'status'];
    const patch = {};
    for (const [k, v] of Object.entries(doc.toObject())) {
      if (k === '_id' || k === '__v' || keep.includes(k)) continue;
      patch[k] = v;
    }
    // Validate the merged result against the real model before writing, so an
    // update cannot do what a schemaless insert once did: pass here and then
    // break the admin's re-save later.
    existing.set(patch);
    await existing.validate();
    await existing.save();
    console.log(`UPDATED: /${existing.category}/${existing.slug}  (publishedAt and views preserved)`);
    continue;
  }
  await doc.save();
  console.log(`${DRAFT ? 'drafted' : 'PUBLISHED'}: /${doc.category}/${doc.slug}`);
}

await mongoose.disconnect();
