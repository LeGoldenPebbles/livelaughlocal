import Link from 'next/link';
import { getCategory } from '@/lib/constants';

// "What's hot" module - ranked by the cookieless viewCount beacon.
export default function MostRead({ articles, title = 'Most read' }) {
  if (!articles?.length) return null;
  return (
    <section className="rounded-xl border border-line bg-white/60 p-5">
      <h2 className="font-display text-lg">{title}</h2>
      <ol className="mt-4 space-y-4">
        {articles.map((a, i) => (
          <li key={a.slug} className="flex gap-3">
            <span
              className="w-6 shrink-0 font-display text-2xl leading-none text-coral/60"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <Link
                href={`/${a.category}/${a.slug}`}
                className="block text-sm font-medium leading-snug transition-colors hover:text-coral-deep"
              >
                {a.title}
              </Link>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                {getCategory(a.category)?.name}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
