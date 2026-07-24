'use client';

import { useEffect } from 'react';

// Counts clicks on external links inside an article (cookieless, via
// navigator.sendBeacon to /api/click). Renders nothing. The listener is scoped
// to the article element and captures normal, new-tab and middle clicks
// without ever delaying or blocking the navigation.
export default function OutboundClicks({ path }) {
  useEffect(() => {
    const article = document.querySelector('[data-article-body]');
    if (!article) return;

    const onClick = (e) => {
      // Middle-click (open in new tab) is button 1; ignore right-click.
      if (e.button !== undefined && e.button > 1) return;
      const anchor = e.target.closest && e.target.closest('a[href]');
      if (!anchor || !article.contains(anchor)) return;

      let host = '';
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        host = url.hostname;
      } catch {
        return;
      }
      if (host === window.location.hostname) return; // internal link

      try {
        const payload = JSON.stringify({ href: anchor.href, path });
        navigator.sendBeacon(
          '/api/click',
          new Blob([payload], { type: 'application/json' })
        );
      } catch {
        // Never let tracking interfere with the click.
      }
    };

    article.addEventListener('click', onClick);
    article.addEventListener('auxclick', onClick);
    return () => {
      article.removeEventListener('click', onClick);
      article.removeEventListener('auxclick', onClick);
    };
  }, [path]);

  return null;
}
