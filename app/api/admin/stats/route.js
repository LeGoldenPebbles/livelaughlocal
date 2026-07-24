import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import PageView from '@/models/PageView';
import DailyUnique from '@/models/DailyUnique';
import RefStat from '@/models/RefStat';
import RemovalRequest from '@/models/RemovalRequest';
import { isAdminRequest } from '@/lib/adminAuth';
import { CATEGORY_SLUGS } from '@/lib/constants';

// Aggregate stats for the admin dashboards (local /admin and the Spaces
// Please Pandora's Box space, which proxies here server-to-server).
export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    await dbConnect();

    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const created30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [
      statusCounts,
      viewAgg,
      topArticles,
      removalAgg,
      pvByDay,
      pvByPath,
      uniquesByDay,
      referrers,
      submissionsTotal,
      submissions30,
      featuredCharged,
      featuredActiveNow,
    ] = await Promise.all([
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
        { $match: { day: { $gte: since30 } } },
        { $group: { _id: '$day', count: { $sum: '$count' } } },
        { $sort: { _id: 1 } },
      ]),
      PageView.aggregate([
        { $match: { day: { $gte: since30 } } },
        { $group: { _id: '$path', count: { $sum: '$count' } } },
      ]),
      DailyUnique.aggregate([
        { $match: { day: { $gte: since30 } } },
        { $group: { _id: '$day', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      RefStat.aggregate([
        { $match: { day: { $gte: since30 } } },
        { $group: { _id: '$source', count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
      Article.countDocuments({ origin: 'submission' }),
      Article.countDocuments({ origin: 'submission', createdAt: { $gte: created30 } }),
      Article.countDocuments({ 'stripe.chargeId': { $exists: true, $nin: [null, ''] } }),
      Article.countDocuments({ 'featured.active': true, 'featured.until': { $gt: new Date() } }),
    ]);

    const counts = {};
    for (const s of statusCounts) counts[s._id] = s.n;
    const removals = {};
    for (const r of removalAgg) removals[r._id] = r.n;

    // Reading split: article pages (/category/slug) vs everything else.
    let pvArticles = 0;
    let pvOther = 0;
    for (const p of pvByPath) {
      const segments = String(p._id || '').split('/').filter(Boolean);
      if (segments.length === 2 && CATEGORY_SLUGS.includes(segments[0])) {
        pvArticles += p.count;
      } else {
        pvOther += p.count;
      }
    }

    return NextResponse.json({
      counts,
      totalViews: viewAgg[0]?.total || 0,
      viewsByDay: pvByDay.map((d) => ({ day: d._id, count: d.count })),
      uniquesByDay: uniquesByDay.map((d) => ({ day: d._id, count: d.count })),
      referrers: referrers.map((r) => ({ source: r._id, count: r.count })),
      pvSplit: { articles: pvArticles, other: pvOther },
      submissions: { total: submissionsTotal, last30: submissions30 },
      earnings: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        featuredCharged,
        featuredTotalGBP: featuredCharged * 100,
        featuredActiveNow,
      },
      topArticles: JSON.parse(JSON.stringify(topArticles)),
      removals,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
