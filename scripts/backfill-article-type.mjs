/**
 * One-off backfill of `articleType` across the existing corpus.
 *
 *   node scripts/backfill-article-type.mjs --dry   # show the plan, change nothing
 *   node scripts/backfill-article-type.mjs         # apply
 *
 * WHY: until 29 July 2026 every article on the site emitted NewsArticle JSON-LD
 * and every article published in the last 48 hours entered the Google News
 * sitemap. That was wrong for most of the corpus. A what's-on roundup is
 * time-bound, but nothing was announced in it, so it is not news. An evergreen
 * guide is not news by any reading. Only 7 of 39 published articles were.
 *
 * Claiming news volume we do not have is precisely the shape scaled-content
 * enforcement is calibrated to catch, so this is a correction, not a tidy-up.
 *
 * Classification is by hand, from each article's title and dek, using one test:
 * was something announced, confirmed, cancelled, priced, fined, closed or
 * consulted on, with a date attached? If not, it is not news.
 *
 * Safe to re-run. Idempotent. Kept in the repo as the record of how the corpus
 * was classified, not because it needs running again.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import mongoose from 'mongoose';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const DRY = process.argv.includes('--dry');
const TYPES = new Set(['news', 'listing', 'guide']);

// Something happened, and there is a date on it.
const NEWS = {
  'cloudflare-outage-uk-event-websites-down': 'a global outage, reported as it happened',
  'fireworks-ban-consultation-2026-dogs': 'government consultation opened 16 July 2026',
  'stubhub-hidden-fees-refunds-cma-fine': 'CMA fined StubHub and ordered refunds',
  'grassroots-ticket-levy-2026-music-venues': 'levy payout figures and a deadline that passed',
  'uk-nightlife-autumn-2026-club-closures-day-parties': 'closure figures and a measured sector shift',
  'cardiff-half-2026-sold-out-get-a-place': 'race sold out and went to ballot for the first time',
  'charing-cross-closure-how-to-get-to-your-london-event': 'a 22-day station closure was announced',
};

// The answer barely moves with the calendar.
const GUIDE = {
  'how-to-book-your-first-market-stall': 'step-by-step how-to',
  'crowdfund-a-local-event-fairs-and-markets': 'how crowdfunding an event works; its launch peg is long stale',
  'market-stall-public-liability-insurance-cost-2026': 'what cover costs and why organisers demand it',
  'card-payments-market-stall-2026-reader-fees-offline': 'card reader comparison',
  'uk-storm-season-2026-27-what-weather-cancels-an-event': 'what the warning levels mean for an event',
};

// Everything else is a listing: what is on, when, and what it costs.

for (const [slug, type] of [...Object.keys(NEWS).map((s) => [s, 'news']), ...Object.keys(GUIDE).map((s) => [s, 'guide'])]) {
  if (!TYPES.has(type)) throw new Error(`bad type ${type} for ${slug}`);
}

await mongoose.connect(process.env.MONGODB_URI);
const c = mongoose.connection.collection('articles');
const docs = await c.find({}, { projection: { slug: 1, title: 1, articleType: 1, status: 1 } }).toArray();

const plan = docs.map((d) => {
  const type = NEWS[d.slug] ? 'news' : GUIDE[d.slug] ? 'guide' : 'listing';
  const why = NEWS[d.slug] || GUIDE[d.slug] || 'what is on: no announcement, no news peg';
  return { slug: d.slug, status: d.status, from: d.articleType || '(unset)', to: type, why };
});

// A slug in the hand-written map that is not in the database means the map has
// gone stale, and a stale map silently misclassifies. Say so.
const known = new Set(docs.map((d) => d.slug));
const orphans = [...Object.keys(NEWS), ...Object.keys(GUIDE)].filter((s) => !known.has(s));

for (const type of ['news', 'guide', 'listing']) {
  const rows = plan.filter((p) => p.to === type);
  console.log(`\n${type.toUpperCase()} (${rows.length})`);
  for (const r of rows) {
    const change = r.from === r.to ? 'unchanged' : `${r.from} -> ${r.to}`;
    console.log(`  ${r.slug}`);
    console.log(`      ${r.why} [${change}]`);
  }
}

if (orphans.length) {
  console.log(`\nWARNING: ${orphans.length} slug(s) in the map are not in the database:`);
  for (const s of orphans) console.log(`   ${s}`);
}

const changes = plan.filter((p) => p.from !== p.to);
console.log(`\n${docs.length} article(s); ${changes.length} to change, ${plan.length - changes.length} already correct.`);

if (DRY) {
  console.log('[dry run] nothing written.');
} else {
  for (const r of changes) {
    await c.updateOne({ slug: r.slug }, { $set: { articleType: r.to } });
  }
  console.log(`written: ${changes.length}`);

  const after = await c.aggregate([{ $group: { _id: '$articleType', n: { $sum: 1 } } }]).toArray();
  console.log('now:', after.map((x) => `${x._id}=${x.n}`).join(' '));
}

await mongoose.disconnect();
