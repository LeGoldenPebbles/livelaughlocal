---
name: journalist-article
description: Write and publish a Live Laugh Local article - news, a what's-on listing, or an evergreen guide. Covers which of the three you are writing (a what's-on article is not news), what has to be in it, the exact limits the publisher enforces, image sourcing and credit (including generating a house graphic when no free photo exists), and the verify-then-publish loop. Use whenever writing, editing, commissioning or fact-checking an article for livelaughlocal.co.uk.
---

# Writing for Live Laugh Local

A UK local-events magazine: markets, craft fairs, food festivals, days out,
panto, pumpkin patches, and practical guides for the people who run stalls at
them. It reads like the what's-on pages of a good local paper. Never like
content marketing, never like AI slop.

It is owned by Spaces Please Ltd, which sells to the exact audience it serves.
That is disclosed sitewide, and it constrains what you may do inside an article.
See "Spaces Please" below.

**Your training data is stale.** Anything about the current year must come from a
page you actually opened. Never write a date, price or quote from memory.

---

## 1. Decide which of the three you are writing

This is the first decision, not an afterthought. It changes the structure, the
sourcing bar, the headline, the schema.org type on the page, and whether the piece
enters the Google News sitemap.

**One test: was something announced, confirmed, cancelled, priced, fined, closed
or consulted on, with a date attached?**

**`news`** - yes. A station shuts for 22 days. The CMA fines a ticket reseller.
A fireworks consultation opens. It loses value as the date passes. Emits
`NewsArticle` and enters the 48-hour news sitemap.

**`listing`** - no, but it is still time-bound. What is on, when, what it costs,
when applications close. Christmas market dates, pumpkin patch openings, this
Saturday's market, autumn wedding fairs. **A what's-on article is not news.**
Nothing was announced in it; it is a compilation. Emits `Article` and stays out of
the news sitemap.

**`guide`** - no, and the calendar barely matters. What public liability insurance
costs a stallholder and why organisers demand £5m. How to book your first market
stall. Updated in place rather than replaced. Emits `Article`.

Most of what this site publishes is a **listing**. If you are reaching for an
argument that your roundup is really news, it is a listing. Do not manufacture a
peg, and never file a stale story under `breaking-news`, which renders a pulsing
BREAKING badge everywhere it appears.

Set `articleType` in your output. If you leave it out the publisher warns and
treats the piece as a `listing`, which is safe but means nobody decided. Read
[references/article-types.md](references/article-types.md) for what each one
changes and how to date a guide so it does not rot.

---

## 2. What has to be in it

Every article carries all of these. **The order is your judgement** - the list is
what must be present, not a template to fill top to bottom.

- **The single most useful fact in the first sentence.** Not the third paragraph.
  A reader who stops after one sentence should still have got something.
- **Two named, sourced quotes, minimum.** Each one introduced by a paragraph that
  names the person, gives their real job title, and links to the page where they
  said it. This is the one thing a generic model cannot fake, so it is the bar.
- **Real numbers.** Prices with the pound sign, dates written as
  "Saturday 26 September 2026", named venues, named towns.
- **Three to six outbound links** to primary sources you opened: the organiser,
  the venue, the council, the charity, the regulator, the trade body. News
  coverage is a route to the primary source, not a substitute for it.
- **Two to four internal links**, every one a route that actually exists.
  Writers invent plausible routes and the publisher rejects them. Generate the
  valid set with `node scripts/list-routes.mjs` rather than working from memory;
  it changes with every batch.
- **Three to five h2 subheadings**, phrased as things people actually type.
- **An honest account of what you could not verify**, or leave the claim out.
  "We could find no announcement either way, so treat it as absent rather than
  gone" is good journalism and good policy compliance.
- **A practical close**: a short numbered list of what to do now, or a clear
  diary note.
- **A hero image with alt text describing what the photo actually shows.**

News adds: the peg and its date in the opening, and a line on what happens next.

Evergreen adds: current costs with the date you checked them, the exceptions and
edge cases that make it complete, and as few hard date-pegs as the subject allows
so it does not rot.

### Shapes that work

Pick one, or build your own from the ingredients above.

**The dated roundup.** Peg, then the confirmed list with prices and booking
status, then the ones still unconfirmed and why, then what to do now.

**The explainer.** The question in plain words, what it actually costs, who is
exempt, what the money buys you, what happens if you turn up without it.

**The single event.** What is on and when, what you will find there, who it suits,
practicals (entry, parking, dogs, accessibility), how to go or how to get a pitch.

---

## 3. Voice

British English. Warm, concrete, plain. Write for someone deciding whether to go
to, book into, or run an event.

**No em dashes or en dashes anywhere, in any field.** Hyphens, commas or full
stops. The publisher rejects the batch over a single one, and the owner has asked
for this repeatedly.

Short paragraphs. Vary sentence length. Contractions are fine. Do not start
consecutive paragraphs the same way.

Banned: "nestled", "vibrant", "hidden gem", "something for everyone", "look no
further", "whether you're X or Y", "in today's fast-paced world". No exclamation
marks.

Honest brevity beats padded slop, but the publisher will not take anything under
700 words, so if you cannot fill the space honestly you have the wrong commission.

Headlines may be as clickbait as you like **provided they are completely honest**.
A headline promising something the body does not deliver is a named Google
violation, not just bad manners.

---

## 4. Images

Every article needs a hero, and rights are absolute. Work down this ladder and
stop at the first one that genuinely fits.

1. **A Spaces Please event photo**, when the article is about that event.
   Credit: `Image: event organiser, via Spaces Please`.
2. **An openly licensed photo** - Wikimedia Commons CC BY, CC BY-SA or public
   domain. **Credit is mandatory and specific**: photographer, what it shows,
   licence, source. Confirm the file exists and give the direct
   `upload.wikimedia.org` file URL, never the description page.
3. **Make one.** If no honest photograph exists - tech, money, weather, abstract
   news - generate a branded house graphic rather than reaching for something you
   do not have the rights to:

   ```bash
   node scripts/make-news-graphic.mjs --slug <slug> --motif market --label "AUTUMN 2026 - UK"
   ```

   Motifs: `star`, `ticket`, `transport`, `weather`, `heritage`, `music`,
   `market`. Credit: `Graphic: Live Laugh Local`.

**Never** news-wire photos, press shots, anything scraped without a licence, or
close-ups of identifiable private individuals.

Alt text describes what is actually in the frame. A verifier once downloaded the
file and found the alt text described a photo that did not exist, so write it
after looking at the image.

Full sourcing rules, credit formats and the two deploy-order landmines are in
[references/images.md](references/images.md). Read it before using a house
graphic - there is a real gotcha about relative URLs.

---

## 5. Spaces Please

Ownership is disclosed in the footer and on `/about`, and the article template
adds a discreet credit line to every piece. Do not add louder disclosure inside
the body; the owner removed one.

- **Homepage links are promotion: at most one per article**, only where a reader
  would genuinely want it (someone after a stall, or after stallholders). If it
  does not fit naturally, leave it out. Two fails the publish.
- **`/events/<slug>` links are citations and are uncapped.** When you say a market
  is on this Saturday, the event page is your source, exactly as an organiser's
  own site would be. Capping those would mean sourcing your claims worse.

---

## 6. Output

Return one JSON object per article, in exactly this shape. This is what
`scripts/publish-batch.mjs` reads.

```json
{
  "articleType": "news | listing | guide",
  "category": "markets-and-fairs",
  "slug": "keyword-led-lowercase-hyphens",
  "title": "Max 110 characters",
  "dek": "The one-sentence version, 10 to 160 characters.",
  "bodyHtml": "<p>...</p>",
  "metaTitle": "Max 70, front-loaded with the search term",
  "metaDesc": "Max 160, aim 140 to 158.",
  "locations": ["Norwich"],
  "tags": ["craft fair", "norwich"],
  "heroAlt": "What the photo actually shows, 10 to 160 characters.",
  "hero": {
    "directUrl": "https://upload.wikimedia.org/.../file.jpg",
    "pageUrl": "https://commons.wikimedia.org/wiki/File:...",
    "licence": "CC BY-SA 4.0",
    "credit": "Jane Smith, Norwich Market 2025"
  },
  "sourcesUsed": ["https://..."],
  "uncertainties": ["Ticket price for the Sunday session was not published."]
}
```

`bodyHtml` may contain **only** these tags: `p h2 h3 strong em a ul ol li
blockquote br`, and **no attribute except `href`**. No divs, classes, ids, styles,
images in the body, or h1.

Note this is flat: `metaTitle`, `metaDesc` and `heroAlt` are top level, not nested
under `seo` or `heroImage`. The publisher assembles those itself.

---

## 7. The limits that are machine-enforced

`scripts/publish-batch.mjs` refuses the whole batch on any of these. Full table,
including the softer warnings, in [references/contract.md](references/contract.md).

| | |
|---|---|
| Title | max 110 characters |
| Body | 700 to 1100 words, target 800 to 950 |
| Blockquotes | at least 2 |
| Dek / metaDesc | max 160 · metaTitle max 70 |
| heroAlt | 10 to 160 characters, and a hero is required |
| Tags | `p h2 h3 strong em a ul ol li blockquote br` only, `href` only |
| Dashes | no em or en dash in any field |
| Internal links | must resolve against the live route set |
| Outbound links | must not 404 |
| Spaces Please | homepage linked at most once |
| Title similarity | under 50% word overlap with a published piece in the same category |

**There is no short-listing exemption.** The documented carve-out for pieces under
700 words cannot apply, because 700 words is also the floor for publishing at all.
Every publishable article needs its two quotes.

---

## 8. Verify, then publish

The checker is not optional and not ceremony. In recent batches it caught an
invented product a reader could have turned up for, a doctored quote from a named
academic, a £250 deposit double-counted in a piece telling traders what to budget,
and show dates that would have sent someone to a closed venue.

Run a hostile pass over every article before it goes anywhere - the prompt is in
[references/verify.md](references/verify.md) - then:

```bash
node scripts/publish-batch.mjs <articles.json> --dry --check-links   # prove it passes
node scripts/publish-batch.mjs <articles.json> --check-links         # publish
node scripts/publish-batch.mjs <articles.json> --draft               # queue for review
node scripts/audit-corpus.mjs                                        # read-only, whole corpus
```

Never hand-roll an insert. A schemaless write skips Mongoose validation, and the
admin re-saves through the real model, so an over-length field publishes fine and
then breaks approval later with a generic 500.

**Cadence is the one genuine risk.** The standing rule is 2 to 3 articles a week,
sustained. Broad, thin and fast is the exact shape that scaled-content enforcement
targets. If a batch runs against that, say so plainly rather than letting the rule
quietly become decoration.
