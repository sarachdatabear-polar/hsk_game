# PRD — Visual Slice v1 (Lucky Cat HSK reference rebuild)

**Round branch:** `feat/prd-visual-slice-v1` (off `development`)
**Source spec:** `docs/art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md` (the "visual-exact" PRD)
**Date:** 2026-07-06 · **Lead:** Fable · **Workers:** Sonnet, sequential

## Scope (user-approved via grilling, 2026-07-06)

Rebuild the **Home** and **Battle** runtime screens to match the visual PRD §6, plus the
shared tokens/fonts/effects they need. The §8 presentation boards are **out of scope**.
Other screens keep working untouched except where they inherit tokens for free.

### Decisions locked with the user (do not relitigate)

1. **Home + Battle only** this round; no production boards.
2. **START = instant battle** with last-used scope; a scope chip next to it (e.g.
   "HSK 1–3 · 20") opens the existing scope screen. Smart Review demoted to the
   secondary row.
3. **5-tab bottom nav** (deep teal): Home / Street / Progress / Quests / More.
   Street + Quests promoted from home widgets to their own screens. More hosts
   Best Sessions, How to play, sound + UI-language settings. Nav hidden during
   battle / flashcards / results.
4. **Single coin currency** (monetization PRD wins over the visual PRD's blue gems).
   The second status capsule shows player level + XP progress instead.
5. **Enemy = code-drawn cute gray raccoon ninja** replacing the walker; existing
   one-kill-per-word logic unchanged. Floating HP bar above the raccoon is
   cosmetic (animates to zero on a correct answer; bosses deplete in stages).
6. **Reveal-state reading** of the reference: plaque shows pinyin + Hanzi + speaker
   during the question; the translation line fills in only after answering.
   Answer buttons neutral (cream/sand) at rest; green/coral on reveal.
7. **Sessions stay 20/40/100/custom/endless**; HUD adopts the blue `Round X/Y`
   capsule (the PRD's "10 rounds" is reference sample copy).
8. **Minimal battle HUD** (hearts · round capsule · coins · pause). Pause overlay
   holds Resume / Quit + the sfx / word-audio / pinyin toggles.
9. **Bundle subsetted fonts** via a build script: Noto Serif SC subset to the hanzi
   actually in `data/words.json`, Noto Sans Thai, Fredoka (Latin display).
10. **Backgrounds:** build for the PRD scenes with current art as placeholder; hand
    the user generation prompts for `bg-home.png` (1080×1920 daylight village path)
    and `bg-battle.png` (1024×512 daylight forest), plus an optional raccoon
    sprite-sheet prompt. Same filenames = drop-in swap later.

## Code facts workers must respect (read before touching anything)

- `src/main.js` (~1440 lines) wires everything; battle state lives in the `B` object;
  persistence via `store.get/set` → `localStorage` keys `nbhsk.*` (additive only).
- The battle walker is a **cat** drawn with `drawCat(...)` carrying shop skins
  (`SKIN_PALETTES[shopState.skin]`), growth accessories (`B.acc`), and the kitten
  companion. `zombie.js` is **dead code** (not imported). The stationary left
  character is the `maneki` sprite.
- Word plaque is canvas-drawn in `drawWordPlate()` using 9-slice
  (`nineSliceRects`, `ui-word-plaque` sprite). Canvas fonts are hardcoded
  `'Segoe UI'` strings.
- Answer buttons live in DOM `#opts` (grid), classes `.good`/`.bad` on reveal
  already exist. Boss stage-2 reverse question reuses `#opts` with a prompt div.
- i18n: `t()` from `src/i18n.js`; static markup uses `data-i18n*`. Tests enforce
  EN/TH key parity — every new string needs both locales.
- Home widgets: `#street-cv` + `#street-caption` (canvas street), `#quest-panel`,
  hud pills `#home-streak/#home-level/#home-wallet`, icon row.
- `show(name)` toggles `.screen` divs `#s-<name>`; `data-go` buttons route.
- Tests: 22 files / 231 passing. Build: `npm run build` (esbuild → `dist/app.js`).
- Invariants: vanilla JS ES modules, no new npm deps, file:// must work (no new
  fetch of bundled data), playable at 360×640, pure logic in tested modules,
  canvas/DOM wiring in `main.js` only.
- **Never redirect shell output to `dev/null`** (creates a literal file on Windows).
- Do not touch `sw.js` or git; report files changed + test counts + deviations.

## Milestones (sequential; each lands green + playable)

### M1 — Design tokens + bundled fonts
- Add the §4.1 palette as CSS custom properties on `:root` in `index.html`
  (`--lc-green:#32775E`, `--lc-sky:#5DAADD`, `--lc-sun:#F2BC57`, `--lc-coral:#E69777`,
  `--lc-brown:#846043`, `--lc-gray:#B2AEA9`, `--lc-cream:#FBF5E8`, `--lc-teal:#1F4D4A`,
  `--lc-success:#28723B`, `--lc-error:#C95A41`, `--lc-sand:#EAC796`, `--lc-ink:#2E2A24`),
  mapped onto the existing var names where they already exist. Do not restyle
  screens beyond variable swaps in this milestone.
- `scripts/build_fonts.py`: downloads Noto Serif SC, Noto Sans Thai, Fredoka;
  subsets with `fonttools` (`pip install fonttools brotli`): Serif SC → unicodes
  from all `h` fields in `data/words.json` + CJK punctuation + "？"; Thai + Latin
  kept whole (they're small). Outputs `assets/fonts/lc-hanzi.woff2`,
  `lc-thai.woff2`, `lc-latin.woff2`. Idempotent, skips when outputs exist
  (like `build_audio.py`).
- `@font-face` (`LC Hanzi`, `LC Thai`, `LC Latin`) in `index.html`, local URLs,
  `font-display: swap`; body/heading stacks updated with system fallbacks.
- New pure module `src/fonts.js` exporting canvas font-stack strings
  (`HANZI_STACK`, `LATIN_STACK`, plus a `fontString(weight,px,stack)` helper) +
  vitest tests; `main.js` canvas draws switch from `'Segoe UI'` to these.
  Boot calls `document.fonts.load()` for the hanzi face (guarded, non-blocking).

### M2 — Bottom nav + screen promotion
- New deep-teal bottom nav (5 tabs: Home/Street/Progress/Quests/More) fixed at
  the bottom of top-level screens, safe-area-inset aware, 44px+ touch targets,
  active tab warm yellow/cream. Icons from `assets/ui-icons.svg`.
- New screens: `#s-street` (moves `#street-cv` + caption, canvas sized larger),
  `#s-quests` (moves `#quest-panel`), `#s-more` (Best Sessions entry, How to play
  entry, sound toggle, UI-language chips — move from scope screen's Language
  section; scope screen keeps meaning-language only).
- Nav visible on home/street/progress/quests/more (+ shop/scores/howto as
  sub-screens of More with back buttons); hidden on battle/learn/scope/results.
- `show()` extended to render the nav state; `renderStreet()` re-triggered on
  street tab. All new labels through `t()` with EN + TH entries.
- Pure helper `src/nav.js` (tab list, which screens show nav, active-tab
  mapping for sub-screens) + tests.

### M3 — Home screen rebuild (§6.1)
- Top status strip: left capsule = `cat-portrait.png` avatar + `Lv N` + compact
  XP bar (from `levelForXp`/`xpToNext`); right = coin capsule (wallet) +
  circular gear button → More tab. Blue/teal capsules, gold/cream accents.
- Brand title block: `LUCKY CAT` (sun yellow) over large `HSK` (cream with brown
  shadow) + paw accent — replaces current `<h1>`; text, not baked image.
- Hero area: `cat-study.png` centered over the home background (`bg-home.png`
  as screen background, cover, center-clear). Streak card: cream plaque, fire
  icon, "Study Streak" label, `N days` right, green→gold progress bar toward
  the daily goal (`streakInfo`).
- Primary CTA: big sun-yellow `START` → `startBattle("round")` directly (respect
  the pool≥8 guard: disabled + hint when unstartable). Scope chip beside/under it
  showing `scopeKey`-style summary + session length; tap → scope screen.
  The scope screen's own start row stays working.
- Secondary row: cream buttons Flashcards · Smart Review · Shop (Smart Review
  keeps its ready/progress states from `updateSmartBtn`).
- Old tagline/menu/icon-row removed (their functions all reachable via nav/More).
  All strings EN + TH.

### M4 — Battle HUD + pause overlay (§6.2 items 1, 5)
- HUD: left = 3 hearts (existing `life-icon` pattern); center = blue capsule
  `Round X/Y` (X = current word number, Y = session length; endless = `Round X`
  with ∞); right = coin capsule (session score, existing `#hud-score`) + one
  circular pause button. Remove sfx/audio/pinyin/quit buttons from the HUD.
- Pause: `B.paused` flag — `loop()` keeps rAF but freezes dt/motion and input
  (`answer()` guard). Overlay (DOM, over canvas): Resume, the three toggles
  (sfx / word audio / pinyin — same store keys), Quit. Battle auto-pauses on
  `visibilitychange` hidden. Combo strip stays as-is this milestone.
- Pure helper `src/hud.js` (round-label formatting, heart states) + tests.
  EN + TH strings.

### M5 — Battlefield role swap: player cat + raccoon enemy (§5.3, §5.4)
- New module `src/raccoon.js`: `drawRaccoon(ctx, x, groundY, tMs, state, scale)`
  — chibi gray raccoon ninja per §5.4 (charcoal outfit, blue-gray headband,
  short staff, mask stripes, faces left), states walk/happy(defeat)/wrong,
  same contract as the current walker states. Canvas primitives, warm palette,
  cute not scary. Boss variant = bigger + darker band (keep gold aura hook).
- Player character (left, was maneki): `drawCat` with `shopState` skin,
  growth accessories, kitten companion — i.e. move the walker's cosmetic
  wiring to the player. Faces right. Victory hop kept.
- The walker becomes the raccoon (no skins/accessories on it). Coin projectile
  → raccoon; on hit, HP bar (floating above raccoon, cream track/green fill,
  drawn on canvas) animates to 0 during the defeat state. Boss: bar depletes
  50% after stage 1 (meaning), 100% after stage 2 (hanzi). Wrong answer /
  timeout behavior unchanged (retreat / reach-player bite).
- Delete `src/zombie.js` (dead code) and any references. Keep all battle logic,
  scoring, mastery, quest events identical — tests must stay green untouched
  (except any zombie-specific test, which follows the deletion).

### M6 — Plaque reveal + answer grid + effects polish (§6.2 items 3–5, §7.4)
- `drawWordPlate` extensions: reserved translation line under the Hanzi that
  fills in on reveal (correct or wrong) with the target meaning in the scope's
  meaning language; speaker icon drawn on the plaque's right; canvas click
  hit-test on the plaque region replays `speak(word.h)` (accessible: also make
  Enter/Space on the canvas replay — canvas gets `role="img"` + aria-label).
  Pinyin position: directly above Hanzi (§4.3). Fonts from `src/fonts.js`.
- Answer grid `#opts`: enforce 2×2 equal-size grid at all widths; neutral
  sand/cream tactile buttons at rest (top highlight + darker base edge per
  §7.2); `.good` → success green, `.bad` → error coral; existing reveal flow
  (`revealCorrect`, `lockOptions`) unchanged.
- Combo strip (bottom, §6.2 item 5): `COMBO N` left, small fire indicators,
  `xN` multiplier badge right (reads existing `B.combo`; pure formatting helper
  in `src/hud.js` + tests).
- CRITICAL: at combo milestones (existing `combo % 10 === 0` streak effect),
  stamp `CRITICAL!` comic burst using `fx-critical.svg` + existing fireworks.
  Reduced-motion (`prefers-reduced-motion`): shorten impact animations.
- Contrast: essential text ≥ 4.5:1 (ink on cream, cream on teal/green).

### M7 — Ship round (lead, not a worker)
- Regression: `npm test`, `npm run build`, DOM-id check, manual localhost:8000
  pass at 390×844 and 360×640.
- Art prompt pack → `docs/art/GENERATION-PROMPTS-visual-slice.md` (bg-home,
  bg-battle, optional raccoon walk/happy sheets per §5.5 sizes).
- `sw.js` SHELL bump; update `docs/planning/V2-EXECUTION-PLAN.md` +
  `docs/planning/USER-CHECKLIST.md` (playtest items; note `#debug` shortcuts).
- Commit, push, PR → `development`.

## Acceptance (from the visual PRD, adapted)

- Home → START → battle works with last scope; scope screen reachable via chip.
- Battle: one word + four answers; hearts/round/coins/pause update; pause
  freezes and resumes cleanly; raccoon reads as cute opponent with HP bar.
- Plaque order pinyin → Hanzi → (reveal) translation; speaker replays audio;
  audio falls back to TTS on file://.
- Colors within the §4.1 palette; buttons/panels rounded paper/wood feel;
  no neon/glassmorphism/pure black/white.
- Hanzi ≥ 56 CSS px at 390-wide; answer text ≥ 20 px; 44px touch targets;
  correct/wrong never color-only (icons + motion + sound preserved).
- `npm test` green, `npm run build` clean, file:// + PWA + Capacitor unaffected,
  old localStorage data loads unchanged.
