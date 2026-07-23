import Link from 'next/link';

function AdTag({ label = 'Ad' }) {
  return (
    <span className="absolute right-2 top-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
      {label}
    </span>
  );
}

function Wrapper({ href, className, children }) {
  const cls = `relative block h-full w-full overflow-hidden rounded-lg border border-line bg-coral-tint transition-colors hover:border-coral ${className || ''}`;
  if (href?.startsWith('/')) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

// layout: 'banner' (in-article: 300x250 mobile / 728x90 desktop),
//         'card' (in-feed, matches ArticleCard proportions),
//         'tower' (sidebar 300x600, desktop only)
export default function HouseAdUnit({ ad, layout = 'banner' }) {
  if (!ad) return null;

  if (layout === 'card') {
    return (
      <Wrapper href={ad.targetUrl} className="flex h-full flex-col">
        <AdTag label="Sponsored" />
        <div className="flex aspect-[3/2] items-center justify-center bg-sage-tint">
          <span className="font-display text-6xl text-sage">*</span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display text-lg leading-snug">{ad.headline}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{ad.body}</p>
          <span className="mt-auto pt-3 text-sm font-medium text-coral-deep">
            {ad.cta} →
          </span>
        </div>
      </Wrapper>
    );
  }

  if (layout === 'tower') {
    return (
      <Wrapper href={ad.targetUrl} className="flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AdTag />
        <span className="font-display text-7xl text-coral">*</span>
        <h3 className="font-display text-2xl leading-snug">{ad.headline}</h3>
        <p className="text-sm leading-relaxed text-ink-soft">{ad.body}</p>
        <span className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white">
          {ad.cta}
        </span>
      </Wrapper>
    );
  }

  // banner: stacked and centred inside 250px on mobile, single row inside 90px on desktop
  return (
    <Wrapper
      href={ad.targetUrl}
      className="flex flex-col items-center justify-center gap-2 px-4 text-center md:flex-row md:justify-between md:gap-4 md:text-left"
    >
      <AdTag />
      <div className="min-w-0">
        <h3 className="font-display text-lg leading-snug md:truncate">{ad.headline}</h3>
        <p className="text-sm text-ink-soft md:hidden">{ad.body}</p>
      </div>
      <span className="shrink-0 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white">
        {ad.cta}
      </span>
    </Wrapper>
  );
}
