import { describe, expect, it } from "vitest";
import { questResultsSummary } from "../src/quest-results.js";

describe("questResultsSummary", () => {
  it("turns a completed Word Quest into display-ready journey and review facts", () => {
    const missedWords = [{ h: "你" }, { h: "好" }];
    const summary = questResultsSummary({
      learned: 20,
      target: 20,
      attempts: 23,
      correctAttempts: 20,
      missedWords,
      complete: true,
      endless: false,
    }, { score: 480 });

    expect(summary).toEqual({
      learned: 20,
      target: 20,
      attempts: 23,
      accuracy: 87,
      extraPractice: missedWords,
      lanternsLit: 4,
      chapterLanternsLit: 4,
      routeChapter: 1,
      score: 480,
      nextReview: "practice",
      complete: true,
    });
  });

  it("points a clean custom quest toward tomorrow's return hook", () => {
    expect(questResultsSummary({
      learned: 25,
      target: 25,
      attempts: 25,
      correctAttempts: 25,
      missedWords: [],
      complete: true,
      endless: false,
    }, { score: 725 })).toMatchObject({
      accuracy: 100,
      lanternsLit: 5,
      chapterLanternsLit: 1,
      routeChapter: 2,
      nextReview: "tomorrow",
    });
  });
});
