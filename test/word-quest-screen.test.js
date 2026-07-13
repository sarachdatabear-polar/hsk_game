import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const battleScreen = html.match(/<div class="screen" id="s-battle">([\s\S]*?)<div class="pause-overlay"/)?.[1] ?? "";

describe("Word Quest screen contract", () => {
  it("presents the route, learning progress, review pouch, and pause action", () => {
    expect(battleScreen).toContain('data-i18n="battle.wordQuest"');
    expect(battleScreen).toContain('id="quest-route-name"');
    expect(battleScreen).toContain('data-i18n="battle.routeName"');
    expect(battleScreen).toContain('id="hud-progress"');
    expect(battleScreen).toContain('id="hud-review"');
    expect(battleScreen).toContain('id="hud-pause"');
  });

  it("keeps coins for results instead of showing raw score during the quest", () => {
    expect(battleScreen).not.toContain('id="hud-score"');
  });

  it("has a live prompt rail and renames combo as Lucky Flow", () => {
    expect(battleScreen).toContain('id="quest-feedback"');
    expect(battleScreen).toContain('role="status"');
    expect(battleScreen).toContain('aria-live="polite"');
    expect(battleScreen).toContain('data-i18n="battle.luckyFlow"');
    expect(battleScreen).not.toMatch(/>\s*COMBO\b/i);
  });

  it("preserves the existing answer-format mount point", () => {
    expect(battleScreen).toContain('<div id="opts"></div>');
  });
});
