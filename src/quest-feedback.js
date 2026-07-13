const FEEDBACK = Object.freeze({
  choose: Object.freeze({ key: "battle.promptChoose", tone: "prompt" }),
  learned: Object.freeze({ key: "battle.feedbackLearned", tone: "correct" }),
  review: Object.freeze({ key: "battle.feedbackReview", tone: "review" }),
});

export function questFeedbackFor(state){
  return FEEDBACK[state] || FEEDBACK.choose;
}
