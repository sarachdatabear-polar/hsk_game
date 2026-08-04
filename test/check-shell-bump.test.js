import { describe, it, expect } from "vitest";
import {
  parsePrecache,
  extractCacheVersion,
  isShellRelevant,
  classifyChangedFiles,
  decideGuard,
  missingBeforeShaReason,
} from "../scripts/check-shell-bump.mjs";

describe("check-shell-bump: parsing helpers", () => {
  it("parses a PRECACHE array literal out of sw.js-shaped source", () => {
    const src = `const PRECACHE = [\n  "index.html", "dist/app.js",\n  "assets/foo.png"\n];\n`;
    expect(parsePrecache(src)).toEqual(["index.html", "dist/app.js", "assets/foo.png"]);
  });

  it("returns an empty array when there is no PRECACHE array", () => {
    expect(parsePrecache("const OTHER = [];")).toEqual([]);
  });

  it("extracts CACHE_VERSION", () => {
    expect(extractCacheVersion('const CACHE_VERSION = "v151";')).toBe("v151");
  });

  it("returns null when CACHE_VERSION is absent", () => {
    expect(extractCacheVersion("const OTHER = 1;")).toBeNull();
  });
});

describe("check-shell-bump: isShellRelevant / classifyChangedFiles", () => {
  const precacheSet = new Set(["index.html", "assets/cat-walk.png", "data/words.js"]);

  it("treats sw.js as always relevant", () => {
    expect(isShellRelevant("sw.js", precacheSet)).toBe(true);
  });

  it("treats index.html as always relevant", () => {
    expect(isShellRelevant("index.html", precacheSet)).toBe(true);
  });

  it("treats any dist/** path as relevant", () => {
    expect(isShellRelevant("dist/app.js", precacheSet)).toBe(true);
    expect(isShellRelevant("dist/nested/chunk.js", precacheSet)).toBe(true);
  });

  it("treats a PRECACHE-listed path as relevant", () => {
    expect(isShellRelevant("assets/cat-walk.png", precacheSet)).toBe(true);
  });

  it("treats a path outside PRECACHE/sw.js/index.html/dist as irrelevant", () => {
    expect(isShellRelevant("src/main.js", precacheSet)).toBe(false);
    expect(isShellRelevant("docs/history/foo.md", precacheSet)).toBe(false);
    expect(isShellRelevant("assets/not-precached.png", precacheSet)).toBe(false);
  });

  it("classifyChangedFiles filters a change list down to the relevant subset", () => {
    const changed = ["src/main.js", "sw.js", "docs/history/foo.md", "assets/cat-walk.png"];
    expect(classifyChangedFiles(changed, precacheSet)).toEqual(["sw.js", "assets/cat-walk.png"]);
  });
});

describe("check-shell-bump: decideGuard", () => {
  const precacheSet = new Set(["assets/cat-walk.png"]);

  it("passes when a shell-relevant file changed and CACHE_VERSION was bumped", () => {
    const decision = decideGuard({
      changedFiles: ["sw.js"],
      precacheSet,
      versionBefore: "v151",
      versionAfter: "v152",
    });
    expect(decision.ok).toBe(true);
    expect(decision.message).toMatch(/bumped/i);
  });

  it("fails when a shell-relevant file changed and CACHE_VERSION was NOT bumped", () => {
    const decision = decideGuard({
      changedFiles: ["index.html", "src/main.js"],
      precacheSet,
      versionBefore: "v151",
      versionAfter: "v151",
    });
    expect(decision.ok).toBe(false);
    expect(decision.message).toContain("index.html");
    expect(decision.message).not.toContain("src/main.js");
    expect(decision.message).toMatch(/bump CACHE_VERSION/i);
  });

  it("passes when only shell-irrelevant files changed, regardless of CACHE_VERSION", () => {
    const decision = decideGuard({
      changedFiles: ["src/main.js", "docs/history/foo.md"],
      precacheSet,
      versionBefore: "v151",
      versionAfter: "v151",
    });
    expect(decision.ok).toBe(true);
    expect(decision.relevant).toEqual([]);
    expect(decision.message).toMatch(/docs-only/i);
  });

  it("treats a PRECACHE-listed asset path as relevant on its own (not just sw.js/index.html/dist)", () => {
    const decision = decideGuard({
      changedFiles: ["assets/cat-walk.png"],
      precacheSet,
      versionBefore: "v151",
      versionAfter: "v151",
    });
    expect(decision.ok).toBe(false);
    expect(decision.relevant).toEqual(["assets/cat-walk.png"]);
  });

  it("passes when sw.js itself is the only changed file and CACHE_VERSION moved", () => {
    const decision = decideGuard({
      changedFiles: ["sw.js"],
      precacheSet,
      versionBefore: "v151",
      versionAfter: "v152",
    });
    expect(decision.ok).toBe(true);
  });
});

describe("check-shell-bump: missingBeforeShaReason (skip conditions)", () => {
  it("flags an undefined beforeSha (no argv passed)", () => {
    expect(missingBeforeShaReason(undefined)).toMatch(/no usable beforeSha/);
  });

  it("flags an empty-string beforeSha", () => {
    expect(missingBeforeShaReason("")).toMatch(/no usable beforeSha/);
  });

  it("flags the all-zeros sha GitHub sends for a branch-creation/force-push event", () => {
    expect(missingBeforeShaReason("0".repeat(40))).toMatch(/no usable beforeSha/);
  });

  it("does not flag a real-looking sha", () => {
    expect(missingBeforeShaReason("a1b2c3d4e5f60718293a4b5c6d7e8f901234567")).toBeNull();
  });
});
