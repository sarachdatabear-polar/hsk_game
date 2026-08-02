import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const catSource = readFileSync(join(GAME, "src", "cat.js"), "utf8");
const assetHash = file => createHash("sha256")
  .update(readFileSync(join(GAME, "assets", file))).digest("hex");

describe("authored cat artwork", () => {
  it("does not paint milestone costume primitives over the sprite sheets", () => {
    expect(catSource).not.toContain("drawAccessories");
    expect(catSource).not.toMatch(/acc\.has\(["'](?:scarf|coin|outfit|emperor)["']\)/);
    expect(catSource).not.toContain('fillStyle = "#b3262a"');
  });

  it("locks the Home-matched default mascot sheets", () => {
    expect(assetHash("cat-walk.png")).toBe("ef0538d295a2ba96e864c0e6d19f637d94654480627d17baa2478a5b35e0fa37");
    expect(assetHash("cat-happy.png")).toBe("6f64ce58d6b9fbead8fe25adf8452152d3bd63464a1b23e09c564e5d6e79eae1");
  });
});
