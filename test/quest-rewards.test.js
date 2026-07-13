import { describe, expect, it } from "vitest";
import { questRewardPolicy } from "../src/quest-rewards.js";

describe("questRewardPolicy", () => {
  it("pays and advances Lucky Flow only for a fresh encounter", () => {
    expect(questRewardPolicy("fresh")).toEqual({ awardsCoins: true, luckyFlow: "change" });
    expect(questRewardPolicy("review")).toEqual({ awardsCoins: false, luckyFlow: "hold" });
  });
});
