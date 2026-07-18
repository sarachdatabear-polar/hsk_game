# Example sentences — HSK5 frequency-capped round (2026-07-18)

Third example-sentence round, after HSK1–3 (#128, 917) and HSK4 (#129, 1,162). Extends the
flashcard "In a sentence" surface into **HSK5**, scoped by frequency. Analysis + build; ships
to `development`. **Stacks on the HSK4 branch (#129)** — merge #129 first.

## Scope decision — tighter cap than HSK4

HSK5 has **4,423 distinct words with no sentence**, and it is far more tail-heavy than HSK4:
**2,681 (61%) appear in exactly one mock exam (`f`=1)**, and the `f`=2 bucket is another 733.
Because HSK5 is a more advanced level most players reach later, and quality/segmentation noise
rises in the low-frequency tail, this round uses a **tighter cutoff than HSK4's `f`≥2**:

Cutoff: **`f` ≥ 3 → 1,009 words** — "every HSK5 word seen in ≥3 real mock exams." This keeps the
round proportionate to (slightly smaller than) HSK4's 1,209 and covers the genuinely-recurring
HSK5 vocabulary. The `f`=2 (733) and `f`=1 (2,681) tails are deferred to later rounds if warranted.

Distribution behind the cutoff: `f`≥20: 15 · 10–19: 88 · 5–9: 336 · 3–4: 570 · (dropped) `f`=2:
733 · `f`=1: 2,681.

## Method — unchanged from HSK3/HSK4

AI-generate offline + mechanical gate + LLM verify; deterministic AI-free build. **EN-only**
(Thai review-gated; `exampleFor` falls back to English). 11 Sonnet generation batches of ~92;
verify reviewers judge naturalness / grammar / **sense-match to the catalog gloss** and flag
fragments/bound-morphemes. Generation prompt lets a worker **flag rather than cheat** when a word
only fits inside a larger compound. Mechanical gate is `build_examples_data.py`'s baked-in
`row_errors`. Fail-verify → deferred and reported, never shipped marginal. Pilot one batch and read
it in full before fan-out.

## Architecture — additive, no new files

Appends rows to `data/examples.csv` and rebuilds `data/examples.{js,json}`. No new `<script>`, no
`sw.js` change (`data/examples.js` already precached), no `src/` change (`main.js` already merges
`window.HSK_EXAMPLES`). `build_examples_data.py` is level-agnostic.

**Test update:** `test/examples-data.test.js` currently asserts every key is HSK3/HSK4
(`[3,4].includes(levelOf[h])`) — relax to `[3,4,5]` and bump the count threshold.

## Non-goals (unchanged)

Thai for these words (separate native-review pass), HSK6, the HSK5 `f`≤2 tail, a word-detail
panel, battle/Results sentences, bundled sentence audio.

## Release note

Adds content to the existing bundled file → the eventual `development→main` release still needs one
`SHELL` bump (v81→v82) covering #124/#125/#128/#129 + this. This round does **not** bump;
`test/sw-precache.test.js` stays pinned to v81 until release (owner gate).

## Delegation

Lead: scope, cutoff, design, pilot review, verify adjudication, integration, PR. Workers (Sonnet):
11 generation batches + verify reviewers.

## Outcome (2026-07-18)

Generated **1,009** (11 Sonnet batches), mechanically gated 1,009/1,009 clean, LLM-verified
(8 Sonnet reviewers judging proper-noun / real-word / sense-match / naturalness). **87 deferred
(8.6%)**, **922 shipped**. Total example surface now **3,001** (917 HSK3 + 1,162 HSK4 + 922 HSK5).
Full suite 5,038 tests pass, lint 0, build clean. Live flashcard smoke (Playwright chromium, HSK5
`newOnly` scope, en): **32/32 cards rendered this round's new HSK5 examples** (not cloze reuse), 0
untraceable, 0 console errors.

The 8.6% defer rate is ~2× HSK4's (3.9%) — driven by the **46 proper nouns** (historical figures,
places, dynasties, book titles) the frequency extraction pulled from HSK5 exam *reading passages*.
These are not learnable vocabulary; deferring them is correct, and it is the honest cost of mining a
more advanced, passage-heavy level.

### Deferred (87) by category

- **Proper nouns (46)** — person/place/dynasty/book names from reading passages: 曹操, 老舍, 沈从文,
  艾青, 长安, 重庆, 成都, 山东, 湖南, 齐国, 魏国, 赵国, 秦国, 战国, 北宋, 花木兰, 嫦娥, 愚公, 本草纲目,
  王府井大街 … Not vocabulary; would ideally be filtered at extraction (`pipeline/hsk-extract-word.skill`).
- **Fragments / bound morphemes (25)** — 巴, 宏, 仪, 器, 服, 巨, 规, 失, 奢, 然, 母, 华 (bound); 空瓶,
  一颗, 一辆车, 一粒, 两根, 一大, 那幅, 哪项, 餐桌上, 尽全力, 辛勤劳动, 钻石戒指, 舍不 (mis-segmented
  numeral+classifier / compositional phrases / idiom fragments).
- **Gloss errors / rare-sense-taught / sense divergence (16)** — catalog gloss wrong or narrower than
  the sentence, so the card would contradict itself; an owner data-fix, not regenerable: 酒店
  ("wine shop"→hotel), 时代 ("Time magazine"→era), 前台 ("stage"→front desk), 结实 ("bear fruit"→sturdy),
  在乎 (glossed as 在于), 不然 ("not so"→otherwise), 师父 (garbled gloss), 教练 (verb gloss vs noun),
  依/幅/样/方 (gloss misses the used sense), 弄璋 (archaic), 主/一半 (unnatural), 华 (surname).

Documented in **#126** (HSK3+HSK4+HSK5 data-quality), which also notes two catalog *pinyin* errors a
reviewer surfaced (长凳 zhǎng→cháng, 背着 bèi→bēi — catalog fields, not example rows).
