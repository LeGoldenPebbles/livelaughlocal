import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import RemovalRequest from '@/models/RemovalRequest';
import { SITE } from '@/lib/constants';
import { verifyToken } from '@/lib/tokens';

// Email-click removal link. Browser-facing, so failures redirect to a human
// page rather than returning JSON.
export async function GET(request) {
  const invalid = NextResponse.redirect(new URL('/remove?invalid=1', SITE.url));
  try {
    const sp = request.nextUrl.searchParams;
    const slug = String(sp.get('slug') || '');
    const rawEmail = String(sp.get('email') || '');
    const token = String(sp.get('token') || '');

    if (!slug || !rawEmail || !verifyToken(token, 'remove', slug, rawEmail)) {
      return invalid;
    }

    const email = rawEmail.toLowerCase().trim();

    await dbConnect();

    // The token binds slug+email; the extra submitterEmail match is
    // belt-and-braces (tokens are only ever issued for the real submitter).
    const result = await Article.updateOne(
      { slug, submitterEmail: email },
      { $set: { status: 'removed' } }
    );
    if (result.matchedCount === 0) return invalid;

    await RemovalRequest.findOneAndUpdate(
      { slug, email },
      { $set: { status: 'confirmed' } },
      { sort: { createdAt: -1 } }
    );

    return NextResponse.redirect(new URL('/remove?done=1', SITE.url));
  } catch (err) {
    console.error('[api/remove/confirm]', err);
    return invalid;
  }
}
