import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import AdSenseLoader from '@/components/AdSenseLoader';
import { SITE } from '@/lib/constants';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} - ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name,
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
  },
  // Server-rendered into the raw <head> so Google's AdSense verifier can see
  // it - the adsbygoogle script itself is injected post-hydration by
  // AdSenseLoader, which the verification crawler cannot observe.
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT
    ? { other: { 'google-adsense-account': process.env.NEXT_PUBLIC_ADSENSE_CLIENT } }
    : {}),
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  parentOrganization: { '@type': 'Organization', name: 'Spaces Please Ltd' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-site px-4 sm:px-6 py-8 sm:py-10">
          {children}
        </main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <AdSenseLoader />
      </body>
    </html>
  );
}
