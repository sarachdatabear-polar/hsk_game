# Task 3 + Task 4 Report

## Scope

Implemented the merged Manifest Validation + Manifest-Backed Runtime Registry unit without touching Task 5 outputs (`assets/ui-icons.svg`, `src/icons.js`, `index.html`).

## Changes

- Added `scripts/validate-assets.mjs` and exposed it as `npm run assets:validate`.
- Expanded `test/asset-manifest.test.js` in the existing ESM style to verify:
  - manifest statuses stay within `status_values`
  - every manifest PNG name is exported through `SPRITE_NAMES`
  - required runtime shell assets remain in `sw.js`
  - tolerant service-worker install behavior stays `c.add(u).catch(() => {})`
  - Task 5 icon coverage keeps the stricter `<symbol ... id="...">` assertion
- Updated `src/sprites.js` to export the manifest-backed `SPRITE_NAMES` array and load from it.
- Updated `sw.js` precache entries with the exact runtime asset set from the brief.
- Rebuilt `dist/app.js` because the sprite registry module changed.

## TDD / Verification

Red step:

- `npm test -- test/asset-manifest.test.js`
- Failed as expected before implementation because `SPRITE_NAMES` was not exported and `sw.js` did not include the new manifest-backed runtime entries.

Green / required verification:

- `npm run assets:validate` ✅
- `npm test -- test/asset-manifest.test.js` ✅
- `npm test` ✅
- `npm run build` ✅

## Result

All required checks passed and the merged Task 3 + Task 4 unit is committed cleanly on top of the existing Task 5 work.

## Concerns

None.

---

## Review Fix Follow-Up

### What changed

- Updated `test/asset-manifest.test.js` so the service-worker precache contract now derives required files from `manifest.assets.filter(asset => asset.priority === "P0")` and maps them to `assets/${asset.file}`.
- Kept the stricter Task 5 icon coverage check that verifies required ids through the `<symbol ... id="...">` contract.
- Bumped the service-worker shell cache key in `sw.js` from `nbhsk-shell-v13` to `nbhsk-shell-v14` because the precache surface had changed.

### Commands and output

- `npm run assets:validate`
  - `asset validation: checked 22 manifest assets`
- `npm test -- test/asset-manifest.test.js`
  - `Test Files  1 passed (1)`
  - `Tests  4 passed (4)`
- `npm test`
  - `Test Files  18 passed (18)`
  - `Tests  173 passed (173)`
- `npm run build`
  - Skipped: no source files changed in this review fix. The change set is limited to `test/asset-manifest.test.js`, `sw.js`, and this report entry.

### Files changed

- `test/asset-manifest.test.js`
- `sw.js`
- `.superpowers/sdd/task-3-4-report.md`

### Self-review

- The precache assertion now tracks manifest `P0` exactly, so `P1` assets like `bg-results`, `ui-badge`, `ui-progress-*`, and `fx-level-up`/`fx-new-best` are no longer treated as required shell assets by the test.
- The service-worker cache version now invalidates the old shell cache for the precache-list change already present in `sw.js`.
- No changes were made to `src/sprites.js`, `scripts/validate-assets.mjs`, `package.json`, or `dist/app.js`.
