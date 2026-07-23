import { pickHouseAd } from '@/lib/houseAds';
import HouseAdUnit from './HouseAdUnit';

// The single ad surface for the whole site. Every placement reserves its
// dimensions BEFORE content arrives - zero layout shift is a launch
// requirement (PLAN.md section 5). Providers today: house creatives (and
// featured paid articles, which FeedWithAds renders directly). AdSense slots
// into these same reserved containers in phase 2, behind CMP consent.
export default async function AdSlot({ placement, index = 0 }) {
  const ad = await pickHouseAd(placement, index);

  if (placement === 'sidebar') {
    return (
      <div className="hidden h-[600px] w-[300px] shrink-0 lg:block">
        {ad && <HouseAdUnit ad={ad} layout="tower" />}
      </div>
    );
  }

  if (placement === 'in-article') {
    return (
      <div className="my-8 h-[250px] md:h-[90px]">
        {ad && <HouseAdUnit ad={ad} layout="banner" />}
      </div>
    );
  }

  // in-feed: fills a grid cell, matching card proportions
  return (
    <div className="h-full">
      {ad && <HouseAdUnit ad={ad} layout="card" />}
    </div>
  );
}
