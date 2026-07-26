# Street Mechanics-Depth v1 — "Build the Neighbourhood" (bricks)

**Date:** 2026-07-26
**Status:** Design approved (owner: Jordan). Next step: implementation plan.
**Topic:** Add the deferred fourth Street axis — *mechanics-depth* — as a one-directional
learning→build loop, without violating the "Street never touches learning" boundary.

## Problem

The Street is currently a **diorama, not a loop**. Everything is passive display:
decorations are bought and placed, sets complete, neighbours move in *by level*, a daily
coin gift lands, layouts are named/saved. Critically, `landmarkStage(level, id)`
(`src/street-construction.js`) is a **pure function of level with zero stored state** — the
player crosses a level and a building silently jumps scaffold→half→finished. There is no
action the player takes *inside* the Street that advances it. That is the missing "depth."

The three previously-shipped axes were pop (v119), dead-space (v119), and life (v120/v121
B/C neighbourhood). Mechanics-depth was deliberately deferred to a post-launch brainstorm.

## Goal

A progression **sink that rewards learning**: the neighbourhood visibly grows *because you
study*, and the player has **agency** in that growth. One sentence:

> You study → earn **bricks** → spend them to raise a landmark scaffold→half→finished → the
> neighbour moves into the home **you built**.

### Non-goals (explicitly OUT of v1 — keeps this shippable, not a balloon)

- No brick *sinks* other than landmark construction (no brick-priced decorations, no
  gambling, no consumables).
- No neighbour requests / chores / interaction loops (that was the guardrail-risky option —
  it edges toward coupling with learning and toward "chore" feeling).
- No new full-screen UI. The build affordance lives on the existing Street scene.
- No complex economy balancing beyond a single tunable constants block.

## Hard constraints (non-negotiable, inherited from the codebase)

1. **One-directional coupling.** Learning produces bricks; the Street *reads and spends* a
   brick balance. The Street must **never** write to mastery, never gate learning behind
   Street state, never read mastery for anything but a display/earn signal handed to it.
   This mirrors how coins already work (earned in the battle loop, spent in the Street).
2. **Kind-retention guardrail.** Bricks only ever accrue. No decay, no timers, no daily
   loss, no "you're behind" copy. Building is always optional; not building is never
   punished.
3. **`main.js` is frozen at current scope.** New logic goes in a small pure module
   (`src/bricks.js`) + `src/ui/street-screen.js` wiring. The only `main.js` delta is a few
   lines awarding bricks at the existing result sites — the exact same shape as the existing
   `wallet += r.earned; store.set("wallet", wallet)` lines (awarding an existing-style
   currency at an existing seam, not new-feature wiring).
4. **Stored-shape changes require a migration.** Adding per-landmark stage to `streetLayout`
   bumps `CURRENT_SCHEMA_VERSION` 4→5 with a guarded ladder entry (the pattern already used
   through v4).
5. **Persistence goes through `src/storage.js`**; new synced keys are added to `SYNC_KEYS`
   in `merge.js` with an explicit merge rule.

## Design

### 1. Resource — bricks

- A new **top-level synced counter**, stored exactly the way coins/`wallet` are:
  `store.get("bricks", 0)` / `store.set("bricks", …)`. Because it is a brand-new key that
  defaults to `0`, **no migration is needed for the counter itself** (old installs read the
  default). Added to `SYNC_KEYS` in `merge.js`.
- **Merge rule across devices:** `max` (same family as a monotonic currency; never lets a
  stale device lower the balance). Note: this can under-count if two devices both earn
  offline, but it never *loses* progress below the higher device — an acceptable, safe
  bias consistent with the "bricks only accrue" guardrail. (Follow whatever `wallet`
  already does if it differs; match it.)
- **Earned from learning**, computed by `src/bricks.js` and added in `main.js` at the same
  result sites that already do `wallet += r.earned`:
  - **+2 bricks per word that reaches mastery (streak ≥ 3) during the round** — the primary,
    learning-tied source. This is the design's soul: bricks reward the *milestone of
    learning a word*, distinct from coins (which reward per-answer performance and are the
    decoration currency). The plan pins the exact "newly-mastered this round" accessor from
    the mastery system; if that count is genuinely unavailable without touching frozen
    internals, fall back to **+1 brick per correct answer, capped per round** (still
    learning-linked). The primary model is preferred.
  - **+1 brick flat per completed round/session** — a gentle baseline so bricks flow even
    before a player masters anything, so the build loop is discoverable early.
- Displayed as a small chip on the Street (next to the existing coin/wallet chip).

### 2. Build mechanic

- Tapping a **buildable landmark plot** spends bricks to advance it **one construction
  stage** (0→1→2→3). Each advance plays the existing v121 stage art via
  `constructionSprite(id, stage)` (`landmark-<id>-stage1/2`, then `landmark-<id>` at
  stage 3) — **we reuse shipped art**; only the *driver* of the transition changes from
  "level auto-jumps it" to "the player builds it."
- **Cost per stage (initial tuning constants, single source in `src/bricks.js`):**
  `BRICK_STAGE_COST = [8, 12, 16]` — index = the stage being *entered* (0→1 costs 8, 1→2
  costs 12, 2→3 costs 16; 36 bricks to fully build one landmark). Flat across all five
  landmarks in v1; the array is the tuning knob. Rationale: an early learner mastering
  ~5–15 words/session earns ~10–30 bricks/session, so a landmark is ~1–2 sessions of study —
  a meaningful but reachable meta-goal.
- If the player lacks bricks, the affordance shows the cost and is inert (no scary/negative
  copy — just "Build · 12 🧱"). Spending is atomic and pure (`advanceLandmark`), routed
  through `store.set` like every other Street mutation.

### 3. Level's role: unlocker, not builder

- Level still gates **availability**: a landmark's plot opens for building when
  `level >= unlockLv` (its existing `BUILDINGS[i].lv`). Below that, the plot shows a locked
  "Opens at level N" state — this *replaces* the old passive "rises as you approach"
  below-unlock preview. That preview was itself passive eye-candy; trading it for
  player-driven building is the whole point and is called out here as an intended change.
- **Stage becomes stored per-landmark**, not level-derived. `streetLayout` gains
  `builtStages` (a map of landmark id → integer stage 0–3), normalized by
  `normalizeStreetLayout`. `landmarkStage` is refactored to read this stored stage. The old
  level-derived logic is no longer used at runtime; the v4→v5 migration (§5) back-fills the
  stored stages once from level, using a simple binary rule (see below) rather than the old
  partial-stage buckets — so there is no lingering level-vs-stored ambiguity.

### 4. Neighbours move in when *you finish their building*

- Retie the v121 move-in trigger from "level crossed threshold" to
  "`builtStages[neighbourBuilding]` reached **3**." The one-time grant + portrait greeting
  (v121, `metNeighbours` guard, `#neighbour-greet`) is unchanged; only its *trigger* moves.
  This is strictly more satisfying — the neighbour arrives because you built their home.
- The two landmarks without a neighbour (lantern-post lv5, emperor-gate lv50) simply build
  with no move-in. Neighbour→building map is the existing v121 one (Tiao→coin-bank,
  Pang→tailor, Wen→kitten-café).

### 5. Storage & migration (v4→v5)

- **New field:** `streetLayout.builtStages` — `{ [landmarkId]: 0|1|2|3 }`.
- **Migration `to: 5`** (guarded, additive, following the exact ladder pattern in
  `src/migrations.js`): for existing saves, seed each landmark's stored stage from the
  player's **current** visible state so nothing regresses:
  `builtStages[id] = (currentLevel >= BUILDINGS[id].lv) ? 3 : 0`.
  A player who already reached a landmark's unlock level keeps it finished; landmarks not
  yet reached start at 0 and open for brick-building going forward. Existing players who
  already met neighbours are still guarded by `metNeighbours` (no re-fire).
- **`normalizeStreetLayout`** defaults `builtStages` to `{}` and clamps each value to 0–3.
- **Sync merge:** `builtStages` merges **per-landmark `max`** (a device can never *un-build*
  another's progress), folded in alongside the existing `metNeighbours`/`setsCompleted`
  union merges.

### 6. Modules & boundaries

| File | Change |
|------|--------|
| `src/bricks.js` **(new, pure)** | `bricksForRound({ masteredThisRound, completed })` (earn calc), `BRICK_STAGE_COST`, `landmarkBuildCost(stage)`, `landmarkBuildable(level, id, builtStages)`, `advanceLandmark(builtStages, id, bricks, level)` → `{ builtStages, bricks, ok, reachedStage }`. No DOM, no storage — fully unit-tested. |
| `src/street-construction.js` | `landmarkStage` reads stored stage (old level-derived logic removed — the v4→v5 migration §5 back-fills stored stages once). `constructionSprite` unchanged. |
| `src/street.js` | `streetLayout` default + `normalizeStreetLayout` gain `builtStages`. |
| `src/migrations.js` | `CURRENT_SCHEMA_VERSION` 4→5 + `{ to: 5, up }` back-fill entry. |
| `src/merge.js` | add `bricks` to `SYNC_KEYS`; add `builtStages` per-landmark `max` fold. |
| `src/ui/street-screen.js` | bricks chip; buildable-plot affordance + spend handler; retie neighbour grant to stage-3 completion; play stage-advance animation via existing reveal path. |
| `src/main.js` | at the existing battle/tone result sites, `bricks += bricksForRound(...); store.set("bricks", bricks)` — minimal, mirrors the `wallet` lines. |
| `src/i18n.js` | EN + TH strings: bricks label, build button, "opens at level N", (reuse existing neighbour-moved-in copy). TH strings tagged `TH-REVIEW`. |

### 7. Testing

- `test/bricks.test.js` (new): earn calc (mastery + completion, fallback path), cost table,
  `landmarkBuildable` gating by level and by already-finished, `advanceLandmark`
  happy/insufficient-bricks/already-maxed/atomicity, and that it never mutates inputs.
- `test/migrations.test.js`: append v4→v5 ladder test — seeds finished landmarks from level,
  leaves unreached at 0, idempotent, guarded on malformed input.
- `test/street.test.js`: `normalizeStreetLayout` defaults/clamps `builtStages`.
- `test/merge.test.js`: `bricks` max-merge; `builtStages` per-landmark max-merge.
- `street-screen.js` wiring is browser-verified (headless Chromium), not unit-tested (per
  the untested-wiring convention).

## Risks / open items (non-blocking)

- **Earn accessor:** the exact "words mastered this round" signal in `main.js` must be
  located; fallback (per-correct-answer, capped) is specified if it's not cleanly available.
- **Balance:** initial `BRICK_STAGE_COST` + earn rates are first-pass; the constants block is
  the single tuning point. Owner playtest on device is the real calibration.
- **Below-unlock preview removed:** the passive "building rises as you approach" visual is
  intentionally replaced by the locked plot + player build. Called out so it isn't a
  surprise regression.

## Release

Standard cut: SHELL bump (`v122`→`v123`) + `sw-precache` pin in the same commit, full suite
re-run after the bump, `development`→`main`, verify Pages + live `sw.js`. Owner-gated on
Jordan's "ship."
