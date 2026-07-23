import Link from 'next/link';
import { getFeed, getFeaturedArticles, getMostRead } from '@/lib/articles';
import { fetchRegionIndex } from '@/lib/spEvents';
import { CATEGORIES, SITE } from '@/lib/constants';
import FeedWithAds from '@/components/FeedWithAds';
import HeroArticle from '@/components/HeroArticle';
import MostRead from '@/components/MostRead';
import NearMe from '@/components/NearMe';
import AdSlot from '@/components/ads/AdSlot';

export const revalidate = 300;

export default async function HomePage() {
  const [articles, featured, mostRead, regions] = await Promise.all([
    getFeed({ limit: 25 }),
    getFeaturedArticles(),
    getMostRead({ limit: 5 }),
    fetchRegionIndex(),
  ]);

  const [hero, ...rest] = articles;

  return (
    <div>
      {hero && <HeroArticle article={hero} />}

      <div
        className={`flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 ${
          hero ? 'mt-8 sm:mt-10' : ''
        }`}
      >
        <div>
          <h1 className="font-display text-2xl leading-tight sm:text-3xl">
            {SITE.tagline}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">{SITE.description}</p>
        </div>
        <nav aria-label="Categories" className="flex flex-wrap gap-2 md:justify-end">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-coral hover:text-coral-deep"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 flex gap-10">
        <div className="min-w-0 flex-1">
          {hero ? (
            <>
              <NearMe regions={regions} />
              <section className="mt-10" aria-labelledby="latest-heading">
                <h2 id="latest-heading" className="font-display text-2xl">
                  Latest
                </h2>
                <div className="mt-6">
                  <FeedWithAds articles={rest} featured={featured} />
                </div>
              </section>
            </>
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

          <div className="mt-10 xl:hidden">
            <MostRead articles={mostRead} />
          </div>
        </div>

        <aside className="hidden w-[336px] shrink-0 xl:block">
          <div className="sticky top-28 space-y-8">
            <AdSlot placement="sidebar" />
            <MostRead articles={mostRead} />
          </div>
        </aside>
      </div>
    </div>
  );
}
