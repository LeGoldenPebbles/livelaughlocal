import { NextResponse } from 'next/server';

/**
 * Refuse the crawlers that are big enough to kill this container.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT JUST robots.txt.
 *
 * The service was OOM-killed at 18:29 on 6 August 2026, the fourth time since
 * 26 July. In the 30 minutes around it, 73 of 78 requests came from
 * meta-externalagent, Meta's AI training crawler, spread across 57 distinct
 * IPv6 addresses inside 2a03:2880:f812::/48. That is 94 per cent of all
 * traffic to the site.
 *
 * Three things make it hard to stop any other way:
 *
 *  1. The Cloudflare rate limit keys on ip.src. At roughly 1.3 requests per
 *     address it never fires, because Meta rotates across a whole /48.
 *  2. The user agent OPENS with an ordinary Chrome string and only names
 *     itself at the very end, so anything matching the start sees a browser.
 *  3. robots.txt is voluntary AND cached by the crawler for hours. We added a
 *     Disallow at 18:45; it will not take effect this evening.
 *
 * So this is the layer that acts immediately. It is deliberately narrow: a
 * substring match on a handful of named AI-training crawlers, returning 403
 * before any page render or image optimisation happens. That last part is the
 * point. The memory that kills us is sharp's native buffers in the image
 * optimiser, which NODE_OPTIONS=--max-old-space-size cannot bound, so the only
 * real defence is not doing the work at all.
 *
 * NOT BLOCKED, deliberately:
 *  - facebookexternalhit renders the 1200x630 share cards on every article.
 *  - Googlebot, Googlebot-News, Googlebot-Image and AdsBot. We want indexing,
 *    and an AdSense review crawl must never be turned away.
 *  - Ordinary browsers.
 *
 * If a legitimate crawler ever ends up here, remove it from the list rather
 * than weakening the match.
 */

// Matched case-insensitively as a substring of the full user agent.
const BLOCKED_AGENTS = [
  'meta-externalagent', // Meta AI training. Caused the 6 Aug 2026 kill.
  'Bytespider', // ByteDance. Widely reported to ignore robots.txt.
  'ClaudeBot',
  'GPTBot',
  'CCBot',
  'Amazonbot',
  'Applebot-Extended', // Apple AI training, NOT plain Applebot (search).
  'PerplexityBot',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'DataForSeoBot',
];

const blockedRe = new RegExp(BLOCKED_AGENTS.join('|'), 'i');

export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  if (blockedRe.test(ua)) {
    // 403 rather than 429: this is not "slow down", it is "not for you", and a
    // 429 invites a retry loop that costs us the same memory again.
    return new NextResponse('Not available to automated content collection.', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        // Nothing downstream should cache a per-user-agent decision as though
        // it were the page.
        'cache-control': 'no-store',
        vary: 'user-agent',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Everything except genuinely static build output. /_next/image is
  // deliberately INCLUDED: image optimisation is the expensive path, so
  // excluding it would leave the actual memory problem untouched.
  matcher: ['/((?!_next/static|_next/webpack-hmr|favicon.ico).*)'],
};
