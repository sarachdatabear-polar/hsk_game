# Lantern Trail Migration Plan

**Status:** In progress — Phases 0–5 and the Phase 6 automated release candidate are merged to `development` through PR #95 (`a6164a9`); physical-device verification and release remain pending
**Product direction:** Replace the visible battle with a continuous Word Quest while reusing the current art and learning systems.  
**Primary rule:** A finite session length means words successfully learned, not attempts made. A missed word returns until it is answered correctly.

### Implementation checkpoint (Codex + Claude workflow, 2026-07-13)

- [x] Phase 0 characterization and regression coverage retained; current merged build passes 1,827 tests and validates all 95 manifest assets.
- [x] Phase 1 deep `quest-session.js` module: finite learned-word targets, exhaustive custom/intro decks, Endless mode, spaced retries, Review Pouch state, every-10th Review Challenge, five-word milestones, and twenty-word chapters.
- [x] Phase 2 integration behind the current visual shell: hearts/lives removed, misses and timeouts requeue, HUD reports `Review N` and `Learned N/target`, existing warm art and animation remain intact.
- [x] Phase 3 semantic page layout and purpose/lantern bar; merged through PR #90 (`34b7ab3`).
- [x] Phase 4 visible three-node Lantern Trail, advancing cat, friendly guide, lucky-charm feedback, and 20-word existing-backdrop rotation; merged through PR #91 (`f6b2489`).
- [x] Phase 5 semantic Review Challenge, postcard results/rewards, missed-word recap, next-review hook, and retry-economy protection; merged through PR #93 (`3d3f821`).
- [ ] Phase 6: automated verification, SHELL v69, and signed Android candidate are merged through PR #95 (`a6164a9`); physical-device verification and release to `main` remain.

Do not describe the migration as fully shipped: `main` still serves the pre-migration release. `development` contains the complete Word Quest and Lantern Trail through Phase 5, but the Phase 6 device/release gate is still required.

## 0. Decisions locked (grilled with Jordan, 2026-07-13)

These override any ambiguous prose below. Grilling transcript settled seven branches:

1. **Retry payout — learning only, no coins.** A pouch retry answered correctly grants mastery + `learned` progress + XP + quest credit, but **zero coin score**. Coins stay tied to first-try correctness so the new retry opportunities can't inflate the (near-monetized) coin economy. Implemented via `origin`: only `origin:"fresh"` first-try correct fires `B.score`/coins.
2. **Challenge requeue — full challenge.** A failed Review Challenge returns as the **full two-stage** meaning→reverse-recall challenge (`next()` carries `reviewChallenge:true`); it counts as a learned slot only when cleared as a challenge.
3. **Onboarding miss — requeue, no mastery ding.** First-run 6 warm-up words and first-appearance format intros **requeue to the pouch** (learn-once holds) but do **not** record a mastery failure. Settles the open "soft-intro free-miss SRS reset" question: a free miss does not reset the streak.
4. **Progress display — stall at `learned/target`.** The headline stays `learned / target`, monotonic; it visibly stalls while the pouch drains. The "Review Pouch N" count carries the "why is this longer" signal. No growing denominator / moving goalpost.
5. **Time pressure — keep the deadline, reframe it.** The per-word timer stays (timeout → gentle "come back to this one" → pouch, no punishment), preserving the speed-based coin bonus (`distFrac`) and difficulty ramp. The guide reaching the plaque reads as neutral/encouraging, never an attack.
6. **Lucky Flow — retries transparent.** The correct-answer streak / coin multiplier counts consecutive **fresh-word** corrects only; a pouch retry neither builds nor breaks it.
7. **Release cadence — one release at the end.** Phases 0–5 are dev checkpoints on `development` (revertible, each tested). **Nothing reaches `main`/users until the full Lantern Trail is done** (Phase 6), with a single SHELL bump. No shipping half-migrated states (e.g. dead hearts).

Derived rules these imply (already reflected in §5 below where relevant):
- `quest.resolve()` reports `origin` (`"fresh" | "review"`); score, combo (Lucky Flow), and daily paths branch on it.
- Smart Review / Practice Missed deck words are `origin:"fresh"` **in their own session** → they still pay coins ("preserve current reward rules"); only an in-session re-miss becomes `origin:"review"` (no coins). No special-casing needed.
- Daily increments per **learned** word, immediately on each success (so a quit banks learned-so-far) — replaces `noteDaily(B.resolved)`.
- Perfect = finite quest completed with **no word ever pouched** (maps onto today's `B.misses.length===0`).

## 1. Outcome

Migrate `#s-battle` into the **Lantern Trail Word Quest** without rebuilding the app around a new engine.

The player still chooses HSK scope, language, question formats, and a session length of 20, 40, 100, custom 5–500, or Endless. The existing weighted vocabulary selection, mastery ladder, audio, pinyin, cloze, typed input, rewards, daily systems, shop skins, and route backgrounds remain in use.

The visible experience changes from “survive three mistakes and defeat raccoons” to:

1. Recall a word.
2. A correct answer advances Lucky Cat one step.
3. Every five learned words lights a landmark lantern.
4. A wrong answer is explained and placed in the Review Pouch.
5. The word returns after two other encounters, or sooner when no other word is available.
6. A finite quest ends only when its target count has been answered correctly.

## 2. Locked Game Rules

| Situation | Required behavior |
|---|---|
| 20 / 40 / 100 / custom quest | Target counts successful word completions. Wrong attempts can make the quest longer. |
| Endless | Never ends automatically. Fresh words and due Review Pouch words continue until the player quits. |
| Correct answer | Record mastery success, increment learned progress, award existing score/XP/quest credit, advance the cat, and update the next lantern. |
| Wrong answer | Record mastery failure, reset Lucky Flow, reveal the correct answer, and schedule the same word after two other encounters. Do not advance route progress. |
| Timeout | Behaves like a wrong answer. It does not harm the cat or end the quest. |
| Repeated miss | Keep one scheduled copy of the word; move its due position forward instead of creating duplicates. |
| Near quest end | If two other encounters are unavailable, return the missed word as soon as possible. Never deadlock completion. |
| First-run quest | The six warm-up words are the finite source. Each must be answered correctly once. A miss requeues to the pouch but records **no** mastery failure (Decision 3). |
| Practice Missed / weak-word deck | Every supplied word must be answered correctly once; ignore the normal session length. |
| Smart Review | Every scheduled review word must be answered correctly once. Preserve its current reward rules. |
| Review Challenge | Replaces the boss presentation. It remains a two-stage meaning → reverse-recall encounter and returns if failed. |
| Pause / backgrounding | Preserve the current frozen timers and never auto-resume. |
| Quit | Bank rewards already earned and preserve mastery/review state. Finite quest completion rewards require actual completion. |

### Counting definitions

Use separate counters so the old overloaded `spawned/resolved/correct` fields do not silently change meaning:

- `planned`: number of fresh finite-session slots introduced.
- `learned`: slots completed correctly; drives route and quest completion.
- `attempts`: every accepted answer or timeout; drives accuracy.
- `correctAttempts`: correct submissions; drives accuracy and the existing correct-answer quest.
- `reviewed`: number of attempts served from the Review Pouch.
- `missedWords`: unique words that required at least one retry; shown on results as “Needed extra practice.”

Daily activity should increment when a word becomes learned, not when an incorrect attempt resolves. This makes the 20-word daily goal mean 20 successful learning steps.

## 3. Mobile Page Layout

Keep the existing screen, canvas, and answer grid as the migration shell. Do not create a second gameplay screen.

```text
┌──────────────────────────────────┐
│ Review Pouch 2   Village Gate  ⏸ │  48–52 px purpose bar
│                  12 / 40          │
│ ━━━━━━━━━━━━━━━━─────────────── │  overall learned progress
├──────────────────────────────────┤
│                                  │
│      [word plaque + audio]        │
│                                  │
│ 🐱  ○──●──○  local trail     🦝 │  illustrated encounter stage
│                                  │  34–40% of portrait height
├──────────────────────────────────┤
│ Choose the meaning · Lucky Flow 3│  compact prompt / feedback rail
├────────────────┬─────────────────┤
│ answer         │ answer          │
├────────────────┼─────────────────┤  2×2 thumb answer zone
│ answer         │ answer          │  38–44% of portrait height
└────────────────┴─────────────────┘
```

### 3.1 Purpose bar

- Left: `Review Pouch N`; hide when zero but preserve its space to avoid layout shift.
- Center: current route name and `learned / target`; Endless uses `learned · ∞`.
- Under center: a thin overall progress bar for finite sessions.
- Right: the existing 44×44 pause control.
- Remove hearts, live coin score, and “Round” from the decision screen. Coins remain on Results and persistent navigation surfaces.

### 3.2 Lantern meaning

Lanterns are milestones, never a hardcoded session size.

- One learned word = one invisible route step and one cat movement increment.
- Every five learned words = one lantern milestone.
- The canvas shows only the nearest three route nodes so 20, 40, 100, custom, and Endless all fit the same scene.
- The overall bar and numeric label communicate total progress.
- Every 20 learned words reaches a landmark and may rotate to the next existing backdrop.
- Endless mode continues through repeating 20-word route chapters.

Examples:

| Mode | Overall label | Lantern behavior |
|---|---|---|
| 20 | `12 / 20 learned` | 4 total milestones; local scene shows nearby nodes |
| 40 | `12 / 40 learned` | 8 total milestones; no eight-lantern HUD row |
| 100 | `12 / 100 learned` | 20 total milestones; represented by overall progress + local nodes |
| Endless | `37 learned · ∞` | Current 20-word chapter shows its nearby milestones; next backdrop begins at 40 |

### 3.3 Encounter stage

- Continue rendering the scene in `#cv` so all existing DPR, responsive, pause, and draw-loop behavior remains valid.
- Keep the word plaque in the upper-middle of the canvas at 60–72% of canvas width.
- Enlarge Lucky Cat and the guide to remain readable at 360×640 without overlapping the plaque.
- Lucky Cat stays on the left and advances across a short local trail; when the local segment completes, reset the local position while the overall counter continues.
- Reframe the raccoon as a traveling guide or Review Keeper. Use `raccoon-walk.png` for arrival and `raccoon-happy.png` for correct resolution.
- Replace the HP bar with local trail nodes.
- Replace the coin projectile with an existing orb/lucky-charm effect. Coins are still awarded; they simply do not fly as an attack.

### 3.4 Prompt and feedback rail

- Always state the current task: Choose the meaning, Listen and choose, Choose the Hanzi, Choose the tone, Complete the sentence, or Type the pinyin.
- Show Lucky Flow only at two or more consecutive correct answers.
- Correct feedback: answer confirmation, paw stamp, lucky charm, cat step, audio/meaning reveal.
- Wrong feedback: chosen answer in coral, correct answer in jade, meaning/pinyin reveal, and “Returns after two words.”
- Use the same rail for timeout feedback.
- Do not use screen shake or full-screen red flash for an ordinary error.

### 3.5 Answer zone

- Preserve `#opts` and all current question-format branches.
- Keep the 2×2 grid for multiple choice and existing full-width rows for listening, cloze prompts, and typed pinyin.
- Primary answer: maximum two or three lines depending on viewport height.
- Secondary Thai/English line: visually quieter; after a choice it may expand to show the full translation.
- Keep minimum 44×44 targets and the current correct/wrong non-color markers.

### 3.6 Landscape

Retain the existing two-column landscape strategy:

- Left column: purpose bar + canvas.
- Right column: prompt rail + answers.
- Overall progress spans the canvas column rather than becoming a wide lantern row.
- No new internal scrolling during an encounter.

## 4. Existing Asset Reuse

No new production art is required for the first release.

| Existing asset/system | Lantern Trail use |
|---|---|
| `bg-quest.png`, `bg-battle.png`, `bg-market.png`, `bg-temple.png`, `bg-bamboo.png` and seasonal scenes | Route chapters and landmark changes |
| `cat-walk.png` and owned skin walk sheets | Lucky Cat route movement |
| `cat-happy.png` and owned happy sheets | Correct answer and milestone celebration |
| `raccoon-walk.png` | Guide arrival / time-pressure movement |
| `raccoon-happy.png` | Guide celebrates and moves on after learning |
| `lantern.png` | Landmark milestone, lit with canvas tint/glow |
| `ui-word-plaque.svg` | Central word prompt |
| `ui-card-paper.svg`, neutral/primary buttons | Prompt and answer surfaces |
| `fx-correct.svg`, `fx-wrong.svg` | Answer stamps |
| `vfx-orb-green/gold/blue/red.svg` | Lucky charms and Review Challenge effects |
| `ui-icons.svg` | Pause, audio, review pouch, progress, and feedback affordances |
| Current SFX/haptics | Remap kill → correct, combo → Lucky Flow/milestone, wrong → gentle correction |
| Journey, stickers, Street, shop backgrounds/skins | Results, route chapters, and long-term rewards |

Optional later art, only after the reused-asset version is tested:

- one raccoon bow/guide pose;
- lantern off/on variants if canvas tint is insufficient;
- one route-postcard results frame.

## 5. Game-System Design

### 5.1 New deep module: `src/quest-session.js`

Move session scheduling and completion rules behind one small interface. Canvas and DOM code must not decide whether a word is fresh, due for retry, learned, or complete.

Proposed interface:

```js
const quest = createQuestSession({
  mode,                 // "round" | "endless"
  target,               // normalized 5–500 or Infinity
  deck,                 // current scoped/custom deck
  source,               // "weighted" | "exhaustive"
  masteryStore,
  retryGap: 2,
  milestoneEvery: 5,
  chapterEvery: 20,
  rng,
  now,
});

quest.next();
// { word, origin: "fresh" | "review", plannedIndex, reviewChallenge }

quest.resolve({ correct, timedOut });
// { retryQueued, learnedAdvanced, milestoneReached, chapterReached, complete }

quest.view();
// { learned, target, attempts, correctAttempts, reviewPouch,
//   localStep, nextMilestone, complete, endless }
```

Interface invariants:

- Only one active encounter exists at a time.
- `next()` cannot discard an unresolved encounter.
- `resolve()` can be called once per active encounter.
- Finite completion requires all planned fresh slots and all queued retries to be correctly resolved.
- `view()` returns display-ready facts without exposing queue internals.
- Randomness and time are accepted dependencies so tests are deterministic.

This is an in-process module. Do not add adapter classes or a storage port: the session is ephemeral and there is only one implementation.

### 5.2 Scheduling algorithm

For a normal finite quest:

1. Serve a due Review Pouch word when its two-encounter gap has passed.
2. Otherwise select a fresh word with the existing frequency/mastery weighting and recent-word avoidance.
3. Stop introducing fresh slots after `planned === target`.
4. After that, serve remaining Review Pouch words until all are correct.
5. End only when no active encounter and no scheduled retry remain.

For exhaustive sources—first run, Practice Missed, weak words, Smart Review—shuffle the supplied deck once and schedule each word exactly once before retries.

For Endless, continue introducing fresh words forever while still serving due retries.

### 5.3 Integration seam in `src/main.js`

`main.js` remains the presentation adapter:

- `startBattle()` becomes a thin setup call that constructs the quest session and initializes visual state.
- `spawnZombie()` asks `quest.next()` for the next encounter instead of calling `pickWord()` directly.
- `answer()` keeps grading, mastery, score, audio, feedback, and DOM locking, then sends the final outcome to `quest.resolve()`.
- `bite(true)` sends `{ correct:false, timedOut:true }` instead of subtracting a life.
- `loop()` ends finite play when `quest.view().complete` is true; it never checks `B.lives`.
- `updateHud()` reads only `quest.view()` for progress and Review Pouch counts.
- Canvas drawing reads display facts such as local step and milestone; it never reads retry-queue internals.

Keep `#s-battle`, `B`, `startBattle`, and storage keys during the migration to reduce risk. Rename internal battle identifiers only in a later cleanup after behavior and visual tests pass.

### 5.4 Mastery, scoring, and rewards

Preserve:

- `recordAnswer()` on every attempt;
- mastery-based question formats;
- existing correct-answer score and XP;
- Lucky Flow multiplier behavior, renamed from Combo in visible text;
- `questEvent("correct")` on every correct attempt;
- Review Challenge bonus and sticker fact;
- wallet persistence and results count-up.

Change:

- remove life loss and life-based termination;
- do not award score/XP/progress on a wrong attempt (already the behavior — score only fires on the correct branch);
- award **no coin score** on a pouch retry-correct (`origin:"review"`): grant mastery, `learned` progress, XP, and quest credit only (Decision 1). First-try `origin:"fresh"` correct is the only coin-earning path;
- call daily activity for learned completions, preferably immediately after each success so quitting cannot lose progress;
- define accuracy as `correctAttempts / attempts`;
- define Perfect as a completed finite quest with zero wrong or timed-out attempts;
- rename the result miss list to “Needed extra practice,” because every listed word will eventually have been learned.

### 5.5 Review Challenge migration

Keep the current two-stage boss logic for the first implementation, but change the visible framing:

- Trigger on every 10th planned finite slot and every 10 learned steps in Endless.
- Stage 1: meaning recognition.
- Stage 2: reverse Hanzi recall.
- Failure schedules the whole challenge word in the Review Pouch.
- Success counts as one learned slot, retains the current bonus, and fires the existing boss quest event under a later internal rename.
- Use the large raccoon sprite, gold orb, lantern burst, and `raccoon-happy` ending rather than HP depletion and defeat.

## 6. Migration Sequence

Each phase should be independently releasable or revertible. Build `dist/app.js` after every source phase, but bump `sw.js` only at the release cut.

### Phase 0 — Characterization gates

Files:

- Add `test/quest-current-behavior.test.js` or focused tests beside current pure modules.
- Extend `scripts/responsive-sweep.mjs` with named Lantern Trail gates later in the phase.

Work:

- Record current session-length normalization, custom-deck behavior, mastery calls, scoring, pause deadlines, question formats, and results calculations.
- Add a deterministic test fixture deck with at least eight words and known mastery values.
- Record baseline screenshots at 360×640, 390×844, 412×915, and landscape.

Exit: tests protect everything that must remain unchanged.

### Phase 1 — Quest session module

Files:

- Add `src/quest-session.js`.
- Add `test/quest-session.test.js`.

Required tests:

- 20 correct answers complete a 20-word quest.
- A wrong answer does not increment learned progress.
- A missed word returns after two intervening encounters.
- Repeated misses do not duplicate the queue.
- A retry returns immediately when no two other encounters remain.
- Custom exhaustive decks require every word once.
- Endless never becomes complete.
- A timeout follows the same retry rule as a wrong tap.
- Milestones occur at 5/10/15/20 learned.
- Chapter changes occur every 20 learned.
- Review Challenge failure requeues the complete challenge.
- Seeded selection preserves weighting and recent-word avoidance.

Exit: all scheduling/completion behavior is proven without DOM or canvas.

### Phase 2 — Integrate rules behind the current battle UI

Files:

- Modify `src/main.js`.
- Modify `src/hud.js` and `test/hud.test.js`.
- Modify focused tests for daily/results calculations.

Work:

- Construct the quest module in `startBattle()`.
- Route spawn, answer, timeout, and completion through its interface.
- Remove `B.lives` as a termination condition.
- Keep the existing battle visuals temporarily.
- Change results/daily counting to learned completions.

Exit: the old-looking screen now obeys the new continuous learning rules. This isolates game-system risk from layout risk.

### Phase 3 — Page layout and semantic UI

Files:

- Modify `index.html` battle markup and CSS.
- Modify `src/i18n.js` and localization completeness tests.
- Modify `src/main.js` HUD and prompt rendering.

Work:

- Replace hearts/round/score HUD with Review Pouch, route name, learned progress, and pause.
- Add overall progress and prompt/feedback rail.
- Rename visible Battle → Word Quest, Combo → Lucky Flow, Boss → Review Challenge, Missed → Needed extra practice.
- Keep raw score/coins for Results.
- Preserve all existing answer-format markup.

Exit: the page has the approved hierarchy in English and Thai before canvas art changes.

### Phase 4 — Reuse assets for Lantern Trail rendering

Files:

- Modify `src/main.js` canvas drawing.
- Modify `src/layout.js` and `test/layout.test.js`.
- Modify `src/fx.js`, `src/juice.js`, and their tests only where semantic helpers belong.

Work:

- Draw three local trail nodes and nearby lanterns from quest view facts.
- Move the cat according to local step.
- Reframe raccoon animation as guide arrival/happy departure.
- Replace HP/projectile/defeat visuals with lucky charm, lantern glow, and guide celebration.
- Rotate existing backdrops at 20-word chapters.
- Remove screen shake/red wash from normal wrong answers.

Exit: the experience matches the approved demo using existing assets only.

### Phase 5 — Review Challenge and results

Files:

- Modify `src/boss.js` or add semantic wrappers with tests.
- Modify Results rendering in `src/main.js` and relevant i18n.
- Modify journey/sticker integration only where current hooks are insufficient.

Work:

- Convert visible boss language and HP presentation to Review Challenge.
- Ensure failed challenges requeue correctly.
- Results show learned target, attempts, accuracy, extra-practice words, lanterns, route chapter, score, and next review.
- Preserve Smart Review, first-boss sticker fact, daily quests, and reward policy.

Exit: a full quest has a coherent start, middle, challenge, finish, and tomorrow hook.

Checkpoint (2026-07-13): complete in PR #93 (`3d3f821`). The merged gate is 62 test files / 1,827 tests, a clean production build, and 95 validated manifest assets. A six-word first-run browser playthrough with misses reached the results postcard with no console errors; the retry path granted learning progress without coin-score or Lucky Flow inflation.

### Phase 6 — Verification and release

Run:

- full unit suite;
- production build;
- asset validation;
- responsive sweep twice;
- manual Android playthrough on a mid-range device.

Manual matrix:

- 20, 40, 100, custom minimum 5, custom maximum 500, and Endless;
- first-run six-word quest;
- Practice Missed, weak words, and Smart Review;
- meaning, listening, reverse, tone, cloze, and typed pinyin;
- English, Thai, and bilingual answer layouts;
- correct, wrong, repeated wrong, timeout, pause during feedback, background/resume, and quit;
- reduced motion, sound off, auto-speak off, and pinyin off;
- default cat and every owned skin;
- portrait and landscape at all permanent sweep sizes.

Release:

- update screenshots and how-to text;
- bump the PWA shell cache;
- sync Capacitor and build the Android release candidate;
- compare completion, wrong-answer recovery, delayed recall, and D1/D7 return after release.

Release-candidate checkpoint (2026-07-13): automated work is merged to `development` through PR #95 (`a6164a9`). The final bundle passes 62 files / 1,827 tests and 95 asset checks. Two consecutive permanent sweeps pass all 10 base viewports, both listening probes, and real five-word Results postcards (with an intentional miss) at 360×640, 390×844, and 640×360. EN/TH how-to text and the final PWA cache are updated to SHELL v69. Capacitor sync and the signed APK build succeed; `apksigner` verifies the existing NorthBear certificate. The APK SHA-256 is `A81970806068EDF0FD436A9B000CF228844081CFDB0EDB264BE3A6CB1526488F`.

Remaining release gate: no Android device was connected, so the manual mid-range-phone matrix above is not yet complete. Keep Phase 6 and the migration open, and do not merge to `main`, until the owner confirms that playthrough.

## 7. Acceptance Criteria

### Layout

- At 360×640, 390×844, and 412×915, the task, plaque, characters, four choices, and pause control are visible without encounter-time scrolling.
- Hanzi remains visually dominant and never overlaps cat, guide, or local lanterns.
- All interactive targets remain at least 44×44 CSS px.
- Long English and Thai labels remain identifiable and do not crop from both ends.
- The learner can identify the task, total progress, Review Pouch count, and last outcome within five seconds.

### Game system

- Finite target counts learned words, not attempts.
- No wrong answer or timeout advances the route.
- Every missed word returns until correct.
- Review scheduling never duplicates a word or deadlocks near the end.
- Endless never auto-completes.
- Custom review decks complete only after every supplied word is correct.
- Mastery records every attempt; score, XP, and correct-answer quests fire only on success.
- Pause/background behavior remains safe and deterministic.

### Product quality

- No hearts, cat damage, enemy defeat, guilt copy, paid continuation, or forced ad appears during the Word Quest.
- Existing backgrounds, character sheets, plaques, stamps, orbs, icons, and audio carry the first release.
- A new art commission is optional polish, not a migration blocker.
- Smooth input and animation are maintained on a mid-range Android device.

## 8. Deliberately Deferred

- Renaming every internal `battle`, `boss`, or `zombie` identifier.
- Replacing the canvas renderer with DOM, WebGL, or a framework.
- New narrative dialogue or a full story campaign.
- A city-builder or Street restoration economy.
- New monetization placement.
- Cloud persistence changes.

These are separate product decisions. The migration should first prove the continuous Lantern Trail loop with the assets and systems already owned.
