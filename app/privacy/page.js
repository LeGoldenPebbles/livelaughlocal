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
          (registered in England and Wales, company number 16518769, registered
          office 7 Elm Close, Kings Cliffe, PE8 6WX, United Kingdom), which is
          the data controller for any personal data handled on this site. You
          can reach us about anything in this policy at{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>{' '}
          or by post to that address. The rules for using the site itself live
          in our{' '}
          <Link
            href="/terms"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            terms of use
          </Link>
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
          Who helps us run the site
        </h2>
        <p>
          A small number of service providers process data on our behalf, under
          contracts that limit what they can do with it:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Stripe</strong> - processes
            payments for Featured placements. Your card details go to Stripe
            directly and never touch our servers.
          </li>
          <li>
            <strong className="font-medium text-ink">Cloudflare</strong> - sits
            in front of the site as our content delivery network and security
            layer, and stores uploaded images.
          </li>
          <li>
            <strong className="font-medium text-ink">Render</strong> - hosts the
            site and its database infrastructure.
          </li>
          <li>
            <strong className="font-medium text-ink">Google</strong> - only once
            advertising goes live. We are introducing Google AdSense adverts;
            any advertising cookies or identifiers will be governed by a consent
            banner that asks your permission first. Until you see that banner,
            Google receives nothing from your visits here.
          </li>
        </ul>
        <p>
          We do not sell personal data, and we do not share it with anyone else
          except where the law requires it.
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
          Today we set no third-party cookies at all - the only cookie on the
          site is the essential admin login cookie, and our analytics is
          cookieless. When AdSense advertising arrives, advertising cookies will
          only be set after you say yes to a consent banner. The full detail is
          on our{' '}
          <Link
            href="/cookies"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            cookies page
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
