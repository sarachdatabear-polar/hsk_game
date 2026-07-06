# Extracted SVG Pack v2 — Production Integration Design

**Date:** 2026-07-06
**Status:** Implemented on feature/extracted-svg-pack-v2 (2026-07-06)
**Source assets:** `assets/_plan/extracted/` (ui/ 12, icons/ 12, effects/ 3, vfx/ 4 — SVG, 0.5–3 KB each)
**Target:** production `assets/` + wiring in `index.html`, `src/`, `sw.js`

## Goal

Ship the full extracted SVG pack into the live game: swap restyled surfaces into
their existing manifest slots, wire the genuinely new pieces (icon-buttons, word
plaque, panel, danger/disabled/start buttons), and add orb answer-feedback
bursts to the battle canvas. Everything keeps the existing file:// fallback
discipline.

## Constraints honored

- **No baked-in text** (trilingual UI, live language toggle): strip `<text>`
  from `ui-button-start.svg` ("START"), `ui-tag-hsk.svg` ("HSK 2"), and
  `fx-critical.svg` ("CRITICAL!" — also banned typography per the education
  PRD). Labels render as live DOM/canvas text on top.
- **file:// support**: all art loads through the existing feature-detected
  systems (`assets.js` manifest loader → `--f-*` CSS vars + `has-*` classes;
  `sprites.js` registry → `sprite()` with vector fallbacks). No new runtime
  `fetch`.
- **Git topology**: work happens in the `game/` repo only, feature branch off
  `development`, PR to `development`. Root repo untouched. Pre-existing
  uncommitted changes (`data/words.js`, `data/words.json`, `sw.js`) stay out of
  the branch.

## 1. File promotion map

`_plan/extracted/` → `assets/`. `palette.svg`, `_preview-all.png`, and the two
stray `.png` exports stay in `_plan/` as reference.

| Source (extracted/) | Production file | Action |
|---|---|---|
| ui/ui-button-primary.svg | ui-button-primary.svg | overwrite existing slot |
| ui/ui-button-secondary.svg | ui-button-secondary.svg | overwrite existing slot |
| ui/ui-button-neutral.svg | ui-button-neutral.svg | overwrite existing slot |
| ui/ui-button-disabled.svg | ui-button-neutral-disabled.svg | rename into the loader's state-file convention (`states:["disabled"]`) |
| ui/ui-button-danger.svg | ui-button-danger.svg | new surface, wired to destructive actions (reset/clear) |
| ui/ui-button-start.svg | ui-button-start.svg | strip `<text>`; new hero-CTA surface (Continue Learning / Start) |
| ui/ui-tag-hsk.svg | ui-tag.svg | strip `<text>`; overwrite existing tag slot |
| ui/ui-word-plaque.svg | ui-word-plaque.svg | new; drawn behind the hanzi in the battle canvas via `sprite()` |
| ui/ui-panel.svg | ui-panel.svg | new surface for settings/modal panels |
| ui/ui-badge-paw.svg | ui-badge-mastery.svg | overwrite existing badge slot (`.hud-round` fallback) |
| ui/ui-progress-bar.svg | ui-progress-track.svg + ui-progress-fill.svg | split layers — the source has a baked partial-width fill that would show phantom progress; track and fill go into the two existing slots |
| icons/icon-*.svg (12) | icon-*.svg | new icon-button art (book, coin, flame, gift, heart, home, pause, paw, play, settings, speaker, trophy) |
| effects/fx-paw-correct.svg | fx-correct.svg | overwrite existing feedback slot |
| effects/fx-paw-wrong.svg | fx-wrong.svg | overwrite existing feedback slot |
| effects/fx-critical.svg | fx-critical.svg | strip `<text>`; overwrite (starburst only) |
| vfx/vfx-orb-{green,red,blue,gold}.svg | vfx-orb-*.svg | new canvas sprites for answer-feedback bursts |

Slice values (`slice`/`scale` in the manifest) are re-measured for the new
button canvas (380×98 vs the old 300×88) so 9-slice corners stay crisp.

## 2. Icon-buttons (new component)

The 12 icons are chunky green rounded-square tiles — icon baked onto a button
face. They become a `.icon-btn` component (`<button class="icon-btn"><img
src="assets/icon-home.svg" alt="">…</button>`) used where a square tappable
button fits: home nav row, settings, sound toggle, battle pause/play. The flat
`ui-icons.svg` `<use>` sprite **stays** for small inline icons next to text
(~18 px), where the tiles would be unreadable. Icon `<img>`s carry no label —
accessible names come from the button's `aria-label`/visible text, localized.

## 3. Orb answer-feedback bursts (battle canvas)

`fx.js feedbackEffect()` extends the existing feedback spec with an orb sprite
per kind, and one new kind:

| Event | Kind | Orb |
|---|---|---|
| correct answer | correct | vfx-orb-green |
| wrong answer | wrong | vfx-orb-red |
| critical/perfect hit | critical | vfx-orb-gold |
| 10-combo milestone (existing `fireworkRing` site) | streak (new) | vfx-orb-blue |

`main.js` renders the orb as a brief scale-and-fade pop layered with the
existing fx stamp. The 4 orbs join `SPRITE_NAMES` + `SVG_SPRITES` in
`sprites.js`; when not yet loaded, `sprite()` returns null and the current
vector feedback renders alone — no new failure mode.

## 4. Manifest, cache, registry updates

- `assets/asset-manifest.json` → version 3: new entries for
  `ui-button-danger`, `ui-button-start`, `ui-panel`, `ui-word-plaque`,
  `vfx-orb-*` (type `effect`), plus `states:["disabled"]` on
  `ui-button-neutral`; re-measured `slice` arrays on the overwritten buttons.
- `sw.js`: add all new file paths to the precache list; **bump `SHELL` cache
  version** (user-facing change).
- `sprites.js`: add `ui-word-plaque` and the 4 orbs.

## 5. CSS wiring (index.html)

Follows the established pattern — `border-image: var(--f-<id>, none)` with the
existing style as fallback, plus `has-<id>` overrides where the frame must
suppress the fallback background:

- `.big.start` (hero CTA) → `--f-ui-button-start`
- destructive buttons → `--f-ui-button-danger`
- `#opts button:disabled` → `--f-ui-button-neutral-disabled` (hook exists)
- settings/modal panels → `--f-ui-panel`
- `.icon-btn` component styles (size, radius, active-press transform)

## 6. Testing & verification

- Extend `test/assets.test.js`: new manifest entries load, disabled-state file
  resolution, slice shorthand for the new geometry.
- fx unit tests: orb-sprite mapping per kind, streak kind at combo milestones.
- `npm test` + `npm run build` green.
- Manual: localhost:8000 at 360×640 and desktop; `file://` open (fallbacks
  render, no console errors); orb pops visible in battle; no phantom progress
  in bars; Thai labels uncut on new surfaces.

## 7. Out of scope

- Cat skins / decor / shop-chest / shop-scroll art seen in the preview board —
  those files are not in `extracted/` yet.
- Any vocabulary/scoring logic; `data/words.*` regeneration.
- Android build (cap:sync happens at release, not in this PR).
