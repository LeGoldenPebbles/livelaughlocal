# Deploying Live Laugh Local

## One-time setup (about 15 minutes of clicking)

### 1. Render service
Dashboard -> New -> **Blueprint** -> pick the `livelaughlocal` GitHub repo.
`render.yaml` creates one web service (Starter, Frankfurt, autodeploy on push
to main). Free tier is deliberately NOT used: cold starts poison crawler
response times and this site lives on SEO.

### 2. Environment variables (dashboard -> service -> Environment)
The blueprint pre-fills the public ones. Fill the secret ones:

| Key | Value |
|-----|-------|
| MONGODB_URI | same Atlas cluster as Spaces Please, database **livelaughlocal** (copy the prod URI and change the database segment) |
| ADMIN_KEY | long random string - this is the admin panel password |
| TOKEN_SECRET | 64 random hex chars (independent secret for HMAC email links) |
| STRIPE_SECRET_KEY | the Spaces Please Stripe secret key (same legal entity). Test key until featured placements are QA'd |
| R2_* | new bucket `livelaughlocal` on the existing Cloudflare R2 account + a public dev URL (R2_PUBLIC_HOST is the bare host, e.g. pub-xxxx.r2.dev). Until set, uploads return a polite 503 and everything else works |
| EMAIL_* | Mailtrap SMTP (prod token delivers, dev traps). Until set, emails no-op with a console warning |

Minimum viable launch env = MONGODB_URI + ADMIN_KEY + TOKEN_SECRET (+ the
pre-filled publics). Stripe/R2/email can follow - each degrades gracefully.

### 3. Domain
Buy **livelaughlocal.co.uk**, then Render -> service -> Settings -> Custom
Domains -> add `livelaughlocal.co.uk` and `www.livelaughlocal.co.uk`, add the
CNAME/A records at the registrar, wait for the cert.

### 4. The moment the domain is live
1. Set `NOINDEX=false` in Render env (this removes the X-Robots-Tag header
   and switches robots.txt to allow) - the site is invisible to Google until
   you do this, on purpose.
2. Google Search Console -> add property livelaughlocal.co.uk (DNS
   verification) -> submit `https://livelaughlocal.co.uk/sitemap.xml`.

### 5. Seed the launch articles
```bash
npm run seed              # inserts as drafts -> review in /admin
npm run seed -- --publish # or straight to published
```
Runs against MONGODB_URI from `.env.local` or the environment.

## Ongoing
- Push to `main` = deploy (autodeploy on).
- Admin: `/admin`, password = ADMIN_KEY. Not linked anywhere, noindexed.
- Publish cadence: max 1 editorial piece per weekday. Ramp only when Search
  Console shows indexation (kill criteria in PLAN.md section 13).
- Phase 2 gates (AdSense + CMP, cron generation): PLAN.md section 12.
