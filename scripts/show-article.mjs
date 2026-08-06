/**
 * Print a published article exactly as it is stored.
 *
 *   node scripts/show-article.mjs <slug> [<slug> ...]
 *   node scripts/show-article.mjs --links <slug>    # just the outbound links
 *
 * Read-only.
 *
 * WHY: every other script here summarises or scores. When an audit says an
 * article is thin, the next question is always "thin how?", and reading it in
 * the admin or on the live site shows the rendered page rather than the stored
 * HTML - which is what the publisher validates and what the audits measure.
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

const LINKS_ONLY = process.argv.includes('--links');
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slugs.length) {
  console.log('usage: node scripts/show-article.mjs <slug> [--links]');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');

for (const slug of slugs) {
  const a = await col.findOne({ slug });
  if (!a) {
    console.log(`## ${slug} NOT FOUND`);
    continue;
  }
  if (LINKS_ONLY) {
    console.log(`\n## ${slug}`);
    for (const m of String(a.bodyHtml).matchAll(/href="([^"]+)"/g)) console.log(`  ${m[1]}`);
    continue;
  }
  console.log('='.repeat(78));
  console.log(`slug        ${a.slug}`);
  console.log(`category    ${a.category}`);
  console.log(`type        ${a.articleType}   status ${a.status}`);
  console.log(`title       ${a.title}`);
  console.log(`subtitle    ${a.subtitle || '-'}`);
  console.log(`metaDesc    ${a.metaDesc || '-'}`);
  console.log(`published   ${a.publishedAt}`);
  console.log(`tags        ${JSON.stringify(a.tags || [])}`);
  console.log(`hero        ${JSON.stringify(a.heroImage || {})}`);
  console.log(`words       ${String(a.bodyHtml).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length}`);
  console.log('-'.repeat(78));
  console.log(a.bodyHtml);
  console.log();
}

await mongoose.disconnect();
