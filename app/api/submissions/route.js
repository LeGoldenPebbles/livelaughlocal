import crypto from 'crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { CATEGORY_SLUGS, SITE } from '@/lib/constants';
import { sanitizeBody } from '@/lib/sanitize';
import { makeToken } from '@/lib/tokens';
import { sendMail, emailShell } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/rateLimit';
import { createFeaturedCheckout } from '@/lib/featuredStripe';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 5000;

function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'local';
}

function bad(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function slugify(title) {
  const base = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'story';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (!checkRateLimit(`submissions:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: 'Too many submissions from this connection - please try again later' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid request');
    }

    // Anti-spam: honeypot filled or the form was completed implausibly fast.
    // Pretend success, save nothing.
    const honeypot = String(body.website || '').trim();
    const startedAt = Number(body.startedAt) || 0;
    if (honeypot || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      return NextResponse.json({ ok: true });
    }

    // Validation
    const name = String(body.name || '').trim();
    if (!name || name.length > 80) return bad('Please tell us your name (up to 80 characters).');

    const email = String(body.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) return bad('Please enter a valid email address.');

    const title = String(body.title || '').trim();
    if (title.length < 5 || title.length > 120) {
      return bad('Titles need to be between 5 and 120 characters.');
    }

    const dek = String(body.dek || '').trim();
    if (dek.length < 10 || dek.length > 160) {
      return bad('The standfirst needs to be between 10 and 160 characters.');
    }

    const category = String(body.category || '');
    if (!CATEGORY_SLUGS.includes(category)) return bad('Please pick a valid category.');

    const location = String(body.location || '').trim();
    if (location.length > 80) return bad('Keep the location under 80 characters.');

    const wantsFeatured = Boolean(body.featured);

    // Paid articles must never carry followed links.
    const bodyHtml = sanitizeBody(String(body.bodyHtml || ''), {
      linkRel: wantsFeatured ? 'sponsored' : 'nofollow',
    });
    const plainText = bodyHtml.replace(/<[^>]+>/g, '').trim();
    if (plainText.length < 200) {
      return bad('Your story needs a bit more body text');
    }

    // Hero image: optional, but only from our own uploader.
    let heroImage = null;
    if (body.heroImage && body.heroImage.url) {
      const url = String(body.heroImage.url);
      if (!url.startsWith('https://')) return bad('Image URLs must use https.');
      let host = null;
      try {
        host = new URL(url).host;
      } catch {
        return bad('That image URL is not valid.');
      }
      if (process.env.R2_PUBLIC_HOST && host !== process.env.R2_PUBLIC_HOST) {
        return bad('Images must be uploaded through the form.');
      }
      const alt = String(body.heroImage.alt || '').trim();
      if (alt.length > 160) return bad('Keep the image description under 160 characters.');
      heroImage = { url, alt };
    }

    await dbConnect();

    // Slug: slugified title + short random suffix; retry once on collision.
    const base = slugify(title);
    let article = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
      try {
        article = await Article.create({
          title,
          slug,
          dek,
          ...(heroImage ? { heroImage } : {}),
          bodyHtml,
          category,
          locations: location ? [location] : [],
          byline: { name, kind: 'contributor' },
          status: 'pending',
          origin: 'submission',
          submitterEmail: email,
          emailConfirmed: false,
          // Never active here - activation happens only on admin approval.
          featured: wantsFeatured ? { active: false, category } : { active: false },
        });
        break;
      } catch (err) {
        if (err && err.code === 11000 && attempt === 0) continue;
        throw err;
      }
    }
    if (!article) {
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }

    // Confirmation email - the story only enters review once this is clicked.
    const confirmUrl =
      `${SITE.url}/api/submissions/confirm` +
      `?slug=${encodeURIComponent(article.slug)}` +
      `&email=${encodeURIComponent(email)}` +
      `&token=${encodeURIComponent(makeToken('confirm', article.slug, email))}`;

    try {
      await sendMail({
        to: email,
        subject: 'Confirm your story - Live Laugh Local',
        html: emailShell(
          'Confirm your story',
          `<p>Thanks for sending "<strong>${escapeHtml(title)}</strong>" to Live Laugh Local.</p>
           <p>Click the button below to confirm this email address. Your story then joins the
           review queue - a human editor reads everything before it goes live, and we may edit
           lightly for style.</p>
           <p style="margin:24px 0;"><a href="${confirmUrl}" style="background:#EF5A3C;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:14px;">Confirm my email</a></p>
           <p>If the button does not work, paste this link into your browser:<br>
           <a href="${confirmUrl}">${confirmUrl}</a></p>
           <p>Changed your mind? You can request removal of your article at any time at
           <a href="${SITE.url}/remove">${SITE.url}/remove</a>.</p>`
        ),
        text:
          `Thanks for sending "${title}" to Live Laugh Local.\n\n` +
          `Confirm this email address to put your story in the review queue:\n${confirmUrl}\n\n` +
          `A human editor reads everything before it goes live. You can request removal at any time at ${SITE.url}/remove.`,
      });
    } catch (err) {
      // The submission stands even if the email fails - log and move on.
      console.error('[api/submissions] confirm email failed', err);
    }

    // Featured upsell: Stripe Checkout in setup mode (card saved, not charged).
    let checkoutUrl = null;
    if (wantsFeatured) {
      try {
        checkoutUrl = await createFeaturedCheckout({ slug: article.slug, email });
      } catch (err) {
        console.error('[api/submissions] featured checkout failed', err);
      }
    }

    const payload = { ok: true, slug: article.slug };
    if (checkoutUrl) {
      payload.checkoutUrl = checkoutUrl;
      payload.note =
        'Complete the card setup to request Featured placement - you are only charged if we approve and publish.';
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[api/submissions]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
