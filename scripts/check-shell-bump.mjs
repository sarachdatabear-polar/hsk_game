#!/usr/bin/env node
// CI guard: shipping a shell-relevant change (sw.js, index.html, dist/**, or
// anything sw.js's own PRECACHE array lists) without bumping CACHE_VERSION in
// sw.js means every installed PWA byte-diffs the unchanged sw.js and never
// re-fetches the new shell — it stays on the old cached app indefinitely.
// test/sw-precache.test.js pins the CURRENT CACHE_VERSION string (a
// release-ritual guard) but can't detect a *missing* bump on the next
// release; this script is the CI-time check for that.
//
// Usage: node scripts/check-shell-bump.mjs <beforeSha>
// <beforeSha> is the workflow's `${{ github.event.before }}` — the commit the
// pushed branch pointed at before this push. Missing history (shallow clone,
// force-push, first push on a branch) must never block a deploy: this script
// exits 0 with a "skipped: <why>" message whenever it can't do the diff.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- Pure logic (exported for the vitest file — no git involved below) ----

// Reuses the same parse approach as test/sw-precache.test.js: sw.js is a
// classic (non-module) service-worker script, so its PRECACHE array is
// scraped out of the source text rather than imported.
export function parsePrecache(swSrc) {
  const m = swSrc.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
}

export function extractCacheVersion(swSrc) {
  const m = swSrc.match(/const CACHE_VERSION = "([^"]+)"/);
  return m ? m[1] : null;
}

// sw.js and index.html are always shell-relevant (the service worker script
// itself, and the document it precaches as the offline navigation fallback).
// dist/** is the bundled app.js the shell serves cache-first. Anything else
// only matters if sw.js's own PRECACHE array lists it.
export function isShellRelevant(path, precacheSet) {
  if (path === "sw.js" || path === "index.html") return true;
  if (path.startsWith("dist/")) return true;
  return precacheSet.has(path);
}

export function classifyChangedFiles(changedFiles, precacheSet) {
  return changedFiles.filter(f => isShellRelevant(f, precacheSet));
}

// The decision: no shell-relevant file changed -> fine (docs-only push).
// Shell-relevant files changed and CACHE_VERSION moved -> fine (bumped).
// Shell-relevant files changed and CACHE_VERSION did NOT move -> fail.
export function decideGuard({ changedFiles, precacheSet, versionBefore, versionAfter }) {
  const relevant = classifyChangedFiles(changedFiles, precacheSet);
  if (relevant.length === 0) {
    return { ok: true, relevant, message: "docs-only push (no shell-relevant files changed) — skipping" };
  }
  if (versionBefore !== versionAfter) {
    return { ok: true, relevant, message: `CACHE_VERSION bumped (${versionBefore} -> ${versionAfter}) — ok` };
  }
  return {
    ok: false,
    relevant,
    message:
      `shell-relevant file(s) changed without a CACHE_VERSION bump: ${relevant.join(", ")}\n` +
      `CACHE_VERSION is still "${versionAfter}".\n` +
      `Fix: bump CACHE_VERSION in sw.js — installed PWAs will not fetch this deploy otherwise.`,
  };
}

// A missing/all-zero beforeSha means "no prior commit to diff against" (first
// push on a branch, or a force-push GitHub reports as all-zeros) — never a
// reason to fail the deploy. Pulled out as a pure function so the vitest file
// can cover the skip conditions without shelling out to git.
export function missingBeforeShaReason(beforeSha) {
  if (!beforeSha || /^0+$/.test(beforeSha)) {
    return `no usable beforeSha ("${beforeSha}") — first push or force-push on this branch`;
  }
  return null;
}

// ---- Git plumbing (thin) ----

function run(args) {
  return execFileSync("git", args, { cwd: GAME, encoding: "utf8" }).trim();
}

function commitExists(sha) {
  try {
    run(["cat-file", "-e", `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function skip(reason) {
  console.log(`check-shell-bump: skipped: ${reason}`);
  process.exit(0);
}

function main() {
  const beforeSha = process.argv[2];

  const missingReason = missingBeforeShaReason(beforeSha);
  if (missingReason) {
    skip(missingReason);
    return;
  }

  if (!commitExists(beforeSha)) {
    // Shallow clone likely missing the object — try deepening once before
    // giving up. actions/checkout defaults to fetch-depth: 1.
    try {
      run(["fetch", "--depth=2", "origin", beforeSha]);
    } catch {
      /* best effort; fall through to the existence recheck */
    }
  }

  if (!commitExists(beforeSha)) {
    skip(`beforeSha ${beforeSha} not present in local history (shallow clone) — can't diff`);
    return;
  }

  const changedFiles = run(["diff", "--name-only", `${beforeSha}..HEAD`])
    .split("\n")
    .filter(Boolean);

  const swSrcAfter = readFileSync(join(GAME, "sw.js"), "utf8");
  const precacheSet = new Set(parsePrecache(swSrcAfter));
  const versionAfter = extractCacheVersion(swSrcAfter);

  let versionBefore = null;
  try {
    const swSrcBefore = run(["show", `${beforeSha}:sw.js`]);
    versionBefore = extractCacheVersion(swSrcBefore);
  } catch {
    // sw.js didn't exist at beforeSha (e.g. newly added) — treat as "no prior
    // version", which the decision below treats as a version change (fine).
    versionBefore = null;
  }

  const decision = decideGuard({ changedFiles, precacheSet, versionBefore, versionAfter });
  console.log(`check-shell-bump: ${decision.message}`);
  process.exit(decision.ok ? 0 : 1);
}

// Only run the CLI when executed directly, not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
