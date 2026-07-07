"use strict";
// Sticker album (PRD v5 B2). Pure: sticker catalog, mastery facts, award
// evaluation, toast queue. main.js owns persistence (nbhsk.stickers) and
// rendering. Stickers are EARN-ONLY — never purchasable (PRD guardrail).
// Sticker art arrives via the A2 pipeline later; the album renders icon
// placeholders until then. scopeNodes is shared with the B3 journey map.
import { isMastered } from "./mastery.js";

export const TOP_NS = [100, 300, 500];
export const MILESTONE_PCTS = [25, 50, 75, 100];
export const EVENT_STICKERS = ["welcome", "first-boss", "streak-7", "streak-30"];

export function defaultStickers() {
  return { earned: {}, queue: [] };   // earned: sticker id -> "YYYY-MM-DD"
}

// One node per selectable sub-scope of a level: Top-100/300/500 (only when
// the level actually has more than N words) plus the full level.
export function scopeNodes(levelCounts) {
  const nodes = [];
  const lvs = Object.keys(levelCounts).map(Number).sort((a, b) => a - b);
  for (const lv of lvs) {
    for (const n of TOP_NS) {
      if (levelCounts[lv] > n) nodes.push({ id: `HSK${lv}·top${n}`, lv, topN: n });
    }
    nodes.push({ id: `HSK${lv}·all`, lv, topN: 0 });
  }
  return nodes;
}

// The full sticker catalog, in album display order. The full-level node has
// no separate scope sticker — completing it IS the 100% milestone.
export function stickerDefs(levelCounts) {
  const defs = [];
  for (const node of scopeNodes(levelCounts)) {
    if (node.topN > 0) defs.push({ id: `scope:${node.id}`, kind: "scope", lv: node.lv, topN: node.topN });
  }
  const lvs = Object.keys(levelCounts).map(Number).sort((a, b) => a - b);
  for (const lv of lvs) {
    for (const pct of MILESTONE_PCTS) defs.push({ id: `ms:HSK${lv}:${pct}`, kind: "milestone", lv, pct });
  }
  for (const ev of EVENT_STICKERS) defs.push({ id: `ev:${ev}`, kind: "event", event: ev });
  return defs;
}

// Mastery facts for award evaluation and album progress display.
// levelsData: {"1":[{h,f,...}], ...}; mastery: the nbhsk.mastery store.
// Percentages are FLOORED so 100% means literally every word mastered.
export function scopeFacts(levelsData, mastery) {
  const levelCounts = {}, scopePcts = {}, levelPcts = {};
  for (const lv of Object.keys(levelsData)) {
    const words = [...levelsData[lv]].sort((a, b) => b.f - a.f);
    levelCounts[lv] = words.length;
    const marks = words.map(w => (isMastered(mastery, w.h) ? 1 : 0));
    const total = marks.reduce((s, m) => s + m, 0);
    levelPcts[lv] = words.length ? Math.floor(100 * total / words.length) : 0;
    for (const n of TOP_NS) {
      if (words.length > n) {
        let top = 0;
        for (let i = 0; i < n; i++) top += marks[i];
        scopePcts[`HSK${lv}·top${n}`] = Math.floor(100 * top / n);
      }
    }
    scopePcts[`HSK${lv}·all`] = levelPcts[lv];
  }
  return { levelCounts, scopePcts, levelPcts };
}

// Evaluate every unearned sticker against fresh facts. Returns a NEW state;
// newly earned ids are stamped with dateStr and appended to the toast queue.
// facts: {scopePcts, levelPcts, sessionDone, bossDefeated, streak}.
export function evaluateAwards(state, defs, facts, dateStr) {
  const earned = { ...state.earned };
  const queue = [...state.queue];
  const award = id => { earned[id] = dateStr; queue.push(id); };
  for (const d of defs) {
    if (earned[d.id]) continue;
    if (d.kind === "scope") {
      if ((facts.scopePcts[`HSK${d.lv}·top${d.topN}`] ?? 0) >= 100) award(d.id);
    } else if (d.kind === "milestone") {
      if ((facts.levelPcts[String(d.lv)] ?? 0) >= d.pct) award(d.id);
    } else if (d.kind === "event") {
      if (d.event === "welcome" && facts.sessionDone) award(d.id);
      else if (d.event === "first-boss" && facts.bossDefeated) award(d.id);
      else if (d.event === "streak-7" && facts.streak >= 7) award(d.id);
      else if (d.event === "streak-30" && facts.streak >= 30) award(d.id);
    }
  }
  return { earned, queue };
}

// One toast per results screen (PRD B2); the rest stay queued.
export function popToast(state) {
  if (!state.queue.length) return { state, id: null };
  return { state: { earned: state.earned, queue: state.queue.slice(1) }, id: state.queue[0] };
}
