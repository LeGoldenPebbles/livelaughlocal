# News compliance: the standing rules for every Live Laugh Local article

Verified against Google's own documentation on **27 July 2026**. This is not
folklore from SEO blogs - every rule below traces to a Google page or a spec,
and the quoted lines are quoted exactly.

Re-verify before trusting anything here after roughly six months. Google moved
the crawler docs in November 2025 and retired the Google News submission flow in
April 2024, so this area rots.

---

## The three things that are NOT true

Clearing these out first, because each one wastes a day if believed.

1. **You cannot submit the site to Google News.** Google removed publication
   setup from Publisher Center on 25 April 2024 and went fully auto-generated in
   late March 2025. There is no application, queue, reviewer or approval.
   > "Google automatically considers all web content for inclusion in Google
   > News, so you don't need to apply."

2. **AI-assisted writing is not a policy breach.** Google judges output, not
   tooling.
   > "Appropriate use of AI or automation is not against our guidelines."

   The line you must not cross is **scaled content abuse**: "many pages
   generated for the primary purpose of manipulating Search rankings and not
   helping users". Our exposure is volume-to-value, never the AI itself.

3. **Blocking `Google-Extended` does not remove us from AI Overviews.** It
   governs Gemini training and Gemini/Vertex grounding only.
   > "Google-Extended does not impact a site's inclusion in Google Search nor is
   > it used as a ranking signal."

---

## Per-article checklist

Run this before anything is published. The starred items are enforced
automatically by `scripts/publish-batch.mjs`, which refuses to write if they
fail. The rest need a human or an agent to check.

### Structure and limits

- [x] * **Category** is one of the 28 in `lib/constants.js`, and the article
      genuinely belongs in it.
- [x] * **Title** at most 110 characters. Google truncates news headlines past
      that. Aim 60 to 100. Honest clickbait is encouraged; a headline that
      promises something the body does not deliver is a **Misleading content**
      violation: "We don't allow preview content that misleads users to engage
      with it by promising details that aren't reflected in the underlying
      content."
- [x] * **Dek** 10 to 160 characters.
- [x] * **metaTitle** at most 70, ideally 50 to 60, front-loaded with the search
      term. **metaDesc** at most 160, ideally 140 to 158.
- [x] * **Body** 800 to 950 words.
- [x] * **At least 2 blockquotes**, each carrying a real quote from a NAMED
      person with a real job title, introduced by a paragraph that names them
      and links to where they said it.
- [ ] **3 to 5 `h2` subheadings**, phrased as things people actually search.
- [x] * **Allowed HTML only**: `p h2 h3 strong em a ul ol li blockquote br`. No
      attributes other than `href`.
- [x] * **No em dashes or en dashes**, anywhere, in any field.
- [ ] UK English, pounds as £, dates as "Saturday 26 September 2026".

### Sources and links

- [ ] Every date, price, number and quote comes from a page that was **actually
      opened**. Never approximate a quote from memory. Never attribute a quote
      to someone unless you read it on the cited page.
- [ ] **3 to 6 outbound links** to primary sources: the organiser, the charity,
      the regulator, the government consultation, the trade body. News coverage
      is a route to the primary source, not a substitute.
- [x] * **Every outbound link resolves** (run the publisher with `--check-links`).
- [x] * **2 to 4 internal links**, and every one must be a route that exists.
      Writers invent plausible-looking routes; the publisher rejects them.
- [ ] Anything shaky is stated honestly or left out. "We could find no
      announcement either way, so treat it as absent rather than gone" is good
      journalism and good policy compliance.

### Images

- [x] * **Every article has a hero image** with **alt text** describing what the
      photo actually shows.
- [x] * Heroes are **rehosted to R2 at 1600px** before publish. Never point a
      live article at a source image: full-size Wikimedia originals OOM-killed
      the service on 26 July 2026.
- [ ] Rights are absolute. Wikimedia Commons files must be freely licensed
      (CC BY, CC BY-SA, public domain) and the credit and licence go in
      `heroImage.credit`. See CONTENT.md for the full sourcing order.

### Transparency (Google News asks for these by name)

The policy text, in full:

> "Visitors to your site want to trust and understand who writes and publishes
> the content they read. That's why news sources on Google should provide: Clear
> dates and bylines; Information about the authors, publication, and publisher;
> Information about the company or network behind the content; Contact
> information."

These are handled by the site template, not per article, but breaking them
breaks every article at once:

- Visible **date AND time** on every article. Google: "To be considered in
  Google News, articles need to show both a clear, visible date and time."
- Byline **links** to `/about`, which identifies who we are and how articles are
  made. A bare unlinked name is the thinnest possible reading of "information
  about the authors".
- Byline and date **visually differentiated** from the first sentence.
- Footer carries **Spaces Please Ltd, company number 16518769** and a monitored
  editorial email. Also a UK trading disclosure requirement.
- **Never invent journalist personas.** Everything is credited to the Live Laugh
  Local team. Fake bylines with fake bios are the actual violation; an honest
  collective byline is fine.
- **Never re-date an article** without substantive new information.

### Conflict of interest

Spaces Please Ltd owns this magazine and sells to the exact audience it serves.
Google prohibits content that "conceals or misrepresents sponsored content as
independent, editorial content", and requires that sponsorship "be clearly
disclosed to readers".

- Mention Spaces Please **at most once per article**, only where a reader would
  genuinely want it (someone after a stall, or after stallholders). If it does
  not fit naturally, leave it out.
- Ownership is disclosed in the footer and on `/about`. Keep it there.
- **Paid Featured placements must stay visibly labelled** and carry
  `rel="sponsored"` links. The sanitiser sets this from the `featured` flag.

---

## Cadence: the one genuine risk

26 articles in 5 days across 20 categories is roughly 1.3 per category. That
broad-thin-fast shape is exactly what scaled content abuse enforcement is
calibrated to catch, and it is the only metric on this site that pattern-matches
automation.

- **Target 2 to 3 articles a week**, sustained, not bursts.
- **Deepen before widening.** Several strong articles in one category beat one
  each in six new ones.
- What protects us is per-article originality: named venues, verified dates,
  real prices, travel and parking detail. What condemns a site is interchangeable
  "best X in Y" pages assembled from other sites' listings.

---

## Structured data

Driven by `articleType` on the article (`models/Article.js`), set at write time.
**Resolved 29 July 2026** - this was previously a known mismatch, with every
article emitting `NewsArticle` regardless of what it was.

| `articleType` | schema.org `@type` | In the news sitemap? |
|---|---|---|
| `news` | `NewsArticle` | yes, for 48 hours |
| `listing` | `Article` | no |
| `guide` | `Article` | no |

- **A what's-on listing is not news.** Dates in it are the subject, not a peg.
  Only 7 of the first 39 articles were genuinely news; the rest were 27 listings
  and 5 guides. Filing listings as news claims news volume we do not have, which
  is the shape scaled-content enforcement looks for.
- The default is `listing`, deliberately. Wrongly missing the news sitemap is a
  far smaller harm than wrongly claiming `NewsArticle`.
- Publisher and the site entity are `NewsMediaOrganization`.
- `datePublished` / `dateModified` in ISO 8601. Headline capped at 110.
- Validate at <https://search.google.com/test/rich-results>.

## Discovery plumbing (already built, do not regress)

| Thing | Where | Rule that bites |
|---|---|---|
| Canonical | every route | page-level `alternates` REPLACES the layout's, it does not merge |
| News sitemap | `app/news-sitemap.xml/route.js` | `articleType: 'news'` only, last 48 hours, max 1,000 entries; usually empty, and that is fine |
| RSS | `app/rss.xml/route.js` | RFC-822 dates not ISO; media namespace URI ends in a slash |
| Feed autodiscovery | rendered in `app/layout.js` | must NOT be declared via the metadata API, see canonical rule |
| robots.txt | `app/robots.js` | a specific group REPLACES `User-agent: *`; disallows must be repeated |

---

## Publishing

Always via the validating publisher. Never a hand-rolled script, and never
`strict: false`, which skips Mongoose validation and once produced a row the
admin could not re-save.

```bash
node scripts/publish-batch.mjs <articles.json> --dry --check-links   # verify
node scripts/publish-batch.mjs <articles.json> --check-links         # publish
node scripts/publish-batch.mjs <articles.json> --draft               # queue for review
```
