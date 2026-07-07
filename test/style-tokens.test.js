import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
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

// ---- forbidden legacy palettes (PRD v5 A1 acceptance: "no element uses a legacy color") ----

const srcFiles = readdirSync(join(ROOT, "src")).filter(f => f.endsWith(".js"));
const srcText = srcFiles.map(f => readFileSync(join(ROOT, "src", f), "utf8")).join("\n");
const htmlSansRoot = html.replace(/:root\{[\s\S]*?\}/, "");

// token names: banned in index.html AND src/*.js. Boundary (?![\w-]) keeps
// --panel from matching --panel-wash, --green from matching nothing (no
// substring), etc.
const FORBIDDEN_NAMES = [
  "--edu-", "--lc-lacquer", "--lc-crimson", "--lc-gold", "--lc-dark-gold",
  "--lc-jade", "--lc-night", "--lc-paper", "--lc-ink-legacy", "--lc-cream-legacy",
  "--lc-tan", "--lc-shadow",
  "--gold", "--crimson", "--jade", "--amber", "--green", "--red", "--card", "--panel",
];

// hex values: banned in index.html only (src canvas art may legitimately reuse
// a hex — e.g. shop.js gold-cat fur is #fff4e0 — character art, not UI chrome).
const FORBIDDEN_HEX = [
  "A51F24", "4A1015", "F5C34B", "9C6900", "2F9B72", "101B2B", "F4E2BE", "24150E",
  "FFF4E0", "C9A58A", "FBF3E0", "FFF8E8", "E65A4F", "4FAE8A", "6EB6E8", "F5C85B",
  "243447", "7B5B8E", "E7E2D9", "78B86B", "7A5A44", "EFE7D4", "FFFDF6", "6B7A88",
  "08324A", "EE6D62", "C64A40", "F0CDA4", "6A3A3A", "6A4F42", "0D2200", "3D3A35",
  "6D6862", "8B8681", "FFE9B0", "173F22", "6E2A18", "B04A33", "8A2F20", "3A2E1A",
  "B97A1E", "D99A2E", "FFE59B", "EAF2FB", "DCE8F5", "F1E7D6",
];

// rgb triples from the dead palettes (washes/glows written as rgba(...))
const FORBIDDEN_RGB = ["255,248,232", "36,52,71", "18,8,6", "245,197,24", "245,195,75", "201,165,138", "201,160,138"];

describe("forbidden legacy palette lint", () => {
  for (const name of FORBIDDEN_NAMES) {
    const re = new RegExp(`${name}(?![\\w-])`);
    it(`token ${name} is gone from index.html`, () => {
      expect(re.test(html), `${name} still referenced in index.html`).toBe(false);
    });
    it(`token ${name} is gone from src/`, () => {
      expect(re.test(srcText), `${name} still referenced in src/*.js`).toBe(false);
    });
  }
  for (const hex of FORBIDDEN_HEX) {
    it(`raw hex #${hex} is gone from index.html`, () => {
      expect(htmlSansRoot.toLowerCase().includes(`#${hex.toLowerCase()}`), `#${hex} still in index.html`).toBe(false);
    });
  }
  for (const rgb of FORBIDDEN_RGB) {
    it(`rgb(${rgb}) is gone from index.html`, () => {
      expect(htmlSansRoot.replace(/\s/g, "").includes(rgb), `rgba(${rgb},...) still in index.html`).toBe(false);
    });
  }
});
