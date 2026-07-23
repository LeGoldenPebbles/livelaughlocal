import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { isAdminRequest } from '@/lib/adminAuth';

const STATUSES = ['pending', 'draft', 'published', 'rejected', 'removed'];

export async function GET(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();
    const docs = await Article.find({ status })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Admin-only surface: submitterEmail and emailConfirmed are intentionally
    // included here. Stripe details are reduced to presence flags.
    const articles = docs.map((d) => ({
      ...d,
      _id: String(d._id),
      stripe: {
        hasCard: !!d.stripe?.paymentMethodId,
        charged: !!d.stripe?.chargeId,
      },
    }));

    return NextResponse.json({ articles });
  } catch (err) {
    console.error('[admin/articles]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
