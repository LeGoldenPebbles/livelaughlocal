import { SITE } from '@/lib/constants';

export default function robots() {
  // Never let Google index the temporary domain - flipped off only once
  // livelaughlocal.co.uk is attached.
  if (process.env.NOINDEX === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  // Paths kept out of every crawler's way. Declared once and reused, because
  // of the robots.txt rule below that catches people out.
  const disallow = ['/admin', '/api/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Googlebot-News, explicitly welcomed.
      //
      // CAREFUL: a crawler obeys exactly ONE group. Google's spec is blunt
      // about it: "User agent specific groups and global groups (*) are not
      // combined." So this group REPLACES the wildcard group for the news
      // crawler rather than adding to it, and the disallows above would stop
      // applying to it if they were not repeated here. Any path added to the
      // wildcard group must be added here too, which is why both groups share
      // the same `disallow` array.
      {
        userAgent: 'Googlebot-News',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow,
      },
      // Meta's AI training crawler, blocked outright.
      //
      // It OOM-killed this service at 18:29 on 6 August 2026. The logs for the
      // minute before the kill show 88 requests from 67 DISTINCT IPv6
      // addresses, every one inside 2a03:2880:f812::/48. That is roughly 1.3
      // requests per address, which is why the Cloudflare rate limit never
      // fired: it keys on ip.src, and Meta simply rotates addresses.
      //
      // It also disguises itself. The user agent OPENS with an ordinary Chrome
      // string and only names itself at the very end:
      //   Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
      //   (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
      //   (compatible; meta-externalagent/1.1 ...)
      // so any check that matches on the start of the UA sees a desktop
      // browser.
      //
      // This costs us nothing. meta-externalagent scrapes for AI training, not
      // for link previews. Do NOT add facebookexternalhit here: that is the
      // one that renders share cards, and the 1200x630 cards on every article
      // exist for it.
      {
        userAgent: 'meta-externalagent',
        disallow: '/',
      },
    ],
    // Non-group field: not bound to any user-agent, position is irrelevant,
    // and there is no limit on how many may be listed.
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/news-sitemap.xml`],
  };
}
