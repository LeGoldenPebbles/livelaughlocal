import dbConnect from '@/lib/db';
import PageView from '@/models/PageView';
import Article from '@/models/Article';
import { CATEGORY_SLUGS } from '@/lib/constants';

// Cookieless pageview counter. Always answers 204 - analytics must never
// surface errors to the reader, and a beacon cannot read the response anyway.
export async function POST(request) {
  try {
    const body = await request.json();
    const path = body?.path;
    if (
      typeof path !== 'string' ||
      !path.startsWith('/') ||
      path.length >= 200
    ) {
      return new Response(null, { status: 204 });
    }

    await dbConnect();

    const day = new Date().toISOString().slice(0, 10);
    await PageView.updateOne(
      { path, day },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    // /category/slug paths also bump the article's own view counter.
    const segments = path.split('/').filter(Boolean);
    if (
      segments.length === 2 &&
      CATEGORY_SLUGS.includes(segments[0]) &&
      segments[1]
    ) {
      await Article.updateOne(
        { slug: segments[1], status: 'published' },
        { $inc: { viewCount: 1 } }
      );
    }
  } catch {
    // Swallow everything - see above.
  }
  return new Response(null, { status: 204 });
}
