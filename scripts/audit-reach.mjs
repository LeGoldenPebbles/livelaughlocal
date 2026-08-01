/**
 * Is every published article actually reachable?
 *
 *   node scripts/audit-reach.mjs            # audit the live site
 *   node scripts/audit-reach.mjs --local    # audit http://localhost:3005
 *
 * Read-only. Answers a different question from audit-corpus.mjs: that one asks
 * whether an article is COMPLIANT, this one asks whether anyone can FIND it.
 *
 * An article can pass every compliance rule and still be invisible: off the end
 * of a capped feed, in a category nothing links to, or with no inbound internal
 * link from anywhere on the site. Orphaned pages get crawled late and rank badly,
 * and nothing in the build would ever complain.
 *
 * Checks, against the LIVE site rather than a local build, because SITE_URL is
 * localhost in dev and canonicals only look right in production:
 *
 *   1. every published article is in sitemap.xml
 *   2. every published article is linked from its own category page
 *   3. every active category is linked from the homepage
 *   4. inbound internal links per article (0 = orphan in the link graph)
 *   5. robots.txt does not disallow article paths
 *   6. how much of the corpus the homepage feed actually shows
 *
 * Requests are SEQUENTIAL with a small delay on purpose. A burst of concurrent
 * requests from one IP is what OOM-killed this service on 28 July 2026.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import mongoose from 'mongoose';
import { CATEGORIES } from '../lib/constants.js';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const BASE = process.argv.includes('--local')
  ? 'http://localhost:3005'
  : 'https://livelaughlocal.co.uk';

const UA = 'LiveLaughLocal-reach-audit/1.0 (hello@spacesplease.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(p) {
  const res = await fetch(`${BASE}${p}`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const body = await res.text();
  // Deliberate, and it must stay above the Cloudflare rate limit: the zone
  // blocks an IP doing more than 20 page requests in 10 seconds. At 250ms this
  // audit ran at 40 per 10s and would block itself halfway through.
  await sleep(700);
  return { status: res.status, body };
}

await mongoose.connect(process.env.MONGODB_URI);
const pub = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1, bodyHtml: 1 } })
  .toArray();
await mongoose.disconnect();

console.log(`auditing ${BASE}`);
console.log(`published articles: ${pub.length}\n`);

const problems = [];

/* 1. sitemap ---------------------------------------------------------- */
// sitemap.xml is ISR-cached for 30 minutes, so an article published inside that
// window is legitimately absent and will appear on its own. Reporting that as a
// fault sends someone hunting a bug that is a cache. Say which it is.
const sitemap = await get('/sitemap.xml');
const locs = new Set([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
const missingFromSitemap = pub.filter((a) => !locs.has(`${BASE}/${a.category}/${a.slug}`));
console.log(`sitemap.xml            ${sitemap.status}, ${locs.size} urls`);
console.log(`  articles missing     ${missingFromSitemap.length}`);
for (const a of missingFromSitemap) {
  console.log(`     ${a.category}/${a.slug}`);
}
if (missingFromSitemap.length) {
  console.log('  NOTE: sitemap.xml caches for 30 minutes. If these were just');
  console.log('        published, re-run before treating it as a fault.');
}

/* 2. category pages --------------------------------------------------- */
const activeSlugs = [...new Set(pub.map((a) => a.category))];
const linkedOnCategory = new Set();
let catFailures = 0;
for (const slug of activeSlugs.sort()) {
  const res = await get(`/${slug}`);
  if (res.status !== 200) {
    problems.push(`category page ${res.status}: /${slug}`);
    catFailures += 1;
    continue;
  }
  const mine = pub.filter((a) => a.category === slug);
  const found = mine.filter((a) => res.body.includes(`/${a.category}/${a.slug}`));
  found.forEach((a) => linkedOnCategory.add(a.slug));
  if (found.length !== mine.length) {
    for (const a of mine.filter((x) => !found.includes(x))) {
      problems.push(`not linked from its category page: /${a.category}/${a.slug}`);
    }
  }
}
console.log(`\ncategory pages         ${activeSlugs.length} checked, ${catFailures} failed`);
console.log(`  articles linked      ${linkedOnCategory.size}/${pub.length}`);

/* 3. homepage --------------------------------------------------------- */
const home = await get('/');
const homeArticleLinks = pub.filter((a) => home.body.includes(`/${a.category}/${a.slug}`)).length;
const homeCategoryLinks = activeSlugs.filter((s) => new RegExp(`href="/${s}"`).test(home.body)).length;
console.log(`\nhomepage               ${home.status}`);
console.log(`  articles shown       ${homeArticleLinks}/${pub.length}`);
console.log(`  categories linked    ${homeCategoryLinks}/${activeSlugs.length}`);
if (homeCategoryLinks < activeSlugs.length) {
  problems.push(
    `homepage links ${homeCategoryLinks} of ${activeSlugs.length} active categories; ` +
    `the rest are reachable only via the News menu or sitemap`
  );
}

/* 4. editorial link graph --------------------------------------------- */
// NOT the same as reachability. Every article is linked from its category page,
// so none of these are unreachable. This measures EDITORIAL inbound links, which
// carry weight a template link does not. A newly published article always scores
// zero here because nothing written yet could link to it.
const inbound = new Map(pub.map((a) => [`/${a.category}/${a.slug}`, 0]));
for (const a of pub) {
  const hrefs = new Set([...(a.bodyHtml || '').matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]));
  for (const h of hrefs) {
    if (h === `/${a.category}/${a.slug}`) continue; // ignore self
    if (inbound.has(h)) inbound.set(h, inbound.get(h) + 1);
  }
}
const unlinked = [...inbound.entries()].filter(([, n]) => n === 0);
console.log(`\neditorial link graph   (template links excluded)`);
console.log(`  no inbound article   ${unlinked.length}/${pub.length}`);
for (const [p] of unlinked) console.log(`     ${p}`);
console.log('  These are reachable via their category page. This is an SEO');
console.log('  weighting signal, not a reachability failure.');

/* 5. robots ------------------------------------------------------------ */
// A crawler obeys exactly ONE group, and groups sharing a user-agent token
// merge. Flattening every Disallow line in the file is wrong: Cloudflare
// injects its own managed block that blocks AI crawlers with "Disallow: /",
// which says nothing whatever about whether Googlebot can reach an article.
const robots = await get('/robots.txt');
const groups = [];
let current = null;
for (const raw of robots.body.split(/\r?\n/)) {
  const line = raw.replace(/#.*$/, '').trim();
  if (!line) continue;
  const ua = line.match(/^User-agent:\s*(.+)$/i);
  if (ua) {
    const token = ua[1].trim().toLowerCase();
    if (current && current.justSawUa) { current.agents.push(token); continue; }
    current = { agents: [token], disallow: [], allow: [], justSawUa: true };
    groups.push(current);
    continue;
  }
  if (!current) continue;
  current.justSawUa = false;
  const d = line.match(/^Disallow:\s*(\S*)$/i);
  if (d) { current.disallow.push(d[1]); continue; }
  const al = line.match(/^Allow:\s*(\S*)$/i);
  if (al) current.allow.push(al[1]);
}
const rulesFor = (token) => {
  const exact = groups.filter((g) => g.agents.includes(token.toLowerCase()));
  const wild = groups.filter((g) => g.agents.includes('*'));
  const use = exact.length ? exact : wild;
  return { disallow: use.flatMap((g) => g.disallow), allow: use.flatMap((g) => g.allow) };
};
console.log(`\nrobots.txt             ${robots.status}, ${groups.length} groups`);
for (const token of ['Googlebot', 'Googlebot-News']) {
  const r = rulesFor(token);
  const blocksAll = r.disallow.includes('/');
  console.log(`  ${token.padEnd(16)} disallow: ${r.disallow.join(' ') || 'none'}${blocksAll ? '   <-- BLOCKS EVERYTHING' : ''}`);
  if (blocksAll) problems.push(`robots.txt blocks ${token} entirely`);
}
const aiBlocked = groups
  .filter((g) => g.disallow.includes('/') && !g.agents.includes('*'))
  .flatMap((g) => g.agents);
if (aiBlocked.length) {
  console.log(`  fully blocked        ${aiBlocked.join(', ')}`);
  console.log('  Cloudflare-managed. No effect on Google, but these sites cannot');
  console.log('  cite us. Note Google-Extended does NOT affect Search or AI Overviews.');
}

/* 5b. per-article page checks ------------------------------------------ */
// Only with --deep: this fetches every article page, one at a time. Links are
// worthless if the canonical points somewhere else, and nothing else checks it.
if (process.argv.includes('--deep')) {
  console.log(`\nper-article checks     (${pub.length} pages, sequential)`);
  let badCanonical = 0;
  let noBreadcrumb = 0;
  let thinRelated = 0;
  for (const a of pub) {
    const p = `/${a.category}/${a.slug}`;
    const res = await get(p);
    if (res.status !== 200) {
      problems.push(`article ${res.status}: ${p}`);
      continue;
    }
    const canon = res.body.match(/<link rel="canonical" href="([^"]+)"/);
    if (!canon || canon[1] !== `${BASE}${p}`) {
      problems.push(`canonical is ${canon ? canon[1] : 'missing'} on ${p}`);
      badCanonical += 1;
    }
    if (!res.body.includes('"@type":"BreadcrumbList"')) {
      problems.push(`no BreadcrumbList on ${p}`);
      noBreadcrumb += 1;
    }
    // outbound links to other articles rendered on the page (related + most read)
    const out = new Set(
      pub.filter((o) => o.slug !== a.slug && res.body.includes(`/${o.category}/${o.slug}`)).map((o) => o.slug)
    );
    if (out.size < 3) {
      problems.push(`only ${out.size} outbound article link(s) on ${p}`);
      thinRelated += 1;
    }
  }
  console.log(`  wrong canonical      ${badCanonical}`);
  console.log(`  missing breadcrumb   ${noBreadcrumb}`);
  console.log(`  under 3 outbound     ${thinRelated}`);
}

/* 6. rss --------------------------------------------------------------- */
const rss = await get('/rss.xml');
const rssItems = (rss.body.match(/<item>/g) || []).length;
console.log(`\nrss.xml                ${rss.status}, ${rssItems} items`);

/* summary -------------------------------------------------------------- */
console.log(`\n${'='.repeat(60)}`);
if (!problems.length) {
  console.log('REACHABLE: every published article is linked from its category');
  console.log('page, every active category is linked from the homepage, and');
  console.log('Googlebot is not blocked from anything that matters.');
} else {
  console.log(`${problems.length} reachability problem(s):`);
  for (const p of problems) console.log(`   ${p}`);
}
