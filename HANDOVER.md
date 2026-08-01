# Handover: Live Laugh Local

**Written 29 July 2026.** For whoever picks this up next, human or Claude. If you
read nothing else, read "State of play" and "The five things that have already
bitten".

Everything here was verified against the live site or the live database at the
time of writing. Where something is unverified or uncertain, it says so.

---

## What this is

**Live Laugh Local** (livelaughlocal.co.uk) is a UK local-events magazine:
markets, craft fairs, food festivals, days out, panto, pumpkin patches, and
practical guides for the people who run stalls at them.

It is owned by **Spaces Please Ltd** (company 16518769), which also runs
[spacesplease.com](https://spacesplease.com), a marketplace connecting event
organisers with stallholders. **The magazine exists as an acquisition channel for
that marketplace.** That relationship is disclosed in the site footer and on
`/about`, and it must stay disclosed. See "Conflict of interest" below.

The owner is not a developer. Write for someone who wants to know what happened
and what it means, not a diff.

---

## State of play (29 July 2026)

| | |
|---|---|
| Published articles | **39** |
| Categories covered | **28 / 28** |
| Articles missing a hero image | 0 |
| Articles missing a share card | 0 |
| Broken internal links across the corpus | 0 |
| Articles failing the compliance audit | **10** (see below, all pre-standard) |
| Search Console | **verified**, domain property, Google actively crawling |
| Indexed count | **unknown** - only the owner can see this |
| Live traffic | ~19 page views total, 1 organic Google referral (27 Jul) |
| Memory | flat ~400MB against a 512MB limit, no OOM since 28 Jul |

**The site is technically finished and commercially unproven.** Everything that
can be built has been. What is missing is external signal: inbound links, a
Facebook page, and time. More articles do not fix that. Say so if asked.

---

## The five things that have already bitten

Each of these cost real time or broke production. They are in `CLAUDE.md` too,
but they are worth repeating.

**1. Config before data.** A new image host must be live in `next.config.mjs`
`remotePatterns` *on the deployed site* before any article references it. Doing
it the other way round broke the live homepage for about ten minutes.

**2. Never insert articles with a schemaless model.** `strict: false` skips
Mongoose validation. An article once went in with a 161-character `metaDesc`
against a 160 limit; it looked fine until the admin tried to publish it and got a
generic 500. **Use `scripts/publish-batch.mjs`, which validates against a mirror
of the real model.**

**3. Node has no idea it is in a 512MB container.** V8 sizes its heap from the
*host* machine, never feels pressure, and the container kills it first. This
OOM-killed the service twice. Fixed with `NODE_OPTIONS=--max-old-space-size=300`
as a Render env var. **If you ever move plan or service, set this again.** The
July image-rehosting work reduced the slope but was never the root cause.

**4. Page-level `alternates` replaces the layout's, it does not merge.** We set a
canonical on every route, so a feed-autodiscovery link declared through the
metadata API would silently vanish from every page. It is rendered as a `<link>`
in `app/layout.js` instead. Do not "tidy" that into metadata.

**5. `heroImage.social` must stay declared in `models/Article.js`.** Mongoose
strips undeclared fields on save, so an admin re-save would silently revert every
share to the wrongly-shaped hero image.

---

## How articles get made

The process, in order. Do not skip the middle step.

### 1. Commission

Pick topics that **deepen** existing categories rather than widening; all 28 have
cover now. Weight towards:

- **Seasonal timing.** Publish when people search, which is earlier than you
  think: Christmas market stall applications close in *summer*, Santa specials
  sell out in *September*.
- **The stallholder audience.** They are the commercial overlap with Spaces
  Please and the most underserved. Pitch prices, insurance, card readers,
  application deadlines.
- **Things with verifiable numbers.** Real dates, real prices, named sources.

Edit the `COMMISSIONS` array in the workflow script. **It is hardcoded on
purpose** - passing commissions through workflow `args` failed silently once
(args arrived as a string, the guard fell through to the previous batch, and the
run produced three near-duplicates of already-published articles).

### 2. Write and verify

The pipeline is: research and draft in one agent, then **one hostile checker**,
then a fixer if anything real was found. The checker is not optional and not
ceremony. In the last five batches it caught:

- an **invented product** (a Tulleys open-dated pass that does not exist; a
  reader could have turned up on the wrong night and been refused entry)
- a **doctored quote** from a named academic
- a **£250 deposit double-counted** in a piece telling traders what to budget
- **wrong show dates** that would have sent someone to a closed venue
- a **quote attributed to a page that did not contain it**
- **alt text describing a photo that did not exist** (the verifier downloaded the
  file and looked at it)

Run the checker even on a "quick" batch. It is the cheapest part of the pipeline
and the part that stops us publishing something wrong about money or dates.

### 3. Publish

**Always through the validating publisher. Never a hand-rolled script.**

```bash
node scripts/publish-batch.mjs <articles.json> --dry --check-links   # verify
node scripts/publish-batch.mjs <articles.json> --check-links         # publish
node scripts/publish-batch.mjs <articles.json> --draft               # queue for review
```

It refuses the batch on: schema violations, broken internal links, near-duplicate
titles, missing hero or alt text, em dashes, over-length headlines, disallowed
markup, and dead outbound links. It rehosts heroes to R2 at 1600px and builds the
1200x630 share card automatically.

### 4. Audit

```bash
node scripts/audit-corpus.mjs      # read-only, checks every published article
```

Run this after any rule change, and **before telling anyone the site is
compliant**. It is how the 10 known failures below were found.

---

## Compliance: the honest position

`docs/NEWS_COMPLIANCE.md` is the standing checklist, verified against Google's
own documentation on 27 July 2026. Re-verify after about six months; this area
rots and Google has already retired one whole product here.

**Three things that are widely believed and are false:**

1. **You cannot submit a site to Google News.** That flow was deleted in April
   2024 and publication pages went fully automatic in March 2025. Inclusion is
   automatic. Publisher Center is now only for Reader Revenue Manager. Do not
   spend a day on this.
2. **AI-assisted writing is not a policy breach.** Google judges output, not
   tooling. The live risk is **scaled content abuse**: many pages produced
   primarily to game rankings with no added value.
3. **Blocking `Google-Extended` does not remove you from AI Overviews.** It only
   governs Gemini training and grounding.

### What is compliant

Canonicals on every route; `NewsMediaOrganization` on the site and every article;
visible date **and time**; byline linking to `/about`; company number and
editorial email in the footer; news sitemap on a 48-hour window; RSS with
per-item images and autodiscovery; `Googlebot-News` explicitly allowed; every
article carrying a hero, alt text and a 1200x630 share card; zero broken internal
links.

### What is not

**10 articles fail the audit**, all published before the standard existed. Every
one is a feature over 700 words carrying fewer than two sourced quotes. They are
not *wrong*, they are below a bar set after they were written. Fixing them means
re-researching and rewriting, not a find-and-replace. Treat it as backlog, and do
not describe the site as fully compliant without saying this.

### Two rules that were wrong and got fixed

Worth knowing, because the instinct is to "fix" them back.

**The two-quote rule only applies to features.** A 400-word listing piece
("market comes to X on Saturday") legitimately has nobody to quote. The threshold
is 700 words.

**Spaces Please event-page links are citations, not promotion.** An early rule
capped all `spacesplease.com` links at one per article, which flagged listings
articles that correctly linked each event's own page as its source. The rule now
distinguishes: **homepage links are promotion, capped at one; `/events/<slug>`
links are citations, uncapped.** Capping citations would mean sourcing our claims
*worse*.

### Conflict of interest

Spaces Please sells to the exact audience this magazine serves. Google prohibits
content that "conceals or misrepresents sponsored content as independent,
editorial content". Ownership is disclosed in the footer and on `/about`. Keep it
there, keep the homepage link to one per article, and keep paid Featured
placements visibly labelled with `rel="sponsored"`.

### Cadence: the real risk

39 articles in seven days is roughly 5.6 a day on a domain with no history. That
broad-thin-fast shape is exactly what scaled-content enforcement targets, and it
is the only metric on this site that pattern-matches automation.

**The standing rule is 2 to 3 a week, sustained.** The owner has repeatedly asked
for more and that is their call to make, but say plainly when a batch runs
against it rather than letting the rule quietly become decoration.

---

## Verify, do not assert

Three checks in one day passed while being broken. Each looked like it worked
because nothing failed.

- The **near-duplicate guard** ran, printed nothing, and passed three known
  duplicates. Its query projected `slug` and `category` but **not `title`**, so
  every comparison scored zero against `undefined`.
- The **link checker** failed a publish on a 405 from a page that loads perfectly
  in a browser. Bot-blocking is not a dead link.
- The **link checker again** called a live URL dead because Node's `fetch` is
  stricter about TLS than curl. It now takes a second opinion from curl before
  any verdict.

**Before trusting a check, prove it can fail.** Feed it known-bad input and
confirm it complains. Then confirm it does not false-fail on known-good input.

The same applies to the site: build from the write path and verify against the
live URL, not the local build. `SITE_URL` is `localhost:3005` locally, so
canonicals render as localhost in a local build and correctly in production.

---

## Deploys

**Pushing to `main` does NOT deploy.** The repo is public and Render has no
webhook on it. Every deploy is a manual API call.

Credentials live in **`.env.local`**, which is gitignored (`.gitignore` line 5,
`.env.*`). **This repo is PUBLIC - never commit or echo these.**

```
RENDER_API_KEY      full-account token: also reaches the Spaces Please services
RENDER_SERVICE_ID   srv-d9h2f1mpbkes73c1uc30
RENDER_OWNER_ID     tea-d2dfm1qdbo4c73beh5rg
```

Quickest health check, no arguments needed:

```bash
node scripts/render-status.mjs      # deploys, OOM kills, memory vs the 512MB limit
```

To deploy:

```bash
TOKEN=$(grep -oE '^RENDER_API_KEY=.*' .env.local | cut -d= -f2)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}' https://api.render.com/v1/services/srv-d9h2f1mpbkes73c1uc30/deploys
```

Poll `GET /v1/services/{id}/deploys?limit=1` until `status` is `live`.

**Read the token into a variable, never print it.** It can deploy to, and rewrite
environment variables on, production Spaces Please as well as this site. If it
ever leaks, rotate it in the Render dashboard and update `.env.local` here plus
`server/.env.production.secure` in the Spaces Please repo.

**Publishing an article does not need a deploy.** Articles are database rows
served through ISR with `revalidate = 300`, so a new article appears within about
five minutes. Only code changes need deploying.

Useful Render endpoints:

- `GET /v1/services/{id}/events` - deploys, and `oomKilled` if the service died
- `GET /v1/metrics/memory?resource={id}&startTime=&endTime=` - no `resolution` or
  `step` params; defaults to the last hour
- `GET /v1/logs?ownerId=tea-d2dfm1qdbo4c73beh5rg&resource={id}` - **retention is
  short**, `logs` comes back `null` for windows more than about an hour old, so
  pull logs *during* an incident

Service: `srv-d9h2f1mpbkes73c1uc30`, Oregon, Starter plan, 512MB.

---

## What only the owner can do

Do not spend effort on these, and do not claim they are done.

1. **Check the indexed count** in Search Console (Pages → Indexed). This is the
   number that matters and nobody else can see it.
2. **Submit both sitemaps** if not already: `sitemap.xml` and `news-sitemap.xml`.
3. **Check the AdSense consent message is published** - 30 seconds, then 15
   minutes only if it is not. As of 1 Aug 2026 the site sits in AdSense status
   **"Getting ready"**, meaning Google is reviewing it and shows no ads at all
   during that period (a few days, sometimes 2-4 weeks). Zero ads is therefore
   expected and is NOT evidence of a problem, and the ad code must be left alone
   until the status reads "Ready". What cannot be seen from outside is whether a
   GDPR message is published, because a reviewing site shows no banner either
   way. Worth confirming now rather than after, since without it the review
   finishing still will not turn on UK revenue. Privacy & messaging → European
   regulations. Everything else - logo, hex codes, copy, policy URLs - is
   pre-filled in [docs/ADSENSE_CONSENT.md](docs/ADSENSE_CONSENT.md).
4. **Create the Facebook page.** The share cards are built and waiting; nothing
   is using them.
5. **Stripe** → Settings → Emails → tick "Successful payments" so £100 Featured
   customers get a receipt.
6. **Subscribe to the ntfy topic** `spacesplease-chat-a7k3m9qp2f` if not already;
   submission alerts land there.

---

## Open decisions, not tasks

- **`NewsArticle` on evergreen guides.** Two pieces ("how to book your first
  market stall", "crowdfund a local event") are genuinely evergreen and should
  arguably be `Article` or `BlogPosting`. Everything else is date-pegged and
  `NewsArticle` is honest. Small change, needs a decision.
- **RSS is a partial feed** (hero, standfirst, opening paragraphs, then a link
  through). Full text is what Flipboard and MSN want but lets readers finish
  without visiting. One flag in `app/rss.xml/route.js` flips it.
- **Cloudflare blocks AI crawlers** (GPTBot, ClaudeBot, CCBot). No effect on
  Google, but ChatGPT and Perplexity cannot cite us. Given the goal is pulling
  people in, worth reconsidering.
- **Memory sits ~50MB higher than it did on 28 July** (400 vs 351). Stable hour
  to hour and a healthy margin, but worth watching for drift rather than assuming
  it has settled.

---

## Where things live

```
app/
  [category]/[slug]/page.js   article page: canonical, JSON-LD, share image, dates
  layout.js                   NewsMediaOrganization, RSS autodiscovery link
  news-sitemap.xml/route.js   Google News sitemap, 48-hour window
  rss.xml/route.js            RSS 2.0, per-item images, partial content
  robots.js                   Googlebot-News group (read the comment first)
  api/submissions/            public story submissions, ntfy alert on receipt
docs/
  NEWS_COMPLIANCE.md          the standing checklist - read before writing
  CONTENT.md                  taxonomy, lifecycle, image rights
  ARCHITECTURE.md ANALYTICS.md PAYMENTS.md ADMIN.md
scripts/
  publish-batch.mjs           the ONLY way to publish. validates, dedupes, images
  audit-corpus.mjs            read-only audit of every published article
  make-social-cards.mjs       1200x630 share cards
  rehost-heroes.mjs           pull remote heroes into R2 at 1600px
lib/
  constants.js                the 28 categories, single source of truth
  ntfy.js                     push alerts (shares the Spaces Please chat topic)
```

Admin lives at **spacesplease.com/pandoras-box/livelaughlocal**, not on this
site. It proxies through the Spaces Please backend with an HMAC cookie.
