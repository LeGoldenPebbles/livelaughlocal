import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { isAdminRequest } from '@/lib/adminAuth';
import { chargeFeatured } from '@/lib/featuredStripe';
import { sendMail, emailShell } from '@/lib/mailer';
import { SITE } from '@/lib/constants';

const ACTIONS = ['publish', 'reject', 'unpublish', 'remove', 'feature-off'];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Email failure must never fail the admin action - the status change is saved
// before any of this runs.
async function trySend({ to, subject, title, bodyHtml, text }) {
  try {
    await sendMail({ to, subject, html: emailShell(title, bodyHtml), text });
  } catch (err) {
    console.error('[admin/articles] email failed (action already applied)', err);
  }
}

export async function PATCH(request, { params }) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const action = typeof body?.action === 'string' ? body.action : '';
    const reason =
      typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';

    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await dbConnect();
    const doc = await Article.findOne({ slug });
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'publish') {
      // Idempotent: republishing an already-published article keeps its
      // original publishedAt and simply retries the charge if one is owed.
      doc.status = 'published';
      doc.publishedAt = doc.publishedAt || new Date();
      await doc.save();

      let charge;
      if (
        doc.origin === 'submission' &&
        doc.stripe?.paymentMethodId &&
        !doc.featured?.active
      ) {
        try {
          charge = await chargeFeatured(doc);
        } catch (err) {
          console.error('[admin/articles] chargeFeatured threw', err);
          charge = { ok: false, reason: 'Unexpected error while charging' };
        }
      }

      if (doc.submitterEmail) {
        const url = `${SITE.url}/${doc.category}/${doc.slug}`;
        await trySend({
          to: doc.submitterEmail,
          subject: 'Your story is live on Live Laugh Local',
          title: 'Your story is live',
          bodyHtml: `
            <p>Good news - "${escapeHtml(doc.title)}" is now live on Live Laugh Local.</p>
            <p><a href="${url}">Read it here</a> and share the link wherever you like.</p>
            <p>Thanks for writing for us. If anything needs correcting, just email
            <a href="mailto:hello@livelaughlocal.co.uk">hello@livelaughlocal.co.uk</a>
            and we will sort it.</p>`,
          text: `Good news - "${doc.title}" is now live on Live Laugh Local: ${url}`,
        });
      }

      return NextResponse.json({ ok: true, charge });
    }

    if (action === 'reject') {
      doc.status = 'rejected';
      doc.rejectionReason = reason;
      await doc.save();

      if (doc.submitterEmail) {
        const reasonHtml = reason
          ? `<p>We will not be publishing it this time. The editor's note: ${escapeHtml(reason)}</p>`
          : '<p>We will not be publishing it this time.</p>';
        await trySend({
          to: doc.submitterEmail,
          subject: 'About your Live Laugh Local submission',
          title: 'About your submission',
          bodyHtml: `
            <p>Thanks for sending us "${escapeHtml(doc.title)}" - we read everything that comes in, and we are glad you thought of us.</p>
            ${reasonHtml}
            <p>That is not a closed door. You are very welcome to rework it and send
            it again, and if a pointer would help first, email
            <a href="mailto:hello@livelaughlocal.co.uk">hello@livelaughlocal.co.uk</a>.</p>`,
          text: `Thanks for sending us "${doc.title}". We will not be publishing it this time.${reason ? ` The editor's note: ${reason}` : ''} You are welcome to rework it and send it again - hello@livelaughlocal.co.uk`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'unpublish') {
      doc.status = 'draft';
      await doc.save();
      return NextResponse.json({ ok: true });
    }

    if (action === 'remove') {
      doc.status = 'removed';
      await doc.save();
      return NextResponse.json({ ok: true });
    }

    // action === 'feature-off'
    doc.set('featured.active', false);
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/articles/[slug]]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
