/**
 * Print the internal routes a writer may link to.
 *
 *   node scripts/list-routes.mjs            # every valid route
 *   node scripts/list-routes.mjs --articles # published articles only
 *
 * WHY THIS EXISTS: publish-batch.mjs rejects any internal link that is not a
 * route which actually resolves, and writers invent plausible ones (/events,
 * /news, query strings). The list of published articles changes with every
 * batch, so a hand-maintained copy pasted into a prompt goes stale immediately
 * and the next batch fails on links that were valid last week.
 *
 * This prints exactly the set publish-batch.mjs builds, from the same sources,
 * so a writer prompt can be regenerated instead of remembered.
 *
 * Read-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import mongoose from 'mongoose';
import { CATEGORY_SLUGS } from '../lib/constants.js';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');

// Resolve .env.local against the repo, not the shell's working directory: the
// Bash cwd persists between calls and this is otherwise a confusing ENOENT.
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

// Must stay identical to STATIC_ROUTES in publish-batch.mjs.
const STATIC_ROUTES = [
  '/', '/whats-on', '/submit', '/about', '/contact',
  '/terms', '/privacy', '/cookies', '/remove',
];

const articlesOnly = process.argv.includes('--articles');

await mongoose.connect(process.env.MONGODB_URI);
const published = await mongoose.connection
  .collection('articles')
  .find({ status: 'published' }, { projection: { slug: 1, category: 1, title: 1 } })
  .sort({ category: 1 })
  .toArray();
await mongoose.disconnect();

if (articlesOnly) {
  for (const a of published) console.log(`${a.category}/${a.slug}`);
  process.exit(0);
}

console.log('# Static routes');
for (const r of STATIC_ROUTES) console.log(r);
console.log('\n# Category pages');
for (const c of CATEGORY_SLUGS) console.log(`/${c}`);
console.log(`\n# Published articles (${published.length})`);
for (const a of published) console.log(`/${a.category}/${a.slug}`);
console.log('\n# Exact match only. No trailing slash, no query string, no #fragment.');
console.log('# There is no /events and no /news on this site.');
