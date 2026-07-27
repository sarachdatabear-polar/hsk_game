import { describe, it, expect } from "vitest";
import {
  AVATAR_DEFAULT_CAT_ID, AVATAR_CAT_IDS, normalizeAvatar, ownsCatAvatar,
  catAvatarChoices, avatarSheetFor, avatarPortraitStyle, wireAvatarId, avatarFromWireId,
} from "../src/avatar.js";
import { SKIN_PALETTES } from "../src/shop.js";

describe("AVATAR_CAT_IDS", () => {
  it("is lucky + exactly the SKIN_PALETTES keys, in order (derivation-pinned)", () => {
    expect(AVATAR_DEFAULT_CAT_ID).toBe("lucky");
    expect(AVATAR_CAT_IDS).toEqual(["lucky", ...Object.keys(SKIN_PALETTES)]);
    expect(AVATAR_CAT_IDS).toEqual(
      ["lucky", "panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]);
  });
});

describe("normalizeAvatar", () => {
  it("keeps valid cat / photo / monogram values as fresh objects", () => {
    const cat = { kind: "cat", id: "panda" };
    expect(normalizeAvatar(cat)).toEqual({ kind: "cat", id: "panda" });
    expect(normalizeAvatar(cat)).not.toBe(cat);            // no aliasing
    expect(normalizeAvatar({ kind: "photo" })).toEqual({ kind: "photo" });
    expect(normalizeAvatar({ kind: "monogram" })).toEqual({ kind: "monogram" });
  });
  it("drops extra fields", () => {
    expect(normalizeAvatar({ kind: "cat", id: "dragon", hax: 1 })).toEqual({ kind: "cat", id: "dragon" });
    expect(normalizeAvatar({ kind: "photo", url: "http://evil" })).toEqual({ kind: "photo" });
  });
  it("maps unknown/removed ids and garbage to monogram", () => {
    for (const bad of [
      { kind: "cat", id: "cat-boss" }, { kind: "cat", id: "PANDA" }, { kind: "cat", id: "" },
      { kind: "cat" }, { kind: "nope" }, null, undefined, 42, "panda", [], ["cat"],
      { kind: "cat", id: "javascript:alert(1)" },
    ]) {
      expect(normalizeAvatar(bad)).toEqual({ kind: "monogram" });
    }
  });
});

describe("ownsCatAvatar / catAvatarChoices", () => {
  it("lucky is always owned; skins follow the owned list", () => {
    expect(ownsCatAvatar("lucky", [])).toBe(true);
    expect(ownsCatAvatar("lucky", null)).toBe(true);
    expect(ownsCatAvatar("panda", ["panda"])).toBe(true);
    expect(ownsCatAvatar("panda", ["ninja"])).toBe(false);
    expect(ownsCatAvatar("panda", null)).toBe(false);
    expect(ownsCatAvatar("not-a-cat", ["not-a-cat"])).toBe(false);
  });
  it("choices carry lock flags for all 7 ids in display order", () => {
    const choices = catAvatarChoices(["panda", "dragon"]);
    expect(choices.map(c => c.id)).toEqual(AVATAR_CAT_IDS);
    expect(choices.find(c => c.id === "lucky").locked).toBe(false);
    expect(choices.find(c => c.id === "panda").locked).toBe(false);
    expect(choices.find(c => c.id === "dragon").locked).toBe(false);
    expect(choices.find(c => c.id === "ninja").locked).toBe(true);
  });
});

describe("avatarSheetFor", () => {
  it("resolves lucky to cat-happy and skins through SKIN_PALETTES (id never munged)", () => {
    expect(avatarSheetFor({ kind: "cat", id: "lucky" })).toBe("cat-happy");
    expect(avatarSheetFor({ kind: "cat", id: "mooncake-rabbit" })).toBe("cat-mooncake-happy");
    expect(avatarSheetFor({ kind: "cat", id: "panda" })).toBe("cat-panda-happy");
  });
  it("returns null for monogram / photo / garbage", () => {
    expect(avatarSheetFor({ kind: "monogram" })).toBeNull();
    expect(avatarSheetFor({ kind: "photo" })).toBeNull();
    expect(avatarSheetFor({ kind: "cat", id: "cat-boss" })).toBeNull();
    expect(avatarSheetFor(null)).toBeNull();
  });
});

describe("avatarPortraitStyle", () => {
  // cat-happy bbox: l78 t62 r177 b189 -> bw 99, bh 127, side 127,
  // square origin cl=64, ct=62 (clamped to [0, 129]).
  it("computes the square content crop for the small default cat", () => {
    const s = avatarPortraitStyle({ kind: "cat", id: "lucky" });
    expect(s.image).toBe("assets/cat-happy.png");
    expect(s.sizePct[0]).toBeCloseTo(102400 / 127, 6);
    expect(s.sizePct[1]).toBeCloseTo(25600 / 127, 6);
    expect(s.posPct[0]).toBeCloseTo((100 * 64) / (1024 - 127), 6);
    expect(s.posPct[1]).toBeCloseTo((100 * 62) / (256 - 127), 6);
  });
  // beach bbox: l9 t12 r246 b244 -> bw 237, bh 232, side 237, cl=9, ct=9.5.
  it("computes the crop for a near-full-frame skin", () => {
    const s = avatarPortraitStyle({ kind: "cat", id: "beach" });
    expect(s.image).toBe("assets/cat-beach-happy.png");
    expect(s.sizePct[0]).toBeCloseTo(102400 / 237, 6);
    expect(s.posPct[0]).toBeCloseTo((100 * 9) / (1024 - 237), 6);
    expect(s.posPct[1]).toBeCloseTo((100 * 9.5) / (256 - 237), 6);
  });
  it("keeps sizePct at an exact 4:1 ratio for every cat id (uniform scale)", () => {
    for (const id of AVATAR_CAT_IDS) {
      const s = avatarPortraitStyle({ kind: "cat", id });
      expect(s.sizePct[0] / s.sizePct[1]).toBeCloseTo(4, 9);
      expect(s.posPct[0]).toBeGreaterThanOrEqual(0);
      expect(s.posPct[0]).toBeLessThanOrEqual(100);
      expect(s.posPct[1]).toBeGreaterThanOrEqual(0);
      expect(s.posPct[1]).toBeLessThanOrEqual(100);
    }
  });
  it("returns null for monogram and photo", () => {
    expect(avatarPortraitStyle({ kind: "monogram" })).toBeNull();
    expect(avatarPortraitStyle({ kind: "photo" })).toBeNull();
  });
});

describe("wire codec", () => {
  it("wireAvatarId: owned cat -> id; photo/monogram/unowned/unknown -> ''", () => {
    expect(wireAvatarId({ kind: "cat", id: "lucky" }, [])).toBe("lucky");
    expect(wireAvatarId({ kind: "cat", id: "panda" }, ["panda"])).toBe("panda");
    expect(wireAvatarId({ kind: "cat", id: "panda" }, [])).toBe("");
    expect(wireAvatarId({ kind: "photo" }, ["panda"])).toBe("");     // approved degrade
    expect(wireAvatarId({ kind: "monogram" }, [])).toBe("");
    expect(wireAvatarId(null, null)).toBe("");
  });
  it("avatarFromWireId: allowlisted -> cat; everything else -> monogram; never photo", () => {
    expect(avatarFromWireId("dragon")).toEqual({ kind: "cat", id: "dragon" });
    expect(avatarFromWireId("lucky")).toEqual({ kind: "cat", id: "lucky" });
    for (const bad of ["", "javascript:alert(1)", "../../x", "%2e%2e", "cat-happy", "photo", null, 7, {}]) {
      expect(avatarFromWireId(bad)).toEqual({ kind: "monogram" });
    }
  });
});
