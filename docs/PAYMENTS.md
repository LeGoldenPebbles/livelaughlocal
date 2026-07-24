# Payments: the £100 featured placement, start to finish

One product: **Featured placement, £100 for 12 months**, offered on the public
submission form. Uses the Spaces Please Stripe account (same legal entity) -
live secret key on the Render service, **test key in `.env.local`**.

## The deferred-capture model (pending until accepted)

1. **Submission**: the submitter ticks Featured and submits. The article is
   created as `pending`. `createFeaturedCheckout` creates a Stripe customer +
   a Checkout Session in **`mode: 'setup'`** - the hosted page SAVES the card,
   it does not charge it. (Plain auth holds expire in ~7 days - never use
   them; setup mode has no expiry.)
2. **Return**: Stripe redirects to `/api/featured/confirm`, which retrieves
   the session and stores `stripe.paymentMethodId` on the article. Replay-safe.
3. **Review**: the article sits in the queue like any other. The admin UI
   shows "Card saved - charges on publish".
4. **Approve** (publish action): `chargeFeatured` fires an off-session
   PaymentIntent for £100 with `receipt_email` set, then stamps
   `featured.active`, `featured.until` (+12 months) and `stripe.chargeId`.
   The submitter gets our confirmation email AND Stripe's receipt.
5. **Reject**: the card is simply never charged.

## Guards (both verified by test)

- **Route-level**: the publish action only attempts a charge for submissions
  with a saved card and `featured.active` still false.
- **Charge-level**: `chargeFeatured` refuses to charge twice - if
  `stripe.chargeId` exists it returns `{ ok: true, already: true }`.
  Unpublish → republish can never take the £100 again.
- A charge failure (declined, authentication_required) leaves the article
  untouched and surfaces the reason to the admin UI; publishing again retries.

## End-to-end test (passed 24 Jul 2026, test mode)

Scripted the full journey against a local prod build: featured submission →
hosted Checkout completed with the 4242 test card in headless Edge → confirm
stored the payment method → admin publish charged £100 (PaymentIntent
`succeeded`, amount 10000 GBP, receipt_email set, `livemode: false`) →
republish did NOT re-charge → refund → cleanup. No real card has been
processed yet.

## Local testing rules

- Use the **test** key from the Spaces Please server's local `.env` - never
  the live key locally.
- Run the local server on **port 3005**: with `SITE_URL` unset the Stripe
  success/cancel URLs default to `http://localhost:3005`, so a server on any
  other port breaks the Checkout return leg.
- Stripe dashboard requirement for receipts: Settings → Emails → tick
  "Successful payments".

## Money reporting

- Pandora's Box → Live Laugh Local → **Earnings**: featured revenue
  (`charged placements × £100`), live placements, per-placement table, plus
  link-outs to Stripe payments and AdSense (ad revenue is reported by Google;
  there is no API link yet).
- The buyer's bank statement shows the Spaces Please descriptor (shared
  account). A statement descriptor suffix is a possible future tweak.
