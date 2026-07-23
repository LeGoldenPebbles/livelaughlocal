import Link from 'next/link';
import { getFeed, getFeaturedArticles } from '@/lib/articles';
import { CATEGORIES, SITE } from '@/lib/constants';
import FeedWithAds from '@/components/FeedWithAds';

export const revalidate = 300;

export default async function HomePage() {
  const [articles, featured] = await Promise.all([
    getFeed({ limit: 24 }),
    getFeaturedArticles(),
  ]);

  return (
    <div>
      <section className="border-b border-line pb-8 sm:pb-10">
        <h1 className="font-display text-3xl leading-tight sm:text-5xl">
          {SITE.tagline}
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">{SITE.description}</p>
        <nav aria-label="Categories" className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-coral hover:text-coral-deep"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </section>

      <section className="pt-8 sm:pt-10">
        {articles.length > 0 ? (
          <FeedWithAds articles={articles} featured={featured} />
        ) : (
          <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-4xl text-coral" aria-hidden="true">
              *
            </p>
            <h2 className="mt-4 font-display text-2xl">
              The first stories are on their way
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              We are out visiting markets, fairs and food events right now.
              Check back shortly for the first write-ups.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
