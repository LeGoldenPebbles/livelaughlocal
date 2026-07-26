/** @type {import('next').NextConfig} */
const noindex = process.env.NOINDEX === 'true';

const nextConfig = {
  images: {
    // Memory discipline. Next decodes the FULL source image into memory to
    // optimise it, so a 4600px Wikimedia original costs ~45MB of raw pixels per
    // request. Googlebot-Image crawling those repeatedly OOM killed this service
    // on 26 July 2026. Heroes are now pre-sized into R2 by
    // scripts/rehost-heroes.mjs, and these settings cap the damage any future
    // large image can do:
    //  - fewer widths generated = far fewer optimiser invocations
    //  - a long cache TTL means each variant is computed once, not per crawl
    deviceSizes: [640, 828, 1080, 1600],
    imageSizes: [256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'spacesplease.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      ...(process.env.R2_PUBLIC_HOST
        ? [{ protocol: 'https', hostname: process.env.R2_PUBLIC_HOST }]
        : []),
    ],
  },
  async headers() {
    if (!noindex) return [];
    // Never let Google build history on a temporary domain. Flip NOINDEX off
    // only once livelaughlocal.co.uk is attached.
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
