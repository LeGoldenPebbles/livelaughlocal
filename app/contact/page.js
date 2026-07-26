import Link from 'next/link';
import { SITE } from '@/lib/constants';
import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact',
  description: `How to reach the ${SITE.name} team - corrections, story tips, removal requests and featured placements.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-article">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          One inbox, read by a person. No ticket numbers.
        </p>
      </header>

      <div className="mt-8">
        <ContactForm />
      </div>

      <div className="mt-10 space-y-4 border-t border-line pt-8 leading-relaxed text-ink-soft">
        <p>
          Prefer email? Write to{' '}
          <a
            href="mailto:hello@spacesplease.com"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@spacesplease.com
          </a>{' '}
          for anything to do with the site. That includes:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Corrections</strong> - if
            we have got a date, venue or detail wrong, tell us and we will fix
            it promptly.
          </li>
          <li>
            <strong className="font-medium text-ink">Story tips</strong> - know
            about a market, fair or event we should cover? We would genuinely
            like to hear about it.
          </li>
          <li>
            <strong className="font-medium text-ink">Removal requests</strong>{' '}
            - if you submitted an article and want it taken down, the quickest
            route is the{' '}
            <Link
              href="/remove"
              className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
            >
              removal page
            </Link>
            , which handles it automatically. Email works too if you prefer.
          </li>
          <li>
            <strong className="font-medium text-ink">
              Featured placement questions
            </strong>{' '}
            - anything about paid Featured articles, from pricing to how the
            label works.
          </li>
        </ul>
        <p>
          We aim to reply within a couple of working days. If it is urgent, say
          so in the subject line and we will do our best.
        </p>
      </div>
    </article>
  );
}
