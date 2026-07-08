# v6 Phase 2 — Typed-Pinyin Recall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed-pinyin recall format as the mastery ladder's top rung (streak 7+): the player types the word's pinyin letters on the native keyboard and taps a tone (1–4) per syllable, while the walker moves at 0.4×.

**Architecture:** All grading and syllable logic is pure in `src/pinyin.js` (unit-tested, no DOM). `src/formats.js` gains the `typed` registry entry with a new `input: true` flag; `formatFor` shifts tone-MC to streak 5–6 and adds typed at 7+. `src/main.js` renders the input UI when `FORMATS[format].input` is set and routes the graded result through the existing `answer()` flow — no changes to mastery, scoring, boss, or quest logic.

**Tech Stack:** Vanilla ES modules, vitest, esbuild (`npm run build` → `dist/app.js`).

**Spec:** `docs/superpowers/specs/2026-07-08-v6-typed-pinyin-design.md`

## Global Constraints

- Ladder after this change: streak 0 → `meaning`, 1–2 → `listen`, 3–4 → `reverse`, 5–6 → `tone`, 7+ → `typed`. (`mastery.js` streak `r` is uncapped — 7+ is reachable; do not touch mastery.js.)
- `FORMATS.typed`: `plaque: { hz: true }`, `audio: "never"`, `intro: "battle.introTyped"`, `input: true`, **no** `buildOptions`.
- Walker at `TYPED_WALK_FACTOR = 0.4` for the whole typed question.
- Word data pinyin is space-separated per syllable (verified: 18,441/18,441 multi-char words) with tone marks, e.g. `"nǐ hǎo"`. Neutral syllables carry no mark (`"shén me"`).
- ü: the player may type `v` or `u` for `ü`. Typing `v` for a plain `u` stays wrong.
- Same coins/combo/miss flow as every other format. No partial credit: `ok = lettersOk && tonesOk`.
- i18n: every new `t("...")` key needs EN + TH entries in `src/i18n.js` (`test/i18n-usage.test.js` enforces this).
- After any `src/` change: `npm run build` and commit `dist/app.js` with it.
- All work on branch `feat/v6-typed-pinyin` (spec already committed there).

---

### Task 1: Pure pinyin helpers — `syllables`, `syllableTones`, `letters`, `gradeTyped`

**Files:**
- Modify: `src/pinyin.js` (append after `retone`, before `shuffle`)
- Test: `test/pinyin.test.js` (append new describe blocks)

**Interfaces:**
- Consumes: existing `toneSlots(p)` and module-private `TONE_OF` in `src/pinyin.js`.
- Produces (used by Tasks 3):
  - `syllables(p: string): string[]` — `"nǐ hǎo"` → `["nǐ","hǎo"]`
  - `syllableTones(p: string): number[]` — tone per syllable, `0` = neutral; `"shén me"` → `[2, 0]`
  - `letters(p: string, uu?: "v"|"u"): string` — tone-stripped lowercase letters, ü → `uu`; `"nǐ hǎo"` → `"nihao"`
  - `gradeTyped(p: string, typedLetters: string, toneChoices: number[]): { ok, lettersOk, tonesOk }` — `toneChoices` aligned to **non-neutral** syllables in order.

- [ ] **Step 1: Write the failing tests**

Append to `test/pinyin.test.js`:

```js
import { syllables, syllableTones, letters, gradeTyped } from "../src/pinyin.js";

describe("syllables / syllableTones / letters (v6 phase 2 typed)", () => {
  it("splits space-separated pinyin", () => {
    expect(syllables("nǐ hǎo")).toEqual(["nǐ", "hǎo"]);
    expect(syllables("shuǐ")).toEqual(["shuǐ"]);
    expect(syllables("")).toEqual([]);
  });
  it("tone per syllable, 0 for neutral", () => {
    expect(syllableTones("nǐ hǎo")).toEqual([3, 3]);
    expect(syllableTones("shén me")).toEqual([2, 0]);
    expect(syllableTones("ma")).toEqual([0]);
  });
  it("letters strips tones, lowercases, drops separators", () => {
    expect(letters("nǐ hǎo")).toEqual("nihao");
    expect(letters("Xī'ān")).toEqual("xian");
  });
  it("letters maps ü by the uu argument", () => {
    expect(letters("nǚ", "v")).toEqual("nv");
    expect(letters("nǚ", "u")).toEqual("nu");
  });
});

describe("gradeTyped", () => {
  it("full pass", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3, 3])).toEqual({ ok: true, lettersOk: true, tonesOk: true });
  });
  it("ignores case, spaces and apostrophes in typed letters", () => {
    expect(gradeTyped("nǐ hǎo", " Ni Hao ", [3, 3]).ok).toBe(true);
  });
  it("wrong tones — lettersOk survives for kind feedback", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3, 2])).toEqual({ ok: false, lettersOk: true, tonesOk: false });
  });
  it("wrong letters — tonesOk survives", () => {
    expect(gradeTyped("nǐ hǎo", "lihao", [3, 3])).toEqual({ ok: false, lettersOk: false, tonesOk: true });
  });
  it("neutral syllables need no tone choice", () => {
    expect(gradeTyped("shén me", "shenme", [2]).ok).toBe(true);
    expect(gradeTyped("ma", "ma", []).ok).toBe(true);
  });
  it("ü accepts v and u — but v for a plain u is wrong", () => {
    expect(gradeTyped("nǚ", "nv", [3]).ok).toBe(true);
    expect(gradeTyped("nǚ", "nu", [3]).ok).toBe(true);
    expect(gradeTyped("lù", "lv", [4]).ok).toBe(false);
  });
  it("missing or extra tone choices fail tonesOk", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3]).tonesOk).toBe(false);
    expect(gradeTyped("ma", "ma", [1]).tonesOk).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/pinyin.test.js`
Expected: FAIL — `syllables` (and the rest) are not exported.

- [ ] **Step 3: Implement**

In `src/pinyin.js`, insert after the `retone` function (keep `shuffle`/`toneVariants` below unchanged):

```js
// ---- v6 phase 2: typed-pinyin recall (pure grading, no DOM) ----
// Word data pinyin is space-separated per syllable with tone marks
// ("nǐ hǎo", "shén me"); a syllable has at most one marked vowel.

export function syllables(p) {
  return (p || "").split(/[\s']+/).filter(Boolean);
}

// Tone number per syllable, 0 for neutral (no marked vowel).
export function syllableTones(p) {
  return syllables(p).map(s => {
    const slots = toneSlots(s);
    return slots.length ? slots[0].tone : 0;
  });
}

// Tone-stripped lowercase letters with separators removed; ü maps to `uu`
// so the player may type either "v" or "u" for it.
export function letters(p, uu = "v") {
  return [...(p || "").toLowerCase()]
    .map(ch => (TONE_OF[ch] ? TONE_OF[ch].vowel : ch))
    .join("")
    .replace(/ü/g, uu)
    .replace(/[^a-z]/g, "");
}

// Grade a typed answer. toneChoices is aligned to the NON-neutral syllables
// in order (neutral syllables render no tone row). No partial credit: the
// lettersOk/tonesOk split only feeds kind feedback copy.
export function gradeTyped(p, typedLetters, toneChoices) {
  const norm = (typedLetters || "").toLowerCase().replace(/ü/g, "v").replace(/[^a-z]/g, "");
  const lettersOk = norm === letters(p, "v") || norm === letters(p, "u");
  const want = syllableTones(p).filter(t => t > 0);
  const got = toneChoices || [];
  const tonesOk = want.length === got.length && want.every((t, i) => t === got[i]);
  return { ok: lettersOk && tonesOk, lettersOk, tonesOk };
}
```

Note: `TONE_OF` is already defined at the top of the file; `letters` lowercases first, so uppercase marked vowels (rare) are already lowercase before lookup.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/pinyin.test.js`
Expected: PASS (all new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/pinyin.js test/pinyin.test.js
git commit -m "v6p2: pure typed-pinyin grading — syllables, letters, gradeTyped"
```

---

### Task 2: Ladder shift + `typed` format registry entry

**Files:**
- Modify: `src/formats.js:17-25` (`formatFor`) and the `FORMATS` object
- Test: `test/formats.test.js` (extend the ladder describe)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 3): `formatFor` returning `"typed"` for `rec.r >= 7`; `FORMATS.typed = { plaque: {hz:true}, audio: "never", intro: "battle.introTyped", input: true }` (no `buildOptions`).

- [ ] **Step 1: Write the failing tests**

In `test/formats.test.js`, the existing ladder tests assert `rec(5)`/`rec(9)` → `"tone"`. Update/extend inside `describe("formatFor — the mastery ladder")` — replace the streak-5+ tone expectations with:

```js
  it("streak 5-6 get tone recall", () => {
    expect(formatFor(word, rec(5), caps)).toBe("tone");
    expect(formatFor(word, rec(6), caps)).toBe("tone");
  });
  it("streak 7+ gets typed recall", () => {
    expect(formatFor(word, rec(7), caps)).toBe("typed");
    expect(formatFor(word, rec(12), caps)).toBe("typed");
  });
  it("typed works for all-neutral words too (no tone fallback needed)", () => {
    expect(formatFor(mk("吗", "ma", "question particle", "ไหม"), rec(7), caps)).toBe("typed");
  });
```

(Keep the existing tone-fallback test for streak 5–6 all-neutral words → `"meaning"` — that behavior is unchanged.)

Add a registry-shape test alongside the existing FORMATS assertions:

```js
describe("FORMATS.typed registry shape", () => {
  it("is an input format: hanzi plaque, no audio, soft-intro, no options", () => {
    expect(FORMATS.typed.input).toBe(true);
    expect(FORMATS.typed.plaque).toEqual({ hz: true });
    expect(FORMATS.typed.audio).toBe("never");
    expect(FORMATS.typed.intro).toBe("battle.introTyped");
    expect(FORMATS.typed.buildOptions).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/formats.test.js`
Expected: FAIL — `rec(7)` still maps to `"tone"`; `FORMATS.typed` undefined.

- [ ] **Step 3: Implement**

In `src/formats.js`, change the ladder line in `formatFor` (line 21) from:

```js
  let f = r >= 5 ? "tone" : r >= 3 ? "reverse" : r >= 1 ? "listen" : "meaning";
```

to:

```js
  let f = r >= 7 ? "typed" : r >= 5 ? "tone" : r >= 3 ? "reverse" : r >= 1 ? "listen" : "meaning";
```

and update the ladder comment above it to:

```js
// Ladder: streak 0/unseen -> meaning, 1-2 -> listen, 3-4 -> reverse,
// 5-6 -> tone, 7+ -> typed. A miss resets the streak (mastery.js), so
// failures self-heal down the ladder.
```

The existing fallbacks below the ladder line stay exactly as they are (`listen`→`meaning` without audio; `tone`→`meaning` when no tone slots). `typed` needs no fallback: all-neutral words simply render no tone rows.

Add to the `FORMATS` object after `tone`:

```js
  typed: {
    plaque: { hz: true },      // hanzi only; pinyin would be the answer
    audio: "never",            // hearing the word would give it away
    intro: "battle.introTyped",
    input: true,               // main.js renders the typed input UI, not option buttons
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/formats.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/formats.js test/formats.test.js
git commit -m "v6p2: ladder rung 7+ typed, tone shifts to 5-6"
```

---

### Task 3: Battle UI — typed input, slow walk, kind diff, i18n

**Files:**
- Modify: `src/main.js` — import line 3 area, `renderQuestion` (~line 871), `lockOptions` (~line 919), the walk integration in `loop()` (~line 1079), plus a new `renderTypedInput` function after `renderQuestion`
- Modify: `src/i18n.js` — 5 new keys in the EN `battle.*` block and the TH `battle.*` block
- Modify: `index.html` — a few CSS rules appended to the main `<style>` block near the existing `#opts` rules
- Test: `test/i18n-usage.test.js` (existing — drives the keys red→green; no edits to the test file)

**Interfaces:**
- Consumes: `gradeTyped`, `syllables`, `syllableTones`, `letters` from Task 1; `FORMATS[format].input` from Task 2; existing `answer(btn, o)`, `lockOptions()`, `t()`, `$()`.
- Produces: `renderTypedInput(word)` (module-private), `TYPED_WALK_FACTOR` constant.

- [ ] **Step 1: Wire the UI (this makes `test/i18n-usage.test.js` fail on the 5 missing keys — that's this task's red)**

1a. In `src/main.js`, add the import next to the formats import (line 3):

```js
import { gradeTyped, syllables, syllableTones, letters } from "./pinyin.js";
```

1b. Near the other battle constants (e.g. just above `renderQuestion`), add:

```js
// v6p2: typed questions slow the walker — recall under pressure, not panic.
const TYPED_WALK_FACTOR = 0.4;
```

1c. In `renderQuestion` (line ~871), after the `promptKey` block and **before** the `format === "listen"` block, add:

```js
  if(FORMATS[format].input){ renderTypedInput(word); return; }
```

1d. Add `renderTypedInput` directly after `renderQuestion`:

```js
// v6p2 typed-pinyin input: letters field (native keyboard) + one tone row per
// non-neutral syllable + attack button. Grading is pure (pinyin.js); the
// result routes through the same answer() flow as a tapped option.
function renderTypedInput(word){
  const box = $("#opts");
  const wrap = document.createElement("div");
  wrap.className = "typed-box";
  const field = document.createElement("input");
  field.type = "text";
  field.className = "typed-letters";
  field.placeholder = t("battle.typedPlaceholder");
  field.autocapitalize = "off"; field.autocomplete = "off";
  field.spellcheck = false; field.setAttribute("autocorrect", "off");
  wrap.appendChild(field);
  const sylls = syllables(word.p), tones = syllableTones(word.p);
  const picks = tones.map(() => 0);
  const go = document.createElement("button");
  const sync = () => { go.disabled = !field.value.trim() || tones.some((tn, i) => tn > 0 && !picks[i]); };
  tones.forEach((tn, i) => {
    if(!tn) return;                     // neutral syllable — nothing to pick
    const row = document.createElement("div");
    row.className = "tone-row";
    const lab = document.createElement("span");
    lab.className = "tone-label";
    lab.textContent = letters(sylls[i]);
    row.appendChild(lab);
    for(let k = 1; k <= 4; k++){
      const c = document.createElement("button");
      c.className = "chip tone-chip";
      c.textContent = String(k);
      c.onclick = () => {
        picks[i] = k;
        row.querySelectorAll(".tone-chip").forEach(x => x.classList.toggle("on", x === c));
        sync();
      };
      row.appendChild(c);
    }
    wrap.appendChild(row);
  });
  go.className = "typed-go";
  go.textContent = t("battle.typedGo");
  go.disabled = true;
  field.oninput = sync;
  go.onclick = () => {
    const g = gradeTyped(word.p, field.value, picks.filter((_, i) => tones[i] > 0));
    field.disabled = true;
    if(!g.ok){
      // kind diff: always show the right pinyin; name what was close
      const diff = document.createElement("div");
      diff.className = "boss-prompt";
      diff.textContent = word.p
        + (g.lettersOk ? " · " + t("battle.typedLettersOk")
           : g.tonesOk ? " · " + t("battle.typedTonesOk") : "");
      wrap.appendChild(diff);
    }
    answer(go, { correct: g.ok });
  };
  wrap.appendChild(go);
  box.appendChild(wrap);
}
```

1e. In `lockOptions` (~line 919), also disable the letters field — change the selector line to:

```js
  document.querySelectorAll("#opts button, #opts input").forEach(b=>b.disabled = true);
```

1f. In `loop()`'s walk integration (~line 1079), change:

```js
        z.x -= B.speed*(z.boss?bossSpeedFactor:1)*dt;
```

to:

```js
        z.x -= B.speed*(z.boss?bossSpeedFactor:1)*(z.format==="typed"?TYPED_WALK_FACTOR:1)*dt;
```

1g. In `index.html`, next to the existing `#opts` styles in the main `<style>` block, append:

```css
/* v6p2 typed-pinyin input */
.typed-box{grid-column:1/-1; display:flex; flex-direction:column; gap:8px;}
.typed-letters{font:inherit; font-size:18px; padding:10px 12px; border-radius:12px;
  border:2px solid var(--line, #d8cfc0); background:var(--card, #fbf5e8); width:100%;}
.tone-row{display:flex; align-items:center; gap:6px;}
.tone-label{min-width:56px; color:var(--muted); font-size:14px;}
.tone-chip{min-width:40px;}
.tone-chip.on{background:var(--accent, #32775e); color:#fff;}
.typed-go{font:inherit; font-weight:700; padding:12px; border-radius:12px;}
.typed-go:disabled{opacity:.45;}
```

(Adjust the custom-property fallbacks to whatever variables the surrounding rules actually use — match the neighboring `#opts button` styling idiom rather than inventing new colors.)

- [ ] **Step 2: Run the i18n guard to verify it fails on the 5 new keys**

Run: `npx vitest run test/i18n-usage.test.js`
Expected: FAIL — `battle.typedPlaceholder`, `battle.typedGo`, `battle.typedLettersOk`, `battle.typedTonesOk`, `battle.introTyped` missing from STRINGS.en / STRINGS.th. (`battle.introTyped` is referenced from `formats.js`, committed in Task 2.)

- [ ] **Step 3: Add the strings**

In `src/i18n.js`, in the EN block next to the existing `battle.introTone` key, add:

```js
    "battle.introTyped": "Master level! Type the pinyin yourself — letters first, then tap each tone.",
    "battle.typedPlaceholder": "type the pinyin letters",
    "battle.typedGo": "ATTACK!",
    "battle.typedLettersOk": "letters right — check the tones!",
    "battle.typedTonesOk": "tones right — check the spelling!",
```

In the TH block next to the TH `battle.introTone`:

```js
    "battle.introTyped": "ด่านมาสเตอร์! พิมพ์พินอินเอง — พิมพ์ตัวอักษรก่อน แล้วแตะวรรณยุกต์ของแต่ละพยางค์",
    "battle.typedPlaceholder": "พิมพ์ตัวอักษรพินอิน",
    "battle.typedGo": "โจมตี!",
    "battle.typedLettersOk": "ตัวอักษรถูกแล้ว — เช็ควรรณยุกต์!",
    "battle.typedTonesOk": "วรรณยุกต์ถูกแล้ว — เช็คตัวสะกด!",
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all files, including the i18n usage guard.

- [ ] **Step 5: Build and verify in the browser**

```bash
npm run build
npm run serve   # http://localhost:8000
```

In the browser console, seed a streak-7 word so the typed format appears immediately (mastery lives at `localStorage["nbhsk.mastery"]`):

```js
localStorage.setItem("nbhsk.mastery",
  JSON.stringify({ "你": { s: 8, k: 7, r: 7, ls: Date.now() } }));
location.reload();
```

Start an HSK1 battle and confirm, when 你 spawns:
1. First ever appearance shows the soft-intro overlay; dismissing gives a full runway and the attempt is free (no heart on a miss).
2. Plaque shows hanzi only, no audio autoplay, plaque tap does not speak.
3. Letters field focuses the native keyboard; tone row appears ("ni" label, chips 1–4); ATTACK stays disabled until letters + tone are in.
4. Correct answer (`ni` + tone 3): normal kill — coin, combo, score.
5. Wrong tone: heart lost (after the free intro attempt), correct pinyin + "letters right — check the tones!" line shows, walker does its wrong-walk-back.
6. Walker visibly slower on typed words than on a meaning word.

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/i18n.js index.html dist/app.js
git commit -m "v6p2: typed-pinyin battle UI — letters + tone taps, 0.4x walk, kind diff"
```

---

### Task 4: Ship hygiene — SHELL bump, docs, PR

**Files:**
- Modify: `sw.js:5` (SHELL version)
- Modify: `docs/planning/V2-EXECUTION-PLAN.md` (status log append)
- Modify: `docs/prd/PRD-v5-visual-retention.md` §8 item 1 (mark typed-pinyin shipped, cloze/tone-minigame still parked)

**Interfaces:** none — documentation and cache-bust only.

- [ ] **Step 1: Bump SHELL**

In `sw.js` line 5, bump the version **one above whatever `development` has when this branch is rebased/merged** (PR #36 also bumps it — resolve to max+1, e.g. `v34` → `v35`):

```js
const SHELL = "nbhsk-shell-v35";
```

- [ ] **Step 2: Append the status log entry**

In `docs/planning/V2-EXECUTION-PLAN.md`, append to the status log section:

```markdown
## v6 phase 2 "Typed-Pinyin Recall" (2026-07-08)
Spec: docs/superpowers/specs/2026-07-08-v6-typed-pinyin-design.md
- [x] pinyin.js pure grading (syllables/letters/gradeTyped, ü = v|u)
- [x] ladder: tone 5-6, typed 7+ (FORMATS.typed, input: true)
- [x] battle UI: letters + tone taps, 0.4x walker, kind diff line, EN/TH
Deferred: per-format scoring bonus; cloze + tone minigame stay in PRD-v5 §8.
```

- [ ] **Step 3: Full verification**

```bash
npm test          # expect: all pass
npm run build     # expect: clean; dist/app.js committed in Task 3 step 6 — rebuild if anything changed
git status        # expect: only sw.js + docs modified since last commit
```

- [ ] **Step 4: Commit and open the PR**

```bash
git add sw.js docs/planning/V2-EXECUTION-PLAN.md docs/prd/PRD-v5-visual-retention.md
git commit -m "v6p2: SHELL bump + execution-plan status"
git push -u origin feat/v6-typed-pinyin
gh pr create --base development --title "v6 phase 2: typed-pinyin recall — ladder rung 7+" \
  --body "Typed-pinyin recall per docs/superpowers/specs/2026-07-08-v6-typed-pinyin-design.md: letters + per-syllable tone taps, tone-MC shifts to streak 5-6, typed at 7+, 0.4x walker, kind letters/tones diff, EN/TH strings. Pure grading in pinyin.js, registry-driven UI branch in main.js."
```

Expected: PR opens against `development`.

---

## Self-Review (done at planning time)

- **Spec coverage:** §1 ladder/registry → Task 2; §2 grading → Task 1; §3 UI/pacing/intro → Task 3; §4 scoring (no change) → enforced by reusing `answer()`; §5 i18n/tests → Tasks 1–3. Out-of-scope items appear in no task. ✓
- **Placeholders:** none — every code step shows the code. ✓
- **Type consistency:** `gradeTyped(p, typedLetters, toneChoices)` defined in Task 1 and called with `(word.p, field.value, picks.filter(...))` in Task 3; `FORMATS.typed.input` defined in Task 2, read in Task 3's `renderQuestion` branch; `TYPED_WALK_FACTOR` defined and used only in Task 3. ✓
- **Known merge point:** SHELL version and `sw.js` will conflict trivially with PR #36 (both bump); Task 4 step 1 says resolve to max+1.
