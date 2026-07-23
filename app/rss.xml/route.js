import { NextResponse } from 'next/server';
import { SITE } from '@/lib/constants';
import { getFeed } from '@/lib/articles';

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const articles = await getFeed({ limit: 20 });

    const items = articles
      .map((article) => {
        const link = `${SITE.url}/${article.category}/${article.slug}`;
        const pubDate = article.publishedAt
          ? new Date(article.publishedAt).toUTCString()
          : '';
        return [
          '    <item>',
          `      <title>${escapeXml(article.title)}</title>`,
          `      <link>${escapeXml(link)}</link>`,
          `      <description>${escapeXml(article.dek || '')}</description>`,
          pubDate ? `      <pubDate>${escapeXml(pubDate)}</pubDate>` : null,
          `      <guid>${escapeXml(link)}</guid>`,
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(SITE.url)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>
`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 's-maxage=1800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
