import crypto from 'crypto';
import dbConnect from '@/lib/db';
import PageView from '@/models/PageView';
import DailyUnique from '@/models/DailyUnique';
import RefStat from '@/models/RefStat';
import VisitorHit from '@/models/VisitorHit';
import Article from '@/models/Article';
import { CATEGORY_SLUGS } from '@/lib/constants';

// Cookieless pageview counter. Always answers 204 - analytics must never
// surface errors to the reader, and a beacon cannot read the response anyway.
export async function POST(request) {
  try {
    const body = await request.json();
    const path = body?.path;
    if (
      typeof path !== 'string' ||
      !path.startsWith('/') ||
      path.length >= 200
    ) {
      return new Response(null, { status: 204 });
    }

    await dbConnect();

    const day = new Date().toISOString().slice(0, 10);
    const ops = [
      PageView.updateOne({ path, day }, { $inc: { count: 1 } }, { upsert: true }),
    ];

    // Unique visitors, Plausible-style: HMAC(ip|ua|day) keyed by TOKEN_SECRET.
    // Not reversible, rotates every midnight, no cookies, nothing identifying stored.
    if (process.env.TOKEN_SECRET) {
      const fwd = request.headers.get('x-forwarded-for');
      const ip = fwd ? fwd.split(',')[0].trim() : 'local';
      const ua = request.headers.get('user-agent') || '';
      const hash = crypto
        .createHmac('sha256', process.env.TOKEN_SECRET)
        .update(`${ip}|${ua}|${day}`)
        .digest('hex');
      ops.push(
        DailyUnique.updateOne(
          { day, hash },
          { $setOnInsert: { day, hash } },
          { upsert: true }
        )
      );

      // One row per view against the same daily hash, so a journey can be
      // reconstructed: landing page, second article, where they left. PageView
      // is a per-path counter and can never answer that. Same hash, so no new
      // identifier and no change to the cookieless position; rows expire after
      // 30 days via a TTL index.
      ops.push(VisitorHit.create({ day, hash, path, at: new Date() }));
    }

    // Referrer source: external hostname or 'direct'. Internal navigation is
    // never recorded.
    const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 500) : '';
    let source = 'direct';
    if (ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, '');
        source =
          host && !host.endsWith('livelaughlocal.co.uk') && host !== 'localhost'
            ? host.slice(0, 100)
            : null;
      } catch {
        source = 'direct';
      }
    }
    if (source) {
      ops.push(
        RefStat.updateOne({ day, source }, { $inc: { count: 1 } }, { upsert: true })
      );
    }

    // /category/slug paths also bump the article's own view counter.
    const segments = path.split('/').filter(Boolean);
    if (
      segments.length === 2 &&
      CATEGORY_SLUGS.includes(segments[0]) &&
      segments[1]
    ) {
      ops.push(
        Article.updateOne(
          { slug: segments[1], status: 'published' },
          { $inc: { viewCount: 1 } }
        )
      );
    }

    await Promise.all(ops);
  } catch {
    // Swallow everything - see above.
  }
  return new Response(null, { status: 204 });
}
