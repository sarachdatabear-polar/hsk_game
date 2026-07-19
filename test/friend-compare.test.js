import { describe, it, expect } from "vitest";
import {
  encodeFriendCard, decodeFriendCard, friendShareLink, friendCardFromHash, buildFriendCompare,
} from "../src/friend-compare.js";

const CARD = { name: "Jordan", level: 12, streak: 7, mastered: 340, stickers: 9 };

describe("friend-compare codec", () => {
  it("round-trips a card through encode/decode", () => {
    expect(decodeFriendCard(encodeFriendCard(CARD))).toEqual(CARD);
  });

  it("survives Thai / emoji / delimiter chars in the name", () => {
    for (const name of ["น้องแมว", "cat 🐱", "a|b|c", "50% off", "  trim me  "]) {
      const back = decodeFriendCard(encodeFriendCard({ ...CARD, name }));
      expect(back.name).toBe(name.replace(/\s+/gu, " ").trim().slice(0, 24));
    }
  });

  it("clamps negative / non-numeric stats to 0", () => {
    const c = decodeFriendCard(encodeFriendCard({ name: "x", level: -3, streak: "nope", mastered: 1.9, stickers: null }));
    expect(c).toMatchObject({ level: 0, streak: 0, mastered: 1, stickers: 0 });
  });

  it("returns null on malformed payloads", () => {
    expect(decodeFriendCard(null)).toBeNull();
    expect(decodeFriendCard("")).toBeNull();
    expect(decodeFriendCard("NOPE|x|1|1|1|1")).toBeNull();
    expect(decodeFriendCard("LCH1|x|1|1|1")).toBeNull();       // too few fields
    expect(decodeFriendCard("LCH1|x|1|1|1|1|extra")).toBeNull(); // too many
    expect(decodeFriendCard("LCH1|x|a|1|1|1")).toBeNull();      // non-numeric stat
  });
});

describe("friend share link + hash parsing", () => {
  it("builds a link that parses back to the same card", () => {
    const link = friendShareLink("https://example.com/game/", CARD);
    expect(link).toContain("#f=");
    expect(friendCardFromHash(new URL(link).hash)).toEqual(CARD);
  });

  it("returns null when no f= param is present", () => {
    expect(friendCardFromHash("#tab=progress")).toBeNull();
    expect(friendCardFromHash("")).toBeNull();
  });

  it("finds f= even when it is not the first hash param", () => {
    const payload = encodeURIComponent(encodeFriendCard(CARD));
    expect(friendCardFromHash(`#x=1&f=${payload}`)).toEqual(CARD);
  });
});

describe("buildFriendCompare", () => {
  it("flags the winner per metric and the overall lead", () => {
    const mine = { name: "Me", level: 12, streak: 7, mastered: 340, stickers: 9 };
    const theirs = { name: "You", level: 10, streak: 7, mastered: 400, stickers: 2 };
    const cmp = buildFriendCompare(mine, theirs);
    expect(cmp.theirName).toBe("You");
    expect(cmp.rows).toEqual([
      { key: "level", mine: 12, theirs: 10, winner: "mine" },
      { key: "streak", mine: 7, theirs: 7, winner: "tie" },
      { key: "mastered", mine: 340, theirs: 400, winner: "theirs" },
      { key: "stickers", mine: 9, theirs: 2, winner: "mine" },
    ]);
    expect(cmp.lead).toBe("mine"); // 2 wins vs 1 loss
  });

  it("reports a tie when wins and losses are equal", () => {
    const cmp = buildFriendCompare(
      { level: 5, streak: 1, mastered: 1, stickers: 1 },
      { level: 3, streak: 9, mastered: 1, stickers: 1 },
    );
    expect(cmp.lead).toBe("tie");
  });
});
