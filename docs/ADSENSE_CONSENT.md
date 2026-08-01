# AdSense: where we actually are, and the one owner-only step

## The short version

The site is in AdSense status **"Getting ready"**, which means Google is
reviewing it. Google's own wording: *"We're running some checks on your site.
The review process usually takes a few days, but in some cases can take 2-4
weeks."* **Ads do not display during that status.** ([Check the status of your
AdSense sites](https://support.google.com/adsense/answer/12170222))

So the correct action right now is mostly to wait, and specifically **not** to
change any ad code. See the warning at the bottom.

The one thing worth doing in the meantime is confirming the consent message
exists and is published, because the moment the status flips to "Ready" it
becomes the thing standing between us and UK revenue.

---

## A correction, so nobody re-runs this diagnosis

On 1 Aug 2026 the live site was measured with a real browser at en-GB, on the
homepage and on a 1,082-word article:

| Check | Result |
|---|---|
| `adsbygoogle.js` loads | yes |
| `public/ads.txt` | HTTP 200, correct publisher line |
| Auto ads inject an ad slot | yes, 1 |
| That slot gets processed | no |
| Rendered ad iframes | 0 |
| `window.googlefc` exists | yes |
| `googlefc.getConsentStatus()` | `UNKNOWN` |
| `__tcfapi('getTCData')` | fails |
| TC string recorded | none |
| Consent dialog in the page | 0 |
| Cookies set on a first visit, no interaction | `FCCDCF`, 390 days |

The measurements are accurate. **The conclusion drawn from them was not.** It
was written up as proof that the consent message had never been published. It
is not proof of that, because a site under review shows no ads regardless of
consent configuration. The review status alone explains every zero in that
table's top half.

What the bottom half means is genuinely undetermined from outside. No consent
dialog and a failing `__tcfapi` are consistent with **either**:

- **A.** no GDPR message published in the account, or
- **B.** a message that exists but is not being delivered yet, because the site
  is not serving ads yet.

There is no way to tell A from B from the outside. There **is** a way to tell in
about thirty seconds from the inside, below.

---

## The thirty-second check (owner only)

1. **adsense.google.com** → **Privacy & messaging** → **European regulations**.
2. Look for a message covering `livelaughlocal.co.uk`.
3. Look at whether it says **Published** or **Draft/Saved**.

- **A message exists and says Published** → nothing to do. It is case B above,
  and the banner will appear when the site starts serving.
- **No message, or it is not published** → create and publish it. The steps and
  our exact branding values are below. It takes about 15 minutes and it is worth
  doing during the review rather than after, because otherwise the review
  finishing does not actually turn on UK revenue.

While in there, the **Sites** page also shows the ads.txt status. Ours should
read **Authorized**; `public/ads.txt` is live and correct, so anything else is
worth a look.

---

## What was already sorted, and what was never on our side to sort

The engineering was all done in July and none of it needs revisiting:

| | |
|---|---|
| `AdSenseLoader`, gated on the publisher ID | done (`a2a28d5`) |
| `public/ads.txt` | done, verified HTTP 200 |
| `google-adsense-account` meta server-rendered for the verifier | done (`a44ee6d`) |
| Auto ads chosen over manual slots | done (`86812c9`, owner decision 23 Jul) |
| Footer "Cookie choices" control to reopen the banner | done (`956f9e2`) |
| Brand colours, logo, copy, policy URLs for the banner | ready, below |
| **Publishing the consent message** | **dashboard action, never had a record of being done** |

That last row is the only open item, and it has sat on the owner-only list since
the handover was written. There is no commit or note claiming it was completed,
which is not the same as saying it was not - hence the check above.

### Why we cannot just build our own banner

Worth recording because it comes up every time. A banner we design ourselves
would look better and take an afternoon, and it would not work: Google requires
a **certified** CMP integrated with the IAB Transparency and Consent Framework
for EEA and UK traffic. Ours would not be certified, so ads still would not
serve. It would be decoration over the same problem.

Google's own Privacy & messaging **is** certified, already loads with the ad
script, and takes our logo, colours and words. Branding does not require
building our own.

---

## Publishing it, with our values filled in

1. **Privacy & messaging** → **European regulations** (the GDPR message - the
   certified one; a plain cookie notice is not a substitute for UK traffic).
2. Select **livelaughlocal.co.uk**.
3. **Consent options.** Include a *Do not consent* button. Google has required
   it alongside *Consent* since January 2024, and UK law requires refusing to be
   as easy as accepting.
4. **Styling:**

   | Field | Value |
   |---|---|
   | Logo | upload `public/linelogo.png` |
   | Background | `#F7F2EA` (paper) |
   | Body text | `#181715` (ink) |
   | Accent / primary button | `#EF5A3C` (coral) |
   | Button hover / pressed | `#D14328` (coral deep) |
   | Link colour | `#D14328` |
   | Font | Inter if offered, otherwise the default sans - not a serif, Fraunces is for headlines only |

   Do **not** use mint `#00e0bb`. That is Spaces Please's colour and this
   masthead is deliberately kept separate from it.

5. **Copy.** Google's default is compliant but anonymous. Replace with:

   > **Live Laugh Local uses cookies**
   >
   > We and our advertising partners use cookies to show ads and measure how
   > they perform. Our own visitor counts do not use cookies at all. You can say
   > no, and you can change your mind at any time from Cookie choices in the
   > footer.

   Leave Google's vendor and purpose disclosures underneath untouched - they are
   what makes the message certified.

6. Link **Privacy policy** to `https://livelaughlocal.co.uk/privacy`.
7. **Publish**, not Save. An unpublished message behaves exactly like no message.

---

## How to know it worked

Once the site status reads **Ready**, load the site in a private window on a UK
connection:

1. **The banner appears.**
2. **Cookie choices** appears in the footer under Cookies. That control is
   already built and deliberately renders nothing while no CMP is present, so
   its appearance is a real signal rather than decoration.
3. Ads begin filling. Slowest to confirm; Auto ads placement takes time to
   settle on a new site and low traffic means low fill. Do not judge it on day
   one.

---

## Do not touch the ad code during the review

`NEXT_PUBLIC_ADSENSE_PAUSED=true` exists and will drop the ad script (and the
`FCCDCF` cookie) while keeping the verification meta tag and `ads.txt`.

**Leave it off while the status is "Getting ready".** Google is actively
checking the site, and part of what it checks is the ad code being present.
Removing it mid-review is a good way to fail or restart the review, and the
upside is negligible: `FCCDCF` is Funding Choices' own consent-state cookie, it
is the only cookie being set, and no advertising or measurement cookies are
being set at all because nothing is serving. That is a small thing to trade a
review for.

The switch is there for a decision that only makes sense later - if the site
goes **Ready** and we still have no published consent message, then the script
is loading with no prospect of UK revenue and pausing becomes reasonable.
