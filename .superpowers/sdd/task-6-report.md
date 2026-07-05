# Task 6 Report: Visual Tokens And UI Frame Hooks

## Status
DONE

## Scope Delivered
- Updated `index.html` only for the production-art token pass and optional frame/image hooks.
- Bumped `SHELL` in `sw.js` from `nbhsk-shell-v14` to `nbhsk-shell-v15` so installed clients refresh the user-facing shell CSS. This follows the plan constraint that shell/art changes require cache busting.

## Changes
- Added the PRD visual tokens verbatim at the top of the stylesheet.
- Repointed key shell colors for buttons, HUD pills, chips, cards, panels, quest rows, readouts, score lists, and result callouts to the token set while preserving selectors and layout behavior.
- Added non-breaking frame hooks with `none` fallbacks:
  - `--ui-panel-image`
  - `--ui-word-plaque-image`
  - `--ui-button-primary-image`
  - `--ui-button-secondary-image`
  - `--ui-button-neutral-image`
  - `--ui-badge-image`
  - `--ui-progress-track-image`
  - `--ui-progress-fill-image`
- Applied the panel/plaque hooks both to the brief’s optional selectors (`.screen-card`, `.panel`, `.shop-card`, `.word-card`, `.flash-card`) and to the actual selectors already used in `index.html`.

## Verification
- Width/font scan: `rg -n "font-size:|width:|min-width:|height:" index.html`
  - No new fixed widths wider than 360px were introduced by this task.
- Build: `npm run build` — PASS
- Test: `npm test` — PASS (`18` files, `173` tests)

## Concerns
- None.

## Commit
- Pending at report-write time; commit created after verification.

---

## Review Fix Addendum

### Status
- Fixed the post-review CSS hook regressions in `index.html`.
- Bumped `SHELL` in `sw.js` from `nbhsk-shell-v15` to `nbhsk-shell-v16` so installed clients pick up the corrected shell CSS.

### What Changed
- Removed the root `--ui-*-image:none` declarations. That lets the existing `var(--prop, gradient)` and `var(--prop, none)` fallbacks behave correctly when optional art hooks are not supplied.
- Replaced the `background:` shorthands that were clearing panel hook layers on:
  - `.readout`
  - `#opts button`
  - `#opts button.good`
  - `#opts button.bad`
  - `.misslist`
- Kept the current no-art visual fallback by preserving the same base colors through `background-color`.

### Commands And Output
- `rg -n "font-size:|width:|min-width:|height:" index.html`
  - Completed. No new production-art fixed widths wider than 360px were introduced by this fix.
- `npm run build`
  - PASS
- `npm test`
  - PASS (`18` files, `173` tests)

### Files Changed
- `index.html`
- `sw.js`
- `.superpowers/sdd/task-6-report.md`

### Self-Review
- The fix stays inside the assigned write scope.
- No JS or gameplay logic changed.
- The panel hooks now survive later selector styling, and the optional image vars no longer suppress the no-art gradient/solid fallbacks.
