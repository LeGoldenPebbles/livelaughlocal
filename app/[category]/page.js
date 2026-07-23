import { notFound } from 'next/navigation';
import { CATEGORY_SLUGS, getCategory } from '@/lib/constants';
import { getFeed, getFeaturedArticles } from '@/lib/articles';
import FeedWithAds from '@/components/FeedWithAds';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.blurb,
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  if (!CATEGORY_SLUGS.includes(category)) notFound();
  const cat = getCategory(category);

  const [articles, featured] = await Promise.all([
    getFeed({ limit: 24, category }),
    getFeaturedArticles({ category }),
  ]);

  return (
    <div>
      <header className="border-b border-line pb-8 sm:pb-10">
        <h1 className="font-display text-3xl leading-tight sm:text-5xl">
          {cat.name}
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">{cat.blurb}</p>
      </header>

      <section className="pt-8 sm:pt-10">
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
      </section>
    </div>
  );
}
