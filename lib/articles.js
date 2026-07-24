import dbConnect from './db';
import Article from '@/models/Article';
import { CATEGORIES } from './constants';

// Every public read guards against a missing/unreachable DB so builds and
// cold environments render empty states instead of crashing.

const serialize = (v) => JSON.parse(JSON.stringify(v));

export async function getFeed({ limit = 24, category } = {}) {
  try {
    await dbConnect();
    const q = { status: 'published' };
    if (category) q.category = category;
    const docs = await Article.find(q)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-bodyHtml -submitterEmail -stripe')
      .lean();
    return serialize(docs);
  } catch {
    return [];
  }
}

export async function getFeaturedArticles({ category } = {}) {
  try {
    await dbConnect();
    const q = {
      status: 'published',
      'featured.active': true,
      'featured.until': { $gt: new Date() },
    };
    if (category) q['featured.category'] = category;
    const docs = await Article.find(q)
      .sort({ publishedAt: -1 })
      .limit(6)
      .select('-bodyHtml -submitterEmail -stripe')
      .lean();
    return serialize(docs);
  } catch {
    return [];
  }
}

export async function getArticle(slug) {
  try {
    await dbConnect();
    const doc = await Article.findOne({ slug, status: 'published' })
      .select('-submitterEmail -stripe')
      .lean();
    return doc ? serialize(doc) : null;
  } catch {
    return null;
  }
}

export async function getRelated(article, limit = 3) {
  try {
    await dbConnect();
    const docs = await Article.find({
      status: 'published',
      category: article.category,
      slug: { $ne: article.slug },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-bodyHtml -submitterEmail -stripe')
      .lean();
    return serialize(docs);
  } catch {
    return [];
  }
}

export async function getMostRead({ limit = 5, category } = {}) {
  try {
    await dbConnect();
    const q = { status: 'published' };
    if (category) q.category = category;
    const docs = await Article.find(q)
      .sort({ viewCount: -1, publishedAt: -1 })
      .limit(limit)
      .select('title slug category viewCount publishedAt')
      .lean();
    return serialize(docs);
  } catch {
    return [];
  }
}

// Categories that contain at least one published article, in the taxonomy's
// alphabetical order. Everything public (News menu, footer, chips, sitemap)
// renders from this so empty categories never surface as thin pages.
export async function getActiveCategories() {
  try {
    await dbConnect();
    const slugs = await Article.distinct('category', { status: 'published' });
    const active = new Set(slugs);
    return CATEGORIES.filter((c) => active.has(c.slug));
  } catch {
    return [];
  }
}

export async function getAllPublishedSlugs() {
  try {
    await dbConnect();
    const docs = await Article.find({ status: 'published' })
      .select('slug category publishedAt updatedAt')
      .lean();
    return serialize(docs);
  } catch {
    return [];
  }
}
