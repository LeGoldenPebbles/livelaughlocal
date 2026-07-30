# Verify, then publish

The checker is the cheapest part of the pipeline and the part that stops us
publishing something wrong about money or dates. Run it on every article,
including a "quick" one.

In recent batches a single hostile pass caught:

- an **invented product** (an open-dated attraction pass that does not exist; a
  reader could have turned up on the wrong night and been refused entry)
- a **doctored quote** from a named academic
- a **£250 deposit double-counted** in a piece telling traders what to budget
- **wrong show dates** that would have sent someone to a closed venue
- a **quote attributed to a page that did not contain it**
- **alt text describing a photograph that did not exist**

---

## The hostile checker

Run this as a separate pass with fresh eyes, not as self-review at the end of
writing. It must be able to fetch pages.

> You are a hostile checker. Assume the writer invented things until proved
> otherwise. Today is `<date>`.
>
> `<paste the house rules and the article JSON>`
>
> Check, fetching pages where needed:
>
> 1. Every blockquote: does the cited page actually contain those words, said by
>    that named person in that role? An unconfirmable quote is a BLOCKER.
> 2. Every date, price and number: does the cited source support it? Prices and
>    dates that have moved on are a BLOCKER.
> 3. Every outbound URL resolves and is the page the text claims it is. A 404 is a
>    BLOCKER. Some sites return 403 or 405 to automated requests while being
>    perfectly alive; do not report those as dead.
> 4. Every internal link is in the valid route list. Anything else is a BLOCKER.
> 5. Field limits: title 110, dek 160, metaTitle 70, metaDesc 160, heroAlt 10 to
>    160. Count properly rather than estimating. Over is a BLOCKER.
> 6. Allowed tags only, no attribute but href. An em or en dash anywhere is a
>    BLOCKER.
> 7. Spaces Please homepage linked more than once is a BLOCKER.
> 8. 800 to 950 words, at least 2 blockquotes, 3 to 5 h2s.
> 9. The hero image: does it exist, and does the alt text describe what is
>    actually in it?
> 10. Claims subtly stronger than the source supports: "the biggest", "the first",
>     "all", "always".
> 11. Does the headline promise exactly what the body delivers?
>
> Report only real problems, each with the exact fix.

Then fix only what was confirmed. If a quote or fact cannot be verified, **remove
it and rewrite around it** rather than inventing a replacement. Keep the word
count in range after edits.

---

## Publish

```bash
node scripts/publish-batch.mjs <articles.json> --dry --check-links   # prove it passes
node scripts/publish-batch.mjs <articles.json> --check-links         # publish
node scripts/publish-batch.mjs <articles.json> --draft               # queue for review
```

Never hand-roll an insert. A schemaless write skips Mongoose validation; the admin
re-saves through the real model, so an over-length field inserts cleanly and then
breaks approval later with a generic 500. That exact bug (a 161-character
metaDesc) broke a publish in production.

Publishing does not need a deploy. Articles are database rows served through ISR
with `revalidate = 300`, so a new piece appears within about five minutes. Only
code changes need deploying, and pushes to `main` do **not** deploy on their own.

The homepage is separately cached, so shortly after a deploy it can show stale
content for up to five minutes while the article pages are already live. That has
caused a "where are my articles?" panic before.

---

## Audit

```bash
node scripts/audit-corpus.mjs      # read-only, every published article
```

Run after any rule change, and before telling anyone the site is compliant.

Ten articles currently fail it, all published before the standard existed, all for
the same reason: a feature over 700 words carrying fewer than two sourced quotes.
They are not wrong, they are below a bar set after they were written. Fixing them
means re-researching and rewriting, not a find-and-replace. Do not describe the
site as fully compliant without saying this.

---

## Prove the check can fail

Three checks passed while broken in a single day, each looking like it worked
because nothing failed:

- The **near-duplicate guard** ran, printed nothing, and passed three known
  duplicates. Its query projected `slug` and `category` but not `title`, so every
  comparison scored zero against `undefined`.
- The **link checker** failed a publish on a 405 from a page that loads perfectly
  in a browser. Bot-blocking is not a dead link.
- The **link checker again** called a live URL dead because Node's `fetch` is
  stricter about TLS than curl.

Before trusting a check, feed it known-bad input and confirm it complains. Then
confirm it does not false-fail on known-good input. A check that has never been
seen to fail is not evidence of anything.
