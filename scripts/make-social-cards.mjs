/**
 * Generate a proper 1200x630 social sharing card for every published article.
 *
 *   node scripts/make-social-cards.mjs [--dry] [--force] [--slug=<slug>]
 *
 * WHY: shares were coming out with no image, or a tiny thumbnail. The og:image
 * tags were correct and the image host serves 200 to facebookexternalhit, so
 * the metadata was never the problem. The IMAGES were.
 *
 * Facebook wants 1200x630 (1.91:1) and will only render a large image card
 * above 600x315. Our heroes were nothing like that shape:
 *
 *   543x768  ratio 0.71   portrait
 *   768x768  ratio 1.00   square
 *   780x768  ratio 1.02   square-ish
 *   1600x1067 ratio 1.50  better, still not 1.91
 *
 * A portrait 543x768 fails the large-card test outright, so Facebook falls back
 * to a small square thumbnail or nothing at all. That is exactly what "it does
 * not take the image" looks like.
 *
 * So we generate a dedicated card per article rather than hoping the hero fits:
 *  - big enough source: cover-crop with sharp's `attention` strategy, which
 *    picks the busiest region rather than blindly centring
 *  - too small or too portrait to crop without mush: letterbox it onto the
 *    brand paper colour, which reads as deliberate rather than broken
 *
 * The result is stored on heroImage.social with explicit width and height, so
 * the page can emit og:image:width / og:image:height. Without those, Facebook
 * has to fetch and measure the image itself, and the FIRST share of a URL often
 * renders with no image while it does.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..');

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find((a) => a.startsWith('--slug=')) || '').split('=')[1];

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);

const W = 1200;
const H = 630;
const PAPER = '#F7F2EA'; // brand background for letterboxed cards
// Below this we would be upscaling so hard the crop turns to mush.
const MIN_COVER_WIDTH = 1000;
const MIN_COVER_HEIGHT = 525;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
    alpha: 1,
  };
}

async function buildCard(buffer) {
  const meta = await sharp(buffer).metadata();
  const bigEnough = meta.width >= MIN_COVER_WIDTH && meta.height >= MIN_COVER_HEIGHT;

  const pipeline = sharp(buffer).rotate();
  const out = bigEnough
    ? pipeline.resize({ width: W, height: H, fit: 'cover', position: sharp.strategy.attention })
    : pipeline.resize({ width: W, height: H, fit: 'contain', background: hexToRgb(PAPER) });

  return {
    buffer: await out.jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    mode: bigEnough ? 'cover' : 'letterbox',
    source: `${meta.width}x${meta.height}`,
  };
}

await mongoose.connect(env.MONGODB_URI);
const Articles = mongoose.connection.collection('articles');

const q = { status: 'published', 'heroImage.url': { $exists: true, $ne: '' } };
if (ONLY) q.slug = ONLY;
const docs = await Articles.find(q, { projection: { slug: 1, category: 1, heroImage: 1 } }).toArray();

let made = 0;
let skipped = 0;

for (const doc of docs) {
  if (doc.heroImage?.social?.url && !FORCE) {
    skipped += 1;
    continue;
  }

  // Relative heroes are house graphics living in public/. Read them off disk
  // rather than over HTTP: SITE_URL points at localhost in dev, so fetching
  // would just fail against a server that is not running.
  const relative = doc.heroImage.url.startsWith('/');
  const localPath = relative ? path.join(root, 'public', doc.heroImage.url) : null;

  try {
    let input;
    if (relative && fs.existsSync(localPath)) {
      input = fs.readFileSync(localPath);
    } else {
      const src = relative
        ? `https://livelaughlocal.co.uk${doc.heroImage.url}`
        : doc.heroImage.url;
      const res = await fetch(src, {
        headers: { 'User-Agent': 'LiveLaughLocal/1.0 (hello@spacesplease.com)' },
      });
      if (!res.ok) {
        console.log(`SKIP ${doc.slug}: fetch ${res.status}`);
        continue;
      }
      input = Buffer.from(await res.arrayBuffer());
    }
    const card = await buildCard(input);

    console.log(
      `${doc.slug}\n   ${card.source} -> ${W}x${H} ${card.mode} ${(card.buffer.length / 1024).toFixed(0)}KB`
    );
    if (DRY) continue;

    const key = `social/${doc.slug}-${crypto.randomBytes(3).toString('hex')}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: card.buffer,
        ContentType: 'image/jpeg',
        ContentDisposition: 'inline',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const socialUrl = `https://${env.R2_PUBLIC_HOST}/${key}`;
    await Articles.updateOne(
      { _id: doc._id },
      { $set: { 'heroImage.social': { url: socialUrl, width: W, height: H } } }
    );
    console.log(`   -> ${socialUrl}`);
    made += 1;
  } catch (err) {
    console.log(`SKIP ${doc.slug}: ${err.message}`);
  }
}

console.log(
  `\n${DRY ? '[dry run] would build' : 'built'} ${made} card(s); ${skipped} already had one (use --force to rebuild).`
);
await mongoose.disconnect();
