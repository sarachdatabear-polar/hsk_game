import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// A0 enforcement (PRD v5 §4): docs/art/STYLE-TOKENS.md is the style bible;
// index.html :root must define exactly the hex the bible documents. Task 7
// extends this file with the forbidden legacy-palette lint.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const doc = readFileSync(join(ROOT, "docs", "art", "STYLE-TOKENS.md"), "utf8");

// table rows look like: | `--lc-green` | `#32775E` | brand, headers |
const rows = [...doc.matchAll(/\|\s*`(--lc-[a-z-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/g)]
  .map(m => ({ name: m[1], hex: m[2] }));

describe("STYLE-TOKENS.md <-> index.html sync", () => {
  it("documents the full token set (12 core + 16 derived)", () => {
    expect(rows.length).toBeGreaterThanOrEqual(28);
  });

  it("has no duplicate token names", () => {
    const names = rows.map(r => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const { name, hex } of rows) {
    it(`${name} is defined in index.html as ${hex}`, () => {
      const re = new RegExp(`${name}\\s*:\\s*${hex}\\b`, "i");
      expect(re.test(html), `${name}:${hex} not found in index.html :root`).toBe(true);
    });
  }
});
