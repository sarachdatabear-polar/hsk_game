# Street Polish (pre-launch) — Design

_Date: 2026-07-25 · Status: approved (owner delegated: "follow your recommend") ·
Target branch: `development` · Ships before/at the 26 Jul web launch._

## Goal

Jordan's verdict on the live Street: "feels not finished design yet" — confirmed on all
four axes (decorations don't pop, dead space, scene needs more life, features feel
stubby). This spec is the **pre-launch polish slice only**: existing art, small diffs,
low risk. The art-gated scene layer (canvas expansion, neighbours, construction) moves
via a separate art shot-list; mechanics depth gets its own brainstorm post-launch.

## Evidence (probe `game/.superpowers/street-look-probe.mjs`, live v118, 390×844)

- With 2 decorations placed, neither is findable in the scene at a glance.
- With all 15 auto-arranged, they read as ant-sized trinkets against backdrop art whose
  baked-in props are 150–300px tall.
- After editor **Done**, the scene renders ~1/1 with a large beige dead zone below it
  until the player navigates away and back.

## Item 1 — Fix: stale scene size after leaving the editor (bug)

**Root cause (diagnosed):** `renderStreet()` (`src/ui/street-screen.js:600`) measures
`world.clientHeight` at the top of the render, but the `street-editing` class that
switches `.street-world` between `aspect-ratio:1/1` (editing) and `13/20` (viewing,
≥780px portrait) is only toggled at the bottom of the same render
(`renderStreetEditor()`, line 822). Leaving the editor therefore sizes the canvas
against the *old* square box; the class flips afterwards and nothing re-measures.

**Fix:** hoist the `street-editing` class toggle (and its `streetEdit`-dependent state)
to the top of `renderStreet()`, before the `clientHeight`/`clientWidth` reads, so
measurement always sees the final CSS state. `renderStreetEditor()` keeps the rest of
its DOM work; the toggle simply moves.

**Verify:** extend the street-look probe: enter editor → Done → assert
`#s-street.street-editing` is absent AND `.street-world` box height grew back to the
non-editing aspect (±2px) without navigating away; before/after screenshots.

## Item 2 — Decorations pop: scale + depth pass

**Problem quantified:** `streetWorldMetrics` unit = `min(vh*0.22, vw*0.085)` → 33px on
a 390px viewport. Front-lane medium deco = 33 × 1.0 (CLASS_SIZE) × 1.0 (laneScale) ×
1.5 (DECO_SPRITE_SCALE) ≈ 50px. The player's layer loses to the backdrop by 3–6×.

**Change (constants in `src/street.js`, tuned visually via the probe):**

- Raise the width-bound unit fraction in `streetWorldMetrics` from `0.085` toward
  `~0.12–0.13` (target: front-lane medium deco ≈ 15–18% of scene height ≈ 90–110px on
  a 600px scene).
- Widen lane-depth contrast so the front lane clearly owns the foreground:
  `back 0.68 → ~0.60`, `mid 0.84` stays, `front 1.0` stays (tune by eye).
- Overlapping sprites are acceptable and desirable (market-street density); painter's
  order already sorts far→near. Nothing may clip at the scene edges; the resident cat
  must remain unobscured on its ground line.
- Editor tap targets are the 44px plot hit areas, not sprites — unaffected; confirm in
  the probe that the plot grid still renders tappable (no target under 44px).

**Explicitly not in this pass:** backdrop dim/scrim experiment (only if the size pass
alone still fails Jordan's eye), new glow/outline treatments (contact shadows and
completed-set glow already exist), any new art.

**Verify:** probe screenshots at 390×844, 360×640, and 820×1180 for the three seeded
states (fresh / 2 placed / all 15 placed), lead reviews before ship; unit tests updated
for any exported constant changes.

## Deferred (recorded, not in this slice)

- Global `.toast-pop` overlapping the header for ~2s on first street visit — app-wide
  transient-toast behavior, cosmetic; not worth touching the day before launch.
- Ambient "life" micro-behaviors (resident reacting to placed items, flicker) —
  post-launch, alongside the mechanics-depth brainstorm.
- B/C art layer — blocked on the owner art batch; see the companion art shot-list doc.

## Testing / ship

Vitest for changed pure constants + any extracted helpers; probe-driven visual review
for both items (screenshots reviewed by lead before release); full `npm test`, lint,
build; SHELL bump v118→v119 **with the pinned `sw-precache` guard updated in the same
commit and the suite re-run after** (v117 lesson).
