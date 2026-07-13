"use strict";

/* Battle-canvas UI scale. The canvas now fills whatever space the flex layout
   gives it (no forced aspect-ratio), so every drawing constant that used to be
   a fixed px value is derived from the measured canvas size instead. Reference
   size ~380x480 (today's typical canvas) keeps current phones looking
   unchanged; clamped so tiny/huge canvases don't shrink/blow up the HUD text
   past readable limits. */
export function uiScale(w, h) {
  const s = Math.min(h / 480, w / 380);
  return Math.max(0.7, Math.min(1.8, s));
}

/* Three scales, one per concern:
   - S       scene geometry (ground, positions, HUD text, floaters) — unchanged.
   - textS   word plaque (hanzi/pinyin/translation). Width-driven so a short
             canvas no longer shrinks the hanzi: at a 360-wide viewport the
             old min(h/480, w/380) bottomed out at the 0.7 floor -> 42px hanzi,
             failing the PRD "hanzi >= 56 CSS px at 390-wide" spirit on the
             most common Android width. h/260 is only a guard so the plaque
             (~2.05*hanziPx tall with both translation rows) can't outgrow a
             very short canvas. Floor is 0.75 (48px hanzi) so even
             height-starved landscape battle canvases stay readable.
   - mascotS S with a 0.85 floor and a 1.2x boost: the cat/raccoon read as
             the protagonists, not garnish, on every phone size. catHalf
             (bite threshold, kitten offset) follows it so gameplay geometry
             matches the visible sprite. */
export function layout(w, h) {
  const S = uiScale(w, h);
  const textS = Math.max(0.75, Math.min(1.8, Math.min(w / 380, h / 260)));
  const mascotS = Math.min(2.1, Math.max(S, 0.85) * 1.2);
  return {
    S,
    textS,
    mascotS,
    ground: 30 * S,
    mascotX: 52 * S,
    catHalf: 34 * mascotS,
    hanziPx: 64 * textS,
    pinyinPx: 18 * textS,
    floaterPx: 20 * S,
    coinPx: 20 * S
  };
}

/* Display-ready geometry for one five-word Lantern Trail segment. Three
   lantern nodes sit across the left half of the scene so the guide still has
   a full, consistent approach lane from the right. A completed fifth word
   holds the landmark pose; the following word starts a fresh local segment. */
export function lanternTrailLayout(w, h, learned = 0, ground = 0, { startNextSegment = false } = {}) {
  const safeLearned = Math.max(0, Math.floor(Number(learned) || 0));
  const step = startNextSegment ? 0 : safeLearned === 0 ? 0 : ((safeLearned - 1) % 5) + 1;
  const startX = w * 0.16;
  const middleX = w * 0.31;
  const endX = w * 0.46;
  const pathY = h - ground + 8;
  const thresholds = [1, 3, 5];
  const xs = [startX, middleX, endX];
  return {
    step,
    pathY,
    catX: startX + (endX - startX) * (step / 5),
    nodes: xs.map((x, index) => ({
      x,
      y: pathY,
      lit: step >= thresholds[index],
      landmark: index === xs.length - 1,
    })),
  };
}

const TRAIL_BACKDROPS = Object.freeze([
  "bg-quest",
  "bg-temple",
  "bg-bamboo",
  "bg-lantern-festival",
  "bg-dragon-gate",
]);

export function lanternTrailBackdrop(chapter = 0, equippedBackdrop = "") {
  if (equippedBackdrop) return `bg-${equippedBackdrop}`;
  const safeChapter = Math.max(0, Math.floor(Number(chapter) || 0));
  return TRAIL_BACKDROPS[safeChapter % TRAIL_BACKDROPS.length];
}

/* Scale the guide's walking speed by its remaining approach distance. This
   keeps time-to-arrival stable while the cat visibly advances. */
export function lanternApproachScale(spawnX, targetX, baselineTargetX) {
  const baseline = Math.max(1, spawnX - baselineTargetX);
  const remaining = Math.max(1, spawnX - targetX);
  return remaining / baseline;
}
