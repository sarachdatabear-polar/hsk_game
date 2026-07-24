# Thai Humanization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game's machine-sounding Thai (word glosses, UI copy, example sentences) with natural, native-sounding Thai, calibrated by Jordan via a blocking pilot, shipped in slices.

**Architecture:** Content pipeline, not feature code. Workers translate EN→TH under `docs/superpowers/specs/thai-style-guide.md`; adversarial verifiers challenge naturalness + fidelity; a quoted-field-safe apply script lands gloss changes in the ROOT repo `product/` CSVs; `build_game_data.py` / `build_examples_data.py` rebuild game data. One real code change: Thai-aware same-meaning exclusion in `src/distractors.js`.

**Tech Stack:** Python 3 (csv, json — stdlib only), vitest, existing build scripts. No new dependencies.

## Global Constraints

- **Pilot gate blocks Tasks 6+.** No full-run translation before Jordan's calibration lands in the style guide.
- Every translation worker prompt embeds `docs/superpowers/specs/thai-style-guide.md` verbatim.
- English gloss is the source of truth; hanzi/pinyin are context only.
- Gloss shape: lead sense + max one more, "; " separator (spec §4).
- Gloss coverage: only words whose hanzi ∈ `docs/planning/hsk3.0-audit/hsk3-mapping.json` (spec §5).
- CSV edits must be **quoted-field-safe**: always read/write with Python `csv` module, never regex/sed (the Stage-2 树林 lesson).
- ROOT repo (`/root/work/HSK`) owns `product/`; the game repo (`/root/work/HSK/game`) owns everything else. Never stage `game/` from the root repo.
- Gate = full `npm test` with **unmasked exit code** (no `| tail`, no `| grep`), lint 0, `npm run build` clean.
- Each release slice: SHELL `CACHE_VERSION` bump in `sw.js` + `test/sw-precache` pin in the **same commit**; merge `development→main` only on Jordan's explicit "ship".
- Worker tiers: Thai translation/verification = strong tier (opus); mechanical scripting/plumbing = cheap tier (sonnet).

---

## Phase 0 — PILOT (blocking)

### Task 1: Batch extraction script

**Files:**
- Create: `scripts/thai_batches.py` (game repo)
- Output (tracked): `docs/superpowers/thai/pilot-glosses.csv`, `docs/superpowers/thai/pilot-ui.csv`

**Interfaces:**
- Produces: `pilot-glosses.csv` columns `hanzi,pinyin,english,thai_current,freq,level`; `pilot-ui.csv` columns `key,english,thai_current`. Also reusable for full-run batches via `--start/--count`.

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""Emit Thai-rewrite work batches.

Glosses: unique catalog hanzi ∩ HSK3.0 list, ranked by max frequency, one row per
hanzi (first occurrence's pinyin/english/thai win — same rule build_game_data uses
for the merged word list). UI: i18n th-block keys filtered by prefix.

Usage:
  python3 scripts/thai_batches.py glosses --start 0 --count 200 --out docs/superpowers/thai/pilot-glosses.csv
  python3 scripts/thai_batches.py ui --prefixes home,common,nav,results --out docs/superpowers/thai/pilot-ui.csv
"""
import argparse, csv, json, re, sys
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
ROOT = GAME.parent
HSK3 = json.loads((GAME / "docs/planning/hsk3.0-audit/hsk3-mapping.json").read_text(encoding="utf-8"))

def load_words():
    best = {}
    for lv in range(1, 7):
        p = ROOT / "product" / "by-level" / f"HSK{lv}_words-to-remember_bilingual.csv"
        with open(p, encoding="utf-8-sig", newline="") as fh:
            for row in csv.DictReader(fh):
                h = row["hanzi"].strip()
                f = int(row["freq"] or 0)
                if h not in best:
                    best[h] = {"hanzi": h, "pinyin": row["pinyin"], "english": row["english"],
                               "thai_current": row["thai"], "freq": f, "level": lv}
                else:
                    best[h]["freq"] = max(best[h]["freq"], f)
    return [w for h, w in best.items() if h in HSK3]

def cmd_glosses(a):
    words = sorted(load_words(), key=lambda w: (-w["freq"], w["hanzi"]))
    batch = words[a.start:a.start + a.count]
    with open(a.out, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["hanzi", "pinyin", "english", "thai_current", "freq", "level"])
        w.writeheader(); w.writerows(batch)
    print(f"{len(batch)} gloss rows -> {a.out} (of {len(words)} real words)")

def cmd_ui(a):
    src = (GAME / "src/i18n.js").read_text(encoding="utf-8")
    en_block = src[src.index("en: {"):src.index("th: {")]
    th_block = src[src.index("th: {"):]
    def kv(block):
        return dict(re.findall(r'"([A-Za-z0-9._-]+)":\s*"((?:[^"\\]|\\.)*)"', block))
    en, th = kv(en_block), kv(th_block)
    prefixes = tuple(p.strip() + "." for p in a.prefixes.split(","))
    keys = [k for k in en if k.startswith(prefixes) and k in th]
    with open(a.out, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(["key", "english", "thai_current"])
        for k in keys: w.writerow([k, en[k], th[k]])
    print(f"{len(keys)} ui rows -> {a.out}")

p = argparse.ArgumentParser(); sub = p.add_subparsers(dest="cmd", required=True)
g = sub.add_parser("glosses"); g.add_argument("--start", type=int, default=0)
g.add_argument("--count", type=int, required=True); g.add_argument("--out", required=True); g.set_defaults(f=cmd_glosses)
u = sub.add_parser("ui"); u.add_argument("--prefixes", required=True)
u.add_argument("--out", required=True); u.set_defaults(f=cmd_ui)
a = p.parse_args(); a.f(a)
```

- [ ] **Step 2: Run both extractions**

Run (in `game/`): `mkdir -p docs/superpowers/thai && python3 scripts/thai_batches.py glosses --start 0 --count 200 --out docs/superpowers/thai/pilot-glosses.csv && python3 scripts/thai_batches.py ui --prefixes home,common,nav,results --out docs/superpowers/thai/pilot-ui.csv`
Expected: `200 gloss rows` (total real words ≈ 6,000–7,500) and `~65 ui rows`.

- [ ] **Step 3: Sanity-check output** — top rows must be 你/我/的-class words; every row's `english` non-empty; UI rows carry Thai script in `thai_current`.

- [ ] **Step 4: Commit (game repo)**

```bash
git add scripts/thai_batches.py docs/superpowers/thai/pilot-glosses.csv docs/superpowers/thai/pilot-ui.csv
git commit -m "feat(thai): batch extraction script + pilot batches (200 glosses, main-screen UI)"
```

### Task 2: Pilot gloss translation (workers)

**Files:**
- Modify: `docs/superpowers/thai/pilot-glosses.csv` — add column `thai_proposed` (and `note`, usually empty)

**Interfaces:**
- Consumes: Task 1 CSV. Produces: same CSV + `thai_proposed,note` columns, 200/200 filled.

- [ ] **Step 1: Dispatch 4 strong-tier workers, 50 rows each.** Each prompt = style guide verbatim + its 50 rows + these rules: *"For each row produce `thai_proposed`: the natural Thai a native speaker uses for the ENGLISH sense (lead sense + max one more, '; ' separator). You may keep `thai_current` unchanged if it is already exactly what a native would say — changing nothing is a valid answer. Add `note` only when uncertain or when English itself seems wrong. Return CSV rows only, quoted-field-safe."*
- [ ] **Step 2: Merge worker outputs; verify 200/200 rows, no hanzi lost, every `thai_proposed` contains Thai script.** (Python csv merge, not sed.)
- [ ] **Step 3: Commit** — `git commit -m "feat(thai): pilot gloss proposals (200 words)"`

### Task 3: Pilot UI translation (worker)

**Files:**
- Modify: `docs/superpowers/thai/pilot-ui.csv` — add column `thai_proposed`

- [ ] **Step 1: Dispatch 1 strong-tier worker** with style guide + all ~65 rows: *"Rewrite `thai_current` as `thai_proposed` in the lucky-cat voice per the UI-copy section. Preserve `{n}`-style placeholders exactly. Keep unchanged strings unchanged."*
- [ ] **Step 2: Verify all keys present, placeholders intact** (`{n}`, `{lv}` sets identical per row).
- [ ] **Step 3: Commit** — `git commit -m "feat(thai): pilot UI proposals (home/common/nav/results)"`

### Task 4: Adversarial verification

- [ ] **Step 1: Two independent strong-tier verifiers over the merged pilot** (glosses + UI): lens A *naturalness* ("would a Thai native ever say this? flag stiffness, translationese, wrong particles"), lens B *fidelity* ("does the Thai express the English sense? flag drift, lost senses, wrong register"). Verifiers see `english`, `thai_current`, `thai_proposed` — not the other verifier's output.
- [ ] **Step 2: Lead adjudicates every flag** — fix or overrule with a reason; update CSVs.
- [ ] **Step 3: Commit** — `git commit -m "fix(thai): pilot after adversarial verification"`

### Task 5: Review artifact for Jordan + handoff

- [ ] **Step 1: Publish a phone-friendly Artifact**: two tables (glosses: hanzi · EN · current TH · proposed TH; UI: screen · EN · current · proposed), changed rows highlighted, a "mark what still feels off" instruction header, and the open glossary questions from the style guide (เชี่ยวชาญ vs จำแม่นแล้ว, ถนน vs ย่าน).
- [ ] **Step 2: Update ROOT `HANDOFF.md`** — pilot delivered, artifact URL, gate = Jordan's calibration; commit root repo.
- [ ] **Step 3: STOP. Phase 1+ blocked on Jordan.**

---

## Phase 1 — Calibration + UI slice (release slice 1)

### Task 6: Absorb calibration
- [ ] Fold every Jordan correction into `thai-style-guide.md` (§Calibration log: pattern → rule), bump to v1, resolve glossary pendings, commit. Apply approved pilot UI strings + pilot glosses per his verdicts (UI → `src/i18n.js` now; glosses ride Task 9's apply).

### Task 7: Full UI rewrite (539 strings)
- [ ] Extract all prefixes (`scripts/thai_batches.py ui --prefixes <all 35>`); dispatch strong-tier workers ~90 strings each, style guide v1; street/item/battle sections get the game-term glossary emphasized.
- [ ] Verify: key parity + placeholder sets (script), adversarial pass as Task 4, then apply into `src/i18n.js` th block (worker edits file directly, one section per commit).
- [ ] Gate: `npm test` (unmasked) — i18n parity/placeholder tests must pass; `npx eslint .`; `npm run build`.
- [ ] Chromium TH smoke: boot app with `?lang=th` (or locale override), screenshot home/battle/results, zero console errors.
- [ ] Branch `feat/thai-ui-rewrite` → PR → dev merge. **Release cut on Jordan's "ship"** (SHELL bump + sw-precache pin same commit).

---

## Phase 2 — Glosses (release slices 2–3)

### Task 8: Thai-aware same-meaning exclusion (TDD)

**Files:**
- Modify: `src/distractors.js`
- Test: `test/distractors.test.js`

**Interfaces:**
- Produces: internal `sameThai(a, b)`; `pickDistractors` ok-filter becomes `!(target.t && w.t && sameThai(w.t, target.t))`.

- [ ] **Step 1: Failing tests**

```js
it("excludes a distractor whose Thai first sense matches the target's", () => {
  const pool = [
    mk2("看", "to look", "ดู; มอง", 100),      // target
    mk2("望", "to gaze", "มอง, ดู", 90),        // Thai overlap -> excluded
    mk2("吃", "to eat", "กิน", 80),
    mk2("水", "water", "น้ำ", 70),
    mk2("大", "big", "ใหญ่", 60),
  ];
  const d = pickDistractors(pool, pool[0], firstRand);
  expect(d.map(w => w.h)).not.toContain("望");
});
it("keeps Thai-distinct candidates even when short", () => {
  const pool = [
    mk2("看", "to look", "ดู", 100),
    mk2("门", "door", "ประตู", 90),
    mk2("吃", "to eat", "กิน", 80),
    mk2("水", "water", "น้ำ", 70),
  ];
  expect(pickDistractors(pool, pool[0], firstRand)).toHaveLength(3);
});
```
(`mk2 = (h, e, t, f) => ({ h, e, t, f })` — add beside the existing `mk` helper.)

- [ ] **Step 2: Run** `npx vitest run test/distractors.test.js` → FAIL (望 present).
- [ ] **Step 3: Implement in `src/distractors.js`**

```js
// Thai has no spaces: compare sense-level, not token-level. First sense of a Thai
// gloss is everything before ";" ; within it, comma-separated synonyms. Two glosses
// share meaning when any first-sense synonym matches exactly (whole synonym — Thai
// substring matching would false-positive on prefixes like น้ำ in น้ำแข็ง).
const thaiSenses = s => firstSense(s).split(",").map(x => x.trim()).filter(Boolean);
const sameThai = (a, b) => {
  const sa = thaiSenses(a), sb = thaiSenses(b);
  return sa.some(x => sb.includes(x));
};
```
and in `pickDistractors`, replace `!(target.t && w.t === target.t)` with `!(target.t && w.t && sameThai(w.t, target.t))`.

- [ ] **Step 4: Run** `npx vitest run test/distractors.test.js` → PASS; then full `npm test` (unmasked) → all green.
- [ ] **Step 5: Commit** `git commit -m "feat(distractors): Thai-aware same-meaning exclusion"` (branch `feat/thai-gloss-batch-a`, rides slice 2).

### Task 9: Quoted-field-safe gloss apply script

**Files:**
- Create: `scripts/thai_apply.py` (game repo; writes ROOT product files)

**Interfaces:**
- Consumes: a reviewed batch CSV with `hanzi,thai_proposed`. Produces: updated `thai` in every matching row of all 6 `ROOT/product/by-level/*.csv` + `ROOT/product/thai-supplement.csv` (also stamps its `source` column `AI-humanized (pilot-calibrated, 2026-07-XX)`); prints per-file change counts.

- [ ] **Step 1: Write it** — Python `csv` read→modify→write whole file (`utf-8-sig` preserved, `csv.QUOTE_MINIMAL`), match on exact `hanzi`, replace `thai` only when `thai_proposed` differs; `--dry-run` prints diffs without writing.
- [ ] **Step 2: Verify on the pilot batch**: `--dry-run` count equals the number of approved changed rows; a round-trip with zero proposals rewrites files **byte-identically** (proves the writer is lossless) — if the csv writer normalizes quoting, diff must show zero *semantic* changes and the writer style must be adopted in one dedicated commit before any content change.
- [ ] **Step 3: Apply pilot-approved glosses** → ROOT repo commit `feat(thai): pilot-calibrated glosses`; then `python3 build_game_data.py` in game repo, `npm test` unmasked, game commit.

### Task 10: Batch A — top 2,000 (slice 2)
- [ ] `thai_batches.py glosses --start 0 --count 2000` (minus pilot rows already applied); strong-tier workers ×~10 (200 rows each), style guide v1; adversarial verify (Task 4 shape, sampling 100%); lead adjudication; `thai_apply.py`; rebuild `build_game_data.py` (+ `build_audio.py` NOT needed — audio keys off hanzi); full gate; Jordan spot-checks a 30-row random sample (mini-artifact).
- [ ] Ship as slice 2 on Jordan's "ship" (with Task 8 on the same cut).

### Task 11: Batch B — remaining real words (slice 3)
- [ ] Same machinery, `--start 2000 --count 99999` (~4,000–5,500 rows), workers ×~25; verify may sample 50% + all flagged; apply, rebuild, gate, 30-row Jordan sample, ship as slice 3.

---

## Phase 3 — Examples live (release slice 4)

### Task 12: Rewrite the 923 HSK3 drafts
- [ ] Workers rewrite `data/examples-thai-review.csv` `th` per style guide v1 (many drafts are decent — "unchanged is valid"); `hanzi,sentence,en` must stay **byte-identical** (guard script diff vs `data/examples.csv` HSK3 rows); adversarial verify; commit.

### Task 13: Translate HSK4–6 examples (~6,195 rows) and promote all
- [ ] Extract rows of `data/examples.csv` without Thai; workers ×~30 translate per style guide (sentence rules section); adversarial verify (sample 50% + flags).
- [ ] Promote per `docs/i18n/thai-examples-review-queue.md`: add `th` column to `data/examples.csv` (Python csv, all 7,120 rows), run `python3 build_examples_data.py` — must emit `th` and still validate; extend the per-row example test to assert every `th` is Thai-script and non-empty.
- [ ] Gate: full `npm test` unmasked, lint, build; Chromium TH flashcard probe shows a Thai example sentence; Jordan 30-sentence random sample.
- [ ] Ship as slice 4 on Jordan's "ship". Update `docs/i18n/thai-examples-review-queue.md` status to PROMOTED.

---

## Self-review notes
- Spec §1–§9 each map to: §1→Phases 1–3, §2/§3/§4→style guide + worker prompts, §5→Task 1 filter, §6→Tasks 5/6 + per-batch samples, §7→Tasks 12–13, §8→slice structure, §9→Task 8.
- `examples.csv` currently has NO `th` column (verified 2026-07-24); `build_examples_data.py` emits `th` when present (dormant plumbing, verified).
- Real-word count lands ~6,000–7,500 (6,347 HSK3.0 headwords ∩ catalog); Task 1 prints the exact number — use it to size Batch B.
