/**
 * Re-host remote hero images into our own R2 bucket at a sane size.
 *
 * WHY: Next.js image optimisation decodes the FULL source image into memory.
 * Several of our heroes were Wikimedia originals at 4000-4600px wide, which is
 * ~45MB of raw pixels each. Googlebot-Image crawling them repeatedly ratcheted
 * the service memory up until it hit the 512MB limit and was OOM killed
 * (26 July 2026, 03:38). Serving pre-sized images removes the cause.
 *
 * Downloads each remote hero, resizes to max 1600px wide, re-encodes, uploads
 * to R2, then repoints the article. Credit text is left untouched - the
 * licences (CC BY-SA etc) permit resizing as long as attribution stands.
 *
 * Run:  node scripts/rehost-heroes.mjs [--dry]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const DRY = process.argv.includes('--dry');
const MAX_WIDTH = 1600;

const env = Object.fromEntries(
  fs
    .readFileSync('d:/livelaughlocal/.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const PUBLIC_HOST = env.R2_PUBLIC_HOST;

// Hosts we already serve efficiently - leave these alone.
const SKIP_HOSTS = new Set([PUBLIC_HOST]);

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  const Article = mongoose.model(
    'Article',
    new mongoose.Schema({}, { strict: false }),
    'articles'
  );

  const docs = await Article.find(
    { 'heroImage.url': { $exists: true, $ne: '' } },
    { slug: 1, heroImage: 1 }
  );

  let moved = 0;
  for (const doc of docs) {
    const url = doc.heroImage.url;
    if (url.startsWith('/')) continue; // local house graphic, already small
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      console.log(`SKIP ${doc.slug}: unparseable url`);
      continue;
    }
    if (SKIP_HOSTS.has(host)) continue;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LiveLaughLocal/1.0 (hello@spacesplease.com)' },
    });
    if (!res.ok) {
      console.log(`SKIP ${doc.slug}: fetch ${res.status}`);
      continue;
    }
    const input = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(input).metadata();

    const output = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const key = `heroes/${doc.slug}-${crypto.randomBytes(3).toString('hex')}.jpg`;
    const newUrl = `https://${PUBLIC_HOST}/${key}`;

    console.log(
      `${doc.slug}\n   ${meta.width}x${meta.height} ${(input.length / 1048576).toFixed(1)}MB` +
        `  ->  max${MAX_WIDTH} ${(output.length / 1024).toFixed(0)}KB` +
        `  (${Math.round((1 - output.length / input.length) * 100)}% smaller)`
    );

    if (DRY) continue;

    await s3.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: output,
        ContentType: 'image/jpeg',
        ContentDisposition: 'inline',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    await Article.updateOne(
      { _id: doc._id },
      { $set: { 'heroImage.url': newUrl } }
    );
    console.log(`   -> ${newUrl}`);
    moved += 1;
  }

  console.log(`\n${DRY ? '[dry run] would move' : 'moved'} ${moved} hero image(s)`);
  await mongoose.disconnect();
})();
