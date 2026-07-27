import Link from 'next/link';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { getCategory, SITE } from '@/lib/constants';
import { getArticle, getRelated, getMostRead } from '@/lib/articles';
import MostRead from '@/components/MostRead';
import ArticleBody from '@/components/ArticleBody';
import ArticleCard from '@/components/ArticleCard';
import PvBeacon from '@/components/PvBeacon';
import OutboundClicks from '@/components/OutboundClicks';

export const revalidate = 300;

// House graphics live under /news in public/ and are stored as relative URLs -
// absolutise them for anything leaving the site (og, JSON-LD).
const absoluteHero = (doc) => {
  const url = doc.heroImage && doc.heroImage.url;
  if (!url) return null;
  return url.startsWith('/') ? `${SITE.url}${url}` : url;
};

export async function generateMetadata({ params }) {
  const { category, slug } = await params;
  const doc = await getArticle(slug);
  if (!doc || doc.category !== category) return {};
  const title = doc.seo?.metaTitle || doc.title;
  const description = doc.seo?.metaDesc || doc.dek;
  const heroUrl = absoluteHero(doc);
  // Canonical uses the article's CURRENT category, not the requested one, so a
  // re-shelved article never competes with its own old URL. Share links carry
  // utm parameters, which would otherwise look like duplicate pages.
  const path = `/${doc.category}/${doc.slug}`;
  return {
    title,
    description,
    ...(doc.tags?.length ? { keywords: doc.tags } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: 'article',
      url: path,
      ...(heroUrl ? { images: [heroUrl] } : {}),
    },
  };
}

export default async function ArticlePage({ params }) {
  const { category, slug } = await params;
  const doc = await getArticle(slug);
  if (!doc) notFound();
  // Articles can be re-shelved: the slug is globally unique, so an old
  // category URL 301s to the article's current home instead of 404ing.
  if (doc.category !== category) {
    permanentRedirect(`/${doc.category}/${slug}`);
  }

  const cat = getCategory(category);
  const [related, mostRead] = await Promise.all([
    getRelated(doc, 3),
    getMostRead({ limit: 5 }),
  ]);

  // Google News asks for a clear, visible date AND time on article pages, not
  // just a date, and wants it visually separated from the first sentence.
  const published = doc.publishedAt
    ? new Date(doc.publishedAt).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      })
    : '';
  const updated =
    doc.updatedAt && doc.publishedAt && new Date(doc.updatedAt) - new Date(doc.publishedAt) > 60 * 60 * 1000
      ? new Date(doc.updatedAt).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
        })
      : '';
  const firstLocation = doc.locations?.[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    // NewsArticle site-wide: this is a news magazine, and it is the schema
    // type Google's news surfaces (News tab, Top Stories, Discover) expect.
    '@type': 'NewsArticle',
    // Google truncates headlines past ~110 characters in news surfaces.
    headline: doc.title.length > 110 ? `${doc.title.slice(0, 107).trimEnd()}...` : doc.title,
    ...(doc.dek ? { description: doc.dek } : {}),
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    ...(doc.publishedAt ? { datePublished: new Date(doc.publishedAt).toISOString() } : {}),
    ...(doc.updatedAt || doc.publishedAt
      ? { dateModified: new Date(doc.updatedAt || doc.publishedAt).toISOString() }
      : {}),
    ...(cat ? { articleSection: cat.name } : {}),
    ...(doc.tags?.length ? { keywords: doc.tags.join(', ') } : {}),
    author:
      doc.byline?.kind === 'staff'
        ? {
            '@type': 'Organization',
            name: doc.byline?.name || 'Live Laugh Local team',
            url: `${SITE.url}/about`,
          }
        : {
            '@type': 'Person',
            name: doc.byline?.name || 'Contributor',
            url: `${SITE.url}/about`,
          },
    ...(absoluteHero(doc) ? { image: [absoluteHero(doc)] } : {}),
    // NewsMediaOrganization rather than a bare Organization: this is a news
    // publisher, and it is the type Google's news surfaces expect.
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE.name,
      url: SITE.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE.url}/linelogo.png`,
      },
      parentOrganization: {
        '@type': 'Organization',
        name: 'Spaces Please Ltd',
        identifier: '16518769',
        url: 'https://spacesplease.com',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE.url}/${category}/${slug}`,
    },
  };

  return (
    <div className="flex gap-10">
      <div className="min-w-0 flex-1">
        <article className="mx-auto max-w-article" data-article-body>
          {cat && category === 'breaking-news' ? (
            <Link
              href={`/${category}`}
              className="inline-flex items-center gap-2 rounded-full bg-coral px-3 py-1 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-coral-deep"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Breaking
            </Link>
          ) : cat ? (
            <Link
              href={`/${category}`}
              className="inline-block rounded-full bg-coral-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-coral-deep transition-colors hover:bg-coral hover:text-white"
            >
              {cat.name}
            </Link>
          ) : null}

          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
            {doc.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{doc.dek}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-5 text-sm text-ink-faint">
            {/* The byline links to the page that says who we are and how these
                articles are made. Google asks news sources for a link that
                uniquely identifies the author, not a bare name. */}
            <Link
              href={doc.byline?.kind === 'staff' ? '/about' : '/about'}
              className="font-medium text-ink-soft underline-offset-2 hover:underline"
            >
              {doc.byline?.name || 'Live Laugh Local team'}
            </Link>
            {published && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={doc.publishedAt}>{published}</time>
              </>
            )}
            {updated && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={doc.updatedAt}>{updated}</time>
                </span>
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
          <OutboundClicks path={'/' + category + '/' + slug} />
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
