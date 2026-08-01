import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import PageView from '@/models/PageView';
import DailyUnique from '@/models/DailyUnique';
import RefStat from '@/models/RefStat';
import RemovalRequest from '@/models/RemovalRequest';
import ClickStat from '@/models/ClickStat';
import VisitorHit from '@/models/VisitorHit';
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
      outboundClicks,
      visits,
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
      ClickStat.aggregate([
        { $match: { day: { $gte: since30 } } },
        { $group: { _id: '$host', count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
      // One array of paths per visitor per day, in order. Everything about
      // journeys is derived from this: where they land, whether they read a
      // second piece, which article sends them onward, where they leave.
      VisitorHit.aggregate([
        { $match: { day: { $gte: since30 } } },
        { $sort: { at: 1 } },
        { $group: { _id: { day: '$day', hash: '$hash' }, paths: { $push: '$path' } } },
        { $limit: 5000 },
      ]),
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

    // Journeys. A "visit" is one visitor hash on one day, which is as far as a
    // cookieless daily-rotating hash can honestly reach.
    const tally = (m) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => ({ path: k, count: n }));
    const entries = new Map();
    const exits = new Map();
    const hops = new Map();
    let single = 0;
    let depthTotal = 0;
    for (const v of visits) {
      const p = v.paths || [];
      if (!p.length) continue;
      depthTotal += p.length;
      if (p.length === 1) single += 1;
      entries.set(p[0], (entries.get(p[0]) || 0) + 1);
      exits.set(p[p.length - 1], (exits.get(p[p.length - 1]) || 0) + 1);
      for (let i = 1; i < p.length; i += 1) {
        if (p[i] === p[i - 1]) continue;
        const key = `${p[i - 1]} > ${p[i]}`;
        hops.set(key, (hops.get(key) || 0) + 1);
      }
    }
    const journeys = {
      visits: visits.length,
      // Percentage of visits that read exactly one page and left.
      bounceRate: visits.length ? Math.round((single / visits.length) * 100) : 0,
      pagesPerVisit: visits.length ? Number((depthTotal / visits.length).toFixed(2)) : 0,
      entryPages: tally(entries),
      exitPages: tally(exits),
      topHops: [...hops.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([k, n]) => ({ from: k.split(' > ')[0], to: k.split(' > ')[1], count: n })),
    };

    return NextResponse.json({
      counts,
      journeys,
      totalViews: viewAgg[0]?.total || 0,
      viewsByDay: pvByDay.map((d) => ({ day: d._id, count: d.count })),
      uniquesByDay: uniquesByDay.map((d) => ({ day: d._id, count: d.count })),
      referrers: referrers.map((r) => ({ source: r._id, count: r.count })),
      outboundClicks: outboundClicks.map((c) => ({ host: c._id, count: c.count })),
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
