import dbConnect from './db';
import HouseAd from '@/models/HouseAd';

// Built-in creatives so every slot renders even with an empty database.
// UTM-tagged so the funnel to Spaces Please is measurable end to end.
export const DEFAULT_HOUSE_ADS = [
  {
    key: 'exhibitors',
    slot: 'any',
    headline: 'Find your next stall',
    body: 'Hundreds of UK markets, fairs and food events are taking stall applications right now on Spaces Please.',
    cta: 'Browse open events',
    targetUrl:
      'https://spacesplease.com/for-exhibitors?utm_source=livelaughlocal&utm_medium=house_ad&utm_campaign=exhibitors',
    weight: 3,
    active: true,
  },
  {
    key: 'organisers',
    slot: 'any',
    headline: 'Running an event? List it free',
    body: 'Take stall applications and payments without the spreadsheet chaos.',
    cta: 'List your event',
    targetUrl:
      'https://spacesplease.com/for-organisers?utm_source=livelaughlocal&utm_medium=house_ad&utm_campaign=organisers',
    weight: 2,
    active: true,
  },
  {
    key: 'whats-on',
    slot: 'in-feed',
    headline: "See everything that's on near you",
    body: 'Our what’s-on guides are built from live event listings, updated all the time.',
    cta: "Browse what's on",
    targetUrl: '/whats-on',
    weight: 1,
    active: true,
  },
];

// Deterministic weighted rotation by slot index - no Math.random, so ISR
// caching and hydration stay stable.
export async function pickHouseAd(placement, index = 0) {
  let ads = [];
  try {
    await dbConnect();
    ads = await HouseAd.find({ active: true }).lean();
  } catch {
    // fall through to defaults
  }
  if (!ads.length) ads = DEFAULT_HOUSE_ADS;
  const eligible = ads.filter((a) => !a.slot || a.slot === 'any' || a.slot === placement);
  const pool = eligible.flatMap((a) => Array(Math.max(1, a.weight || 1)).fill(a));
  if (!pool.length) return null;
  const ad = pool[index % pool.length];
  return {
    key: ad.key,
    headline: ad.headline,
    body: ad.body || '',
    cta: ad.cta || 'Find out more',
    targetUrl: ad.targetUrl,
    imageUrl: ad.imageUrl || null,
  };
}
