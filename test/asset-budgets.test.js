import { describe, it, expect } from "vitest";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// PRD v5 A2 size budgets (PRD-production-art-v1 §Budgets): backgrounds <350KB,
// sprite sheets <500KB, runtime decor/shop tiles <120KB. These are hard gates
// because optional art is cached on first use and still affects mobile data.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "assets", "asset-manifest.json"), "utf8"));
const BUDGETS = { background: 350 * 1024, "sprite-sheet": 500 * 1024, decor: 120 * 1024 };
const shipped = manifest.assets.filter(
  a => ["approved", "integrated"].includes(a.status) && BUDGETS[a.type]
);

describe("asset size budgets (PRD v5 A2)", () => {
  it("covers a non-trivial asset set", () => {
    expect(shipped.length).toBeGreaterThan(15);
  });
  for (const a of shipped) {
    it(`${a.file} within the ${Math.round(BUDGETS[a.type] / 1024)}KB ${a.type} budget`, () => {
      const p = join(ROOT, "assets", a.file);
      expect(existsSync(p), `${a.file} is ${a.status} but missing on disk`).toBe(true);
      const bytes = statSync(p).size;
      expect(bytes, `${a.file} is ${Math.round(bytes / 1024)}KB`).toBeLessThanOrEqual(BUDGETS[a.type]);
    });
  }
});
