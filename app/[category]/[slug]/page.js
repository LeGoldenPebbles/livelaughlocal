import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCategory, SITE } from '@/lib/constants';
import { getArticle, getRelated, getMostRead } from '@/lib/articles';
import MostRead from '@/components/MostRead';
import ArticleBody from '@/components/ArticleBody';
import ArticleCard from '@/components/ArticleCard';
import PvBeacon from '@/components/PvBeacon';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { category, slug } = await params;
  const doc = await getArticle(slug);
  if (!doc || doc.category !== category) return {};
  const title = doc.seo?.metaTitle || doc.title;
  const description = doc.seo?.metaDesc || doc.dek;
  return {
    title,
    description,
    ...(doc.tags?.length ? { keywords: doc.tags } : {}),
    openGraph: {
      title,
      description,
      type: 'article',
      ...(doc.heroImage?.url ? { images: [doc.heroImage.url] } : {}),
    },
  };
}

export default async function ArticlePage({ params }) {
  const { category, slug } = await params;
  const doc = await getArticle(slug);
  if (!doc || doc.category !== category) notFound();

  const cat = getCategory(category);
  const [related, mostRead] = await Promise.all([
    getRelated(doc, 3),
    getMostRead({ limit: 5 }),
  ]);

  const published = doc.publishedAt
    ? new Date(doc.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const firstLocation = doc.locations?.[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: doc.title,
    ...(doc.publishedAt ? { datePublished: doc.publishedAt } : {}),
    ...(doc.updatedAt || doc.publishedAt
      ? { dateModified: doc.updatedAt || doc.publishedAt }
      : {}),
    author:
      doc.byline?.kind === 'staff'
        ? {
            '@type': 'Organization',
            name: doc.byline?.name || 'Live Laugh Local team',
          }
        : { '@type': 'Person', name: doc.byline?.name || 'Contributor' },
    ...(doc.heroImage?.url ? { image: [doc.heroImage.url] } : {}),
    publisher: { '@type': 'Organization', name: SITE.name },
    mainEntityOfPage: `${SITE.url}/${category}/${slug}`,
  };

  return (
    <div className="flex gap-10">
      <div className="min-w-0 flex-1">
        <article className="mx-auto max-w-article">
          {cat && (
            <Link
              href={`/${category}`}
              className="inline-block rounded-full bg-coral-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-coral-deep transition-colors hover:bg-coral hover:text-white"
            >
              {cat.name}
            </Link>
          )}

          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
            {doc.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{doc.dek}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-5 text-sm text-ink-faint">
            <span className="font-medium text-ink-soft">
              {doc.byline?.name || 'Live Laugh Local team'}
            </span>
            {published && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={doc.publishedAt}>{published}</time>
              </>
            )}
            {firstLocation && (
              <>
                <span aria-hidden="true">·</span>
                <span>{firstLocation}</span>
              </>
            )}
          </div>

          {doc.heroImage?.url && (
            <figure className="mt-6">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-coral-tint">
                <Image
                  src={doc.heroImage.url}
                  alt={doc.heroImage.alt || doc.title}
                  fill
                  sizes="(max-width: 704px) 100vw, 672px"
                  className="object-cover"
                  priority
                />
              </div>
              {doc.heroImage.credit && (
                <figcaption className="mt-2 text-xs text-ink-faint">
                  {doc.heroImage.credit}
                </figcaption>
              )}
            </figure>
          )}

          <div className="mt-8">
            <ArticleBody bodyHtml={doc.bodyHtml} />
          </div>

          {doc.origin === 'submission' && doc.featured?.active && (
            <p className="mt-8 text-xs text-ink-faint">
              Featured contribution - this article is a paid placement.
            </p>
          )}

          {doc.tags?.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Topics">
              {doc.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-soft"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10 border-t border-line pt-4 text-xs text-ink-faint">
            Event information on Live Laugh Local comes from live listings on{' '}
            <a
              href="https://spacesplease.com?utm_source=livelaughlocal&utm_medium=article_footer"
              className="underline decoration-line underline-offset-2 transition-colors hover:text-coral-deep"
            >
              Spaces Please
            </a>
            .
          </p>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          {related.length > 0 && (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="font-display text-2xl">More like this</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {related.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            </section>
          )}

          <PvBeacon path={'/' + category + '/' + slug} />
        </article>
      </div>

      <aside className="hidden w-[336px] shrink-0 lg:block">
        <div className="sticky top-28 space-y-8">
          <MostRead articles={mostRead} />
        </div>
      </aside>
    </div>
  );
}
