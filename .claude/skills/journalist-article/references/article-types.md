# The three article types

The site publishes three genuinely different things. Deciding which one you are
writing is the first editorial act, not a label applied afterwards. It is stored
as `articleType` on the article and it drives real behaviour.

---

## The test

**Was something announced, confirmed, cancelled, priced, fined, closed or
consulted on, and is there a date attached to it?**

- "Southeastern confirmed on 14 July that Charing Cross closes for 22 days in
  August" - yes. That is `news`.
- "Here are the Christmas markets with confirmed 2026 dates" - no. Nobody
  announced anything to you; you compiled it. That is a `listing`.
- "Stallholders need £5m public liability cover, and here is what it costs" - no,
  and it will still be true next year. That is a `guide`.

**A what's-on article is not news.** It is the commonest thing this site
publishes and the easiest to mislabel, because it has dates in it and dates feel
like news. They are not. A date in a listing is the subject; a date in news is
the peg.

If you find yourself building an argument for why your roundup is really news, it
is a listing.

---

## What each one changes

| | `news` | `listing` | `guide` |
|---|---|---|---|
| Opening | the peg and its date | the most useful entry in the list | the question the reader arrived with |
| Sourcing | the announcement, plus reaction | each organiser's own page per entry | current providers and prices, dated |
| Dates | load-bearing, be exact | the subject of the piece | as few as possible |
| Close | what happens next and when | what to book and by when | what to do now, in order |
| Lifespan | days to weeks | one season | years, updated in place |
| schema.org | `NewsArticle` | `Article` | `Article` |
| News sitemap | yes, for 48 hours | no | no |
| Typical categories | `breaking-news`, `money-and-tickets`, `transport-and-travel`, `weather-watch` | most of the taxonomy | `business-of-events`, any "how to" |

`listing` and `guide` both emit `Article`. They stay separate values because the
editorial difference is real, and because listings are where `ItemList` markup
would go if it is ever added.

`breaking-news` renders a pulsing coral BREAKING badge everywhere the article
appears. File only genuinely fresh stories there, verified against the source's
own publication date within the last day or two. Never dress up a stale story to
earn the badge.

---

## Where the corpus landed

Classified 29 July 2026 across 39 published articles:

| | |
|---|---|
| `news` | 7 |
| `listing` | 27 |
| `guide` | 5 |

Before that, **all 39 emitted `NewsArticle`** and anything published in the last
48 hours entered the news sitemap regardless of what it was. Claiming news volume
we do not have is exactly the shape scaled-content enforcement is calibrated to
catch, so the correction matters more than the tidiness.

`scripts/backfill-article-type.mjs` holds the classification and the one-line
reason for each, and is kept as the record of how the call was made.

**Expect the news sitemap to be empty most weeks.** That is the intended
consequence of only genuine news going in it, and Google says explicitly that an
empty news sitemap is fine.

---

## Dating a guide without rotting it

Evergreen does not mean undated. It means the dates are anchored to when you
checked, not to an event.

- Good: "Premiums were £58 to £74 a year when we checked in July 2026."
- Bad: "Premiums are around £60 a year." (silently wrong in eighteen months)
- Bad: "Applications close on 31 August." (true once, then wrong forever)

Where a recurring deadline matters, give the pattern and one worked example:
"Most Christmas market applications close between June and August; Bath's closed
on 31 May 2026."

**Never re-date an article without substantive new information.** Refreshing a
`publishedAt` to look fresh is exactly the manipulation the policy names.

---

## If you get it wrong

Nothing breaks, and it is cheap to correct: the field is a plain enum on the
article, so a re-classification is a one-field update and the page picks it up on
the next revalidate. There is no URL change and no redirect.

The asymmetry is worth knowing, though. A listing wrongly marked `news` claims a
news surface it does not deserve and puts non-news in the news sitemap. A news
piece wrongly marked `listing` just misses a sitemap it would probably not have
won much from anyway. **When genuinely unsure, choose `listing`.**
