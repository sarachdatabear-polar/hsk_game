import { describe, it, expect, beforeEach } from "vitest";
import { STRINGS, detectLocale, setLocale, getLocale, t } from "../src/i18n.js";
import { QUEST_POOL } from "../src/quests.js";

describe("i18n engine", () => {
  beforeEach(() => setLocale("en"));

  it("detects Thai from a th-* device language, English otherwise", () => {
    expect(detectLocale({ language: "th-TH" })).toBe("th");
    expect(detectLocale({ language: "TH" })).toBe("th");
    expect(detectLocale({ language: "en-US" })).toBe("en");
    expect(detectLocale({ language: "" })).toBe("en");
    expect(detectLocale({})).toBe("en");
  });

  it("returns the string for the current locale", () => {
    setLocale("th");
    expect(getLocale()).toBe("th");
    expect(t("home.flashcards")).toBe(STRINGS.th["home.flashcards"]);
  });

  it("falls back to English when a key is missing in Thai", () => {
    setLocale("th");
    // simulate a key present only in en
    STRINGS.en["__test.only_en"] = "Only EN";
    expect(t("__test.only_en")).toBe("Only EN");
    delete STRINGS.en["__test.only_en"];
  });

  it("returns the key itself when it exists nowhere (never crashes UI)", () => {
    expect(t("__does.not.exist")).toBe("__does.not.exist");
  });

  it("interpolates {params}", () => {
    STRINGS.en["__test.greet"] = "Hi {name}, you have {n} coins";
    expect(t("__test.greet", { name: "Cat", n: 5 })).toBe("Hi Cat, you have 5 coins");
    delete STRINGS.en["__test.greet"];
  });

  it("ignores an unknown locale and keeps a valid one", () => {
    setLocale("en");
    setLocale("xx");
    expect(getLocale()).toBe("en");
  });

  it("has a Thai translation for every English key", () => {
    const missing = Object.keys(STRINGS.en).filter(k => !(k in STRINGS.th));
    expect(missing).toEqual([]);
  });

  it("keeps {placeholder} sets identical between English and Thai", () => {
    const tokens = s => (s.match(/\{\w+\}/g) || []).sort().join(",");
    const mismatched = Object.keys(STRINGS.en)
      .filter(k => k in STRINGS.th)
      .filter(k => tokens(STRINGS.en[k]) !== tokens(STRINGS.th[k]));
    expect(mismatched).toEqual([]);
  });

  it("keeps the same allowed HTML-tag structure in both locales", () => {
    const tags = s => (s.match(/<\/?[a-z][^>]*>/gi) || []).join("|");
    const mismatched = Object.keys(STRINGS.en)
      .filter(k => tags(STRINGS.en[k]) !== tags(STRINGS.th[k]));
    expect(mismatched).toEqual([]);
  });

  it("contains Thai script except for intentional codes, numbers, and input formats", () => {
    const languageNeutral = new Set([
      "home.levelChip", "account.emailPh", "scope.customPh", "journey.nodeTop",
      "sticker.scopeName", "sticker.msName", "shop.maxed", "tones.progress",
      "tones.tone1", "tones.tone2", "tones.tone3", "tones.tone4",
    ]);
    const missingThai = Object.entries(STRINGS.th)
      .filter(([key, value]) => !languageNeutral.has(key) && !/[\u0E00-\u0E7F]/.test(value))
      .map(([key]) => key);
    expect(missingThai).toEqual([]);
  });

  it("has a quest.<id> key for every quest in QUEST_POOL", () => {
    const missing = QUEST_POOL.map(q => "quest." + q.id).filter(k => !(k in STRINGS.en));
    expect(missing).toEqual([]);
  });
});
