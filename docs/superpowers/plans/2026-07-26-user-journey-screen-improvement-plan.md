# Lucky Cat HSK User-Journey Screen Improvement Plan

**Date:** 2026-07-26  
**Status:** Implemented in the 2026-07-26 UX improvement pass  
**Source:** Review of the 28 production states captured in the FigJam user-journey board  
**Goal:** Make every screen easier to understand and act on, with particular attention to long pages, obscured content, repeated choices, and weak first-use states.

## Implementation Result

The shipped pass applies the shared navigation clearance, restructures Journey,
Profile, Album, Shop, Scope, More, Account, How-to, Pause, Results, and Cat
Journey, adds stronger welcome/home/empty-state guidance, and supplies every new
label in English and Thai. Focused browser measurement reduced the phone
versions of Album to about 717 px, Shop categories to 792–864 px, and Profile
panes to 659–894 px; the 20-row Journey is now a recommendation plus one
expanded level.

The 10-viewport English and Thai sweeps report no new overflow, tap-target,
navigation, or JavaScript failures on the changed journeys. Their only remaining
failures are existing Street rollback-surface assertions (painted canvas asset
instrumentation and a Street Project wallet expectation), which are outside
this user-journey pass.

## Product Direction

The visual identity is distinctive and cohesive. The next improvement round should preserve the warm illustrated world while reducing the amount of interface a player must parse at one time.

Use these rules across the whole app:

1. **One primary action per viewport.** A player should see the recommended next step without scrolling.
2. **Progressive disclosure.** Show the current/recommended content first; place exhaustive lists behind tabs, filters, drawers, or level accordions.
3. **No content beneath persistent navigation.** Sticky navigation may float visually, but controls and readable text must never sit behind it.
4. **State before inventory.** Lead with “what should I do next?” before showing everything the player owns or could unlock.
5. **Compact empty states.** Empty progress should encourage the next action rather than repeat rows of zeroes.
6. **Keep learning context visible.** Scope, session length, and current goal should remain understandable at the moment a player starts an activity.
7. **Preserve one-handed use.** Primary controls remain at least 44×44 px and stay reachable near the lower half of the screen.

## Priority Summary

### P0 — usability and obstruction

- Prevent the bottom navigation from covering Profile, Album, Shop, and How-to content.
- Keep primary actions visible above the fold on Home, Scope, Profile, and Results.
- Confirm every long screen has enough bottom safe-area padding after the final item.
- Do not allow scroll position from one screen to carry into another.

### P1 — restructure the longest screens

- Replace the 20-row Journey list with a recommended card plus HSK-level accordions.
- Split Profile into focused Overview, Progress, and Collection views.
- Add filters and progressive disclosure to the Sticker Album.
- Add category navigation and focused browsing to the Shop.
- Convert How-to from a text wall into a short visual tutorial with expandable advanced rules.

### P2 — polish individual states

- Strengthen first-use and empty states.
- Clarify battle feedback and results hierarchy.
- Reduce duplicated copy in dialogs and collection drawers.
- Improve labels so actions describe outcomes rather than generic verbs such as “Play.”

## Long-Screen Targets

| Screen | Captured height | Target behavior |
|---|---:|---|
| Scope — Journey | 1,697 px | Current recommendation fits in one viewport; no more than one expanded HSK group |
| Profile | 1,355 px | Overview fits close to one viewport; detailed progress moves to its own tab |
| Profile — edit | 1,409 px | Editing remains inline but does not push the rest of Profile down |
| Friend compare | 1,355 px | Dialog height is independent of the page behind it |
| Sticker Album | 2,203 px | Filtered view; one level or “earned/next” set shown at a time |
| Collection Shop | 2,072 px | Category chips and one category shown at a time |
| How to play | 1,050 px | Three-step tutorial fits near one viewport; advanced detail collapses |
| Cat backgrounds | 1,053 px | Horizontal preview rail or compact two-column picker |
| Cat memory earned | 920 px | Reward and next action remain above the navigation |
| Scope — Picker | 893 px | Main setup and start CTA fit within one viewport on 390×844 |

## Screen-by-Screen Plan

### 01 — Welcome and level choice

**Keep:** Friendly illustration, simple language choice, strong start CTA.

**Improve:**

- Make “Start at HSK1” the recommended default and visually label it “Recommended for new learners.”
- Move the language selection closer to the title because it changes all following content.
- Add a one-line promise under the CTA: session length and what happens next.
- Preserve the current single-viewport layout at 320×568 and landscape sizes.

**Acceptance:** A first-time player can choose a language, understand the recommended level, and start without scrolling.

### 02 — Home dashboard

**Keep:** Strong brand world, clear central Start button, compact status strip.

**Improve:**

- Turn the HSK scope chip into a clearer secondary control: “HSK1 · 20 words · Change.”
- Add a short dynamic line above Start, such as “Continue Lantern Trail” or “5 words due.”
- Show only one context-sensitive secondary recommendation below Start. Avoid three equally weighted actions.
- Distinguish Flashcards, Shop, and Tone Trainer by intent: Study, Rewards, and Listening.

**Acceptance:** Start is always the highest-contrast action; the player knows which words and session length will be used.

### 03 — Scope picker

**Keep:** Complete control over level, filters, language, and session length.

**Improve:**

- Group controls into three steps: Words, Meaning language, Session.
- Keep the live pool summary immediately above the primary CTA.
- Rename “Word Quest · 20” to “Start 20-word quest.”
- Make “Endless” and “Cards” secondary mode choices, not competing primary CTAs.
- Tighten vertical gaps so the complete setup fits on 390×844.

**Acceptance:** The summary and primary start CTA are visible without scrolling after any selection.

### 04 — Scope journey

**Problem:** Twenty similar cards create a 1,697 px list and make the recommended next journey difficult to find.

**Improve:**

- Add one prominent “Continue your journey” card at the top.
- Group remaining choices into collapsed HSK1–HSK6 accordions.
- Within an expanded level, show milestones as a compact horizontal or two-column sequence.
- Replace generic “Play” with state-aware labels: Start, Continue, Review, or Mastered.
- Keep progress percentage, stars, and the current marker, but remove repeated decoration from inactive rows.
- Remember the last expanded level.

**Acceptance:** On entry, the current journey and its CTA appear in the first viewport; only one level expands at a time.

### 05 — Flashcard recall

**Keep:** Distraction-free recall state and large Chinese word.

**Improve:**

- Make “Tap to flip” more visibly interactive without competing with the word.
- Explain the disabled response buttons on first use: “Flip before grading.”
- Keep progress and Exit visually secondary.
- Add a subtle swipe/tap affordance only if the gestures are actually supported.

**Acceptance:** New players understand why grading controls are disabled and how to reveal the answer.

### 06 — Flashcard answer

**Keep:** Strong hierarchy from hanzi to meaning and example sentence.

**Improve:**

- Rename grading actions to confidence language: “Again” and “Got it,” while retaining icons.
- Give the audio button an explicit accessible label and a small “Listen” caption.
- Make the information control more discoverable than the small top-right icon.
- Reduce repeated “tap to flip back” copy once the player has completed the tutorial.

**Acceptance:** The player can hear, inspect, and grade the word with no ambiguous control.

### 07 — Word detail

**Keep:** Focused modal, example sentence, level/frequency context.

**Improve:**

- Separate content into Meaning, Usage, and Learning status.
- Put pronunciation beside the hanzi/pinyin header.
- Collapse secondary metadata into a single line or expandable “Word facts.”
- Add a direct action matching the source context: “Back to cards” or “Practice this word.”

**Acceptance:** The primary meaning and example remain visible without scrolling; metadata does not dominate.

### 08 — Tone Trainer

**Keep:** Simple four-choice interaction and replay control.

**Improve:**

- Replace the large empty upper area with a compact illustrated listening prompt.
- Make replay a secondary circular control once audio has played automatically.
- Add a clear answer/feedback state with tone contour, correct label, and next action.
- Show session goal alongside “1/10,” not only the count.

**Acceptance:** The screen feels intentional before an answer and clearly teaches after an answer.

### 09 — Cat Journey ready

**Keep:** Strong companion art, emotional tone, single CTA.

**Improve:**

- Clarify the reward before departure: “Explore for 20 min · bring back 1 memory.”
- Make daily-goal eligibility a compact status chip rather than a competing progress line.
- Show the current bond benefit or next unlock in one concise line.

**Acceptance:** The player knows duration, requirement, and expected reward before tapping.

### 10 — Cat Journey exploring

**Keep:** Empty-room storytelling and clear away state.

**Improve:**

- Make the return time the largest informational element.
- Explain what the player can do while waiting: “Keep studying; your cat returns automatically.”
- Disable the main CTA visually rather than presenting it as a button-like status.
- Offer one useful action, such as “Study while waiting.”

**Acceptance:** Waiting feels purposeful, and the player is directed back into the learning loop.

### 11 — Cat Journey returned

**Keep:** High-emotion return illustration and “Welcome back” moment.

**Improve:**

- Preview the memory/reward silhouette before claim.
- Change the CTA to “Open memory” so the outcome is explicit.
- Keep secondary progress content below the claim moment.

**Acceptance:** The reward claim is the only primary action in the first viewport.

### 12 — Cat memory earned

**Keep:** Reward reveal, memory card, and bond progress.

**Improve:**

- Separate the celebration from ongoing controls. Show reward first, then a compact “What next?” row.
- Move Memories and Backgrounds below the reward card.
- Keep “Study a little more” above the sticky navigation.
- Avoid expanding the screen past one viewport for a single reward.

**Acceptance:** Reward, bond change, and next action are all visible without content hiding behind navigation.

### 13 — Cat memories

**Keep:** Collection concept and contextual drawer.

**Improve:**

- Add memory count and sort newest first.
- Use a compact two-column grid as the collection grows.
- Open a selected memory into a focused detail view rather than expanding every card.
- Include a useful empty state: how to earn the first memory.

**Acceptance:** The drawer remains usable with 20+ memories and does not become an unbounded vertical list.

### 14 — Cat backgrounds

**Problem:** The picker extends to 1,053 px and mixes preview, lock state, and selection.

**Improve:**

- Use a horizontal preview rail or two-column thumbnail grid.
- Keep the selected background preview fixed at the top.
- Separate unlocked from locked backgrounds.
- Put unlock requirements directly on locked thumbnails.
- Close the drawer after selection or show a clear Done action.

**Acceptance:** Selecting among all backgrounds requires no more than one short scroll.

### 15 — Profile

**Problem:** At 1,355 px, the screen combines identity, four stats, collection, actions, six level rows, Smart Review, and Needs Work. The sticky navigation obscures part of Learning Progress.

**Improve:**

- Introduce Overview, Progress, and Collection tabs.
- Overview: identity, level/XP, streak, coins, and one recommended action.
- Progress: Smart Review first, then level progress and Needs Work.
- Collection: cosmetics, stickers, album, and friend comparison.
- For a new player, replace the four-zero dashboard with a compact starter message and “Play first quest.”
- Keep Smart Review above the fold on the Progress tab.

**Acceptance:** Overview fits close to one viewport; no content or action sits under the navigation.

### 16 — Profile name edit

**Keep:** Inline editing context.

**Improve:**

- Use a compact modal or replace only the name row, not the height of the full hero.
- Keep Save primary and Cancel text-secondary.
- Validate length and whitespace inline.
- Preserve scroll position when editing and closing.

**Acceptance:** Opening edit does not shift the entire Profile page or hide unrelated content.

### 17 — Friend comparison

**Keep:** Local/shareable comparison without requiring accounts.

**Improve:**

- Make the dialog viewport-bound and independent from the tall Profile page behind it.
- Present two clear modes: Share my code and Compare a code.
- Add copy/share confirmation.
- Explain which stats are shared before generating a code.
- Show validation feedback beside the input.

**Acceptance:** The complete comparison workflow fits inside the modal with its own controlled scrolling if necessary.

### 18 — Sticker Album

**Problem:** The 2,203 px page shows every locked milestone across HSK1–6 and Events. Repetition outweighs motivation, and the navigation covers tiles.

**Improve:**

- Add filters: Earned, Next, HSK1–6, Events.
- Default to Earned + the next three reachable stickers.
- Collapse levels that are not currently selected.
- Replace repeated descriptions with concise milestone labels and a single level explanation.
- Add progress at the top: “0/44 earned” and “Next: HSK1 Top 100.”
- Make earned stickers visually rich; keep locked tiles quieter.

**Acceptance:** The default album view fits near one viewport and immediately communicates the next attainable reward.

### 19 — Collection Shop

**Problem:** The 2,072 px catalog exposes every category at once. The sticky navigation obscures products, affordability is communicated mainly by disabled buttons, and the wallet scrolls away.

**Improve:**

- Add sticky category chips: Featured, Cats, Backdrops, Effects, Sounds, Supplies.
- Show one category at a time; preserve the selected category.
- Keep wallet balance visible with the category bar.
- Open products into a focused preview sheet with Equip/Buy and unlock context.
- Label unaffordable products with “Need 3,000 more,” not only a disabled Buy button.
- Separate owned/equipped status from purchasing.
- Keep seasonal stock as a compact featured carousel rather than a full category stack.

**Acceptance:** A player can reach any product category in one tap, understand affordability, and never have a product row covered by navigation.

### 20 — More and settings

**Keep:** Short, readable menu and language controls.

**Improve:**

- Separate Settings from Help/Account using section labels.
- Turn Sound effects into a labeled toggle rather than a menu-like button.
- Add app version and privacy beneath Account in quiet metadata styling.
- Keep the mascot footer but reduce its visual weight relative to settings.

**Acceptance:** Toggle rows look like settings, navigation rows look like destinations, and the distinction is obvious.

### 21 — Best Sessions

**Keep:** Simple empty state.

**Improve:**

- Add a primary “Play a Word Quest” action to the empty state.
- Explain what qualifies as a best session.
- When populated, show the best score first and recent sessions separately.
- Use accuracy, words, and date consistently across rows.

**Acceptance:** Empty and populated states both lead naturally back to play.

### 22 — How to play

**Problem:** The 1,050 px screen is a text wall; navigation covers part of a paragraph.

**Improve:**

- Replace the opening copy with three illustrated steps: See/hear a word, choose meaning, learn from return.
- Add a small visual example of Lucky Flow and the Review Pouch.
- Move Review Challenge, timeout behavior, audio details, and attribution into expandable “Advanced rules” and “Credits.”
- End with “Try a 5-word practice quest.”
- Keep paragraphs short and scannable.

**Acceptance:** Core rules fit near one viewport; no paragraph is hidden behind navigation.

### 23 — Account overview

**Keep:** Clear benefits and reassurance that accounts are optional.

**Improve:**

- Rename Connect to “Back up my progress.”
- State exactly what syncs and that local play continues without an account.
- Show network/offline status before the player taps.
- Keep benefits concise and avoid repeating the same promise in the heading and bullets.

**Acceptance:** The player understands value, privacy expectation, and optionality before connecting.

### 24 — Account connection

**Improve:**

- Give guest creation, email entry, code verification, signed-in, offline, and failure states distinct headings.
- Show progress as “1 of 2: Email” and “2 of 2: Verification.”
- Keep entered email visible on the code screen with “Use a different email.”
- Explain resend timing and errors inline.
- Add a success state with last sync time and a clear Done action.

**Acceptance:** Every connection state can be identified from a screenshot without relying on transient toast messages.

### 25 — Word Quest active

**Keep:** Strong game art, focused options, clear pause control.

**Improve:**

- Increase contrast between the prompt plaque and background on bright scenes.
- Make the learning objective clearer: meaning, listening, tone, or reverse recall.
- Reduce HUD competition by prioritizing route progress over secondary counters.
- Keep option labels readable in English/Thai at the smallest supported viewport.

**Acceptance:** A player understands the question format within one second and all four options remain fully visible.

### 26 — Word Quest correction

**Keep:** Correct-answer reveal and Review Pouch messaging.

**Improve:**

- Make the correct choice unmistakable before showing explanatory copy.
- Use one concise reason: “Added to Review Pouch; it will return.”
- Keep the continue affordance explicit; do not rely only on tapping the canvas.
- Maintain enough display time for bilingual text without making the round feel stalled.

**Acceptance:** The player can identify the correct answer, consequence, and next action without guessing.

### 27 — Battle paused

**Keep:** Complete audio controls and clear Resume/Quit hierarchy.

**Improve:**

- Group toggles under Audio and Learning aids.
- Keep volume sliders visible only when their associated audio is enabled.
- Add a confirmation only for Quit, not Resume.
- Ensure the panel fits short landscape screens with controlled internal scrolling.

**Acceptance:** Resume is immediate; quitting cannot happen accidentally; controls remain reachable on all supported viewports.

### 28 — Quest results

**Keep:** Celebration, route postcard, rewards, missed-word recap, and next actions.

**Improve:**

- Lead with one summary sentence: “5/5 learned · 83% accuracy.”
- Prioritize the recommended next action based on outcome: Review Words after misses, Continue Journey after success.
- Reduce competing full-width CTAs to one primary and two compact secondary actions.
- Keep the missed-word card directly beside its review action.
- Show reward explanation more clearly than the raw total.

**Acceptance:** The player can understand performance and choose the recommended next step in the first viewport.

## Implementation Phases

### Phase 1 — navigation safety and shared long-page behavior

**Likely files:** `index.html`, `src/main.js`, `src/nav.js`, responsive tests.

- [ ] Define a shared bottom content inset using nav height plus `env(safe-area-inset-bottom)`.
- [ ] Apply it to every scrollable screen with persistent navigation.
- [ ] Add automated checks that visible text and controls do not intersect the navigation.
- [ ] Verify 320×568, 390×844, 412×915, 640×360, and Thai localization.

### Phase 2 — Scope Journey and Profile information architecture

**Likely files:** `index.html`, `src/main.js`, `src/journey.js`, `src/ui/cat-journey-screen.js`, focused pure helpers and tests.

- [ ] Build a pure journey-grouping view model: recommended item, level groups, expanded level.
- [ ] Replace the full Journey list with recommendation + accordions.
- [ ] Add Profile Overview, Progress, and Collection tabs.
- [ ] Move Smart Review to the top of Progress.
- [ ] Add compact new-player empty states.

### Phase 3 — Album and Shop discovery

**Likely files:** `index.html`, `src/main.js`, `src/shop.js`, `src/stickers.js`, focused view-model tests.

- [ ] Add album filter state and “next attainable” calculation.
- [ ] Render one album group at a time.
- [ ] Add shop category state and category chips.
- [ ] Render one product category at a time.
- [ ] Add affordability copy and a focused product preview sheet.

### Phase 4 — How-to and secondary-state polish

**Likely files:** `index.html`, `src/main.js`, `src/i18n.js`, relevant UI modules.

- [ ] Replace How-to paragraphs with three core visual steps.
- [ ] Add expandable advanced rules and credits.
- [ ] Refine account, friend comparison, tone feedback, and results states.
- [ ] Add English and Thai copy for every new label.

### Phase 5 — full journey regression

- [ ] Repeat the 28-state screenshot sweep.
- [ ] Compare scroll heights before and after.
- [ ] Confirm the first primary action is visible in each viewport.
- [ ] Confirm no persistent navigation overlaps text or controls.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run qa:responsive`.
- [ ] Bump the service-worker shell cache version when shipping.

## Success Metrics

- At least 24 of 28 reviewed states fit their primary task within one 390×844 viewport.
- Scope Journey default height is reduced by at least 45%.
- Profile Overview default height is reduced by at least 30%.
- Album and Shop default views are reduced by at least 50%.
- Zero controls or readable text intersect the bottom navigation across the responsive matrix.
- Primary-action taps from Home to quest start do not increase.
- More players reach a second quest, Smart Review, or Cat Journey action after Results.

## Recommended Delivery Order

1. Navigation overlap fix.
2. Scope Journey progressive disclosure.
3. Profile tabs and Smart Review priority.
4. Album filters.
5. Shop categories.
6. How-to visual rewrite.
7. Remaining screen polish and complete regression sweep.
