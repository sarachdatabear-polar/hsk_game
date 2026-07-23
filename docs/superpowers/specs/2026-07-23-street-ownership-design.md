# Street Ownership ("The Street becomes yours") — Design

_Date: 2026-07-23 · Status: approved (brainstorming) · Target branch: `feat/street-ownership` → `development`_

## Goal

The Street looks finished but does not make a player feel **attached**. Owner's chosen
target feeling is **"a place that's proudly theirs"** — ownership, self-expression,
collection pride (the Animal Crossing / decorate-my-space lineage), with the resident cat
and a daily-return moment as _supports_ for that pride, not competing feelings.

This spec is the **A-layer**: the ownership-first pass that ships with **existing art
only**. It turns the parts of the Street that currently dead-end into things that persist
and pay off. Canvas expansion, named neighbour residents, and construction stages (which
research ranks highly but which pull the feeling toward _companion_/_goal_) are an
explicit **new-art roadmap (B/C), out of scope here** — see Non-goals.

## Why now / the precise gap (grounded in the current code)

The skeleton of "theirs" already exists — the resident is the player's own equipped skin +
kitten, and placement is authored (tap-select → tap-plot, undo, auto-arrange). What is
missing is everything that makes that authorship _pay off_:

- **Collections mean nothing.** `market` / `garden` / `festival` set tags in `DECO_META`
  are label-only; grep confirms no set-completion logic anywhere in `src/`. Owning the full
  15 decorations produces no reward and no end-state.
- **Actions leave no trace.** The tap reaction (`streetReaction`) and purchase reveal
  (`streetReveal`) are explicitly _not persisted_ — gone in ~700ms.
- **The "project" is a display-only goal.** `streetProjectProgress()` is live-wallet math;
  spend elsewhere and the meter silently regresses. No commitment, no reward.
- **No reason to return to the Street specifically**, and nothing recognisably _yours_
  beyond the cat skin.

Research across the "cozy ownership" designs (Animal Crossing, Neko Atsume, Finch) is
blunt: they all have a **name**, a **surprise**, and **visible change**. The Street has
none of the three.

## Scope — six components (existing art only)

### 1. Set-completion payoffs

Owning **every decoration tagged with a set** (`market` / `garden` / `festival`; the
`welcome` "set" is the single lantern and is excluded), at **any tier**, triggers a
**one-time** payoff, granted **exactly once** per set:

- a **plaque/banner** for that set, drawn from existing UI (nine-slice panel + text +
  existing icons — **no new art**);
- a subtle **themed glow** on the placed items of a completed set (reuse the existing
  `drawStreetBehavior` glow/ambiance primitives);
- a caption line (e.g. "Night Market complete ✨");
- a **keepsake** dropped in the shelf (component 5).

Set membership and completion are **derived from the catalog + `owned`** (not stored), so
they self-heal if the catalog changes. `setsCompleted[]` (stored) records only _which sets
have already been granted their one-time keepsake_, so the grant fires once.

**Taste call resolved:** the reward is plaque + glow + keepsake, **not a coin bonus and
not a new decoration** (a new decoration would need art). Set completion is a _pride_
payoff, not an economy faucet.

### 2. Collection book

A screen opened from the Street listing every decoration **grouped by set**: owned/unowned
(unowned shown as a locked silhouette using the existing sprite at reduced opacity — no new
art), tier stars, price, and per-set completion status. This is the _destination_ the
collecting drive currently lacks. Read-only; "buy" affordances route to the existing Street
Shop preview flow.

### 3. Name your street

A short, length-capped (≤ 24 chars), trimmed street title the player sets from the Street.
Shown in the Street caption and the post-round results readout. Empty/unset falls back to
the current generic caption. Single-player, no sharing in the A-layer, so no
profanity/moderation surface — length + trim only.

### 4. Saved layouts (×3)

Save / name / load up to **three** named arrangement slots (the un-shipped Release B item
from `PRD-street-v2.md`). Each slot stores a `placements` snapshot + a short name. Loading a
slot replaces the live `placements`. Saving over an occupied slot confirms first. Only
_placed_ decorations the player still owns are restored (a slot referencing a
sold/absent id silently drops that entry, matching the migration's defensive posture).

### 5. Keepsake shelf

A cozy shelf/book of small mementos, **cosmetic only**. Keepsakes are earned from: set
completions (1), the welcome moment, and daily visits (6). Each keepsake:

```
{ id, kind, day, word? }   // word = a hanzi string, OPTIONAL, display-only
```

A keepsake may **display** a word the player has **already mastered** (pulled from existing
mastery data at grant time), but **never drives review, scheduling, or any learning
state** — this honours the standing rule that the Street does not modify learning
(`PRD-street-v2.md` non-goal). `word` is a frozen snapshot string, not a live SRS handle.
The shelf is append-only; keepsakes are never lost.

### 6. Daily surprise (positive-only return loop)

The **first Street open on a new calendar day** surfaces a small gift left by a **passing
neighbour cat** — drawn with existing cat art recoloured via an existing `SKIN_PALETTES`
entry (**no new art**). The gift is **mostly coins, occasionally a keepsake** (taste call
resolved). Contents are **date-hashed deterministic** (same pattern as `quests.js`), so a
reload on the same day shows the same gift and cannot be farmed.

**Kind-retention guardrail (hard):** no penalty, no countdown, no "streak in danger", no
guilt copy, no reset-shame, no paid mercy item. A skipped day is simply **invisible** — the
next visit just has that day's gift. This is the one component whose copy gets an explicit
guardrail review (EN + TH).

Ambient **time-of-day lighting** (morning / day / dusk / night tint over the existing
background) makes the scene look different across visits even when no gift/unlock is
waiting — softening "nothing new today" visits. Lighting is a cosmetic canvas tint, not
stored.

### Project escrow (opt-in, adjunct to the above)

The existing "next build" project gains an **opt-in `reserve` toggle, default off**. When
on, the reserved amount (`min(wallet, price)`) is treated as _spoken for_: the Street Shop's
other purchases spend against `wallet − reserved` and the project meter no longer regresses
from unrelated spending. When off, behaviour is exactly today's (display-only math). This is
offered as a **commitment device, not a forced lock** — and because it changes `buy()`
gating, the existing `test/street-project.test.js` "does not report negative session
earnings" guarantee must be preserved for the **off** path and a new test added for the
**on** path.

## Architecture

Follows repo idioms (AGENTS.md): pure logic in small tested modules; wiring extends
`src/ui/street-screen.js`; **`main.js` is untouched** beyond its existing
`createStreetScreen(deps)` seam.

### New pure modules (each with a `test/*.test.js` counterpart)

- **`src/street-collection.js`** — set membership + completion, derived from the catalog +
  `owned`; the collection-book view model.
  ```
  setsFor(catalog) -> { market:[ids], garden:[ids], festival:[ids] }
  completedSets(catalog, owned) -> ["market", ...]
  newlyCompletedSets(catalog, owned, alreadyGranted) -> ["garden"]   // for the one-time grant
  collectionView(catalog, owned, tiers) -> [{ set, items:[{id, owned, tier, price}], complete }]
  ```
- **`src/street-keepsakes.js`** — the append-only keepsake ledger + earn helpers.
  ```
  makeKeepsake(kind, day, word?) -> keepsake
  addKeepsake(list, keepsake) -> list'          // pure, returns new array
  ```
- **`src/street-daily.js`** — new-day detection + the date-hashed deterministic gift.
  ```
  isNewDay(lastVisitDay, todayKey) -> bool
  dailyGift(todayKey) -> { coins, keepsake? , neighbourPalette }   // hash(todayKey) → stable
  ```

Wiring in `street-screen.js`: mount the collection book + keepsake shelf overlays, the
name-your-street control, the saved-layout slots UI, and the on-open daily-surprise check;
call the set-completion grant after any purchase; render the neighbour cat + time-of-day
tint.

### Data model — `streetLayout` v2 → v3

Current: `{ v:2, placements, welcomeOwned, coachDone }` (`street.js`). New:

```
{
  v: 3,
  placements, welcomeOwned, coachDone,   // unchanged
  name: "",                              // street title (component 3)
  savedLayouts: [],                      // up to 3 × { name, placements } (component 4)
  keepsakes: [],                         // append-only ledger (component 5)
  setsCompleted: [],                     // ["market", ...] grant-once guard (component 1)
  lastVisitDay: null                     // date key of last Street open (component 6)
}
```

`streetProject` gains `reserve: false` (escrow toggle). Both live inside the synced
`nbhsk.shop` object as today; all access goes through `src/storage.js` `createStore`.

### Migration — v2 → v3

Bump `CURRENT_SCHEMA_VERSION` and append a **guarded** `{ to: <n>, up(storage) }` entry in
`src/migrations.js`, matching the existing v1→v2 template: read the stored `streetLayout`,
default the five new fields, default `streetProject.reserve` to `false`, and **silently
no-op on any parse/shape failure** (never throw — a corrupt install must still boot).
`normalizeStreetLayout()` in `street.js` extends to fill the new fields defensively for any
layout that reaches it.

### Cloud merge fold — `merge.js`

Extend the `streetLayout`/`streetProject` reconciliation:

- `keepsakes` → **union by `id`** (append-only, never lose one across devices);
- `setsCompleted` → **union** (a set completed on either device stays granted);
- `lastVisitDay` → **max** (latest wins, so the daily gift isn't re-granted after a sync);
- `name`, `savedLayouts`, `streetProject.reserve` → **dirty-flag-wins** (same rule the
  existing layout/project fold already uses).

## Integration surface

- **Reads only, as today.** Coins still flow one way (battle score → wallet → Street). The
  keepsake `word` snapshot reads existing mastery data at grant time; nothing writes back to
  quests / daily / growth / mastery / srs / boss. The PRD non-goal ("Street does not fund,
  gate, or modify learning") is preserved.
- **Set-completion grant** fires from the existing post-purchase path in `street-screen.js`
  (after `buy()`), comparing `completedSets` before/after.
- **Daily surprise** fires from the Street's on-show path (the same visibility gate that
  starts/stops the resident loop).

## i18n

Every new player-facing string is a `t("street.*", vars)` key with **parallel EN + TH**
entries in `src/i18n.js` (EN block ~108–181, TH block ~649+). New keys cover: collection
book (title, owned/locked, set names, "N of M", "complete"), name-your-street
(label/placeholder), saved layouts (slot names, save/load/overwrite confirm), keepsake
shelf (title, per-kind captions), daily surprise (neighbour greeting, gift copy — **guardrail
reviewed**, no loss framing), set-completion banners, and the escrow toggle label/hint.

## Testing

- New pure modules unit-tested: `street-collection` (membership, completion,
  newly-completed diff, view model), `street-keepsakes` (make/add, append-only, word
  snapshot is a plain string), `street-daily` (new-day boundary, gift determinism across
  repeated calls for the same day key, gift variance across days).
- **Migration test:** a v2 fixture upgrades to v3 with the five new fields defaulted and no
  data loss; a malformed fixture no-ops without throwing.
- **Merge test:** two-device fold for keepsakes (union), setsCompleted (union),
  lastVisitDay (max), name/savedLayouts (dirty-wins).
- **Escrow:** preserve the existing `street-project.test.js` guarantee for `reserve:false`;
  add a `reserve:true` test (other purchases spend against `wallet − reserved`; meter does
  not regress).
- `street-screen.js` wiring stays untested-by-design.
- Gate on the **full** `npm test` (never masked) + `npm run lint` + `npm run build`.

## Non-goals (explicit — the new-art roadmap, deferred)

- **Canvas expansion / multi-lot growing town** (B) — shifts the feeling toward _goal_;
  needs lot backdrops.
- **Named neighbour residents that "move in"** (B) — shifts toward _companion_; needs
  neighbour cat art + the keepsake-letter framing.
- **Visible multi-stage construction** (B) — needs scaffolding/stage overlays.
- **Full theming (ground/sky/seasonal) + resident daily life + share-as-postcard** (C) —
  large art batch + a share surface.
- **Any Street→learning coupling** (SRS nudges, battle bonuses) — permanent non-goal.
- **A second currency / gems.** Single `coins` faucet stays.
- **PWA shell / precache growth.** No new art ⇒ no `sw.js` shell change in this layer.

## Owner taste calls — resolved in this spec

1. **Set reward with no new art:** plaque + glow + keepsake (not a coin bonus, not a new
   decoration).
2. **Daily gift contents:** mostly coins, occasionally a keepsake.
3. **Keepsake ↔ learning:** cosmetic display of an already-mastered word only; zero SRS
   coupling.
4. **Project escrow:** opt-in toggle, default off.
