# Word Quest Core Experience — Decision Map

**Goal:** Make the app's core learning screen feel distinctive, beautiful, and worth returning to every day without relying on combat anxiety or dark-pattern retention.

**Recommendation:** Keep the existing learning logic and timing engine, but replace the visible battle fantasy with **Lantern Trail**, a Word Quest made of playful vocabulary encounters. Lucky Cat advances through an illustrated route, correct recalls light lanterns, missed words enter a review pouch, and occasional Review Challenges become the spectacular set pieces.

The current 390×844 screen is responsive and functional. Its problem is not basic fit: the illustrated canvas, oversized word plaque, tiny characters, fragmented HUD, and four equally heavy answer cards do not tell one coherent story. This plan therefore focuses on hierarchy, meaning, feedback, and return motivation rather than another generic polish pass.

## #1: What should replace the battle framing?

Blocked by: None
Type: Research

### Question

Should the core remain a battle, become a Word Quest, or use a different game metaphor?

### Answer

Use **Word Quest encounters** as the core and **Lantern Trail** as their visual form. Keep “battle” only as a temporary internal code name while the presentation migrates.

Alternatives considered:

| Direction | Strength | Cost / risk | Decision |
|---|---|---|---|
| Lucky Cat Arcade Duel | Immediate tension; smallest code change | Generic; combat and lost hearts conflict with the cozy learning promise | Reject as the product identity |
| Word Quest: Lantern Trail | Preserves timing, questions, characters, backdrops, bosses, and effects while creating an ownable friendly fantasy | Requires coordinated copy, composition, feedback, and semantic changes | **Choose** |
| Festival Restoration | Strong long-term purpose and seasonal variety | Too large for the moment-to-moment core; can feel like a quiz with a builder wrapper | Use later as the Street meta-layer |

Core semantic changes:

| Current | Product language |
|---|---|
| Battle | Word Quest |
| Round | Journey Step |
| Enemy | Guide / Encounter character |
| Boss | Review Challenge |
| Lives / hearts | Review Pouch; mistakes return until learned |
| Combo | Lucky Flow |
| HP bar | Lantern / route progress |
| Attack / coin projectile | Lucky charm |
| Defeat | Character celebrates, bows, leaves a gift, and moves on |

## #2: What should the north-star mobile screen look like?

Blocked by: #1
Type: Prototype

### Question

Which composition makes the learning prompt, the characters, and route progress feel like one experience at 360×640 through 412×915, in both English and Thai?

### Answer

Build one throwaway, phone-first prototype of the following composition before changing production logic:

1. **Purpose bar — 48–52 px.** Left: Review Pouch count. Center: route name, learned/target count, and a thin overall progress bar. Right: pause. Hide coins and raw score while the learner is deciding.
2. **Illustrated encounter stage — 34–40% of height.** Enlarge Lucky Cat and the guide to roughly 72–96 px. Show only the three nearest route nodes; these recycle along a continuous trail and never represent the total session length. Keep the word plaque at 60–72% of stage width and out of the characters' silhouettes.
3. **Prompt rail — compact.** State the task plainly: “Choose the meaning,” “Listen and choose,” or “Type the pinyin.” Keep audio replay here and show Lucky Flow only when it is earned.
4. **Answer zone — 38–44% of height.** Retain a thumb-friendly 2×2 grid. Cap the primary label at two lines. Make the secondary language quieter or reveal it after the choice. Strengthen pressed/selected states and reduce the four-card wall of identical tan.
5. **Feedback layer — 600–900 ms.** Correct: paw stamp, lantern glow, cat step, restrained haptic, then audio/meaning confirmation. Incorrect: soft coral selection, correct option in jade, a short contrast explanation, and “Added to review.” Never damage the cat or use a red screen wash for an ordinary learning error.

Prototype variants to compare:

- **A — Lantern Trail:** guide on the right, three lantern nodes in the scene, cat advances after each recall. Recommended baseline.
- **B — Delivery Route:** each correct word stamps a parcel/passport and moves the cat toward a village resident. Stronger story, slightly more art and copy.
- **C — Festival Restoration:** each recall lights or restores part of the backdrop. Strongest spectacle, but risks obscuring immediate progress.

Prototype gate: five users should be able to answer, within five seconds and without explanation, “What am I learning?”, “What should I tap?”, and “What changed because I got that right?”

## #3: How should a complete Word Quest feel?

Blocked by: #2
Type: Prototype

### Question

What sequence produces a satisfying three-to-seven-minute learning unit rather than an endless quiz?

### Answer

Target flow:

1. **Briefing, 5–10 seconds:** Show the selected 20 / 40 / 100 / custom / Endless length and a learning-purpose summary such as “Strengthen due words and discover new ones.” Preserve the existing session picker rather than introducing a second length system.
2. **Encounters:** rotate the existing mastery ladder—meaning, listening, reverse recall, tone, typed pinyin, and cloze—while keeping one obvious task at a time.
3. **Micro-payoff every 3–5 encounters:** light a lantern, open a signpost, change weather, or reveal a small scene detail.
4. **Review Challenge every 5–8 encounters:** a tiny dialogue, tone contrast, delivery choice, or contextual cloze using recent words. Reserve the largest effects and rare character poses for these checkpoints.
5. **Recovery loop:** retry missed words after two or three other encounters. Explain the difference rather than merely marking the choice wrong.
6. **Decisive finish:** “6 memories strengthened · 2 words discovered · next review tomorrow,” one route postcard or Street contribution, then two choices only: Done or Keep Exploring.

Do not stack currency, sticker, quest, streak, and ad modals after the result. The finished learning unit is the reward; meta rewards should support it.

## #4: What makes the learner want to return tomorrow?

Blocked by: #3
Type: Research

### Question

Which daily-return mechanics strengthen learning without coercion?

### Answer

Use predictable learning purpose plus small cosmetic surprise:

- Tomorrow's route previews the due-memory goal and next landmark: “Tomorrow: open the Night Market gate.”
- Rotate existing backdrops, weather, guide characters, and route postcards while keeping the interaction model stable.
- Let daily completion restore one visible Street/festival detail; do not make the player grind currency to prove they learned.
- Keep the kind rest-day system. Never use guilt copy, paid streak repair, stamina loss, forced ads, or a mandatory leaderboard.
- Surface competence evidence such as “You recalled 饭 after 3 days,” not only points.
- Treat completion rate, due-review completion, delayed recall, and wrong-answer recovery as primary signals. Treat time-in-app and raw taps as secondary guardrails.

Research informing this direction:

- Gamification effects depend heavily on whether the mechanics support autonomy, relatedness, and competence: [Educational Technology Research and Development](https://link.springer.com/article/10.1007/s11423-023-10337-7).
- Frequency and curriculum progress are more useful targets than maximizing session duration: [Journal for the Psychology of Language Learning](https://www.benjamins.com/catalog/jsls.00021.plo).
- Corrective feedback improves second-language learning, supporting immediate explanation and scheduled retry: [Language Learning](https://onlinelibrary.wiley.com/doi/10.1111/j.1467-9922.2010.00561.x).
- Gamification can help engagement, but outcomes are design-dependent and the game elements must serve learning: [Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1030790/full).

## #5: In what order should this ship?

Blocked by: #2, #3, #4
Type: Prototype

### Question

What sequence gives an early visible win without forcing a risky rewrite?

### Answer

### Phase 0 — North-star prototype and choice (1–2 days)

- Create static or isolated interactive variants A/B/C at 390×844.
- Test long English, long Thai, listening, typed-pinyin, and wrong-answer states.
- Select one composition before production work.

Exit: approved screen structure, motion beat, terminology, and exact content hierarchy.

### Phase 1 — Semantic and hierarchy pass (2–3 days)

- Change visible language from Battle to Word Quest, remove Lives in favor of the Review Pouch, rename Combo to Lucky Flow, and rename Boss to Review Challenge.
- Remove raw score/coins from the decision HUD; keep rewards for results.
- Add the question-type prompt rail.
- Remove the dashed empty translation placeholder.
- Tighten answer labels, translation hierarchy, line clamping, and selected states.

Likely files: `index.html`, `src/i18n.js`, `src/main.js`.

Exit: the current game reads as a learning quest even before new route animation exists.

### Phase 2 — Lantern encounter stage (4–6 days)

- Enlarge and restage cat/guide without covering the word plaque.
- Replace enemy HP and coin projectile with lantern nodes and a lucky-charm effect.
- Correct answer: light node, step forward, celebrate, confirm meaning/audio.
- Wrong answer: pause, coach, add to review pouch; remove damage framing.
- Preserve reduced-motion and existing input timing.

Likely files: `src/main.js`, `src/layout.js`, `src/fx.js`, `src/cat.js`, `src/raccoon.js`.

Exit: every answer visibly changes the route and the next action is always clear.

### Phase 3 — Complete-session journey (4–6 days)

- Connect route steps to the existing Journey, stickers, daily goal, and results systems.
- Add the Review Challenge set piece and missed-word recovery loop.
- End with strengthened/new counts, route advancement, next review, and one meta reward.

Exit: the Word Quest has a clear beginning, escalating middle, decisive end, and tomorrow hook.

### Phase 4 — Signature polish and content rotation (about 1 week)

- Add only the art that proved necessary: lantern on/off, one guide pose, three environment overlays, route postcard frame, and one Review Challenge celebration.
- Add a coherent sound/haptic signature for choice, correction, lantern, checkpoint, and completion.
- Rotate existing backdrops as route chapters before commissioning more scenes.

Exit: the core feels authored and recognizable, not like a themed multiple-choice template.

## #6: How will we know it is better?

Blocked by: #5
Type: Research

### Question

What acceptance gates prevent “stunning” from becoming subjective decoration?

### Answer

Before/after usability and quality gates:

- Screen checks at 360×640, 390×844, and 412×915; portrait and supported landscape.
- English and Thai long-copy cases; all question formats; first-run and returning-player flows.
- Reduced-motion, audio-off, and no-haptics paths.
- Hanzi remains the dominant content; all controls remain at least 44×44 CSS px; no character, plaque, or answer overlap.
- A learner identifies the task, progress, and last outcome in under five seconds.
- Ordinary mistakes never remove currency, threaten the streak, harm the cat, or block continuation.
- Performance remains smooth on a mid-range Android device.

Measure for two weeks after release:

- Word Quest start-to-finish rate.
- D1 and D7 return after a completed quest.
- Due-review completion and delayed recall accuracy.
- Wrong-answer recovery rate.
- Audio replay and hint use.
- Voluntary second-quest starts, with session length watched as a guardrail rather than the goal.

## Frontier

The Lantern Trail direction and continuous-review behavior are approved. Implementation is specified in [2026-07-13-lantern-trail-migration-plan.md](../../planning/2026-07-13-lantern-trail-migration-plan.md). The core module and current-shell integration merged on 2026-07-13; the live plan tracks the remaining visual and release phases.
