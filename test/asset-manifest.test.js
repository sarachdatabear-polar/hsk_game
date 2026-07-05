import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REGISTRY } from "../src/assets.js";

const manifest = JSON.parse(
  readFileSync(new URL("../assets/asset-manifest.json", import.meta.url), "utf8")
);
const uiIconsSvg = readFileSync(new URL("../assets/ui-icons.svg", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

const statusValues = new Set(manifest.status_values);
const types = new Set(manifest.types);
const FRAME_TYPES = new Set(["ui-surface", "ui-frame"]);

function allFiles(asset) {
  const extra = (asset.states || [])
    .filter(s => s !== "default")
    .map(s => asset.file.replace(/\.png$/, `-${s}.png`));
  return [asset.file, ...extra];
}

describe("education asset manifest contract", () => {
  it("has a unique id for every asset", () => {
    const ids = manifest.assets.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known statuses and types", () => {
    for (const a of manifest.assets) {
      expect(statusValues.has(a.status), `${a.id} status`).toBe(true);
      expect(types.has(a.type), `${a.id} type`).toBe(true);
    }
  });

  it("declares slice on every ui-surface (null until measured, else 4 margins)", () => {
    for (const a of manifest.assets.filter(x => FRAME_TYPES.has(x.type))) {
      expect("slice" in a, `${a.id} missing slice`).toBe(true);
      if (a.slice !== null) {
        expect(Array.isArray(a.slice) && a.slice.length === 4, `${a.id} slice shape`).toBe(true);
      }
    }
  });

  it("declares the full state set on stateful button surfaces", () => {
    for (const a of manifest.assets.filter(x => x.states)) {
      expect(a.states, `${a.id} states`).toEqual(["default", "pressed", "disabled"]);
      expect(FRAME_TYPES.has(a.type), `${a.id} must be a ui-surface`).toBe(true);
    }
  });

  it("names a fallback routine for every P0 asset", () => {
    for (const a of manifest.assets.filter(x => x.priority === "P0")) {
      expect(typeof a.fallback === "string" && a.fallback.length > 0, `${a.id} fallback`).toBe(true);
    }
  });

  it("keeps sprite-sheet frame math consistent with declared size", () => {
    for (const a of manifest.assets.filter(x => x.type === "sprite-sheet" && x.w)) {
      expect(a.frameWidth * a.frames, `${a.id} frame math`).toBe(a.w);
      expect(a.frameHeight, `${a.id} frame height`).toBe(a.h);
    }
  });

  it("mirrors the manifest 1:1 into the runtime REGISTRY", () => {
    expect(Object.keys(REGISTRY).sort()).toEqual(manifest.assets.map(a => a.id).sort());
  });

  it("pre-caches every P0 PNG (incl. state variants) tolerantly in sw.js", () => {
    const p0 = manifest.assets.filter(a => a.priority === "P0" && a.file.endsWith(".png"));
    for (const a of p0) {
      for (const f of allFiles(a)) {
        expect(sw, `assets/${f} missing from sw.js PRECACHE`).toContain(`assets/${f}`);
      }
    }
    expect(sw).toContain("c.add(u).catch(() => {})");
  });

  it("includes every required icon id in assets/ui-icons.svg", () => {
    const missing = manifest.required_icons.filter(
      id => !new RegExp(`<symbol\\b[^>]*\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(uiIconsSvg)
    );
    expect(missing).toEqual([]);
  });

  it("keeps planned icons disjoint from required icons", () => {
    for (const id of manifest.planned_icons) {
      expect(manifest.required_icons, `${id} both planned and required`).not.toContain(id);
    }
  });
});
