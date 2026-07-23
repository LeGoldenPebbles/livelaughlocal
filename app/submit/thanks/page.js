import Link from 'next/link';

export const metadata = {
  title: 'Thanks',
};

export default async function ThanksPage({ searchParams }) {
  const sp = await searchParams;
  const invalid = sp?.invalid === '1';
  const featured = sp?.featured === '1';

  let heading = 'Email confirmed - your story is in the review queue';
  let body = (
    <>
      <p>
        Lovely stuff. A human editor will read your story - usually within a few working days -
        and we will email you whichever way it goes. We may edit lightly for style, spelling and
        length.
      </p>
      <p>
        If you change your mind at any point, you can request removal from our{' '}
        <Link href="/remove" className="text-coral-deep underline underline-offset-2">
          removal page
        </Link>
        .
      </p>
    </>
  );

  if (invalid) {
    heading = "That link didn't check out";
    body = (
      <>
        <p>
          It may have expired, or the address was not quite right. If you have submitted more
          than once, use the link in the newest email from us.
        </p>
        <p>Still stuck? Email hello@livelaughlocal.co.uk and we will sort it by hand.</p>
      </>
    );
  } else if (featured) {
    heading = 'Card saved - you will only be charged if we approve';
    body = (
      <>
        <p>
          Your card details are safely stored with Stripe but nothing has been taken. If we
          approve and publish your story, we will charge the card and email you a receipt. If we
          do not, the card is released untouched.
        </p>
        <p>
          One more thing: if you have not yet clicked the confirmation link we emailed you, do
          that now - your story only enters the review queue once your email is confirmed.
        </p>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-article py-8 sm:py-12">
      <div
        className={`rounded-xl border border-line p-6 sm:p-8 ${
          invalid ? 'bg-coral-tint' : 'bg-sage-tint'
        }`}
      >
        <h1 className="font-display text-2xl sm:text-3xl text-ink">{heading}</h1>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft sm:text-base">
          {body}
        </div>
      </div>
      <p className="mt-6">
        <Link
          href="/"
          className="inline-block rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep"
        >
          Back to the homepage
        </Link>
      </p>
    </div>
  );
}
