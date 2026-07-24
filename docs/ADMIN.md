# Admin surfaces and the Pandora's Box bridge

Two front doors, one auth scheme, one set of API routes in this app.

## Auth

`lib/adminAuth.js`: the session cookie `lll_admin` holds
`HMAC-SHA256("admin-session")` keyed by `TOKEN_SECRET + ADMIN_KEY`.
Deterministic - no session store. Rotating either secret logs everyone out.
No `ADMIN_KEY` in the environment = admin is switched off entirely.

## Door 1: `/admin` (this app)

Unlinked, noindexed, password = `ADMIN_KEY`. Review queues, stats, removals.
The fallback desk when Spaces Please is unavailable.

## Door 2: Pandora's Box → Live Laugh Local (the command centre)

The Spaces Please admin panel has a full-screen Live Laugh Local space
(`/pandoras-box/livelaughlocal`) with a left nav:

| Section | Backed by |
|---|---|
| Overview | `/api/admin/stats` - audience/magazine/earnings stat rows, 30-day views + uniques chart, referrers, reading split, queue strip, top articles |
| Performance | `/api/admin/stats/articles` - per-article 14-day sparklines |
| Earnings | stats + published-articles list - featured revenue, placement states, Stripe/AdSense link-outs |
| Approvals | pending/draft queues - Publish (fires the featured charge when owed) and Reject (reason required, emailed) |
| Articles | published/rejected/removed management (unpublish, remove, feature-off) |
| Removals | removal-request queue |

Plus a tools rail: live site, sitemap, Search Console, AdSense, Stripe.

### How the bridge works

The Spaces Please backend (`server/routes/adminLLL.js`, mounted at
`/api/admin/lll`, behind Spaces Please adminAuth) **mints the `lll_admin`
cookie itself** - it holds `LLL_TOKEN_SECRET` + `LLL_ADMIN_KEY` (this app's
two secrets) in its Render env and computes the same HMAC, then proxies
requests server-to-server to this app's `/api/admin/*` routes and relays
responses verbatim.

Consequences worth knowing:

- Emails and the Stripe charge stay implemented in exactly ONE place (this
  app). The bridge is a dumb, authenticated pipe.
- If the SP backend lacks the env pair it returns 503 and the command centre
  shows its "integration not configured" state.
- Rotating this app's `TOKEN_SECRET`/`ADMIN_KEY` requires updating
  `LLL_TOKEN_SECRET`/`LLL_ADMIN_KEY` on BOTH Spaces Please backends
  (prod + staging) or the command centre goes dark.

## Admin actions (PATCH `/api/admin/articles/[slug]`)

| Action | Effect |
|---|---|
| `publish` | status → published (idempotent; keeps original publishedAt); fires the £100 charge if a featured submission with a saved card is owed; emails the submitter |
| `reject` | status → rejected with a required reason; emails the submitter kindly |
| `unpublish` | status → draft |
| `remove` | status → removed (also reachable via the public removal flow) |
| `feature-off` | featured.active → false (does not refund; re-publishing a paid article never re-charges) |
