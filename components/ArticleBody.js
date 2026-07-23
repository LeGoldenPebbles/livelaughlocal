import AdSlot from '@/components/ads/AdSlot';
import { splitBlocks } from '@/lib/sanitize';
import { articleSlotPositions } from '@/lib/adConfig';

// Renders sanitized article HTML block by block, inserting fixed-height
// in-article ad slots at the positions lib/adConfig.js dictates (after block 3,
// then every 5, max 3). Server component - no client JS, no layout shift.
export default function ArticleBody({ bodyHtml }) {
  const blocks = splitBlocks(bodyHtml);
  const positions = new Set(articleSlotPositions(blocks.length));

  let slotIdx = 0;
  const children = [];
  blocks.forEach((block, i) => {
    children.push(
      <div key={`block-${i}`} dangerouslySetInnerHTML={{ __html: block }} />
    );
    if (positions.has(i)) {
      children.push(
        <AdSlot key={`ad-${slotIdx}`} placement="in-article" index={slotIdx} />
      );
      slotIdx += 1;
    }
  });

  return <div className="article-body">{children}</div>;
}
