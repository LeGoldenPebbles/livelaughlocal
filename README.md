# Live Laugh Local *

**A UK local-events magazine that writes itself honestly.** Markets, craft
fairs, food festivals, festivals and days out - covered like a good local
paper's what's-on pages, with every article grounded in live event listings or
verified reporting rather than invented copy. Part of Spaces Please Ltd,
branded independently.

Production: **livelaughlocal.co.uk** · Next.js 15, MongoDB, Stripe, Cloudflare R2

---

## Why this exists

Spaces Please has the UK's live supply of markets, fairs and event listings.
This site turns that data into content Google actually rewards: editorial
previews, roundups, breaking event news and guides written from real listings
and verified sources (never generic AI filler), plus programmatic what's-on
pages per town that update as organisers list events. Every article carries a
discreet UTM-tagged credit back to spacesplease.com, so the loop is measurable.

The anti-goal matters as much as the goal: no mass-produced slop, no fake
bylines, no daily article dumps. Google's scaled-content-abuse policy killed
that playbook in 2024; grounded quality at a steady cadence is the strategy.

## What's inside

| Area | What it does |
|------|--------------|
| **Editorial** | Full-bleed hero lead story, category feeds, article pages with journalist typography, Most read rankings, tags, a pulsing BREAKING badge for the breaking-news category |
| **News taxonomy** | 28 categories (single source of truth in `lib/constants.js`); the News mega-menu, footer, homepage chips and sitemap only ever show categories that hold published articles, so empty shelves never render. Articles can be re-shelved forever: old category URLs 301 to the current home |
| **Programmatic SEO** | `/whats-on/[region]` pages generated from live Spaces Please listings, Event JSON-LD, refreshed every 30 min |
| **Near me** | Cookieless geolocation: browser permission prompt, position matched to the nearest region client-side, never stored |
| **Ads** | Google AdSense **Auto ads** (owner decision) - Google positions display ads itself. The reserved-slot house-ad system is kept in the repo but retired from render. Paid featured articles still appear as labelled sponsored feed cards |
| **Submissions** | No-login public submissions: email-confirm gate, honeypot + timing traps, rate limits, sanitised HTML subset, R2 image uploads |
| **Featured placements** | £100 / 12 months. Stripe Checkout in setup mode - card saved at submission, charged **only** on admin approval, double-charge guarded, Stripe receipt emailed. Tested end to end in test mode (card entry → charge → refund) |
| **Removal** | Self-service: matching email gets a one-click HMAC removal link. No account needed, no admin in the loop |
| **Admin** | `/admin` (env-key gate, HMAC session cookie) plus the **Spaces Please Pandora's Box command centre**, which proxies into this app's admin API server-to-server |
| **Analytics** | Fully cookieless: per-path daily page views, daily unique visitors (irreversible daily-rotating HMAC), referrer sources, per-article 14-day series, featured earnings - all self-hosted, all feeding the dashboards |
| **Generator** | Multi-agent research → editor pick → write → adversarial fact-check pipeline; articles land in the review queue as pending, never auto-publish |

## Architecture

```
app/                    Next.js App Router (ISR public pages + API routes)
├── [category]/[slug]   article pages (JSON-LD, credit line, 301 re-shelving)
├── [category]          category feeds (only populated ones are linked)
├── whats-on/[region]   programmatic pages from live event data
├── submit · remove     public flows (no login)
├── admin               review queues (unlinked, noindexed, key-gated)
├── opengraph-image.js  branded social share card (articles use their hero)
└── api/                submissions, removal, upload, featured, admin, pv
components/             SiteHeader (logo + NewsMenu), ArticleCard, HeroArticle,
                        FeedWithAds, MostRead, NearMe, PvBeacon, ads/ (retired)
lib/                    db, constants (taxonomy = single source of truth),
                        sanitize (the ONLY html allowlist), tokens (HMAC),
                        mailer, articles (guarded reads + getActiveCategories),
                        spEvents, featuredStripe, rateLimit, r2, adminAuth
models/                 Article, HouseAd, RemovalRequest, PageView,
                        DailyUnique, RefStat
docs/                   how the site works (see Documents below)
```

**Data:** one MongoDB database (`livelaughlocal`) on the shared Atlas cluster.
**Events:** read-only from the Spaces Please public API, normalised in
`lib/spEvents.js`. No personal data crosses between the two sites.
**Brand:** owner's brand sheet - paper `#F7F2EA`, ink `#181715`, coral
`#EF5A3C`, pale sage `#DCE4DA`, deep green `#385348`; Fraunces + Inter;
`public/linelogo.png` wordmark, asterisk favicon.

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
Local Stripe testing uses the Spaces Please **test** key and must run on
**port 3005** (the Stripe return URL defaults to it when SITE_URL is unset).

## The rules that keep this site rankable

1. **Article HTML is an allowlisted subset** - everything renders through
   `lib/sanitize.js`. Paid articles get `rel="sponsored nofollow"` links.
2. **Grounded content only.** Generated articles cite real events or verified
   sources, carry the honest team byline, and pass an adversarial fact-check
   before entering the queue. Publish cap: one editorial piece per weekday.
3. **Image rights are absolute**: Spaces Please-hosted event images, openly
   licensed photos (credited, e.g. CC BY-SA via Wikimedia Commons) or owner
   art. Never news-wire or scraped photos. Ship the `next.config.mjs`
   remotePattern for a new image host BEFORE data references it.
4. **Cookieless by default.** Analytics is self-hosted and cookieless. AdSense
   personalised ads must not serve to UK/EEA until the Privacy & messaging
   consent message is live in the AdSense account.
5. **Empty categories never render** - menu, chips, footer and sitemap all pull
   from `getActiveCategories()`. Thin pages are how small sites die.
6. **Kill criteria:** near-zero indexation at 8-12 weeks means stop, fold the
   content into spacesplease.com, keep the pipeline. Decided before sunk cost.

## Deployment (read this - it is not the usual flow)

The GitHub repo is **public** and connected to Render **without a webhook**,
so **pushes do NOT auto-deploy**. After every push, trigger a deploy via the
Render API (`POST /v1/services/{serviceId}/deploys`) or the dashboard's
Manual Deploy button. Full runbook: **[DEPLOY.md](DEPLOY.md)**.

## Documents

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - how the site works end to end
- **[docs/CONTENT.md](docs/CONTENT.md)** - taxonomy, article lifecycle, schema limits, image rules
- **[docs/PAYMENTS.md](docs/PAYMENTS.md)** - the £100 featured flow, start to finish
- **[docs/ANALYTICS.md](docs/ANALYTICS.md)** - the cookieless tracking layer and dashboards
- **[docs/ADMIN.md](docs/ADMIN.md)** - admin surfaces and the Pandora's Box bridge
- **[PLAN.md](PLAN.md)** - the original build spec (phases, KPIs; partially superseded by docs/)
- **[CLAUDE.md](CLAUDE.md)** - working agreements for AI-assisted development
- **[DEPLOY.md](DEPLOY.md)** - deploy + launch runbook

---

© Spaces Please Ltd. Editorial transparency: our own articles are drafted
with AI assistance, grounded in live event listings and verified sources,
fact-checked and reviewed by a person before publishing - see /about.
