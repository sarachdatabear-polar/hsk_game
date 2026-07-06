import { describe, it, expect, beforeEach } from "vitest";
import { STRINGS, detectLocale, setLocale, getLocale, t } from "../src/i18n.js";

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
    expect(t("home.learn")).toBe(STRINGS.th["home.learn"]);
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
});
