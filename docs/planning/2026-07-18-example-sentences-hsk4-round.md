# Example sentences — HSK4 frequency-capped round (2026-07-18)

Follow-up to the HSK3 coverage round (`2026-07-18-example-sentences-hsk3-coverage-design.md`,
shipped as #128, 917 sentences). That round completed HSK1–3. This round extends the
flashcard "In a sentence" surface into **HSK4**, scoped by frequency. Analysis + build;
ships to `development`.

## Scope decision — top-N by frequency, not full level

HSK4 has **2,249 distinct words with no sentence** — 2.4× the HSK3 round. Unlike HSK1–3
(small, fully covered), HSK4 has a long low-frequency tail: **1,040 of the 2,249 appear in
exactly one mock exam (`f`=1)**. The product differentiator is empirical frequency ranking,
and the scope selector already filters by `topN`, so complete coverage only needs to hold
*within the words players actually reach*.

Cutoff: **`f` ≥ 2 → 1,209 words** — "every HSK4 word seen in ≥2 real mock exams." This drops
exactly the 1,040-word single-appearance tail. The `f`=1 tail is deferred to a later round if
warranted. Owner-approved scope (2026-07-18).

Distribution behind the cutoff: `f`≥50: 2 · 20–49: 81 · 10–19: 283 · 5–9: 251 · 2–4: 592 ·
(dropped) `f`=1: 1,040.

## Method — unchanged from HSK3

AI-generate offline + gate + verify; deterministic AI-free build. **EN-only** (Thai stays
review-gated; `exampleFor` falls back to English). Worker subagents (Sonnet) generate 13
batches of 93; a verify pass checks naturalness / grammar / **sense-match to the catalog
gloss** (the real failure mode). Mechanical gate is `build_examples_data.py`'s baked-in
`row_errors` (target hanzi substring, body 5–16, terminal 。？！, `en` non-empty, no cloze
overlap, no dupes) — it refuses to emit bad rows. Fail-verify-twice → **deferred and
reported**, never shipped marginal. Pilot one batch and read it in full before fan-out.

## Architecture — additive, no new files

The data path already exists (built for HSK3). This round only **appends rows** to
`data/examples.csv` and rebuilds `data/examples.{js,json}`. No new `<script>`, no `sw.js`
change (`data/examples.js` is already precached), no `src/` change (`main.js` already merges
`window.HSK_EXAMPLES`). `build_examples_data.py` is level-agnostic — nothing there changes.

**Test update:** `test/examples-data.test.js` currently asserts every key is HSK3
(`levelOf[h] === 3`) and `keys.length > 900`. Relax to `[3,4].includes(levelOf[h])` and bump
the count threshold; keep every structural per-row assertion (substring, punctuation, length,
no `th`, no `d`, no cloze overlap).

## Non-goals (unchanged)

Thai for these words (separate native-review pass), HSK5–6, the HSK4 `f`=1 tail, a word-detail
panel, battle/Results sentences, bundled sentence audio.

## Release note

Adds user-facing content to the existing bundled file → the eventual `development→main`
release still needs one `SHELL` bump (v81→v82) covering #124/#125/#128 + this. This round
does **not** bump; `test/sw-precache.test.js` stays pinned to v81 until release (owner gate).

## Delegation

Lead: scope, cutoff, design, pilot review, verify adjudication, integration, PR. Workers
(Sonnet): 13 generation batches + verify reviewers.

## Outcome (2026-07-18)

Generated **1,209** (13 Sonnet batches of 93), mechanically gated 1,209/1,209 clean, LLM-verified
(9 Sonnet reviewers judging sense-match-to-gloss / real-word / naturalness). **47 deferred (3.9%)**,
**1,162 shipped**. Total example surface now **2,079** (917 HSK3 + 1,162 HSK4). Full suite 4,116
tests pass, lint 0, build clean. Live flashcard smoke (Playwright chromium, HSK4 `newOnly` scope, en):
34/34 cards rendered **this round's new HSK4 examples** (not cloze reuse) — 0 cloze fallbacks, 0
untraceable, 0 console errors. (`newOnly:true` restricts the deck to words first introduced at HSK4,
which is exactly the set carrying the new examples, so the smoke exercises the shipped content directly
rather than lower-level cloze words.)

The 3.9% defer rate is ~2× the HSK3 round's (1.8%) — expected, because HSK4's frequency tail carries
more single-appearance segmentation artifacts and glossary noise than the fully-curated HSK1–3 core.

### Deferred (47) — not shipped this round

**Mis-segmented fragments / bound morphemes (24)** — not real standalone words; can only appear buried
in a larger compound, so no card can isolate them: `而` (of 而且), `获` (获得), `脏` (心脏/脏器), `什`
(什么), `会儿` (一会儿), `孙` (孙子), `袜` (袜子), `候` (候车), `叶` (树叶), `夏` (夏天), `实` (实话),
`意` (主意), `习` (习以为常), `出新` (推陈出新), `是从` (是…从), `多公里` (N多公里), `一小` (一小碗),
`数最多` (人数最多), `越长越` (越…越), `穷爸爸` (富爸爸穷爸爸), `总能` (总能量), `昀` (name char),
`小林` (name), `汽` (bound, 水汽/热气).

**Catalog gloss errors / rare-sense-taught / sense divergence (23)** — the sentence is fine Chinese but
the *catalog gloss* is wrong, archaic, or narrower than the sentence, so the card would contradict
itself or teach the wrong sense. Fixing these is an owner **data-fix**, not a regeneration:
`好处` ("easy to get along with"→benefit), `打印` ("affix a seal"→print), `使馆` ("consulate"→embassy),
`心里` ("chest"→in one's heart), `搬走` ("to carry"→move away), `现代` ("Hyundai"→modern),
`江河` ("Yangtze & Yellow rivers"→rivers), `大夫` ("senior official"→doctor), `云` ("classical to
say"→cloud), `生意` ("vitality"→business), `用心` ("motive"→diligent), `实际` (noun gloss vs adj sense),
`寄` ("entrust"→mail), `既` (gloss vs 既…又), `由` (gloss vs agentive "by"), `所` (gloss misses
classifier 一所), `早晚` (gloss misses "sooner or later"), `座` (gloss "seat" vs classifier), `结果`
(jiéguǒ noun vs jiēguǒ "bear fruit"), `或` (rare "perhaps" vs "or"), `因` (literary standalone),
`占` / `汽` (unnatural phrasing).

The 24 fragments and the ~15 genuine gloss errors above are catalog-quality issues in
`product/by-level` (HSK4), surfaced by this round but out of its scope to fix — filed as a follow-up
data-quality issue (companion to #126 for HSK3).
