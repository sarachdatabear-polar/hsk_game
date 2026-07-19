# Learning depth — radicals / character components

_2026-07-19. Scoped this session. **Not built** — adding a radical facet needs a
licensed character-decomposition dataset with clean provenance (same shape as the
HSK 3.0 audit's source-provenance work), which is a data-sourcing task, not a
session-finish build. This doc picks the source and the minimal shippable slice._

## Why

Roadmap (`2026-07-16-next-roadmap.md`) frames "more learning depth
(radicals/example sentences)" as the retention lever **if completion is healthy
but mastery/recall is weak**. Example sentences already ship (`data/examples.*`,
887–1,162-word rounds per level). Radicals are the untouched half: they turn
opaque characters into composed, memorable parts — the single biggest recall aid
for Chinese, and fully offline/no-account (fits the architecture).

## The data problem (the real gate)

We need, per hanzi: its components/radical(s), ideally the semantic + phonetic
split, and a short gloss per component. Options, by license cleanliness:

| Source | Coverage | License | Notes |
|---|---|---|---|
| **Unicode IDS** (Ideographic Description Sequences) | all CJK | Unicode license (permissive) | Structural decomposition (⿰⿱…); no per-part gloss. Best base. |
| **CJKV-IDS / cjkvi-ids** (GitHub) | all CJK | MIT-like / free | Cleaned IDS tables; the practical form of the above. |
| **Kangxi 214 radical table** | the 214 radicals + glosses | public domain | Maps a hanzi → its *indexing* radical + a name/meaning. Small, safe. |
| Make-Me-a-Hanzi | ~9k common | LGPL/Arphic | Rich (strokes+decomp+gloss) but Arphic font clause — audit before use. |

**Recommendation:** ship the **Kangxi-214 radical + short gloss** slice first
(public domain, tiny, per-word "primary radical + meaning"), sourced with a
`SOURCE-PROVENANCE.md` exactly like `docs/planning/hsk3.0-audit/`. Layer full
IDS decomposition later if the radical slice moves recall. Do **not** pull in
Make-Me-a-Hanzi until the Arphic clause is cleared.

## Minimal shippable slice (the "start")

Mirror the h3 dual-taxonomy pattern that just shipped — an **additive, read-only
facet on the existing word record**, dormant until surfaced:

1. **Data**: a `radicals.json` map `{hanzi: {r: "氵", rn: "water", rp: "sān diǎn shuǐ"}}`
   built by a reproducible `build_radicals.py` (parent-repo `product/` style),
   joined into `build_game_data.py` as an optional `rad` field — **omitted when
   unknown**, exactly like `h3` (`build_game_data.py:109-111`).
2. **UI**: one more secondary row on the word-detail panel
   (`src/ui/word-detail.js` vm + `word-detail-screen.js` render), e.g.
   "Radical 氵 · water" — same pattern as the `wd-hsk3` pill just added. i18n
   `wd.radical` (EN+TH). Dormant-safe: off-list words show nothing.
3. **Test**: extend `test/word-detail.test.js` with a `rad`/no-`rad` case, and a
   facet-invariant test like `test/hsk3-facet-invariant.test.js` proving scope/
   mastery/pool are untouched.

That slice is fully buildable + testable on the VPS once the dataset exists — no
device or owner gate. It's the same low-risk additive-facet playbook as h3.

## Later (only if the slice earns it)

- "Learn by radical" grouping in the scope selector (words sharing a radical).
- Full IDS component breakdown with tap-through per component.
- A small radical-matching mini-drill (new game format).

These are real feature builds; gate them on whether the read-only radical row
actually correlates with better recall (the same baseline-data question the
roadmap raises for every R3 retention feature).

## Owner/data gate

- Confirm the Kangxi-214 (or cjkvi-ids) source + license, archive it under a
  provenance doc before generating `radicals.json`.
- Everything downstream (build join, word-detail row, tests) is VPS-buildable.
