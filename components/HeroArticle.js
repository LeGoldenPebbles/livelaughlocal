import Link from 'next/link';
import Image from 'next/image';
import { getCategory } from '@/lib/constants';

// Full-bleed lead story: the band runs edge to edge of the viewport (breaking
// out of the page container), image bleeding from the left and darkening
// towards the right, with the title, dek and Read more over the dark side.
// Text stays aligned to the site grid via the inner max-w-site container.
// On mobile the gradient rotates to bottom-up and text anchors to the base.
export default function HeroArticle({ article }) {
  if (!article) return null;
  const img = article.heroImage?.url;
  const cat = getCategory(article.category);

  return (
    <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 sm:-mt-10">
      <Link
        href={`/${article.category}/${article.slug}`}
        className="group relative block min-h-[480px] overflow-hidden bg-ink sm:min-h-[440px] lg:min-h-[520px]"
      >
        {img ? (
          <Image
            src={img}
            alt={article.heroImage?.alt || article.title}
            fill
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sage to-ink" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 sm:bg-gradient-to-r sm:from-transparent sm:via-black/40 sm:to-black/85" />

        <div className="relative z-10 mx-auto flex min-h-[480px] max-w-site flex-col justify-end px-4 py-8 sm:min-h-[440px] sm:justify-center sm:px-6 lg:min-h-[520px]">
          <div className="sm:ml-auto sm:w-[55%] sm:pl-8 lg:w-1/2">
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
            <h2 className="mt-4 font-display text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
              {article.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 line-clamp-3 sm:text-base lg:text-lg">
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
