import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import PageView from '@/models/PageView';
import { isAdminRequest } from '@/lib/adminAuth';

// Per-article performance for the admin dashboards: all-time views plus a
// sparse last-14-day daily series per published article (top 50 by views).
// Consumers zero-fill the series against their own day axis.
export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    await dbConnect();

    const articles = await Article.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(50)
      .select('slug title category viewCount publishedAt')
      .lean();

    const since14 = new Date(Date.now() - 14 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const paths = articles.map((a) => `/${a.category}/${a.slug}`);
    const pv = await PageView.aggregate([
      { $match: { path: { $in: paths }, day: { $gte: since14 } } },
      { $group: { _id: { path: '$path', day: '$day' }, count: { $sum: '$count' } } },
    ]);

    const byPath = {};
    for (const row of pv) {
      const { path, day } = row._id;
      (byPath[path] = byPath[path] || []).push({ day, count: row.count });
    }
    for (const series of Object.values(byPath)) {
      series.sort((a, b) => (a.day < b.day ? -1 : 1));
    }

    return NextResponse.json({
      articles: articles.map((a) => ({
        ...JSON.parse(JSON.stringify(a)),
        series: byPath[`/${a.category}/${a.slug}`] || [],
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
