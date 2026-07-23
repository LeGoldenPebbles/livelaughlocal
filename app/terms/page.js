import Link from 'next/link';
import { SITE } from '@/lib/constants';

export const metadata = {
  title: 'Terms of use',
  description: `The rules for using ${SITE.name} - submissions, featured placements, advertising and the small print, in plain English.`,
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-article">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Terms of use
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          The rules for using Live Laugh Local, written to be read rather than
          skipped.
        </p>
      </header>

      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
        <h2 className="pt-2 font-display text-2xl font-semibold text-ink">
          Who we are
        </h2>
        <p>
          Live Laugh Local is operated by{' '}
          <strong className="font-medium text-ink">Spaces Please Limited</strong>
          , registered in England and Wales under company number 16518769, with
          its registered office at 7 Elm Close, Kings Cliffe, PE8 6WX, United
          Kingdom. In these terms, &quot;we&quot;, &quot;us&quot; and
          &quot;our&quot; mean Spaces Please Limited, and &quot;the site&quot;
          means Live Laugh Local.
        </p>
        <p>
          By using the site, or by sending us a submission, you agree to these
          terms and to our{' '}
          <Link
            href="/privacy"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            privacy policy
          </Link>
          . If you do not agree, please do not use the site.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          The service
        </h2>
        <p>
          Live Laugh Local is an online magazine about UK markets, fairs, food
          events and days out. We publish two kinds of article: our own pieces,
          which are drafted with AI assistance, grounded in live event listings
          from Spaces Please, fact-checked against those listings and reviewed
          by a person before publishing (explained in full on our{' '}
          <Link
            href="/about"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            about page
          </Link>
          ), and reader submissions, which are reviewed by a person before
          publishing. Nothing goes live on autopilot.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Using the site
        </h2>
        <p>
          Reading the site is free and there are no user accounts. You are
          welcome to read, share links to and quote briefly from our articles.
          If you pay for a featured placement, you confirm that you are at least
          18 and able to enter a binding contract.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Event information can change
        </h2>
        <p>
          The event details we publish - dates, times, venues, prices - come
          from organiser listings and from the information available when the
          article was written. Organisers change, move and cancel events, and an
          article is not updated the moment they do.{' '}
          <strong className="font-medium text-ink">
            Always check with the organiser or the event&apos;s own page before
            travelling.
          </strong>{' '}
          We are not the organiser of any event we write about, and we are not
          responsible for the events themselves.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Submissions
        </h2>
        <p>
          Anyone can submit an article through our{' '}
          <Link
            href="/submit"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            submission form
          </Link>{' '}
          by providing a byline name and an email address. A submission only
          enters our review queue once you click the confirmation link we email
          you.
        </p>
        <p>
          We review every submission before publishing. We may edit lightly for
          style, clarity, length and house style, and we may decline to publish
          a submission at our discretion. We are not obliged to publish
          anything.
        </p>
        <p>
          By submitting, you grant us a non-exclusive, worldwide, royalty-free
          licence to publish, edit, adapt for layout, display and promote your
          article and any images with it, on the site and in our own promotion
          of the site. You keep ownership of your content.
        </p>
        <p>
          You warrant that you wrote the content or otherwise have the rights to
          it and to any images, that it is lawful and not misleading, and that
          it does not infringe anyone else&apos;s rights or include another
          person&apos;s personal information without their permission.
        </p>
        <p>
          If you want an article you submitted taken down, the{' '}
          <Link
            href="/remove"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            removal page
          </Link>{' '}
          handles it: enter the email address the article was submitted with,
          click the link we send, and the article comes down.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Featured placements
        </h2>
        <p>
          A featured placement costs £100 for 12 months in one category. When
          you choose it at submission, your card is saved through Stripe, our
          payment processor, but{' '}
          <strong className="font-medium text-ink">
            it is charged only if we approve and publish your article
          </strong>
          . If we do not publish, nothing is taken. Payment processing is
          handled entirely by Stripe - we never see or store your card number.
        </p>
        <p>
          Featured articles are always labelled as Featured or Sponsored. A
          placement buys prominence on the site for the agreed period; it does
          not buy editorial approval, and we make no guarantee of traffic,
          clicks, rankings or any commercial result.
        </p>
        <p>
          If we unpublish a featured article before the 12 months are up for
          reasons other than your breach of these terms, we will refund the
          unused portion pro rata. If the article comes down because you
          breached these terms, no refund is due. Your statutory rights are not
          affected.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Advertising
        </h2>
        <p>
          The site carries our own house promotions, mainly for Spaces Please,
          and will carry adverts served by Google AdSense. Adverts and sponsored
          content are always labelled. Advertising cookies will only ever be set
          with your consent through a banner - the detail is on our{' '}
          <Link
            href="/cookies"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            cookies page
          </Link>
          .
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Intellectual property
        </h2>
        <p>
          The articles we write, the site design and the Live Laugh Local name
          and wordmark belong to us or our licensors. You may not republish our
          content wholesale, or use automated tools to copy it, without our
          written permission. Submitted articles remain the property of their
          authors, subject to the licence above.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Acceptable use
        </h2>
        <p>You must not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            submit content that is unlawful, defamatory, misleading or infringes
            anyone else&apos;s rights;
          </li>
          <li>
            misuse our forms, including sending spam or submitting on behalf of
            someone without their knowledge;
          </li>
          <li>
            scrape, harvest or bulk-download site content by automated means,
            beyond normal search-engine indexing;
          </li>
          <li>
            interfere with the site&apos;s operation or attempt to bypass its
            security or rate limits; or
          </li>
          <li>impersonate any person or organisation.</li>
        </ul>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Liability
        </h2>
        <p>
          The site is provided on an &quot;as available&quot; basis. We take
          care over what we publish, but we do not warrant that the site or its
          content is error-free, complete, up to date or always available.
        </p>
        <p>
          Nothing in these terms excludes or limits liability that cannot
          lawfully be excluded, including liability for death or personal injury
          caused by negligence, or for fraud. Subject to that, we are not liable
          for indirect or consequential loss, or for loss of profit, revenue,
          goodwill, opportunity or data, and our total liability to you arising
          from the site in any 12-month period will not exceed the greater of
          £100 and the amounts you paid us during that period.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Changes to these terms
        </h2>
        <p>
          We may update these terms from time to time. The date below shows the
          latest revision, and significant changes will be noted on the site.
          Continuing to use the site after a change means you accept the updated
          terms. A change will not remove a refund you were already entitled to.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Governing law
        </h2>
        <p>
          These terms are governed by the laws of England and Wales, and the
          courts of England and Wales have jurisdiction, except that if you are
          a consumer you may rely on any mandatory consumer protections and may
          bring proceedings in any other court permitted by law.
        </p>

        <h2 className="pt-4 font-display text-2xl font-semibold text-ink">
          Contact
        </h2>
        <p>
          Questions, complaints and legal notices can be sent to{' '}
          <a
            href="mailto:hello@livelaughlocal.co.uk"
            className="font-medium text-coral-deep underline underline-offset-2 hover:text-coral"
          >
            hello@livelaughlocal.co.uk
          </a>{' '}
          or to Spaces Please Limited, 7 Elm Close, Kings Cliffe, PE8 6WX,
          United Kingdom.
        </p>

        <p className="border-t border-line pt-4 text-sm text-ink-faint">
          Last updated: 23 July 2026
        </p>
      </div>
    </article>
  );
}
