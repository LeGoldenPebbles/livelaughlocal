import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import RemovalRequest from '@/models/RemovalRequest';
import { SITE } from '@/lib/constants';
import { makeToken } from '@/lib/tokens';
import { sendMail, emailShell } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'local';
}

// Accepts a full article URL or a bare slug; the slug is the last path segment.
function parseSlug(value) {
  const cleaned = String(value || '').trim().split(/[?#]/)[0];
  const parts = cleaned.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
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
    if (!checkRateLimit(`remove:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: 'Too many requests - please try again later' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const slug = parseSlug(body.slug || body.article);
    const email = String(body.email || '').toLowerCase().trim();
    if (!slug || slug.length > 200 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await dbConnect();

    const article = await Article.findOne({ slug, origin: 'submission' })
      .select('slug title submitterEmail')
      .lean();

    if (article && article.submitterEmail === email) {
      await RemovalRequest.create({ slug, email, status: 'emailed', ip });

      const removeUrl =
        `${SITE.url}/api/remove/confirm` +
        `?slug=${encodeURIComponent(slug)}` +
        `&email=${encodeURIComponent(email)}` +
        `&token=${encodeURIComponent(makeToken('remove', slug, email))}`;

      try {
        await sendMail({
          to: email,
          subject: 'Confirm article removal - Live Laugh Local',
          html: emailShell(
            'Confirm article removal',
            `<p>Someone - hopefully you - asked to remove the article
             "<strong>${escapeHtml(article.title || slug)}</strong>" from Live Laugh Local.</p>
             <p>Click the button below to confirm. The article comes down straight away.</p>
             <p style="margin:24px 0;"><a href="${removeUrl}" style="background:#E85D3D;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:14px;">Remove my article</a></p>
             <p>If the button does not work, paste this link into your browser:<br>
             <a href="${removeUrl}">${removeUrl}</a></p>
             <p>Didn't ask for this? Ignore this email - nothing happens without the click.</p>`
          ),
          text:
            `Someone - hopefully you - asked to remove "${article.title || slug}" from Live Laugh Local.\n\n` +
            `Confirm and the article comes down straight away:\n${removeUrl}\n\n` +
            `Didn't ask for this? Ignore this email - nothing happens without the click.`,
        });
      } catch (err) {
        console.error('[api/remove/request] removal email failed', err);
      }
    } else if (article) {
      // Wrong email for a real article - keep an audit trail, say nothing.
      await RemovalRequest.create({ slug, email, status: 'mismatched', ip });
    }

    // Always the same answer - no article enumeration.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/remove/request]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
