const FEEDBACK = Object.freeze({
  choose: Object.freeze({ key: "battle.promptChoose", tone: "prompt" }),
  challenge: Object.freeze({ key: "battle.reviewChallengeIntro", tone: "challenge" }),
  learned: Object.freeze({ key: "battle.feedbackLearned", tone: "correct" }),
  review: Object.freeze({ key: "battle.feedbackReview", tone: "review" }),
});

export function questFeedbackFor(state){
  return FEEDBACK[state] || FEEDBACK.choose;
}
