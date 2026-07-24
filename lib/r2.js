import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 (S3-compatible), bucket "livelaughlocal".
// R2_PUBLIC_HOST is the public serving host for the bucket - uploads are
// useless without it, so it is part of the "configured" check.

let client = null;

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_HOST
  );
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

// Confirm the bytes really are the image type claimed - a caller must never be
// able to store an executable/SVG/HTML payload by lying about Content-Type.
export function sniffImage(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const b = buffer;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return { type: 'image/webp', ext: 'webp' };
  return null;
}

export async function uploadImage({ buffer, contentType, ext }) {
  const year = new Date().getFullYear();
  const key = `uploads/${year}/${crypto.randomUUID()}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Belt-and-braces: never let R2 serve an upload as anything executable.
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return { key, url: `https://${process.env.R2_PUBLIC_HOST}/${key}` };
}
