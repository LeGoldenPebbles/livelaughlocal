import Link from 'next/link';
import Image from 'next/image';
import { getCategory } from '@/lib/constants';

// Full-bleed lead story on a black band: the image takes the left ~60% and
// fades into black; the title, dek and Read more sit in white on the right.
// On mobile the image stacks on top, fading into black at its base, with the
// text below. The band runs edge to edge; content is capped for huge screens.
export default function HeroArticle({ article }) {
  if (!article) return null;
  const img = article.heroImage?.url;
  const cat = getCategory(article.category);

  return (
    <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 bg-black sm:-mt-10">
      <Link href={`/${article.category}/${article.slug}`} className="group block">
        <div className="mx-auto flex max-w-[96rem] flex-col sm:h-[420px] sm:flex-row lg:h-[500px]">
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-auto sm:h-full sm:w-[60%]">
            {img ? (
              <Image
                src={img}
                alt={article.heroImage?.alt || article.title}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-sage to-ink" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-60% to-black sm:bg-gradient-to-r sm:from-transparent sm:from-50% sm:to-black" />
          </div>

          <div className="relative flex w-full flex-col justify-center px-4 pb-10 pt-2 sm:w-[40%] sm:py-10 sm:pl-2 sm:pr-8 lg:pr-12">
            <div className="flex flex-wrap items-center gap-2">
              {cat && article.category === 'breaking-news' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-coral px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Breaking
                </span>
              ) : cat ? (
                <span className="rounded-full bg-coral px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
                  {cat.name}
                </span>
              ) : null}
              {article.locations?.[0] && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                  {article.locations[0]}
                </span>
              )}
            </div>
            <h2 className="mt-4 font-display text-3xl leading-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {article.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80 line-clamp-3 sm:text-base">
              {article.dek}
            </p>
            <span className="mt-6 inline-flex w-fit items-center rounded-full bg-coral px-6 py-3 text-sm font-medium text-white transition-colors group-hover:bg-coral-deep">
              Read more
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
