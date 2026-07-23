import Link from 'next/link';
import { CATEGORIES, SITE } from '@/lib/constants';

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white/40">
      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <p className="font-display lowercase text-xl">
              live laugh local<span className="text-coral"> *</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">{SITE.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Reading
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`} className="hover:text-coral-deep">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/whats-on" className="hover:text-coral-deep">
                  What&apos;s on near you
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              The site
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/submit" className="hover:text-coral-deep">Submit a story</Link></li>
              <li><Link href="/about" className="hover:text-coral-deep">About</Link></li>
              <li><Link href="/contact" className="hover:text-coral-deep">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-coral-deep">Privacy</Link></li>
              <li><Link href="/cookies" className="hover:text-coral-deep">Cookies</Link></li>
              <li><Link href="/remove" className="hover:text-coral-deep">Remove an article</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-faint">
          © {new Date().getFullYear()} Live Laugh Local. Part of Spaces Please Ltd.
        </p>
      </div>
    </footer>
  );
}
