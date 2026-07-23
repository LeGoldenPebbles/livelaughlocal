import { splitBlocks } from '@/lib/sanitize';

// Renders sanitized article HTML block by block. In-article ad placement is
// currently delegated entirely to AdSense Auto ads (owner decision, 23 Jul
// 2026) - the reserved-slot injection this component used to do lives in git
// history and components/ads/ if manual units ever come back.
export default function ArticleBody({ bodyHtml }) {
  const blocks = splitBlocks(bodyHtml);
  return (
    <div className="article-body">
      {blocks.map((block, i) => (
        <div key={`block-${i}`} dangerouslySetInnerHTML={{ __html: block }} />
      ))}
    </div>
  );
}
