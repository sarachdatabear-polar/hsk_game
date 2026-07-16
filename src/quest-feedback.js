const FEEDBACK = Object.freeze({
  challenge: Object.freeze({ key: "battle.reviewChallengeIntro", tone: "challenge" }),
  learned: Object.freeze({ key: "battle.feedbackLearned", tone: "correct" }),
  review: Object.freeze({ key: "battle.feedbackReview", tone: "review" }),
});

const PROMPTS = Object.freeze({
  meaning: "battle.promptMeaning",
  listen: "battle.promptListen",
  reverse: "battle.promptReverse",
  tone: "battle.promptTone",
  cloze: "battle.promptCloze",
  typed: "battle.promptTyped",
});

export function questFeedbackFor(state, format = "meaning"){
  if(state === "choose" || !FEEDBACK[state]){
    return { key: PROMPTS[format] || PROMPTS.meaning, tone: "prompt" };
  }
  return FEEDBACK[state];
}
