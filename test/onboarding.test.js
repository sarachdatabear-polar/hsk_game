import { describe, expect, it } from "vitest";
import {
  defaultOnboarding,
  normalizeOnboarding,
  onboardingActive,
  chooseAccountPath,
  noteCodeSent,
  noteAccountVerified,
  startOnboardingQuest,
  noteQuestTip,
  finishOnboardingQuest,
  shouldOfferProgressSave,
  continueFree,
  beginAppTour,
  setAppTourStep,
  completeOnboarding,
  contextualTipAvailable,
  consumeContextualTip,
} from "../src/onboarding.js";

describe("onboarding state", () => {
  it("starts a genuinely fresh player at Welcome", () => {
    expect(normalizeOnboarding(null, { introDone: false, mastery: {} }))
      .toEqual(defaultOnboarding());
  });

  it("never shows retroactively to completed or existing players", () => {
    expect(normalizeOnboarding(null, { introDone: true, mastery: {} }).stage).toBe("complete");
    expect(normalizeOnboarding(null, { mastery: { "你": { r: 1 } } }).stage).toBe("complete");
  });

  it("preserves an active new onboarding record after the first mastery write", () => {
    expect(normalizeOnboarding(
      { ...defaultOnboarding(), accountChoice: "try-first", stage: "quest", questTip: 3 },
      { mastery: { "你": { r: 1 } } },
    )).toMatchObject({ stage: "quest", accountChoice: "try-first", questTip: 3 });
  });

  it("normalizes corrupt and out-of-range fields", () => {
    expect(normalizeOnboarding({
      stage: "wat", accountChoice: "wat", questTip: 99, appTourStep: -3,
      contextualTips: [],
    })).toMatchObject({ stage: "welcome", accountChoice: "unseen", questTip: 5, appTourStep: 0, contextualTips: {} });
  });

  it("supports account, try-first, and offline branches", () => {
    expect(chooseAccountPath(defaultOnboarding(), "account").stage).toBe("account");
    expect(chooseAccountPath(defaultOnboarding(), "try-first")).toMatchObject({ stage: "level", accountChoice: "try-first" });
    expect(chooseAccountPath(defaultOnboarding(), "offline")).toMatchObject({ stage: "level", accountChoice: "offline" });
    expect(noteAccountVerified({ stage: "verify" })).toMatchObject({ stage: "level", accountChoice: "signed-in" });
    expect(noteAccountVerified({ stage: "verify", accountChoice: "try-first" }))
      .toMatchObject({ stage: "app-tour", accountChoice: "signed-in" });
  });

  it("only advances the account form after a code was sent", () => {
    expect(noteCodeSent({ ...defaultOnboarding(), stage: "account" }).stage).toBe("verify");
    expect(noteCodeSent({ ...defaultOnboarding(), stage: "level" }).stage).toBe("level");
  });

  it("runs the real quest path and records monotonic tips", () => {
    let state = startOnboardingQuest({ ...defaultOnboarding(), accountChoice: "try-first", stage: "level" });
    expect(state.stage).toBe("quest");
    state = noteQuestTip(state, 2);
    state = noteQuestTip(state, 1);
    expect(state.questTip).toBe(2);
    state = finishOnboardingQuest(state);
    expect(state.stage).toBe("results");
    expect(shouldOfferProgressSave(state)).toBe(true);
  });

  it("does not offer save to a signed-in player", () => {
    expect(shouldOfferProgressSave({ ...defaultOnboarding(), accountChoice: "signed-in", stage: "results" })).toBe(false);
  });

  it("continues free without disabling onboarding completion", () => {
    const state = continueFree({ ...defaultOnboarding(), accountChoice: "try-first", stage: "results" });
    expect(state).toMatchObject({ accountChoice: "continue-free", stage: "app-tour" });
    expect(completeOnboarding(state).stage).toBe("complete");
  });

  it("runs and bounds the app tour", () => {
    let state = beginAppTour({ ...defaultOnboarding(), stage: "results" });
    state = setAppTourStep(state, 2);
    expect(state.appTourStep).toBe(2);
    expect(setAppTourStep(state, 99).appTourStep).toBe(3);
    expect(onboardingActive(completeOnboarding(state))).toBe(false);
  });

  it("consumes contextual tips once after onboarding", () => {
    let state = completeOnboarding(defaultOnboarding());
    expect(contextualTipAvailable(state, "shop", true)).toBe(true);
    state = consumeContextualTip(state, "shop");
    expect(contextualTipAvailable(state, "shop", true)).toBe(false);
    expect(contextualTipAvailable(state, "smartReview", false)).toBe(false);
  });
});
