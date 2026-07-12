# Battle Interface Round — Design (2026-07-12)

Jordan's design brief, reconciled with this week's decisions and approved
2026-07-12. Goal: the battle screen reads as an interactive language-learning
battle, not a quiz floating over an illustration. Preserve the warm storybook
identity, background art, characters, typography personality, and quiz
mechanics. No generic-modern redesign.

## Approved deviations from the brief

1. **Player health lives in the scene, not twice.** Hearts move from the HUD
   into the battle scene above the cat (3 heart pips). The HUD does NOT keep a
   second copy. Enemy keeps its HP bar — asymmetry is intentional (enemy =
   depleting bar, player = hearts).
2. **Character scale is tuned, not fixed at +40%.** One tunable constant,
   screenshot-tested at 320/390/tall; ship the largest that doesn't collide
   with the card/answers (expected ~+25–35%, +40% is the ceiling).
3. **"Music volume" maps to SFX.** No music track exists; sliders ship for
   SFX and pronunciation. Ambient music loop deferred (asset-gated, Jordan's
   art-drop territory).
4. **Speaker button returns** beside the pinyin (supersedes audit F6 removal —
   it's the discoverability affordance for audio; whole-card tap stays).
5. **Reveal timing: 2s auto-advance + tap-anywhere-to-skip** (reconciles the
   brief's 1–1.5s with the owner-tuned REVEAL_MS=2000 from v64).
6. **Recap strip is a separate element below the card** — the hanzi card
   itself stays hanzi+pinyin only (v64 rule holds).

## Palette (tokens)

Only these; never pure black/white, neon, harsh gradients, gloss:
primary-green #32775E · sky-blue #5DAADD · sun-yellow #F2BC57 · coral #E69777
· warm-brown #846043 · soft-gray #B2AEA9 · paper-cream #FBF5E8 · deep-teal
#1F4D4A · light-sand #EAC796 · ink #2E2A24. Map to the existing `--lc-*`
custom properties in index.html; add missing tokens rather than inlining hex.

## 1. Layout

Portrait: HUD ~8–10% of usable height, battle scene ~54–58%, answer area the
rest. Safe-area insets and standalone PWA already in place (verified) — keep.
320px-wide minimum, verified via scripts/responsive-sweep.mjs.

## 2. HUD (simplified)

- Left: (hearts removed — now in-scene) round label "Round 2".
- Center: slim progress bar (track light-sand, fill primary-green), "2/20"
  supporting text (12–13px, warm-brown).
- Right: coin icon + total; circular pause button, ≥44×44px hit area.
- Flat cream chips; strip decorative borders/heavy shadows so the HUD never
  competes with the vocabulary card.

## 3. Vocabulary card

Upper-middle of the scene, never covering characters. Content top-to-bottom:
- Instruction line, localized: EN "Choose the correct meaning" / TH native
  string (added to i18n.js; TH native-review queue) — 14–16px, warm-brown.
  Per-format wording (listen: "Tap to hear · choose the meaning", etc.).
- HSK badge upper-left (exists, keep, 12–14px).
- Pinyin 20–22px + small speaker button (≥44px hit area) beside it.
- Hanzi 58–68px (clamp by viewport; existing hanziPx scaling).
Ink for primary text, warm-brown secondary. One hairline border + soft warm
shadow (drop the double-border + corner ticks). Card width logic from v63/v64
stays (hanzi+pinyin measured, defensive shrink).

## 4. Characters & scene

- Both characters scaled up by the tuned constant (parity from the sprite-
  metrics round holds; boss stays 1.5× the base).
- Shared ground line (already true).
- Hero hearts: 3 coral pips above the cat (gray when lost), replacing HUD
  hearts. Pop animation on loss.
- Enemy HP bar restyle: cream border, deep-teal track, primary-green fill
  (drawHpBar recolor). Animated depletion (exists — keep, retime if needed).
- Subtle warm wash under the ground band only (very light; backgrounds must
  stay vivid).

## 5. Answer buttons

2×2 grid, 12–16px gaps (exists). Restyle: paper-cream surface, light-sand
border, storybook rounded corners, ONE subtle warm contact shadow (remove
bevel stack), min-height 72px.

**Thai-primary:** when UI locale is th and scope.lang is "both", meaning()
returns thai as main (18–20px bold, ink) and english as sub (14–16px,
warm-brown). English-locale users keep english-primary. Pure change in
pool.js meaning() (gains a locale-aware call or wrapper) + unit tests.

States: pressed (translate-y 2px, smaller shadow, darker border), correct
(primary-green + ✓ icon), incorrect (coral + ✕ + short horizontal shake),
disabled, revealed-correct (green outline). Never color-alone (✓/✕ affixes
exist — keep).

## 6. Interactions

Correct: existing coin projectile stays as the attack; add cat lunge with
squash-and-stretch, impact particles at the raccoon (fx.js), "Correct!" +
"+10 XP" floater (growth.js XP exists), enemy HP animates down, soft success
sfx + light haptic (exist).

Wrong: NEW cute enemy bump — raccoon dashes toward the cat, soft bonk (no
weapon, never scary), cat squash "hurt" reaction, one heart pip pops, then
raccoon retreats (existing smug hop) for the rest of the reveal window.
Correct answer revealed green (exists). Short horizontal shake on the tapped
button; existing screen shake stays wrong-only and gentle.

## 7. Learning recap

During the reveal window a small cream strip appears BELOW the card:
`อากาศ · weather` (thai · english, order follows locale-primary). Tap
anywhere (canvas or strip) advances immediately; auto-advance at REVEAL_MS
(2000, unchanged). Example sentences: deferred (cloze data could feed later).

## 8. Battle juice inventory

Impact particles (extend fx.js), squash-and-stretch (cat.js/raccoon.js state
or draw-time transform), HP-bar animation (exists), gentle screen shake
wrong-only (exists), damage/impact symbols at hit point, streak indicator
(combo strip exists — restyle to palette). All soft and friendly.

## 9. Accessibility

≥44px touch targets (pause, speaker, buttons already large); contrast per
palette on cream; never color-alone; REDUCED_MOTION halves/kills all new
animations via the existing fxDuration/REDUCED_MOTION helpers; SFX +
pronunciation volume sliders in the pause menu (persisted nbhsk.settings);
zh/th/en font stacks already bundled — verify no clipping at 320px and at
increased browser font size (responsive sweep + manual check).

## 10. Out of scope

Background artwork, character art identity, quiz mechanics, scoring, SRS,
music track, example sentences, modal dialogs (none added).

## Waves

- **Wave 1 — layout & readability:** tokens, HUD, card (instruction/speaker/
  border), buttons restyle + Thai-primary, character scale tune, hearts
  in-scene, HP bar restyle, recap strip, tap-to-skip.
- **Wave 2 — juice & polish:** lunge/bump choreography, squash-and-stretch,
  impact particles + floaters, heart-pop, volume sliders, 320px/font-size/
  reduced-motion sweep.

One branch (`feat/battle-interface-round`), one PR per wave, screenshots per
wave, full `npm test` gate, SHELL bump only at the release cut.
