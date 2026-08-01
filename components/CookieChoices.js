'use client';

import { useEffect, useState } from 'react';

/**
 * "Cookie choices" control that reopens Google's consent message.
 *
 * WHY THIS AND NOT OUR OWN BANNER: AdSense in the UK and EEA requires a
 * Google-CERTIFIED CMP integrated with the IAB Transparency and Consent
 * Framework. A banner we build ourselves, however good it looks, is not
 * certified, so it would not make ad serving compliant. It would be decoration
 * over the same problem. Google's own Privacy and messaging (Funding Choices)
 * IS certified, already loads with the adsbygoogle script, and can carry our
 * logo, colours and copy, so branding does not require building our own.
 *
 * What was genuinely missing is this: withdrawing consent has to be as easy as
 * giving it, and there was no way to reopen the message once dismissed.
 *
 * Renders NOTHING unless Google's CMP is actually present and exposes the
 * revocation call, so it can never sit in the footer as a dead link while the
 * consent message is unpublished.
 */
export default function CookieChoices() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const fc = typeof window !== 'undefined' ? window.googlefc : null;
      if (fc && typeof fc.showRevocationMessage === 'function') {
        setReady(true);
        clearInterval(id);
      } else if (tries > 20) {
        // ~10s. No CMP on this page, so show nothing at all.
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (!ready) return null;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          try {
            window.googlefc.showRevocationMessage();
          } catch {
            // Never let a consent control throw in the footer.
          }
        }}
        className="hover:text-coral-deep underline-offset-2 hover:underline"
      >
        Cookie choices
      </button>
    </li>
  );
}
