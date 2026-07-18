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

  it("declares a valid, default-first state set on stateful button surfaces", () => {
    const VALID_STATES = new Set(["default", "pressed", "disabled"]);
    for (const a of manifest.assets.filter(x => x.states)) {
      expect(a.states[0], `${a.id} states must start with "default"`).toBe("default");
      for (const s of a.states) {
        expect(VALID_STATES.has(s), `${a.id} unknown state "${s}"`).toBe(true);
      }
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

  it("uses an atomic core shell plus lazy runtime cache for optional P0 art", () => {
    expect(sw).toContain("cache.addAll(PRECACHE)");
    expect(sw).toContain("cacheAfterFetch(RUNTIME, request)");
    expect(sw).toContain("assets/cat-walk.png");
    expect(sw).not.toContain("assets/cat-astronaut-walk.png");
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
