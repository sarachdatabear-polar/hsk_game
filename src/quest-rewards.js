"use strict";

const FRESH_POLICY = Object.freeze({ awardsCoins: true, luckyFlow: "change" });
const REVIEW_POLICY = Object.freeze({ awardsCoins: false, luckyFlow: "hold" });

export function questRewardPolicy(origin) {
  return origin === "review" ? REVIEW_POLICY : FRESH_POLICY;
}
