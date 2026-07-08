import { describe, it, expect } from "vitest";
import { CATALOG, SKIN_PALETTES } from "../src/shop.js";
import { SPRITE_NAMES } from "../src/sprites.js";
import { PACKS } from "../src/sfx.js";
import { coinBurst } from "../src/fx.js";

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

  // A catalog soundpack whose id has no PACKS entry would silently play the
  // default pack (sfx falls back) — fail loudly here instead.
  it("every soundpack has a PACKS entry", () => {
    for (const s of CATALOG.filter(i => i.type === "soundpack")) {
      expect(Object.keys(PACKS), `PACKS missing ${s.id}`).toContain(s.id);
    }
  });

  // A catalog effect whose id coinBurst doesn't branch on would silently
  // fall through to the default gold-coin burst — assert each effect id
  // yields particle kinds distinct from the default's coin/dot mix.
  it("every effect changes the coinBurst particle kinds", () => {
    const defaultKinds = new Set(coinBurst(0, 0, false).map(p => p.kind));
    for (const e of CATALOG.filter(i => i.type === "effect")) {
      const kinds = new Set(coinBurst(0, 0, false, e.id).map(p => p.kind));
      expect(kinds, `coinBurst ignores effect '${e.id}'`).not.toEqual(defaultKinds);
    }
  });
});
