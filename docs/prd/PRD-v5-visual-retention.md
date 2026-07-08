# PRD v5 — Reference Visual Overhaul + Kind Retention

**Date:** 2026-07-07
**Status:** Approved design (brainstorm output)
**Target:** the existing game (`game/`, vanilla JS PWA + Android)
**Owner decision trail:** features are good; the gap is design/visual ("it cannot match my reference") and retention/habit. Art is produced AI-generated and style-locked to the reference. Monetization is out of scope (locked by `PRD-monetization-and-production.md`).

**The reference:** `game/assets/_plan/REFERENCE-production-target.png` is the single source of truth for how the game must look — warm daylight storybook style: cream paper surfaces, primary green / sun yellow / coral red / sky blue / warm brown palette, painted village and forest scenes, wooden-plaque UI, paw-print feedback stamps, friendly round-shaped characters.

---

## 1. Problem

1. **Visual mismatch.** The shipped app still runs the legacy dark-red/gold arcade theme (`index.html` inline CSS) while newer assets follow the reference's warm daylight style. There is no enforced style source of truth, so screens, assets, and effects drift apart. Result: weak first impression, incoherent art, flat game feel — the app cannot match the reference.
2. **Fragile habit loop.** The daily streak zeroes on a single missed day (classic streak-anxiety design), there is no collection meta beyond the shop, and the first session does not engineer an early win. Research (see §2) says these are the highest-leverage retention gaps for a solo dev.

## 2. Research grounding (2026-07-07 deep research)

Three research passes (competitors, learning science, retention design) inform this PRD. Key findings used here:

- **First-session design drives D1 retention**: well-designed first sessions reach 40–60% D1 vs <25% for poor flows; the first session must deliver a small guaranteed win and visible progress, not a tutorial tour.
- **Streak forgiveness works; streak anxiety backfires**: Duolingo's Streak Freeze cut churn ~21% among at-risk users, but its monetized, loss-aversion-heavy framing is its most criticized dark pattern. A built-in free grace mechanism captures the retention upside without the backlash. A single missed day does not destroy habit formation; the "what-the-hell effect" after a punitive reset does.
- **Collection mechanics are the most under-used proven lever**: collectible albums appear in 72% of top-grossing mobile titles (up from 21%); they retain via completion psychology with no pay/dark-pattern component.
- **Map-style progression** (Candy Crush saga map) reliably reduces decision paralysis for casual players; free choice should remain for self-directed learners.
- **Gamification helps learning when kind** (meta-analysis g≈0.82 overall, heavily design-moderated); leaderboards and punitive streaks are the two mechanics with documented downside.
- Recorded for later, not built now (§8): MC-recognition-only is the top documented learning weakness of Duolingo/HelloChinese-style apps (generation effect d≈0.40 favors recall/production modes; tone perception is untrained as a skill); **HSK 3.0 replaces HSK 2.0 in July 2026** and HSK 1–6-only content will read as legacy within a year; social features (friend quests: strongest social retention evidence) need the Supabase account layer first.

## 3. Goals & success criteria

1. **Every screen matches the reference.** Judged by a side-by-side check of each screen against the reference sheet (§4 A0 checklist). No legacy dark-red/gold surface remains.
2. **Every asset passes the style QA gate** (§4 A2) before integration.
3. **The battle feels juicy**: every answer produces immediate, satisfying, style-bible-consistent feedback (§4 A3).
4. **First run engineers a win**: a brand-new player finishes session one with a completed intro battle, a first collectible, and a visible next step (§4 A4).
5. **The streak is kind**: one missed day never zeroes an established streak (§5 B1).
6. **Collection meta exists**: mastering word-sets fills a sticker album (§5 B2).
7. All existing tests stay green; new pure logic ships with vitest coverage; `file://` still works; no new npm dependencies.

Retention metrics (D1/D7) cannot be measured without analytics/accounts; until the Supabase phase, success is judged qualitatively against the criteria above.

## 4. Track A — Match the Reference

### A0 — Style bible → design tokens

Extract the reference sheet into an enforceable spec:

- **Deliverable 1:** `game/docs/art/STYLE-TOKENS.md` — named hex values for the six-color palette (primary green, sky blue, sun yellow, coral, warm brown, soft gray) plus surface colors (cream paper, wood, dark ink text); typography rules (hanzi bold, pinyin clean/light, Thai friendly rounded); panel/plaque styles (rounded corners, soft shadow, paper texture); icon style (simple, consistent stroke weight); light rule (warm daylight, top-left).
- **Deliverable 2:** the same tokens as CSS custom properties (`--lc-green`, `--lc-cream`, …) at the top of `index.html`'s style block. All subsequent CSS references tokens, never raw hex.
- **Deliverable 3:** a per-screen match checklist (home, battle, flashcards, results, shop, street, progress, quests, settings, pause) used as the Track A acceptance gate.

### A1 — UI theme migration

Rewrite `index.html` inline CSS from the dark-red/gold arcade theme to the reference theme using A0 tokens, screen by screen:

- Backgrounds: cream/daylight surfaces; battle keeps the painted backdrop with the word plaque readable on top (plaque = cream paper card with pinyin above bold hanzi, speaker icon, Thai/English beneath as configured).
- Buttons: primary = sun-yellow plaque (START), secondary = green plaque, destructive/wrong = coral; disabled = soft gray. Rounded, soft-shadowed, chunky tap targets.
- HUD: level chip, coin/gem chips, hearts, round counter, combo strip restyled to the reference's badge/chip look.
- Typography per A0; check both EN and TH strings for fit (Thai line-height).
- **Acceptance:** per-screen checklist from A0 passes; no element uses a legacy color; `npm test` green (DOM-id consistency check unchanged).

### A2 — Style-locked asset regeneration

Regenerate the full asset set with generation prompts locked to the reference:

- **Master style prompt** derived from the reference sheet (palette names + hex, light rule, character style, "storybook watercolor-flat hybrid, soft edges, no gradients harsher than the reference") stored in `game/docs/art/GENERATION-PROMPTS-v5.md`; every asset prompt is master prompt + asset-specific clause.
- **Asset list (keep existing filenames — code changes stay minimal, `sprites.js`/`assets.js` registries unchanged):** home/village scene, battle backdrops (forest, night market, temple dawn, bamboo), base cat walk (6f) + happy (4f) sheets, shop skin sheets (midnight, sakura, jade, gold), boss cat, raccoon enemy sheets, word plaque + button nine-slices, badges/tags, correct paw stamp (green), wrong paw stamp (red), CRITICAL burst, street decos, shop icons.
- **QA gate (every asset, before integration):** palette sampled within STYLE-TOKENS values; warm top-left light; silhouette readable at 48–80 px on a phone; consistent line weight vs the reference; size budgets (backgrounds <350 KB, cat sheets <500 KB, icons <20 KB); PNG transparency clean. Log pass/fail per asset in the asset tracker (`ART-QA-CHECKLIST.md` flow).
- Canvas/vector fallbacks remain (file:// / missing-asset safety), per the existing art contract.
- **Acceptance:** all listed assets integrated and QA-logged; `test/` asset/precache validations green; visual spot-check vs reference approved by owner.

### A3 — Juice pass (game feel)

All effects in `fx.js`/canvas, no new deps, `prefers-reduced-motion` respected (reduced = fades only):

- **Correct answer:** green paw stamp on the answered option + small sparkle, enemy hit flash, plaque bounce. **Wrong:** red paw stamp, gentle screen nudge (no harsh shake), correct answer highlighted (existing behavior, restyled).
- **Combo:** escalating warm glow on the combo strip at 5/10/15; ×2 badge pop as in the reference.
- **Boss/CRITICAL:** the reference's "CRITICAL!" starburst on boss-stage kills.
- **Transitions:** soft cross-fade or slide between screens (~180–250 ms), consistent easing everywhere.
- **Results celebration:** cat happy animation + coin/star count-up (friendly tokens, never a jackpot/coin-shower — art-direction guardrail).
- **Acceptance:** each effect demonstrably fires in a manual playthrough script; reduced-motion path verified; frame budget holds on a mid-range Android device (no dropped-input jank in battle).

### A4 — Home + first-run redesign

- **Home = the reference home mock:** hero cat (large, animated idle) over the village scene, LUCKY CAT HSK plaque, streak plaque with progress bar, one dominant yellow START, Flashcards + Shop as secondary plaques, bottom nav (Home / Street / Progress / Quests / More).
- **First run (no saved state):** language + level selection kept short → a fixed friendly intro session: flashcard warm-up of 6 high-frequency words for the chosen level → a short battle (normal rules, standard distractors — no fake difficulty) → results screen awards the first sticker ("Welcome!") + first coins, and points at the streak plaque ("come back tomorrow to start your streak").
- START on the home screen defaults to the smart choice (Smart Review if ≥8 weak/due words, else next scope) so a returning player is one tap from playing; the full scope picker stays one tap away.
- **Acceptance:** a fresh profile reaches its first results screen in under ~3 minutes with a sticker awarded; returning-player START launches a session in one tap.

## 5. Track B — Kind Retention

### B1 — Kind streak (rest days)

Precise rules (implement exactly; pure logic in `daily.js`, all localStorage keys under `nbhsk.*`):

- A player with a current streak ≥ 3 days has **one automatic rest day per calendar week** (Mon–Sun, device-local time).
- If exactly one day is missed and a rest day is available, the streak **does not break**: the missed day is marked `rest`, the rest day is consumed, and the streak count stays (a rest day never *increments* the streak).
- Two consecutive missed days, or a second miss in the same week, breaks the streak as before.
- UI: calm framing — on return after a covered miss, show "🍵 Rest day used — your N-day streak is safe." Never guilt language, never a purchasable repair.
- Streaks < 3 days behave as today (nothing to protect yet).
- **Acceptance:** vitest cases for: miss-1-covered, miss-2-breaks, two-misses-same-week-breaks, rest-day-never-increments, week-boundary reset, streak<3 uncovered, migration from existing saved streaks (no retroactive break).

### B2 — Sticker album

- **Award rules:** one sticker per **scope** (the existing per-level sub-scope keys in `pool.js`) at 100% of that scope's words mastered; plus per-HSK-level milestone stickers at 25 / 50 / 75 / 100% mastery coverage; plus event stickers: "Welcome!" (first session, §4 A4), first boss defeated, 7-day streak, 30-day streak.
- **New pure module `stickers.js`** (award evaluation from mastery/coverage state, album model, persistence under `nbhsk.stickers`) + `test/stickers.test.js`.
- **Album screen** reachable from Progress: grid of earned (full color) and unearned (silhouette + hint text) stickers, per-level sections. Sticker art comes from the A2 style-locked pipeline (themed to the level's backdrop motifs: market, temple, bamboo…).
- New sticker toast on the results screen when earned (one per session max; queue the rest).
- Stickers are **never purchasable** — earn-only, separate from the coin shop.
- **Acceptance:** award evaluation fully unit-tested (thresholds, no double-award, queue behavior); album renders earned/unearned states; a sticker earned mid-session survives reload.

### B3 — Journey map

- **Optional "Journey" view** on the scope-selection screen (tab or toggle next to the existing picker — the free-choice picker remains untouched): each HSK level is a path of nodes, one node per scope, drawn in the reference's village/street visual language.
- Each node shows 0–3 stars from mastery coverage of that scope: ★ ≥50%, ★★ ≥80%, ★★★ 100% (100% also = the B2 scope sticker).
- **No hard gating:** every node is always playable (education-first; the map suggests order via the path line and a "you are here" cat marker at the first node below ★★).
- New pure module `journey.js` (node list from scope keys, star computation, current-position rule) + tests; map rendering wired in `main.js`.
- **Acceptance:** star thresholds unit-tested; map and picker show consistent data; tapping any node starts that scope.

## 6. Phasing

Each phase is one feature round (branch → `development` → PR, tests green, `npm run build`, `sw.js` SHELL bump on user-facing change):

| Phase | Scope | Why this order |
|-------|-------|----------------|
| 1 | A0 + A1 (tokens + full theme migration) | Biggest visible win; unblocks everything else's look |
| 2 | A2 (asset regeneration + QA gate) | Assets land into an already-correct theme |
| 3 | A3 + A4 (juice + home/first-run) | Feel and first impression on top of the new look |
| 4 | B1 + B2 (kind streak + sticker album) | Retention logic; stickers need A2's art pipeline |

> Phase-order note: A4's "first sticker" award depends on B2's `stickers.js`. In Phase 3 the first-run results screen ships with the celebration + coins only; the Welcome sticker activates in Phase 4 (first-run flow already leaves the toast slot in place).
| 5 | B3 (journey map) | Nice-to-have layer over stable scope/mastery data |

## 7. Constraints (inherited, binding)

- Vanilla JS + esbuild; **no new npm dependencies**; no framework.
- **`file://` must keep working** — no new `fetch()` of bundled data; asset fallbacks stay.
- Pure logic in small vitest-tested modules; `main.js` stays wiring-only.
- `localStorage` keys namespaced `nbhsk.*`; migrations must not destroy existing saves.
- Art guardrails: warm, education-first; **never** gambling visual language (no coin showers, slot effects, jackpot framing).
- Monetization untouched (learning free forever; no pay-to-win; stickers and rest days are never sold).

## 8. Out of scope — recorded v-next candidates (do not build in v5)

1. **New question types** — listening-first rounds, typed-pinyin/tone recall, cloze sentences (typed-pinyin recall shipped 2026-07-08, v6 phase 2, spec docs/superpowers/specs/2026-07-08-v6-typed-pinyin-design.md; listening-first rounds and cloze remain parked). Strongest learning-science upgrade on the shelf (generation effect d≈0.40; MC-only is competitors' top documented weakness); first candidate for v6.
2. **HSK 3.0 content** — the 9-level standard replaces HSK 2.0 in July 2026; requires a pipeline re-run with new wordlists. Content risk grows over time.
3. **Social layer** — weekly friend quest (strongest social retention evidence, 5.6x course-completion lift at Duolingo) and small opt-in leaderboards; blocked on Supabase accounts (see Lovable PRD / monetization PRD P3).
4. **Notifications & widget** — behavior-triggered, hard-capped ≤3–4/week, never guilt-toned; needs native work (Capacitor local notifications) and/or accounts.
5. **Tone-discrimination minigame, radical/component teaching, example sentences** — evidence-backed learning depth; parked with the question-type work.
6. iOS build, Chinese UI, subscription experiments — unchanged from prior PRDs' deferred lists.

## 9. Research sources

Full agent reports (competitive landscape, learning science, retention design) were produced 2026-07-07; headline citations: Duolingo streak-freeze/leagues case studies (trophy.so, Deconstructor of Fun), streak-psychology and abstinence-violation literature, GameRefinery collection-systems report, Candy Crush saga-map analyses, Adesope et al. 2017 testing-effect meta-analysis, Bertsch et al. 2007 generation effect, FSRS benchmarks (open-spaced-repetition), Frontiers 2023 gamification meta-analysis, HSK 3.0 rollout coverage (Pleco 2026 deck refresh), app-store/Reddit complaint patterns for HelloChinese/Duolingo Chinese.
