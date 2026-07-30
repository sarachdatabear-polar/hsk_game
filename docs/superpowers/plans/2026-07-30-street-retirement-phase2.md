# Street Retirement — Phase 2

**Status:** in progress (2026-07-30)
**Branch:** `development`
**Phase 1** (`70913644`) already removed 3 dead precached assets. This is the code retirement.

## Goal

Delete the legacy Street surface entirely: its modules, assets, markup, strings, tests, stored
state, and the `features.catJourney` rollback flag. Cat Journey becomes the only surface.

## Owner decisions (Jordan, 2026-07-30)

- **No user migration / no refunds.** "there is no current user we are not publish yet."
- **Delete all three orphaned features** (Street Projects, keepsakes, resident collection).
  Cat Journey's own keepsake/bond system (`cat-memories.js`) already covers the concept.

## What this buys (corrected after measuring)

**The pre-build claim "zero additional precache" was wrong.** It was right about *assets*:
Street's 44 remaining assets (~5.96 MB) are runtime-cached, and Phase 1 already took the only
two precached ones. What it missed is that `dist/app.js` is itself precached, and removing
~2,700 LOC shrank it by roughly 143 KB.

Measured headroom: **809,448 B after Phase 1 → 952,929 B after Phase 2.** Repo/deploy weight
also drops by the full ~5.96 MB of deleted assets. The dead-code removal and the end of
dual-surface branching are still the main point.

## The three constraints and how they are resolved

### 1. Migration ladder (append-only convention)

`CURRENT_SCHEMA_VERSION` is 7. Entries `to:2, to:3, to:4, to:5` are **entirely** Street-shape
migrations importing `migrateLegacyStreet`/`normalizeStreetLayout`/`BUILDINGS`/
`defaultStreetProject`. Keeping them would keep the Street modules alive and defeat the
retirement.

**Resolution: delete those four entries; add `to:8` that strips Street state; bump to 8.**

This is safe, verified against `runMigrations` (migrations.js:214-228):
- entries are independent and skipped by `to <= v`;
- `to:6` (catJourney) and `to:7` (avatar) do not read Street state;
- line 226 (`if (v !== current) stamp(current)`) handles the numbering gap;
- a legacy v0 install now runs `to:6 → to:7 → to:8`, and `to:8` deletes the Street fields those
  removed entries would have built. **You do not need to faithfully migrate state you are
  about to delete.**

This is a deliberate, documented departure from "append-only" — record it in the file's header
comment so a future reader does not think the ladder was corrupted.

### 2. The rollback flag is coupled to the code

13 `!CAT_JOURNEY_ENABLED` branches in `main.js` are exactly where Street's flag-off behaviour
lives. Remove `CAT_JOURNEY_ENABLED` and collapse every branch to its Cat Journey side.

### 3. `"street"` is the shared route key

`nav.js` `TABS` lists `"street"`; `activeTabFor("cat-journey")` returns `"street"`; `index.html`
has 3 × `data-go="street"` plus `data-tab="street"`. **Repoint to `"cat-journey"`, do not
delete.**

## Execution order (dependency-driven)

Consumers must stop importing Street **before** the modules are deleted, or nothing builds.

- **Stage 1 — shared-consumer surgery.** `shop.js` (15 deco entries; `defaultShop()` loses
  `tiers`/`streetLayout`/`streetProject`; `buy()` reservation branch; `dailyStock`), `merge.js`
  (Street folds, `streetLayoutOf`/`streetProjectOf`, `bricks` out of `BASE_SYNC_KEYS`),
  `sync.js` (`shopLayoutDirty`/`shopProjectDirty`), `migrations.js` (per §1), `nav.js` (§3).
- **Stage 2 — `main.js`.** ~25 touchpoints: the flag, `streetScreen` construction/calls,
  `bricks` state, the `nbhsk:sprite-ready` street special-case.
- **Stage 3 — `index.html` + `i18n.js`.** `#s-street` block (2068–2233), Street CSS
  (508–741, 1262–1264), shop Street sections, `data-go` repoint; 318 i18n key-lines.
- **Stage 4 — delete now-unreferenced modules, 10 test files, 44 assets, manifest entries.**
- **Stage 5 — shared test surgery.** `shop`, `migrations`, `merge`, `sync`, `asset-files`,
  `nav`, `i18n-usage`, `i18n`, `sw-precache`, `assets`.
- **Stage 6 — gate.** `npm test` (exit code unmasked), lint, build, precache measure, then
  handoff + commit.

## Gate

Full suite exit 0, lint 0, build 0. Expect a large negative test delta — **reconcile it
per-file (before/after), never assume**. `npm run qa:responsive` should be re-run: the sweep
still drives the legacy Street screen for part of its matrix and will need retargeting.

## Not in scope

`SHELL` bump and the `development → main` release cut — both owner-gated.
