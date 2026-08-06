/**
 * Make a surgical edit to a published article, safely.
 *
 *   node scripts/patch-article.mjs <patches.json> <out.json>
 *   node scripts/publish-batch.mjs <out.json> --update --check-links
 *
 * Reads the live article, applies exact string replacements, and writes a
 * normal batch file for the validating publisher. It never writes to the
 * database itself.
 *
 * WHY THIS EXISTS: most fixes to an existing article are small - link a source
 * the piece already leans on, correct an over-claimed quotation, add a
 * sentence. Doing that through the batch format means retyping a 900-word body
 * by hand, and a transcription slip there silently rewrites an article nobody
 * asked to change. This reads the real body and touches only what is named.
 *
 * A replacement whose `find` is missing, or appears more than once, is an
 * ERROR rather than a silent no-op. Both mean the patch was written against a
 * version of the article that is not the one in the database, and applying the
 * rest of it anyway would produce something nobody has read.
 *
 * patches.json:
 *   [{ "slug": "...",
 *      "title": "optional new title",
 *      "dek": "...", "metaTitle": "...", "metaDesc": "...",
 *      "replacements": [["exact old text", "new text"], ...] }]
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

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.log('usage: node scripts/patch-article.mjs <patches.json> <out.json>');
  process.exit(1);
}

const patches = JSON.parse(fs.readFileSync(path.resolve(inPath), 'utf8'));
await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');

const out = [];
let failed = 0;

for (const p of patches) {
  const a = await col.findOne({ slug: p.slug });
  if (!a) {
    console.log(`FAIL ${p.slug}: not found`);
    failed += 1;
    continue;
  }
  let body = String(a.bodyHtml);
  const before = body;

  for (const [find, replace] of p.replacements || []) {
    const count = body.split(find).length - 1;
    if (count === 0) {
      console.log(`FAIL ${p.slug}: text to replace not found:\n      ${find.slice(0, 110)}`);
      failed += 1;
      continue;
    }
    if (count > 1) {
      console.log(`FAIL ${p.slug}: text appears ${count} times, cannot patch unambiguously:\n      ${find.slice(0, 110)}`);
      failed += 1;
      continue;
    }
    body = body.replace(find, replace);
  }

  if (body === before && (p.replacements || []).length) {
    console.log(`FAIL ${p.slug}: nothing changed`);
    failed += 1;
    continue;
  }

  const words = (s) => s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  console.log(`ok   ${p.slug}: ${words(before)} -> ${words(body)} words`);

  out.push({
    slug: a.slug,
    category: a.category,
    articleType: a.articleType,
    title: p.title || a.title,
    dek: p.dek || a.dek,
    metaTitle: p.metaTitle || a.seo?.metaTitle,
    metaDesc: p.metaDesc || a.seo?.metaDesc,
    tags: a.tags || [],
    locations: a.locations || [],
    hero: { keep: true },
    heroAlt: p.heroAlt || a.heroImage?.alt || '',
    bodyHtml: body,
  });
}

await mongoose.disconnect();

if (failed) {
  console.log(`\nABORTED: ${failed} patch(es) failed. Nothing written.`);
  process.exit(1);
}

fs.writeFileSync(path.resolve(outPath), JSON.stringify(out, null, 2));
console.log(`\nwrote ${out.length} article(s) to ${outPath}`);
console.log(`next: node scripts/publish-batch.mjs ${outPath} --update --check-links`);
