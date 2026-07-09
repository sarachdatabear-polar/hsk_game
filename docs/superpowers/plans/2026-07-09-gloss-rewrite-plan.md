# Natural-gloss rewrite — analysis & plan (item 2)

**Status:** analysis complete; approach **decided empirically** (LLM re-gloss —
dictionary and string-transform paths were tested and both failed). Remaining
owner input is the **review budget/cadence**, not the method. Sequenced to start
after the P2 art drop. This is prep, not the PR.

## Problem

The middot fix (F9) made `+`-joined glosses *display* acceptably
(`nine · hundred`), but the underlying meanings are still auto-generated
junk for a big slice of the learning content. **Content quality is the
product differentiator**, so this is worth doing properly, not blind-massaging.

**Scope (authoritative, from shipped `data/words.json`): 3,417 entries carry
` + ` — 15.5% of 22,027.** These span **2,938 unique hanzi** (gloss is a
property of the word, so the override map is keyed by hanzi and is 2,938 rows;
one fix can clean several entries — the earlier "2,938" figure was this
unique-hanzi count).

## Progress (2026-07-09, branch `feat/ui-polish-1`)

- **Build plumbing landed + verified.** `build_game_data.py` now loads an
  optional `data/gloss-overrides.json` (hanzi → clean gloss) and swaps it in
  **only when the source still carries ` + `** — so a future clean pipeline
  rebuild is never clobbered, and the default (no file) path reproduces
  `data/words.js` byte-identically. Verified end-to-end: a 94-entry test map
  cleaned 119 rows (94 hanzi × repeats) with correct output; data reverted so
  nothing unreviewed shipped.
- **Sample for owner review ready:** `docs/gloss-sample-for-review.md` — 94
  drafted glosses across every bucket. Headline from the sample: **29% had a
  factually *wrong* source gloss** (现代文学→"Hyundai", names glossed char-by-
  char), confirming this is correctness work, not formatting. **Style approved
  by Jordan.**

- **FULL PASS DONE (2026-07-09).** All 2,938 unique-hanzi glosses rewritten →
  `data/gloss-overrides.json`; applied via the build, all 3,417 ` + ` entries
  now 0, 1,383 tests pass. Method (per advisor — matched model to risk): 3 Opus
  workers did the knowledge-heavy buckets (3+ part / grammatical / affix, 420),
  6 Sonnet workers the easy 2-part bulk (2,387), I did numbers+reduplication
  (37) and kept my 94. Every worker emitted a confidence flag. Mechanical QA
  over all 2,938: 0 residual ` + `, 0 empty, 0 meta-language leaks, 0 over-long.
  **255 flagged (222 med + 33 low)** for owner review in
  `docs/gloss-review-flagged.md`. Applied on `feat/ui-polish-1`; **NOT merged /
  deployed — gated on Jordan's correctness sign-off** (style ≠ ship approval).
  Known residue: some entries are pipeline **fragments** clipped mid-phrase
  (一小, 是从) — a source dedup issue, not a gloss issue; glossed literally + flagged.

## Root cause — this is a data-quality bug, not a formatting bug

The ` + ` is the seam of **character-by-character glossing**: each hanzi was
looked up alone and the per-char glosses concatenated. So:

- `一分钟` → "one + minute + **handleless cup**" (钟 alone = clock/cup)
- `万年前` (ten-thousand-years-ago) → "**Wannian county in Shangrao** + front, before" (万年 misread as a place name)
- `第三` (third) → "ordinal-number prefix + three"

A plain `+`→space transform fixes presentation but **ships the wrong meaning**.
Any real fix must re-derive meaning at the **word** level, not restitch chars.

## Category breakdown (of the 3,417)

| Bucket | Count | Risk | Notes |
|---|---:|---|---|
| 2-part, single-sense each side | 2,299 | Low–med | "year + ticket"→"year ticket"; but "two of something + layer"→"two layers" needs judgment |
| 2-part, a side is a comma-list of senses | 590 | Med–high | naive join reads badly: "small, little + fish" → "small, little fish" |
| 3+ part compound | 340 | High | usually carries a spurious char-gloss (see 一分钟); often just wrong |
| grammatical / aspect markers | 147 | High | 过/着/了 = grammar, not vocab: "to look + experience marker" |
| affix / ordinal | 38 | High | truncated garbage: 老X → "prefix used before the surname… + …" |
| reduplication (identical halves) | 37 | **None** | 笑笑 "to laugh, to smile + to laugh, to smile" → collapse to one half |
| pure-number compound | 20 | **Low** | "nine + hundred" → "nine hundred"; "six + seven" → "six or seven" |

Only ~57 (reduplication + pure numbers) are safely mechanical. Everything else
needs either a real dictionary or per-word judgment.

## Approach — EMPIRICALLY DECIDED (was owner-open; the data settled it)

Two candidate mechanical approaches were tested against the real 3,417 and
**both failed**. An LLM re-gloss (B) is the only viable path.

### (A) Word-level re-gloss from CC-CEDICT — ❌ DEAD (0.8% coverage)

Downloaded CC-CEDICT (124,779 entries) and matched every `+`-entry's hanzi as a
headword: **only 26 of 3,417 (0.8%) exist as dictionary words**, and most of
those resolve to "see 其他词" cross-references, not glosses. The other **99.2%
are compositional phrases** the frequency pipeline surfaced from real exam text
(九百, 出门时, 踢进, 第三…) — by design (empirical frequency, *not* the official
wordlist), so no lexicon will ever contain them. A dictionary cannot help here.

### (C) Tiered string transform — ❌ DEAD as a correctness fix

Ran a deterministic Tier-A pass (reduplication + pure numbers, the *safest*
57). It exposed that **the source glosses are themselves wrong**, not merely
mis-formatted — so no string rule is safe:

- `一万` "one + ten thousand" — naive rules → "one thousand"; **correct = ten thousand**
- `倒掉` glossed "to fall + to fall" — actually **"to pour out / dump"**
- `望望` "full moon + full moon" — actually **"to take a look"** (望 = gaze)
- `阵阵` "disposition of troops ×2" — actually **"in bursts / waves"**
- `神话传说` "legend + legend" — two *different* words (myth + legend), not a reduplication

String massaging fixes the `+` seam while shipping the wrong meaning. Unusable
except as a last-ditch cosmetic fallback for entries the LLM pass can't reach.

### (B) LLM re-gloss, owner-reviewed — ✅ RECOMMENDED

Only an LLM reads `九百`→"nine hundred", `一分钟`→"one minute",
`万年前`→"ten thousand years ago", `看过`→"to have seen (past experience)".
It handles compositional phrases *and* corrects the wrong source glosses in one
pass. Cost: a generation + **tiered owner review** budget; hallucination risk is
real, so review is mandatory (highest-risk buckets first). No license burden.
See the sample in the appendix for what B output looks like.

## Where the fix lives (not the pipeline output)

Do **not** hand-edit `product/by-level/*.csv` — the pipeline regenerates them.
Extend the existing curated-override pattern in `build_game_data.py` (the `FIX`
map already overrides broken rows like 廖/萄), keyed by hanzi, applied at build.
Keeps the pipeline reproducible and the corrections in one reviewable place. The
display middot in `pool.js:meaning()` stays as a belt-and-suspenders fallback.

## Staged rollout (the eventual PR)

LLM-draft all 3,417, then review **by risk tier** (there is no no-review tier —
the source data is wrong even in the "easy" buckets):

1. **Review-light — numbers + reduplication + 2-part single-sense (~2,356):**
   fast to skim; the LLM is very reliable here but still catches source errors
   (一万, 倒掉). Bulk-approve with a sampled spot-check.
2. **Review-medium — 2-part multi-sense (590):** sense-selection judgment.
3. **Review-heavy — 3+ part, grammatical/aspect, affix (525):** where the wrong
   meanings concentrate (一分钟's "handleless cup", 万年前's "Wannian county").
   Read every one.

Mechanics: apply as a hanzi-keyed override consumed by `build_game_data.py`
(extend the existing `FIX` map; do **not** edit `product/*.csv`). Regenerate
`data/words.{js,json}` + `data/manifest.json`. `build_audio.py` need not re-run
(only English changes, no hanzi). Bump `SHELL` in `sw.js`. Keep the `pool.js`
middot as a fallback for any entry the pass doesn't cover.

## Appendix A — approach-B sample (hand-drafted, illustrates target quality)

| hanzi | current (`+`) | approach-B gloss |
|---|---|---|
| 九百 | nine + hundred | nine hundred |
| 一万 | one + ten thousand | ten thousand |
| 六七 | six + seven | six or seven |
| 一分钟 | one + minute + handleless cup | one minute |
| 万年前 | Wannian county… + front, before | ten thousand years ago |
| 第三 | ordinal-number prefix + three | third |
| 小鱼 | small, little + fish | small fish |
| 踢进 | to kick + to enter | to kick in (a goal) |
| 这次 | this + time occurrence | this time |
| 两层 | two of something + layer | two layers / floors |
| 出门时 | to go out + time, when | when going out |
| 年票 | year + ticket | annual pass |
| 看过 | to look… + experience marker | to have seen / read |
| 想着 | to want + ongoing-action marker | to be thinking about |
| 倒掉 | to fall + to fall | to pour out; to dump |
| 望望 | full moon + full moon | to take a look |
| 阵阵 | disposition of troops ×2 | in bursts; in waves |
| 聊聊天 | to chat + to chat | to chat (a bit) |

## Appendix B — bucket counts (of 3,417)

2-part single-sense 2,299 · 2-part multi-sense 590 · 3+ part 340 ·
grammatical/aspect 147 · affix/ordinal 38 · reduplication 37 · pure-number 20.
