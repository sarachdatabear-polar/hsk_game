import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { setLocale, t } from "../src/i18n.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const resultsScreen = html.match(/<div class="screen festive" id="s-results">([\s\S]*?)<!-- TONE TRAINER/)?.[1] ?? "";

describe("Lantern Trail results screen contract", () => {
  it("presents journey progress, rewards, extra practice, and a return hook", () => {
    expect(resultsScreen).toContain('class="results-postcard"');
    expect(resultsScreen).toContain('id="r-learned"');
    expect(resultsScreen).toContain('id="r-attempts"');
    expect(resultsScreen).toContain('id="r-accuracy"');
    expect(resultsScreen).toContain('id="r-lanterns"');
    expect(resultsScreen).toContain('id="r-chapter"');
    expect(resultsScreen).toContain('class="results-reward"');
    expect(resultsScreen).toContain('id="r-next-review"');
    expect(resultsScreen).toContain('id="r-miss"');
  });

  it.each(["en", "th"])("localizes every new results fact and return hook in %s", locale => {
    setLocale(locale);
    for (const key of [
      "results.routeLabel", "results.chapter", "results.learnedTarget",
      "results.attempts", "results.accuracy", "results.lanterns",
      "results.rewardTitle", "results.nextReviewPractice", "results.nextReviewTomorrow",
      "results.lanternAlt",
    ]) {
      expect(t(key)).not.toBe(key);
    }
  });
});
