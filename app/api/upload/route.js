import { NextResponse } from 'next/server';
import { r2Configured, uploadImage } from '@/lib/r2';
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

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
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
    const url = await uploadImage({ buffer, contentType: file.type, ext });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[api/upload]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
