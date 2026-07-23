import RemoveForm from '@/components/RemoveForm';

export const metadata = {
  title: 'Remove your article',
  description:
    'Submitted an article to Live Laugh Local and want it taken down? Request a one-click removal link here.',
};

export default async function RemovePage({ searchParams }) {
  const sp = await searchParams;
  const done = sp?.done === '1';
  const invalid = sp?.invalid === '1';

  return (
    <div className="mx-auto max-w-article">
      {done && (
        <div className="mb-8 rounded-xl border border-line bg-sage-tint p-6">
          <h2 className="font-display text-xl text-ink">Article removed</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
            Thanks for letting us know. The article is off the site and out of our sitemap.
          </p>
        </div>
      )}
      {invalid && (
        <div className="mb-8 rounded-xl border border-line bg-coral-tint p-6">
          <h2 className="font-display text-xl text-ink">That link didn't check out</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
            It may have expired or been copied incompletely. Request a fresh removal link below
            - or email hello@livelaughlocal.co.uk and we will handle it by hand.
          </p>
        </div>
      )}

      <h1 className="font-display text-3xl sm:text-4xl text-ink">Remove your article</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft sm:text-base">
        <p>
          If you submitted an article and want it gone, no problem and no questions asked.
          Enter the article link (or its slug) along with the email address you left when you
          submitted it.
        </p>
        <p>
          If they match, we will email you a one-click removal link. Click it and the article
          comes down straight away - no waiting on us.
        </p>
      </div>

      <div className="mt-8">
        <RemoveForm />
      </div>

      <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        Can't get into the email address you used? Write to hello@livelaughlocal.co.uk from
        wherever you can and we will sort it manually.
      </p>
    </div>
  );
}
