import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const icons = readFileSync(new URL("../assets/ui-icons.svg", import.meta.url), "utf8");

function iconForI18n(key) {
  const button = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .map(match => match[0])
    .find(markup => markup.includes(`data-i18n="${key}"`));
  return button?.match(/ui-icons\.svg#([^"<]+)/)?.[1] || "";
}

function iconForId(id) {
  const button = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .map(match => match[0])
    .find(markup => markup.includes(`id="${id}"`));
  return button?.match(/ui-icons\.svg#([^"<]+)/)?.[1] || "";
}

describe("button UI/UX contract", () => {
  it("centers structured button labels and lets Cat background names wrap", () => {
    expect(html).toMatch(/\.cat-bg-choice\{[^}]*text-align:center/);
    expect(html).toMatch(/\.cat-bg-label\{[^}]*white-space:normal[^}]*text-align:center/);
    expect(html).not.toMatch(/\.cat-bg-label\{[^}]*text-overflow:ellipsis/);
    expect(html).toMatch(/\.journey-level-toggle\{[^}]*text-align:center/);
    expect(html).toMatch(/\.j-node\{[^}]*text-align:center/);
    expect(html).toMatch(/\.j-copy\{[^}]*align-items:center[^}]*text-align:center/);
    expect(html).toMatch(/\.fr-recent-row\{[^}]*text-align:center/);
  });

  it("opens Cards directly from the Home Flashcards shortcut", () => {
    expect(html).toMatch(/id="home-flashcards-btn"[^>]*data-go="scope-learn"/);
    expect(main).toMatch(/else if\(tab==="scope-learn"\)\{[\s\S]*?startLearn\("home"\);[\s\S]*?\n\s*\}/);
  });

  it("keeps Smart Review visually distinct from Word Quest", () => {
    expect(main).toContain('setIconLabel(btn, "mastery"');
    expect(iconForId("go-battle")).toBe("quest");
  });

  it("does not reuse an icon across differently purposed audited actions", () => {
    const pairs = [
      ["home.flashcards", "home.tones"],
      ["home.best", "account.row"],
      ["home.best", "profile.viewAlbum"],
      ["friend.compareCta", "nav.progress"],
      ["cat.customizeQuests", "home.shop"],
      ["cat.backgrounds", "profile.viewCollection"],
      ["profile.viewCollection", "home.shop"],
      ["results.reviewWords", "progress.reviewThese"],
      ["results.practiceMissed", "progress.practiceThese"],
      ["results.playAgain", "battle.resume"],
    ];
    for (const [a, b] of pairs) {
      expect(iconForI18n(a), a).not.toBe("");
      expect(iconForI18n(b), b).not.toBe("");
      expect(iconForI18n(a), `${a} vs ${b}`).not.toBe(iconForI18n(b));
    }
  });

  it("defines every new semantic icon in the shared sprite", () => {
    for (const id of [
      "customize", "backdrop", "compare", "account", "album", "replay", "missed-review", "missed-practice",
    ]) {
      expect(icons).toContain(`<symbol id="${id}"`);
    }
  });
});
