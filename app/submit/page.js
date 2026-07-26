import SubmitForm from '@/components/SubmitForm';

export const metadata = {
  title: 'Submit a story',
  description:
    'Send us your local event write-up - markets, fairs, food and days out across the UK. Free to submit, reviewed by a human editor.',
  alternates: { canonical: '/submit' },
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-article">
      <h1 className="font-display text-3xl sm:text-4xl text-ink">Submit a story</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft sm:text-base">
        <p>
          Got a local event worth shouting about? We publish write-ups of markets, craft fairs,
          food events and days out across the UK - the sort of thing you would tell a neighbour
          about over the fence.
        </p>
        <p>
          Submitting is free and every story is reviewed by a human editor before it goes
          anywhere near the site. If you would like extra visibility, there is an optional paid
          Featured placement - featured articles are always labelled as sponsored, and you are
          only charged if we approve and publish.
        </p>
        <p>
          Changed your mind later? You can request removal of your article at any time from our{' '}
          <a href="/remove" className="text-coral-deep underline underline-offset-2">
            removal page
          </a>
          .
        </p>
      </div>

      <div className="mt-8">
        <SubmitForm />
      </div>

      <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        Submissions are moderated by a human editor. We may edit lightly for style, spelling and
        length - never for meaning. Questions? Email hello@livelaughlocal.co.uk.
      </p>
    </div>
  );
}
