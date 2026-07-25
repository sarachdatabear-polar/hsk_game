# Street v2 B/C — "your street grows into a living neighbourhood" — Design

_Date: 2026-07-25 · Status: approved (brainstorming) · Target branch: `feat/street-v2-bc` → `development`_

## Goal

The A-layer (spec `2026-07-23-street-ownership-design.md`, shipped v107) made the Street
_theirs_ with existing art only, and explicitly deferred the **new-art roadmap (B/C)** to
this spec. The full P1 art batch is now installed and approved on prod (v120): 2 wide stage
panoramas, 3 named neighbours (Pang / Tiao / Wen × walk-a/walk-b/idle/portrait), and 5
landmarks × 2 construction stages.

This layer wires that art into **one feeling**: as the player levels up, buildings rise
from construction sites and their residents move in — the street fills with life the player
earned by learning. It shifts the feeling toward _goal_ (construction) and _companion_
(neighbours), which the A-layer named as B/C's job.

**Standing rule preserved:** the Street never funds, gates, or modifies learning. All new
state derives from level or is cosmetic; nothing writes back to quests / daily / growth /
mastery / srs / boss.

## Grounding in the current code

- **Landmarks unlock by level, not purchase.** `BUILDINGS` in `src/street.js`:
  lantern-post lv5, coin-bank lv10, tailor lv20, kitten-cafe lv30, emperor-gate lv50.
  Today a landmark simply appears finished at its slot once `b.lv <= level`
  (`BUILDINGS.filter(b => b.lv <= level)`), at fixed `BUILDING_SLOTS`.
- **A 0/1/2/3 progress function already exists.** `projectStage(wallet, price)` in
  `src/street-project.js` returns 0 (<⅓), 1 (≥⅓), 2 (≥⅔), 3 (ready). Construction reuses
  this shape against level-progress instead of coins.
- **A time-of-day clock already exists.** `streetTimeOfDay(hour)` in
  `src/ui/street-screen.js` returns `morning | day | dusk | night` and already drives the
  A-layer cosmetic tint.
- **A resident walker already exists.** `streetResidentPose(nowMs, route, reducedMotion)`
  in `src/street-resident.js` poses the player's own skinned cat. Neighbours generalize this.
- **A grant-once pattern already exists.** The A-layer `setsCompleted[]` guard in
  `streetLayout` fires set-completion payoffs exactly once. Neighbour "moved in" reuses it.

## Scope — three components

### 1. Wide canvas (foundation)

The wide **day** panorama (`bg-street-wide.webp`, 2048×1024, 2:1) replaces the current
painted street base. The **night-market** panorama (`bg-street-market-wide.webp`) shows in
the evening/night. Selection reuses the existing time-of-day clock:

- `morning`, `day` → day panorama
- `dusk`, `night` → night-market panorama

The v119 street-polish pass already made the Street a horizontally-scrollable wide world
(`streetWorldMetrics`, `scroll.clientWidth`), so the 2:1 art drops into that scroll model;
on portrait phones the player sees a slice and scrolls, exactly as today. The landmark and
decoration anchors are unchanged — the panoramas' central band is deliberately empty stage
for exactly these objects.

**Loader change:** `assets.js` `load()` currently excludes `.webp` (the regex only matches
`.png|.svg`); extend it so the wide webp backdrops register in the runtime image cache.

**Fallback (file:// / decode resilience):** if a wide webp fails to load, fall back to the
current `bg-street` / `bg-street-portrait` painted base. The scene must still render with no
wide art present — matching the standing file:// constraint.

**No PRECACHE growth:** the wide backdrops are runtime-cached like other optional art, not
added to the atomic shell. No `sw.js` SHELL change is required by this component.

### 2. Construction stages (derived, not stored)

Each landmark's visible stage is a **pure function of the player's level**, measured between
the _previous_ milestone level and the landmark's own unlock level:

```
landmarkStage(level, id) -> 0 | 1 | 2 | 3
  ratio = (level - prevUnlock) / (thisUnlock - prevUnlock)   // prevUnlock = 0 for the first
  stage = projectStage-style bucket of ratio                  // 0 <⅓, 1 ≥⅓, 2 ≥⅔, 3 finished
  level >= thisUnlock -> 3 (finished)
```

Rendering per stage:

- **stage 0** — not shown yet (no "site" until the player is partway there).
- **stage 1** — `landmark-<id>-stage1.png` (scaffold).
- **stage 2** — `landmark-<id>-stage2.png` (half-built).
- **stage 3** — the existing finished `landmark-<id>.png`.

Because the stage derives from level, there is **no construction state to store, migrate, or
sync** — it self-heals if thresholds change, mirroring the A-layer's derived set logic. The
scaffold/half-built art for a not-yet-unlocked landmark reads as a "coming soon" building
site once the player is partway to it, giving the street forward motion between milestones.

Both construction-stage PNGs already pass the 120 KB decor budget and are approved in the
manifest.

### 3. Neighbours move in (the payoff)

Three named residents, each bound to one finished landmark:

| Neighbour | Character | Landmark | Unlock |
|-----------|-----------|----------|--------|
| Tiao | lop-eared rabbit courier | Coin Bank | lv10 |
| Pang | red panda shopkeeper | Tailor Shop | lv20 |
| Wen | tortoise tea-master | Kitten Café | lv30 |

Lantern Post (lv5) and Emperor's Gate (lv50) stay resident-less monuments.

- **Presence is derived from level:** a neighbour is present iff its landmark is finished
  (`level >= unlock`). Nothing stored.
- **One-time "moved in" moment:** when a building first finishes, a greeting
  (e.g. "Pang opened the Tailor Shop ✨") plus a **keepsake** drop on the A-layer shelf,
  guarded by a new stored `metNeighbours[]` — the exact grant-once shape as `setsCompleted[]`.
  The greeting surfaces the neighbour's **portrait** art (`neighbour-<id>-portrait.png`).
  The keepsake may display an already-mastered word (read-only snapshot, per the A-layer
  keepsake rule); it never touches learning state.
- **Living presence:** once resident, each neighbour lives near their building — mostly idle
  at an anchor by the landmark, with an occasional short walk using their walk-a/walk-b
  **passing-pose** 2-frame cycle. Driven by a pose helper generalized from
  `streetResidentPose`; reduced-motion pins them to a calm idle. The player's own resident
  cat is unchanged; neighbours are additional walkers.

**Deferred (not this layer):** neighbours leaving _periodic_ letters/gifts beyond the
move-in keepsake (would touch the daily-surprise mechanic — YAGNI for now).

## Architecture

Repo idioms (AGENTS.md): pure logic in small tested modules; wiring extends
`src/ui/street-screen.js`; **`main.js` stays frozen** beyond its existing
`createStreetScreen(deps)` seam.

### New pure modules (each with a `test/*.test.js`)

- **`src/street-construction.js`**
  ```
  LANDMARK_UNLOCKS            // derived from BUILDINGS (id -> lv, plus prev lv)
  landmarkStage(level, id) -> 0|1|2|3        // scaffold/half/finished bucket
  constructionSprite(id, stage) -> assetId | null   // stage1/stage2/finished/none
  ```
- **`src/street-neighbours.js`**
  ```
  NEIGHBOURS                                  // [{id, landmarkId, unlock, anchor}]
  residentNeighbours(level) -> [neighbourId]  // buildings finished at this level
  newlyMovedIn(level, met) -> [neighbourId]   // grant-once diff for the greeting+keepsake
  neighbourPose(nowMs, anchor, reducedMotion) -> { x, facing, sprite }
      // sprite ∈ "walk-a" | "walk-b" | "idle"; the caller draws that one 512² PNG
      // (neighbours are `character`-type single images, not sprite-sheets)
  ```
- **`src/street-backdrop.js`**
  ```
  backdropFor(timeOfDay) -> "day" | "market"  // maps morning/day -> day, dusk/night -> market
  backdropAsset(kind) -> "bg-street-wide" | "bg-street-market-wide"
  ```

### Wiring in `street-screen.js`

- Pick + draw the wide backdrop by time-of-day (with painted-base fallback).
- Draw each landmark at its `landmarkStage` sprite instead of always-finished.
- Render resident neighbours (pose + sprite) alongside the player's cat.
- On the Street show/finish paths, call `newlyMovedIn`; for each, append the keepsake and
  surface the one-time greeting, then record the neighbour in `metNeighbours`.

### Data model — `streetLayout` v3 → v4

One new stored field:

```
{
  v: 4,
  ...all v3 fields unchanged...
  metNeighbours: []      // ["pang", ...] grant-once guard for the move-in moment
}
```

`streetProject` is unchanged. All access goes through `src/storage.js` `createStore`.

### Migration — v3 → v4

Bump `CURRENT_SCHEMA_VERSION`; append a **guarded** `{ to: <n>, up(storage) }` entry
matching the v2→v3 template: read `streetLayout`, default `metNeighbours` to `[]`, and
**silently no-op on any parse/shape failure** (a corrupt install must still boot).
`normalizeStreetLayout()` in `street.js` extends to default the field defensively.

### Cloud merge fold — `merge.js`

Extend the `streetLayout` reconciliation: `metNeighbours` → **union** (a neighbour met on
either device stays met), matching the existing `setsCompleted` union rule.

## i18n

Every new player-facing string is a `t("street.*", vars)` key with **parallel EN + TH** in
`src/i18n.js`. New keys: the three move-in greetings, the neighbour keepsake caption(s), and
any construction "coming soon"/finished caption. Copy stays kind-retention clean (no loss or
guilt framing), consistent with the A-layer daily-surprise guardrail. TH entries tagged for
native spot-check.

## Testing

- **`street-construction`** — `landmarkStage` boundaries: below-first-threshold hidden,
  ⅓/⅔ transitions, finished at unlock level, and each of the 5 landmarks' prev-threshold
  span; `constructionSprite` returns the right asset per stage (and `null` at stage 0).
- **`street-neighbours`** — `residentNeighbours` at levels 9/10/19/20/29/30/50;
  `newlyMovedIn` grant-once diff (present when crossing, empty once met); `neighbourPose`
  determinism for a fixed `nowMs` and reduced-motion idle pin.
- **`street-backdrop`** — `backdropFor` maps all four time-of-day values correctly.
- **Migration test** — a v3 fixture upgrades to v4 with `metNeighbours: []` and no data
  loss; a malformed fixture no-ops without throwing.
- **Merge test** — two-device fold: `metNeighbours` union.
- `street-screen.js` wiring stays untested-by-design; browser-verify on the VPS
  (headless Chromium) across day/night and a level that finishes a building.
- Gate on the **full** `npm test` (never masked) + `npm run lint` + `npm run build`.

## Build sequence (three plan phases)

1. **Wide canvas** — `street-backdrop.js` + `assets.js` webp loader + backdrop draw +
   fallback. Lowest risk; visible immediately.
2. **Construction stages** — `street-construction.js` + landmark draw by stage.
3. **Neighbours** — `street-neighbours.js` + `metNeighbours` (migration + merge + i18n) +
   render + move-in grant.

Each phase depends on the prior; each gates on the full test/lint/build cycle.

## Non-goals (still deferred)

- The **7 P2 themed wide panoramas** (bamboo, dragon-gate, harbor-night, etc.) — generate
  after this layer is playable.
- **Periodic neighbour letters/gifts** beyond the one-time move-in keepsake.
- **Canvas multi-lot / growing-town expansion** — a different, larger feature.
- **Any Street→learning coupling** (SRS nudges, battle bonuses) — permanent non-goal.
- **A second currency / gems.** Single `coins` faucet stays.
- **PWA shell / precache growth** — the wide backdrops are runtime-cached; no SHELL change
  is required by this layer (the release cut that ships it bumps SHELL as usual for the
  user-facing change).

## Owner taste calls — resolved in this spec

1. **Neighbour trigger:** finishing their bound landmark (not XP milestones directly, not
   set completions).
2. **Construction driver:** level-progress toward the landmark (not build-over-days, not an
   instant reveal).
3. **Wide canvas:** automatic time-of-day swap (day / night-market), not player-chosen.
4. **Neighbour ↔ landmark mapping:** Tiao→Coin Bank, Pang→Tailor, Wen→Café; Lantern Post
   and Emperor's Gate stay resident-less.
