export const SITE = {
  name: 'Live Laugh Local',
  tagline: "What's on near you",
  description:
    'Local markets, craft fairs, food events and days out across the UK - written up properly, updated all the time.',
  url: process.env.SITE_URL || 'http://localhost:3005',
};

// The full taxonomy, alphabetical by name. This is the single source of truth
// for category slugs (the Article schema enum derives from it). The News menu,
// footer, homepage chips and sitemap only ever SHOW categories that contain at
// least one published article (lib/articles.js getActiveCategories), so empty
// shelves never render as thin pages.
export const CATEGORIES = [
  { slug: 'antiques-and-vintage', name: 'Antiques & Vintage', blurb: 'Vintage fairs, collectors markets and salvage finds.' },
  { slug: 'arts-and-culture', name: 'Arts & Culture', blurb: 'Exhibitions, performances and creative events near you.' },
  { slug: 'breaking-news', name: 'Breaking News', blurb: 'What just happened in UK events - as it breaks.' },
  { slug: 'business-of-events', name: 'Business of Events', blurb: 'For organisers and traders: the money and machinery behind events.' },
  { slug: 'charity-and-community', name: 'Charity & Community', blurb: 'Fundraisers, fetes and the events that hold a town together.' },
  { slug: 'christmas-and-winter', name: 'Christmas & Winter', blurb: 'Christmas markets, light trails and winter days out.' },
  { slug: 'comedy-and-theatre', name: 'Comedy & Theatre', blurb: 'Stand-up, stage shows and nights at the theatre.' },
  { slug: 'craft-and-makers', name: 'Craft & Makers', blurb: 'Makers markets, craft fairs and the people behind the stalls.' },
  { slug: 'days-out', name: 'Days Out', blurb: 'Family events, seasonal fun and proper things to do.' },
  { slug: 'dog-friendly', name: 'Dog Friendly', blurb: 'Events and days out where the dog comes too.' },
  { slug: 'event-technology', name: 'Event Technology', blurb: 'Ticketing, tools and the tech changing how events run.' },
  { slug: 'family-and-kids', name: 'Family & Kids', blurb: 'School holiday ideas, family fun days and kids gone free.' },
  { slug: 'festivals', name: 'Festivals', blurb: 'Music, food and arts festivals across the UK.' },
  { slug: 'food-and-drink', name: 'Food & Drink', blurb: 'Street food nights, food festivals and farmers markets.' },
  { slug: 'free-things-to-do', name: 'Free Things To Do', blurb: 'Brilliant days out that cost absolutely nothing.' },
  { slug: 'halloween-and-autumn', name: 'Halloween & Autumn', blurb: 'Pumpkin patches, spooky trails and autumn fairs.' },
  { slug: 'health-and-wellbeing', name: 'Health & Wellbeing', blurb: 'Wellness days, fitness events and time to breathe.' },
  { slug: 'heritage-and-history', name: 'Heritage & History', blurb: 'Historic houses, re-enactments and heritage open days.' },
  { slug: 'markets-and-fairs', name: 'Markets & Fairs', blurb: 'Craft fairs, makers markets and artisan pop-ups worth your Saturday.' },
  { slug: 'money-and-tickets', name: 'Money & Tickets', blurb: 'Ticket prices, presales and getting more day out for less.' },
  { slug: 'music-and-gigs', name: 'Music & Gigs', blurb: 'Live music, from village greens to big stages.' },
  { slug: 'nightlife', name: 'Nightlife', blurb: 'Evening markets, late openings and nights out.' },
  { slug: 'outdoors-and-nature', name: 'Outdoors & Nature', blurb: 'Open-air events, walks and wild days out.' },
  { slug: 'seasonal-and-holidays', name: 'Seasonal & Holidays', blurb: 'Easter, summer holidays, bank holidays and every date worth planning for.' },
  { slug: 'sport-and-active', name: 'Sport & Active', blurb: 'Fun runs, big matches and getting stuck in.' },
  { slug: 'transport-and-travel', name: 'Transport & Travel', blurb: 'Getting to events: strikes, roadworks and travel that affects your plans.' },
  { slug: 'weather-watch', name: 'Weather Watch', blurb: 'The forecasts and warnings that make or break outdoor events.' },
  { slug: 'weddings-and-celebrations', name: 'Weddings & Celebrations', blurb: 'Wedding fairs, showcases and celebration inspiration.' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export const FEATURED_PRICE_GBP = 100;
export const FEATURED_MONTHS = 12;
