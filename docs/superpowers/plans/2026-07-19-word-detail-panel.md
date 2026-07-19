# Word-Detail Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tappable ⓘ word-detail panel (pinyin, English, Thai, level/tier, exam-appearance line, example sentence) reachable from the flashcard back and the Progress "needs-work" rows.

**Architecture:** A pure `buildWordDetail(word, examples, locale)` view-model builder (the tested seam) plus a `createWordDetail(deps)` DOM controller in `src/ui/`, mounted once by `main.js`. The overlay markup clones the existing `#quest-overlay` dialog pattern; the two triggers are minimal edits to the existing `renderCard()` / `renderNeedsWork()` renderers.

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest, inline HTML/CSS in `index.html`, `src/i18n.js` dotted-key tables.

## Global Constraints

- `main.js` is frozen at current scope — new feature logic lives in `src/ui/word-detail*.js`; `main.js` only mounts + wires triggers. (AGENTS.md)
- New i18n keys MUST be added to **both** `STRINGS.en` and `STRINGS.th` with matching `{placeholders}` — `test/i18n.test.js` parity gate fails CI otherwise.
- After any `src/`/`index.html` change: `npm run build` (deployed app uses `dist/app.js`).
- Lands on `development` via branch `feat/word-detail-panel`. **NO `sw.js` SHELL bump** (owner release gate).
- Never mask the `npm test` exit code. Full suite + `npm run lint` must pass.
- Exam-appearance copy uses the app's established noun **"papers"** (matches existing `learn.hintFront`: "in {ta}/{tt} papers"), not "exams".
- Word data is trusted/bundled — `innerHTML` of word fields matches existing `renderCard()` convention; no new escaping needed.

---

### Task 1: Pure view-model builder `buildWordDetail`

**Files:**
- Create: `src/ui/word-detail.js`
- Test: `test/word-detail.test.js`

**Interfaces:**
- Consumes: `exampleFor(word, clozeData, locale)` from `src/examples.js` → `{cn, tr}` or `null`.
- Produces: `buildWordDetail(word, examples, locale) -> { hanzi, pinyin, english, thai, level, tier, examLine:{n,total}, example }` where `tier` is `"core"|"extended"` and `example` is `{cn,tr}` or `null`.

- [ ] **Step 1: Write the failing test**

```js
// test/word-detail.test.js
import { describe, it, expect } from "vitest";
import { buildWordDetail } from "../src/ui/word-detail.js";

const W = { h: "现代", p: "xiàndài", e: "modern; contemporary", t: "ทันสมัย", lv: 4, f: 128, ta: 42, tt: 50, c: 1, n: 1 };
const EX = { "现代": { s: "现代生活很方便。", en: "Modern life is convenient.", th: "ชีวิตสมัยใหม่สะดวกมาก" } };

describe("buildWordDetail", () => {
  it("maps the core fields", () => {
    const vm = buildWordDetail(W, EX, "en");
    expect(vm.hanzi).toBe("现代");
    expect(vm.pinyin).toBe("xiàndài");
    expect(vm.english).toBe("modern; contemporary");
    expect(vm.thai).toBe("ทันสมัย");
    expect(vm.level).toBe(4);
    expect(vm.examLine).toEqual({ n: 42, total: 50 });
  });

  it("falls back to English gloss when Thai is empty", () => {
    const vm = buildWordDetail({ ...W, t: "" }, EX, "en");
    expect(vm.thai).toBe("modern; contemporary");
  });

  it("maps tier from c: 1 -> core, 0 -> extended", () => {
    expect(buildWordDetail({ ...W, c: 1 }, EX, "en").tier).toBe("core");
    expect(buildWordDetail({ ...W, c: 0 }, EX, "en").tier).toBe("extended");
  });

  it("returns the example {cn,tr} when present, English tr under locale en", () => {
    const vm = buildWordDetail(W, EX, "en");
    expect(vm.example).toEqual({ cn: "现代生活很方便。", tr: "Modern life is convenient." });
  });

  it("uses Thai translation under locale th when the example carries th", () => {
    expect(buildWordDetail(W, EX, "th").example.tr).toBe("ชีวิตสมัยใหม่สะดวกมาก");
  });

  it("falls back to English translation under locale th when the example has no th", () => {
    const exNoThai = { "现代": { s: "现代生活很方便。", en: "Modern life is convenient." } };
    expect(buildWordDetail(W, exNoThai, "th").example.tr).toBe("Modern life is convenient.");
  });

  it("returns null example when the word has none", () => {
    expect(buildWordDetail(W, {}, "en").example).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/work/HSK/game && npx vitest run test/word-detail.test.js`
Expected: FAIL — cannot resolve `../src/ui/word-detail.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/ui/word-detail.js
// Pure view-model builder for the word-detail panel. No DOM, no globals — the
// tested seam. Mirrors src/examples.js. Caller resolves display labels (tier,
// exam line) through i18n so this module stays locale-agnostic.
import { exampleFor } from "../examples.js";

// word: minified record { h,p,e,t,lv,f,ta,tt,c,n }
// examples: merged EXAMPLES map (cloze + HSK_EXAMPLES), keyed by hanzi
// locale: "en" | "th"
export function buildWordDetail(word, examples, locale) {
  return {
    hanzi: word.h,
    pinyin: word.p,
    english: word.e,
    thai: word.t || word.e,                 // fall back to English gloss when Thai empty
    level: word.lv,
    tier: word.c === 1 ? "core" : "extended",
    examLine: { n: word.ta, total: word.tt },
    example: exampleFor(word, examples, locale),   // { cn, tr } or null
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/work/HSK/game && npx vitest run test/word-detail.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/word-detail.js test/word-detail.test.js
git commit -m "feat(word-detail): pure buildWordDetail view-model + tests"
```

---

### Task 2: i18n strings (en + th)

**Files:**
- Modify: `src/i18n.js` (add keys to both `STRINGS.en` near line 154 and `STRINGS.th` near line 570, beside the existing `fc.*` keys)

**Interfaces:**
- Produces: i18n keys `wd.core`, `wd.extended`, `wd.appearsInPapers` (params `{n}`,`{total}`), `wd.info`. Reuses existing `fc.inSentence`, `common.close`.

- [ ] **Step 1: Add the English keys**

In `STRINGS.en`, immediately after the `"fc.inSentence": "In a sentence",` line, add:

```js
    "wd.info": "Word detail",
    "wd.core": "Core",
    "wd.extended": "Extended",
    "wd.appearsInPapers": "Appears in {n} of {total} papers",
```

- [ ] **Step 2: Add the Thai keys**

In `STRINGS.th`, immediately after the `"fc.inSentence": "ในประโยค",` line, add (machine-drafted; joins the standing native-review queue):

```js
    "wd.info": "รายละเอียดคำ",
    "wd.core": "หลัก",
    "wd.extended": "เพิ่มเติม",
    "wd.appearsInPapers": "พบใน {n} จาก {total} ชุดข้อสอบ",
```

- [ ] **Step 3: Run the i18n parity test**

Run: `cd /root/work/HSK/game && npx vitest run test/i18n.test.js`
Expected: PASS — key parity `[]` and placeholder parity hold (`{n}`/`{total}` present in both).

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "feat(word-detail): add wd.* i18n strings (en + th)"
```

---

### Task 3: Overlay markup + `createWordDetail` controller

**Files:**
- Modify: `index.html` — add `#word-overlay` markup (clone of `#quest-overlay`, after it near line 1315) + a small CSS block in the `<style>` section.
- Create: `src/ui/word-detail-screen.js`

**Interfaces:**
- Consumes: `buildWordDetail` (Task 1); `t` from `src/i18n.js`; DOM helpers passed in as deps.
- Produces: `createWordDetail({ $, openDialog, closeDialog, examples, getLocale }) -> { open(word) }`.

- [ ] **Step 1: Add the overlay markup to `index.html`**

Immediately after the `#quest-overlay` block closes (the `</div>` on the line after `<div id="quest-panel"></div>`'s wrapper, ~line 1315), add:

```html
    <!-- Word-detail panel: clones the #quest-overlay dialog pattern (scrim +
         .pause-panel + backdrop-tap close). Body filled by createWordDetail()
         in src/ui/word-detail-screen.js; title set to the hanzi on open. -->
    <div class="pause-overlay" id="word-overlay" role="dialog" aria-modal="true" aria-labelledby="word-dialog-title">
      <div class="pause-panel">
        <div class="quest-popup-head">
          <h3 class="pause-title" id="word-dialog-title">词</h3>
          <button class="overlay-close" id="word-popup-close" data-i18n-title="common.close" aria-label="Close">×</button>
        </div>
        <div id="word-panel"></div>
      </div>
    </div>
```

- [ ] **Step 2: Add the CSS block to `index.html`**

In the `<style>` section, near the `#quest-panel` rule (~line 802), add:

```css
  #word-panel{width:100%; max-width:320px; margin:6px auto 0; display:flex; flex-direction:column; gap:6px; text-align:center;}
  #word-panel .wd-py{color:var(--muted); font-size:16px;}
  #word-panel .wd-en{font-size:17px;}
  #word-panel .wd-th{color:var(--muted);}
  #word-panel .wd-meta{font-size:13px; color:var(--muted);}
  #word-panel .wd-papers{font-size:13px; color:var(--muted);}
  #word-panel .wd-example{margin-top:8px; padding-top:8px; border-top:1px solid var(--line, #ddd);}
  #word-panel .wd-example-label{font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em;}
  #word-panel .wd-example-cn{font-size:18px; margin-top:2px;}
  #word-panel .wd-example-tr{color:var(--muted);}
  .wd-info{position:absolute; top:8px; right:8px; width:32px; height:32px; border:none; background:transparent; font-size:20px; color:var(--muted); cursor:pointer; line-height:1;}
```

- [ ] **Step 3: Write the controller module**

```js
// src/ui/word-detail-screen.js
// DOM controller for the word-detail panel. Untested by design (DOM wiring),
// like main.js; the logic seam is buildWordDetail (src/ui/word-detail.js).
// main.js constructs this once at boot and calls open(word) from triggers.
import { buildWordDetail } from "./word-detail.js";
import { t } from "../i18n.js";

export function createWordDetail({ $, openDialog, closeDialog, examples, getLocale }) {
  const overlay = $("#word-overlay");
  const titleEl = $("#word-dialog-title");
  const panel = $("#word-panel");
  const closeBtn = $("#word-popup-close");

  function close() { closeDialog(overlay); }

  function render(vm) {
    const tierLabel = t(vm.tier === "core" ? "wd.core" : "wd.extended");
    const meta = `HSK${vm.level} · ${tierLabel}`;
    const papers = t("wd.appearsInPapers", { n: vm.examLine.n, total: vm.examLine.total });
    const ex = vm.example ? `<div class="wd-example">
        <div class="wd-example-label">${t("fc.inSentence")}</div>
        <div class="wd-example-cn">${vm.example.cn}</div>
        <div class="wd-example-tr">${vm.example.tr}</div>
      </div>` : "";
    return `<div class="wd-py">${vm.pinyin}</div>
      <div class="wd-en">${vm.english}</div>
      <div class="wd-th">${vm.thai}</div>
      <div class="wd-meta">${meta}</div>
      <div class="wd-papers">${papers}</div>${ex}`;
  }

  function open(word) {
    if (!word) return;
    const vm = buildWordDetail(word, examples, getLocale());
    titleEl.textContent = vm.hanzi;
    panel.innerHTML = render(vm);
    openDialog(overlay, closeBtn, close);
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", e => { if (e.target.id === "word-overlay") close(); });

  return { open };
}
```

- [ ] **Step 4: Build to confirm the module compiles**

Run: `cd /root/work/HSK/game && npm run build`
Expected: esbuild succeeds, no unresolved-import error (module not yet imported anywhere — that lands in Task 4, but the build of `main.js` must still pass unchanged).

- [ ] **Step 5: Commit**

```bash
git add index.html src/ui/word-detail-screen.js
git commit -m "feat(word-detail): overlay markup + createWordDetail controller"
```

---

### Task 4: Wire the two triggers in `main.js`

**Files:**
- Modify: `src/main.js` — import + construct controller (after `closeDialog` def, ~line 364); ⓘ in `renderCard()` back branch (~line 1305-1309); row click in `renderNeedsWork()` (~line 4005-4013).

**Interfaces:**
- Consumes: `createWordDetail` (Task 3); existing `$`, `openDialog`, `closeDialog`, `EXAMPLES`, `getLocale`, `speak`, `fc`, `weakWords`.

- [ ] **Step 1: Import the controller**

Add to the import block at the top of `src/main.js` (beside other `./ui/` or helper imports):

```js
import { createWordDetail } from "./ui/word-detail-screen.js";
```

- [ ] **Step 2: Construct the controller once, after `closeDialog` is defined**

Immediately after the `keydown` dialog listener block ends (line 364, before `function noteDaily`), add:

```js
const wordDetail = createWordDetail({ $, openDialog, closeDialog, examples: EXAMPLES, getLocale });
```

- [ ] **Step 3: Add the ⓘ trigger to the flashcard back**

In `renderCard()`, replace the back-branch `c.innerHTML = ...` assignment (currently starting `c.innerHTML = \`<div class="hz" style="font-size:40px">`) and the `if(ex){...}` block with:

```js
    c.innerHTML = `<button class="wd-info" id="fc-info" type="button" data-i18n-title="wd.info" aria-label="Word detail">ⓘ</button>
      <div class="hz" style="font-size:40px">${w.h}</div><div class="py">${w.p}</div>
      <div class="mean">${w.e}${th}</div>${exampleRow}<div class="hint">${t("learn.hintBack")}</div>`;
    $("#fc-info").onclick = e=>{ e.stopPropagation(); wordDetail.open(w); };
    if(ex){
      $("#fc-example-spk").onclick = e=>{ e.stopPropagation(); speak(ex.cn); };
    }
```

(`#fc-card` is `position:relative` per its existing styling, so the absolutely-positioned `.wd-info` anchors to the card corner. If not relative, add `position:relative` to the `#fc-card` CSS rule in `index.html`.)

- [ ] **Step 4: Make needs-work rows open the panel**

In `renderNeedsWork()`, inside the `for(const w of weak)` loop, after `row.className = "missrow";` set the row up as a button, and change the audio button's handler to stop propagation. Replace the loop body:

```js
    const row = document.createElement("div");
    row.className = "missrow";
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.style.cursor = "pointer";
    row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> — ${w.e}${w.t? " · "+w.t:""}</span>`;
    row.onclick = ()=> wordDetail.open(w);
    row.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); wordDetail.open(w); } };
    const sp = document.createElement("button");
    sp.className = "sp"; sp.setAttribute("aria-label", t("common.playAudio")); sp.replaceChildren(iconSvg("sound")); sp.onclick = e=>{ e.stopPropagation(); speak(w.h); };
    row.appendChild(sp);
    list.appendChild(row);
```

- [ ] **Step 5: Build**

Run: `cd /root/work/HSK/game && npm run build`
Expected: esbuild succeeds, `dist/app.js` regenerated.

- [ ] **Step 6: Manual smoke check**

Run: `cd /root/work/HSK/game && npm run serve` (then open http://localhost:8000).
Verify: flashcard back shows ⓘ → tap opens panel (hanzi as title, pinyin/EN/Thai/meta/papers/example); tapping the card body still flips; a word with empty Thai shows the English gloss in the Thai row; a word with no example omits the "In a sentence" section; Progress → needs-work row opens the panel; the row's audio button plays without opening the panel; Escape and backdrop-tap dismiss.

- [ ] **Step 7: Commit**

```bash
git add src/main.js dist/app.js
git commit -m "feat(word-detail): wire ⓘ (flashcard back) + needs-work row triggers"
```

---

### Task 5: Full suite, lint, final build

**Files:** none (verification only)

- [ ] **Step 1: Full test suite (do NOT mask exit code)**

Run: `cd /root/work/HSK/game && npm test`
Expected: all files pass, exit 0 (includes `word-detail`, `i18n` parity, precache).

- [ ] **Step 2: Lint**

Run: `cd /root/work/HSK/game && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Confirm build is current**

Run: `cd /root/work/HSK/game && npm run build && git status --porcelain`
Expected: no uncommitted `dist/app.js` diff (already committed in Task 4). If `dist/app.js` changed, commit it.

- [ ] **Step 4: Push the branch and open PR vs `development`**

```bash
git push -u origin feat/word-detail-panel
gh pr create --base development --title "feat(word-detail): tappable word-detail panel (flashcard back + needs-work)" --body "Implements docs/superpowers/specs/2026-07-19-word-detail-panel-design.md. Scoped surfaces only; NO SHELL bump (owner release gate)."
```

Expected: PR opens, CI (lint + test + build) goes green.

---

## Self-Review

**Spec coverage:** every spec section maps to a task — pure helper + fallback/tier/example rules → Task 1; i18n both-tables parity → Task 2; overlay clone + controller → Task 3; ⓘ flashcard + needs-work triggers, `BY_HANZI`/word-object-in-hand → Task 4 (word object is always in hand on both surfaces, so `BY_HANZI` resolution isn't needed here — noted, not a gap); build/test/lint/no-SHELL-bump → Task 5. ✔

**Placeholder scan:** no TBD/TODO; every code step shows full code. ✔

**Type consistency:** `buildWordDetail` returns `{hanzi,pinyin,english,thai,level,tier,examLine:{n,total},example}` in Task 1 and is consumed with those exact names in Task 3's `render`/`open`. `createWordDetail({$,openDialog,closeDialog,examples,getLocale})` defined in Task 3, constructed with matching deps in Task 4. `.open(word)` called in Task 4. ✔

**Copy note:** exam line uses "papers" to match existing `learn.hintFront`, deviating from the spec's "exams" wording — flagged for owner veto in handoff.
