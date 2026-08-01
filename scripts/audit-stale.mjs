/**
 * Which published articles have gone out of date?
 *
 *   node scripts/audit-stale.mjs            # everything already stale
 *   node scripts/audit-stale.mjs --soon 14  # also what expires in 14 days
 *
 * Read-only.
 *
 * WHY THIS EXISTS: this is a what's-on magazine, so most of what it publishes
 * has an expiry date built in, and nothing was watching them. On 1 August 2026
 * the WOMAD piece still carried the headline "tickets are still available" and
 * a body saying the festival "is running right now" for an event that had ended
 * six days earlier. Nobody had done anything wrong; there was simply no way to
 * notice. An article that tells a reader an event is on when it is over is the
 * worst kind of error this site can make, because someone can act on it.
 *
 * The check: pull every date out of the title, dek and body, take the LATEST
 * one, and compare it to today. If the last date an article mentions has
 * passed, the piece is describing something finished. It then looks for
 * present-tense and on-sale phrasing, which is what turns a stale article from
 * a harmless archive piece into a wrong one.
 *
 * Heuristic on purpose. It flags for a human rather than deciding anything.
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

const soonIdx = process.argv.indexOf('--soon');
const SOON_DAYS = soonIdx !== -1 ? parseInt(process.argv[soonIdx + 1], 10) || 14 : 0;

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_RE = MONTHS.join('|');

// "26 September 2026", "26 September", "26 Sept" - year optional, inferred.
const DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_RE})\\b(?:\\s+(\\d{4}))?`, 'gi');

// Phrasing that makes a stale article actively wrong rather than merely old.
const LIVE_PHRASES = [
  /is running right now/i, /running right now/i, /\bis on now\b/i,
  /still on sale/i, /still available/i, /are still listed/i,
  /this weekend/i, /\btoday\b/i, /\btomorrow\b/i,
  /tickets are/i, /you can still/i, /before you set off/i,
  /opens? (?:on|its)/i, /returns? (?:on|to)/i, /takes place/i,
];

await mongoose.connect(process.env.MONGODB_URI);
const pub = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1, dek: 1, bodyHtml: 1, articleType: 1, publishedAt: 1 } })
  .toArray();
await mongoose.disconnect();

const today = new Date();
today.setHours(0, 0, 0, 0);
const soonCutoff = new Date(today.getTime() + SOON_DAYS * 86400000);

const rows = [];

for (const a of pub) {
  const text = `${a.title} ${a.dek} ${String(a.bodyHtml || '').replace(/<[^>]+>/g, ' ')}`;
  const dates = [];
  for (const m of text.matchAll(DATE_RE)) {
    const day = parseInt(m[1], 10);
    const month = MONTHS.indexOf(m[2].toLowerCase());
    // No year given: assume the year the article was published in.
    const year = m[3] ? parseInt(m[3], 10) : new Date(a.publishedAt || today).getFullYear();
    if (day < 1 || day > 31 || month < 0) continue;
    const d = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(d.getTime())) dates.push(d);
  }
  if (!dates.length) continue;

  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  const stale = latest < today;
  const expiringSoon = !stale && SOON_DAYS > 0 && latest <= soonCutoff;
  if (!stale && !expiringSoon) continue;

  const hits = LIVE_PHRASES.filter((re) => re.test(text)).length;
  rows.push({
    path: `/${a.category}/${a.slug}`,
    type: a.articleType || '(unset)',
    latest: latest.toISOString().slice(0, 10),
    daysPast: Math.round((today - latest) / 86400000),
    livePhrases: hits,
    stale,
  });
}

rows.sort((x, y) => y.daysPast - x.daysPast);

const staleRows = rows.filter((r) => r.stale);
const soonRows = rows.filter((r) => !r.stale);

console.log(`published ${pub.length} | last date already passed: ${staleRows.length}` +
  (SOON_DAYS ? ` | expiring within ${SOON_DAYS} days: ${soonRows.length}` : ''));

const show = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label}`);
  for (const r of list) {
    const flag = r.livePhrases >= 2 ? '  <-- reads as still live, FIX' : r.livePhrases === 1 ? '  <-- check wording' : '';
    const when = r.stale ? `${r.daysPast}d ago` : `in ${-r.daysPast}d`;
    console.log(`  ${r.latest}  (${when.padStart(8)})  ${r.type.padEnd(8)} ${r.path}${flag}`);
  }
};

show('ALREADY PAST', staleRows);
show('EXPIRING SOON', soonRows);

if (!rows.length) console.log('\nnothing dated has expired.');
else console.log('\nA past date is not automatically wrong: a listing can become a record.\n' +
  'It IS wrong when the piece still speaks in the present tense or says tickets\n' +
  'are on sale. Those are the lines marked above.');
