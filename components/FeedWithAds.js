import ArticleCard from './ArticleCard';
import SponsoredFeedCard from './ads/SponsoredFeedCard';
import { AD_RULES } from '@/lib/adConfig';

// The feed grid. Paid featured articles (the £100 product) still occupy
// labelled sponsored cards at the configured positions; house creatives are
// retired from render and display advertising is delegated to AdSense Auto
// ads (owner decision, 23 Jul 2026).
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
      if (feat) {
        items.push(
          <div key={`slot-${slotCount}`} className="h-full">
            <SponsoredFeedCard article={feat} />
          </div>
        );
        featIdx += 1;
      }
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
