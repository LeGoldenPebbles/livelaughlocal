import { SITE } from '@/lib/constants';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';

/**
 * RSS 2.0 feed.
 *
 * RSS is no longer a Google ranking or Google News channel (Google News stopped
 * using publisher-submitted feeds in March 2025), but it is still the plumbing
 * behind feed readers, Flipboard, email digests and every RSS-to-social
 * auto-poster. Those tools are the reason this feed carries per-item images.
 *
 * CONTENT POLICY: this is a PARTIAL feed. content:encoded carries the hero
 * image, the standfirst and the opening of the article, then links through.
 * Full-text feeds are what aggregators like Flipboard and MSN require, but they
 * also let readers consume the whole piece without ever visiting the site,
 * which costs us the pageview and the ad impression. Switch FULL_TEXT to true
 * if syndication ever matters more than traffic.
 *
 * Namespace notes that bite people:
 *  - the Media RSS namespace URI ends in a SLASH; without it, silent failure
 *  - RSS dates are RFC 822 (toUTCString), NOT ISO 8601
 *  - RSS's own <author> element expects an email address, so named bylines go
 *    in dc:creator instead
 */
export const revalidate = 900;

const FULL_TEXT = false;
const ITEM_LIMIT = 25;
const INTRO_PARAGRAPHS = 3;

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// CDATA cannot contain the terminator; split it if an article ever does.
function cdata(value) {
  return `<![CDATA[${String(value == null ? '' : value).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function intro(bodyHtml) {
  const paras = String(bodyHtml || '').match(/<p>[\s\S]*?<\/p>/g) || [];
  return paras.slice(0, INTRO_PARAGRAPHS).join('\n');
}

export async function GET() {
  let articles = [];
  try {
    await dbConnect();
    articles = await Article.find(
      { status: 'published' },
      {
        slug: 1,
        category: 1,
        title: 1,
        dek: 1,
        publishedAt: 1,
        heroImage: 1,
        tags: 1,
        byline: 1,
        bodyHtml: 1,
      }
    )
      .sort({ publishedAt: -1 })
      .limit(ITEM_LIMIT)
      .lean();
  } catch (err) {
    console.error('[rss]', err);
  }

  const feedUrl = `${SITE.url}/rss.xml`;
  const latest = articles[0]?.publishedAt ? new Date(articles[0].publishedAt) : new Date();

  const items = articles
    .map((a) => {
      const link = `${SITE.url}/${a.category}/${a.slug}`;
      const hero = a.heroImage?.url?.startsWith('http')
        ? a.heroImage.url
        : a.heroImage?.url
          ? `${SITE.url}${a.heroImage.url}`
          : null;

      // The hero repeated as a real img inside the content, because plenty of
      // readers ignore media:content entirely and render only the body.
      const body = FULL_TEXT ? a.bodyHtml : intro(a.bodyHtml);
      const content = [
        hero
          ? `<p><img class="webfeedsFeaturedVisual" src="${escapeXml(hero)}" alt="${escapeXml(a.heroImage?.alt || '')}" /></p>`
          : '',
        a.dek ? `<p><em>${escapeXml(a.dek)}</em></p>` : '',
        body,
        FULL_TEXT
          ? ''
          : `<p><a href="${escapeXml(link)}">Continue reading on ${escapeXml(SITE.name)}</a></p>`,
      ]
        .filter(Boolean)
        .join('\n');

      return [
        '    <item>',
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        // Stable dedup key. If this changes, auto-posters repost the article.
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        a.publishedAt ? `      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>` : null,
        `      <dc:creator>${escapeXml(a.byline?.name || 'Live Laugh Local team')}</dc:creator>`,
        `      <description>${escapeXml(a.dek || '')}</description>`,
        `      <content:encoded>${cdata(content)}</content:encoded>`,
        hero ? `      <media:content url="${escapeXml(hero)}" medium="image" />` : null,
        hero ? `      <media:thumbnail url="${escapeXml(hero)}" />` : null,
        ...(a.tags || []).slice(0, 6).map((t) => `      <category>${escapeXml(t)}</category>`),
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(SITE.url)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en-gb</language>
    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>
    <generator>Live Laugh Local</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
