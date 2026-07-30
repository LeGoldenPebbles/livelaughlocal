# The enforced contract

Everything here is checked by `scripts/publish-batch.mjs` against the **sanitised**
body, not your raw draft. Blockers abort the entire batch and nothing is written.
Warnings print and continue.

Kept in sync with the script by hand. If the script gains a rule, add it here; a
rule that lives only in prose is a rule that gets skipped.

---

## Blockers

| Rule | Limit |
|---|---|
| Title | max 110 characters (Google truncates news headlines past that) |
| Title, schema | max 120 characters |
| Dek | required, max 160 |
| metaTitle | max 70 |
| metaDesc | max 160 |
| Body length | under 700 words or over 1100 words |
| Blockquotes | fewer than 2 in any article of 700 words or more |
| Tags | anything outside `p h2 h3 strong em a ul ol li blockquote br` |
| Attributes | anything except `href` |
| Dashes | any em or en dash in title, dek, metaTitle, metaDesc, heroAlt or body |
| Hero | `hero.directUrl` missing |
| heroAlt | missing, under 10 characters, or over 160 |
| articleType | present but not `news`, `listing` or `guide` (absent warns and defaults to `listing`) |
| Category | not one of the 28 slugs in `lib/constants.js` |
| Slug | already exists (the article is skipped, not overwritten) |
| Internal links | any `href="/..."` that is not in the live route set |
| Outbound links | 404 or 410, or any non-OK status that is not a bot block (`--check-links`) |
| Spaces Please | more than one link to a non-`/events/` path |
| Near-duplicate | 50% or more title word overlap with a published article in the same category |
| Sanitiser | strips more than 5% of the body text |

## Warnings

| Rule | Target |
|---|---|
| Title words | 2 to 22 |
| Body length | 800 to 950 words |
| h2 count | 3 to 5 |
| Outbound links | 3 or more |
| Internal links | 2 or more |
| metaDesc | 120 to 160 characters, aim 140 to 158 |
| Hero licence | recorded in `hero.licence` |

---

## The short-listing exemption does not exist

`docs/NEWS_COMPLIANCE.md` and the handover both describe a carve-out: the
two-quote rule applies only to features over 700 words, because a 400-word listing
piece ("market comes to X on Saturday") legitimately has nobody to quote.

**That carve-out can never fire.** The word-count floor is a hard error below 700
words, and the quote threshold is 700 words. Any article short enough to skip the
quotes is already too short to publish. In practice: every publishable article
needs two named, sourced quotes.

The rule is not wrong, it is unreachable. Do not write a 500-word listing piece
expecting it to pass.

---

## Valid internal routes

The publisher builds this set fresh on every run and matches **exactly**. No
trailing slashes, no query strings, no fragments. `/about#team` fails.
`/markets-and-fairs/` fails.

- `/` `/whats-on` `/submit` `/about` `/contact` `/terms` `/privacy` `/cookies` `/remove`
- `/<category>` for each of the 28 slugs in `lib/constants.js`
- `/<category>/<slug>` for every currently published article
- `/<category>/<slug>` for every article in the batch being published, so a batch
  may cross-link itself

There is no `/events` and no `/news` on this site. Writers invent both.

**Generate the list, never remember it.** It changes with every batch, so a copy
pasted into a writer prompt goes stale and the next batch fails on links that were
valid last week:

```bash
node scripts/list-routes.mjs              # every valid route, grouped
node scripts/list-routes.mjs --articles   # published articles only, for a prompt
```

Read-only, and safe from any working directory.

---

## Bot blocks are not dead links

`--check-links` treats 401, 403, 405, 429, 503 and 999 as "this server dislikes
robots", reports them, and continues. Only 404 and 410 are unambiguous.

Node's `fetch` is also stricter about TLS than a browser, and throws on hosts that
work fine in practice, so the checker takes a second opinion from `curl` before
calling anything dead. Both of these exist because false dead-link failures
blocked a publish for no reason, and a check that cries wolf is a check people
learn to skip.

---

## Field shape

The publisher reads a **flat** object and assembles the nested document itself.
`metaTitle`, `metaDesc` and `heroAlt` are top level. Do not nest them under `seo`
or `heroImage`; they will be silently ignored and the article will publish with no
meta description.

`articleType` must be `news`, `listing` or `guide`. A wrong value is a blocker; an
absent one is a warning and the article is treated as a `listing`. See
[article-types.md](article-types.md).

The byline is always set by the publisher to "Live Laugh Local team", kind
`staff`. Never invent a journalist persona; fake bylines with fake bios are a
named Google spam trigger, and an honest collective byline is fine.
