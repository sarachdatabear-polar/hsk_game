import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_NAMES } from "../src/sprites.js";

// sw.js is a classic (non-module) service-worker script, so we can't import
// it — parse the PRECACHE array out of the source text instead. This guards
// the two failure modes that silently break offline mode (each cache.add is
// .catch(()=>{})-swallowed by design): entries pointing at files that don't
// exist (typos, deleted art), and runtime-referenced files missing from the
// list entirely.

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const swSrc = readFileSync(join(GAME, "sw.js"), "utf8");
const arr = swSrc.match(/const PRECACHE = \[([\s\S]*?)\];/);
const PRECACHE = [...arr[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const precacheSet = new Set(PRECACHE);

describe("sw.js precache list", () => {
  it("parses a non-trivial PRECACHE array", () => {
    expect(PRECACHE.length).toBeGreaterThan(20);
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

  it("covers every registered sprite that exists on disk", () => {
    const missing = [];
    for (const name of SPRITE_NAMES) {
      const candidates = [`assets/${name}.png`, `assets/${name}.svg`];
      const onDisk = candidates.find(p => existsSync(join(GAME, p)));
      if (onDisk && !precacheSet.has(onDisk)) missing.push(onDisk);
    }
    expect(missing, `sprites not in PRECACHE: ${missing.join(", ")}`).toEqual([]);
  });

  it("covers every integrated asset-manifest file", () => {
    const manifest = JSON.parse(readFileSync(join(GAME, "assets", "asset-manifest.json"), "utf8"));
    const items = Array.isArray(manifest) ? manifest : manifest.assets || [];
    const missing = items
      .filter(a => a.status === "integrated" && a.file)
      .map(a => `assets/${a.file}`)
      .filter(p => existsSync(join(GAME, p)) && !precacheSet.has(p));
    expect(missing, `integrated assets not in PRECACHE: ${missing.join(", ")}`).toEqual([]);
  });
});
