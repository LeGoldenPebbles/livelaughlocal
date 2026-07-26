import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { SITE } from '@/lib/constants';
import { verifyToken } from '@/lib/tokens';
import { sendSubmissionConfirmedAlert } from '@/lib/ntfy';

// Email-click confirmation link. Browser-facing, so failures redirect to a
// human page rather than returning JSON.
export async function GET(request) {
  const invalid = NextResponse.redirect(new URL('/submit/thanks?invalid=1', SITE.url));
  try {
    const sp = request.nextUrl.searchParams;
    const slug = String(sp.get('slug') || '');
    const email = String(sp.get('email') || '');
    const token = String(sp.get('token') || '');

    if (!slug || !email || !verifyToken(token, 'confirm', slug, email)) {
      return invalid;
    }

    await dbConnect();
    // The token binds slug+email; the extra submitterEmail match is
    // belt-and-braces (tokens are only ever issued for the real submitter).
    const result = await Article.updateOne(
      { slug, submitterEmail: email.toLowerCase().trim(), emailConfirmed: { $ne: true } },
      { $set: { emailConfirmed: true } }
    );
    if (result.matchedCount === 0) {
      // Already confirmed is not an error - a second click on the same link
      // should still land on the thank-you page, just without a repeat alert.
      const already = await Article.countDocuments({
        slug,
        submitterEmail: email.toLowerCase().trim(),
      });
      if (!already) return invalid;
      return NextResponse.redirect(new URL('/submit/thanks', SITE.url));
    }

    // Confirmed for the first time - tell the editor it is a real one.
    sendSubmissionConfirmedAlert();

    return NextResponse.redirect(new URL('/submit/thanks', SITE.url));
  } catch (err) {
    console.error('[api/submissions/confirm]', err);
    return invalid;
  }
}
