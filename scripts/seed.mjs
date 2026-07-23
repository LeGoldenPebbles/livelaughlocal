// Seed articles from scripts/seed-data/articles.json into the livelaughlocal DB.
// Self-contained on purpose: no "@/" aliases so it runs under plain node.
//   node scripts/seed.mjs [--publish]
// Reads MONGODB_URI from .env.local or the environment.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import mongoose from 'mongoose';
import { sanitizeBody } from '../lib/sanitize.js';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..');

// minimal .env.local loader (no dotenv dep)
const envPath = path.join(root, '.env.local');
if (!process.env.MONGODB_URI && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI not set (env or .env.local)');
  process.exit(1);
}

const publish = process.argv.includes('--publish');
const dataPath = path.join(here, 'seed-data', 'articles.json');
const articles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// strict:false lite schema - the app's models/Article.js owns validation;
// seeding only ever inserts fields that model defines.
const Article = mongoose.model(
  'Article',
  new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'articles' })
);

await mongoose.connect(process.env.MONGODB_URI);

let done = 0;
for (const a of articles) {
  const doc = {
    ...a,
    bodyHtml: sanitizeBody(a.bodyHtml, { linkRel: 'none' }),
    status: publish ? 'published' : 'draft',
    origin: 'generated',
    byline: { name: 'Live Laugh Local team', kind: 'staff' },
    emailConfirmed: false,
    viewCount: 0,
    ...(publish ? { publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date() } : {}),
  };
  await Article.updateOne({ slug: a.slug }, { $set: doc }, { upsert: true });
  done += 1;
  console.log(`${publish ? 'published' : 'drafted'}: ${a.slug}`);
}

console.log(`Seeded ${done} articles (${publish ? 'published' : 'draft - review in /admin'}).`);
await mongoose.disconnect();
