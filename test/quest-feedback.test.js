import { describe, it, expect } from "vitest";
import { questFeedbackFor } from "../src/quest-feedback.js";
import { setLocale, t } from "../src/i18n.js";

describe("questFeedbackFor", () => {
  it.each([
    ["choose", { key: "battle.promptChoose", tone: "prompt" }],
    ["challenge", { key: "battle.reviewChallengeIntro", tone: "challenge" }],
    ["learned", { key: "battle.feedbackLearned", tone: "correct" }],
    ["review", { key: "battle.feedbackReview", tone: "review" }],
  ])("maps %s to learning-oriented copy", (state, expected) => {
    expect(questFeedbackFor(state)).toEqual(expected);
  });

  it("falls back to the prompt for an unknown state", () => {
    expect(questFeedbackFor("unexpected")).toEqual({ key: "battle.promptChoose", tone: "prompt" });
  });
});

describe("Word Quest visible terminology", () => {
  it.each(["en", "th"])("removes battle-era result and sticker labels in %s", locale => {
    setLocale(locale);
    expect(t("results.roundOver")).not.toMatch(/round|รอบ/i);
    expect(t("results.missed")).not.toMatch(/missed|ผิด/i);
    expect(t("sticker.bossName")).not.toMatch(/boss|บอส/i);
    expect(t("sticker.bossHint")).not.toMatch(/boss|บอส|defeat|เอาชนะ/i);
    expect(t("howto.oneShotDetail")).not.toMatch(/heart|หัวใจ/i);
    expect(t("howto.tooSlow")).not.toMatch(/heart|หัวใจ|round|รอบ/i);
    expect(t("battle.typedGo")).not.toMatch(/attack|โจมตี/i);
    expect(t("battle.critical")).not.toMatch(/critical/i);
    expect(t("quest.perfect1")).not.toMatch(/round|รอบ|miss/i);
    expect(t("quest.review1")).not.toMatch(/round|รอบ/i);
  });
});
