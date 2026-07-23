import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const catSource = readFileSync(join(GAME, "src", "cat.js"), "utf8");

describe("authored cat artwork", () => {
  it("does not paint milestone costume primitives over the sprite sheets", () => {
    expect(catSource).not.toContain("drawAccessories");
    expect(catSource).not.toMatch(/acc\.has\(["'](?:scarf|coin|outfit|emperor)["']\)/);
    expect(catSource).not.toContain('fillStyle = "#b3262a"');
  });
});
