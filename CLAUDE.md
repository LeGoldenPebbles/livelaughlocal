# Live Laugh Local - Development Guide

UK local-events magazine (markets, fairs, food events, days out). AI-generated
editorial grounded in REAL Spaces Please event data + public submissions with a
paid "Featured" tier. **PLAN.md in this repo is the full build spec - read it
before changing anything structural.**

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
components/     shared components (ads/ subfolder = AdSlot system)
lib/            db, constants (CATEGORIES - single source of truth), sanitize,
                tokens (HMAC), mailer, articles (guarded data access), spEvents,
                adConfig (placement rules), houseAds
models/         Article, HouseAd, RemovalRequest, PageView (Mongoose)
scripts/        seed + generator
```

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
3. **Cookie posture.** Analytics is the cookieless PageView beacon. The
   adsbygoogle script loads when NEXT_PUBLIC_ADSENSE_CLIENT is set (pub id
   ca-pub-1573259509891705; ads.txt in public/) - initially for AdSense site
   verification. Personalised ads must NOT serve to UK/EEA visitors until the
   Google Privacy & messaging consent message is configured in the AdSense
   account (certified CMP - Google enforces this). House ads are the default
   slot fill and remain the fallback for unfilled inventory; never delete
   them. Auto ads stay OFF - manual units in AdSlot's reserved containers
   only (CLS discipline). Do not add any other third-party script casually.
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

---

## Commands

```bash
npm run dev     # localhost:3005
npm run build   # production build (must stay green)
npm run seed    # seed articles/house ads
```

## Environment

See `.env.example` for the full annotated list. Secrets live in `.env.local`
(gitignored) and in Render service env vars. NEVER commit secrets - no
".env.production.secure" pattern in this repo, ever.

## Deployment

- GitHub repo -> Render web service (Starter tier - free tier cold starts
  poison SEO crawling), autodeploy on push to `main`.
- Domain: livelaughlocal.co.uk. After it's attached: set `NOINDEX=false`,
  verify in Google Search Console, submit /sitemap.xml.
- Kill criteria (PLAN.md section 13): near-zero indexation at 8-12 weeks means
  stop, fold content into spacesplease.com, keep the pipeline.
