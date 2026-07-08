# Street Restyle Round — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Lucky Cat Street screen to the warm-daylight reference look and make its layout hold up with 15 decos + tiers (the v7 crowding follow-up).

**Architecture:** Rendering changes live in `main.js` (canvas), driven by new pure metrics in `street.js` (tested). A `bg-street.png` sprite hook lets painted art replace the procedural scene later with zero code changes (same pattern as battle backdrops). No new deps; file:// safe.

**Decision trail (owner defaults — flag in PR if any look wrong):**
1. The dark-night `paintStreetBase` is replaced by a warm-daylight procedural village scene using the STYLE-TOKENS palette (sky `#5DAADD`→cream horizon `#FBF5E8`, green hills `#32775E`, sand road `#EAC796`, warm brown fences `#846043`).
2. Crowding fix = **two depth rows** (buildings on a back line, decos on the front line) + piece size capped by slot pitch, so 20 pieces read as a layered village instead of a pile.
3. **Tier-3 flanking copies are replaced by a gold crown/pennant accent** (PRD v7 F4 explicitly allows "duplicate flanking copies / crown accent"); flanking is the main crowding driver. Tier 2 stays glow + 1.15× scale.

## Global Constraints (inherited, binding)

- Vanilla JS; markup/CSS inline in `index.html`; no new npm deps; `file://` keeps working (sprite hook must fall back procedurally).
- Pure logic in tested modules (`street.js`); `main.js` wiring/canvas only. `npm test` green throughout; DOM-id check unaffected.
- Media-tier CSS convention: any new `@media` block goes AFTER the base rules it overrides (cascade order is source-order in this file).
- Release gate: `node scripts/responsive-sweep.mjs` 10/10 (server on :8000) before the PR; SHELL bump (v31 → next free) + dist rebuild in the ship commit.
- Commits end with the Co-Authored-By trailer. Never commit `.superpowers/`, never `git add -A`, never `git stash`.

---

### Task 1: Pure street metrics (`street.js`)

**Files:** Modify `src/street.js`; Test `test/street.test.js`.

**Produces (exact):** `streetMetrics(w, h) -> { unit, backY, frontY, backScale }` — `unit = Math.min(h * 0.30, w * 0.062)` (piece height basis, capped by slot pitch so adjacent pieces at 4%-apart slots cannot overlap more than ~35%); `backY = 0.86` and `frontY = 1.0` (fractions of ground-line y that each row's feet sit on — caller computes `gy * rowY`); `backScale = 0.78` (buildings drawn smaller + behind). Deterministic, no DOM.

- [ ] TDD: tests first — unit caps switch between the h-bound (tall canvas: `streetMetrics(300, 400).unit === Math.min(120, 18.6)`) and w-bound regimes; backY < frontY; backScale < 1; all outputs finite/positive for w,h ∈ {1..2000}; two calls deep-equal.
- [ ] Implement exactly as specified; keep `streetPieces`/`streetProgress` untouched.
- [ ] `npx vitest run test/street.test.js` then `npm test` green. Commit `feat(street): pure streetMetrics for two-row layout`.

### Task 2: Warm-daylight base + `bg-street` art hook

**Files:** Modify `src/main.js` (`paintStreetBase` only), `src/sprites.js`, `assets/asset-manifest.json`, `docs/art/GENERATION-PROMPTS-P0-copypaste.md`.

- [ ] Register `"bg-street"` in `SPRITE_NAMES`; add a `status:"planned"` manifest row (`bg-street.png`, 1024×512, background type, fallback `canvas:paintStreetBase`); append a generation-prompt block (master style prompt + clause: sunny village street viewed side-on, cream sky, green hills, sand road along the bottom fifth, low detail in the middle band, no characters) — verify `find_target("bg-street.png")` resolves.
- [ ] In `renderStreet`, before `paintStreetBase`: `const bg = sprite("bg-street"); if (bg) drawCoverImage(sc, bg, 0, 0, w, h); else paintStreetBase(sc, w, h);`
- [ ] Rewrite `paintStreetBase` as the warm-daylight scene (palette above; sky gradient `#5DAADD → #BFE0F2 → #FBF5E8`, two green hill bands `#32775E` at 55–70% alpha, sun `#F2BC57` soft disc upper-left per the light rule, sand road `#EAC796` bottom band with `#846043` edge line, faint cream cloud blobs). No gold grid, no night, no neon. Keep the signature/params identical.
- [ ] Verify: screenshots at 390×844 and 360×640 (street tab, empty street + seeded full street) — warm scene, readable pieces; sweep spot-run `--battle 360x640` unaffected. `npm test` green. Commit `feat(street): warm-daylight base scene + bg-street art hook`.

### Task 3: Two-row layout + pitch-capped scale + crown tier accent

**Files:** Modify `src/main.js` (`renderStreet`, `drawTieredDeco`, `drawStreetBuilding`/`drawStreetDeco` call sites only — not the shape functions).

- [ ] `renderStreet` uses `streetMetrics(w, h)`: buildings drawn at `y = gy - h*(1 - m.backY)` with height basis `m.unit * m.backScale` and 60% alpha shadow line; decos on the front line `gy` with height basis `m.unit`. (The draw functions take an `h`-like size basis — pass the row's basis instead of raw `h` so all existing shape code scales unchanged.)
- [ ] `drawTieredDeco`: tier 2 unchanged (glow + 1.15×, cascade-safe since dc70b4e); tier 3 = tier-2 treatment PLUS a crown accent instead of flanking copies: gold pennant — small triangle flag `#F2BC57` on a `#846043` pole, planted at the piece's top-left (`x - basis*.3, top - basis*.12`), plus 3 tiny `drawStarMark` sparkles `#FFE08A` arced above. Remove the flanking-copy block.
- [ ] Verify with a seeded maxed street (all 15 decos owned, mixed tiers, level 50) at 390×844 + 360×640 + 844×390: screenshot each; pieces must not overlap more than ~1/3 of their width, both rows legible, crowns visible on tier-3 pieces; also default sparse street still looks right. Full sweep 10/10. `npm test` green. Commit `feat(street): two-row layout, pitch-capped scale, tier-3 crown accent`.

### Task 4: Ship

- [ ] Full `npm test`; `npm run build` + commit dist; SHELL v31 → v32; append round status to `docs/planning/V2-EXECUTION-PLAN.md`; sweep 10/10 output in the PR body; PR to `development` with before/after street screenshots. Update `docs/STATUS.md` (move street restyle from Planned to Done) in the same PR.

## Out of scope

- Street caption i18n (queued: i18n pass 2). Tier-specific deco *art* variants (art rounds). Interactive street/tap actions (v-next).
