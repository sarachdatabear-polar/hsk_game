import { describe, it, expect } from "vitest";
import { createQuestSession } from "../src/quest-session.js";

const words = Array.from({ length: 24 }, (_, i) => ({
  h: `w${i + 1}`,
  p: `p${i + 1}`,
  e: `word ${i + 1}`,
  f: 25 - i,
}));

const makeRound = (overrides = {}) => createQuestSession({
  mode: "round",
  target: 20,
  deck: words,
  source: "exhaustive",
  rng: () => 0.999,
  now: () => 1000,
  ...overrides,
});

function answerCorrectly(quest, count) {
  for (let i = 0; i < count; i++) {
    expect(quest.next()).not.toBeNull();
    quest.resolve({ correct: true });
  }
}

describe("continuous Word Quest completion", () => {
  it("completes only after every finite slot is answered correctly", () => {
    const quest = makeRound();
    answerCorrectly(quest, 19);
    expect(quest.view()).toMatchObject({ learned: 19, target: 24, complete: false });
    // Exhaustive sources intentionally use the supplied deck length.
    answerCorrectly(quest, 5);
    expect(quest.view()).toMatchObject({ learned: 24, planned: 24, complete: true });
    expect(quest.next()).toBeNull();
  });

  it("uses the configured target for a weighted normal quest", () => {
    const quest = createQuestSession({
      mode: "round", target: 20, deck: words, source: "weighted", rng: () => 0, now: () => 1000,
    });
    answerCorrectly(quest, 20);
    expect(quest.view()).toMatchObject({ learned: 20, target: 20, complete: true });
  });

  it("never auto-completes Endless mode", () => {
    const quest = createQuestSession({ mode: "endless", deck: words, rng: () => 0, now: () => 1000 });
    answerCorrectly(quest, 50);
    expect(quest.view()).toMatchObject({ learned: 50, target: Infinity, endless: true, complete: false });
    expect(quest.next()).not.toBeNull();
  });
});
describe("Review Pouch scheduling", () => {
  it("does not advance learned progress on a miss", () => {
    const quest = makeRound({ deck: words.slice(0, 4) });
    const first = quest.next();
    const update = quest.resolve({ correct: false });
    expect(update).toMatchObject({ retryQueued: true, learnedAdvanced: false });
    expect(quest.view()).toMatchObject({ learned: 0, attempts: 1, reviewPouch: 1 });
    expect(quest.view().missedWords.map(w => w.h)).toEqual([first.word.h]);
  });

  it("returns a missed word after two intervening encounters", () => {
    const quest = makeRound({ deck: words.slice(0, 5) });
    const missed = quest.next();
    quest.resolve({ correct: false });

    const other1 = quest.next();
    expect(other1.word.h).not.toBe(missed.word.h);
    quest.resolve({ correct: true });

    const other2 = quest.next();
    expect(other2.word.h).not.toBe(missed.word.h);
    quest.resolve({ correct: true });

    const retry = quest.next();
    expect(retry).toMatchObject({ slotId: missed.slotId, origin: "review" });
    expect(retry.word.h).toBe(missed.word.h);
  });

  it("requeues the same slot without duplicating it after repeated misses", () => {
    const quest = makeRound({ deck: words.slice(0, 1), retryGap: 2 });
    const first = quest.next();
    quest.resolve({ correct: false });
    const retry1 = quest.next();
    expect(retry1.slotId).toBe(first.slotId);
    quest.resolve({ correct: false });
    expect(quest.view().reviewPouch).toBe(1);
    const retry2 = quest.next();
    expect(retry2.slotId).toBe(first.slotId);
    quest.resolve({ correct: true });
    expect(quest.view()).toMatchObject({ learned: 1, attempts: 3, reviewed: 2, reviewPouch: 0, complete: true });
  });

  it("treats a timeout exactly like a wrong answer", () => {
    const quest = makeRound({ deck: words.slice(0, 1) });
    quest.next();
    const result = quest.resolve({ correct: true, timedOut: true });
    expect(result).toMatchObject({ retryQueued: true, learnedAdvanced: false });
    expect(quest.view()).toMatchObject({ learned: 0, correctAttempts: 0, reviewPouch: 1 });
  });
});

describe("milestones and Review Challenges", () => {
  it("reports lantern milestones every 5 and chapters every 20 learned words", () => {
    const quest = makeRound({ source: "weighted", target: 20, rng: () => 0 });
    for (let i = 1; i <= 20; i++) {
      quest.next();
      const result = quest.resolve({ correct: true });
      expect(result.milestoneReached).toBe(i % 5 === 0);
      expect(result.chapterReached).toBe(i === 20);
    }
    expect(quest.view()).toMatchObject({ localStep: 0, nextMilestone: 20, chapter: 1 });
  });

  it("marks every 10th planned slot as a Review Challenge and preserves it on retry", () => {
    const quest = makeRound({ source: "weighted", target: 10, rng: () => 0 });
    answerCorrectly(quest, 9);
    const challenge = quest.next();
    expect(challenge.reviewChallenge).toBe(true);
    quest.resolve({ correct: false });
    const retried = quest.next();
    expect(retried).toMatchObject({ reviewChallenge: true, slotId: challenge.slotId, origin: "review" });
  });
});

describe("interface invariants", () => {
  it("rejects an empty deck and unsupported configuration", () => {
    expect(() => createQuestSession({ deck: [] })).toThrow(/non-empty deck/);
    expect(() => createQuestSession({ deck: words, mode: "timed" })).toThrow(/Unsupported quest mode/);
    expect(() => createQuestSession({ deck: words, source: "random" })).toThrow(/Unsupported quest source/);
  });

  it("requires one resolution for every requested encounter", () => {
    const quest = makeRound({ deck: words.slice(0, 2) });
    expect(() => quest.resolve({ correct: true })).toThrow(/without an active/);
    quest.next();
    expect(() => quest.next()).toThrow(/before resolving/);
  });
});
