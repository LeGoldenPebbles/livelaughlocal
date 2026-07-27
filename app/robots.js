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
    ],
    // Non-group field: not bound to any user-agent, position is irrelevant,
    // and there is no limit on how many may be listed.
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/news-sitemap.xml`],
  };
}
