import { describe, it, expect } from "vitest";
import {
  RECENT_FRIENDS_LIMIT, defaultRecentFriends, normalizeRecentFriends,
  rememberFriend, clearRecentFriends,
} from "../src/friend-recent.js";

const card = (name, over = {}) => ({
  name, level: 1, streak: 2, mastered: 3, stickers: 4, avatar: "", day: 0, ...over,
});

describe("defaults", () => {
  it("defaultRecentFriends / clearRecentFriends return the empty v1 shape", () => {
    expect(defaultRecentFriends()).toEqual({ v: 1, items: [] });
    expect(clearRecentFriends()).toEqual({ v: 1, items: [] });
    expect(RECENT_FRIENDS_LIMIT).toBe(5);
  });
});

describe("rememberFriend", () => {
  it("inserts at the front, newest first", () => {
    let s = rememberFriend(defaultRecentFriends(), card("A"), 100);
    s = rememberFriend(s, card("B"), 101);
    expect(s.items.map(i => i.card.name)).toEqual(["B", "A"]);
    expect(s.items[0].seenDay).toBe(101);
  });
  it("dedups by name: updates stored numbers and bumps to front", () => {
    let s = rememberFriend(defaultRecentFriends(), card("A", { level: 1 }), 100);
    s = rememberFriend(s, card("B"), 101);
    s = rememberFriend(s, card("A", { level: 9 }), 102);
    expect(s.items.map(i => i.card.name)).toEqual(["A", "B"]);
    expect(s.items[0].card.level).toBe(9);
    expect(s.items[0].seenDay).toBe(102);
  });
  it("empty-name cards dedup by the full encoded card", () => {
    let s = rememberFriend(defaultRecentFriends(), card(""), 100);
    s = rememberFriend(s, card(""), 101);                    // identical card -> dedup
    expect(s.items.length).toBe(1);
    s = rememberFriend(s, card("", { level: 9 }), 102);      // different card -> new row
    expect(s.items.length).toBe(2);
  });
  it("caps at 5, dropping the oldest", () => {
    let s = defaultRecentFriends();
    for (const n of ["A", "B", "C", "D", "E", "F"]) s = rememberFriend(s, card(n), 100);
    expect(s.items.length).toBe(5);
    expect(s.items.map(i => i.card.name)).toEqual(["F", "E", "D", "C", "B"]);
  });
  it("clamps seenDay and is pure (inputs not mutated)", () => {
    const before = rememberFriend(defaultRecentFriends(), card("A"), 100);
    const frozen = JSON.stringify(before);
    const after = rememberFriend(before, card("B"), -5);
    expect(after.items[0].seenDay).toBe(0);
    expect(JSON.stringify(before)).toBe(frozen);
    expect(after).not.toBe(before);
  });
});

describe("normalizeRecentFriends (untrusted stored value)", () => {
  it("garbage -> default", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { v: 1 }, { items: "x" }]) {
      expect(normalizeRecentFriends(bad)).toEqual({ v: 1, items: [] });
    }
  });
  it("re-runs every card through normalizeFriendCard and clamps seenDay", () => {
    const s = normalizeRecentFriends({ v: 1, items: [
      { card: { name: "<img src=x onerror=x>", level: "7", avatar: "javascript:x", day: -1 }, seenDay: "9" },
      { card: null, seenDay: -3 },
      "garbage",
    ] });
    expect(s.items.length).toBe(2);
    expect(s.items[0].card.level).toBe(7);
    expect(s.items[0].card.avatar).toBe("");
    expect(s.items[0].card.day).toBe(0);
    expect(s.items[0].card.name).toBe("<img src=x onerror=x>");  // clamped, not thrown — UI escapes
    expect(s.items[0].seenDay).toBe(9);
    expect(s.items[1].seenDay).toBe(0);
  });
  it("caps an oversized stored list at 5", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ card: card("N" + i), seenDay: i }));
    expect(normalizeRecentFriends({ v: 1, items }).items.length).toBe(5);
  });
});
