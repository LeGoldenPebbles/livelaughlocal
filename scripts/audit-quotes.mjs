/**
 * Does every published quote actually appear at a source the article cites?
 *
 *   node scripts/audit-quotes.mjs                 # audit the whole corpus
 *   node scripts/audit-quotes.mjs --slug foo-bar  # one article
 *   node scripts/audit-quotes.mjs --selftest      # prove the check can fail
 *
 * Read-only. Makes outbound requests to the sources our own articles cite.
 *
 * WHY THIS EXISTS: on 6 August 2026 a quote attributed to a named CMA executive
 * reached a final draft. The words appeared nowhere on the CMA's page. They had
 * come from a research summary that paraphrased and then presented the
 * paraphrase as a quotation. It was caught by hand, one page at a time, which
 * is not a control - it is luck.
 *
 * A fabricated quote attributed to a real, named person is the worst error this
 * publication can make. It is not a typo, it is putting words in someone's
 * mouth, and no correction fully undoes it. Everything else the publisher
 * checks - word counts, dashes, dead links - is cosmetic next to this.
 *
 * THE CHECK: normalise the quote and every page the article links to, then find
 * the longest run of consecutive words from the quote that appears verbatim in
 * one of those pages. A real quotation lands a long run. A paraphrase does not.
 *
 * It cannot prove a quote is fabricated - a source may be paywalled, may have
 * changed, or may block us. That is why the verdict for an unreachable source
 * is UNCHECKED, never PASS. UNCHECKED means a human still has to look.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFile } from 'node:child_process';
import mongoose from 'mongoose';
import { normaliseText as norm, stripHtml, checkQuote as checkQuoteShared, STRONG_RUN, WEAK_RUN } from '../lib/quoteCheck.js';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : null; };
const ONLY = argOf('slug');
const SELFTEST = argv.includes('--selftest');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';


const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * curl succeeds where node's fetch gets a 403 on several of the sites we cite
 * (IQ Magazine is the reliable example). The difference is the full set of
 * browser-ish headers curl sends, not the user agent alone. Since an
 * unreadable source costs us a real verdict, it is worth the extra process.
 */
function curlText(u) {
  return new Promise((resolve) => {
    execFile(
      'curl',
      // --fail matters: without it curl exits 0 on a 403 and hands back the
      // error page, which this script would then read as "source loaded, quote
      // absent" and report a correct quote as fabricated. womad.co.uk 403s even
      // a browser user agent, and that is exactly how it went wrong once.
      ['-s', '--fail', '-L', '--max-time', '30', '-A', UA,
        '-H', 'Accept: text/html,application/xhtml+xml,*/*',
        '-H', 'Accept-Language: en-GB,en;q=0.9', u],
      { maxBuffer: 40 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout || stdout.length < 200) return resolve(null);
        resolve(stdout);
      }
    );
  });
}

async function fetchText(u) {
  if (cache.has(u)) return cache.get(u);
  let out = { ok: false, text: '', why: '' };
  try {
    const res = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow' });
    if (res.ok) {
      const html = await res.text();
      out = { ok: true, text: ' ' + norm(stripHtml(html)) + ' ', why: '' };
    } else {
      out.why = `HTTP ${res.status}`;
    }
  } catch (e) {
    out.why = String(e.message || e).slice(0, 80);
  }

  if (!out.ok) {
    const html = await curlText(u);
    if (html) out = { ok: true, text: ' ' + norm(stripHtml(html)) + ' ', why: '' };
    else out.why += ' (curl also failed)';
  }

  cache.set(u, out);
  await sleep(1200); // be a good citizen; several of these are gov.uk
  return out;
}

async function checkQuote(quote, urls) {
  return checkQuoteShared(quote, urls, fetchText);
}

// ---------------------------------------------------------------------------

if (SELFTEST) {
  // A check nobody has tried to break is not a check. Feed it a known-good
  // quote and a known-bad one against the same real page and require that it
  // separates them. If this ever stops discriminating, the audit is decoration.
  const page = 'https://www.gov.uk/government/news/cma-orders-stubhub-uk-to-refund-customers-over-hidden-fees';
  const GOOD = 'Hitting customers with hidden fees is illegal. It is not fair to draw people in with what looks like a good deal';
  const BAD = 'Fans deserve to know exactly what they are paying upfront, without nasty surprises at the checkout.';

  // Third case, and the one that matters most in practice: a REAL quote whose
  // source blocks us. IQ Magazine 403s every non-browser client. The first
  // version of this script called that FAIL, which would have had us "fixing"
  // three correct quotes by deleting them.
  const BLOCKED = 'https://www.iqmagazine.com/2026/07/row-erupts-over-heritage-live-cancellation-following-refund-offers/';
  const REAL_BUT_BLOCKED =
    'Our position remains that responsibility for customer refunds rests with the promoter, since they have failed to return the ticket sale proceeds to us to enable this.';

  // And a source nothing can reach, to prove the UNCHECKED path still exists
  // now that curl covers the merely-bot-hostile ones.
  const DEAD = 'https://no-such-host-lll-quote-audit.invalid/page';
  // A real site that 403s BOTH fetch and curl. Without --fail on curl this one
  // came back as a confident FAIL against a quote that is very likely fine.
  const HARD_403 = 'https://womad.co.uk/new-2026-site/';

  console.log('SELF TEST\n');
  const good = await checkQuote(GOOD, [page]);
  const bad = await checkQuote(BAD, [page]);
  const blocked = await checkQuote(REAL_BUT_BLOCKED, [BLOCKED]);
  const dead = await checkQuote(GOOD, [DEAD]);
  const hard = await checkQuote('We are back and in a beautiful new home Neston Park near our own base in Real World Studios', [HARD_403]);

  console.log(`  real quote, readable source     -> ${good.verdict.padEnd(9)} ${good.detail}`);
  console.log(`  invented quote, same source     -> ${bad.verdict.padEnd(9)} ${bad.detail}`);
  console.log(`  real quote, fetch-403 source    -> ${blocked.verdict.padEnd(9)} ${blocked.detail.slice(0, 70)}`);
  console.log(`  real quote, unreachable source  -> ${dead.verdict.padEnd(9)} ${dead.detail.slice(0, 70)}`);
  console.log(`  real quote, 403-to-everything   -> ${hard.verdict.padEnd(9)} ${hard.detail.slice(0, 70)}`);

  const passed =
    good.verdict === 'PASS' &&
    (bad.verdict === 'FAIL' || bad.verdict === 'WEAK') &&
    blocked.verdict === 'PASS' &&
    dead.verdict === 'UNCHECKED' &&
    hard.verdict === 'UNCHECKED';
  console.log(
    `\n  ${passed
      ? 'OK - passes real quotes, fails invented ones, reads past a 403,\n       and still refuses to accuse a quote it genuinely could not read.'
      : 'BROKEN - this audit cannot be trusted.'}`
  );
  process.exit(passed ? 0 : 1);
}

await mongoose.connect(process.env.MONGODB_URI);
const q = { status: 'published' };
if (ONLY) q.slug = ONLY;
const rows = await mongoose.connection
  .collection('articles')
  .find(q, { projection: { slug: 1, category: 1, title: 1, bodyHtml: 1 } })
  .toArray();
await mongoose.disconnect();

const tally = { PASS: 0, WEAK: 0, FAIL: 0, UNCHECKED: 0, SKIP: 0 };
const problems = [];

for (const a of rows) {
  const body = String(a.bodyHtml || '');
  const quotes = [...body.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>/g)].map((m) => stripHtml(m[1]));
  if (!quotes.length) continue;
  const urls = [...new Set([...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))];

  const lines = [];
  for (const quote of quotes) {
    const r = await checkQuote(quote, urls);
    tally[r.verdict] += 1;
    if (r.verdict !== 'PASS') {
      lines.push(`    ${r.verdict.padEnd(9)} ${r.detail}\n      "${quote.replace(/\s+/g, ' ').trim().slice(0, 150)}"`);
      problems.push({ path: `/${a.category}/${a.slug}`, verdict: r.verdict, quote: quote.replace(/\s+/g, ' ').trim() });
    }
  }
  const flag = lines.length ? ' <-- CHECK' : '';
  console.log(`/${a.category}/${a.slug}  (${quotes.length} quote(s), ${urls.length} source(s))${flag}`);
  for (const l of lines) console.log(l);
}

console.log('\n' + '='.repeat(70));
console.log(`quotes checked: ${Object.values(tally).reduce((x, y) => x + y, 0)}`);
for (const [k, v] of Object.entries(tally)) if (v) console.log(`  ${k.padEnd(10)} ${v}`);
console.log('');
console.log('PASS      the words are on a page the article itself cites.');
console.log('WEAK      partial match. Usually a trimmed or stitched quote. Read it.');
console.log('FAIL      the words are not on any cited page. Treat as fabricated');
console.log('          until proven otherwise, and do not leave it live.');
console.log('UNCHECKED source unreachable from here. NOT a pass - check by hand.');

if (problems.length) {
  console.log(`\n${problems.length} quote(s) need a human. Worst first:`);
  const order = { FAIL: 0, UNCHECKED: 1, WEAK: 2, SKIP: 3 };
  problems.sort((x, y) => order[x.verdict] - order[y.verdict]);
  for (const p of problems.slice(0, 25)) console.log(`  ${p.verdict.padEnd(9)} ${p.path}`);
}
