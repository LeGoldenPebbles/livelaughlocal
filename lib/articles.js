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

/**
 * Related articles, in tiers, and it always fills up if the corpus can fill it.
 *
 * WHY TIERED: this used to be same-category only. 21 of 28 categories hold
 * exactly one article, so 21 articles rendered NO related block at all: no
 * internal links out, and nothing linking in. Half the corpus had zero inbound
 * editorial links as a direct result. Every article getting a full set of
 * related links is the single cheapest fix to that, and it keeps working for
 * every article published from now on without anyone remembering to do it.
 *
 * Tiers, best first, deduped, self always excluded:
 *   1. same category, newest first
 *   2. shares a tag
 *   3. shares a location
 *   4. simply the newest, so the block is never short
 *
 * `tags` and `locations` are captured on every article and were previously used
 * for nothing but display chips.
 */
export async function getRelated(article, limit = 6) {
  try {
    await dbConnect();
    const picked = [];
    const seen = new Set([article.slug]);
    const base = { status: 'published' };
    const select = '-bodyHtml -submitterEmail -stripe';

    const take = async (query) => {
      if (picked.length >= limit) return;
      const docs = await Article.find({
        ...base,
        ...query,
        slug: { $nin: [...seen] },
      })
        .sort({ publishedAt: -1 })
        .limit(limit - picked.length)
        .select(select)
        .lean();
      for (const d of docs) {
        if (picked.length >= limit) break;
        picked.push(d);
        seen.add(d.slug);
      }
    };

    await take({ category: article.category });
    if (article.tags?.length) await take({ tags: { $in: article.tags } });
    if (article.locations?.length) await take({ locations: { $in: article.locations } });
    await take({});

    // Reserved slot: the article's successor in one stable global ring, sorted
    // by slug. Relevance alone still stranded three articles that were the only
    // piece in their category and shared no tag or location with anything, and
    // sat too far down the recency list to be reached. A ring guarantees it
    // cannot happen: every article is the successor of exactly one other, so
    // every article has at least one inbound related link, forever, whatever
    // the corpus looks like. Costs one of six slots.
    const all = await Article.find(base, { slug: 1 }).lean();
    const ring = all.map((d) => d.slug).sort();
    const at = ring.indexOf(article.slug);
    if (at !== -1 && ring.length > 1) {
      const successor = ring[(at + 1) % ring.length];
      if (successor && successor !== article.slug && !seen.has(successor)) {
        const doc = await Article.findOne({ ...base, slug: successor }).select(select).lean();
        if (doc) {
          if (picked.length >= limit) picked.pop();
          picked.push(doc);
        }
      }
    }

    return serialize(picked);
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
