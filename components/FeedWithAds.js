import ArticleCard from './ArticleCard';
import AdSlot from './ads/AdSlot';
import SponsoredFeedCard from './ads/SponsoredFeedCard';
import { AD_RULES } from '@/lib/adConfig';

// The feed grid with in-feed slots injected at position `first`, then every
// `every` cards (lib/adConfig.js). A slot is filled by a paid featured article
// when one is available, otherwise a house creative. Everything renders
// server-side into grid cells, so there is no client-side ad pop-in and no CLS.
export default function FeedWithAds({ articles, featured = [] }) {
  const items = [];
  let sinceSlot = 0;
  let slotCount = 0;
  let featIdx = 0;

  for (const article of articles) {
    items.push(<ArticleCard key={article.slug} article={article} />);
    sinceSlot += 1;
    const threshold = slotCount === 0 ? AD_RULES.inFeed.first : AD_RULES.inFeed.every;
    if (sinceSlot === threshold) {
      const feat = featured[featIdx];
      items.push(
        <div key={`slot-${slotCount}`} className="h-full">
          {feat ? (
            <SponsoredFeedCard article={feat} />
          ) : (
            <AdSlot placement="in-feed" index={slotCount} />
          )}
        </div>
      );
      if (feat) featIdx += 1;
      slotCount += 1;
      sinceSlot = 0;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
      {items}
    </div>
  );
}
