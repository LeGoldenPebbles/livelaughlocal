import crypto from 'crypto';

function secret() {
  const s = process.env.TOKEN_SECRET;
  if (!s) throw new Error('TOKEN_SECRET is not set');
  return s;
}

// Stateless HMAC tokens: purpose scopes them so a confirm token can never
// act as a removal token. No DB storage needed.
export function makeToken(purpose, slug, email) {
  return crypto
    .createHmac('sha256', secret())
    .update(`${purpose}:${slug}:${String(email).toLowerCase().trim()}`)
    .digest('hex');
}

export function verifyToken(token, purpose, slug, email) {
  const expected = makeToken(purpose, slug, email);
  const a = Buffer.from(String(token || ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
