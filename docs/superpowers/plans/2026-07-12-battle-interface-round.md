# Battle Interface Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the battle screen read as a language-learning battle (spec: `docs/superpowers/specs/2026-07-12-battle-interface-round-design.md`) — simplified HUD, richer vocabulary card, in-scene hearts, bigger characters, Thai-primary answers, recap strip, tap-to-skip, then battle juice.

**Architecture:** All rendering stays in the existing shape: pure helpers in small modules (pool.js, fx.js, juice.js, raccoon.js, cat.js) with unit tests; main.js wires them to DOM/canvas (untested by design); all markup/CSS inline in index.html. Canvas draws the scene (plaque, characters, hearts, recap strip); DOM owns HUD and answer buttons.

**Tech Stack:** Vanilla JS ES modules, esbuild (`npm run build`), vitest (`npm test`), Playwright-chromium probes (`~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`, serve via `python3 -m http.server 8000`, probe scripts INSIDE the game dir, delete before commit).

## Global Constraints

- Palette only (spec §Palette): green #32775E, sky #5DAADD, yellow #F2BC57, coral #E69777, brown #846043, gray #B2AEA9, cream #FBF5E8, teal #1F4D4A, sand #EAC796, ink #2E2A24. No pure black/white, no neon, no gloss. Use/extend `--lc-*` tokens in index.html, never inline hex in new CSS.
- REVEAL_MS stays 2000 (owner-tuned). Never shorten it.
- Hanzi card shows hanzi + pinyin ONLY — translations never on the card (recap strip is a separate element).
- All new animation timing goes through `fxDuration`/`fxUntil`/`REDUCED_MOTION` in main.js (or takes a reduced flag in pure modules).
- Touch targets ≥44×44px. Correctness never color-alone (✓/✕ affixes stay).
- Run FULL `npm test` before every commit (never pipe through tail/grep/head). `npm run build` before any probe.
- Do not touch sw.js SHELL (release-cut only). Do not push (lead pushes).
- Do not change background art, character art files, scoring, SRS, or quiz mechanics.

---

## WAVE 1 — layout & readability

### Task 1: Palette tokens

**Files:**
- Modify: `index.html` (the `:root` block near line ~30-60)

**Interfaces:**
- Produces CSS vars later tasks use: `--lc-teal-deep: #1F4D4A`, `--lc-sky: #5DAADD`. Verify these already exist before adding: `--lc-green`(#32775E expected), `--lc-cream`(#FBF5E8), `--lc-sand`(#EAC796), `--lc-brown`(#846043), `--lc-coral`/error, `--lc-gray`/muted, `--ink`. Reuse existing names; only ADD missing ones. Record the final name→hex map in the commit message body.

- [x] **Step 1:** Read the `:root` block; list existing `--lc-*` values vs the spec palette.
- [x] **Step 2:** Add only the missing tokens (expected: deep-teal, sky-blue; possibly sun-yellow if only #f5c518 exists — add `--lc-sun: #F2BC57` alongside, do NOT change the existing gold used by canvas code). All 10 spec tokens already present exactly — no-op, see commit body.
- [x] **Step 3:** `npm test` (full) → 1661 pass. Commit: `feat(ui): palette tokens for battle-interface round`.

### Task 2: Thai-primary meaning()

**Files:**
- Modify: `src/pool.js:39-44` (meaning), `src/main.js` (meaningOf wrapper — grep `function meaningOf`)
- Test: `test/pool.test.js`

**Interfaces:**
- Produces: `meaning(w, lang, thaiPrimary = false)` — in `"both"` mode with `thaiPrimary && w.t`, returns `{ main: w.t, sub: w.e }`; otherwise unchanged. `"en"`/`"th"` modes unchanged.
- main.js `meaningOf(w, lang)` becomes `meaning(w, lang, getLocale() === "th")` (getLocale already imported from i18n.js — verify, else import).
- Consumed by: formats.js buildOptions paths that call meaning() — grep ALL meaning( callers in src/ and pass through the flag from one place only (meaningOf / the options builders' `lang` call sites in main.js). Distractor same-meaning exclusion (distractors.js) works on content tokens, not main/sub order — verify by reading it, note in commit.

- [x] **Step 1:** Write failing tests in `test/pool.test.js`:

```js
describe("meaning thaiPrimary", () => {
  const w = { e: "weather", t: "อากาศ" };
  it("both + thaiPrimary puts thai first", () =>
    expect(meaning(w, "both", true)).toEqual({ main: "อากาศ", sub: "weather" }));
  it("both without flag keeps english first", () =>
    expect(meaning(w, "both")).toEqual({ main: "weather", sub: "อากาศ" }));
  it("thaiPrimary with missing thai falls back to english-first", () =>
    expect(meaning({ e: "x", t: "" }, "both", true)).toEqual({ main: "x", sub: "" }));
  it("en/th modes ignore the flag", () => {
    expect(meaning(w, "en", true)).toEqual({ main: "weather", sub: "" });
    expect(meaning(w, "th", true)).toEqual({ main: "อากาศ", sub: "" });
  });
});
```

- [x] **Step 2:** Run `npm test` → these fail (arity/behavior).
- [x] **Step 3:** Implement:

```js
export function meaning(w, lang, thaiPrimary = false) {
  if (lang === "en") return { main: w.e, sub: "" };
  if (lang === "th") return w.t ? { main: w.t, sub: "" } : { main: w.e + " *", sub: "" };
  if (thaiPrimary && w.t) return { main: w.t, sub: w.e };
  return { main: w.e, sub: w.t || "" };
}
```

- [x] **Step 4:** Wire main.js meaningOf + any direct meaning() call sites feeding option builders; `npm run build`; probe with `localStorage nbhsk.locale='"th"'` → buttons show thai bold on top, english under.
- [x] **Step 5:** Full `npm test` → pass. Commit: `feat(battle): thai-primary answers for thai-locale users`.

### Task 3: HUD simplification

**Files:**
- Modify: `index.html` (battle HUD markup + CSS — grep `hud`, hearts markup), `src/main.js` `updateHud()` (grep `function updateHud`), `src/hud.js` (pure helpers, if any fit)
- Test: `test/hud.test.js` (only if a pure helper is added)

**Interfaces:**
- Produces: HUD = [round label] [progress bar + "n/20"] [coins] [pause]. Hearts REMOVED from HUD (in-scene from Task 5 — Tasks 3 and 5 land in the same wave, do 3 then 5 back-to-back so a mid-wave build isn't heartless; acceptable interim).
- Progress: `B.resolved / B.deck.length` (grep exact fields; sessionLen normalizes). Add pure `roundProgress(resolved, total)` → clamped 0..1 in hud.js WITH test.
- Pause button: ensure computed hit area ≥44px (padding, not icon growth).

- [x] **Step 1:** Test for `roundProgress` (clamp 0..1, total=0 → 0). Run → fail.
- [x] **Step 2:** Implement in hud.js; test passes.
- [x] **Step 3:** Markup/CSS: slim bar (height ~6px, track `--lc-sand`, fill `--lc-green`, border-radius 3px), "n/20" 12-13px `--lc-brown`; flatten HUD chips (single hairline border, no inner shadows). Remove heart pips from HUD markup + their update code in updateHud (leave B.lives logic untouched).
- [x] **Step 4:** Build + probe screenshot (390×844): HUD reads round+bar+coins+pause; measure pause button box ≥44.
- [x] **Step 5:** Full `npm test`. Commit: `feat(battle): simplified HUD — round progress bar, no duplicate hearts`.

### Task 4: Vocabulary card — instruction line, speaker button, lighter frame

**Files:**
- Modify: `src/main.js` `drawWordPlate` (~line 2070) + canvas click handler (grep `plaqueRect`), `src/i18n.js` (new keys)
- Test: `test/i18n-usage.test.js` auto-guards key usage (verify it picks the new keys up)

**Interfaces:**
- i18n keys: `battle.instruction.meaning` ("Choose the correct meaning" / TH "เลือกความหมายที่ถูกต้อง"), `.reverse` ("Choose the hanzi" / "เลือกตัวอักษรที่ถูกต้อง"), `.listen` ("Listen, then choose" / "ฟังแล้วเลือกความหมาย"), `.tone` ("Choose the pinyin" / "เลือกพินอินที่ถูกต้อง"), `.typed` ("Type the pinyin" / "พิมพ์พินอิน"), `.cloze` ("Fill the blank" / "เติมคำในช่องว่าง"). Mark TH strings for the native-review queue in the commit body.
- Produces: `B.speakerRect` `{x,y,w,h}` (canvas hit region beside pinyin, ≥44px square in CSS pixels) — click handler order: speaker hit → replay audio ONLY; card hit elsewhere → replay (existing); during reveal window, any canvas tap outside speaker → skip (Task 6 consumes this ordering).

- [ ] **Step 1:** Add i18n keys (both locales). Full `npm test` (the usage guard will fail until they're referenced — add keys and wiring in one step if the guard demands it).
- [ ] **Step 2:** drawWordPlate: instruction line above pinyin (14-16px equivalent via `T` scale, `--lc-brown` ink `#846043`), format-keyed. Extend `lh` accordingly. Speaker glyph (reuse `iconSvg("sound")` path style — canvas: draw a simple rounded speaker mark, sun-yellow fill, ink stroke) beside pinyin; store `B.speakerRect`. Replace the double border + corner ticks with ONE 1.4*T hairline (`#B98F55` kept) + existing soft shadow (the 9-slice sprite path stays as-is; simplification applies to the vector fallback AND shrink the 9-slice inset look only if trivial — do not regenerate the plaque asset).
- [ ] **Step 3:** Click handler: speakerRect check before plaqueRect.
- [ ] **Step 4:** Build + probe: screenshot question live (EN + TH locales); tap speaker region → audio fires (assert via `speechSynthesis`/Audio spy in page, or visually confirm no crash + log).
- [ ] **Step 5:** Full `npm test`. Commit: `feat(battle): card instruction line + speaker affordance, lighter frame`.

### Task 5: Hearts in-scene + HP bar restyle

**Files:**
- Modify: `src/main.js` `draw()` (player cat block ~line 1950), `src/raccoon.js` `drawHpBar` (~line 215)
- Test: `test/raccoon.test.js` (drawHpBar color args if it becomes parameterized — else visual only)

**Interfaces:**
- Produces: `drawHearts(ctx, x, topY, lives, maxLives, S)` — new export in `src/hud.js` (canvas-drawing but pure-ish: no state; test via fake ctx recording calls, same pattern as `test/sprite-draw.test.js`). 3 pips, filled `#E69777`, lost `#B2AEA9`, ink outline, ~10*S px each, 4*S gap, centered above the cat's head (same y-convention as enemy drawHpBar: `gy + 6*B.S - 64*catScale - 14*B.S`).
- drawHpBar recolor: border `#FBF5E8` (cream) width 1.2*scale, track `#1F4D4A` (deep teal), fill `#32775E` (green). Same geometry/signature.

- [ ] **Step 1:** Fake-ctx test for `drawHearts`: records `lives` filled + `maxLives-lives` gray pips, positions monotonic. Run → fail.
- [ ] **Step 2:** Implement drawHearts (heart = two arcs + triangle path, matching the HUD heart glyph shape previously used).
- [ ] **Step 3:** Wire into draw() after drawCat: `drawHearts(ctx, B.L.mascotX, heartsY, B.lives, 3, B.S)`. Recolor drawHpBar.
- [ ] **Step 4:** Build + probe: hearts above cat, correct fill/lost states after a wrong answer; HP bar shows cream/teal/green.
- [ ] **Step 5:** Full `npm test`. Commit: `feat(battle): hearts live in-scene above the cat; HP bar recolored cream/teal/green`.

### Task 6: Reveal card persistence, recap strip, tap-to-skip

**Files:**
- Modify: `src/main.js` — killZombie, the wrong branch of answer(), bite(), draw(), canvas click/keydown handlers, scheduleNext

**Interfaces:**
- Produces: `B.reveal = { w, boss, format }` snapshot set at EVERY resolution (killZombie, wrong branch, bite) and cleared in spawnZombie/startBattle. draw(): when `B.zombie` is null and `B.nextAt` is in the future and `B.reveal` exists → draw the word plate for `B.reveal.w` (revealed=true vis) so the card no longer vanishes mid-reveal, PLUS the recap strip.
- Recap strip: small cream rounded strip directly under the plate: `m.main · m.sub` one line (from `meaning(w, scope.lang, getLocale()==="th")`; if sub empty, main only), 15*T font, ink main / brown sub, sand hairline border. Drawn on canvas below plaqueRect.
- Tap-to-skip: during the reveal window (`!B.zombie && B.nextAt > now`), canvas tap OUTSIDE `B.speakerRect` → `B.nextAt = performance.now()` (guard: only when `B.reveal`). Also Enter/Space keydown. Strip + plate both count as skip surfaces (speaker still replays).

- [ ] **Step 1:** Implement snapshot + persistent plate + strip + skip.
- [ ] **Step 2:** Build + probe: answer correctly → plate + strip visible the WHOLE 2s (screenshot at +600ms and +1500ms), strip shows `อากาศ · weather`-style line; tap at +500ms → next word spawns immediately (measure <300ms after tap).
- [ ] **Step 3:** Wrong answer → same persistence; correct button green through window (existing).
- [ ] **Step 4:** Full `npm test`. Commit: `feat(battle): reveal window keeps the card + adds recap strip; tap to skip`.

### Task 7: Buttons restyle + character scale tune

**Files:**
- Modify: `index.html` (`#opts button` CSS blocks ~line 410-520 + the ≤700px tiers), `src/main.js` rScale/cat scale (~line 1950/1992)

**Interfaces:**
- Produces: `const CHAR_SCALE` in main.js (single constant multiplying BOTH the cat's 0.9 and raccoon base 0.9 — i.e. replace both `.9` with `0.9 * CHAR_SCALE`… simpler: `const CHAR_BASE = 0.9 * CHAR_SCALE` used by both). Start CHAR_SCALE = 1.4; screenshot 320×568, 390×844, 412×915; step down 1.4 → 1.3 → 1.25 until: no clip of cat tail at left edge, raccoon spawn not clipped right, ≥16px gap between characters and the card at its tallest (instruction+pinyin+hanzi), hearts/HP bar unclipped. Record chosen value + screenshots in commit body.
- Buttons CSS: min-height 72px; background `--lc-cream`; border 1.5px `--lc-sand`; radius keep existing storybook value; ONE shadow `0 2px 4px rgba(46,42,36,.14)`; remove inset bevel stack. Pressed (`:active:not(:disabled)`): `transform: translateY(2px)`, shadow `0 1px 2px`, border-color `--lc-brown`. `.opt-label` 19px (18-20 range), `.th` 15px. Keep good/bad state colors + ✓/✕ (restyle shadows only). Preserve the line-clamp guards (audit F5 history) — do not remove `-webkit-line-clamp` rules.

- [ ] **Step 1:** CSS restyle; build; screenshot all 4 button states (idle/pressed/good/bad) at 390 + 320.
- [ ] **Step 2:** CHAR_SCALE sweep as above; pick value; screenshot final at 3 viewports.
- [ ] **Step 3:** `node scripts/responsive-sweep.mjs` (serve first) → no new failures.
- [ ] **Step 4:** Full `npm test`. Commit: `feat(battle): storybook button restyle (72px, flat cream) + characters scaled up ~N%`.

### Task 8: Wave-1 gate

- [ ] Full `npm test`; `npm run build`; responsive sweep clean; screenshot set (EN + TH, 320/390); delete probe files; lead reviews → PR `feat/battle-interface-round` Wave 1.

---

## WAVE 2 — battle juice & polish

### Task 9: Squash-and-stretch + lunge/bump curves (pure)

**Files:**
- Create: nothing new — extend `src/juice.js`
- Test: `test/juice.test.js`

**Interfaces:**
- Produces (all pure, t in ms since trigger, return neutral values past duration):
  - `lungeOffset(t)` → `{dx, sx, sy}` cat attack: forward dx peaks ~+14 at t≈120, back to 0 by 320; squash sx 1.1/sy 0.9 at launch → 1/1.
  - `bumpOffset(t, dist)` → `{dx}` raccoon dash toward cat: 0→-dist ease-in by 160, hold 60, return by 420.
  - `hurtSquash(t)` → `{sx, sy}` victim squish: sx 1.15, sy 0.85 at t≈40 → 1/1 by 260, with 1 small rebound.
- All consumed by main.js draw() as ctx transforms around the ground-contact point; reduced-motion: main.js passes t=Infinity (neutral) when REDUCED_MOTION.

- [ ] **Step 1:** Tests: neutral at t<0 and t>duration; peak signs/magnitudes at documented times; monotonic return. Run → fail.
- [ ] **Step 2:** Implement (damped sin/ease shapes, mirror plaqueBounce style already in juice.js).
- [ ] **Step 3:** Full `npm test`. Commit: `feat(juice): lunge, bump, hurt-squash curves`.

### Task 10: Correct-answer choreography

**Files:**
- Modify: `src/main.js` (killZombie sets `B.lungeAt`; draw() applies lungeOffset to the cat transform; impact particles + floaters), `src/fx.js` (impactBurst)
- Test: `test/fx.test.js`

**Interfaces:**
- `impactBurst(x, y)` in fx.js → array of ~8 particle specs `{x,y,vx,vy,life,kind:"impact"}` short-lived (0.35s), drawn as small sun-yellow/cream starbits in the existing particle loop (add `kind==="impact"` branch).
- Floater: on kill push TWO floats — existing combo floater stays; add `{text: t("battle.correct") + "  +" + xpGained + " XP", …}` where xpGained is the addXp amount for a kill (grep addXp call in the correct branch; if XP-per-kill isn't currently granted at kill time, grant via the existing quest/growth flow — do NOT invent new XP economy: show the amount that's actually credited; if none is credited per-kill, show only "Correct!"). i18n key `battle.correct` ("Correct!" / "ถูกต้อง!").
- Cat lunge trigger: `B.lungeAt = performance.now()` in the correct branch (at coin launch, not at kill, so the attack reads as causing the hit).

- [ ] **Step 1:** fx test: impactBurst count/life/kind. Fail → implement → pass.
- [ ] **Step 2:** Wire draw(): cat transform when `now - B.lungeAt < 320` (skip when REDUCED_MOTION); impactBurst at raccoon on kill; floats.
- [ ] **Step 3:** Build + probe screenshots at +80/+200ms after correct tap: cat leans forward, starbits at raccoon, floater visible.
- [ ] **Step 4:** Full `npm test`. Commit: `feat(battle): correct-answer choreography — lunge, impact, Correct!/+XP floater`.

### Task 11: Wrong-answer bump + heart pop

**Files:**
- Modify: `src/main.js` (wrong branch timeline + draw()), `src/hud.js` (drawHearts gains `popT` param), `src/raccoon.js` (nothing — bump is a draw-time dx from juice.js)
- Test: `test/hud.test.js` (pop param renders the popping heart scaled)

**Interfaces:**
- Wrong timeline: `z.state="wrong"` stays (retreat hop), but first `B.bumpAt = performance.now()`; draw() applies `bumpOffset(now-B.bumpAt, gapToCat)` to the raccoon dx BEFORE the retreat drift, and `hurtSquash(now-B.bumpAt-160)` to the cat; heart pip lost at bump contact: `drawHearts(..., popT)` scales the popping pip up 1.4× and fades over 240ms. Heart COUNT change stays where it is (B.lives already decremented in answer()) — the pop is purely visual: pass `popT = now - B.bumpAt - 160` and `popIndex = B.lives` (the just-lost pip).
- `WRONG_MS` unchanged (bump 420ms fits inside 560ms hop window; retreat starts after bump returns).
- Timeout (bite) path: same bump (the raccoon reached the cat anyway) — set B.bumpAt in bite() too.

- [ ] **Step 1:** hud test for pop scaling/fade. Fail → implement → pass.
- [ ] **Step 2:** Wire timeline; REDUCED_MOTION → no bump/squash, heart just swaps to gray.
- [ ] **Step 3:** Build + probe wrong answer at +100/+250/+450ms: raccoon at cat, cat squished, heart popping, then retreat. Verify it reads CUTE (no weapon, soft) per §13.
- [ ] **Step 4:** Full `npm test`. Commit: `feat(battle): wrong-answer bump — visible cause for the lost heart`.

### Task 12: Volume controls

**Files:**
- Modify: `src/sfx.js` (master gain), `src/audio.js` + `speak` path (voice volume), `src/main.js` (settings + pause menu UI), `index.html` (slider CSS)
- Test: `test/sfx.test.js` or new `test/settings-volume.test.js` for the pure clamp/persist helpers

**Interfaces:**
- `settings.sfxVol` and `settings.voiceVol` (0..1, default 1) persisted in existing `nbhsk.settings` via the existing settings store pattern.
- sfx.js: export `setSfxVolume(v)` — multiplies every internal gain (store a module-level `master`, apply in the gain envelope: `vol * master`).
- audio.js/speak: mp3 `Audio.volume = voiceVol`; SpeechSynthesisUtterance `.volume = voiceVol`.
- Pause menu: two labeled range inputs (styled: sand track, green thumb, ≥44px touch), i18n keys `settings.sfxVol` ("Sound effects" / "เสียงเอฟเฟกต์"), `settings.voiceVol` ("Pronunciation" / "เสียงอ่าน").

- [ ] **Step 1:** Tests: clamp helper (0..1, bad input → 1), setSfxVolume affects the envelope value (fake AudioContext pattern — see existing sfx tests for the stub style). Fail → implement → pass.
- [ ] **Step 2:** Wire UI + persistence; build + probe: sliders render in pause overlay, values persist across reload (localStorage check).
- [ ] **Step 3:** Full `npm test`. Commit: `feat(audio): separate SFX and pronunciation volume controls`.

### Task 13: Wave-2 gate — a11y & viewport sweep

- [ ] REDUCED_MOTION probe (`page.emulateMedia({reducedMotion:'reduce'})`): no lunge/bump/pop motion, states still legible (gray heart, ✓/✕, reveal strip).
- [ ] 320×568 + browser-font-scale probe (`page.addInitScript` set `document.documentElement.style.fontSize='20px'`): no clipped Thai/labels; responsive-sweep clean.
- [ ] Full `npm test`; screenshots EN+TH; delete probes; lead review → PR Wave 2.

---

## Self-review notes

- Spec coverage: HUD(§2→T3), card(§3→T4), characters/hearts/HP(§4→T5,T7), buttons/Thai(§5→T2,T7), interactions(§6→T10,T11), recap(§7→T6), juice(§8→T9-T11), a11y/volume(§9→T12,T13), tokens(palette→T1). Background wash (§4 last bullet): folded into T7 step 2 — add a single `rgba(46,42,36,.06)` ground-band veil while tuning CHAR_SCALE; drop it if it dulls the art (lead judges screenshots).
- Type consistency: `meaning(w, lang, thaiPrimary)`, `drawHearts(ctx,x,topY,lives,maxLives,S,popT?,popIndex?)` (T5 defines base arity; T11 appends optional params — additive, no breakage), `lungeOffset/bumpOffset/hurtSquash` as defined in T9 and consumed in T10/T11.
- No placeholders: verify each task carries concrete code or exact CSS/values.
