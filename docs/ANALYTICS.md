# Analytics: the cookieless tracking layer

Self-hosted, cookieless, GDPR-friendly by construction. No consent banner is
required for any of this - nothing identifying is stored and nothing persists
on the visitor's device.

## Collection

`components/PvBeacon.js` renders on article pages and fires one
`navigator.sendBeacon` POST to `/api/pv` with `{ path, ref }`. The route
records, per event:

| Model | Row | Meaning |
|---|---|---|
| `PageView` | `{ path, day, count }` | one row per path per day, incremented |
| `DailyUnique` | `{ day, hash }` | unique visitors: `HMAC-SHA256(ip \| ua \| day)` keyed by `TOKEN_SECRET`. Irreversible, rotates at midnight, cannot track across days |
| `RefStat` | `{ day, source, count }` | referrer hostname (`google.com`, `facebook.com`, …) or `direct`; internal navigation is never recorded |
| `Article.viewCount` | integer | all-time views, bumped for `/category/slug` paths |

The beacon endpoint always answers 204 and swallows every error - analytics
must never break a page.

## Reporting endpoints (admin-gated)

- `GET /api/admin/stats` - counts by status, total views, 30-day
  views-by-day + uniques-by-day series, top referrers, article-vs-other
  reading split, submission counts, featured earnings summary
  (`stripeConfigured`, charged count, £ total, live-now count).
- `GET /api/admin/stats/articles` - top 50 published articles with all-time
  views and a sparse last-14-day daily series (consumers zero-fill).

Both serve the local `/admin` dashboard and the Spaces Please Pandora's Box
command centre (Overview and Performance sections) through the bridge.

## What lives elsewhere

- **Search impressions, ranking positions, Google Discover**: Google Search
  Console only. Needs one-time site verification by the owner. This is the
  single biggest reporting blind spot until done.
- **Ad revenue**: AdSense reports it; the dashboards link out.

## Extending

Keep the invariants: no cookies, no raw IPs/user agents at rest, hash keys
rotate daily, referrers are hostnames only, and the beacon never errors.
