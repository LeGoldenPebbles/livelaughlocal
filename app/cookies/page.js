import Link from 'next/link';
import { SITE } from '@/lib/constants';

export const metadata = {
  title: 'Cookies',
  description: `${SITE.name} sets no third-party cookies today. Here is the whole story, and it is a short one.`,
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-article">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Cookies
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          The short version: today we set no third-party cookies. Here is the
          long version, which is also short.
        </p>
      </header>

      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
        <p>
          Today, Live Laugh Local sets no third-party cookies. No advertising
          cookies, no social media pixels, no tracking scripts from anyone else.
        </p>
        <p>
          The only cookie on this site is an essential login cookie used in the
          admin area, so the person who runs the site can stay signed in while
          reviewing articles. It does nothing on the public pages you read, and
          it is classed as strictly necessary, which is why no consent banner
          pops up when you visit.
        </p>
        <p>
          Our analytics does not use cookies either. We count page views as
          plain aggregate numbers - this page was viewed this many times today -
          with no identifiers, no profiles and no personal data attached.
        </p>
        <p>
          One change is coming: we are introducing adverts served by Google
          AdSense. When advertising cookies arrive with them, a consent banner
          run through a Google-certified consent management platform will ask
          for your permission first, before anything is set, and this page will
          be updated to list exactly which cookies they are. Until you see that
          banner, nothing has changed.
        </p>
        <p>
          Questions about any of this are welcome at{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>
          , and the wider picture of how we handle data lives in our{' '}
          <Link
            href="/privacy"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            privacy policy
          </Link>
          .
        </p>
        <p className="border-t border-line pt-4 text-sm text-ink-faint">
          Last updated: 23 July 2026
        </p>
      </div>
    </article>
  );
}
