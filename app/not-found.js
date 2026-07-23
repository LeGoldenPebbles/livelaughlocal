import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-article py-16 text-center sm:py-24">
      <p className="font-display text-6xl text-coral" aria-hidden="true">
        *
      </p>
      <h1 className="mt-4 font-display text-3xl sm:text-4xl">
        Nothing on here
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        That page has packed up its stall and gone home. The good stuff is
        still out there, though.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep"
        >
          Back to the front page
        </Link>
        <Link
          href="/whats-on"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-coral hover:text-coral-deep"
        >
          See what&apos;s on
        </Link>
      </div>
    </div>
  );
}
