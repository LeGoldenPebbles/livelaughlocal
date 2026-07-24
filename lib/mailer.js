import nodemailer from 'nodemailer';

let transporter = null;

function getTransport() {
  if (!process.env.EMAIL_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: process.env.EMAIL_USER
        ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        : undefined,
    });
  }
  return transporter;
}

export function emailShell(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F7F2EA;font-family:Georgia,serif;color:#181715;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:22px;margin:0 0 4px;">live laugh local <span style="color:#EF5A3C;">*</span></p>
    <hr style="border:none;border-top:1px solid #E8E1D2;margin:16px 0 24px;">
    <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;color:#46423C;">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #E8E1D2;margin:32px 0 16px;">
    <p style="font-size:12px;color:#8A847A;font-family:Arial,Helvetica,sans-serif;">Live Laugh Local is part of Spaces Please Ltd. You received this because of an action taken with this email address on livelaughlocal.co.uk - it is not a marketing list.</p>
  </div></body></html>`;
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransport();
  if (!t) {
    console.warn(`[mailer] EMAIL_HOST not set - skipped "${subject}" to ${to}`);
    return false;
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'Live Laugh Local <no-reply@livelaughlocal.co.uk>',
    to,
    subject,
    html,
    text: text || undefined,
  });
  return true;
}
