"use strict";

import { wordWeight } from "./srs.js";
import { isReviewChallenge } from "./boss.js";

const DEFAULT_RETRY_GAP = 2;
const DEFAULT_MILESTONE = 5;
const DEFAULT_CHAPTER = 20;

function shuffled(items, rng) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizedPositive(value, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * In-memory Word Quest scheduler. The interface deliberately exposes only the
 * next encounter, its resolution, and display-ready facts; retry ordering and
 * completion invariants stay local to this module.
 */
export function createQuestSession({
  mode = "round",
  target = 20,
  deck,
  source = "weighted",
  masteryStore = {},
  retryGap = DEFAULT_RETRY_GAP,
  milestoneEvery = DEFAULT_MILESTONE,
  chapterEvery = DEFAULT_CHAPTER,
  rng = Math.random,
  now = Date.now,
} = {}) {
  if (!Array.isArray(deck) || deck.length === 0) {
    throw new Error("createQuestSession requires a non-empty deck");
  }
  if (mode !== "round" && mode !== "endless") {
    throw new Error(`Unsupported quest mode: ${mode}`);
  }
  if (source !== "weighted" && source !== "exhaustive") {
    throw new Error(`Unsupported quest source: ${source}`);
  }

  const endless = mode === "endless";
  const gap = Math.max(0, Math.round(Number(retryGap)) || 0);
  const milestone = normalizedPositive(milestoneEvery, DEFAULT_MILESTONE);
  const chapter = normalizedPositive(chapterEvery, DEFAULT_CHAPTER);
  const exhaustive = source === "exhaustive";
  const freshDeck = exhaustive ? shuffled(deck, rng) : null;
  const finiteTarget = exhaustive ? freshDeck.length : normalizedPositive(target, 20);

  let active = null;
  let planned = 0;
  let learned = 0;
  let attempts = 0;
  let correctAttempts = 0;
  let reviewed = 0;
  let resolvedEncounters = 0;
  let nextSlotId = 1;
  let recent = [];
  const retries = [];
  const missedByHanzi = new Map();

  function isComplete() {
    return !endless
      && planned >= finiteTarget
      && learned >= finiteTarget
      && retries.length === 0
      && active === null;
  }

  function weightedFreshWord() {
    const weight = word => (Math.sqrt(Math.max(0, Number(word.f) || 0)) + 1)
      * wordWeight(masteryStore[word.h], now());

    for (let tries = 0; tries < 40; tries++) {
      let total = 0;
      for (const word of deck) total += weight(word);
      let cursor = rng() * total;
      for (const word of deck) {
        cursor -= weight(word);
        if (cursor <= 0) {
          if (!recent.includes(word.h)) return word;
          break;
        }
      }
    }
    return deck[Math.floor(rng() * deck.length)];
  }

  function rememberFresh(word) {
    recent.push(word.h);
    if (recent.length > 8) recent.shift();
  }

  function takeRetry() {
    let index = retries.findIndex(item => item.dueAt <= resolvedEncounters);
    // Near the end of a finite quest there may be no two other encounters left
    // to fill the requested gap. Serve the earliest retry instead of deadlocking.
    if (index < 0 && !endless && planned >= finiteTarget && retries.length) index = 0;
    if (index < 0) return null;
    const [item] = retries.splice(index, 1);
    return { ...item, origin: "review" };
  }

  function canPlanFresh() {
    return endless || planned < finiteTarget;
  }

  function planFresh() {
    if (!canPlanFresh()) return null;
    const word = exhaustive ? freshDeck[planned] : weightedFreshWord();
    if (!word) return null;
    planned++;
    rememberFresh(word);
    return {
      word,
      slotId: nextSlotId++,
      plannedIndex: planned,
      reviewChallenge: isReviewChallenge(planned),
      origin: "fresh",
    };
  }

  function next() {
    if (active) throw new Error("Cannot request the next encounter before resolving the active one");
    if (isComplete()) return null;
    active = takeRetry() || planFresh() || takeRetry();
    if (!active) return null;
    return { ...active };
  }

  function resolve({ correct = false, timedOut = false } = {}) {
    if (!active) throw new Error("Cannot resolve without an active encounter");
    const encounter = active;
    active = null;
    attempts++;
    resolvedEncounters++;
    if (encounter.origin === "review") reviewed++;

    let retryQueued = false;
    let milestoneReached = false;
    let chapterReached = false;
    if (correct && !timedOut) {
      correctAttempts++;
      learned++;
      milestoneReached = learned % milestone === 0;
      chapterReached = learned % chapter === 0;
    } else {
      retryQueued = true;
      if (!missedByHanzi.has(encounter.word.h)) missedByHanzi.set(encounter.word.h, encounter.word);
      retries.push({
        word: encounter.word,
        slotId: encounter.slotId,
        plannedIndex: encounter.plannedIndex,
        reviewChallenge: encounter.reviewChallenge,
        dueAt: resolvedEncounters + gap,
      });
    }

    return {
      retryQueued,
      learnedAdvanced: correct && !timedOut,
      milestoneReached,
      chapterReached,
      complete: isComplete(),
    };
  }

  function view() {
    const targetValue = endless ? Infinity : finiteTarget;
    const nextMilestone = endless
      ? (Math.floor(learned / milestone) + 1) * milestone
      : Math.min(finiteTarget, (Math.floor(learned / milestone) + 1) * milestone);
    return {
      mode,
      endless,
      planned,
      learned,
      target: targetValue,
      attempts,
      correctAttempts,
      reviewed,
      reviewPouch: retries.length,
      localStep: learned % milestone,
      nextMilestone,
      chapter: Math.floor(learned / chapter),
      missedWords: [...missedByHanzi.values()],
      complete: isComplete(),
    };
  }

  return Object.freeze({ next, resolve, view });
}
