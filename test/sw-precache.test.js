import { describe, it, expect, vi } from "vitest";
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

function serviceWorkerFetchHarness({ cachedResponse = null, networkResponse, putImpl, openImpl } = {}) {
  const handlers = {};
  const put = vi.fn(putImpl || (() => Promise.resolve()));
  const cache = {
    match: vi.fn(() => Promise.resolve(cachedResponse)),
    put,
    keys: vi.fn(() => Promise.resolve([])),
    delete: vi.fn(() => Promise.resolve(true)),
  };
  const caches = {
    open: vi.fn(openImpl || (() => Promise.resolve(cache))),
    match: vi.fn(() => Promise.resolve(null)),
    keys: vi.fn(() => Promise.resolve([])),
    delete: vi.fn(() => Promise.resolve(true)),
  };
  const fetch = vi.fn(() => Promise.resolve(networkResponse));
  const self = {
    location: { origin: "https://example.test" },
    clients: { claim: vi.fn(() => Promise.resolve()) },
    skipWaiting: vi.fn(() => Promise.resolve()),
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  Function("self", "caches", "fetch", "URL", swSrc)(self, caches, fetch, URL);

  async function dispatch(request) {
    let responsePromise;
    handlers.fetch({ request, respondWith(value) { responsePromise = Promise.resolve(value); } });
    return responsePromise;
  }
  return { dispatch, fetch, cache, put };
}

describe("sw.js precache list", () => {
  it("parses a non-trivial PRECACHE array", () => {
    expect(PRECACHE.length).toBeGreaterThan(20);
  });

  it("keeps the atomic offline shell within the install budget", () => {
    expect(PRECACHE.length).toBeLessThanOrEqual(74);
    // Bumped from 10MB: raccoon-wrong.png (dedicated retreat-hop sheet,
    // ~208KB) joins raccoon-walk/raccoon-happy in the default battle-loop
    // precache set (Jordan art drop, 2026-07-21).
    // The portrait-safe Street background is now part of the default shell;
    // landmark cutouts remain lazy/runtime-cached like catalog decorations.
    expect(precacheBytes).toBeLessThanOrEqual(10.5 * 1024 * 1024);
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
      "assets/bg-street-portrait.png",
    ]) expect(precacheSet.has(entry), entry).toBe(true);
  });

  it("keeps optional cosmetics out of install and caches them on first use", () => {
    for (const entry of [
      "assets/cat-astronaut-walk.png", "assets/bg-island-sunset.png",
      "assets/deco-noodle-stall.png", "assets/landmark-tailor.png", "assets/tile-arcade.png",
    ]) expect(precacheSet.has(entry), entry).toBe(false);
    expect(swSrc).toContain('const CACHE_VERSION = "v114"');
    expect(swSrc).toContain("const RUNTIME = `nbhsk-runtime-${CACHE_VERSION}`");
    expect(swSrc).toContain("cacheAfterFetch(RUNTIME, request)");
  });

  it("versions shell and runtime caches from the release value", () => {
    expect(swSrc).toContain("const SHELL = `nbhsk-shell-${CACHE_VERSION}`");
    expect(swSrc).toContain("const RUNTIME = `nbhsk-runtime-${CACHE_VERSION}`");
    expect(swSrc).not.toMatch(/nbhsk-(?:shell|runtime|audio)-v\d+/);
  });

  it("keeps the mp3 cache on its own version so shell releases don't wipe it", () => {
    // Coupling AUDIO to CACHE_VERSION (v80..v105) made the activate handler
    // delete every cached word mp3 on each release, leaving installed PWAs
    // silent offline after every update until words were re-fetched. AUDIO
    // advances only when build_audio.py regenerates the mp3 set.
    expect(swSrc).toContain("const AUDIO = `nbhsk-audio-${AUDIO_VERSION}`");
    expect(swSrc).not.toContain("nbhsk-audio-${CACHE_VERSION}");
  });

  it("fails an incomplete core install instead of swallowing missing files", () => {
    expect(swSrc).toContain("cache.addAll(PRECACHE)");
    expect(swSrc).not.toContain("c.add(u).catch");
  });
});

describe("sw.js MP3 range handling", () => {
  it("returns a network 206 response without passing it to Cache.put", async () => {
    const networkResponse = new Response("partial", {
      status: 206,
      headers: { "Content-Range": "bytes 0-6/20" },
    });
    const h = serviceWorkerFetchHarness({ networkResponse });
    const request = new Request("https://example.test/audio/test.mp3", {
      headers: { Range: "bytes=0-6" },
    });

    const response = await h.dispatch(request);

    expect(response).toBe(networkResponse);
    expect(response.status).toBe(206);
    expect(h.put).not.toHaveBeenCalled();
  });

  it("returns a valid network 200 response even when Cache.put fails", async () => {
    const networkResponse = new Response("complete", { status: 200 });
    const h = serviceWorkerFetchHarness({
      networkResponse,
      putImpl: () => Promise.reject(new Error("quota exceeded")),
    });
    const request = new Request("https://example.test/audio/test.mp3");

    const response = await h.dispatch(request);

    expect(response).toBe(networkResponse);
    expect(response.status).toBe(200);
    expect(h.put).toHaveBeenCalledTimes(1);
  });

  it("returns a valid network response when Cache Storage cannot open", async () => {
    const networkResponse = new Response("complete", { status: 200 });
    const h = serviceWorkerFetchHarness({
      networkResponse,
      openImpl: () => Promise.reject(new Error("storage unavailable")),
    });
    const request = new Request("https://example.test/audio/test.mp3");

    const response = await h.dispatch(request);

    expect(response).toBe(networkResponse);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.put).not.toHaveBeenCalled();
  });

  it("serves a cached full response for a Range request without using network", async () => {
    const cachedResponse = new Response("complete", { status: 200 });
    const h = serviceWorkerFetchHarness({ cachedResponse });
    const request = new Request("https://example.test/audio/test.mp3", {
      headers: { Range: "bytes=0-6" },
    });

    const response = await h.dispatch(request);

    expect(response).toBe(cachedResponse);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.put).not.toHaveBeenCalled();
  });
});
