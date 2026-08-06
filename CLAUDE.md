# Live Laugh Local - Development Guide

> ## START HERE
>
> **Read [HANDOVER.md](HANDOVER.md) first.** It carries the current state of the
> site, the five things that have already broken production, the article
> pipeline, the honest compliance position (10 known failures), and the list of
> things only the owner can do. It is written to bring a fresh session up to
> speed without archaeology.
>
> Then, before writing or publishing any article, read
> [docs/NEWS_COMPLIANCE.md](docs/NEWS_COMPLIANCE.md).

UK local-events magazine (markets, fairs, food events, days out). AI-assisted
editorial grounded in primary sources and real Spaces Please event data, plus
public submissions with a paid "Featured" tier. **PLAN.md in this repo is the
full build spec - read it before changing anything structural.**

**Owner is not a developer.** Explain what happened and what it means, not a
diff. Say plainly when something is not done, not verified, or not worth doing.

---

## The loop, every time

1. **Commission** - edit `COMMISSIONS` in the workflow script (hardcoded on
   purpose; passing it through `args` failed silently once and produced
   duplicates). Deepen categories rather than widening; all 28 have cover.
2. **Write, then verify** - one hostile checker per article, always. It has
   caught an invented product, a doctored quote, a double-counted deposit and
   wrong event dates. Not optional, even on a quick batch.
3. **Publish** - `node scripts/publish-batch.mjs <file.json> --check-links`.
   Never a hand-rolled insert; schemaless writes skip validation and produce rows
   the admin cannot re-save.
4. **Audit** - `node scripts/audit-corpus.mjs` after any rule change, and before
   telling anyone the site is compliant.
5. **Verify against the live URL**, not the local build. `SITE_URL` is localhost
   in dev, so canonicals look wrong locally and are right in production.

**Before trusting any check, prove it can fail.** Three checks passed while
broken in a single day because nothing complained. Feed each one known-bad input
first, then confirm it does not false-fail on known-good input.

**Cadence: 2 to 3 articles a week, sustained.** Bursts are the one metric here
that pattern-matches scaled content abuse. The owner may ask for more, which is
their call, but say so rather than letting the rule become decoration.

---

## Relationship to Spaces Please (important)

This site is owned by **Spaces Please Limited** but branded independently
(warm editorial: paper/ink/coral/sage, Fraunces + Inter - NO mint #00e0bb).
Public disclosure is deliberate small print: "Part of Spaces Please Ltd" in the
footer and privacy policy. House ads funnel readers to spacesplease.com with
UTM tags (utm_source=livelaughlocal).

The main Spaces Please codebase lives at **d:\EventWebsiteTest** (a checkout
PARKED on `feature/marketing-consent` - local dev only there; its prod/staging
work happens in worktrees `d:\tmp\sp-main` / `d:\tmp\sp-staging`). That repo has
its own CLAUDE.md with strict branch discipline - respect it if you go there.
Its Claude project memory (C:\Users\Pebbles\.claude\projects\d--EventWebsiteTest\memory\)
does NOT auto-load in this folder, so key facts are duplicated here.

### Integration points with Spaces Please
- **Events data:** public API `GET https://eventwebsite-rups.onrender.com/api/events?limit=N`
  returns `{ events: [...] }`. This is the prod Render backend URL directly -
  it bypasses Cloudflare (which hard-403s AI bots on spacesplease.com). Key
  fields: `title, slug, eventType, publicDescription (markdown), eventStartDate,
  eventEndDate, isMultiDay, isUpcoming, isOpenForApplications, images[{url,isMain}]
  (imagedelivery.net), venue.name, venue.location, venue.locationData.components.postal_town`.
  Normalisation lives in `lib/spEvents.js` - go through it, never raw.
- **Public event URLs:** `https://spacesplease.com/events/[slug]`
- **Same Atlas cluster, DIFFERENT database:** `livelaughlocal` (a separate
  database is free; never create a separate cluster). Never touch the
  `eventwebsite` database from this repo.
- **Same Stripe account** (same legal entity). Featured = £100/12mo, Checkout
  `mode:'setup'` (card saved, NOT charged), off-session PaymentIntent fired only
  on admin approval. Plain auth holds expire in ~7 days - never use them.
- **Same Cloudflare R2 account, separate bucket** `livelaughlocal`.

---

## Architecture

Single Next.js 15 app (App Router, JavaScript, Tailwind 3). No separate backend.

```
app/            routes (public pages, /submit, /remove, /admin, api/*)
components/     shared components (NewsMenu = the News mega-menu; ads/ retired)
lib/            db, constants (28-category taxonomy - single source of truth),
                sanitize, tokens (HMAC), mailer, articles (guarded data access
                + getActiveCategories), spEvents, featuredStripe, adminAuth
models/         Article, HouseAd, RemovalRequest, PageView, DailyUnique,
                RefStat (Mongoose)
scripts/        seed + generator
docs/           ARCHITECTURE / CONTENT / PAYMENTS / ANALYTICS / ADMIN - read
                the relevant one before touching that area
```

### Taxonomy (24 Jul 2026)
Nav = Latest | News (alphabetical mega-menu) | What's on. 28 categories in
lib/constants.js; menu/footer/chips/sitemap only ever render categories that
hold published articles (getActiveCategories). breaking-news gets the pulsing
coral BREAKING badge. Articles re-shelve safely: old category URLs 301 to the
current one (slug is globally unique). Full rules: docs/CONTENT.md.

### Non-negotiable conventions
1. **Article HTML is a sanitized subset ONLY** (p, h2, h3, strong, em, a, ul,
   ol, li, blockquote, figure, img, figcaption, br) via `lib/sanitize.js`.
   Everything renders through it. Paid articles get `rel="sponsored nofollow"`
   on links (selling followed links = Google penalty).
2. **Display advertising = AdSense Auto ads (owner decision, 23 Jul 2026).**
   House creatives are retired from render and Google positions display ads
   itself (including desktop side rails in the viewport margins). The
   reserved-slot system (components/ads/, lib/adConfig.js, lib/houseAds.js)
   is kept in the repo for a possible return to manual units - do not delete
   it. Paid featured articles STILL render as labelled sponsored cards in the
   feed via FeedWithAds (that is the £100 product, not display inventory).
3. **Cookie posture.** Analytics is fully self-hosted and cookieless:
   PageView per path/day + DailyUnique (daily-rotating HMAC of ip|ua|day,
   keyed TOKEN_SECRET) + RefStat referrer hostnames - see docs/ANALYTICS.md.
   The adsbygoogle script loads when NEXT_PUBLIC_ADSENSE_CLIENT is set (pub
   id ca-pub-1573259509891705; ads.txt in public/). **Auto ads are ON (owner
   decision, 23 Jul 2026)** - Google positions display ads itself.
   Personalised ads must NOT serve to UK/EEA visitors until the Google
   Privacy & messaging consent message is configured in the AdSense account
   (certified CMP - Google enforces this). Do not add any other third-party
   script casually.
   **The site is in AdSense status "Getting ready" (under review) as of 1 Aug
   2026, so zero ads render and that is expected** - Google shows no ads during
   review, which takes a few days to 2-4 weeks. The ads.txt status reading
   "Not found" is ALSO expected during review and is not a fault: it is a cached
   verdict from the last crawl, and AdSense refreshes it in proportion to ad
   request volume, which is zero while under review ("up to a month" per
   Google). The file is verified correct and reachable by every Google crawler
   UA. Do not "fix" it. Do NOT read zero fill as a bug,
   and do NOT touch the ad code while it lasts: `NEXT_PUBLIC_ADSENSE_PAUSED=true`
   exists to drop the script and its `FCCDCF` cookie, but removing ad code
   mid-review can fail the review. It stays OFF until the status reads "Ready".
   Whether the consent message is published cannot be determined from outside
   (a reviewing site shows no banner either way) - it is a 30-second dashboard
   check. Full picture, plus our branding values pre-filled for when it is
   needed: docs/ADSENSE_CONSENT.md. Do not build a custom banner instead - an
   uncertified CMP does not make ad serving lawful in the UK, so it would be
   decoration over the same problem.
4. **`NOINDEX=true` until livelaughlocal.co.uk is attached** - never let Google
   index a temporary domain.
5. **Removal/confirm links are stateless HMAC tokens** (`lib/tokens.js`),
   purpose-scoped, keyed by TOKEN_SECRET.
6. **All public DB reads are guarded** (return [] / null on failure) so builds
   never crash without a database.
7. **Generated articles must be grounded**: facts only from the events API,
   every article links >= 1 real event page, honest "Live Laugh Local team"
   byline. No fabricated journalist personas, no invented quotes. Publish cap
   1 editorial/weekday - never mass-publish (Google scaled-content abuse).

### House style
British English. No em dashes - use hyphens. Warm, concrete, local-paper tone.

### Article compliance - READ BEFORE WRITING OR PUBLISHING ANY ARTICLE
**Writing one? Use the `journalist-article` skill**
(`.claude/skills/journalist-article/`). It is the working guide: which of the two
kinds you are writing (time-pegged news vs evergreen guide), what has to be in
the piece, the exact limits the publisher enforces, image sourcing and credit
(including generating a house graphic when no free photo exists), and the
verify-then-publish loop.

**`docs/NEWS_COMPLIANCE.md`** is the standing checklist behind it, verified
against Google's own documentation on 27 Jul 2026. It covers headline and field
limits, sourcing, images, the transparency rules Google News names explicitly,
the Spaces Please conflict-of-interest rule, and cadence.

Publish ONLY via the validating publisher, which enforces the mechanical half
and refuses to write if anything fails:

```bash
node scripts/show-article.mjs <slug>              # read one as stored
node scripts/patch-article.mjs <patches.json> <out.json>   # surgical edit, then publish out.json
node scripts/publish-batch.mjs <articles.json> --dry --check-links
node scripts/publish-batch.mjs <articles.json> --check-links
```

**`--check-links` is not optional.** It is what runs the quote gate
(`lib/quoteCheck.js`), which refuses to publish any blockquote whose words do
not appear verbatim at a source the article itself links to. This exists because
on 6 August 2026 a quote attributed to a named CMA executive reached a final
draft having been invented by a research summariser that paraphrased her and
then presented the paraphrase as a quotation. Fabricating words and attributing
them to a real person is the one error here that cannot be walked back.
`node scripts/audit-quotes.mjs` checks everything already published;
`--selftest` proves the check still discriminates before you trust it.

**AdSense refused the site for "Low value content" on 6 Aug 2026**, with 43
articles live, so it was never about page count. Adding pages does not fix a
thin page. See section 2b of the journalist-article skill for what thin looks
like in our own corpus and what to do instead.

Three things that are widely believed and are NOT true, so nobody wastes a day
on them again: you **cannot** submit this site to Google News (that flow was
deleted in April 2024, inclusion is automatic); AI-assisted writing is **not** a
policy breach (scaled content abuse is, and that is about volume-to-value); and
blocking `Google-Extended` does **not** remove us from AI Overviews.

---

## Commands

```bash
npm run dev     # localhost:3005
npm run build   # production build (must stay green)
npm run seed    # seed articles/house ads
```

## Environment

**The same secret lives in two places and can drift.** R2 credentials are used
by `publish-batch.mjs` from `.env.local` AND by the running app from the Render
environment, so rotating one side leaves the other on the old key. It fails
silently, because nothing touches R2 until somebody uploads an image.
`node scripts/check-r2.mjs --render` proves both pairs against the real bucket
and names which one is broken. As of 6 Aug 2026 the two pairs DIFFER and BOTH
still work, meaning an earlier rotation was never completed: the old key was
never revoked. Move Render onto the new pair first, verify, then revoke the old
one in Cloudflare - revoking first takes the live site's uploads down.

See `.env.example` for the full annotated list. Secrets live in `.env.local`
(gitignored) and in Render service env vars. NEVER commit secrets - no
".env.production.secure" pattern in this repo, ever.

## Deployment

- **Pushes do NOT auto-deploy.** The repo is public and connected to Render
  without a webhook. After every push: `POST /v1/services/{id}/deploys` via
  the Render API (token per the Spaces Please project's conventions) or the
  dashboard's Manual Deploy button. Verify the deploy is `live` before
  claiming anything shipped.
- Domain livelaughlocal.co.uk is LIVE, `NOINDEX=false` - the SEO clock is
  running. Still pending: owner's Google Search Console verification.
- Kill criteria (PLAN.md section 13): near-zero indexation at 8-12 weeks means
  stop, fold content into spacesplease.com, keep the pipeline.

## Operational landmines (each of these has already bitten once)

1. **Config before data.** A new image host must be in next.config.mjs
   remotePatterns ON THE LIVE DEPLOY before any article references it -
   the reverse order broke the live homepage for ~10 minutes.
2. **Script inserts must validate.** Schemaless updateOne bypasses Mongoose
   validation but admin publish re-saves through the real model - an
   over-limit field (e.g. metaDesc > 160) makes publishing 500 later. Run
   doc.validate() against the real schema before inserting.
3. **Stale local servers.** Stopping a backgrounded `npx next start` does not
   kill the node process on Windows - taskkill the PID holding the port, or
   you will verify against an old build. Also: after a rebuild, `next start`
   serves the previous build's ISR-cached page on the FIRST hit
   (.next/cache persists) - always request twice.
4. **Local Stripe testing runs on port 3005** - with SITE_URL unset the
   Checkout return URL defaults to localhost:3005. Test key only, never live.
5. **The Pandora's Box bridge shares this app's secrets**: rotating
   TOKEN_SECRET/ADMIN_KEY requires updating LLL_TOKEN_SECRET/LLL_ADMIN_KEY on
   both Spaces Please backends or the command centre goes dark
   (docs/ADMIN.md).
6. **Node does not know it is in a 512MB container.** V8 sizes its heap from the
   HOST machine, never feels memory pressure, and the container OOM-kills it
   first. This killed the service twice (26 and 28 July 2026), the second time
   after a clean 16-hour staircase from 114MB to 511MB. Mitigated with the
   Render env var `NODE_OPTIONS=--max-old-space-size=300`. **Set this again on
   any new service or plan change.**
   **That flag is NOT sufficient, and three more kills proved it** (4 Aug 03:56,
   4 Aug 23:57, 6 Aug 18:29), all with the cap correctly set. It bounds V8's old
   space ONLY. On 6 Aug RSS peaked at 460MB against a 300MB cap, so ~160MB was
   outside the JS heap: **sharp's native buffers inside the Next image
   optimiser**, which no `--max-old-space-size` value can see. Lowering the cap
   does not help; not doing the work does.
   **The 6 Aug cause was `meta-externalagent`, Meta's AI training crawler** - 73
   of 78 requests in half an hour, from 57 addresses inside
   `2a03:2880:f812::/48`, i.e. 94% of all traffic. Two reasons nothing caught
   it: the Cloudflare rate limit keys on `ip.src` and a fleet spread across a
   /48 never trips it, and the UA opens with an ordinary Chrome string and only
   names itself at the very end, so start-of-string matching sees a browser.
   Now blocked in **`middleware.js`** (403 before any render or image
   optimisation, `/_next/image` deliberately inside the matcher) and in
   robots.txt. Middleware exists because robots.txt is voluntary AND cached by
   the crawler for hours, so it does nothing on the night it is needed.
   **Never add `facebookexternalhit`, `AdsBot-Google` or any `Googlebot` to that
   block list** - share cards and the AdSense review depend on them. The list is
   fail-tested per agent on both the page and the image path.
   Diagnose with `node scripts/check-memory.mjs --who`: six-hour memory chart
   against the ceiling, recent OOM kills, staircase detection, and live traffic
   attributed by agent AND by network block. Pull it DURING an incident, since
   Render keeps logs about an hour (landmine 11).
   **The staircase verdict judges only the RECENT HALF of the window since the
   last restart, deliberately.** Memory always climbs for the first hour after a
   deploy on its way to a normal working set, and reading that ramp as a leak is
   how this script twice called a healthy service a staircase. Run
   `--selftest` before trusting it; it feeds six known series through, including
   the real 28 July kill and the flat 6 Aug data it got wrong.
7. **Page-level `alternates` REPLACES the layout's, it does not merge.** We set a
   canonical on every route, so a feed-autodiscovery link declared through the
   metadata API disappears from every page. It is rendered as a `<link>` in
   app/layout.js on purpose. Do not tidy it into metadata.
8. **`heroImage.social` must stay declared in models/Article.js.** Mongoose
   strips undeclared fields on save, so an admin re-save silently reverts every
   social share to the wrongly-shaped hero image. Shares need a 1200x630 card;
   Facebook demotes anything under 600x315 to a thumbnail or drops it.
9. **Pushing to main does NOT deploy.** Public repo, no Render webhook. Every
   deploy is a manual `POST /v1/services/srv-d9h2f1mpbkes73c1uc30/deploys`.
   Publishing an article needs no deploy (ISR, revalidate 300).
10. **Cloudflare now caches page HTML at the edge for 5 minutes** (cache rule on
   the zone, added 1 Aug 2026, `/api/`, `/admin`, `/submit`, `/remove` and
   `/contact` excluded). This is what stops a crawler burst reaching Render and
   OOM-killing it. Two consequences: a code deploy can serve stale HTML for up
   to 5 minutes ON TOP of ISR, and a published article can take that much longer
   to appear. After any deploy you care about, purge:
   `POST /client/v4/zones/5d150cb80afffb75f327c75e907bf808/purge_cache` with
   `{"purge_everything":true}`. Also on the zone: rate limiting blocks an IP
   doing more than 20 page requests in 10 seconds, so any script that walks the
   site must sleep at least ~700ms between requests.
11. **Render log retention is short.** `GET /v1/logs` returns `logs: null` for
   windows more than about an hour old, so pull logs DURING an incident, not
   after. Memory metrics take `startTime`/`endTime` only, no `resolution`.
