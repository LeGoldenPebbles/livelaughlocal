import Link from 'next/link';
import Image from 'next/image';
import { getCategory } from '@/lib/constants';

export default function ArticleCard({ article, priority = false }) {
  const img = article.heroImage?.url;
  const cat = getCategory(article.category);
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Link href={`/${article.category}/${article.slug}`} className="group flex flex-col">
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-line bg-coral-tint">
        {img ? (
          <Image
            src={img}
            alt={article.heroImage?.alt || article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-6xl text-coral">*</span>
          </div>
        )}
        {article.featured?.active && (
          <span className="absolute left-3 top-3 rounded-full bg-coral px-2.5 py-1 text-xs font-medium text-white">
            Featured
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-wide text-ink-faint">
        {cat && <span className="font-medium text-coral-deep">{cat.name}</span>}
        {date && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt}>{date}</time>
          </>
        )}
        {article.locations?.[0] && (
          <>
            <span aria-hidden="true">·</span>
            <span className="normal-case">{article.locations[0]}</span>
          </>
        )}
      </div>
      <h3 className="mt-1.5 font-display text-xl leading-snug decoration-coral/50 underline-offset-4 group-hover:underline">
        {article.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft line-clamp-3">
        {article.dek}
      </p>
    </Link>
  );
}
