# User Journey and Shop Coherence Implementation Plan

**Date:** 2026-07-30  
**Target:** Lucky Cat HSK after release v133  
**Scope:** Default Cat Journey product, with Street retained as a data-safe rollback surface

## Outcome

Make the path from learning rewards to customization understandable and
completable:

```text
Learn → earn coins/stickers → see a relevant reward prompt
      → customize Word Quest or open the Sticker Album
      → complete an honest, achievable collection
      → finish the daily goal → explore with the Cat → collect a memory
```

## Product decisions

1. Cat Journey remains the default companion/retention experience.
2. Street remains available only through the existing rollback flag; its saves,
   ownership, projects, and tests are not deleted.
3. Shop skins, backdrops, effects, and sounds are explicitly described as
   **Word Quest customization**. They will not replace Cat Journey's authored
   thinking/ready/return/rest illustrations.
4. Unowned Street decorations do not count toward default-mode collection
   completion. A decoration already owned by a returning player remains counted
   so progress is never erased.
5. Today's Picks in Cat Journey mode shows up to three currently obtainable,
   unowned, non-Street cosmetics. The selection is deterministic by local date
   and favors three different cosmetic categories.

## Work

### 1. Repair Today's Stock

- Add a pure `catJourneyStock(date, shop)` selector in `src/shop.js`.
- Eligible items:
  - non-decoration;
  - non-consumable;
  - currently purchasable under permanent/daily/season rules;
  - not already owned.
- Walk deterministic per-category rotations until three eligible items are
  found, then backfill from the remaining eligible catalog if a category is
  already exhausted.
- Keep the existing six-item `dailyStock()` behavior unchanged for Street
  rollback compatibility.
- Route default Cat Journey Shop rendering through the new selector.
- Add tests for:
  - three visible choices on dates previously producing an empty shelf;
  - no decorations;
  - no unavailable seasonal/daily items;
  - owned-item backfill;
  - all-owned empty state.

### 2. Make Collection completion honest

- Extend `profileStats()` with an optional set of hidden catalog types.
- Hide unowned decorations from both numerator and denominator in Cat Journey
  mode.
- Continue including any decoration already owned by the player.
- Pass `["deco"]` only when Cat Journey is enabled.
- Add tests for fresh and returning-player totals.

### 3. Clarify customization

- Rename the Shop section labels to “Word Quest cats” and “Word Quest
  backdrops” in English and Thai.
- Add short notes explaining where cats, backdrops, effects, and sounds appear.
- Update Profile equipped-summary labels to use the same Word Quest language.
- Add a “Customize Word Quest” shortcut to Cat Journey's secondary actions.
- Keep Cat Journey's own earned Background selector clearly separate.

### 4. Improve contextual discovery

- Turn the new-sticker Results plaque into a button that opens the Sticker
  Album.
- Preserve the existing one-sticker-per-results behavior and queue semantics.
- Ensure the button remains at least 44 px and keyboard accessible.

### 5. Release hygiene and verification

- Add/adjust focused tests before implementation where practical.
- Run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run assets:validate`
  - English responsive QA
  - Thai responsive QA
- Bump the service-worker shell/runtime version because the shipped UI and
  bundled JavaScript change.
- Verify no unrelated working-tree files are modified.

## Non-goals

- Deleting Street or migrating away its saved data.
- Reusing Word Quest sprite sheets as Cat Journey story illustrations; their
  poses, framing, and aspect ratios do not match the authored Journey scenes.
- Enabling billing, ads, or analytics.
- Changing shop prices or granting/removing ownership.
- Reworking the Cat Journey timing, bond formula, or memory content.

## Acceptance criteria

1. A fresh Cat Journey player sees three Today's Stock items on 2026-07-30,
   and none is a Street decoration.
2. Buying/owning a daily pick backfills the shelf when another eligible item
   exists.
3. A fresh Cat Journey collection target is 20 obtainable cosmetics, not 35.
4. A returning player with legacy decorations keeps those items represented in
   collection progress.
5. Shop/Profile copy states that purchased cosmetics customize Word Quest.
6. Cat Journey contains a working shortcut to Shop.
7. A newly earned sticker plaque opens the Sticker Album.
8. All automated and EN/TH browser gates pass.

## Implementation outcome

**Completed:** 2026-07-30

- Added and tested deterministic, category-diverse Cat Journey daily picks.
- Changed fresh default collection completion from 35 to 20 obtainable
  cosmetics; Streak Freeze remains the separate 21st active shop item and
  legacy ownership remains represented.
- Clarified Word Quest cats, backdrops, effects, and sounds in English and Thai.
- Added Cat Journey → Customize Word Quest navigation.
- Made new-sticker Results feedback open the Sticker Album.
- Raised Cat Journey secondary controls to a 45 px CSS minimum after the Thai
  320 px gate exposed fractional rounding below the 44 px accessibility floor.
- Advanced the service-worker shell/runtime cache from v133 to v134.

Final verification:

- `npm test`: 113 files, 9,825 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run assets:validate`: 134 assets passed.
- English responsive QA: 10/10 viewports plus all focused probes passed.
- Thai responsive QA: 10/10 viewports plus all focused probes passed.
- Cat Journey focused QA: 3/3 EN and 3/3 TH viewports passed.
