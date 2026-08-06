/**
 * Take an article off the site.
 *
 *   node scripts/retire-articles.mjs --dry
 *   node scripts/retire-articles.mjs
 *   node scripts/retire-articles.mjs --restore <slug>
 *
 * Sets status to 'removed', which every public query already filters on, so the
 * page 404s and drops out of the sitemap, the feeds and the category listings.
 * Nothing is deleted: the row stays, and --restore puts it back.
 *
 * WHEN THIS IS THE RIGHT ANSWER. Rarely. Fixing a weak article is almost always
 * better than removing it, because a URL that has been indexed has value and a
 * 404 throws it away. Retire only when the piece has no future worth fixing:
 *
 *   - it is a roundup of events that have all now happened, so there is nothing
 *     left for a reader to act on, AND
 *   - it has no independent sourcing to build on, so a rewrite would be a new
 *     article wearing an old URL.
 *
 * WHY IT CAME UP: AdSense refused the site for "Low value content" on 6 August
 * 2026. scripts/audit-thin.mjs found eleven articles written with zero
 * independent sources. Nine of those are about events still to come and are
 * worth rebuilding on real reporting. Two are roundups whose events finished in
 * July, so there is no article to save.
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

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const RESTORE = argv.includes('--restore') ? argv[argv.indexOf('--restore') + 1] : null;

// Each entry must carry a reason. If a reason cannot be written down, the
// article probably should not be going.
const RETIRE = [
  {
    slug: 'school-holiday-days-out-spalding-festival-free-walthamstow-fair',
    why: 'Roundup of four events dated 25 July, 30-31 July and 1 August 2026. All have happened. No independent source in the piece, so there is nothing to rebuild on.',
  },
  {
    slug: 'markets-worth-a-trip-rochester-princes-risborough-and-east-anglia',
    why: 'Led on two markets on Sunday 26 July 2026, both past. The two future dates it mentions are covered properly elsewhere. No independent source.',
  },
];

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');

if (RESTORE) {
  const doc = await col.findOne({ slug: RESTORE });
  if (!doc) { console.log(`no article with slug ${RESTORE}`); await mongoose.disconnect(); process.exit(1); }
  console.log(`${RESTORE}: status ${doc.status} -> published`);
  if (!DRY) await col.updateOne({ slug: RESTORE }, { $set: { status: 'published' } });
  console.log(DRY ? '[dry] nothing written.' : 'restored.');
  await mongoose.disconnect();
  process.exit(0);
}

let missing = 0;
const staged = [];
for (const r of RETIRE) {
  const doc = await col.findOne({ slug: r.slug }, { projection: { slug: 1, category: 1, status: 1, title: 1 } });
  if (!doc) { console.log(`MISSING ${r.slug}`); missing += 1; continue; }
  if (doc.status !== 'published') { console.log(`SKIP    ${r.slug} (already ${doc.status})`); continue; }
  console.log(`\n/${doc.category}/${doc.slug}`);
  console.log(`   ${doc.title}`);
  console.log(`   reason: ${r.why}`);
  staged.push(doc);
}

if (missing) { console.log(`\nABORTED: ${missing} slug(s) not found. Nothing written.`); await mongoose.disconnect(); process.exit(1); }
if (!staged.length) { console.log('\nnothing to do.'); await mongoose.disconnect(); process.exit(0); }

console.log(`\n${staged.length} article(s) would 404 and leave the sitemap, feeds and category pages.`);
if (DRY) { console.log('[dry] nothing written.'); await mongoose.disconnect(); process.exit(0); }

for (const d of staged) {
  await col.updateOne({ _id: d._id }, { $set: { status: 'removed' } });
  console.log(`RETIRED /${d.category}/${d.slug}`);
}
console.log('\nReverse any of these with: node scripts/retire-articles.mjs --restore <slug>');
await mongoose.disconnect();
