import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FileStorage from '@/models/FileStorage';
import { r2Configured, uploadImage, sniffImage } from '@/lib/r2';
import { checkRateLimit } from '@/lib/rateLimit';

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'local';
}

export async function POST(request) {
  try {
    if (!r2Configured()) {
      return NextResponse.json(
        { error: 'Uploads are not available yet' },
        { status: 503 }
      );
    }

    const ip = clientIp(request);
    if (!checkRateLimit(`upload:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: 'Too many uploads - please try again later' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file supplied' }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: 'Only JPG, PNG or WebP images are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Images must be 5MB or under' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'That file could not be read' }, { status: 400 });
    }

    // The bytes must actually BE the image type claimed - a spoofed
    // Content-Type on an HTML/SVG/script payload dies here.
    const sniffed = sniffImage(buffer);
    if (!sniffed || sniffed.type !== file.type) {
      return NextResponse.json(
        { error: 'That file does not look like a valid JPG, PNG or WebP image' },
        { status: 400 }
      );
    }

    const { key, url } = await uploadImage({
      buffer,
      contentType: sniffed.type,
      ext: sniffed.ext,
    });

    // Track every upload in the livelaughlocal database (orphan sweep + tracing).
    try {
      await dbConnect();
      await FileStorage.create({
        key,
        url,
        contentType: sniffed.type,
        size: buffer.length,
        ip,
      });
    } catch (err) {
      // The object is already in R2 and usable - a tracking-row failure must
      // not fail the upload. Log and carry on.
      console.error('[api/upload] FileStorage record failed (object stored)', err);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[api/upload]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
