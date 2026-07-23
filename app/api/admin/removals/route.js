import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RemovalRequest from '@/models/RemovalRequest';
import { isAdminRequest } from '@/lib/adminAuth';

export async function GET(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await dbConnect();
    const docs = await RemovalRequest.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const removals = docs.map((d) => ({ ...d, _id: String(d._id) }));

    return NextResponse.json({ removals });
  } catch (err) {
    console.error('[admin/removals]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
