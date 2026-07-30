# Live Laugh Local - Build & Launch Plan

Local events magazine for the UK. Editorial content grounded in real Spaces Please
event data, with carefully placed house promotion. Owned by Spaces Please Limited,
branded independently. This document is the build spec - keep it updated as reality
diverges.

---

## 1. Positioning & Brand

- **Name:** Live Laugh Local
- **Positioning:** "What's on near you" - a warm, local, editorial magazine about
  markets, fairs, food events and days out across the UK. It reads like a local
  paper's what's-on section, not a marketplace.
- **Relationship to Spaces Please:** operated by Spaces Please Limited. Disclosure
  is small-print honest: footer line "Part of Spaces Please Ltd" + named as data
  controller in the privacy policy (legally required). No mint, no shared visual DNA.

### Visual identity (deliberately different from Spaces Please)
- **Palette:** warm paper background `#F7F2EA`, ink charcoal `#181715`, accent
  coral `#EF5A3C`, secondary sage `#385348`. No mint (#00e0bb) anywhere.
- **Type:** serif display for headlines (Fraunces or similar via next/font),
  clean sans for body (Inter). Editorial magazine feel.
- **Logo:** lowercase serif wordmark "live laugh local" with a simple spark/asterisk
  glyph. Keep it a text-based component day one; proper mark later.
- **Tone of voice:** local journalist. Warm, concrete, British English, no listicle
  slop, no em dashes (house style: hyphens).

---

## 2. Stack & Infrastructure

- **App:** single Next.js (App Router) application. Public pages are SSG/ISR for
  SEO; submissions, admin and Stripe run through API routes. Tailwind CSS.
  One service, one deploy - no separate Express backend.
- **Database:** NEW database `livelaughlocal` on the existing Atlas cluster
  (a separate database is free; a separate cluster is not). Collections:
  `articles`, `houseads`, `removalrequests` (audit), `pageviews` (server-side counts).
- **Hosting:** one new Render web service. Free tier spins down and cold starts
  poison crawler response times, which this site lives on - Starter tier recommended.
- **Domain:** livelaughlocal.co.uk preferred (UK audience). Until the custom domain
  is attached, the onrender.com URL stays `noindex` - never let Google build history
  on the temporary domain.
- **Email:** transactional only (submission confirm, removal links, receipts,
  approval/rejection notices) through the existing Nodemailer/Mailtrap setup.
  SPF/DKIM for the new domain is a this-week item, not a launch blocker.
- **Payments:** existing Stripe account (same legal entity). New product:
  "Featured placement - 12 months" at £100. Checkout `mode:'setup'` (card saved,
  not charged), off-session PaymentIntent fired only on admin approval. This is the
  proven campaign-pledge pattern; plain auth holds expire in ~7 days and are banned here.
- **Images:** existing Cloudflare R2 account, new bucket `livelaughlocal`.
  MIME allowlist (jpg/png/webp), 5MB cap, server-side validation.
- **Secrets:** `.env.local` only, never committed. No `.env.production.secure`-style
  files in this repo.

---

## 3. Information Architecture

### Categories (launch with exactly three - topical authority over spread)
1. **Markets & Fairs** - craft fairs, makers markets, artisan markets
2. **Food & Drink** - street food, food festivals, farmers markets
3. **Days Out** - family events, seasonal events, things to do

Add a category only when the existing ones are ranking. Never launch with ten.

### Routes
| Route | Purpose |
|-------|---------|
| `/` | Mobile-first feed: latest + featured cards, in-feed ad slots |
| `/[category]` | Category feed (same card grid, filtered) |
| `/[category]/[slug]` | Article page with in-article slots |
| `/whats-on/[region]` | Programmatic pages from live Spaces Please event data (ISR) |
| `/submit` | Public submission form + featured upsell |
| `/remove` | Request article removal (email match + HMAC link) |
| `/about` `/contact` `/privacy` `/cookies` | Boilerplate (required for AdSense later) |
| `/admin` | Review queue - env-key gated, unlinked, rate-limited |
| `sitemap.xml` `robots.txt` `rss.xml` | SEO plumbing, auto-generated |

---

## 4. Data Model

**Article**
```
title, slug, dek (<=160 chars), heroImage { url, alt, credit }
bodyHtml            - sanitized subset ONLY: p, h2, h3, strong, em, a,
                      ul/ol/li, blockquote, figure/img. No fonts, no styles.
category            - enum of the three launch categories
locations[]         - towns/regions mentioned (drives whats-on cross-links)
tags[]
byline              - { name, kind: 'staff' | 'contributor' }
status              - draft | pending | published | rejected | removed
origin              - 'generated' | 'submission'
submitterEmail      - submissions only; used for removal match; never displayed
featured            - { active, until, category }
stripe              - { customerId, paymentMethodId, chargeId }
seo                 - { metaTitle, metaDesc }
sourceEventIds[]    - Spaces Please events the article is grounded in
publishedAt, viewCount
```

- **Removal tokens:** stateless HMAC(slug + email) - same pattern as marketing
  unsubscribe. No token storage needed.
- **HouseAd:** `{ slot, headline, body, imageUrl, targetUrl, weight, active }` -
  config-driven so creatives change without deploys.

---

## 5. Ads System (responsive both devices, first time)

One `<AdSlot>` component, provider-abstracted. A slot renders exactly one of:
`house` (day one), `featured` (paid submissions), `adsense` (phase 2, behind consent).
Flipping provider later requires zero layout work.

### CLS rule (non-negotiable)
Every slot reserves its height with a fixed-dimension container BEFORE any ad
loads. Ads that reflow the page destroy Core Web Vitals, and this site lives on SEO.

### Slot spec
| Slot | Mobile | Desktop | Placement rule |
|------|--------|---------|----------------|
| In-article | 300x250 centred | 728x90 | after block 3, then every 5 blocks, max 3 per article |
| In-feed | native card, same dims as feed card | same | position 4, then every 7 cards |
| Sidebar | does not exist | 300x600, desktop garnish only | article pages only |

- In-feed units are visibly labelled **"Sponsored"** (AdSense policy + UK CAP code).
- Featured (paid) articles carry a visible **"Featured"** label and any external
  links inside them get `rel="sponsored nofollow"` - selling followed links gets
  the site penalised.
- No popups, no interstitials, no ads above the first content on mobile - Google
  has named penalties for all three.

### House creatives (day one, 4 units)
1. "Find your next stall" -> spacesplease.com exhibitor landing
2. "Running an event? List it free" -> organiser landing
3. Contextual: "This event is taking stall applications" -> the specific event page
   (auto-attached under articles that cite an open event)
4. Feed card promoting the /whats-on programmatic pages (internal circulation)

---

## 6. Cookies & Consent

- **Day one: zero third-party cookies.** House ads are first-party. Analytics is a
  server-side pageview counter (no cookie). The admin session cookie is strictly
  necessary (exempt). Result: **no consent banner legally required at launch** -
  just an honest /cookies page and a privacy policy naming Spaces Please Ltd.
- **Build now, use later:** a consent context stub that defaults to "denied" and
  gates any third-party script. When AdSense arrives (phase 2), plug in a
  Google-certified CMP (Google's own Privacy & Messaging), which has been mandatory
  for AdSense in UK/EEA since 2024. Consent must resolve before the first ad request.
- Do NOT port the spacesplease.com cookie banner - known dead code with GDPR gaps.

---

## 7. Submission Flow (no login)

1. `/submit`: byline name, email, title, dek, body (editor constrained to
   bold/italic/links/lists/headings - sanitized server-side again on save),
   hero image upload, category, location.
2. **Anti-spam:** honeypot field + minimum-fill-time trap + per-IP rate limit +
   **email confirmation link** (submission only enters the review queue after the
   email is clicked - kills bots and pre-validates the removal address in one step).
3. **Featured upsell:** optional at submit time. £100 / 12 months in one category.
   Stripe Checkout `mode:'setup'` - the card is authorised for future use, charged
   only when an admin approves. Rejection releases it untouched. Receipts both ways.
4. **Removal:** `/remove` form -> if email matches the article's `submitterEmail`,
   send HMAC link -> click confirms -> status `removed`, page returns 410, drops
   out of sitemap. No admin needed for the happy path.

---

## 8. Admin Panel

`/admin`, gated by `ADMIN_KEY` env var (cookie session after entry, rate-limited,
linked nowhere). Deliberately boring:
- Queues: pending submissions, AI drafts, removal requests, published
- Actions: edit-then-publish, approve (fires the Stripe charge if featured),
  reject with reason (emails the submitter), unpublish, extend/cancel featured
- No user management, no roles, no settings pages. One key, one person.

---

## 9. Generator (seed today, automate this week)

- **Grounding source:** dedicated **read-only MongoDB user** on the production
  `eventwebsite` database, projection limited to public event fields (title, dates,
  venue town, category, description, public image, slug). Never PII, never write
  access. Direct DB read avoids Cloudflare's AI-bot 403 wall entirely.
- **Journalist skill** (`.claude/skills/journalist-article`): the working guide to
  writing a piece. News vs evergreen, required ingredients, the machine-enforced
  limits, image sourcing and credit, and the verify-then-publish loop. Grounding
  has since widened beyond the events API to researched primary sources, and the
  hard floor is now 800-950 words with two named, sourced quotes - the skill is
  the current word, this line is a pointer.
- **Vertical pipeline (one article):**
  researcher (pull events by region/category) -> writer (skill) -> fact-checker
  (verify every date, venue and claim against the source JSON; any mismatch kills
  the draft) -> editor (voice pass, CTA placement, SEO title).
- **Grounding rule:** every generated article cites at least one real Spaces Please
  event and links to its public page. That link IS the careful plaster.
- **Bylines are honest:** "Live Laugh Local team". No fabricated human journalist
  personas - fake authors are a named trigger in Google's spam policy and a
  reputational grenade.
- **Images:** use a Spaces Please event's own image only in articles promoting that
  event (promotional use the organiser benefits from). Otherwise use own graphics.
  Do not strip-mine organiser uploads as generic stock.
- **Today:** seed 10 articles (3-4 per category) through the pipeline into the
  admin queue, human-review, publish. Plus 6-8 programmatic /whats-on pages.
- **This week:** scheduled agent drafts 1/day into the queue. Publish cap:
  1 editorial piece per weekday regardless of queue depth. Cadence ramps only when
  Search Console shows indexation.

---

## 10. SEO Plumbing

- Per-page metadata, OpenGraph, canonical URLs
- JSON-LD: `Article` on articles, `Event` on whats-on pages, `Organization` sitewide
- `sitemap.xml` auto-built from published articles + whats-on pages; `rss.xml`
- Google Search Console verified day one, sitemap submitted
- ISR on all public pages, `next/image` everywhere, target green Core Web Vitals
- `noindex` header until the custom domain is live

---

## 11. Build Order (launch day)

1. Scaffold: Next.js + Tailwind + Mongoose, brand tokens, responsive layout shell
2. Models + seed script
3. Public pages: feed, category, article (slot injection), whats-on, boilerplate
4. AdSlot system + house-ad config + 4 creatives
5. Submission + email confirm + removal flows
6. Stripe featured flow (setup mode + admin-triggered charge, test mode e2e)
7. Admin panel
8. Generator seed run -> review -> publish first 10
9. QA gate: 360px / 768px / 1280px matrix, both ad slot types on both breakpoints,
   Lighthouse (CLS specifically), all forms, Stripe test cards
10. Deploy: Render service, env vars, custom domain, GSC, sitemap

## 12. Phase 2 (explicitly NOT launch day)

- AdSense application (gate: ~25 indexed articles + boilerplate pages + CMP live)
- Certified CMP integration
- Daily cron generation
- SPF/DKIM for @livelaughlocal email
- Newsletter capture

## 13. Kill Criteria & KPIs

- **8-12 week checkpoint:** pages indexed in GSC and impressions trending up.
  Near-zero indexation = stop adding articles, fold the content into
  spacesplease.com, keep the pipeline. Decided now, before sunk cost.
- Track: indexed pages, impressions, clicks, submissions received, featured revenue,
  clickthrough to spacesplease.com (UTM-tagged house ads).

## Open items (owner decisions)

- [ ] Domain purchase (livelaughlocal.co.uk recommended)
- [ ] Render tier (Starter recommended - cold starts vs crawlers)
- [ ] Brand direction sign-off (warm editorial coral/charcoal as specced)
