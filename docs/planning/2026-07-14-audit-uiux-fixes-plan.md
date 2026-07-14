# Audit UI/UX fixes — round 2 (2026-07-14)

**Branch target:** `development` (source of truth) → feature branch `feat/ui-polish-2`.
**Source:** Jordan's screen-inventory audit (14 Jul 2026, artifact `b9463dab`), 8 fixes he
called out on top of the sweep.
**Build state at plan time:** SHELL `v70` (dev), live is `v69`. ~350 vitest tests green.

## Guiding constraints (apply to every item)

1. **The small sizes are deliberate — respect the responsive gate.** `.cloze-sentence`,
   `.boss-prompt`, and the tone chips were sized small *on purpose* for landscape/short-phone
   height (see the comment at `index.html:572–574` and the short-viewport override at
   `index.html:1052`). Every "make it bigger" fix must use a **larger base + `clamp()` keyed to
   viewport height**, or a **scrollable reading area** (`overflow-y:auto` + `max-height`), so it
   reads large on tall phones without overflowing short/landscape ones. Naive `px` bumps will
   fail the permanent 10-viewport sweep.
2. **"Hard to read" is contrast as well as size.** Fix low-contrast text (e.g. `.cloze-trans`
   is `12px` at `opacity:.75`, cream-on-cream) alongside size.
3. **Verify in EN *and* TH.** Thai strings run longer than English — critical for the two-line
   clamp (#9, must not truncate meaning) and for any width-bound layout.
4. **Housekeeping, non-negotiable:** run `npm run build` after any `src/` change (deployed app
   uses `dist/app.js`); bump `SHELL` `v70`→`v71` in `sw.js` (these are user-facing); never pipe
   `npm test` to `tail`/`grep` when gating a commit.
5. **Canvas items can't be unit-tested.** #1 and #2 are draw-math in `main.js` — they get a
   **Chromium screenshot check** (Playwright, VPS harness, phone 402×874, EN+TH), not a test.

## Shared fix points (fix once, three items improve)

- **`.boss-prompt` (`index.html:569–571`, `font-size:14px`)** is the single "meaning banner"
  element behind **#2 (Reverse), #5 (Cloze, as `.cloze-prompt`), #8 (Review Challenge)**.
- **The plaque glyph swap (`main.js:2305`)** renders both the LISTEN `🔊` (#1) and the
  `？？` mask (#2, #8).

---

## The 8 fixes

### #1 — LISTEN: speaker 🔊 clips the plaque border
- **Where:** `main.js:2305` (`hanzi = … vis.icon ? "🔊" …`), drawn at `main.js:2409`, sized
  `hzPx = max(56, hanziPx*0.85)` (`main.js:2320–2323`); vertical box reserves only
  `hzPx*1.05` (`main.js:2347`); plaque border at `main.js:2371–2373`.
- **Cause:** an emoji glyph's ink box exceeds its measured advance/em box, so at ≥56px the
  🔊 overflows the reserved plaque rect and touches/clips the border.
- **Fix:** render the 🔊 at a reduced factor of the hanzi size (e.g. `hzPx * ~0.72`) and/or add
  vertical padding to the reserved row so the emoji's true ink fits inside the plaque. Center it
  on the plaque box (see #2 centering fix — same root helper). Keep the DOM replay button
  (`main.js:1694`) unchanged.
- **Verify:** Chromium screenshot, LISTEN word, EN+TH — 🔊 fully inside the plaque, not touching
  the rim.

### #2 — REVERSE: `？？` shifted left + meaning banner too small
- **Where (shift):** `？？` centered on `B.w/2` at `main.js:2409`, but plaque width `lw`
  (`main.js:2341`) reserves right-side speaker-badge room (`… + spkR*2.2`) **even in reverse,
  where no badge is drawn**. The asymmetric plaque makes a screen-centered glyph look pushed left.
- **Fix (shift):** either (a) don't reserve badge width when the format shows no badge, or
  (b) center the glyph on the **plaque center** (`plaqueX + lw/2`) instead of `B.w/2`. Option (b)
  is the smaller, safer change and also fixes #1/#8 centering. Confirm visually.
- **Where (meaning):** `.boss-prompt` banner, string `battle.reversePrompt` "Pick the hanzi
  for: {meaning}" (`i18n.js:342`), CSS `index.html:569–571` fixed `14px`.
- **Fix (meaning):** part of the **shared `.boss-prompt` legibility fix** below.
- **Verify:** screenshot EN+TH — `？？` centered under the paper; meaning line comfortably legible.

### #4 — TONE format: add an explicit tone signal to each option card
- **Where:** in-battle `tone` format (`formats.js:62–72`) shows 4 pinyin options that differ
  **only by diacritic** (`label: word.p` variants). The standalone Tone Trainer already renders a
  clear signal — `.tone-num` number badge + `TONE_CURVE` SVG pitch contour (`main.js:1112–1137`,
  CSS `index.html:603–616`).
- **Fix:** reuse that treatment on the in-battle `tone` option cards — add a small **tone-number
  badge** (and optionally the pitch-contour glyph) to each option so the choice is legible at a
  glance. This labels each option's tone (aiding selection); it does **not** reveal which is
  correct (the answer is which tone fits the hidden word). Keep same-meaning distractor rules intact.
- **Decision (defaulted):** number badge + reuse existing contour component. Jordan can redirect
  to number-only at review.
- **Verify:** screenshot a `tone`-format word EN+TH; unit test for the option-render helper if one
  is extracted.

### #5 — CLOZE: reading/translation area too small & low-contrast
- **Where:** `.cloze-sentence` `17px` and `.cloze-trans` `12px` at `opacity:.75`
  (`index.html:575–577`), inside the `.boss-prompt`/`.cloze-prompt` box.
- **Fix:** raise `.cloze-sentence` via `clamp()` (bigger on tall phones, capped for landscape) or
  make the prompt a scrollable reading area; raise `.cloze-trans` size and **fix its contrast**
  (drop the `.75` opacity / darken) so the translation is readable.
- **Verify:** 10-viewport responsive sweep (must not overflow short/landscape) + legibility check
  EN+TH.

### #6 — TYPED: clearer first-time instruction
- **Where:** already two layers — an always-on plaque line "Type the pinyin"
  (`i18n.js:360`, `main.js:2380`) and a **one-time soft-intro overlay** `showFormatIntro`
  (`main.js:1774–1792`, gated by `formatIntros[format]`), copy `battle.introTyped`
  "Master level! Type the pinyin yourself — letters first, then tap each tone." (`i18n.js:348`).
- **Cause:** typed is the most complex format (type letters → tap a tone per syllable) but the
  first-run overlay is a single terse line that's easy to under-read.
- **Fix (defaulted):** enhance the existing `introTyped` overlay into a short, explicit
  **step-by-step** ("1. Type the pinyin letters  2. Tap the tone for each syllable  3. Check"),
  EN+TH, reusing the current first-run-gated `#format-intro`/`.fi-card` overlay (no new gating
  logic). Optionally add a tiny inline hint by the tone rows.
- **Verify:** fresh profile (clear `formatIntros`), reach first typed word, confirm overlay
  shows once, EN+TH. i18n usage-guard test stays green for new keys.

### #7 — BATTLE feedback: cat differs in size + white halo (correct vs wrong)
This is **two defects**, and only one is fully ours in code.

- **Size divergence (code, tested):** correct→`cat-happy`, wrong/idle→`cat-walk`
  (`main.js:2150–2154`, `cat.js`). `drawSpriteFrame` normalizes each sheet to content-box
  **height 64**, but the two default sheets have different content boxes
  (`sprite-metrics.js`: walk `115×96`, happy `99×127`), so rendered **widths diverge** (~77px vs
  ~50px) and the happy pose sits higher — the cat visibly changes size/shape.
  - **Fix:** reconcile the two poses in `sprite-metrics.js` so walk and happy render at a
    consistent on-screen size (normalize to a shared reference box / match the standing width).
    `sprite-metrics.js` **has tests → budget a test update.**
- **White halo (art — VERIFIED, was mis-attributed):** the PNGs are **properly transparent**
  (corners `(0,0,0,0)`, ~91% transparent) — there is **no baked white box**. The white is an
  **anti-alias fringe on `cat-walk.png` only** (629 near-white semi-transparent edge pixels =
  19.6% of its fringe; `cat-happy.png` is clean at 0.7%). This is in the **just-shipped v2 cat art**
  (`be7f9e3`).
  - **Decision for Jordan (recommended: art regen).** Options:
    - **(A) Regen `cat-walk` v2** with a clean matte (preferred; consistent with the v2 art pass,
      Jordan-gated per the art-intake rule).
    - **(B) Targeted edge de-matte** of `cat-walk.png` — adjust RGB of only the partial-alpha
      near-white fringe pixels (interior fur is fully opaque, alpha=255, untouched). Lower-effort,
      reversible, but an asset edit.
    - **(C) Leave as-is** for now, ship only the size fix.
    - Do **not** blanket "make near-white transparent" — the cat's fur is light and that would eat it.
- **Verify:** side-by-side correct/wrong screenshots — same footprint, no white halo.

### #8 — REVIEW CHALLENGE stage 2: meaning/text hard to read
- **Where:** boss stage 2 reuses the battle plaque + `.boss-prompt` (string `battle.bossPrompt`
  "Review Challenge · pick the hanzi for: {meaning}", `i18n.js:340`, transition at
  `main.js:1956–1960`) plus the recap strip (`main.js:2435–2486`, base `15*T`, auto-shrinks).
- **Fix:** covered by the **shared `.boss-prompt` legibility fix**; separately ensure the recap
  strip's shrink floor stays readable.
- **Verify:** force boss stage 2 (seeded save), screenshot EN+TH.

### #9 — CHOOSE YOUR WORDS: cap cards & buttons at two lines
- **Where:** `#s-scope`. Picker `.chip` filters (`index.html:166–180`) and `.startrow .big`
  action buttons (`index.html:222–223`, labels `.icon-text`) have **no line clamp**; Journey
  cards `.j-copy b` / `.j-play` (`index.html:857–880`) also unclamped. (Contrast: battle
  `.opt-label` *is* clamped to 3 lines at `index.html:564`.)
- **Fix:** apply a 2-line clamp (`-webkit-line-clamp:2` + `display:-webkit-box` +
  `overflow:hidden`, or `max-height` fallback) to the card/button text so nothing grows past two
  rows.
- **Verify — critical in TH:** confirm the **longest Thai** labels still convey meaning when
  clamped to 2 lines (truncation must not hide essential words); adjust copy or allow ellipsis
  tooltip if any label loses meaning. Screenshot EN+TH.

---

## Sequencing & delivery

Group into small commits on `feat/ui-polish-2`, in this order:

1. **Shared `.boss-prompt` legibility** (`clamp()` size + contrast) → clears #2/#5/#8 meaning-text
   at once. (+ `.cloze-sentence`/`.cloze-trans` for #5.)
2. **Plaque canvas math** — center glyph on plaque box (#2 shift) + shrink 🔊 (#1). One
   `main.js` change; screenshot-gated.
3. **#4 tone signal** on in-battle tone cards (reuse Tone Trainer components).
4. **#6 typed** first-run overlay copy (EN+TH).
5. **#9 two-line clamp** (CSS; TH-verified).
6. **#7 size** via `sprite-metrics.js` (+ test update). **#7 white halo → await Jordan's A/B/C.**

Then, once `src/` changes land: `npm run build` → `npm test` (unpiped) → **10-viewport
responsive sweep EN+TH via Playwright chromium (VPS harness)** for all legibility/canvas/clamp
items → bump `SHELL` v70→v71 → update the audit artifact `b9463dab` with before/after shots.

**Model workflow:** Fable leads; dispatch model-matched worker subagents per commit group
(CSS-only groups → cheaper model; canvas math / sprite-metrics → careful review).

## Status — IMPLEMENTED & VERIFIED (2026-07-14, branch `feat/ui-polish-2`)

All eight fixes landed and were verified with Playwright Chromium (402×874, the audit
device) + the permanent responsive sweep:

- **#1 Listen 🔊** — shrunk to clear the plaque rim + ink-box re-centered. Screenshot: icon
  fully inside the box. ✓
- **#2 Reverse `？？` + meaning** — glyph re-anchored on its ink box (root cause was the
  fullwidth `？` being left-weighted, *not* badge-room asymmetry — the plaque is symmetric);
  meaning banner via shared `.boss-prompt` clamp. Screenshot: `？？` centered, banner legible. ✓
- **#4 Tone signal** — number + pitch-contour badge on each tone card (reuses Tone Trainer
  `TONE_CURVE`). Verified on 怎么 (`zěn me` etc., 4 signals rendered). ✓
- **#5 Cloze** — reading `clamp(17→24px)`, translation contrast fixed (opacity .75→1). ✓
- **#6 Typed** — first-run overlay rewritten as numbered steps (EN+TH). ✓
- **#7 Cat size** — `src/sprite-draw.js` shared-scale anchor (cat-happy → cat-walk height);
  offline render + in-game correct-vs-wrong screenshots show consistent size. New unit test
  added. **Halo → art regen queued** (`docs/art/CAT-WALK-V2-REGEN-TASK.md`). ✓
- **#8 Review Challenge stage 2** — same `.boss-prompt` legibility fix as #2. ✓
- **#9 Choose your words** — 2-line clamp on `#s-scope`/`#journey-list` controls; verified the
  longest Thai label ("เควสต์คำศัพท์ · 20") clamps to exactly 2 lines. ✓

**Gates:** `npm run build` clean; **1834/1834 tests pass** (incl. new sprite-draw test, i18n
usage-guard for the TH edits); **10/10 responsive viewports + listen-format + results probes
pass** (no overflow/scroll/tap regressions from the `clamp()` legibility changes). SHELL
bumped v70→v71.

## Decisions (2026-07-14, Jordan)
- **#7 white halo → (A) regen `cat-walk` v2.** Code fixes the size mismatch now via
  `sprite-metrics.js`; the halo is fixed by re-exporting the walk sprite with a clean matte —
  **queued as an art task for Jordan** (art regen is owner-gated per art-intake rule), not
  auto-de-matted.
- **Proceed:** build now on `feat/ui-polish-2`, grouped order, report back with screenshots.
