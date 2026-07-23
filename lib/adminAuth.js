import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'lll_admin';

// Deterministic session token: HMAC of a fixed string keyed by server secrets.
// Rotating TOKEN_SECRET or ADMIN_KEY invalidates every admin session at once.
export function sessionValue() {
  const secret = `${process.env.TOKEN_SECRET || ''}${process.env.ADMIN_KEY || ''}`;
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex');
}

function sessionMatches(candidate) {
  // No ADMIN_KEY configured = admin is switched off entirely.
  if (!process.env.ADMIN_KEY) return false;
  if (typeof candidate !== 'string' || !candidate) return false;
  const expected = Buffer.from(sessionValue());
  const supplied = Buffer.from(candidate);
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(supplied, expected);
}

// For server components (reads the request cookie store).
export async function isAdmin() {
  const store = await cookies();
  return sessionMatches(store.get(COOKIE_NAME)?.value);
}

// For API route handlers (reads NextRequest cookies).
export function isAdminRequest(request) {
  return sessionMatches(request.cookies.get(COOKIE_NAME)?.value);
}
