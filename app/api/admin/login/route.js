import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { sessionValue } from '@/lib/adminAuth';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function keyMatches(candidate) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  if (typeof candidate !== 'string' || !candidate) return false;
  const supplied = Buffer.from(candidate);
  const expected = Buffer.from(adminKey);
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(supplied, expected);
}

export async function POST(request) {
  try {
    const ip =
      (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      'unknown';

    if (!rateLimit(`admin-login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (!keyMatches(body?.key)) {
      return NextResponse.json({ error: 'Wrong key' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('lll_admin', sessionValue(), {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  } catch (err) {
    console.error('[admin/login]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
