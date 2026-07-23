'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Cookieless "what's on near me": the browser's own geolocation permission
// prompt is the consent, the position is used once in-page to pick the nearest
// region, and nothing is stored or sent to the server.
function distanceKm(aLat, aLng, bLat, bLng) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export default function NearMe({ regions }) {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const usable = (regions || []).filter((r) => r.lat != null && r.lng != null);
  if (!usable.length) return null;

  const go = () => {
    if (!('geolocation' in navigator)) {
      setState('error');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let best = null;
        let bestD = Infinity;
        for (const r of usable) {
          const d = distanceKm(pos.coords.latitude, pos.coords.longitude, r.lat, r.lng);
          if (d < bestD) {
            bestD = d;
            best = r;
          }
        }
        if (best) router.push(`/whats-on/${best.slug}`);
        else setState('error');
      },
      () => setState('error'),
      { timeout: 8000, maximumAge: 600000 }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-sage-tint px-4 py-3">
      <p className="text-sm text-ink-soft">
        Built from live event listings across the UK.
      </p>
      <button
        type="button"
        onClick={go}
        disabled={state === 'locating'}
        className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep disabled:opacity-60"
      >
        {state === 'locating' ? 'Finding you...' : "What's on near me"}
      </button>
      {state === 'error' ? (
        <span className="text-xs text-ink-soft">
          Couldn&apos;t get a location -{' '}
          <Link href="/whats-on" className="underline hover:text-coral-deep">
            browse by area instead
          </Link>
        </span>
      ) : (
        <span className="min-w-0 basis-full text-xs text-ink-faint sm:basis-auto">
          Your location is used once, in your browser, and never stored.
        </span>
      )}
    </div>
  );
}
