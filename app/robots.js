import { SITE } from '@/lib/constants';

export default function robots() {
  // Never let Google index the temporary domain - flipped off only once
  // livelaughlocal.co.uk is attached.
  if (process.env.NOINDEX === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
