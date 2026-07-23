# Live Laugh Local *

**A UK local-events magazine that writes itself honestly.** Markets, craft
fairs, food festivals and days out - covered like a good local paper's
what's-on pages, with every article grounded in live event listings rather
than invented copy. Part of Spaces Please Ltd, branded independently.

Production: **livelaughlocal.co.uk** · Built with Next.js 15, MongoDB, Stripe, Cloudflare R2

---

## Why this exists

Spaces Please has the UK's live supply of markets, fairs and event listings.
This site turns that data into content Google actually rewards: editorial
previews, roundups and guides written from real listings (never generic AI
filler), plus programmatic what's-on pages per town that update as organisers
list events. Every article and house ad funnels readers back to
spacesplease.com, UTM-tagged so the loop is measurable.

The anti-goal matters as much as the goal: no mass-produced slop, no fake
bylines, no daily article dumps. Google's scaled-content-abuse policy killed
that playbook in 2024; grounded quality at a steady cadence is the strategy.

## What's inside

| Area | What it does |
|------|--------------|
| **Editorial** | Full-bleed hero lead story, category feeds, article pages with journalist-style typography, Most read rankings, tags |
| **Programmatic SEO** | `/whats-on/[region]` pages generated from live Spaces Please listings, Event JSON-LD, auto-refreshing every 30 min |
| **Near me** | Cookieless geolocation: browser permission prompt, position matched to the nearest region client-side, never stored |
| **Ads** | Provider-abstracted `AdSlot` with fixed reserved heights (CLS = 0). House creatives today; paid featured articles as labelled sponsored cards; AdSense slot-ready for phase 2 |
| **Submissions** | No-login public submissions: email-confirm gate, honeypot + timing traps, rate limits, sanitised HTML subset, R2 image uploads |
| **Featured placements** | £100 / 12 months. Stripe Checkout in setup mode - card saved at submission, charged **only** on admin approval, double-charge guarded |
| **Removal** | Self-service: matching email gets a one-click HMAC removal link. No account needed, no admin in the loop |
| **Admin** | `/admin` - env-key gate, HMAC session cookie, review queues, publish/reject with submitter emails, charge surfacing |
| **Analytics** | Cookieless server-side page counts (`PageView` per path/day + per-article viewCount) - powers Most read and admin stats |
| **Generator** | `.claude/skills/journalist-article` house style + a write → adversarial fact-check pipeline grounded in the live events API |

## Architecture

```
app/                    Next.js App Router (SSG/ISR public pages + API routes)
├── [category]/[slug]   article pages (Article JSON-LD, ad slots, related)
├── whats-on/[region]   programmatic pages from live event data
├── submit · remove     public flows (no login)
├── admin               review queues (unlinked, noindexed, key-gated)
└── api/                submissions, removal, upload, featured, admin, pv
components/             ArticleCard, HeroArticle, FeedWithAds, MostRead,
                        NearMe, ads/ (AdSlot, HouseAdUnit, SponsoredFeedCard)
lib/                    db, constants (categories = single source of truth),
                        sanitize (the ONLY html allowlist), tokens (HMAC),
                        mailer, articles, spEvents, adConfig, houseAds,
                        featuredStripe, rateLimit, r2, adminAuth
models/                 Article, HouseAd, RemovalRequest, PageView
scripts/                seed.mjs + seed-data (fact-checked launch articles)
```

**Data:** one MongoDB database (`livelaughlocal`) on the shared Atlas cluster.
**Events:** read-only from the Spaces Please public API
(`GET /api/events` on the Render backend - normalised in `lib/spEvents.js`).
No personal data crosses between the two sites.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in - see the annotated example
npm run dev                  # http://localhost:3005
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | dev server (port 3005) |
| `npm run build` | production build - must stay green |
| `npm start` | serve the production build (PORT env aware) |
| `npm run seed` | insert `scripts/seed-data/articles.json` as drafts (`--publish` to go live) |

Minimum env to run: `MONGODB_URI`, `ADMIN_KEY`, `TOKEN_SECRET`. Stripe, R2
and email each degrade gracefully when unset (feature disabled, site fine).

## The rules that keep this site rankable

1. **Article HTML is an allowlisted subset** - everything renders through
   `lib/sanitize.js`. Paid articles get `rel="sponsored nofollow"` links.
2. **Ad slots reserve their dimensions before load.** Core Web Vitals are a
   ranking input; layout shift is never acceptable.
3. **Zero third-party cookies until there's a paid reason** - then a certified
   CMP goes in first (consent stub already defaults to denied).
4. **`NOINDEX=true` until the real domain is attached.** Google never sees a
   temporary URL.
5. **Publish cap: one editorial piece per weekday.** Cadence ramps only on
   Search Console evidence. Generated articles must cite >= 1 real event and
   carry the honest team byline.
6. **Kill criteria:** near-zero indexation at 8-12 weeks means stop, fold the
   content into spacesplease.com, keep the pipeline. Decided before sunk cost.

## Deployment

Render web service (Starter - free-tier cold starts poison crawl budgets),
created from `render.yaml` as a Blueprint. Push to `main` = deploy.
Full runbook including the domain/GSC launch sequence: **[DEPLOY.md](DEPLOY.md)**.

## Documents

- **[PLAN.md](PLAN.md)** - the full build spec (brand, ads, cookies, submission
  flow, generator, phases, KPIs)
- **[CLAUDE.md](CLAUDE.md)** - working agreements + Spaces Please integration
  contract for AI-assisted development
- **[DEPLOY.md](DEPLOY.md)** - deploy + launch runbook

---

© Spaces Please Ltd. Editorial transparency: our own articles are drafted
with AI assistance, grounded in live event listings, fact-checked against
those listings and reviewed by a person before publishing - see /about.
