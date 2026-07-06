import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

// Every SVG the extracted-pack integration ships. Baked text is forbidden:
// the UI is trilingual with a live language toggle, so labels must stay live text.
const PACK_SVGS = [
  "ui-button-primary.svg", "ui-button-secondary.svg", "ui-button-neutral.svg",
  "ui-button-neutral-disabled.svg", "ui-button-danger.svg", "ui-button-start.svg",
  "ui-tag.svg", "ui-badge-mastery.svg", "ui-panel.svg", "ui-word-plaque.svg",
  "ui-icon-tile.svg", "ui-progress-track.svg", "ui-progress-fill.svg",
  "fx-correct.svg", "fx-wrong.svg", "fx-critical.svg",
  "vfx-orb-green.svg", "vfx-orb-red.svg", "vfx-orb-blue.svg", "vfx-orb-gold.svg",
];

describe("extracted-pack production assets", () => {
  for (const file of PACK_SVGS) {
    it(`${file} exists and has no baked <text>`, () => {
      const path = join(ASSETS, file);
      expect(existsSync(path), `${file} missing from assets/`).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg).toContain("<svg");
      expect(svg, `${file} contains baked text`).not.toMatch(/<text[\s>]/);
    });
  }

  it("progress fill spans the full canvas width so border-image stretch works", () => {
    const svg = readFileSync(join(ASSETS, "ui-progress-fill.svg"), "utf8");
    expect(svg).toMatch(/width="400"/);
    expect(svg).not.toMatch(/width="289\.5"/); // the baked partial fill from the source file
  });
});
