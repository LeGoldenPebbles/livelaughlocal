import Stripe from 'stripe';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { SITE, FEATURED_PRICE_GBP, FEATURED_MONTHS } from '@/lib/constants';
import { sendMail, emailShell } from '@/lib/mailer';

let stripeClient = null;

// Lazy-init so builds and non-Stripe paths never require the key.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Start a deferred-capture Checkout for a featured placement.
 * mode:'setup' saves the card WITHOUT charging it - the off-session charge
 * fires only when an admin approves (chargeFeatured below). Plain auth holds
 * expire in ~7 days and are forbidden here.
 *
 * Returns the hosted Checkout URL, or null on ANY failure - a Stripe hiccup
 * must never fail the submission itself.
 */
export async function createFeaturedCheckout({ slug, email }) {
  const stripe = getStripe();
  if (!stripe) return null;
  if (!slug || !email) return null;

  try {
    await dbConnect();

    const article = await Article.findOne({ slug });
    if (!article || article.origin !== 'submission') return null;

    const customer = await stripe.customers.create({
      email,
      metadata: { slug, site: 'livelaughlocal' },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],
      success_url:
        SITE.url + '/api/featured/confirm?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: SITE.url + '/submit/thanks?featured=cancelled',
      metadata: { slug, email, site: 'livelaughlocal' },
    });

    article.stripe.customerId = customer.id;
    article.stripe.checkoutSessionId = session.id;
    await article.save();

    return session.url;
  } catch (err) {
    console.error('[featuredStripe] createFeaturedCheckout failed:', err);
    return null;
  }
}

/**
 * Charge the saved card off-session for a featured placement. Called by the
 * admin approval flow (slice E) with a live Mongoose Article document.
 *
 * Returns { ok: true } or { ok: false, reason } without touching the article
 * on failure.
 */
export async function chargeFeatured(articleDoc) {
  const stripe = getStripe();
  if (!stripe) return { ok: false, reason: 'no-stripe' };

  const customerId = articleDoc?.stripe?.customerId;
  const paymentMethodId = articleDoc?.stripe?.paymentMethodId;
  if (!customerId || !paymentMethodId) {
    return { ok: false, reason: 'no-card' };
  }

  // A card is charged at most ONCE per article, ever. Unpublish -> republish
  // (or feature-off -> publish) must never take the £100 again. Reactivating a
  // paid-but-disabled feature is a deliberate admin decision, not a side effect.
  if (articleDoc?.stripe?.chargeId) {
    return { ok: true, already: true };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: FEATURED_PRICE_GBP * 100,
      currency: 'gbp',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description:
        'Live Laugh Local featured placement (12 months): ' + articleDoc.slug,
      metadata: { slug: articleDoc.slug, site: 'livelaughlocal' },
    });
  } catch (err) {
    // authentication_required / card_declined etc. Article left untouched.
    console.error(
      '[featuredStripe] chargeFeatured failed for ' + articleDoc.slug + ':',
      err
    );
    return { ok: false, reason: err.code || 'charge-failed' };
  }

  const featuredCategory =
    (articleDoc.featured && articleDoc.featured.category) ||
    articleDoc.category;
  const until = new Date(Date.now() + 365 * 24 * 3600 * 1000);

  articleDoc.featured.active = true;
  articleDoc.featured.until = until;
  articleDoc.featured.category = featuredCategory;
  articleDoc.stripe.chargeId = paymentIntent.id;
  await articleDoc.save();

  // Payment confirmation email. The charge succeeded, so a mail failure is
  // logged but never turns the result into a failure.
  if (articleDoc.submitterEmail) {
    try {
      const untilText = until.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const title = escapeHtml(articleDoc.title);
      const body = `
        <p>Thanks - we have taken payment for your featured placement on Live Laugh Local.</p>
        <p>
          <strong>Amount:</strong> &pound;${FEATURED_PRICE_GBP}<br>
          <strong>Article:</strong> ${title}<br>
          <strong>Featured until:</strong> ${untilText}
        </p>
        <p>Your article now appears as a featured placement in its category for ${FEATURED_MONTHS} months.</p>
        <p>You can ask us to take your article down at any time at <a href="${SITE.url}/remove">${SITE.url}/remove</a>, or by emailing hello@livelaughlocal.co.uk.</p>
      `;
      await sendMail({
        to: articleDoc.submitterEmail,
        subject: 'Payment received - your featured placement is confirmed',
        html: emailShell('Payment confirmation', body),
        text:
          'Thanks - we have taken payment for your featured placement on Live Laugh Local.\n\n' +
          'Amount: GBP ' + FEATURED_PRICE_GBP + '\n' +
          'Article: ' + articleDoc.title + '\n' +
          'Featured until: ' + untilText + '\n\n' +
          'You can ask us to take your article down at any time at ' +
          SITE.url + '/remove, or by emailing hello@livelaughlocal.co.uk.',
      });
    } catch (err) {
      console.error(
        '[featuredStripe] payment confirmation email failed for ' +
          articleDoc.slug + ':',
        err
      );
    }
  }

  return { ok: true };
}
