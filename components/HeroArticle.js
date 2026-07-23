import Link from 'next/link';
import Image from 'next/image';
import { getCategory } from '@/lib/constants';

// Lead story hero: image bleeds from the left, darkening towards the right,
// with the title, dek and Read more sitting over the dark side. On mobile the
// gradient rotates to bottom-up and the text anchors to the base.
export default function HeroArticle({ article }) {
  if (!article) return null;
  const img = article.heroImage?.url;
  const cat = getCategory(article.category);

  return (
    <Link
      href={`/${article.category}/${article.slug}`}
      className="group relative block min-h-[440px] overflow-hidden rounded-2xl border border-line bg-ink sm:min-h-[400px] lg:min-h-[440px]"
    >
      {img ? (
        <Image
          src={img}
          alt={article.heroImage?.alt || article.title}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 880px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sage to-ink" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 sm:bg-gradient-to-r sm:from-transparent sm:via-black/40 sm:to-black/85" />

      <div className="relative z-10 flex min-h-[440px] flex-col justify-end p-6 sm:absolute sm:inset-y-0 sm:right-0 sm:min-h-0 sm:w-[55%] sm:justify-center sm:p-8 lg:w-1/2 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {cat && (
            <span className="rounded-full bg-coral px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
              {cat.name}
            </span>
          )}
          {article.locations?.[0] && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              {article.locations[0]}
            </span>
          )}
        </div>
        <h2 className="mt-4 font-display text-2xl leading-tight text-white sm:text-3xl lg:text-4xl">
          {article.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 line-clamp-3 sm:text-base">
          {article.dek}
        </p>
        <span className="mt-6 inline-flex w-fit items-center rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-coral-deep">
          Read more
        </span>
      </div>
    </Link>
  );
}
