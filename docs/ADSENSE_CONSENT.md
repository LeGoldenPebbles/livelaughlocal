# The AdSense consent message (owner-only, 15 minutes)

This is the single action that switches on both the cookie banner and the ad
revenue, because in the UK the first is the precondition for the second.

Nobody but the account holder can do it. There is no API, no env var and no
code change that substitutes for it. Everything on our side is already in
place and verified.

---

## What is actually happening right now

Measured on the live site on 1 August 2026 with a real browser set to en-GB,
on both the homepage and a 1,082-word article:

| Check | Result | Means |
|---|---|---|
| `adsbygoogle.js` loads | yes | our code is correct |
| `public/ads.txt` | HTTP 200, correct publisher line | correctly claimed |
| Auto ads inject an ad slot | yes, 1 | Auto ads is switched on in the account |
| That slot gets processed | **no** | Google declined to fill it |
| Rendered ad iframes | **0** | **£0 being earned** |
| `window.googlefc` exists | yes | Google's consent shell loaded |
| `googlefc.getConsentStatus()` | `UNKNOWN` | it has no message to show |
| `__tcfapi('getTCData')` | **fails** | the certified CMP never initialises |
| TC string recorded | **none** | no consent, and no refusal, from anyone |
| Consent dialog in the page | **0** | no banner is being shown to anyone |
| Cookies set on a first visit, no interaction | `FCCDCF`, **390 days** | we cookie every visitor |

Read together those lines say one thing: **the consent message was never
published.** Google's CMP shell ships with the ad script, finds no message
configured, never initialises, and Google then refuses to serve ads to UK and
EEA visitors. That refusal has been Google policy since January 2024 and it is
not negotiable or workaroundable.

So the site currently gets the worst of both: no revenue, and a 390-day cookie
dropped on every visitor before they have touched anything.

### Why we cannot just build our own banner instead

A banner we design ourselves would look better and take an afternoon, and it
would not work. Google requires a **certified** CMP integrated with the IAB
Transparency and Consent Framework for EEA and UK traffic. Ours would not be
certified, so ads still would not serve. It would be decoration over the same
problem.

Google's own Privacy & messaging **is** certified, is already loading on the
site, and can carry our logo, our colours and our words. Branding does not
require building our own - it requires filling in the styling step below.

---

## Do we have the details needed?

Everything except one thing.

| Needed | Have it? |
|---|---|
| Publisher ID `ca-pub-1573259509891705` | yes, public, already in the page source and `ads.txt` |
| `ads.txt` correctly served | yes, verified HTTP 200 |
| Logo file for the banner | yes, `public/linelogo.png` (also live at `https://livelaughlocal.co.uk/linelogo.png`) |
| Brand colours and copy | yes, filled in below |
| Privacy and cookie policy URLs | yes, `/privacy` and `/cookies`, both live |
| A "reopen the banner" control in the footer | yes, already built - it appears by itself the moment the message goes live |
| **Being logged into the AdSense account** | **owner only** |

That last row is the whole blocker. It is a dashboard action.

---

## The steps

1. Sign in to **adsense.google.com** with the account that owns
   `ca-pub-1573259509891705`.
2. Left-hand menu: **Privacy & messaging**.
3. Choose **European regulations** (the GDPR message). This is the certified
   one. The others - CCPA, cookie notice - are not a substitute for UK traffic.
4. Select the site **livelaughlocal.co.uk**.
5. **Consent options.** Include a *Do not consent* button. Google has required
   it alongside *Consent* since January 2024, and UK law requires refusing to
   be as easy as accepting. Do not settle for consent-plus-manage-options only.
6. **Styling** - the part that makes it ours rather than a grey Google box:

   | Field | Value |
   |---|---|
   | Logo | upload `public/linelogo.png` |
   | Background | `#F7F2EA` (paper) |
   | Body text | `#181715` (ink) |
   | Accent / primary button | `#EF5A3C` (coral) |
   | Button hover / pressed | `#D14328` (coral deep) |
   | Link colour | `#D14328` |
   | Font | Inter if offered, otherwise the default sans - do not pick a serif, Fraunces is for headlines only |

   Do **not** use mint `#00e0bb`. That is Spaces Please's colour and this
   masthead is deliberately kept separate from it.

7. **Copy.** Google supplies default wording that is compliant but anonymous.
   Replace the headline and body with:

   > **Live Laugh Local uses cookies**
   >
   > We and our advertising partners use cookies to show ads and measure how
   > they perform. Our own visitor counts do not use cookies at all. You can
   > say no, and you can change your mind at any time from Cookie choices in
   > the footer.

   Keep Google's own vendor and purpose disclosures underneath it untouched -
   they are what makes the message certified.

8. Link **Privacy policy** to `https://livelaughlocal.co.uk/privacy`.
9. **Publish.** Not "Save". An unpublished message behaves exactly like no
   message, which is the state the table at the top describes.

---

## How to know it worked

Give it up to an hour, then load the site in a private window from a UK
connection. In order of certainty:

1. **The banner appears.** If it does not, the message is saved but not
   published.
2. **Cookie choices** appears in the footer, under Cookies. That control is
   already coded and deliberately renders nothing while the CMP is absent, so
   its appearance is a genuine signal rather than decoration.
3. Ads begin filling. Slowest to confirm - Auto ads placement takes a while to
   settle on a new site and low traffic means low fill. Do not judge this on
   the first day.

To re-run the full diagnostic that produced the table above, the browser probe
lives in the session scratchpad; the short version is that every row in the
CONSENT SIDE block should stop saying `UNKNOWN`.

---

## Until it is published

`NEXT_PUBLIC_ADSENSE_PAUSED=true` on the Render service drops the ad script and
the FCCDCF cookie with it, while keeping the `google-adsense-account`
verification meta tag and `ads.txt` in place. Nothing is lost in revenue terms
because nothing is being earned.

It is **not** set by default, deliberately. Whether pausing is free depends on
whether the account is already approved or still under review, and that is only
visible from inside the dashboard. If a review is in progress, pulling the ad
code mid-review could fail it. If the account is live, pausing costs nothing.
That is a one-glance check for the owner and a guess for anyone else, so the
switch exists and stays off until someone who can see the account decides.
