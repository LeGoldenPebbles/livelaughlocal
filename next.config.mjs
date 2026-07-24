/** @type {import('next').NextConfig} */
const noindex = process.env.NOINDEX === 'true';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'spacesplease.com' },
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
