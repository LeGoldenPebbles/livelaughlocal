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
const SELFTEST = process.argv.includes('--selftest');

// Our owner's marketplace. Citing it is legitimate sourcing for "this event is
// on", but a piece supported by nothing else has done no independent work.
const OWN = /spacesplease\.com|livelaughlocal\.co\.uk/i;

// Primary sources: the thing itself rather than someone's report of it.
//
// Statutory bodies, regulators and national institutions, by domain.
const AUTHORITATIVE =
  /(^|\.)gov\.uk$|legislation\.gov\.uk$|(^|\.)nhs\.uk$|(^|\.)police\.uk$|\.gov$|(^|\.)parliament\.uk$|(^|\.)metoffice\.gov\.uk$|(^|\.)food\.gov\.uk$|(^|\.)nationaltrust\.org\.uk$|(^|\.)english-heritage\.org\.uk$|(^|\.)nationalrail\.co\.uk$|(^|\.)networkrail\.co\.uk$|(^|\.)nationalhighways\.co\.uk$|(^|\.)london\.gov\.uk$|(^|\.)ac\.uk$|councils?\.|(^|\.)org\.uk$/i;

// Words that say nothing about which organisation a domain belongs to, so
// matching on them would make almost any link look like the subject's own site.
const GENERIC_TOKENS = new Set([
  'events', 'event', 'festival', 'festivals', 'market', 'markets', 'fair', 'fairs',
  'news', 'tickets', 'ticket', 'guide', 'visit', 'what', 'whats', 'best', 'free',
  'online', 'group', 'ltd', 'club', 'show', 'shows', 'york', 'live', 'local',
  'summer', 'autumn', 'winter', 'spring', 'christmas', 'halloween', 'about',
  'uk', 'com', 'co', 'org', 'net', 'www', 'https', 'http',
]);

/**
 * Is this domain the subject's OWN site?
 *
 * The docstring above has always said a named organiser counts as a primary
 * source, but the regex could only recognise government. So Network Rail on a
 * rail closure, Run 4 Wales on its own ballot and a farm's own site on its own
 * market were all being scored as if the piece had no primary sourcing at all.
 * That is the wrong way round: the organiser IS the primary source, and a
 * newspaper's report of the organiser is the secondary one.
 *
 * The test is deliberately conservative, and one substring match is NOT enough.
 * The first version of this accepted any shared word of four characters or
 * more, which made "dissexpress.co.uk" a primary source for a story set in
 * Diss: the town name is inside the local newspaper's name. The self-test below
 * caught it, which is the entire reason the self-test exists.
 *
 * So the matched words must account for at least half of the domain itself.
 * "pulhampatch" is entirely covered by "pulham" and "patch" from the slug, and
 * is the venue's own site. "dissexpress" is barely a third covered by "diss",
 * and is a newspaper reporting on it. Generic event vocabulary is excluded
 * throughout, or every listings site in the country would look primary.
 */
function isSubjectsOwnSite(domain, slug) {
  const host = domain.replace(/^www\./, '').replace(/\.(co\.uk|org\.uk|ac\.uk|gov\.uk|com|org|net|uk|io|events)$/i, '');
  if (!host) return false;
  const matched = new Set(
    slug
      .split('-')
      .filter((t) => t.length >= 4 && !GENERIC_TOKENS.has(t))
      .filter((t) => host.includes(t))
  );
  if (!matched.size) return false;
  const covered = [...matched].reduce((n, t) => n + t.length, 0);
  return covered / host.length >= 0.5;
}

if (SELFTEST) {
  // A loosened check that no longer discriminates is worse than the tight one
  // it replaced, because it reports the corpus as fine. Prove both directions.
  const cases = [
    // [domain, slug, should count as primary?, why]
    ['pulhampatch.co.uk', 'summer-market-comes-to-the-pulham-patch-near-diss-22-august', true, "the venue's own site"],
    ['cardiffhalfmarathon.co.uk', 'cardiff-half-2026-sold-out-get-a-place', true, "the event's own site"],
    ['networkrail.co.uk', 'charing-cross-closure-how-to-get-to-your-london-event', true, 'infrastructure owner'],
    ['www.gov.uk', 'anything-at-all', true, 'statutory'],
    ['timeout.com', 'charing-cross-closure-how-to-get-to-your-london-event', false, 'a magazine reporting it'],
    ['dissexpress.co.uk', 'summer-market-comes-to-the-pulham-patch-near-diss-22-august', false, 'local paper, not the subject'],
    ['eventbrite.co.uk', 'halloween-2026-uk-tickets-dates-prices-age-limits', false, 'generic ticketing platform'],
    ['festivalcalendar.uk', 'womad-neston-park-first-public-event', false, 'generic listings site'],
    ['theartnewspaper.com', 'free-museum-openings-autumn-2026', false, 'trade press, not the museum'],
    ['bbc.co.uk', 'ghana-party-in-the-park-crowd-surge-barnet', false, 'news report of the event'],
  ];
  let bad = 0;
  console.log('primary-source detection self-test\n');
  for (const [domain, slug, want, why] of cases) {
    const got = AUTHORITATIVE.test(domain) || isSubjectsOwnSite(domain, slug);
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${String(got).padEnd(5)} (want ${String(want).padEnd(5)}) ${domain.padEnd(28)} ${why}`);
  }
  console.log(`\n${bad ? `${bad} case(s) wrong - do not trust the auth column` : 'all cases correct'}`);
  process.exit(bad ? 1 : 0);
}

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
  const authoritative = external.filter((d) => AUTHORITATIVE.test(d) || isSubjectsOwnSite(d, a.slug));

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
