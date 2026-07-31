"use strict";

// Pure first-run state machine. DOM, storage, auth, and battle wiring stay in
// their respective edges; this module only normalizes and advances the local
// onboarding record.

export const ONBOARDING_VERSION = 1;

export const ONBOARDING_STAGES = Object.freeze([
  "welcome", "account", "verify", "level", "quest", "results", "app-tour", "complete",
]);

export const ACCOUNT_CHOICES = Object.freeze([
  "unseen", "signed-in", "try-first", "continue-free", "offline",
]);

export function defaultOnboarding() {
  return {
    version: ONBOARDING_VERSION,
    accountChoice: "unseen",
    stage: "welcome",
    questTip: 0,
    appTourStep: 0,
    contextualTips: {},
  };
}

const isRecord = value => !!value && typeof value === "object" && !Array.isArray(value);

export function normalizeOnboarding(raw, legacy = {}) {
  const mastery = isRecord(legacy.mastery) ? legacy.mastery : {};
  // A real onboarding record always wins. During the first guided quest the
  // player immediately gains mastery entries; treating those as legacy would
  // incorrectly complete onboarding after a reload. Legacy evidence is only
  // consulted when the new record does not exist yet.
  if (!isRecord(raw)) {
    if (legacy.introDone === true || Object.keys(mastery).length > 0) {
      return { ...defaultOnboarding(), accountChoice: "continue-free", stage: "complete" };
    }
    return defaultOnboarding();
  }
  const stage = ONBOARDING_STAGES.includes(raw.stage) ? raw.stage : "welcome";
  const accountChoice = ACCOUNT_CHOICES.includes(raw.accountChoice)
    ? raw.accountChoice
    : "unseen";
  return {
    version: ONBOARDING_VERSION,
    accountChoice,
    stage,
    questTip: Math.max(0, Math.min(5, Math.floor(Number(raw.questTip) || 0))),
    appTourStep: Math.max(0, Math.min(3, Math.floor(Number(raw.appTourStep) || 0))),
    contextualTips: isRecord(raw.contextualTips) ? { ...raw.contextualTips } : {},
  };
}

export const onboardingActive = state => normalizeOnboarding(state).stage !== "complete";

export function chooseAccountPath(state, choice) {
  const current = normalizeOnboarding(state);
  if (choice === "account") return { ...current, accountChoice: "unseen", stage: "account" };
  if (choice === "try-first") return { ...current, accountChoice: "try-first", stage: "level" };
  if (choice === "offline") return { ...current, accountChoice: "offline", stage: "level" };
  return current;
}

export function noteAccountVerified(state) {
  const current = normalizeOnboarding(state);
  const returningFromQuest = ["try-first", "offline"].includes(current.accountChoice);
  return {
    ...current,
    accountChoice: "signed-in",
    stage: returningFromQuest ? "app-tour" : "level",
    appTourStep: returningFromQuest ? 0 : current.appTourStep,
  };
}

export function noteCodeSent(state) {
  const current = normalizeOnboarding(state);
  if (current.stage !== "account") return current;
  return { ...current, stage: "verify" };
}

export function startOnboardingQuest(state) {
  const current = normalizeOnboarding(state);
  if (current.stage !== "level") return current;
  return { ...current, stage: "quest", questTip: 0 };
}

export function noteQuestTip(state, tip) {
  const current = normalizeOnboarding(state);
  if (current.stage !== "quest") return current;
  const next = Math.max(current.questTip, Math.min(5, Math.floor(Number(tip) || 0)));
  return { ...current, questTip: next };
}

export function finishOnboardingQuest(state) {
  const current = normalizeOnboarding(state);
  if (current.stage !== "quest") return current;
  return { ...current, stage: "results" };
}

export function shouldOfferProgressSave(state) {
  const current = normalizeOnboarding(state);
  return current.stage === "results" && ["try-first", "offline"].includes(current.accountChoice);
}

export function continueFree(state) {
  const current = normalizeOnboarding(state);
  return { ...current, accountChoice: "continue-free", stage: "app-tour", appTourStep: 0 };
}

export function beginAppTour(state) {
  const current = normalizeOnboarding(state);
  return { ...current, stage: "app-tour", appTourStep: 0 };
}

export function setAppTourStep(state, step) {
  const current = normalizeOnboarding(state);
  if (current.stage !== "app-tour") return current;
  return { ...current, appTourStep: Math.max(0, Math.min(3, Math.floor(Number(step) || 0))) };
}

export function completeOnboarding(state) {
  return { ...normalizeOnboarding(state), stage: "complete", appTourStep: 3 };
}

export function contextualTipAvailable(state, id, eligible) {
  const current = normalizeOnboarding(state);
  return current.stage === "complete" && !!eligible && current.contextualTips[id] !== true;
}

export function consumeContextualTip(state, id) {
  const current = normalizeOnboarding(state);
  return {
    ...current,
    contextualTips: { ...current.contextualTips, [id]: true },
  };
}
