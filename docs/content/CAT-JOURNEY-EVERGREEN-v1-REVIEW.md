# Cat Journey evergreen-v1 content review

**Date:** 2026-07-27
**Runtime source:** `src/cat-memories.js` and `src/i18n.js`
**Pack status:** Structurally complete; English authored; Thai draft present;
native Thai sign-off pending

## Inventory

| Destination | Minimum tier | Story IDs | Count |
|---|---:|---|---:|
| Study Room | 0 | `garden-leaf`, `tea-steam`, `book-ribbon`, `sunny-window`, `page-corner`, `pencil-curl`, `little-bell-note` | 7 |
| Vocabulary Garden | 1 | `plum-petal`, `bamboo-shadow`, `koi-ripple`, `garden-kite`, `morning-dew`, `quiet-stone-path` | 6 |
| Morning Market | 2 | `market-orange`, `blank-market-tag`, `basket-ribbon`, `sesame-bun`, `market-bell`, `umbrella-colors` | 6 |
| Lantern Riverside | 3 | `lantern-glow`, `bridge-light`, `river-pebble`, `moon-reflection`, `firefly-path`, `riverside-charm` | 6 |
| Scholar Gate | 4 | `scholar-brush`, `inkstone-light`, `mountain-cloud`, `scholar-bookmark`, `quiet-scholar-desk` | 5 |
| **Total** |  |  | **30** |

Keepsake IDs:

`heart-leaf`, `tea-cup`, `paper-lantern`, `bridge-charm`, `plum-petal`,
`scholar-brush`, `book-ribbon`, `market-orange`, `paper-kite`,
`bamboo-sprig`, `river-pebble`, `wooden-bell`.

Art status:

- `heart-leaf` has a production 256×256 transparent bitmap.
- The other 11 keepsakes have code-native icon fallbacks and still need their
  optional production bitmap pass.
- The ready, returned, and resting Journey poses are integrated and optimized
  to 512×512; each is below the 500 KB character budget.

## Automated checks

- [x] 30 unique stable story IDs.
- [x] 12 unique stable keepsake IDs.
- [x] Every story references a known destination and keepsake.
- [x] Every title/story key exists in EN and TH.
- [x] At least seven stories are eligible at Study Buddy.
- [x] Unseen-first selection prevents a repeat across the first seven claims.
- [x] Disabled/unknown earned content has an archived-card fallback.
- [x] All currently integrated Journey art passes manifest dimensions and size
      budgets.

## Editorial review

- [x] English title and story authored.
- [x] English tone/safety pass: positive, calm, no guilt, danger, scarcity,
      currency, or pseudo-Chinese.
- [x] Thai draft added with matching meaning and tone.
- [x] Strings are in the review queue — 174 keys tagged `// TH-REVIEW` and
      present in `docs/i18n/thai-review-sheet.csv` (engineering, 2026-07-27).
      This was the blocker: the original cut used a prose comment instead of the
      machine-readable marker, so nothing entered the queue.
- [ ] Native Thai reviewer has checked every new title/story.
- [ ] Native Thai corrections, if any, are applied to `src/i18n.js`.
- [ ] Reviewer name, date, and reviewed commit are recorded below.

## Native Thai sign-off

- Reviewer:
- Review date:
- Reviewed commit (the `src/i18n.js` commit reviewed against):
- Notes/corrections:

**Scope of this sign-off:** the 108 `cat.*` rows and 9 `journey.*` rows in the
P2 block of [`docs/i18n/thai-review-sheet.csv`](../i18n/thai-review-sheet.csv),
plus every `// TH-REVIEW` line in `src/i18n.js`. The two `notify.cat.*` push
strings are in the **P0** block of the same sheet — review those with the rest
of the P0 notification copy, not here.

**How to return it.** Fill `corrected_thai` and `notes` in the CSV; engineering
applies them with `node docs/i18n/scripts/apply-thai-review-sheet.mjs` and drops
each applied line's `// TH-REVIEW` marker in the same commit. Do not remove the
markers by hand. Editing `src/i18n.js` directly also works — keep every
`{placeholder}` and `<b>` tag exactly as in English, or the sheet's parity guard
will fail the build.

**Worth a close look:** `account.connect`, `learn.stillLearning`, and
`learn.knowIt` were *replaced* by this arc, and the Thai they replaced had
already passed the v112–v116 humanization arc. Check whether the new drafts
regressed previously signed-off copy.

This sign-off is a production release gate. Structural tests passing does not
replace native-language review. **Only the native reviewer (or Jordan) may check
the boxes above** — the copy is already live to Thai users with no English
fallback, so this is a correction of shipped text, not pre-release review.
