import { SITE } from '@/lib/constants';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';

/**
 * Google News sitemap.
 *
 * Deliberately separate from the main sitemap, because the news extension has a
 * rule the normal sitemap does not: only articles published in the LAST TWO
 * DAYS may carry a <news:news> block. Google's wording is "Once the articles
 * are older than two days, either remove those URLs from the news sitemap or
 * remove the <news:news> metadata". This route simply queries the window, so
 * ageing out happens on its own with nothing to remember.
 *
 * Most of the time this file will be empty or near-empty, which is expected and
 * explicitly fine: "You may see an Empty Sitemap warning in Search Console, but
 * this is just to make sure it was intentional on your behalf. It won't cause
 * any problems with Google Search if the file is empty."
 *
 * The cap is 1,000 <news:news> entries per file. We publish a handful a week,
 * so a single file will do for years, but the limit is enforced below rather
 * than assumed.
 *
 * <news:name> must match the publication name as it appears on our articles.
 */
export const revalidate = 900;

const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let articles = [];
  try {
    await dbConnect();
    articles = await Article.find(
      {
        status: 'published',
        // Genuine news only. Most of what this site publishes is a what's-on
        // listing: time-bound, but nothing was announced in it, so it is not
        // news and does not belong in a news sitemap. Filing listings here
        // would be claiming news volume we do not have, which is the shape
        // scaled-content enforcement looks for.
        //
        // Consequence, and it is intended: this file is empty most weeks.
        // Google says explicitly that an empty news sitemap is fine.
        articleType: 'news',
        publishedAt: { $gte: new Date(Date.now() - NEWS_WINDOW_MS) },
      },
      { slug: 1, category: 1, title: 1, publishedAt: 1 }
    )
      .sort({ publishedAt: -1 })
      .limit(MAX_ENTRIES)
      .lean();
  } catch (err) {
    // An empty but valid news sitemap beats a 500. Google treats an empty file
    // as intentional; a broken one is a reported error.
    console.error('[news-sitemap]', err);
  }

  const urls = articles
    .map((a) =>
      [
        '  <url>',
        `    <loc>${escapeXml(`${SITE.url}/${a.category}/${a.slug}`)}</loc>`,
        '    <news:news>',
        '      <news:publication>',
        `        <news:name>${escapeXml(SITE.name)}</news:name>`,
        '        <news:language>en</news:language>',
        '      </news:publication>',
        // W3C format. Original publication time, not last edit.
        `      <news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date>`,
        // No author, publication name or date inside the title.
        `      <news:title>${escapeXml(a.title)}</news:title>`,
        '    </news:news>',
        '  </url>',
      ].join('\n')
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
