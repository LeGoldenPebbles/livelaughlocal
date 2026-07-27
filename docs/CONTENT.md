# Content: taxonomy, lifecycle, limits, images

## Article lifecycle

```
draft → pending → published
              ↘ rejected
published → draft (unpublish) · removed (removal request / admin)
```

- `origin: 'generated'` - written by the in-house pipeline, team byline.
- `origin: 'submission'` - public submission; carries `submitterEmail`,
  email-confirm state, and optionally the featured/Stripe fields.
- Publishing is ALWAYS a human action in a review queue (`/admin` or the
  Pandora's Box command centre). Nothing auto-publishes.
- Publishing a submission emails the submitter; publishing a featured
  submission also fires the £100 charge (docs/PAYMENTS.md).

## Schema limits (validation is real - respect it)

| Field | Limit |
|---|---|
| `title` | 120 chars |
| `dek` | 160 chars |
| `seo.metaTitle` | 70 chars |
| `seo.metaDesc` | 160 chars |
| `byline.name` | 80 chars |
| `category` | must be one of the 28 taxonomy slugs |

**Landmine:** raw `updateOne`/schemaless inserts bypass Mongoose validation,
but the admin publish action re-saves through the real model - an over-limit
field inserted by a script will make PUBLISHING fail later with a generic 500.
Any script that inserts articles must run `doc.validate()` against the real
schema first. This exact bug (a 161-char metaDesc) broke an approval in prod.

## Taxonomy rules

- 28 categories in `lib/constants.js`, alphabetical - the single source of
  truth. Adding one = adding a line there; the Article enum, menu, sitemap and
  category pages all follow.
- Empty categories are never linked anywhere (menu/footer/chips/sitemap render
  from `getActiveCategories()`); they light up when their first article
  publishes.
- Re-shelve freely: change `category` on the article, old URLs 301.
- `breaking-news` renders the pulsing coral BREAKING badge everywhere the
  article appears. Only file genuinely fresh stories there (last 24-48h,
  verified by source publication dates) - never dress up a stale story.

## Editorial rules

> **See also [NEWS_COMPLIANCE.md](NEWS_COMPLIANCE.md)** - the per-article
> checklist for Google News eligibility, and the enforcement built into
> `scripts/publish-batch.mjs`. This section is the house voice; that document is
> the compliance floor.

- UK English, warm local-paper tone. **No em or en dashes - hyphens only.**
- Clickbait headlines are allowed and encouraged for news, but must be 100%
  honest - the body must deliver exactly what the headline promises.
- Every factual claim comes from a live event listing or a source page that
  was actually opened during research. No invented quotes, numbers or dates.
- Generated articles go through the multi-agent pipeline: parallel research
  sweeps → editor pick → writer → two adversarial fact-check lenses (facts vs
  sources; honest-clickbait + limits + style) → fixes → insert as `pending`.
- Every article ends with the discreet Spaces Please credit line (rendered by
  the article template, `utm_medium=article_footer`). Do not add louder
  disclosures - the owner explicitly removed an in-body "full disclosure"
  paragraph.
- Publish cap: one editorial piece per weekday. Cadence ramps only on Search
  Console evidence.

## Image sourcing (rights are absolute)

Allowed hero sources, in order of preference:

1. **Spaces Please event images** (`imagedelivery.net`, or spacesplease.com
   assets) - we host them, organisers uploaded them.
2. **Openly licensed photos**, e.g. Wikimedia Commons CC BY / CC BY-SA.
   Credit is mandatory in `heroImage.credit`: photographer, event/context,
   licence, source (e.g. "Image: Stephen and Helen Jones, WOMAD 2023 at
   Charlton Park, CC BY-SA 2.0, via Wikimedia Commons"). Prefer wide scene
   shots; avoid close-ups of identifiable private individuals.
3. **House graphics** - when no photo exists (breaking/tech/abstract stories),
   generate a branded editorial graphic instead: SVG rendered to a 1600x900
   PNG with sharp, ink background + paper/coral motif, saved under
   `public/news/` and referenced with a RELATIVE url (`/news/....png`).
   The article template absolutises relative heroes for og/JSON-LD.
   Credit: "Graphic: Live Laugh Local". First example:
   `public/news/cloudflare-outage-2026-07-24.png`.
4. **Owner-supplied art** (brand assets, generated images).

Never: news-wire photos, press shots, anything scraped without a licence.
Remember the deploy-order rule below applies to house graphics too - the PNG
must be deployed before the article's heroImage points at it.

Articles without a hero are fine - the branded site card covers social shares.

**Deploy order rule:** a hero host must exist in `next.config.mjs`
`images.remotePatterns` ON THE DEPLOYED BUILD before any live article
references it. Config first, verify live, then data.

**Never point an article at a multi-MB remote original.** Next decodes the whole
source image into memory to optimise it, so a 4600px Wikimedia file costs ~45MB
of raw pixels per request. Googlebot-Image crawling six of those OOM killed the
service on 26 July 2026. After sourcing any remote photo, run:

```bash
node scripts/rehost-heroes.mjs --dry   # see sizes
node scripts/rehost-heroes.mjs         # resize to 1600px into R2, repoint articles
```

It skips images already on our own host, so it is safe to re-run any time.
Resizing does not affect CC attribution - the credit line stays as it is.

## Statuses that surface money

`featured.active + featured.until` drive the sponsored feed card and the
"Featured live" stats; `stripe.chargeId` marks a placement as paid (exactly
once, ever). Do not hand-edit these fields.
