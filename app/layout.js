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

// NewsMediaOrganization, not a plain Organization: Google's news surfaces read
// this to work out who publishes the site, and the transparency policy asks for
// identifiable ownership and a contact route.
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: `${SITE.url}/linelogo.png` },
  email: 'hello@spacesplease.com',
  ethicsPolicy: `${SITE.url}/about`,
  publishingPrinciples: `${SITE.url}/about`,
  foundingDate: '2026',
  parentOrganization: {
    '@type': 'Organization',
    name: 'Spaces Please Ltd',
    identifier: '16518769',
    url: 'https://spacesplease.com',
    address: { '@type': 'PostalAddress', addressCountry: 'GB' },
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'editorial',
    email: 'hello@spacesplease.com',
    url: `${SITE.url}/contact`,
  },
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
        {/* Feed autodiscovery, rendered rather than declared through the
            metadata API on purpose. Page-level `alternates` (we set a canonical
            on every route) shallowly REPLACES the layout's alternates object,
            so a metadata-declared feed link would silently disappear from every
            page that has a canonical, which is all of them. React hoists this
            into the head. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${SITE.name} - latest stories`}
          href={`${SITE.url}/rss.xml`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <AdSenseLoader />
      </body>
    </html>
  );
}
