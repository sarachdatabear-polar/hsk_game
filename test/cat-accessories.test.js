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

  it("locks the scarf-free default mascot sheets", () => {
    expect(assetHash("cat-walk.png")).toBe("927188c21a36f12c2e818d6781047cc351d2d765b31ba28bfa659253eed756d7");
    expect(assetHash("cat-happy.png")).toBe("8fa2de4ceceb74ea35d8ff92f86962d55673548d7d69dffc32b2ab6680eb27ef");
  });
});
