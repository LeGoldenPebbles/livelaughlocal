import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import PageView from '@/models/PageView';
import RemovalRequest from '@/models/RemovalRequest';
import { isAdminRequest } from '@/lib/adminAuth';

// Aggregate stats for the admin dashboards (local /admin and the Spaces
// Please Pandora's Box tab, which proxies here server-to-server).
export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    await dbConnect();

    const [statusCounts, viewAgg, topArticles, removalAgg, pvByDay] =
      await Promise.all([
        Article.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Article.aggregate([
          { $match: { status: 'published' } },
          { $group: { _id: null, total: { $sum: '$viewCount' } } },
        ]),
        Article.find({ status: 'published' })
          .sort({ viewCount: -1 })
          .limit(10)
          .select('slug title category viewCount publishedAt')
          .lean(),
        RemovalRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        PageView.aggregate([
          {
            $match: {
              day: {
                $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000)
                  .toISOString()
                  .slice(0, 10),
              },
            },
          },
          { $group: { _id: '$day', count: { $sum: '$count' } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const counts = {};
    for (const s of statusCounts) counts[s._id] = s.n;
    const removals = {};
    for (const r of removalAgg) removals[r._id] = r.n;

    return NextResponse.json({
      counts,
      totalViews: viewAgg[0]?.total || 0,
      viewsByDay: pvByDay.map((d) => ({ day: d._id, count: d.count })),
      topArticles: JSON.parse(JSON.stringify(topArticles)),
      removals,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
