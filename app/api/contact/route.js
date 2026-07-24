import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContactMessage from '@/models/ContactMessage';
import { sendMail, emailShell } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 4000;
const TEAM_INBOX = 'hello@spacesplease.com';

function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'local';
}

function bad(message) {
  return NextResponse.json({ error: message }, { status: 400 });
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
    if (!checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: 'Too many messages from this connection - please try again later' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid request');
    }

    // Anti-spam: honeypot filled or the form completed implausibly fast.
    // Pretend success, save nothing.
    const honeypot = String(body.website || '').trim();
    const startedAt = Number(body.startedAt) || 0;
    if (honeypot || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || '').trim();
    if (!name || name.length > 80) return bad('Please tell us your name (up to 80 characters).');

    const email = String(body.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) return bad('Please enter a valid email address.');

    const subject = String(body.subject || '').trim().slice(0, 120);

    const message = String(body.message || '').trim();
    if (message.length < 10 || message.length > 5000) {
      return bad('Messages need to be between 10 and 5,000 characters.');
    }

    // Stored first - the email below is only a notification.
    await dbConnect();
    const doc = await ContactMessage.create({ name, email, subject, message });

    let emailed = false;
    try {
      emailed = await sendMail({
        to: TEAM_INBOX,
        subject: `[LLL contact] ${subject || 'New message'} - ${name}`,
        html: emailShell(
          'New contact message',
          `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
           ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
           <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
           <p style="color:#8A847A;font-size:12px;">Sent via the livelaughlocal.co.uk contact form. Reply directly to this email to answer.</p>`
        ),
        text:
          `From: ${name} <${email}>\n` +
          (subject ? `Subject: ${subject}\n` : '') +
          `\n${message}\n\nSent via the livelaughlocal.co.uk contact form.`,
        replyTo: email,
      });
    } catch (err) {
      console.error('[api/contact] notification email failed (message stored)', err);
    }
    if (emailed) {
      await ContactMessage.updateOne({ _id: doc._id }, { $set: { emailed: true } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/contact]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
