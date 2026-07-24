'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Primary nav: Latest | News | What's on. News opens an alphabetical panel of
// every category that currently holds published articles (passed down from the
// server) - hover on desktop, tap on mobile. Closes on navigation, outside
// click or Escape.
export default function NewsMenu({ categories }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hoverOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const itemCls =
    'rounded-full px-3 py-1.5 text-ink-soft transition-colors hover:bg-coral-tint hover:text-ink';

  return (
    <nav
      className="-mx-4 flex items-center gap-1 overflow-visible whitespace-nowrap px-4 pb-3 text-sm sm:mx-0 sm:px-0"
      aria-label="Primary"
    >
      <Link href="/" className={itemCls}>
        Latest
      </Link>

      <div
        ref={wrapRef}
        className="relative"
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          className={`${itemCls} inline-flex items-center gap-1 ${open ? 'bg-coral-tint text-ink' : ''}`}
        >
          News
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-xl rounded-2xl border border-line bg-white p-4 shadow-lg sm:w-[36rem]">
            {categories.length === 0 ? (
              <p className="px-2 py-4 text-sm text-ink-faint">
                The first news stories are on their way.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${c.slug}`}
                      className="block whitespace-normal rounded-lg px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-coral-tint hover:text-ink"
                    >
                      {c.slug === 'breaking-news' ? (
                        <span className="font-semibold text-coral-deep">{c.name}</span>
                      ) : (
                        c.name
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Link href="/whats-on" className={itemCls}>
        What&apos;s on
      </Link>
    </nav>
  );
}
