# Thai/English UI Localization (i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the Lucky Cat HSK app's *interface* (menus, buttons, headings, results, quests, paywall-ready copy) into Thai and English, auto-selecting by device language with a manual toggle.

**Architecture:** A small pure `i18n.js` module owns a `{ en, th }` string table plus `t(key, params)` lookup with `{param}` interpolation and English fallback. `main.js` (the DOM layer, per repo convention) walks `data-i18n*` attributes to localize static markup and calls `t()` for dynamically-built strings. Locale persists in `localStorage` (`nbhsk.locale`); `i18n.js` itself stays storage/DOM-free so it is unit-testable like the other `src/` helpers.

**Tech Stack:** Vanilla ES modules, esbuild bundle (`npm run build`), Vitest (`npm test`).

## Global Constraints

- **Word glosses are NOT in scope.** Only UI chrome is localized; per-word Chinese/English/Thai meaning display is already handled by `scope.lang` + `pool.meaning()` and must remain untouched.
- **`i18n.js` must be pure** (no `localStorage`, no `document`) — mirrors the `shop.js`/`quests.js` convention "no DOM/localStorage; caller owns persistence." All DOM/persistence lives in `main.js`.
- **`file://` + offline safe:** no network, no fetch — the string tables are bundled.
- **localStorage keys are namespaced `nbhsk.*`** — the locale key is `nbhsk.locale`.
- **After changing `src/`, run `npm run build`** — the served/deployed app uses `dist/app.js`.
- **Every `en` key MUST have a `th` counterpart** (enforced by a test). English is the fallback when a `th` value is missing.
- **Bump `sw.js` `SHELL` cache version** when shipping (user-facing change).
- All commands run inside `game/`.

---

### Task 1: The `i18n.js` engine + string catalog

**Files:**
- Create: `game/src/i18n.js`
- Test: `game/test/i18n.test.js`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `STRINGS: { en: Record<string,string>, th: Record<string,string> }`
  - `detectLocale(nav?: {language?:string}): "en"|"th"`
  - `setLocale(l: string): void` (ignores unknown locales, keeps a valid one)
  - `getLocale(): "en"|"th"`
  - `t(key: string, params?: Record<string,string|number>): string`

- [ ] **Step 1: Write the failing test**

```js
// game/test/i18n.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { STRINGS, detectLocale, setLocale, getLocale, t } from "../src/i18n.js";

describe("i18n engine", () => {
  beforeEach(() => setLocale("en"));

  it("detects Thai from a th-* device language, English otherwise", () => {
    expect(detectLocale({ language: "th-TH" })).toBe("th");
    expect(detectLocale({ language: "TH" })).toBe("th");
    expect(detectLocale({ language: "en-US" })).toBe("en");
    expect(detectLocale({ language: "" })).toBe("en");
    expect(detectLocale({})).toBe("en");
  });

  it("returns the string for the current locale", () => {
    setLocale("th");
    expect(getLocale()).toBe("th");
    expect(t("home.learn")).toBe(STRINGS.th["home.learn"]);
  });

  it("falls back to English when a key is missing in Thai", () => {
    setLocale("th");
    // simulate a key present only in en
    STRINGS.en["__test.only_en"] = "Only EN";
    expect(t("__test.only_en")).toBe("Only EN");
    delete STRINGS.en["__test.only_en"];
  });

  it("returns the key itself when it exists nowhere (never crashes UI)", () => {
    expect(t("__does.not.exist")).toBe("__does.not.exist");
  });

  it("interpolates {params}", () => {
    STRINGS.en["__test.greet"] = "Hi {name}, you have {n} coins";
    expect(t("__test.greet", { name: "Cat", n: 5 })).toBe("Hi Cat, you have 5 coins");
    delete STRINGS.en["__test.greet"];
  });

  it("ignores an unknown locale and keeps a valid one", () => {
    setLocale("en");
    setLocale("xx");
    expect(getLocale()).toBe("en");
  });

  it("has a Thai translation for every English key", () => {
    const missing = Object.keys(STRINGS.en).filter(k => !(k in STRINGS.th));
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- i18n`
Expected: FAIL — cannot resolve `../src/i18n.js`.

- [ ] **Step 3: Write the module + full catalog**

```js
// game/src/i18n.js
"use strict";
// UI localization. Pure: no DOM, no localStorage (caller owns persistence,
// like shop.js/quests.js). String tables are bundled — file://- and offline-safe.
// Keys are dotted by screen: home.*, scope.*, learn.*, battle.*, results.*,
// quest.*, scores.*, progress.*, shop.*, howto.*, common.*.

export const STRINGS = {
  en: {
    // home
    "home.tagline": "master real-exam HSK vocabulary.",
    "home.learn": "Learn",
    "home.smart": "Smart Review",
    "home.flashcards": "Flashcards",
    "home.collection": "Collection",
    "home.best": "Best Sessions",
    "home.progress": "Progress",
    "home.howto": "How to play",
    "home.sound": "Sound effects",
    // scope
    "scope.title": "Choose your words",
    "scope.levels": "Levels",
    "scope.filters": "Filters",
    "scope.highYield": "High-yield only",
    "scope.newOnly": "New words only",
    "scope.topN": "Top-N by frequency",
    "scope.all": "All",
    "scope.meaningLang": "Meaning language",
    "scope.english": "English",
    "scope.both": "Both",
    "scope.sessionLen": "Session length",
    "scope.custom": "Custom",
    "scope.customPh": "5–500",
    "scope.endless": "Endless",
    "scope.cards": "Cards",
    "scope.wordQuest": "Word Quest · {n}",
    "scope.smartReview": "Smart Review",
    "scope.smartReviewProgress": "Smart Review · {have}/8",
    "scope.smartReviewReady": "Smart Review · {n}",
    "scope.readout": "Pool: <b>{count}</b> words · ~<b>{pct}%</b> of exam text",
    "scope.readoutNoThai": "* {n} long-tail words have no Thai yet — English shown instead.",
    // learn / flashcards
    "learn.exit": "Exit",
    "learn.stillLearning": "Still learning",
    "learn.knowIt": "Know it",
    "learn.count": "{done} done · {left} left",
    // results
    "results.roundOver": "Round over",
    "results.missed": "Words you missed",
    "results.reviewWords": "Review Words",
    "results.practiceMissed": "Practice Missed Words",
    "results.playAgain": "Play again",
    "results.home": "Home",
    "results.banked": "+{score} coins banked · total {total}",
    "results.perfect": "Perfect round! +{bonus} coin bonus",
    "results.levelUp": "Level up! Lv {lv}",
    "results.levelUpUnlocked": "Level up! Lv {lv} — unlocked: {items}",
    "results.sub": "{acc}% accuracy · {words} words · {key}",
    "results.bestTag": "Best session!",
    "results.bestPrev": "best {prev}",
    "results.questComplete": "Quest complete: {desc} +{reward} coins",
    // quests (keyed by quest id from quests.js QUEST_POOL)
    "quest.status.done": "Done",
    "quest.status.open": "Open",
    "quest.reward": "+{reward} coins",
    "quest.correct30": "Answer 30 words correctly",
    "quest.combo5": "Reach a ×5 learning streak",
    "quest.boss1": "Complete a Review Challenge",
    "quest.perfect1": "Finish a round with no misses",
    "quest.review1": "Play a Smart Review round",
    "quest.learn20": "Mark 20 flashcards as known",
    // scores / progress
    "scores.title": "Best Sessions",
    "scores.empty": "No sessions yet — complete a Word Quest.",
    "progress.title": "Progress",
    "progress.needsWork": "Needs work",
    "progress.reviewThese": "Review these",
    "progress.practiceThese": "Practice These",
    "progress.nothing": "Nothing needs work — go play!",
    // shop / collection
    "shop.title": "Collection",
    "shop.skins": "Cat skins",
    "shop.backdrops": "Quest backdrops",
    "shop.effects": "Effects",
    "shop.sounds": "Sounds",
    "shop.street": "Street decorations",
    "shop.wallet": "Wallet: <b>{coins}</b> coins",
    "shop.buy": "Buy",
    "shop.equip": "Equip",
    "shop.equipped": "Equipped",
    "shop.onStreet": "On street",
    "shop.coins": "{coins} coins",
    // howto
    "howto.title": "How to play",
    "howto.oneShot": "You get one shot per word.",
    // common
    "common.back": "← Home",
    "common.language": "Language",
  },
  th: {
    // home
    "home.tagline": "เรียนรู้คำศัพท์ HSK จากข้อสอบจริง",
    "home.learn": "เรียน",
    "home.smart": "ทบทวนอัจฉริยะ",
    "home.flashcards": "บัตรคำ",
    "home.collection": "คอลเลกชัน",
    "home.best": "สถิติดีที่สุด",
    "home.progress": "ความคืบหน้า",
    "home.howto": "วิธีเล่น",
    "home.sound": "เสียงประกอบ",
    // scope
    "scope.title": "เลือกคำศัพท์",
    "scope.levels": "ระดับ",
    "scope.filters": "ตัวกรอง",
    "scope.highYield": "เฉพาะคำออกบ่อย",
    "scope.newOnly": "เฉพาะคำใหม่",
    "scope.topN": "จัดอันดับตามความถี่",
    "scope.all": "ทั้งหมด",
    "scope.meaningLang": "ภาษาของความหมาย",
    "scope.english": "อังกฤษ",
    "scope.both": "ทั้งสอง",
    "scope.sessionLen": "จำนวนคำต่อรอบ",
    "scope.custom": "กำหนดเอง",
    "scope.customPh": "5–500",
    "scope.endless": "ไม่จำกัด",
    "scope.cards": "บัตรคำ",
    "scope.wordQuest": "เควสต์คำศัพท์ · {n}",
    "scope.smartReview": "ทบทวนอัจฉริยะ",
    "scope.smartReviewProgress": "ทบทวนอัจฉริยะ · {have}/8",
    "scope.smartReviewReady": "ทบทวนอัจฉริยะ · {n}",
    "scope.readout": "คลังคำ: <b>{count}</b> คำ · ~<b>{pct}%</b> ของข้อสอบ",
    "scope.readoutNoThai": "* มี {n} คำที่ยังไม่มีภาษาไทย — แสดงภาษาอังกฤษแทน",
    // learn / flashcards
    "learn.exit": "ออก",
    "learn.stillLearning": "ยังไม่แม่น",
    "learn.knowIt": "รู้แล้ว",
    "learn.count": "ทำแล้ว {done} · เหลือ {left}",
    // results
    "results.roundOver": "จบรอบ",
    "results.missed": "คำที่ตอบผิด",
    "results.reviewWords": "ทบทวนคำ",
    "results.practiceMissed": "ฝึกคำที่ผิด",
    "results.playAgain": "เล่นอีกครั้ง",
    "results.home": "หน้าหลัก",
    "results.banked": "+{score} เหรียญ · รวม {total}",
    "results.perfect": "รอบสมบูรณ์แบบ! โบนัส +{bonus} เหรียญ",
    "results.levelUp": "เลื่อนระดับ! Lv {lv}",
    "results.levelUpUnlocked": "เลื่อนระดับ! Lv {lv} — ปลดล็อก: {items}",
    "results.sub": "แม่นยำ {acc}% · {words} คำ · {key}",
    "results.bestTag": "สถิติใหม่!",
    "results.bestPrev": "ดีที่สุด {prev}",
    "results.questComplete": "เควสต์สำเร็จ: {desc} +{reward} เหรียญ",
    // quests
    "quest.status.done": "สำเร็จ",
    "quest.status.open": "ยังไม่เสร็จ",
    "quest.reward": "+{reward} เหรียญ",
    "quest.correct30": "ตอบถูก 30 คำ",
    "quest.combo5": "ทำคอมโบเรียนรู้ ×5",
    "quest.boss1": "ผ่านด่านทบทวน",
    "quest.perfect1": "จบรอบโดยไม่ตอบผิด",
    "quest.review1": "เล่นรอบทบทวนอัจฉริยะ",
    "quest.learn20": "ทำเครื่องหมายรู้แล้ว 20 บัตร",
    // scores / progress
    "scores.title": "สถิติดีที่สุด",
    "scores.empty": "ยังไม่มีสถิติ — เล่นเควสต์คำศัพท์ก่อน",
    "progress.title": "ความคืบหน้า",
    "progress.needsWork": "ต้องฝึกเพิ่ม",
    "progress.reviewThese": "ทบทวนคำเหล่านี้",
    "progress.practiceThese": "ฝึกคำเหล่านี้",
    "progress.nothing": "ไม่มีคำที่ต้องฝึก — ไปเล่นกันเลย!",
    // shop / collection
    "shop.title": "คอลเลกชัน",
    "shop.skins": "สกินแมว",
    "shop.backdrops": "ฉากหลัง",
    "shop.effects": "เอฟเฟกต์",
    "shop.sounds": "เสียง",
    "shop.street": "ของตกแต่งถนน",
    "shop.wallet": "กระเป๋าเงิน: <b>{coins}</b> เหรียญ",
    "shop.buy": "ซื้อ",
    "shop.equip": "ใช้งาน",
    "shop.equipped": "ใช้งานอยู่",
    "shop.onStreet": "อยู่บนถนน",
    "shop.coins": "{coins} เหรียญ",
    // howto
    "howto.title": "วิธีเล่น",
    "howto.oneShot": "ตอบได้ครั้งเดียวต่อคำ",
    // common
    "common.back": "← หน้าหลัก",
    "common.language": "ภาษา",
  },
};

let locale = "en";

export function detectLocale(nav = (typeof navigator !== "undefined" ? navigator : {})) {
  return /^th/i.test(nav && nav.language ? nav.language : "") ? "th" : "en";
}

export function setLocale(l) {
  if (STRINGS[l]) locale = l;
}

export function getLocale() {
  return locale;
}

export function t(key, params) {
  const table = STRINGS[locale] || STRINGS.en;
  let s = key in table ? table[key] : (key in STRINGS.en ? STRINGS.en[key] : key);
  if (params) for (const k in params) s = s.split(`{${k}}`).join(String(params[k]));
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- i18n`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js test/i18n.test.js
git commit -m "feat(i18n): pure Thai/English string engine with coverage test"
```

---

### Task 2: `applyStaticI18n` DOM binder + boot wiring in `main.js`

**Files:**
- Modify: `game/src/main.js` (add import near line 21; add binder + boot call)

**Interfaces:**
- Consumes: `t`, `setLocale`, `detectLocale`, `getLocale` from `./i18n.js`.
- Produces: `applyStaticI18n(root=document)` (module-local in main.js) that localizes `[data-i18n]` (textContent), `[data-i18n-title]` (title + aria-label), `[data-i18n-ph]` (placeholder), and sets `document.documentElement.lang`.

- [ ] **Step 1: Add the import**

In `game/src/main.js`, immediately after the existing icons import (line 21):

```js
import { iconSvg, setIconLabel, setIconOnly, setPill } from "./icons.js";
import { t, setLocale, getLocale, detectLocale } from "./i18n.js";
```

- [ ] **Step 2: Initialize locale early**

In `main.js`, find the settings/locale bootstrap area near line 32 (`let settings = ...`). Add right after it:

```js
// UI language: persisted choice wins, else device language. i18n.js is pure,
// so persistence lives here (nbhsk.locale), like every other nbhsk.* key.
setLocale(store.get("locale", detectLocale()));
```

- [ ] **Step 3: Add the DOM binder**

In `main.js`, add this helper just above the `/* ===== screens ===== */` block (near line 143):

```js
/* ============================== i18n DOM binding ============================== */
// Localizes any static markup annotated with data-i18n* attributes. Dynamic
// strings (built in JS) call t() directly at render time.
function applyStaticI18n(root = document){
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const v = t(el.getAttribute("data-i18n-title"));
    el.title = v; el.setAttribute("aria-label", v);
  });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  document.documentElement.lang = getLocale();
}
```

- [ ] **Step 4: Call it on boot**

In `main.js`, in the boot block near line 1355 (right after `pool = buildPool(...)`), add:

```js
applyStaticI18n();
```

- [ ] **Step 5: Build and run the full suite (regression gate — no visible change yet)**

Run: `npm run build && npm test`
Expected: build succeeds; all existing tests + the new i18n tests PASS. (No markup is annotated yet, so `applyStaticI18n()` is a no-op — this task only wires the machinery.)

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(i18n): wire locale init + applyStaticI18n binder into main.js"
```

---

### Task 3: Annotate static markup in `index.html`

**Files:**
- Modify: `game/index.html` (add `data-i18n*` attributes to the text nodes below)

**Interfaces:**
- Consumes: `applyStaticI18n` (Task 2) reads these attributes; keys must match `STRINGS` (Task 1).
- Produces: fully localizable static UI.

For each row, add the attribute to the element that owns the visible text. For
icon+text buttons the text lives in the inner `<span>`, so annotate that span.

**Annotation map (line numbers approximate — match on the text):**

| Element / text | Attribute to add |
|---|---|
| `<span>Learn</span>` (line 301) | `data-i18n="home.learn"` |
| `<span>Smart Review</span>` (302) — also updated dynamically, see Task 5 | `data-i18n="home.smart"` |
| `data-go="scope-learn"` button (312) | `data-i18n-title="home.flashcards"` |
| `data-go="shop"` button (313) | `data-i18n-title="home.collection"` |
| `data-go="scores"` button (314) | `data-i18n-title="home.best"` |
| `data-go="progress"` button (315) | `data-i18n-title="home.progress"` |
| `data-go="howto"` button (316) | `data-i18n-title="home.howto"` |
| `id="home-sound"` button (317) | `data-i18n-title="home.sound"` |
| `<h1>` tagline sibling `master real-exam HSK vocabulary.` (299) | `data-i18n="home.tagline"` |
| `<h2>Choose your words</h2>` (326) | `data-i18n="scope.title"` |
| `<div class="sect">Levels</div>` (327) | `data-i18n="scope.levels"` |
| `<div class="sect">Filters</div>` (334) | `data-i18n="scope.filters"` |
| `id="f-core"` `High-yield only` (336) | `data-i18n="scope.highYield"` |
| `id="f-new"` `New words only` (337) | `data-i18n="scope.newOnly"` |
| `<div class="sect">Top-N by frequency</div>` (339) | `data-i18n="scope.topN"` |
| `data-n="0"` `All` (344) | `data-i18n="scope.all"` |
| `<div class="sect">Meaning language</div>` (346) | `data-i18n="scope.meaningLang"` |
| `data-lang="en"` `English` (349) | `data-i18n="scope.english"` |
| `data-lang="both"` `Both` (350) | `data-i18n="scope.both"` |
| `<div class="sect">Session length</div>` (352) | `data-i18n="scope.sessionLen"` |
| `<span>Custom</span>` (357) | `data-i18n="scope.custom"` |
| `id="len-custom"` input (358) | `data-i18n-ph="scope.customPh"` |
| `<span>Endless</span>` (363) | `data-i18n="scope.endless"` |
| `<span>Cards</span>` (364) | `data-i18n="scope.cards"` |
| `data-go="home"` `Exit` (371) | `data-i18n="learn.exit"` |
| `<span>Still learning</span>` (376) | `data-i18n="learn.stillLearning"` |
| `<span>Know it</span>` (378) | `data-i18n="learn.knowIt"` |
| `<h2>Round over</h2>` (398) | `data-i18n="results.roundOver"` |
| `id="r-misshead"` `Words you missed` (405) | `data-i18n="results.missed"` |
| `<span>Review Words</span>` (408) | `data-i18n="results.reviewWords"` |
| `<span>Practice Missed Words</span>` (409) | `data-i18n="results.practiceMissed"` |
| `<span>Play again</span>` (410) | `data-i18n="results.playAgain"` |
| `data-go="home"` `Home` (412) | `data-i18n="results.home"` |
| `<h2>Best Sessions</h2>` (418) | `data-i18n="scores.title"` |
| `<h2>Progress</h2>` (425) | `data-i18n="progress.title"` |
| `<div class="sect">Needs work</div>` (428) | `data-i18n="progress.needsWork"` |
| `<span>Review these</span>` (431) | `data-i18n="progress.reviewThese"` |
| `<span>Practice These</span>` (432) | `data-i18n="progress.practiceThese"` |
| `<h2>Collection</h2>` (~439) | `data-i18n="shop.title"` |
| `Cat skins` (441) | `data-i18n="shop.skins"` |
| `Quest backdrops` (443) | `data-i18n="shop.backdrops"` |
| `Effects` (445) | `data-i18n="shop.effects"` |
| `Sounds` (447) | `data-i18n="shop.sounds"` |
| `Street decorations` (449) | `data-i18n="shop.street"` |
| `How to play` heading (456) | `data-i18n="howto.title"` |
| `You get one shot per word.` (461) | `data-i18n="howto.oneShot"` |
| Each `data-go="home"` `← Home` back button (325, 417, 424) | `data-i18n="common.back"` |

Example edit (line 301), before → after:

```html
<button class="big primary" data-go="scope"><span class="icon-text"><svg class="asset-icon"><use href="assets/ui-icons.svg#learn"></use></svg><span data-i18n="home.learn">Learn</span></span></button>
```

```html
<button class="icon-btn" data-go="shop" title="Collection" data-i18n-title="home.collection" aria-label="Collection"><svg class="asset-icon"><use href="assets/ui-icons.svg#collection"></use></svg></button>
```

> Note: `HSK1–3`, `HSK4–6`, `HSK1–6`, numeric chips (`100/300/500`, `20/40/100`), and `ไทย` are locale-neutral — **do not annotate** them.

- [ ] **Step 1: Add every attribute in the map above.**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verification (English + Thai)**

Run: `npm run serve`, open `http://localhost:8000`.
- English device: UI reads as today.
- Force Thai without a device change — in DevTools console:

```js
localStorage.setItem("nbhsk.locale", '"th"'); location.reload();
```

Expected: home tagline, Learn/Smart Review, Choose-your-words, section headings, results/shop/progress headings all render in Thai. Numeric chips and `ไทย` unchanged. Then reset:

```js
localStorage.removeItem("nbhsk.locale"); location.reload();
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(i18n): annotate static markup with data-i18n attributes"
```

---

### Task 4: Language toggle + persistence

**Files:**
- Modify: `game/index.html` (add a toggle in the scope screen, under Meaning language or in a Settings row)
- Modify: `game/src/main.js` (render + wire the toggle)

**Interfaces:**
- Consumes: `t`, `setLocale`, `getLocale` (already imported Task 2), `store` (existing in main.js).
- Produces: a `#ui-lang-chips` control; `setUiLocale(l)` persists to `nbhsk.locale` and re-applies i18n live.

- [ ] **Step 1: Add the toggle markup**

In `index.html`, add this block just after the Meaning-language chips group (after line 350's container closes), so it sits on the scope screen:

```html
<div class="sect" data-i18n="common.language">Language</div>
<div class="chips" id="ui-lang-chips">
  <button class="chip" data-uilang="en">English</button>
  <button class="chip" data-uilang="th">ไทย</button>
</div>
```

- [ ] **Step 2: Wire it in `main.js`**

Add near the other scope chip handlers (after line 206, the `#lang-chips` handler):

```js
function setUiLocale(l){
  setLocale(l);
  store.set("locale", getLocale());
  applyStaticI18n();
  syncUiLangChips();
  renderScope();   // refresh dynamic scope labels (Word Quest · N, readout, Smart Review)
}
function syncUiLangChips(){
  document.querySelectorAll("#ui-lang-chips .chip").forEach(c => c.classList.toggle("on", c.dataset.uilang === getLocale()));
}
document.querySelectorAll("#ui-lang-chips .chip").forEach(c => c.onclick = () => setUiLocale(c.dataset.uilang));
```

- [ ] **Step 3: Reflect current locale on boot**

In the boot block (after the `applyStaticI18n();` added in Task 2), add:

```js
syncUiLangChips();
```

- [ ] **Step 4: Build + manual test**

Run: `npm run build && npm run serve`
Open `http://localhost:8000`, go to **Learn → scope screen**, tap **ไทย** — the whole static UI flips to Thai instantly and the highlighted chip moves; tap **English** — it flips back. Reload — the choice persists.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "feat(i18n): in-app language toggle with persistence + live re-render"
```

---

### Task 5: Migrate dynamic strings in `main.js`

Replace hard-coded English built at render time with `t(key, params)`. Each
edit below is exact. HTML-bearing strings (`scope.readout`, `shop.wallet`) keep
their `<b>` tags — `t()` returns the template and we still assign via `innerHTML`
exactly where the code already does.

**Files:**
- Modify: `game/src/main.js`

**Interfaces:**
- Consumes: `t` (imported Task 2), keys from `STRINGS` (Task 1).
- Produces: no new exports; render output is localized.

- [ ] **Step 1: Scope readout + Word Quest label (main.js ~lines 184–197)**

Replace the `$("#readout").innerHTML = ...` assignment and the `setIconLabel($("#go-battle"), ...)` line:

```js
$("#readout").innerHTML =
  t("scope.readout", { count: pool.length.toLocaleString(), pct: coveragePct(pool, D.manifest, scope.levels) })
  + (scope.lang !== "en" && noThai ? `<div class="warn">${t("scope.readoutNoThai", { n: noThai.toLocaleString() })}</div>` : "");
```

and (near line 197):

```js
setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: len }));
```

- [ ] **Step 2: Smart Review button (main.js ~lines 120–122 and 214)**

In `updateSmartBtn()` replace the `setIconLabel($("#go-smart"), ...)` call:

```js
setIconLabel(btn, "target", !deck.length ? t("scope.smartReview")
  : deck.length < 8 ? t("scope.smartReviewProgress", { have: deck.length })
  : t("scope.smartReviewReady", { n: deck.length }));
```

In the `#len-custom` input handler (near line 214), replace:

```js
setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: scope.sessionLen }));
```

- [ ] **Step 3: Flashcard counter (main.js ~line 238)**

```js
$("#fc-count").textContent = t("learn.count", { done: fc.done, left: fc.deck.length - fc.i });
```

- [ ] **Step 4: Quest panel rows (main.js `renderQuests` ~lines 104–112)**

```js
for(const q of questStatus(questState, todayStr())){
  const row = document.createElement("div");
  row.className = "quest-row"+(q.done? " done":"");
  row.innerHTML = `<span class="qi">${q.done? t("quest.status.done") : t("quest.status.open")}</span>
    <span class="qd">${t("quest."+q.id)}</span>
    <span class="qp">${q.progress}/${q.target}</span>
    <span class="qr">${t("quest.reward", { reward: q.reward })}</span>`;
  panel.appendChild(row);
}
```

- [ ] **Step 5: Results screen (main.js `endBattle` ~lines 866–896)**

```js
$("#r-wallet").textContent = t("results.banked", { score: B.score, total: wallet.toLocaleString() });
```
```js
if(isPerfect){ perfectEl.textContent = t("results.perfect", { bonus }); perfectEl.style.display = "block"; }
```
```js
luEl.textContent = hit.length
  ? t("results.levelUpUnlocked", { lv: to, items: hit.map(m=>m.name).join(", ") })
  : t("results.levelUp", { lv: to });
```
```js
line.textContent = t("results.questComplete", { desc: t("quest."+q.id), reward: q.reward });
```
```js
$("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key })
  + (isBest ? ` · <b style="color:var(--gold)">${t("results.bestTag")}</b>` : ` · ${t("results.bestPrev", { prev })}`);
```

> Note: quest toasts now key off `q.id`; ensure the toast loop passes the quest object (it does — `questToasts` holds the quest objects from `quests.js`).

- [ ] **Step 6: Scores empty + shop wallet/buttons + progress empty**

`renderScores` (~line 924):
```js
box.innerHTML = keys.length ? "" : `<div class="scorerow" style="color:var(--muted)">${t("scores.empty")}</div>`;
```
`renderShop` wallet (~line 936):
```js
$("#shop-wallet").innerHTML = t("shop.wallet", { coins: wallet.toLocaleString() });
```
Shop button labels (~lines 961–983): replace the literals `"On street"`, `"Buy"`, `"Equipped"`, `"Equip"` with `t("shop.onStreet")`, `t("shop.buy")`, `t("shop.equipped")`, `t("shop.equip")` respectively.
`renderNeedsWork` empty (~line 1333):
```js
list.innerHTML = `<div class="missrow" style="color:var(--muted)">${t("progress.nothing")}</div>`;
```

- [ ] **Step 7: Build + full manual sweep**

Run: `npm run build && npm run serve`
In Thai locale, play one Word Quest end-to-end and open Shop, Progress, Best Sessions, Flashcards. Verify: scope readout, Word Quest·N, Smart Review label, flashcard counter, quest rows, results banked/perfect/level-up/accuracy/best, shop wallet + buy/equip buttons, empty states — all Thai. Switch to English mid-session via the toggle; everything re-renders English on next screen paint.

- [ ] **Step 8: Run the test suite**

Run: `npm test`
Expected: all PASS (dynamic-string edits are covered indirectly; `i18n.test.js` guards catalog completeness).

- [ ] **Step 9: Commit**

```bash
git add src/main.js
git commit -m "feat(i18n): localize dynamic strings (scope, quests, results, shop, progress)"
```

---

### Task 6: Ship prep — SHELL bump + native-review note

**Files:**
- Modify: `game/sw.js` (bump `SHELL` cache version)
- Create: `game/docs/i18n-translation-review.md` (translator checklist)

**Interfaces:** none.

- [ ] **Step 1: Bump the SHELL cache version**

In `game/sw.js`, find the `SHELL` const (e.g. `nbhsk-shell-vN`) and increment N by one so installed PWAs fetch the localized shell.

- [ ] **Step 2: Add a translator review checklist**

```markdown
<!-- game/docs/i18n-translation-review.md -->
# Thai UI translation review

The `th` strings in `src/i18n.js` are developer-provided and MUST be reviewed by a
native Thai speaker before store launch. Focus areas:
- Natural phrasing for buttons vs. sentences (e.g. เควสต์คำศัพท์, ทบทวนอัจฉริยะ).
- Consistency of "เหรียญ" (coins) and level/quest terminology.
- Interpolation reads correctly with real numbers ({n}, {score}, {acc}).
- No clipping in narrow buttons on small screens.

Update `STRINGS.th` in `src/i18n.js`; the `i18n.test.js` coverage test guarantees
no key is dropped. Run `npm run build` after edits.
```

- [ ] **Step 3: Final gate**

Run: `npm run build && npm test`
Expected: build + all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add sw.js docs/i18n-translation-review.md
git commit -m "chore(i18n): bump SHELL cache + add Thai translation review checklist"
```

---

## Self-Review

**Spec coverage** (PRD §10 Localization): engine ✓ (Task 1), device auto-select ✓ (`detectLocale`, Task 2), manual toggle ✓ (Task 4), all UI chrome — menus/buttons/quests/results/paywall-ready copy ✓ (Tasks 3+5), word glosses explicitly out of scope ✓ (Global Constraints), Chinese UI deferred ✓ (not included). Paywall/Supporter copy keys will be added by the Ads/IAP plans that introduce those screens — noted, not a gap here.

**Placeholder scan:** every code step shows complete code; the annotation map lists exact keys; Thai strings are provided (with a native-review task, which is a content-QA step, not a code placeholder).

**Type consistency:** `t/setLocale/getLocale/detectLocale/STRINGS` names are identical across Tasks 1–5; `applyStaticI18n`, `setUiLocale`, `syncUiLangChips` are used consistently; quest keys are `quest.<id>` matching `QUEST_POOL` ids in `quests.js` (`correct30`, `combo5`, `boss1`, `perfect1`, `review1`, `learn20`).
