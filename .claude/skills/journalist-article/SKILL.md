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

### The batch mix

The owner's standing shape for a batch is **one news, one breaking, one normal
piece** (a listing or a guide). Aim for it.

**With one honest limit: breaking news cannot be commissioned, only found.**
`breaking-news` is for stories that genuinely broke in the last day or two,
verified against the source's own publication date, and it renders a pulsing
BREAKING badge everywhere the article appears. Filing a week-old story there to
fill the slot is the single most visible way to look automated, and it devalues
the badge for the times something really has happened.

So: go looking for a breaking story every batch. If one is genuinely there, take
it. If nothing broke, **say so and file a second news or listing piece instead**,
rather than dressing up something stale. An empty breaking slot is a fact about
the week, not a failure of the batch.

---

## 2. Research, then check the research

Research is a stage with its own output and its own checkpoint. It is not
something you do in your head on the way to writing. **Nothing from a search
result is a fact until you have opened the page and seen it.**

### Build a source ledger before you write a word

One row per claim you intend to make: the claim, the URL you opened, and the
wording on the page. Anything that has no row does not go in the article.

| Claim | Source URL | Verbatim on the page |
|---|---|---|
| Kew tickets from £25.50 | kew.org/.../christmas | "Tickets from £25.50" |
| Section 75 lower limit £100 | financial-ombudsman.org.uk/... | "must cost more than £100" |

### Then check the ledger, before writing

Go back through it adversarially, because a wrong number here becomes 900 words
built on sand:

1. Did you actually open every URL, or did some rows come from a search summary?
2. Does the page still say it today, in the year you are writing about?
3. For every quote: is the speaker named, is the job title right, and does the
   page contain those exact words?
4. What is on the page that contradicts your row? Search summaries paraphrase,
   and paraphrase drops caveats.
5. Which rows are missing? Anything you are about to assert without a row is
   either cut or explicitly flagged as unverified.

That check is cheap and it is the one that pays. On the 1 August 2026 batch,
search reported an adult Christmas at Kew ticket as £61 when Kew's own page says
"Tickets from £25.50", and quoted Edinburgh Botanics prices the venue does not
publish at all. Both would have been published as fact.

### The three rules that produce the ledger

**Search finds the page. The page is the source.** Never write a number from a
search summary.

**Never take a quotation from a summary. Not once, not for a moment.** This is
the specific rule the rest of the guide is built around, because it is the one
that nearly went wrong. On 6 August 2026 a research pass reported that Emma
Cochrane, Executive Director of Consumer Protection at the CMA, had said "Fans
deserve to know exactly what they're paying upfront, without nasty surprises at
the checkout." It is a plausible sentence. She never said it. The summariser had
paraphrased her real words and the paraphrase was then handled as a quotation.
It reached a final draft and was caught only because someone opened the CMA page
to check.

A wrong price is a correction. Inventing words and attributing them to a named,
living person is not a correction, it is a fabricated quote in a publication
with a real company behind it, and no amount of editing afterwards undoes it.
So: open the page, find the words, copy them from the page. If you cannot find
them there, you do not have a quote, and the honest move is to write the piece
without one rather than to approximate.

**A 403 is not a dead end.** Kew, Longleat, Birmingham City Council and the
Financial Ombudsman all refuse the fetch tool and return a clean 200 to curl:

```bash
curl -s -L --max-time 25 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "<url>" -o page.html
```

Then strip the tags and read it. If you skip this you end up writing from search
summaries, which is the previous rule's failure mode.

**Never guess a URL.** Four venue URLs guessed from an obvious pattern all 404'd.
Search for the real one, then open it. The same rule that applies to internal
links applies to your sources.

---

## 2b. What "low value content" means, and how to not write it

On 6 August 2026 Google AdSense refused the site for **Low value content**. The
site had 43 articles at the time, so this was never about how many pages exist.
It is about what is on the page.

The natural reaction is to write more. That is the wrong lever. A thin page is
not fixed by a new page next to it, and ten new pages in a day is itself the
pattern that scaled-content enforcement looks for. What clears the verdict is
removing the thin pages and making the rest obviously worth reading.

**What a thin page looks like here**, using our own worst example. The Saxilby
fun day piece ran about 670 words on roughly 60 words of actual fact, restated
the same detail three times to reach length, and never named the organiser,
which is a parish council that publishes pitch prices and booking numbers on its
own website. Every one of those is a choice a writer made.

The test to apply before writing a word: **what does this page contain that a
reader cannot get from the event listing it is based on?** If the honest answer
is "nothing, but longer", do not write it. Either find the extra material,
usually the organiser, the council, the trade body, the price list, or write a
250-word listing and accept that it is a listing. Padding a thin fact to hit a
word count is the exact failure mode being penalised.

**What makes a page substantial**, in rough order of how much it counts:

- **Primary sources, linked.** Not news coverage of a source, the source. A
  gov.uk page, a statutory instrument, a council report, an organiser's own
  price list. The Martyn's Law piece rests on 22 verified claims from
  legislation.gov.uk and gov.uk. That page is very hard to call thin.
- **Something the reader could not have worked out.** A number nobody has put
  together, a rule everyone gets wrong, a comparison across venues.
- **Real quotations from named people with real job titles.**
- **A correction of a common belief**, where you can show the belief is wrong.
- **Specifics throughout**: named towns, venues, dates written in full, prices
  with the pound sign, deadlines.

And the inverse. Do not pad. Do not restate the dek in the first paragraph. Do
not write a section that only rephrases the one above it. If the piece will not
honestly reach 700 words, the commission was wrong, not the writer.

## 3. What has to be in it

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

## 4. Voice

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

## 5. Images

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

## 6. Spaces Please

Ownership is disclosed in the footer and on `/about`, and the article template
adds a discreet credit line to every piece. Do not add louder disclosure inside
the body; the owner removed one.

- **Homepage links are promotion: at most one per article**, only where a reader
  would genuinely want it (someone after a stall, or after stallholders). If it
  does not fit naturally, leave it out. Two fails the publish.
- **`/events/<slug>` links are citations and are uncapped.** When you say a market
  is on this Saturday, the event page is your source, exactly as an organiser's
  own site would be. Capping those would mean sourcing your claims worse.

### Writing about an organiser who uses Spaces Please

This comes up, and the line is sharp.

**Fine:** a piece about their events. Seven craft fairs are coming to Lowestoft
and Beccles this autumn, here are the dates, venues and which are taking
stallholder applications. Every fact is checkable on the event pages, it helps
readers, it helps the organiser, and it would be worth publishing whatever
platform they used.

**Not fine:** a piece about how well the platform is working for them.
"Applications are flying in" is an unverifiable commercial claim about our
owner's product, in our own magazine, presented as editorial. That is the exact
thing Google's policy on sponsored content presented as independent editorial
describes, and it is this site's most plausible exposure.

The test: **would this article still be worth publishing if the organiser used a
different platform?** If yes, write it. If the story only exists because they use
ours, it is marketing, and it belongs on spacesplease.com.

And the absolute rule underneath it: **an organiser's quotes must be words they
actually said.** Not a plausible paraphrase of what they would probably say. If
you do not have their real words, either get them or write the piece without
quoting them.

---

## 7. Output

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

## 8. The limits that are machine-enforced

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
| **Every quotation** | **must appear verbatim at a source the article itself links to** |

That last row is new, it runs under `--check-links`, and it is the only check
here that exists because of a near miss rather than a style preference. See
below.

**There is no short-listing exemption.** The documented carve-out for pieces under
700 words cannot apply, because 700 words is also the floor for publishing at all.
Every publishable article needs its two quotes.

---

## 9. Verify, then publish

The full pipeline, and none of the middle is optional:

```
research -> check the ledger -> write -> hostile check -> fix -> dry run -> publish
```

There are two checkpoints on purpose. The ledger check catches a wrong fact
before it is load-bearing. The hostile check catches what the writing invented,
which is a different class of error entirely and is invisible to a
source-by-source pass.

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
node scripts/audit-quotes.mjs                                        # every published quote
node scripts/audit-stale.mjs --soon 40                               # what has gone out of date
```

**Always pass `--check-links`.** It is not just a link check any more: it is
what runs the quote gate. Publishing without it skips the most important
validation in the pipeline.

### The quote gate, and its four verdicts

`lib/quoteCheck.js` normalises each blockquote and every page the article links
to, then looks for the longest run of consecutive quoted words appearing
verbatim in one of those pages. A real quotation lands a long run. A paraphrase
does not.

| | |
|---|---|
| **PASS** | the words are on a page the article cites |
| **WEAK** | partial match. Usually a stitched or over-trimmed quote. Blocks the publish |
| **FAIL** | every cited page was read and the words are in none of them. Treat as fabricated |
| **UNCHECKED** | the source could not be read. Reported, never fatal, and never a pass |

`UNCHECKED` is deliberate. Some sites refuse every robot: womad.co.uk 403s even
a browser user agent. Blocking on that would mean deleting correct quotes to
satisfy a script, which is worse than the problem. When you see it, open the
page yourself.

Two things about the gate are worth knowing because both were bugs first. It
falls back to `curl --fail` where Node's fetch gets a 403, which is how IQ
Magazine quotes verify at all. And `--fail` is load-bearing: without it curl
returns the 403 error page with exit 0, the checker reads that as "source
loaded, quote absent", and a correct quotation gets reported as invented.

Prove it still works before you trust it:

```bash
node scripts/audit-quotes.mjs --selftest
```

That feeds it a real quote, a fabricated one, a real quote behind a 403, and a
real quote whose host does not exist, and requires it to tell all four apart.

Never hand-roll an insert. A schemaless write skips Mongoose validation, and the
admin re-saves through the real model, so an over-length field publishes fine and
then breaks approval later with a generic 500.

**Cadence is the one genuine risk.** The standing rule is 2 to 3 articles a week,
sustained. Broad, thin and fast is the exact shape that scaled-content enforcement
targets. If a batch runs against that, say so plainly rather than letting the rule
quietly become decoration.
