import { describe, it, expect } from "vitest";
import { defaultProfile, normalizeDisplayName, profileInitial, profileStats, bestSessionScore, equippedSummary } from "../src/profile.js";

describe("profile identity", () => {
  it("returns a fresh empty profile", () => {
    const a = defaultProfile(), b = defaultProfile();
    expect(a).toEqual({ displayName: "" });
    expect(a).not.toBe(b);
  });

  it("trims and collapses display-name whitespace", () => {
    expect(normalizeDisplayName("  Lucky\n\t Learner  ")).toBe("Lucky Learner");
  });

  it("limits by user-perceived Unicode characters", () => {
    expect(normalizeDisplayName("แมวนำโชค🐱abc", 8)).toBe("แมวนำโชค🐱");
  });

  it("handles empty/corrupt values and invalid limits", () => {
    expect(normalizeDisplayName(null)).toBe("");
    expect(normalizeDisplayName("Player", -1)).toBe("");
  });

  it("derives a player monogram without splitting Unicode graphemes", () => {
    expect(profileInitial("  jordan ")).toBe("J");
    expect(profileInitial("น้องหมี")).toBe("น้");
    expect(profileInitial("👩🏽‍💻 Coder")).toBe("👩🏽‍💻");
  });

  it("uses an empty initial for the neutral fallback avatar", () => {
    expect(profileInitial("")).toBe("");
    expect(profileInitial(null)).toBe("");
  });
});

describe("profileStats", () => {
  const levels = {
    1: [{ h: "一" }, { h: "二" }],
    2: [{ h: "二" }, { h: "三" }], // duplicate introduction must count once
  };
  const mastery = {
    一: { s: 3, k: 3, r: 3 },
    二: { s: 2, k: 1, r: 0 },
    outside: { s: 9, k: 9, r: 9 },
  };
  const stickerDefs = [{ id: "s1" }, { id: "s2" }];
  const stickerState = { earned: { s1: "2026-07-15", removed: "2026-01-01" }, queue: [] };
  const catalog = [
    { id: "panda", type: "skin" },
    { id: "market", type: "backdrop" },
    { id: "freeze", type: "consumable" },
  ];
  const shop = { owned: ["panda", "freeze", "removed"], skin: "panda" };

  it("derives unique word, valid sticker, and cosmetic totals", () => {
    expect(profileStats({ levels, mastery, stickerState, stickerDefs, shop, catalog })).toEqual({
      totalWords: 3,
      seenWords: 2,
      masteredWords: 1,
      totalStickers: 2,
      earnedStickers: 1,
      totalCosmetics: 2,
      ownedCosmetics: 1,
    });
  });

  it("tolerates missing state and does not mutate inputs", () => {
    const before = JSON.stringify({ levels, mastery, stickerState, stickerDefs, shop, catalog });
    expect(profileStats()).toEqual({
      totalWords: 0, seenWords: 0, masteredWords: 0,
      totalStickers: 0, earnedStickers: 0,
      totalCosmetics: 0, ownedCosmetics: 0,
    });
    profileStats({ levels, mastery, stickerState, stickerDefs, shop, catalog });
    expect(JSON.stringify({ levels, mastery, stickerState, stickerDefs, shop, catalog })).toBe(before);
  });
});

describe("bestSessionScore", () => {
  it("returns 0 for undefined or empty best maps", () => {
    expect(bestSessionScore(undefined)).toBe(0);
    expect(bestSessionScore({})).toBe(0);
  });

  it("returns the max score across scopes", () => {
    expect(bestSessionScore({ a: { score: 120, date: "x" }, b: { score: 340, date: "y" } })).toBe(340);
  });

  it("ignores garbage entries", () => {
    expect(bestSessionScore({ a: { score: "nope" }, b: null, c: { score: 210 } })).toBe(210);
  });

  it("never lets a negative score beat 0", () => {
    expect(bestSessionScore({ a: { score: -50 } })).toBe(0);
  });
});

describe("equippedSummary", () => {
  const catalog = [
    { id: "panda", name: "Panda", type: "skin" },
    { id: "market", name: "Night Market", type: "backdrop" },
    { id: "bells", name: "Temple Bells", type: "soundpack" },
  ];

  it("returns only valid, owned equipped items", () => {
    expect(equippedSummary({
      owned: ["panda", "market"], skin: "panda", backdrop: "market",
      effect: "removed", soundpack: "bells",
    }, catalog)).toEqual({
      skin: { id: "panda", name: "Panda" },
      backdrop: { id: "market", name: "Night Market" },
      effect: null,
      soundpack: null,
    });
  });
});
