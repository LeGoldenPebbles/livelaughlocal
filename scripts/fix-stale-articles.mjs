/**
 * Correct two published articles that are wrong on the live site.
 *   node fix-articles.mjs --dry
 *   node fix-articles.mjs
 *
 * 1. WOMAD: headline, dek, meta and body all say the festival is happening now
 *    and tickets are on sale. It ran 23-26 July 2026 and ended six days ago.
 *    Moved to past tense and reframed as a record of a genuine first.
 * 2. Crowdfunding: describes Spaces Please as "the UK events marketplace this
 *    magazine draws its listings from". That is a supply relationship. Spaces
 *    Please OWNS this magazine, and describing a material connection as a
 *    lesser one is the disclosure problem, not a wording nicety.
 *
 * publishedAt is NOT touched. Correcting an error is not new information and
 * re-dating for freshness is the manipulation the policy names.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import mongoose from 'mongoose';
import { sanitizeBody } from '../lib/sanitize.js';
import { CATEGORY_SLUGS } from '../lib/constants.js';

const ROOT = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const DRY = process.argv.includes('--dry');

const WOMAD_BODY = `
<p>WOMAD, the world music festival co-founded by Peter Gabriel, ran from Thursday 23 to Sunday 26 July 2026 at the Neston Park Estate near Corsham in Wiltshire. According to <a href="https://www.visitwiltshire.co.uk/whats-on/womad-festival-p2526073">Visit Wiltshire</a>, it was the first time the historic estate had been opened to a public event of any kind.</p>

<p>That detail is worth sitting with. Stately homes across the country host fairs, food festivals and open days every summer, and they are a large part of what we cover in <a href="/festivals">festivals</a>, but Neston Park had never done any of it. Everyone who walked through the gates that weekend saw grounds no ticket-holding public had seen before.</p>

<h2>Why WOMAD moved house</h2>

<p>The festival returned after a year off in 2025, and the Corsham site replaced its long-time home at Charlton Park. On a dedicated <a href="https://womad.co.uk/new-2026-site/">new site page</a>, co-founder Peter Gabriel explained the appeal of the address:</p>

<blockquote>We're back and in a beautiful new home; Neston Park near our own base in Real World Studios.</blockquote>

<p>It was not a quick decision. According to the festival, the team "looked at many wonderful sites around the country" before the estate's owners, Sir James and Lady Venetia Fuller, offered to host WOMAD themselves. For a private estate with no history of public events, that was a considerable invitation to extend.</p>

<h2>A festival built on discovery</h2>

<p>The move was not the only change. Organisers said they had spent the time away "regenerating our beloved festival" in response to audience feedback, and billed the 2026 edition as <em>"a festival built on discovery, not just line ups"</em>.</p>

<p>In practice that meant a programme stretching well beyond the stages: more than 200 free workshops across the weekend, alongside food and wellness activities. It was built for browsers as much as for superfans, which is the same reason a good craft fair holds people longer than its stall count suggests it should.</p>

<h2>What happens to the estate now</h2>

<p>The open question is whether the arrangement lasts. If the weekend went well, Neston Park could settle in as WOMAD's home for years, and a private estate that had never welcomed the public may find it rather enjoys doing so. That is the pattern behind a good number of the UK's fixtures: a landowner tries it once, and once becomes annually.</p>

<p>Nothing had been announced about 2027 when this piece was updated. Anyone hoping for a return should watch the <a href="https://womad.co.uk/">official WOMAD site</a>, where the move was announced first, and our <a href="/whats-on">what's on</a> pages for everything else happening nearby in the meantime.</p>
`.trim();

const EDITS = [
  {
    slug: 'womad-neston-park-first-public-event',
    set: {
      title: 'WOMAD opened a stately home to the public for the first time in its history',
      dek: "Peter Gabriel's festival ran from 23 to 26 July at Neston Park near Corsham, the first public event in the estate's history.",
      bodyHtml: WOMAD_BODY,
      'seo.metaTitle': 'WOMAD 2026: Neston Park opened to the public at last',
      'seo.metaDesc':
        'WOMAD ran 23 to 26 July 2026 at Neston Park Estate near Corsham, Wiltshire, the first public event in the estate history, and what happens to the site now.',
    },
    why: 'event finished 26 July; headline, dek and body all claimed it was live with tickets on sale',
  },
  {
    slug: 'crowdfund-a-local-event-fairs-and-markets',
    replace: [
      [
        'Spaces Please, the UK events marketplace this magazine draws its listings from, has launched',
        'Spaces Please, the UK events marketplace that owns this magazine, has launched',
      ],
      [
        'href="https://livelaughlocal.co.uk/days-out/chippenham-fantasy-ball-the-neeld-2027"',
        'href="/days-out/chippenham-fantasy-ball-the-neeld-2027"',
      ],
      [
        'you can browse live campaigns or start your own at <a href="https://spacesplease.com/campaigns?utm_source=livelaughlocal&amp;utm_medium=article">spacesplease.com/campaigns</a>.',
        'you can browse live campaigns or start your own at <a href="https://spacesplease.com/campaigns?utm_source=livelaughlocal&amp;utm_medium=article">spacesplease.com/campaigns</a>. It is not the only route. <a href="https://www.crowdfunder.co.uk/">Crowdfunder</a> and <a href="https://www.spacehive.com/">Spacehive</a> both fund community projects and events in the UK, and are worth comparing on fees and reach before you commit to any of them.',
      ],
    ],
    why: 'described our owner as a supplier; absolute self-link; single-option CTA read as an advert',
  },
];

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');

// Mirror of the real model's constraints, same reasoning as publish-batch.mjs.
const LIMITS = { title: 120, dek: 160, 'seo.metaTitle': 70, 'seo.metaDesc': 160 };
const ALLOWED = new Set(['p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br']);
const live = await col.find({ status: 'published' }, { projection: { slug: 1, category: 1 } }).toArray();
const routes = new Set([
  '/', '/whats-on', '/submit', '/about', '/contact', '/terms', '/privacy', '/cookies', '/remove',
  ...CATEGORY_SLUGS.map((c) => `/${c}`),
  ...live.map((d) => `/${d.category}/${d.slug}`),
]);

let failed = 0;
const staged = [];

for (const e of EDITS) {
  const doc = await col.findOne({ slug: e.slug });
  if (!doc) { console.log(`MISSING ${e.slug}`); failed++; continue; }
  console.log(`\n${e.slug}\n   ${e.why}`);

  const next = { ...e.set };
  if (e.replace) {
    let body = doc.bodyHtml;
    for (const [from, to] of e.replace) {
      if (!body.includes(from)) { console.log(`   FAIL text not found: ${from.slice(0, 60)}...`); failed++; }
      body = body.replace(from, to);
    }
    next.bodyHtml = body;
  }

  const body = sanitizeBody(next.bodyHtml, { linkRel: 'none' });
  const before = next.bodyHtml.replace(/<[^>]+>/g, '').trim().length;
  const after = body.replace(/<[^>]+>/g, '').trim().length;
  if (after < before * 0.95) { console.log(`   FAIL sanitiser ate text ${before}->${after}`); failed++; continue; }
  next.bodyHtml = body;

  for (const [f, max] of Object.entries(LIMITS)) {
    if (next[f] !== undefined && next[f].length > max) { console.log(`   FAIL ${f} ${next[f].length}>${max}`); failed++; }
  }
  const tags = new Set([...body.matchAll(/<\s*\/?\s*([a-zA-Z0-9]+)/g)].map((m) => m[1].toLowerCase()));
  const bad = [...tags].filter((t) => !ALLOWED.has(t));
  if (bad.length) { console.log(`   FAIL tags: ${bad.join(',')}`); failed++; }
  const attrs = new Set([...body.matchAll(/<[a-z0-9]+\s+([a-zA-Z-]+)=/g)].map((m) => m[1]));
  const badAttrs = [...attrs].filter((x) => x !== 'href');
  if (badAttrs.length) { console.log(`   FAIL attrs: ${badAttrs.join(',')}`); failed++; }
  if (/[\u2013\u2014]/.test(JSON.stringify(next))) { console.log('   FAIL em/en dash'); failed++; }
  for (const m of body.matchAll(/href="(\/[^"]*)"/g)) {
    if (!routes.has(m[1])) { console.log(`   FAIL broken internal link ${m[1]}`); failed++; }
  }
  const promo = [...body.matchAll(/href="https:\/\/spacesplease\.com([^"]*)"/g)]
    .map((m) => m[1]).filter((p) => !p.startsWith('/events/')).length;
  if (promo > 1) { console.log(`   FAIL ${promo} Spaces Please homepage links`); failed++; }

  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const quotes = (body.match(/<blockquote>/g) || []).length;
  console.log(`   OK  ${words} words, ${quotes} quote(s), ${promo} SP promo link(s)`);
  staged.push({ slug: e.slug, next });
}

if (failed) { console.log(`\nABORTED: ${failed} problem(s). Nothing written.`); await mongoose.disconnect(); process.exit(1); }
if (DRY) { console.log('\n[dry run] nothing written.'); await mongoose.disconnect(); process.exit(0); }

for (const s of staged) {
  await col.updateOne({ slug: s.slug }, { $set: s.next });
  console.log(`UPDATED /${s.slug}`);
}
await mongoose.disconnect();
