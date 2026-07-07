import { describe, it, expect } from "vitest";
import { CATALOG, SKIN_PALETTES } from "../src/shop.js";
import { SPRITE_NAMES } from "../src/sprites.js";

// PRD v7 §5: registry entries land with the code so art drops in later with
// zero code changes. Every purchasable skin/backdrop must be pre-registered.
describe("shop <-> sprite registry", () => {
  it("every skin has a palette with a registered walk+happy sheet", () => {
    for (const s of CATALOG.filter(i => i.type === "skin")) {
      const pal = SKIN_PALETTES[s.id];
      expect(pal, `SKIN_PALETTES missing ${s.id}`).toBeTruthy();
      expect(typeof pal.filter).toBe("string");
      expect(SPRITE_NAMES, `${pal.sprite}-walk`).toContain(pal.sprite + "-walk");
      expect(SPRITE_NAMES, `${pal.sprite}-happy`).toContain(pal.sprite + "-happy");
    }
  });

  it("every backdrop has its bg-<id> sprite registered", () => {
    for (const b of CATALOG.filter(i => i.type === "backdrop")) {
      expect(SPRITE_NAMES, `bg-${b.id}`).toContain("bg-" + b.id);
    }
  });
});
