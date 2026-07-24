# How Live Laugh Local works

One Next.js 15 App Router app (JavaScript, Tailwind), one MongoDB database,
no separate backend. Everything public renders on the server with ISR;
everything stateful lives behind `app/api/*` route handlers.

## Rendering model

- Public pages export `revalidate = 300` (whats-on regions: 1800). Pages are
  cached and regenerated in the background after the window passes, so a DB
  change (publish, re-shelve, hero swap) appears within ~5 minutes.
- **Gotcha:** `next start` serves the *previous* build's cached page on the
  first hit after a rebuild (`.next/cache` persists across builds). Request a
  page twice before concluding something didn't ship.
- All public DB reads (`lib/articles.js`) are guarded - they return `[]`/`null`
  on failure so builds and cold environments render empty states, never crash.

## The taxonomy system

`lib/constants.js` `CATEGORIES` is the single source of truth: 28 categories,
alphabetical. Everything derives from it:

- The `Article` schema's `category` enum (`models/Article.js` imports
  `CATEGORY_SLUGS`) - an article can only hold a real category.
- `lib/articles.js` `getActiveCategories()` returns the subset that currently
  holds **published** articles. The News mega-menu (`components/NewsMenu.js`),
  footer, homepage chips and `app/sitemap.js` all render from it - an empty
  category has a page (it 200s with an empty state) but is never linked or
  put in the sitemap, so Google never crawls thin shelves.
- **Re-shelving is safe forever**: slugs are globally unique, and
  `app/[category]/[slug]/page.js` issues a permanent redirect when the URL's
  category doesn't match the article's current one. Change `category` in the
  DB and every old link keeps working.
- `breaking-news` is a normal category with special rendering: a pulsing coral
  BREAKING badge on cards, the hero and the article page.

## Routes

| Route | What it is |
|---|---|
| `/` | hero (latest article) + chips + feed + Most read |
| `/[category]` | category feed (any of the 28 slugs) |
| `/[category]/[slug]` | article page: JSON-LD, hero image, tags, discreet Spaces Please credit line, 301 re-shelving |
| `/whats-on`, `/whats-on/[region]` | programmatic pages from live Spaces Please event data (`lib/spEvents.js`) |
| `/submit`, `/submit/thanks` | public submission flow (no login) |
| `/remove` | self-service removal request flow |
| `/admin` | key-gated review desk (see docs/ADMIN.md) |
| `/opengraph-image` | branded social card; articles override it with their hero |
| `/sitemap.xml`, `/rss.xml`, `/robots.txt` | generated; sitemap lists only populated categories |

## API routes

| Route | Purpose |
|---|---|
| `POST /api/pv` | cookieless analytics beacon (see docs/ANALYTICS.md) |
| `POST /api/submissions` + `/confirm` | public submission + email confirm token |
| `POST /api/remove/request` + `/confirm` | removal request + HMAC link |
| `POST /api/upload` | R2 image upload for submissions (503 until R2 env set) |
| `GET /api/featured/confirm` | Stripe Checkout return - stores the saved card |
| `/api/admin/*` | login, articles list/actions, stats, stats/articles, removals - all gated by the `lll_admin` HMAC cookie |

## Integrations

- **Spaces Please events**: read-only JSON from the prod Render backend
  (bypasses Cloudflare's AI-bot blocking). Everything goes through
  `lib/spEvents.js` normalisation - never consume the raw API shape.
- **Stripe**: same Spaces Please account. Live key on the Render service,
  test key locally. See docs/PAYMENTS.md.
- **Email**: nodemailer via `EMAIL_*` env. Unset = every send no-ops with a
  console warning and the calling flow continues (production currently runs
  without email configured).
- **Cloudflare R2**: submission image uploads, bucket `livelaughlocal`.
- **Spaces Please admin bridge**: the Pandora's Box command centre calls this
  app's admin API server-to-server. See docs/ADMIN.md.

## Images

`next/image` only loads from hosts allowlisted in `next.config.mjs`
(`imagedelivery.net`, `*.r2.dev`, `spacesplease.com`, `upload.wikimedia.org`,
plus the R2 public host). **Ship the config change and verify it deployed
BEFORE pointing any live article at a new host** - the reverse order broke
the live site once (see CLAUDE.md).

## Security posture

- Admin auth: deterministic HMAC session cookie derived from
  `TOKEN_SECRET + ADMIN_KEY` (`lib/adminAuth.js`). Rotating either secret
  invalidates every session. No ADMIN_KEY set = admin is off entirely.
- Email links (confirm/removal) are stateless purpose-scoped HMAC tokens
  (`lib/tokens.js`) - nothing stored, nothing guessable.
- All submitted HTML passes through the `lib/sanitize.js` allowlist; paid
  content links get `rel="sponsored nofollow"`.
- Rate limiting on submissions (in-memory, per IP).
