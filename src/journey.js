"use strict";
// Journey map (PRD v5 B3). Pure: node list, star computation, current
// position. main.js renders the map; stickers.js owns the shared sub-scope
// node catalog and the floored mastery percentages, so the journey map and
// the sticker album can never disagree about progress.
import { scopeNodes } from "./stickers.js";

// ★ ≥50%, ★★ ≥80%, ★★★ 100% (100% also earns the B2 scope/milestone sticker)
export const STAR_THRESHOLDS = [50, 80, 100];

export function starsFor(pct) {
  let stars = 0;
  for (const th of STAR_THRESHOLDS) if (pct >= th) stars++;
  return stars;
}

// The path: scopeNodes order (Top-100 → Top-300 → Top-500 → full level, per
// level ascending), each node annotated with its coverage pct and stars.
export function journeyNodes(levelCounts, scopePcts) {
  return scopeNodes(levelCounts).map(n => {
    const pct = scopePcts[n.id] ?? 0;
    return { ...n, pct, stars: starsFor(pct) };
  });
}

// "You are here": the first node still below two stars. The map only
// SUGGESTS this order — every node stays playable (no hard gating).
export function currentNodeId(nodes) {
  const cur = nodes.find(n => n.stars < 2);
  return cur ? cur.id : null;
}
