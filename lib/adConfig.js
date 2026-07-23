// Single source of truth for ad placement rules (PLAN.md section 5).
export const AD_RULES = {
  inFeed: { first: 4, every: 7 },
  inArticle: { firstAfter: 3, every: 5, max: 3 },
};

// Block indices (0-based, "insert after this block") for in-article slots.
// Never lets an ad be the final element of an article.
export function articleSlotPositions(blockCount) {
  const { firstAfter, every, max } = AD_RULES.inArticle;
  const positions = [];
  for (let p = firstAfter; p < blockCount && positions.length < max; p += every) {
    positions.push(p);
  }
  return positions;
}
