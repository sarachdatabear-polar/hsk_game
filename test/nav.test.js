import { describe, it, expect } from "vitest";
import { TABS, navVisibleOn, activeTabFor } from "../src/nav.js";

describe("nav", () => {
  it("has the 4 tabs in nav order", () => {
    expect(TABS).toEqual(["home", "street", "progress", "more"]);
  });

  describe("navVisibleOn", () => {
    it("shows the nav on every tab screen", () => {
      for (const s of TABS) expect(navVisibleOn(s), s).toBe(true);
    });
    it("shows the nav on More sub-screens and shop", () => {
      expect(navVisibleOn("scores")).toBe(true);
      expect(navVisibleOn("howto")).toBe(true);
      expect(navVisibleOn("account")).toBe(true);
      expect(navVisibleOn("shop")).toBe(true);
    });
    it("hides the nav during battle/learn/scope/results", () => {
      expect(navVisibleOn("battle")).toBe(false);
      expect(navVisibleOn("learn")).toBe(false);
      expect(navVisibleOn("scope")).toBe(false);
      expect(navVisibleOn("results")).toBe(false);
    });
    it("shows the nav on the album (a Progress sub-screen)", () => {
      expect(navVisibleOn("album")).toBe(true);
    });
  });

  describe("activeTabFor", () => {
    it("is the screen itself for each tab", () => {
      for (const s of TABS) expect(activeTabFor(s), s).toBe(s);
    });
    it("is 'more' for scores/howto/account", () => {
      expect(activeTabFor("scores")).toBe("more");
      expect(activeTabFor("howto")).toBe("more");
      expect(activeTabFor("account")).toBe("more");
    });
    it("is 'home' for shop", () => {
      expect(activeTabFor("shop")).toBe("home");
    });
    it("is null when the nav is hidden", () => {
      expect(activeTabFor("battle")).toBe(null);
      expect(activeTabFor("learn")).toBe(null);
      expect(activeTabFor("scope")).toBe(null);
      expect(activeTabFor("results")).toBe(null);
    });
    it("is 'progress' for the album", () => {
      expect(activeTabFor("album")).toBe("progress");
    });
  });
});
