import Link from 'next/link';
import { SITE } from '@/lib/constants';

export const metadata = {
  title: 'About',
  description: `What ${SITE.name} is, who runs it, and exactly how our articles are made.`,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-article">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          About Live Laugh Local
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          A local events magazine for the UK - markets, craft fairs, food events
          and days out, written up properly.
        </p>
      </header>

      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
        <p>
          Live Laugh Local is a what&apos;s-on magazine for people who like a
          good Saturday. We cover the markets, makers fairs, street food nights
          and family days out happening across the UK, with the details that
          actually matter: where it is, when it runs, and whether it is worth
          the trip.
        </p>
        <p>
          We keep it concrete and local. No hype, no filler, no ten-things
          listicles padded out to nowhere. If we would not send a friend to an
          event, we do not write it up.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          How our articles are made
        </h2>
        <p>
          We think you deserve to know exactly how the words on this site get
          here, so here it is in plain terms.
        </p>
        <p>
          Our own pieces are researched and drafted with AI assistance. They are
          grounded in live event listings from{' '}
          <a
            href="https://spacesplease.com?utm_source=livelaughlocal&utm_medium=about"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            Spaces Please
          </a>
          , which means the dates, venues and details come from real, current
          listings rather than a model&apos;s imagination. Every draft is
          fact-checked against those listings and reviewed by a person before it
          is published. Nothing goes live on autopilot.
        </p>
        <p>
          Reader submissions are written by the people who send them in, and
          every one is reviewed by a person before publishing. Paid Featured
          placements are always labelled as such - if someone has paid for
          prominence, you will see it marked clearly on the page.
        </p>
        <p>
          Our bylines are honest too. Pieces from us are credited to the Live
          Laugh Local team. We do not invent journalist personas, and we do not
          make up quotes.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Who runs this
        </h2>
        <p>
          Live Laugh Local is part of{' '}
          <a
            href="https://spacesplease.com?utm_source=livelaughlocal&utm_medium=about"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            Spaces Please Ltd
          </a>
          , the UK marketplace that connects event organisers with stallholders
          and exhibitors. That connection is what keeps our event information
          current, and it is why you will sometimes see house adverts for Spaces
          Please around the site.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Get in touch
        </h2>
        <p>
          Spotted a mistake, got a story tip, or want to talk about a Featured
          placement? Email us at{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>{' '}
          or see the{' '}
          <Link
            href="/contact"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            contact page
          </Link>
          . If you submitted an article and want it taken down, the{' '}
          <Link
            href="/remove"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            removal page
          </Link>{' '}
          handles that without any back and forth.
        </p>
      </div>
    </article>
  );
}
