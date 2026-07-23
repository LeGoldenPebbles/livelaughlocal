// In-memory fixed-window rate limiter.
//
// NOTE: state is per-instance (a plain module-level Map). That is fine here
// because the site runs on a single Render instance. If we ever scale out,
// swap this for a shared store - do not rely on it across instances.

const buckets = new Map();

export function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now();

  // Prune stale entries so the map never grows without bound.
  for (const [k, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

// Positional-args alias used by the admin login route.
export function rateLimit(key, limit, windowMs) {
  return checkRateLimit(key, { limit, windowMs });
}
