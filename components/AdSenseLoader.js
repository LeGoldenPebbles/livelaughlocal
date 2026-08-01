import Script from 'next/script';

/**
 * Loads Google's adsbygoogle library.
 *
 * MEASURED STATE, 1 Aug 2026 (real browser, en-GB locale, live site):
 *   adsbygoogle.js loads, Auto ads injects one <ins> slot, and that slot is
 *   never processed. Zero ads render on the homepage or on a 1,082-word
 *   article. window.googlefc exists but every status reads UNKNOWN,
 *   __tcfapi('getTCData') FAILS, and there is no TC string. That is the exact
 *   signature of a publisher with no consent message published: Google's CMP
 *   shell loads, never initialises, and Google declines to serve to UK/EEA.
 *
 *   Meanwhile the script sets FCCDCF for 390 days on a first visit with no
 *   interaction. So the current arrangement earns nothing and cookies everyone.
 *
 * THE FIX IS NOT CODE. It is publishing the consent message in the AdSense
 * account (Privacy & messaging), which is owner-only - see
 * docs/ADSENSE_CONSENT.md. Doing that switches on the ads AND the banner at the
 * same time, because in the UK the second is the precondition for the first.
 *
 * NEXT_PUBLIC_ADSENSE_PAUSED is the stopgap until then: it drops the script,
 * and with it the cookie, while LEAVING the google-adsense-account meta tag in
 * app/layout.js intact so site verification is unaffected.
 *
 * It defaults to OFF (script loads, today's behaviour) on purpose. Whether
 * pausing is free depends on whether the account is already approved or still
 * under review, and that is only visible inside the AdSense dashboard. If a
 * review is in progress, pulling the ad code mid-review is a real cost; if the
 * account is live, pausing costs nothing because nothing is being earned.
 * Guessing from outside is not worth the risk, so this stays opt-in.
 */
export default function AdSenseLoader() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  if (process.env.NEXT_PUBLIC_ADSENSE_PAUSED === 'true') return null;
  return (
    <Script
      id="adsbygoogle-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
