# Thai Humanization — Design Spec (2026-07-24)

**Problem.** The game's Thai reads machine-made ("unhuman" — Jordan). Three surfaces:
word glosses (21,869 catalog rows, mostly AI-drafted, never native-reviewed — sample
found flat errors like 餐具 "tableware" → เครื่องเรือน *furniture*), UI copy (539 TH
strings in `src/i18n.js`, grammatical but stiff), and example sentences (923 HSK3
machine drafts staged in `data/examples-thai-review.csv`, not live; HSK4–6 examples
have no Thai at all).

**Decisions (grilling interview, Jordan 2026-07-24):**

1. **Scope:** all three surfaces — glosses, UI copy, examples.
2. **Source of truth:** the **English gloss** (EN→TH as Jordan specified). English has
   been audited (#140) and stays authoritative; Thai must express the English sense
   naturally, hanzi/pinyin visible to workers only as context.
3. **Register:** *friendly casual.* UI + examples use warm spoken Thai (natural
   particles, กิน not รับประทาน — the lucky-cat's voice). Glosses stay plain-neutral
   but use the word a Thai actually says, register-matched to the source word.
4. **Gloss shape:** *lead sense + at most one more*, second sense only when the English
   genuinely carries two distinct senses (花 = ดอกไม้; ใช้(เงิน)). No comma-list
   mirrors of the English.
5. **Gloss coverage:** *real words only* — catalog ∩ official HSK 3.0 list
   (`docs/planning/hsk3.0-audit/hsk3-mapping.json`, 6,347 headwords). The non-3.0
   extraction tail keeps its current Thai.
6. **Validation:** *pilot-first.* Top ~200 glosses + main-screen UI copy delivered to
   Jordan as a review artifact; his native-speaker corrections become the calibrated
   style guide (`docs/superpowers/specs/thai-style-guide.md`) for the full run. Full
   run ships with adversarial AI verification + Jordan random-sample spot-check per
   batch. **The pilot gate blocks all full-run phases.**
7. **Examples:** produce Thai for **all 7,120** rows (rewrite 923 HSK3 drafts +
   translate ~6,195 HSK4–6) and **promote to live** via the documented flow
   (`docs/i18n/thai-examples-review-queue.md` → `th` column in `data/examples.csv` →
   `build_examples_data.py` emits it).
8. **Rollout:** slices, each behind Jordan's normal "ship" gate: (1) UI copy,
   (2) glosses in frequency batches (top-2,000 first, then remaining real words),
   (3) examples live last.
9. **Engineering rider:** `distractors.js` same-meaning exclusion is English-only
   (Thai is exact-string equality). Shorter natural glosses raise the odds of two
   TH-mode answers meaning the same thing → add a Thai-aware same-meaning check
   (pure module + tests) **before** the first gloss batch ships.

**Data flow reminders:** gloss source of truth = ROOT repo `product/by-level/*.csv` +
`product/thai-supplement.csv` (root repo commit), then `game/build_game_data.py`
rebuild (game repo commit). CSV edits must be quoted-field-safe (the Stage-2 树林
lesson). UI copy + examples live purely in the game repo.

**Execution model:** Fable leads; model-matched workers (strong tier for Thai nuance,
cheap tier for mechanical plumbing). Plan:
`docs/superpowers/plans/2026-07-24-thai-humanization.md`.
