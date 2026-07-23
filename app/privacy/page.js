import Link from 'next/link';
import { SITE } from '@/lib/constants';

export const metadata = {
  title: 'Privacy policy',
  description: `How ${SITE.name} handles personal data - what we collect, why, how long we keep it, and your rights under UK GDPR.`,
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-article">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Privacy policy
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          We collect very little, and this page explains all of it in plain
          English.
        </p>
      </header>

      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
        <h2 className="pt-2 font-display text-2xl font-semibold text-ink">
          Who is responsible for your data
        </h2>
        <p>
          Live Laugh Local is operated by{' '}
          <strong className="font-medium text-ink">Spaces Please Ltd</strong>{' '}
          (registered in England and Wales, company number 16518769), which is
          the data controller for any personal data handled on this site. You
          can reach us about anything in this policy at{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>
          .
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          What we collect and why
        </h2>
        <p>
          <strong className="font-medium text-ink">
            Submission name and email.
          </strong>{' '}
          If you submit an article, we collect the byline name and email address
          you give us. We use them to review and publish your piece, to send you
          a confirmation link, and to verify and process any removal request you
          make later. Our legal basis is the contract we have with you when you
          submit (and our legitimate interest in running an accountable
          publication). Your email is never displayed on the site and is never
          shared for marketing.
        </p>
        <p>
          <strong className="font-medium text-ink">Payment details.</strong> If
          you pay for a Featured placement, your card details go directly to
          Stripe, our payment processor. We never see or store your card number.
          Stripe gives us only a reference to the saved payment method so we can
          take the agreed payment if your article is approved.
        </p>
        <p>
          <strong className="font-medium text-ink">Server logs.</strong> Like
          almost every website, our servers keep short-lived technical logs
          (including IP addresses) to keep the site secure and diagnose faults.
          Our legal basis is legitimate interest in security.
        </p>
        <p>
          <strong className="font-medium text-ink">Page counts.</strong> Our
          analytics is a cookieless aggregate counter: we count how many times a
          page was viewed on a given day, and nothing else. No cookies, no
          profiles, no personal data.
        </p>
        <p>
          We do not run a marketing list, and we will not add you to one. The
          only emails we send are the ones you trigger: submission
          confirmations, removal links, receipts, and approval or rejection
          notices.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          How long we keep it
        </h2>
        <p>
          We keep the email address attached to a submission for as long as the
          article is live, because it is what lets you prove the article is
          yours and have it removed. When an article is removed, we keep a
          minimal record of the removal request itself so we can show it was
          honoured. Payment records are kept as long as accounting law requires.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Your rights
        </h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Access</strong> - ask us
            what personal data we hold about you.
          </li>
          <li>
            <strong className="font-medium text-ink">Erasure</strong> - ask us
            to delete your data. If you want an article you submitted taken
            down, the{' '}
            <Link
              href="/remove"
              className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
            >
              removal page
            </Link>{' '}
            does it automatically.
          </li>
          <li>
            <strong className="font-medium text-ink">Rectification</strong> -
            ask us to correct anything we hold that is wrong.
          </li>
          <li>
            <strong className="font-medium text-ink">Complain</strong> - if you
            think we have handled your data badly, you can complain to the
            Information Commissioner&apos;s Office at{' '}
            <a
              href="https://ico.org.uk"
              className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
            >
              ico.org.uk
            </a>
            . We would appreciate the chance to put it right first.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>{' '}
          and we will respond within one month.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Cookies
        </h2>
        <p>
          We set no third-party cookies. The full detail, all three paragraphs
          of it, is on our{' '}
          <Link
            href="/cookies"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            cookies page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
