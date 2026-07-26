import { notFound } from 'next/navigation';
import { CATEGORY_SLUGS, getCategory } from '@/lib/constants';
import { getFeed, getFeaturedArticles, getMostRead } from '@/lib/articles';
import FeedWithAds from '@/components/FeedWithAds';
import MostRead from '@/components/MostRead';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.blurb,
    alternates: { canonical: `/${category}` },
    openGraph: { title: cat.name, description: cat.blurb, url: `/${category}` },
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  if (!CATEGORY_SLUGS.includes(category)) notFound();
  const cat = getCategory(category);

  const [articles, featured, mostRead] = await Promise.all([
    getFeed({ limit: 24, category }),
    getFeaturedArticles({ category }),
    getMostRead({ limit: 5, category }),
  ]);

  return (
    <div>
      <header className="border-b border-line pb-6 sm:pb-8">
        <h1 className="font-display text-3xl leading-tight sm:text-5xl">
          {cat.name}
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">{cat.blurb}</p>
      </header>

      <div className="mt-8 flex gap-10">
        <div className="min-w-0 flex-1">
          {articles.length > 0 ? (
            <FeedWithAds articles={articles} featured={featured} />
          ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
              <p className="font-display text-4xl text-coral" aria-hidden="true">
                *
              </p>
              <h2 className="mt-4 font-display text-2xl">
                Nothing filed here yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                The first {cat.name.toLowerCase()} stories are on their way.
                Check back shortly.
              </p>
            </div>
          )}

          <div className="mt-10 xl:hidden">
            <MostRead articles={mostRead} title={`Most read in ${cat.name}`} />
          </div>
        </div>

        <aside className="hidden w-[336px] shrink-0 xl:block">
          <div className="sticky top-28 space-y-8">
            <MostRead articles={mostRead} title={`Most read in ${cat.name}`} />
          </div>
        </aside>
      </div>
    </div>
  );
}
