import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../assets/asset-manifest.json", import.meta.url), "utf8")
);
const uiIconsSvg = readFileSync(
  new URL("../assets/ui-icons.svg", import.meta.url),
  "utf8"
);

describe("asset manifest", () => {
  it("includes every required icon id in assets/ui-icons.svg", () => {
    const missingIcons = manifest.required_icons.filter(
      iconId => !uiIconsSvg.includes(`id="${iconId}"`)
    );

    expect(missingIcons).toEqual([]);
  });
});
