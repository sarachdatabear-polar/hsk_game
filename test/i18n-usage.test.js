import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STRINGS } from "../src/i18n.js";
import { CATALOG } from "../src/shop.js";
import { BUILDINGS } from "../src/street.js";
import { MILESTONES } from "../src/growth.js";

// Static-usage guard (i18n pass 2, Task 1): closes the "key referenced but
// missing" gap in both directions — every key a template/source file points
// at must resolve in both locales, and every catalog/building id must have
// a display-name key ready for Task 2's wiring.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const srcFiles = readdirSync(join(ROOT, "src")).filter(f => f.endsWith(".js"));
const srcText = Object.fromEntries(
  srcFiles.map(f => [f, readFileSync(join(ROOT, "src", f), "utf8")])
);

describe("index.html data-i18n* keys exist in both locales", () => {
  const attrs = ["data-i18n", "data-i18n-title", "data-i18n-ph"];
  const keys = new Set();
  for (const attr of attrs) {
    const re = new RegExp(`${attr}="([^"]+)"`, "g");
    for (const m of html.matchAll(re)) keys.add(m[1]);
  }

  it("finds a non-trivial number of annotated keys", () => {
    expect(keys.size).toBeGreaterThan(20);
  });

  for (const key of [...keys].sort()) {
    it(`"${key}" exists in EN and TH`, () => {
      expect(key in STRINGS.en, `${key} missing from STRINGS.en`).toBe(true);
      expect(key in STRINGS.th, `${key} missing from STRINGS.th`).toBe(true);
    });
  }
});

describe("t(\"...\") literal keys in src/*.js exist in both locales", () => {
  // Matches t("key") / t('key') where the string literal is the *entire*
  // first argument (immediately followed by "," or ")"). Excludes computed
  // keys built by concatenation, e.g. t("quest."+q.id) or t("season."+id) —
  // those resolve at runtime and can't be statically enumerated here; the
  // shop/street coverage block below checks their id-space instead.
  const re = /\bt\(\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1\s*[,)]/g;
  const keys = new Set();
  for (const [file, text] of Object.entries(srcText)) {
    // Strip //-comments first — quests.js documents the t("quest."+id)
    // convention in a comment, which would otherwise false-positive as a
    // literal "quest.<id>" key.
    const codeOnly = text.replace(/\/\/.*$/gm, "");
    for (const m of codeOnly.matchAll(re)) keys.add(m[2]);
    void file;
  }

  it("finds a non-trivial number of t()-called keys", () => {
    expect(keys.size).toBeGreaterThan(20);
  });

  for (const key of [...keys].sort()) {
    it(`"${key}" exists in EN and TH`, () => {
      expect(key in STRINGS.en, `${key} missing from STRINGS.en`).toBe(true);
      expect(key in STRINGS.th, `${key} missing from STRINGS.th`).toBe(true);
    });
  }
});

describe("shop/street display-name key coverage", () => {
  for (const item of CATALOG) {
    it(`item.${item.id} exists in EN and TH`, () => {
      expect(`item.${item.id}` in STRINGS.en, `item.${item.id} missing from STRINGS.en`).toBe(true);
      expect(`item.${item.id}` in STRINGS.th, `item.${item.id} missing from STRINGS.th`).toBe(true);
    });
  }

  for (const b of BUILDINGS) {
    it(`building.${b.id} exists in EN and TH`, () => {
      expect(`building.${b.id}` in STRINGS.en, `building.${b.id} missing from STRINGS.en`).toBe(true);
      expect(`building.${b.id}` in STRINGS.th, `building.${b.id} missing from STRINGS.th`).toBe(true);
    });
  }

  // MILESTONES names are rendered via the computed key tOr("milestone."+id, name)
  // (growth card + results level-up), which the static literal matcher above
  // can't enumerate — cover the id-space explicitly, same as CATALOG/BUILDINGS.
  for (const m of MILESTONES) {
    it(`milestone.${m.id} exists in EN and TH`, () => {
      expect(`milestone.${m.id}` in STRINGS.en, `milestone.${m.id} missing from STRINGS.en`).toBe(true);
      expect(`milestone.${m.id}` in STRINGS.th, `milestone.${m.id} missing from STRINGS.th`).toBe(true);
    });
  }
});
