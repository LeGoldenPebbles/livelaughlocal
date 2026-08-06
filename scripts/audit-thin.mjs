/**
 * Which published articles look thin, and why?
 *
 *   node scripts/audit-thin.mjs            # ranked worst first
 *   node scripts/audit-thin.mjs --full     # every article, with the numbers
 *
 * Read-only, no network.
 *
 * WHY THIS EXISTS: on 6 August 2026 AdSense refused the site for "Low value
 * content" with 43 articles live. It was never about how many pages exist, so
 * the fix is not more pages, it is finding the pages that are padding and
 * dealing with them. Opinion is a bad way to pick those. This measures.
 *
 * WHAT IT MEASURES, and why each one matters:
 *
 *   sources     External domains the piece links to, EXCLUDING our own owner's
 *               marketplace. An article whose only support is the event listing
 *               it was written from has no independent reporting in it. That is
 *               the single strongest thin-content signal in this corpus.
 *   authority   How many of those are primary: gov.uk, legislation, councils,
 *               a named organiser, a regulator. News coverage of a source is
 *               not the source.
 *   facts       Density of checkable specifics: prices, dates, times, postcodes,
 *               proper nouns. Padding has a low rate; real reporting is dense.
 *   repeat      Share of the body sitting inside a repeated 8-word run. This is
 *               what restating the same detail three times to reach a word
 *               count actually looks like to a machine.
 *   quotes      Named, sourced voices.
 *
 * These are signals, not a verdict. A guide legitimately has fewer proper nouns
 * than a listing. Read the flagged pieces before touching them.
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
const FULL = process.argv.includes('--full');

// Our owner's marketplace. Citing it is legitimate sourcing for "this event is
// on", but a piece supported by nothing else has done no independent work.
const OWN = /spacesplease\.com|livelaughlocal\.co\.uk/i;

// Primary sources: the thing itself rather than someone's report of it.
const AUTHORITATIVE =
  /(^|\.)gov\.uk$|legislation\.gov\.uk$|(^|\.)nhs\.uk$|(^|\.)police\.uk$|\.gov$|(^|\.)parliament\.uk$|(^|\.)metoffice\.gov\.uk$|(^|\.)food\.gov\.uk$|(^|\.)nationaltrust\.org\.uk$|(^|\.)english-heritage\.org\.uk$|(^|\.)nationalrail\.co\.uk$|(^|\.)london\.gov\.uk$|councils?\.|(^|\.)org\.uk$/i;

const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function repeatedShare(words) {
  const N = 8;
  if (words.length < N * 2) return 0;
  const seen = new Map();
  for (let i = 0; i + N <= words.length; i += 1) {
    const k = words.slice(i, i + N).join(' ');
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(i);
  }
  const covered = new Set();
  for (const [, at] of seen) {
    if (at.length < 2) continue;
    for (const i of at) for (let j = i; j < i + N; j += 1) covered.add(j);
  }
  return covered.size / words.length;
}

await mongoose.connect(process.env.MONGODB_URI);
const rows = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1, bodyHtml: 1, articleType: 1 } })
  .toArray();
await mongoose.disconnect();

const scored = rows.map((a) => {
  const body = String(a.bodyHtml || '');
  const plain = text(body);
  const words = plain.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

  const hrefs = [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const domains = [...new Set(hrefs.map((h) => { try { return new URL(h).hostname.replace(/^www\./, ''); } catch { return null; } }).filter(Boolean))];
  const external = domains.filter((d) => !OWN.test(d));
  const authoritative = external.filter((d) => AUTHORITATIVE.test(d));

  const prices = (plain.match(/£\d/g) || []).length;
  const dates = (plain.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi) || []).length;
  const times = (plain.match(/\b\d{1,2}(am|pm|\.\d{2}(am|pm)?)\b/gi) || []).length;
  const postcodes = (plain.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/g) || []).length;
  // Proper nouns not at the start of a sentence: venues, towns, organisations.
  const propers = new Set((plain.match(/(?<![.!?]\s)(?<!^)\b[A-Z][a-z]{2,}\b/g) || []));

  const factCount = prices + dates + times + postcodes + propers.size;
  const per100 = words.length ? (factCount / words.length) * 100 : 0;
  const repeat = repeatedShare(words);
  const quotes = (body.match(/<blockquote>/g) || []).length;

  // Worst-first score. Weighted so the marketplace-only case dominates,
  // because that is the pattern the corpus actually suffers from.
  let risk = 0;
  if (external.length === 0) risk += 50;
  else if (external.length === 1) risk += 25;
  else if (external.length === 2) risk += 10;
  if (authoritative.length === 0) risk += 15;
  if (quotes < 2) risk += 10;
  if (per100 < 4) risk += 20;
  else if (per100 < 6) risk += 10;
  risk += Math.round(repeat * 60);
  if (words.length < 750) risk += 8;

  return {
    path: `/${a.category}/${a.slug}`,
    type: a.articleType || '?',
    words: words.length,
    ext: external.length,
    auth: authoritative.length,
    per100: Number(per100.toFixed(1)),
    repeat: Number((repeat * 100).toFixed(0)),
    quotes,
    risk,
    domains: external,
  };
});

scored.sort((a, b) => b.risk - a.risk);

console.log('risk  words  src auth facts/100w  repeat  quotes  article');
console.log('-'.repeat(96));
for (const s of FULL ? scored : scored.slice(0, 20)) {
  console.log(
    `${String(s.risk).padStart(4)}  ${String(s.words).padStart(5)}  ${String(s.ext).padStart(3)} ${String(s.auth).padStart(4)}  ${String(s.per100).padStart(9)}  ${String(s.repeat + '%').padStart(6)}  ${String(s.quotes).padStart(6)}  ${s.path}`
  );
}

const marketplaceOnly = scored.filter((s) => s.ext === 0);
console.log('\n' + '='.repeat(96));
console.log(`published                            ${scored.length}`);
console.log(`NO independent source at all         ${marketplaceOnly.length}  <-- the AdSense problem`);
console.log(`one independent source only          ${scored.filter((s) => s.ext === 1).length}`);
console.log(`no authoritative/primary source      ${scored.filter((s) => s.auth === 0).length}`);
console.log(`under two quotes                     ${scored.filter((s) => s.quotes < 2).length}`);
console.log(`10%+ of body inside repeated phrases ${scored.filter((s) => s.repeat >= 10).length}`);

if (marketplaceOnly.length) {
  console.log('\nWritten with no independent source. Fix these first:');
  for (const s of marketplaceOnly) console.log(`  ${String(s.words).padStart(4)}w  ${s.path}`);
}
