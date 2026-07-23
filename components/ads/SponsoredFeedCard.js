import ArticleCard from '../ArticleCard';

// A paid featured article occupying an in-feed ad slot. Always labelled -
// undisclosed paid placement violates AdSense policy and the UK CAP code.
export default function SponsoredFeedCard({ article }) {
  return (
    <div className="relative h-full">
      <span className="absolute -top-2.5 left-3 z-10 rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        Sponsored
      </span>
      <ArticleCard article={article} />
    </div>
  );
}
