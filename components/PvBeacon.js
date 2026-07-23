'use client';

import { useEffect } from 'react';

// Cookieless pageview beacon. Fires once per article view; the server counts
// rows per path per day (models/PageView.js). Renders nothing.
export default function PvBeacon({ path }) {
  useEffect(() => {
    if (!path) return;
    try {
      const payload = JSON.stringify({ path });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/pv',
          new Blob([payload], { type: 'application/json' })
        );
      } else {
        fetch('/api/pv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Analytics must never break the page.
    }
  }, [path]);

  return null;
}
