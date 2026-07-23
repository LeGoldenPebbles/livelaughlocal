export const SITE = {
  name: 'Live Laugh Local',
  tagline: "What's on near you",
  description:
    'Local markets, craft fairs, food events and days out across the UK - written up properly, updated all the time.',
  url: process.env.SITE_URL || 'http://localhost:3005',
};

export const CATEGORIES = [
  {
    slug: 'markets-and-fairs',
    name: 'Markets & Fairs',
    blurb: 'Craft fairs, makers markets and artisan pop-ups worth your Saturday.',
  },
  {
    slug: 'food-and-drink',
    name: 'Food & Drink',
    blurb: 'Street food nights, food festivals and farmers markets.',
  },
  {
    slug: 'days-out',
    name: 'Days Out',
    blurb: 'Family events, seasonal fun and proper things to do.',
  },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export const FEATURED_PRICE_GBP = 100;
export const FEATURED_MONTHS = 12;
