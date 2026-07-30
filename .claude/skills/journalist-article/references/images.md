# Hero images: sourcing, credit, and making one

Every article needs a hero with alt text. Rights are absolute: we are a publisher
owned by a real company, and an unlicensed photo is a bill, not a warning.

Work down this ladder and stop at the first source that genuinely fits the story.
"Genuinely" is doing work there. A photo that is merely adjacent to the subject is
worse than a house graphic.

---

## 1. A Spaces Please event photo

Only when the article is actually about that event. Organisers uploaded these and
benefit from the promotion, which is what makes the use fair.

- Host: `imagedelivery.net`, or `spacesplease.com` assets
- Credit: `Image: event organiser, via Spaces Please`

Do not strip-mine organiser uploads as generic stock for unrelated articles.

## 2. An openly licensed photo

Wikimedia Commons CC BY, CC BY-SA, or public domain. Nothing else.

- **Confirm the file exists** before citing it. Open it. A verifier once
  downloaded a hero and found the alt text described a photograph that did not
  exist at all.
- Give the **direct** `upload.wikimedia.org` file URL in `hero.directUrl`, not the
  `commons.wikimedia.org/wiki/File:...` description page. The description page is
  HTML and the rehost step will fail on it.
- Put the description page in `hero.pageUrl` so the licence is traceable.
- Credit is mandatory and specific: photographer, what it shows, licence, source.

  `Stephen and Helen Jones, WOMAD 2023 at Charlton Park, CC BY-SA 2.0, via Wikimedia Commons`

- Prefer wide scene shots. Avoid close-ups of identifiable private individuals.

## 3. Make one

When no honest photograph exists - tech, money, weather, policy, abstract news -
generate a branded editorial graphic rather than reaching for something you do not
have the rights to. This is a normal outcome, not a failure.

```bash
node scripts/make-news-graphic.mjs \
  --slug christmas-market-stall-applications-2026 \
  --motif market \
  --label "AUTUMN 2026 - UK" \
  --tone ink
```

Writes `public/news/<slug>.png` at 1600x900.

- Motifs: `star` (generic brand asterisk), `ticket` (money, pricing, tickets),
  `transport` (travel, strikes, roadworks), `weather` (forecasts, warnings),
  `heritage` (historic buildings), `music` (gigs, nightlife), `market` (stalls,
  fairs).
- Tone: `ink` (dark, default) or `coral`.
- Credit: `Graphic: Live Laugh Local`.

**The landmine.** `publish-batch.mjs` fetches `hero.directUrl` over the network to
rehost it into R2. A relative path like `/news/my-slug.png` is not a URL, the
fetch throws, and the batch aborts. So a house graphic must be **committed and
deployed first**, then referenced by its live absolute URL:

```
https://livelaughlocal.co.uk/news/my-slug.png
```

That is the same config-before-data rule that broke the live homepage for ten
minutes once. Asset first, verify it loads, then point an article at it.

## Never

News-wire photos. Press shots. Anything scraped without a licence. Google Images
results. Stock sites whose terms you have not read. Close-ups of identifiable
private individuals, particularly children.

---

## Alt text

Ten to 160 characters, describing what is actually in the frame, written after
looking at the image. Not the headline again, not keyword stuffing.

- Good: `Stallholders setting up wooden trestle tables under striped awnings in a market square at dawn.`
- Bad: `Christmas market stall applications 2026`

For a house graphic, describe the graphic honestly:
`Illustration of a market stall with a striped awning on a dark background.`

---

## What the publisher does for you

You supply a source URL; the publisher handles the rest. Do not pre-resize or
pre-upload.

1. Fetches the source and resizes to **1600px** wide, JPEG quality 82, into R2.
   Never leave a live article pointing at a source image: full-size Wikimedia
   originals decode to roughly 45MB of raw pixels each, and Googlebot-Image
   crawling six of them OOM-killed the service on 26 July 2026.
2. Builds a **1200x630 share card** alongside it. Facebook renders a large image
   card only above 600x315 and wants 1.91:1, so portrait and square heroes get
   demoted to a thumbnail or dropped. Cover-cropped if the source is at least
   1000x525, otherwise letterboxed onto brand paper.
3. Writes `heroImage.credit` as your `credit` and `licence` joined with a comma.

Resizing does not affect attribution. The credit line stays exactly as you wrote
it.

If a hero host is new to the site, it must be in `next.config.mjs`
`remotePatterns` **on the deployed build** before any live article references it.
