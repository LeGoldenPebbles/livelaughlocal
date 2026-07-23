import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-ink-soft transition-colors hover:bg-coral-tint hover:text-ink"
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto max-w-site px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="font-display lowercase tracking-tight text-2xl sm:text-[1.75rem]"
          >
            live laugh local<span className="text-coral"> *</span>
          </Link>
          <Link
            href="/submit"
            className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep"
          >
            Submit a story
          </Link>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto whitespace-nowrap px-4 pb-3 text-sm sm:mx-0 sm:px-0">
          <NavLink href="/">Latest</NavLink>
          {CATEGORIES.map((c) => (
            <NavLink key={c.slug} href={`/${c.slug}`}>
              {c.name}
            </NavLink>
          ))}
          <NavLink href="/whats-on">What&apos;s on</NavLink>
        </nav>
      </div>
    </header>
  );
}
