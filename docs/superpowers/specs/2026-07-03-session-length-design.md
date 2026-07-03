# Session-Length Picker — Design

**Date:** 2026-07-03 · **Status:** approved by user

## Problem

Round battles always spawn exactly 20 words (`B.wordsTotal`, hardcoded in `src/main.js`).
Players want to choose how long a session is — 20, 40, 100, or any typed number — both for
regular Battles and for Fight Misses (drilling missed words).

## Decision (user-approved)

One shared "Session length" setting on the scope screen (`#s-scope`), persisted, reused by
Fight Misses. No per-battle popup.

## UI

- New chip row on `#s-scope`, styled and wired exactly like the existing Top-N row
  (`#topn-chips`), placed above the `.startrow` launch buttons:
  - Chips: `20` `40` `100` `✏️ Custom`.
  - Selecting **Custom** reveals an inline `<input type="number" inputmode="numeric"
    min="5" max="500">`; the phone shows a numeric keypad.
- The Battle button label reflects the value: `🧧 Battle · 40` (today the "20" is static
  text in `index.html`).
- Endless and Cards buttons unchanged.

## Behavior

- `startBattle("round")` uses the chosen length for `B.wordsTotal` instead of 20.
  Everything else about battle flow is untouched (lives, speed ramp, sampling).
- **Fight Misses** (`#r-fight-miss` on results) already calls `startBattle("round")` with a
  deck override — it inherits the session length with no extra code path.
- **Endless** stays `Infinity`.
- Value normalization (single pure helper, e.g. `normalizeLen(v)` in `src/pool.js`):
  integers clamped to **5–500**; `NaN`/empty/absent → default **20**.
- Persistence: `sessionLen` field added to the existing `nbhsk.scope` localStorage blob
  (custom values persist as their number; no separate "custom" flag needed).

## High scores

`nbhsk.best` is keyed by scope+mode; longer rounds score more, so lengths must not share a
slot. Round-mode key becomes `round{len}` for len ≠ 20; **len = 20 keeps the legacy key
`round`** so existing high scores remain visible and comparable. Endless key unchanged.

## Testing

- Unit tests (vitest, alongside existing `test/pool.test.js` style) for `normalizeLen`:
  defaults, clamping both ends, string/NaN input, integer coercion.
- Unit test for the round-score-key rule (20 → `round`, 40 → `round40`).
- Manual/browser smoke: pick 40 → battle ends after 40 spawns; custom 7 → clamps ≥5;
  Fight Misses after a lossy round uses the same length; endless unaffected.

## Out of scope

Flashcards session length (has its own 400 cap), per-mode lengths, difficulty scaling by
length.
