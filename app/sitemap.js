import { SITE, CATEGORY_SLUGS } from '@/lib/constants';
import { getAllPublishedSlugs } from '@/lib/articles';
import { fetchEventsByRegion } from '@/lib/spEvents';

export default async function sitemap() {
  const base = SITE.url;

  const entries = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...CATEGORY_SLUGS.map((slug) => ({
      url: `${base}/${slug}`,
      changeFrequency: 'daily',
      priority: 0.8,
    })),
    { url: `${base}/whats-on`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/submit`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Programmatic what's-on region pages. Guarded so a dead upstream API
  // still yields the static entries above.
  try {
    const regions = await fetchEventsByRegion();
    for (const region of regions) {
      entries.push({
        url: `${base}/whats-on/${region.slug}`,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  } catch {
    // fall through with static entries only
  }

  // Published articles. Guarded so a dead DB still yields the static entries.
  try {
    const articles = await getAllPublishedSlugs();
    for (const article of articles) {
      const lastModified = article.updatedAt || article.publishedAt;
      entries.push({
        url: `${base}/${article.category}/${article.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
        ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
      });
    }
  } catch {
    // fall through with whatever we have
  }

  return entries;
}
