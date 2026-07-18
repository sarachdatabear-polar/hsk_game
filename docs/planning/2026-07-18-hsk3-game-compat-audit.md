# HSK 3.0 game-catalog compatibility audit — 2026-07-18

**Status:** analysis + design only. **No migration, no data/product/vocabulary change.**
Roadmap item R2 (`docs/planning/2026-07-16-next-roadmap.md`), rank #2, parallel lane.

**Lead:** Claude (Opus 4.8). Implementation delegated to worker subagents (report
extraction, invariant fixture+tests) per the game-repo model workflow.

## 0. Why this is scoped small (read first)

Roadmap R2 has five parts. **Parts 1–2 are already done** in the *pipeline* repo:
`pipeline/hsk3-audit/` (merged PR #6) archives the authoritative HSK 3.0 source
(`hsk3_words.csv` = 10,978 words, `hsk3_chars.csv` = 3,000 chars, with provenance +
license notes in `REPORT.md §Source & method`) and already reports, against
`product/by-level`: words-in-both (6,377), high-value low-level misses (702, itemized
with has-Thai/has-audio columns), level cross-tabulation, extreme mislabels (136), and
character coverage (86.0%). **We do not re-derive any of that** — we cite it and extract
only the game-facing *content-cost* number from it (Worker A).

That audit's own conclusion (recorded in memory + PR #6): the exam-frequency method
*correctly* down-ranks rare basics; **no vocabulary/product change was warranted.** And
rollout is still uncertain — the official 2026 calendar lists HSK 1–6 separately from
7–9. So the likely R2 outcome is **defer**, and this document is sized to *quantify the
cost of that decision*, not to justify a migration.

The genuinely-new, game-side work is: **(A)** the dual-taxonomy data-model design (this
doc, §2–§4), **(B)** a fixture + invariant test proving it is non-destructive (Worker B),
and **(C)** an owner memo (lead, after A+B) — §5.

## 1. What a taxonomy change would touch in the game

Grounded in the current code (verified 2026-07-18):

| Concern | Keyed by | Survives a level renumber? |
|---|---|---|
| Mastery (`mastery.js`) | **hanzi** (`store[w.h]`) | ✅ taxonomy-invariant |
| SRS weights / due (`srs.js`) | **hanzi** | ✅ |
| Seen/introduced | **hanzi** | ✅ |
| Scope selection (`scope.levels:[1..6]`) | **level integers** | ❌ semantics shift |
| `scopeKey(scope)` → `"HSK1+2"` (`pool.js:33`) | **level integers** | ❌ |
| Saved card/battle session keys `cardSessionKey(scopeKey(scope), len)` (`main.js`) | derived from `scopeKey` | ❌ orphaned |
| Coverage denominators `manifest.levels[lv].freq_total` (`pool.js:27`) | **level** | ❌ |
| Scope stickers `id: scope:HSK${lv}·top${n}` (`stickers.js:scopeNodes`) | **level** | ❌ earned state orphaned |
| Milestone stickers `id: ms:HSK${lv}:${pct}` (`stickers.js:stickerDefs`) | **level** | ❌ earned state orphaned |
| Event stickers `id: ev:${ev}` | event name | ✅ |

**Key insight:** *word identity* (hanzi) is the stable primary key, so all learning
progress is safe. Everything that breaks breaks because it embeds the **level integer**
into a persisted key. Therefore the only safe design is one that **never renumbers the
existing `lv`.**

## 2. Design: HSK 3.0 level as an additive per-word facet

Do **not** replace the current per-word `lv` (the empirical frequency-derived HSK 1–6
level, which is the product's differentiator and must retain its provenance — see
roadmap "do not relabel exam-frequency rankings as HSK 3.0"). Instead:

- Add an **optional** per-word field `h3` (HSK-3.0 level, integer 1–9, or absent) to the
  minified word record in `data/words.js`. Absent ⇒ the word has no HSK-3.0 mapping.
- The canonical taxonomy — `scope.levels`, `scopeKey`, `manifest.levels`, all sticker
  ids, saved-session keys — **stays defined by `lv`, unchanged, byte-for-byte.**
- A future *optional* "HSK 3.0 view" would be a **new** selection surface that filters by
  `h3` and mints its **own** namespaced scope keys/stickers (e.g. `scope:H3-1·all`),
  never reusing or renumbering the `lv` namespace. It is out of scope here — this doc
  only proves the facet can be *added* non-destructively.

### Why a facet, not a second catalog
A parallel HSK-3.0 catalog would duplicate 6,377 shared words and fork mastery (a word
mastered in the frequency catalog would read as unseen in the 3.0 catalog). The facet
keeps **one** word identity (hanzi) with **two** labels, so mastery/SRS/seen remain
shared and correct across both views. Dual *catalog* is explicitly the more expensive
option we would only pick if the two systems' word *sets* diverged enough to need
separate progress — the data (6,377 overlap) says they don't.

## 3. Migration implications (for when/if it ships — NOT built now)

Adding `h3` is **purely additive** to the record shape, so per the repo's own rule it is
a data-shape change that *would* want a `migrations.js` ladder entry **at ship time** —
but there is nothing to migrate in `localStorage` (no stored key changes; `h3` lives in
the bundled `data/words.js`, which is not user data). So the eventual migration is a
**no-op version bump** whose only job is to record that the catalog gained a facet.

**This document does not add that entry.** `CURRENT_SCHEMA_VERSION` and `MIGRATIONS`
stay untouched until an actual ship decision. (Worker B must not touch them.)

## 4. The invariant to prove (Worker B's spec)

**Claim:** adding an `h3` facet to word records is non-destructive to every persisted
key. Concretely, for a synthetic fixture of words, adding `h3` to each record leaves ALL
of the following byte-identical:

1. `scopeKey(scope)` for representative scopes (single, run, disjoint).
2. `cardSessionKey(scopeKey(scope), len)` — the saved-session key.
3. Sticker `def.id` for every def from `stickerDefs(levelCounts)` — scope, milestone,
   and event kinds (level counts are unchanged by adding a facet).
4. Mastery keys: `recordAnswer`/`isMastered` operate on `w.h`, unaffected by `h3`.
5. `buildPool(levels, scope)` selects the same word set (selection reads `lv`, not `h3`).

The test uses a **synthetic, self-contained fixture** (a handful of hand-written word
records with both `lv` and `h3`), asserts the invariant against pure functions from
`pool.js`, `stickers.js`, `mastery.js`. It does **not** read `data/words.js`,
`product/`, or touch `migrations.js` / `build_game_data.py`.

## 5. Owner memo — content cost & recommendation

### Content cost of adopting HSK 3.0 (extracted from `pipeline/hsk3-audit`)

Absent = an HSK-3.0 word whose hanzi is **not** in our catalog (would be genuinely new
content). Two methods agree exactly (REPORT.md Cat-1 itemization for L1–3; the audit's
reported tail total for L4–9; both cross-checked by a direct hanzi set-difference vs the
14,017-hanzi `product/by-level` union):

| HSK 3.0 level | HSK 3.0 words | absent from our catalog | needs new Thai + audio |
|---|---:|---:|---:|
| 1 | 508 | 30 | 30 |
| 2 | 753 | 65 | 65 |
| 3 | 953 | 91 | 91 |
| 4 | 973 | 168 | 168 |
| 5 | 1,059 | 276 | 276 |
| 6 | 1,124 | 487 | 487 |
| 7–9 (combined tier in the standard) | 5,608 | 3,484 | 3,484 |
| **Total** | **10,978** | **4,601** | **4,601** |

- Every absent word needs a **new Thai gloss** (structural: our data only carries Thai
  for hanzi already in the catalog — verified, no exceptions). So adopting the full
  HSK 3.0 list = **~4,601 new bilingual entries**, of which most sit at the 7–9 tier.
- **Audio:** `build_audio.py` only generates clips for the top-2,000-by-frequency words,
  so only whichever of the 4,601 rank into that window would get audio; the rest ship
  Thai-only with the Web Speech TTS fallback (existing `audio.js` pattern) unless the
  rule changes.
- **Character coverage is already high:** 86.0% (2,579/3,000) of HSK 3.0's characters are
  covered by existing catalog hanzi; only **1** absent character is at a low level (≤3).

### Non-destructiveness — proven

The additive-facet design (§2) is proven non-destructive by
`test/hsk3-facet-invariant.test.js` (11 tests, green): adding `h3` to word records leaves
`scopeKey`, the `cardSessionKey` saved-session key, every `stickerDefs` `def.id` (scope +
milestone + event), mastery outcomes (keyed on hanzi), and `buildPool` word selection all
byte-identical. Nothing a player has earned or saved is disturbed by gaining the facet.

### Recommendation: **DEFER** (option 3), keep the facet design on the shelf

1. **Rollout is not real yet.** The official 2026 calendar still lists HSK 1–6 separately
   from 7–9; there is no dated switchover forcing our hand. The prior *pipeline* audit
   (PR #6) already concluded the frequency method needs no vocabulary change.
2. **The cost is concentrated where the value is lowest.** 3,484 of the 4,601 new entries
   (76%) are the advanced 7–9 tier — a large Thai-translation + review effort for the
   least-used vocabulary, exactly the segment our frequency ranking deliberately
   down-weights. The high-value low-level gap is small (186 words across L1–3).
3. **We lose nothing by waiting.** The design is additive and proven safe, so it can be
   adopted at any later date without a data migration or progress loss. There is no
   first-mover cost to deferring and no lock-in from doing so.

**Reject dual-catalog** (duplicates 6,377 shared words + forks mastery for no benefit —
the 6,377-word overlap means one identity with two labels is strictly better).
**Reject staged new-HSK levels** now (it commits us to the 7–9 translation spend before
any exam-rollout signal justifies it).

**If Jordan wants a cheap partial step:** the only content worth funding pre-rollout is
the **186 absent L1–3 words** (30/65/91) — small, high-frequency, and directly useful to
beginners regardless of which HSK version wins. That is a bounded content task
(Thai + audio for ≤186 words), *not* a taxonomy change, and is decoupled from this design.

_Deliverables: this doc (design + memo, lead), `test/hsk3-facet-invariant.test.js`
(Worker B), content numbers extracted from `pipeline/hsk3-audit` (Worker A). No product,
data, vocabulary, or `migrations.js` change was made._
