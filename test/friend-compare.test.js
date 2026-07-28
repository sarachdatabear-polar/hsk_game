import { describe, it, expect } from "vitest";
import {
  encodeFriendCard, decodeFriendCard, friendShareLink, friendCardFromHash, buildFriendCompare,
  normalizeFriendCard, epochDay, cardAgeDays,
} from "../src/friend-compare.js";
import { AVATAR_CAT_IDS } from "../src/avatar.js";

const CARD = { name: "Jordan", level: 12, streak: 7, mastered: 340, stickers: 9 };
const CARD_V2 = { ...CARD, avatar: "", day: 0 };

describe("friend-compare codec", () => {
  it("round-trips a card through encode/decode", () => {
    expect(decodeFriendCard(encodeFriendCard(CARD))).toEqual(CARD_V2);
  });

  it("survives Thai / emoji / delimiter chars in the name", () => {
    for (const name of ["น้องแมว", "cat 🐱", "a|b|c", "50% off", "  trim me  "]) {
      const back = decodeFriendCard(encodeFriendCard({ ...CARD, name }));
      expect(back.name).toBe(name.replace(/\s+/gu, " ").trim().slice(0, 24));
    }
  });

  it("round-trips a 24-grapheme name ending in an emoji (25 UTF-16 code units) without throwing", () => {
    const name = "a".repeat(23) + "🐱"; // 24 graphemes, 25 code units (surrogate pair)
    expect(name.length).toBe(25);
    const encoded = encodeFriendCard({ ...CARD, name });
    const back = decodeFriendCard(encoded);
    expect(back.name).toBe(name);
  });

  it("clamps a >24-grapheme emoji-heavy name to 24 graphemes with no lone surrogates", () => {
    const name = "🐱".repeat(30); // 30 graphemes, 60 code units
    const encoded = encodeFriendCard({ ...CARD, name });
    const back = decodeFriendCard(encoded);
    expect([...back.name].length).toBe(24);
    expect(() => encodeURIComponent(back.name)).not.toThrow();
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
    expect(friendCardFromHash(new URL(link).hash)).toEqual(CARD_V2);
  });

  it("returns null when no f= param is present", () => {
    expect(friendCardFromHash("#tab=progress")).toBeNull();
    expect(friendCardFromHash("")).toBeNull();
  });

  it("finds f= even when it is not the first hash param", () => {
    const payload = encodeURIComponent(encodeFriendCard(CARD));
    expect(friendCardFromHash(`#x=1&f=${payload}`)).toEqual(CARD_V2);
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

describe("LCH1 back-compat (test-pinned wire contract)", () => {
  it("every legacy LCH1 payload decodes to the same stats with avatar '' and day 0", () => {
    expect(decodeFriendCard("LCH1|Jordan|12|7|340|9"))
      .toEqual({ name: "Jordan", level: 12, streak: 7, mastered: 340, stickers: 9, avatar: "", day: 0 });
    expect(decodeFriendCard("LCH1|%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B9%81%E0%B8%A1%E0%B8%A7|3|1|20|2"))
      .toEqual({ name: "น้องแมว", level: 3, streak: 1, mastered: 20, stickers: 2, avatar: "", day: 0 });
  });
  it("prefix/part-count mismatches are rejected both ways", () => {
    expect(decodeFriendCard("LCH1|x|1|1|1|1|panda|20000")).toBeNull(); // LCH1 with 8 parts
    expect(decodeFriendCard("LCH2|x|1|1|1|1")).toBeNull();             // LCH2 with 6 parts
    expect(decodeFriendCard("LCH3|x|1|1|1|1|panda|20000")).toBeNull();
  });
});

describe("LCH2 codec", () => {
  it("emits exactly 8 pipe-delimited parts with the LCH2 prefix", () => {
    const enc = encodeFriendCard({ ...CARD, avatar: "panda", day: 20000 });
    expect(enc.split("|").length).toBe(8);
    expect(enc.startsWith("LCH2|")).toBe(true);
  });
  it("round-trips avatar + day, incl. Thai/emoji names", () => {
    const card = { name: "น้องแมว 🐱", level: 9, streak: 30, mastered: 500, stickers: 12,
      avatar: "mooncake-rabbit", day: 20661 };
    expect(decodeFriendCard(encodeFriendCard(card))).toEqual(card);
  });
  it("stat garbage still rejects the whole card (strictness unchanged)", () => {
    expect(decodeFriendCard("LCH2|x|a|1|1|1|panda|20000")).toBeNull();
    expect(decodeFriendCard("LCH2|x|1|x|1|1|panda|20000")).toBeNull();
    // NOTE: an EMPTY stat part is Number("") === 0 — finite, so it clamps to
    // 0 rather than rejecting. That matches LCH1's existing strictness rule
    // exactly (Number-finiteness, not non-emptiness); do not "fix" it here.
  });
  it("avatar/day are presentational and decode leniently", () => {
    const base = "LCH2|x|1|2|3|4";
    expect(decodeFriendCard(`${base}|<img src=x onerror=x>|5`).avatar).toBe("");
    expect(decodeFriendCard(`${base}|panda; DROP|5`).avatar).toBe("");
    expect(decodeFriendCard(`${base}|cat-happy|5`).avatar).toBe("");   // asset name, not an id
    expect(decodeFriendCard(`${base}|panda|5`).avatar).toBe("panda");
    for (const day of ["-5", "1e99", "NaN", "x"]) {
      const c = decodeFriendCard(`${base}|panda|${day}`);
      expect(c).not.toBeNull();
      expect(c.day).toBe(0);
    }
  });
  it("encoding a hand-built card with a bogus avatar writes '' (defense in depth)", () => {
    expect(encodeFriendCard({ ...CARD, avatar: "javascript:x", day: 5 }).split("|")[6]).toBe("");
  });
  it("no avatar id can break the pipe wire (invariant the codec depends on)", () => {
    expect(AVATAR_CAT_IDS.every(id => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });
});

describe("normalizeFriendCard (exported)", () => {
  it("applies the codec's exact clamps to a raw object", () => {
    expect(normalizeFriendCard({ name: "  a  b  ", level: "7", streak: -1, avatar: "dragon", day: 3.9 }))
      .toEqual({ name: "a b", level: 7, streak: 0, mastered: 0, stickers: 0, avatar: "dragon", day: 3 });
    expect(normalizeFriendCard(null).avatar).toBe("");
  });
});

describe("epochDay / cardAgeDays", () => {
  it("epochDay does UTC math and returns 0 on garbage", () => {
    expect(epochDay("1970-01-02")).toBe(1);
    expect(epochDay("2026-07-27")).toBe(Math.floor(Date.parse("2026-07-27T00:00:00Z") / 86400000));
    expect(epochDay("not-a-date")).toBe(0);
    expect(epochDay("")).toBe(0);
    expect(epochDay(null)).toBe(0);
  });
  it("cardAgeDays: unknown day -> null, future -> 0 (clock skew), else the age", () => {
    expect(cardAgeDays({ day: 0 }, 20000)).toBeNull();     // LCH1 cards
    expect(cardAgeDays({ day: 19990 }, 0)).toBeNull();      // no today reference
    expect(cardAgeDays({ day: 20005 }, 20000)).toBe(0);     // future -> clamped to today
    expect(cardAgeDays({ day: 19990 }, 20000)).toBe(10);
    expect(cardAgeDays({ day: 20000 }, 20000)).toBe(0);
    expect(cardAgeDays(null, 20000)).toBeNull();
  });
});

describe("buildFriendCompare v2 surface", () => {
  it("surfaces theirAvatar (allowlist-validated) and ageDays", () => {
    const cmp = buildFriendCompare(CARD,
      { ...CARD, name: "P", avatar: "panda", day: 19995 }, 20000);
    expect(cmp.theirAvatar).toBe("panda");
    expect(cmp.ageDays).toBe(5);
    const dirty = buildFriendCompare(CARD, { ...CARD, avatar: "<script>" }, 20000);
    expect(dirty.theirAvatar).toBe("");
  });
  it("old 2-arg calls still work (todayDay defaults -> ageDays null)", () => {
    const cmp = buildFriendCompare(CARD, { ...CARD, day: 19995 });
    expect(cmp.ageDays).toBeNull();
    expect(cmp.rows.length).toBe(4);
  });
});
