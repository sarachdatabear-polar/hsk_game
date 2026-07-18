import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// sw.js is a classic (non-module) service-worker script, so we can't import
// it — parse the PRECACHE array out of the source text instead. PRECACHE is
// the atomic boot/play shell; optional art is cached on first use by RUNTIME.

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const swSrc = readFileSync(join(GAME, "sw.js"), "utf8");
const arr = swSrc.match(/const PRECACHE = \[([\s\S]*?)\];/);
const PRECACHE = [...arr[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const precacheSet = new Set(PRECACHE);
const precacheBytes = PRECACHE.reduce((sum, entry) => sum + readFileSync(join(GAME, entry)).byteLength, 0);

describe("sw.js precache list", () => {
  it("parses a non-trivial PRECACHE array", () => {
    expect(PRECACHE.length).toBeGreaterThan(20);
  });

  it("keeps the atomic offline shell within the install budget", () => {
    expect(PRECACHE.length).toBeLessThanOrEqual(70);
    expect(precacheBytes).toBeLessThanOrEqual(10 * 1024 * 1024);
  });

  for (const entry of PRECACHE) {
    it(`${entry} exists on disk`, () => {
      expect(existsSync(join(GAME, entry)), `${entry} is precached but missing on disk`).toBe(true);
    });
  }

  it("covers every asset URL referenced by index.html CSS (backgrounds + fonts)", () => {
    const html = readFileSync(join(GAME, "index.html"), "utf8");
    const refs = [...html.matchAll(/url\(["']?(assets\/[^"')]+)["']?\)/g)].map(m => m[1]);
    const missing = [...new Set(refs)].filter(r => !precacheSet.has(r));
    expect(missing, `index.html references assets not in PRECACHE: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps the default playable loop in the atomic shell", () => {
    for (const entry of [
      "data/words.js", "assets/cat-walk.png", "assets/raccoon-walk.png",
      "assets/bg-battle.png", "assets/ui-word-plaque.svg", "assets/bg-home.webp",
    ]) expect(precacheSet.has(entry), entry).toBe(true);
  });

  it("keeps optional cosmetics out of install and caches them on first use", () => {
    for (const entry of [
      "assets/cat-astronaut-walk.png", "assets/bg-island-sunset.png",
      "assets/deco-noodle-stall.png", "assets/tile-arcade.png",
    ]) expect(precacheSet.has(entry), entry).toBe(false);
    expect(swSrc).toContain('const CACHE_VERSION = "v81"');
    expect(swSrc).toContain("const RUNTIME = `nbhsk-runtime-${CACHE_VERSION}`");
    expect(swSrc).toContain("cacheAfterFetch(RUNTIME, request)");
  });

  it("versions shell, runtime, and audio caches from the same release value", () => {
    expect(swSrc).toContain("const SHELL = `nbhsk-shell-${CACHE_VERSION}`");
    expect(swSrc).toContain("const RUNTIME = `nbhsk-runtime-${CACHE_VERSION}`");
    expect(swSrc).toContain("const AUDIO = `nbhsk-audio-${CACHE_VERSION}`");
    expect(swSrc).not.toMatch(/nbhsk-(?:shell|runtime|audio)-v\d+/);
  });

  it("fails an incomplete core install instead of swallowing missing files", () => {
    expect(swSrc).toContain("cache.addAll(PRECACHE)");
    expect(swSrc).not.toContain("c.add(u).catch");
  });
});
