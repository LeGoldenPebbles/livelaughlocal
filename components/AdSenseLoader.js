import Script from 'next/script';

// Loads Google's adsbygoogle library when a publisher ID is configured.
// Present pre-approval for AdSense site verification; ad units only occupy
// AdSlot's reserved containers post-approval (house creatives fill them until
// then, and remain the fallback for unfilled inventory). Google's certified
// consent message (Privacy & messaging, configured in AdSense) rides in with
// this script for UK/EEA visitors - required before personalised ads serve.
export default function AdSenseLoader() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsbygoogle-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
