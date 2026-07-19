# Word-Detail Panel — Design

_Date: 2026-07-19 · Status: approved (brainstorming) · Target branch: `feat/word-detail-panel` → `development`_

## Goal

Let a learner tap an ⓘ affordance to open a lightweight info panel for a single word,
showing its full detail plus its example sentence, on the surfaces where they are already
studying it. This is the "optional word-detail panel" deferred item from the roadmap,
built in its **scoped** form (explicit surfaces, not tap-anywhere).

## Scope

**In scope — two trigger surfaces:**

1. **Flashcard back.** An ⓘ button (44px touch target) beside the hanzi on the revealed
   back of the card. Opens the panel with the card's word object. The card's existing
   flip `onclick` and the front face are untouched — the ⓘ is a separate affordance so it
   does not fight the flip gesture (`#fc-card` flip wiring at `main.js:1315`).
2. **Progress "needs-work" rows.** Each row already holds a word object
   (`renderNeedsWork()`, `main.js:3998-4020`). Tapping the row opens the panel.

**Explicitly out of scope (deferred, no rework needed to add later):**

- Tap-*anywhere* on hanzi in battle/options/boss surfaces. Those render hanzi as bare
  strings with no `data-hanzi` attribute; genuine tap-anywhere needs that attribute
  plumbed across surfaces plus a delegated listener. The word-object-in-hand surfaces
  above cover the primary study moments without it.
- Thai coverage for example sentences from the `HSK_EXAMPLES` half of the corpus (EN-only
  by design; Thai rides a later native-review pass). The panel falls back to English there.

## Panel content — learner-facing set

| Line | Source | Notes |
|------|--------|-------|
| Hanzi · pinyin | `w.h`, `w.p` | always present |
| English gloss | `w.e` | always present |
| Thai | `w.t` | **falls back to English gloss when `w.t === ""`** |
| `HSK{lv} · {Core\|Extended}` | `w.lv`, `w.c` | `c === 1` → "Core", else "Extended" |
| `Appears in {ta} of {tt} exams` | `w.ta`, `w.tt` | the on-brand empirical-frequency line; **not** the raw `f` integer |
| **In a sentence**: CN + translation | `EXAMPLES[w.h]` | section omitted entirely when no example exists |

Example-sentence translation: show English (`en`). If the entry is from the cloze half and
carries Thai (`th`) **and** the active locale is Thai, show Thai instead. (Matches the
existing `exampleFor` locale rule but the panel reads `EXAMPLES[w.h]` directly so it can
present CN + one translation without being constrained to the `exampleFor` return shape.)

## Architecture

Follows the repo idioms (AGENTS.md): pure logic in a small tested module; `main.js` only
mounts the overlay and wires triggers.

### New pure module — `src/ui/word-detail.js`

```
buildWordDetail(word, examples, locale) -> {
  hanzi, pinyin, english, thai,   // thai already resolved to EN fallback if empty
  level,                          // int, e.g. 4       (caller renders "HSK4")
  tier,                           // "core" | "extended"  (caller resolves label via i18n)
  examLine,                       // { n: ta, total: tt }  (caller formats via i18n)
  example                         // { cn, tr } or null
}
```

- Pure: no DOM, no globals, no `window`. Takes the word record, the merged `EXAMPLES` map,
  and the locale string. Mirrors `src/examples.js` + `exampleFor`.
- Returns **data**, not markup. Tier and exam-count labels are returned as
  structured values (`tier: "core"|"extended"`, `examLine: {n, total}`) so `main.js`
  resolves the display strings through `i18n.t(...)`; this keeps the module locale-agnostic
  and unit-testable without the i18n table.
- `example` is `null` when `examples[word.h]` is absent → caller omits the section.

### New test — `test/word-detail.test.js`

Unit-tests the helper (main.js wiring stays untested by design):
- Thai present → uses `w.t`; Thai empty → falls back to `w.e`.
- `c:1` → `tier:"core"`; `c:0` → `tier:"extended"`.
- `examLine` carries `ta`/`tt` correctly.
- Example present → `{cn, tr}`; absent → `example:null`.
- Locale `th` with a cloze `th` example → Thai translation; locale `en` → English;
  `HSK_EXAMPLES`-only entry (no `th`) under locale `th` → English fallback.

### Overlay — `index.html`

New `#word-overlay` / `#word-panel`, cloned from the **quest-overlay** pattern
(`index.html:1307-1311`): `.pause-overlay` scrim + `.pause-panel` + `.overlay-close`
(44px), `role="dialog" aria-modal="true"`, backdrop-tap-to-close
(`if (e.target.id === "word-overlay") closeWordPanel()`). Static labels via `data-i18n`.

### Wiring — `main.js`

- `openWordPanel(word)` — accepts a word object; if only a hanzi string is available it
  resolves via the existing `BY_HANZI` index (`main.js:75`). Calls `buildWordDetail`,
  fills `#word-panel`, shows it via the existing `openDialog(dialog, initialFocus,
  onEscape)` / `closeDialog(...)` helpers (`main.js:327-346`) — inherits focus-trap +
  Escape + single-active-dialog for free.
- Adds the ⓘ button to the flashcard back renderer (`renderCard()`, `main.js:1287-1314`)
  and a click handler on needs-work rows (`renderNeedsWork()`, `main.js:3998-4020`).

## i18n

Add to **both** `STRINGS.en` and `STRINGS.th` in `src/i18n.js` — `test/i18n.test.js:47-48`
asserts key parity and placeholder parity, so a missing key fails CI:

- `wd.core` → "Core" / (th)
- `wd.extended` → "Extended" / (th)
- `wd.appearsInExams` → "Appears in {n} of {total} exams" / (th) — placeholders must match
  in both tables.

Reuse existing `fc.inSentence` ("In a sentence" / "ในประโยค") for the example header.
Thai strings are machine-drafted and join the standing native-review queue (repo-sanctioned
pattern), not blocking.

## Build & ship

- After `src/`/`index.html` changes: `npm run build` (esbuild → `dist/app.js`); the
  deployed app uses `dist/app.js`.
- Full `npm test` (must be green, including i18n parity + precache tests).
- Lands on **`development`** only. **No `sw.js` SHELL bump** — the PWA cache-version bump
  and Windows APK/AAB rebuild are the owner's release gate, applied at the next
  `development → main` cut.

## Testing summary

- Pure helper covered by `test/word-detail.test.js` (the testable seam).
- `main.js` overlay mount + trigger wiring: untested by design, verified manually via
  `npm run serve` (flashcard ⓘ opens/closes; needs-work row opens; Thai-empty word falls
  back to English; word with no example omits the section; Escape + backdrop dismiss work).

## Risks

- **Flip-gesture collision** — mitigated by a separate ⓘ affordance rather than a card tap.
- **Data honesty** — Thai (word-level and example-level) is absent for a large fraction of
  words; the fallback-to-English rule is specified above and unit-tested.
- **CI parity gate** — new i18n keys must land in both tables; covered by the test and
  called out here so the worker does not miss it.
