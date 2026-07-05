import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SPRITE_NAMES } from "../src/sprites.js";

const manifest = JSON.parse(
  readFileSync(new URL("../assets/asset-manifest.json", import.meta.url), "utf8")
);
const uiIconsSvg = readFileSync(
  new URL("../assets/ui-icons.svg", import.meta.url),
  "utf8"
);
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

const statusValues = new Set(manifest.status_values);
const pngRuntimeNames = manifest.assets
  .filter(asset => asset.file.endsWith(".png"))
  .map(asset => asset.file.replace(/\.png$/, ""));

const requiredPrecacheFiles = [
  "assets/cat-portrait.png",
  "assets/bg-results.png",
  "assets/ui-panel.png",
  "assets/ui-word-plaque.png",
  "assets/ui-button-primary.png",
  "assets/ui-button-secondary.png",
  "assets/ui-button-neutral.png",
  "assets/ui-badge.png",
  "assets/ui-progress-track.png",
  "assets/ui-progress-fill.png",
  "assets/fx-correct.png",
  "assets/fx-wrong.png",
  "assets/fx-critical.png",
  "assets/fx-level-up.png",
  "assets/fx-new-best.png",
];

describe("asset manifest", () => {
  it("uses only known asset statuses", () => {
    for (const asset of manifest.assets) {
      expect(statusValues.has(asset.status), `${asset.id} has unknown status`).toBe(true);
    }
  });

  it("registers every manifest PNG in the sprite registry", () => {
    for (const name of pngRuntimeNames) {
      expect(SPRITE_NAMES, `${name} missing from SPRITE_NAMES`).toContain(name);
    }
  });

  it("pre-caches the manifest-backed runtime shell assets with tolerant loading", () => {
    for (const file of requiredPrecacheFiles) {
      expect(sw, `${file} missing from sw.js`).toContain(file);
    }
    expect(sw).toContain("c.add(u).catch(() => {})");
  });

  it("includes every required icon id in assets/ui-icons.svg", () => {
    const missingIcons = manifest.required_icons.filter(
      iconId =>
        !new RegExp(`<symbol\\b[^>]*\\bid="${iconId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(
          uiIconsSvg
        )
    );

    expect(missingIcons).toEqual([]);
  });
});
