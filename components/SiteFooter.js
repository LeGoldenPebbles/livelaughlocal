import Link from 'next/link';
import CookieChoices from '@/components/CookieChoices';
import Image from 'next/image';
import { SITE } from '@/lib/constants';
import { getActiveCategories } from '@/lib/articles';

export default async function SiteFooter() {
  const categories = await getActiveCategories();
  return (
    <footer className="mt-16 border-t border-line bg-white/40">
      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <Image
              src="/linelogo.png"
              alt="Live Laugh Local"
              width={800}
              height={144}
              className="h-6 w-auto"
            />
            <p className="mt-2 max-w-xs text-sm text-ink-soft">{SITE.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Reading
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {categories.map((c) => (
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
              <li><Link href="/terms" className="hover:text-coral-deep">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-coral-deep">Privacy</Link></li>
              <li><Link href="/cookies" className="hover:text-coral-deep">Cookies</Link></li>
              {/* Renders only when Google's certified consent message is
                  actually live, so it is never a dead link. */}
              <CookieChoices />
              <li><Link href="/remove" className="hover:text-coral-deep">Remove an article</Link></li>
            </ul>
          </div>
        </div>
        {/* Google's news transparency policy asks for information about the
            company behind the content and a contact route, and UK trading
            disclosure rules require the company number regardless. */}
        <div className="mt-10 space-y-2 border-t border-line pt-6 text-xs text-ink-faint">
          <p>
            © {new Date().getFullYear()} Live Laugh Local. Published by Spaces Please Ltd,
            registered in England and Wales, company number 16518769.
          </p>
          <p>
            Editorial enquiries and corrections:{' '}
            <a href="mailto:hello@spacesplease.com" className="hover:text-coral-deep">
              hello@spacesplease.com
            </a>
            . Articles are researched and drafted with AI assistance and reviewed by a person
            before publication.{' '}
            <Link href="/about" className="hover:text-coral-deep">
              How we work
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
