/**
 * Audit every published article against docs/NEWS_COMPLIANCE.md.
 *   node scripts/audit-corpus.mjs
 * Read-only. Run it after any rule change, and before telling anyone the site
 * is compliant.
 */
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import mongoose from 'mongoose';
import { CATEGORY_SLUGS } from '../lib/constants.js';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root,'.env.local'),'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^"|"$/g,''); }
const FEATURE_WORDS = 700;
const ALLOWED = new Set(['p','h2','h3','strong','em','a','ul','ol','li','blockquote','br']);
await mongoose.connect(process.env.MONGODB_URI);
const c = mongoose.connection.collection('articles');
const pub = await c.find({status:'published'}).toArray();
const valid = new Set(['/','/whats-on','/submit','/about','/contact','/terms','/privacy','/cookies','/remove',
  ...CATEGORY_SLUGS.map(x=>'/'+x), ...pub.map(p=>`/${p.category}/${p.slug}`)]);
const fails=[], warns=[];
for (const d of pub) {
  const b=d.bodyHtml||''; const words=b.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
  const e=[], w=[];
  if ((d.title||'').length>110) e.push(`title ${d.title.length}>110`);
  if ((d.dek||'').length>160) e.push('dek>160');
  if ((d.seo?.metaTitle||'').length>70) e.push('metaTitle>70');
  if ((d.seo?.metaDesc||'').length>160) e.push('metaDesc>160');
  if (!d.heroImage?.url) e.push('no hero');
  if (!d.heroImage?.alt) e.push('no alt');
  if (!d.heroImage?.social?.url) e.push('no share card');
  // An unset type reads as a listing at render time, which is the safe default,
  // but it means nobody decided. Genuine news then silently loses NewsArticle
  // and never enters the news sitemap.
  if (!['news','listing','guide'].includes(d.articleType)) e.push('articleType:'+(d.articleType||'unset'));
  if (words>=FEATURE_WORDS && (b.match(/<blockquote>/g)||[]).length<2) e.push('feature with <2 quotes');
  if (/[–—]/.test(JSON.stringify(d))) e.push('em/en dash');
  const bad=[...new Set([...b.matchAll(/<\s*\/?\s*([a-zA-Z0-9]+)/g)].map(m=>m[1].toLowerCase()))].filter(t=>!ALLOWED.has(t));
  if (bad.length) e.push('tags:'+bad.join(','));
  const promo=[...b.matchAll(/href="https:\/\/spacesplease\.com([^"]*)"/g)].map(m=>m[1]).filter(p=>!p.startsWith('/events/')).length;
  if (promo>1) e.push(`SP homepage x${promo}`);
  if (d.byline?.name!=='Live Laugh Local team') e.push('byline:'+d.byline?.name);
  for (const m of b.matchAll(/href="(\/[^"]*)"/g)) if (!valid.has(m[1])) e.push('broken link '+m[1]);
  if (e.length) fails.push(`${d.category}/${d.slug}\n      ${e.join('; ')}`);
  else if (w.length) warns.push(`${d.slug}: ${w.join('; ')}`);
}
const mix = ['news','listing','guide'].map(t=>`${t}=${pub.filter(p=>p.articleType===t).length}`).join(' ');
console.log(`published ${pub.length} | categories ${new Set(pub.map(p=>p.category)).size}/${CATEGORY_SLUGS.length} | ${mix}`);
console.log(`FAILING: ${fails.length}`);
fails.forEach(f=>console.log('   ', f));
console.log(fails.length ? '' : '   none - corpus is compliant');
await mongoose.disconnect();
