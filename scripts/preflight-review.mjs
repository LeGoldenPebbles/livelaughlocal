/**
 * Is the LIVE SITE actually ready for an AdSense review?
 *
 *   node scripts/preflight-review.mjs
 *
 * Read-only. Requests the public site, slowly.
 *
 * WHY THIS EXISTS: every other audit in this repo reads MongoDB. A reviewer
 * reads livelaughlocal.co.uk. Those are not the same thing, because articles
 * publish through ISR (revalidate 300) behind a Cloudflare edge cache that
 * holds page HTML for five minutes. So a corpus that is perfect in the database
 * can still be served stale, and "we fixed it" is a claim about the wrong
 * system until someone fetches the page.
 *
 * Checks, in order of how badly each would go wrong:
 *   1. Every published article returns 200 and carries its current headline.
 *   2. Retired articles are gone (404), not quietly still live.
 *   3. No published page links to a URL that 404s.
 *   4. robots.txt does not block the site, and NOINDEX is off.
 *   5. Both sitemaps load and do not list retired articles.
 *
 * RATE LIMITS: the zone blocks an IP doing more than 20 page requests in 10
 * seconds, so every request here sleeps. This is slow on purpose. Do not
 * parallelise it.
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

const SITE = 'https://livelaughlocal.co.uk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(p) {
  await sleep(900); // stay well under 20 requests per 10 seconds
  try {
    const res = await fetch(SITE + p, { headers: { 'user-agent': UA }, redirect: 'manual' });
    const body = res.status < 400 ? await res.text() : '';
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: '', err: String(e.message || e).slice(0, 60) };
  }
}

const decode = (s) =>
  String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');
const live = await col.find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1, bodyHtml: 1 } }).toArray();
const retired = await col.find({ status: 'removed' }, { projection: { slug: 1, category: 1 } }).toArray();
await mongoose.disconnect();

const problems = [];
console.log(`checking ${live.length} published article(s) against the live site, slowly\n`);

// 1. Every article loads and shows its CURRENT headline.
let stale = 0;
for (const a of live) {
  const p = `/${a.category}/${a.slug}`;
  const r = await get(p);
  if (r.status !== 200) {
    problems.push(`${r.status || r.err} ${p}`);
    console.log(`  ${String(r.status).padEnd(3)} ${p}  <-- NOT 200`);
    continue;
  }
  // The <title> is built from metaTitle, so compare against the headline in
  // the body instead: a stale edge copy shows the OLD headline.
  const headline = decode((r.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const want = a.title.replace(/\s+/g, ' ').trim();
  if (headline && headline !== want) {
    stale += 1;
    problems.push(`stale headline ${p}`);
    console.log(`  STALE ${p}`);
    console.log(`        live: ${headline.slice(0, 78)}`);
    console.log(`        db  : ${want.slice(0, 78)}`);
  }
}
console.log(`\n1. articles serving current content : ${live.length - stale}/${live.length}`);

// 2. Retired articles must be gone.
let stillUp = 0;
for (const a of retired) {
  const r = await get(`/${a.category}/${a.slug}`);
  if (r.status === 200) { stillUp += 1; problems.push(`retired but still 200: /${a.category}/${a.slug}`); }
}
console.log(`2. retired articles returning 404    : ${retired.length - stillUp}/${retired.length}`);

// 3. Internal links across the whole corpus must resolve.
const internal = new Set();
for (const a of live) {
  for (const m of String(a.bodyHtml).matchAll(/href="(\/[^"#?]*)"/g)) internal.add(m[1]);
}
let dead = 0;
for (const p of internal) {
  const r = await get(p);
  if (r.status >= 400) { dead += 1; problems.push(`dead internal link ${p} (${r.status})`); console.log(`  ${r.status} ${p}  <-- DEAD`); }
}
console.log(`3. internal links resolving          : ${internal.size - dead}/${internal.size}`);

// 4. Indexability.
const robots = await get('/robots.txt');
const blocksAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(robots.body);
const home = await get('/');
const noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(home.body);
console.log(`4. robots.txt allows crawling        : ${blocksAll ? 'NO  <-- BLOCKED' : 'yes'}`);
console.log(`   homepage is indexable             : ${noindex ? 'NO  <-- NOINDEX' : 'yes'}`);
if (blocksAll) problems.push('robots.txt disallows everything');
if (noindex) problems.push('homepage carries noindex');

// 5. Sitemaps.
for (const s of ['/sitemap.xml', '/news-sitemap.xml']) {
  const r = await get(s);
  const bad = retired.filter((a) => r.body.includes(a.slug));
  console.log(`5. ${s.padEnd(20)}             : ${r.status}${bad.length ? `  <-- lists ${bad.length} retired article(s)` : ''}`);
  if (r.status !== 200) problems.push(`${s} returned ${r.status}`);
  for (const b of bad) problems.push(`${s} still lists retired ${b.slug}`);
}

console.log('\n' + '='.repeat(64));
if (!problems.length) {
  console.log('READY. Nothing blocking found on the live site.');
} else {
  console.log(`NOT READY: ${problems.length} problem(s) on the LIVE site.\n`);
  for (const p of problems) console.log('  ' + p);
}
process.exit(problems.length ? 1 : 0);
