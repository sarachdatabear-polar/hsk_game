# PRD v5 Phase 4 — B1 Kind Streak + B2 Sticker Album Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single missed day never zeroes an established streak (one automatic rest day per Mon–Sun week, calm framing, never sold), and mastering word-sets fills an earn-only sticker album (per-scope + per-level-milestone + event stickers) with an album screen under Progress and a one-per-session toast on results.

**Architecture:** B1 extends the existing pure `src/daily.js` (new fields `restWeek`/`restDay` on the daily object — additive, so the `Object.assign(defaultDaily(), stored)` load in main.js migrates old saves for free). B2 is a new pure module `src/stickers.js` (sticker defs derived from level word-counts, mastery-fact computation, award evaluation with a persistent toast queue under `nbhsk.stickers`) plus an `#s-album` screen wired as a Progress sub-screen (nav.js gains a progress-subscreen concept). Sticker art comes later from the A2 pipeline — tiles render with existing `ui-icons.svg` symbols until then (repo's fallback-first art contract).

**Tech Stack:** Vanilla JS + inline CSS, vitest. No new npm dependencies.

**Source spec:** `docs/prd/PRD-v5-visual-retention.md` §5 B1 + B2 (rules are verbatim requirements).

## Global Constraints

- Pure logic in vitest-tested modules; `main.js` stays wiring-only; **no new npm dependencies**; `file://` keeps working.
- `localStorage` keys namespaced `nbhsk.*`; **migrations must not destroy existing saves** — old `nbhsk.daily` objects (no rest fields) must keep working and must NOT retroactively break an existing streak; new key `nbhsk.stickers`.
- B1 rules (implement exactly): rest day requires current streak **≥ 3**; **one automatic rest day per calendar week (Mon–Sun, device-local time)**; exactly one missed day + rest available → streak does not break, missed day marked rest, rest consumed, **a rest day never increments the streak**; two consecutive missed days, or a second miss in the same week, break as before; streaks < 3 behave as today; UI copy exactly: `🍵 Rest day used — your {n}-day streak is safe.` — **never guilt language, never a purchasable repair**.
- B2: stickers are **never purchasable** — earn-only, separate from the coin shop; toast **one per session max, queue the rest**; a sticker earned mid-session must survive reload (persist immediately).
- Every new user-facing string gets BOTH `en` and `th` i18n entries (test-enforced parity); all new CSS via `--lc-*`/semantic tokens (hex lint active).
- All existing tests stay green except the one `defaultDaily()` shape assertion this plan explicitly updates; `npm run build` after `src/` changes; `sw.js` SHELL bump exactly once, final task (v26 → v27).
- Branch `feat/v5-phase4-kind-streak-stickers` off `development`; commits `feat(streak):` / `feat(stickers):` / `test:`.

## Verified code facts (do not re-derive)

- `src/daily.js` (50 lines): `GOAL = 20`; `defaultDaily()` → `{ last, streak, today:{date,resolved} }`; `noteActivity(daily, dateStr, count)` pure, increments streak on goal-cross when `isYesterday(last, dateStr)` else resets to 1; `streakInfo(daily, dateStr)` derives `{streak, todayResolved, goal, goalMet}` with `chainAlive = last===dateStr || isYesterday(last,dateStr)`. `isYesterday` parses `"YYYY-MM-DD"+"T00:00:00Z"` (UTC-safe convention — reuse it).
- `test/daily.test.js:9` asserts the exact `defaultDaily()` shape — MUST be updated when the shape grows. The existing gap test uses a streak of 2, so kind-streak (≥3) does not change its outcome.
- Date facts for tests: **2026-07-04 is a Saturday**, so 2026-07-06 is a Monday (week boundary Mon–Sun).
- main.js: `todayStr()` at :103 (local date); `let daily = Object.assign(defaultDaily(), store.get("daily", {}));` at :108 (migration point — additive defaults merge automatically); `updateStreakChip()` at :113 fills `#home-streak` children; `noteDaily(count)` at :125.
- Streak card markup in index.html: `#home-streak` contains `.streak-row` then `<div class="mbar streak-bar"><i .../></div>`.
- Level word counts (from `data/words.js`): HSK1 205, HSK2 479, HSK3 1356, HSK4 3362, HSK5 6570, HSK6 10055. So Top-100 exists for all levels; Top-300 for HSK2+; Top-500 for HSK3+.
- `src/mastery.js`: `isMastered(store, hanzi)` = 3-run streak; `levelMastery(store, words)` gives `{seen, mastered, pct}`. Words carry `f` (frequency) and `h`.
- `src/pool.js` sorts pools by `f` desc — "Top-N of a level" = first N by `f` desc of that level's words.
- `src/nav.js`: `TABS`, `MORE_SUBSCREENS = ["scores","howto"]`, `NAV_VISIBLE = new Set([...TABS, ...MORE_SUBSCREENS, "shop"])`, `activeTabFor`. `test/nav.test.js` asserts these — extend both together.
- The generic `[data-go]` click listener in main.js has per-target branches (`scope`, `scores`, `progress`, `shop`, …) — add an `album` branch there. `data-go="progress"` already re-renders Progress (works as the album's back target).
- Results screen: `#r-sticker-slot` (display:none) exists below `#r-intro-hint` (Phase 3). `endBattle(quit)`: the non-quit path ends with the intro-hint block then `show("results")` — award evaluation goes between them. The quit path returns early (no results → no evaluation, queue just waits).
- Boss final kill executes the correct branch of `answer()` with `boss === true` (near `if(boss) noteAnswer(z.w.h, true);`). `startBattle()` has a reset block containing `B.hitFlash = null; B.plaqueHitAt = 0;`.
- `D = window.HSK_DATA` at main.js:30; `D.levels` = `{"1":[words],...}`. `masteryStore` at :54. i18n `t(key, params)` interpolates literal `{name}` tokens.
- `ui-icons.svg` symbols available (used in markup today): `paw`, `star`, `streak`, `target`, `cards`.
- Suite: 510 tests / 31 files green. SHELL `nbhsk-shell-v26`.

---

### Task 1: B1 pure logic — rest days in `src/daily.js` (TDD)

**Files:**
- Modify: `src/daily.js`
- Modify: `test/daily.test.js` (update the one shape assertion + add the PRD case suite)

**Interfaces:**
- Produces: `addDays(dateStr, n): string`, `weekStart(dateStr): string` (Monday of the Mon–Sun week), `defaultDaily()` now `{ last, streak, today, restWeek:"", restDay:"" }`; `noteActivity` consumes a rest day per the B1 rules; `streakInfo` gains `restNote: boolean` (true on the return day after a consumed rest) and treats a coverable 2-day gap as chain-alive.

- [ ] **Step 1: Create the branch**

```bash
git checkout development && git pull --ff-only && git checkout -b feat/v5-phase4-kind-streak-stickers
```

- [ ] **Step 2: Update the shape assertion + write the failing PRD case suite**

In `test/daily.test.js`, change line 9's expectation:

```js
    expect(defaultDaily()).toEqual({ last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" });
```

Update the import line to also pull the new helpers:

```js
import { GOAL, defaultDaily, noteActivity, streakInfo, isYesterday, addDays, weekStart } from "../src/daily.js";
```

Append this suite at the end of the file (dates anchored to the verified fact that 2026-07-06 is a Monday):

```js
describe("daily: kind streak (B1 rest days)", () => {
  // helper: complete the goal on each date in order
  const run = dates => dates.reduce((d, ds) => noteActivity(d, ds, GOAL), defaultDaily());

  it("addDays / weekStart (Mon–Sun weeks)", () => {
    expect(addDays("2026-07-04", 1)).toBe("2026-07-05");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(weekStart("2026-07-06")).toBe("2026-07-06"); // Monday maps to itself
    expect(weekStart("2026-07-07")).toBe("2026-07-06");
    expect(weekStart("2026-07-12")).toBe("2026-07-06"); // Sunday belongs to the Monday week
    expect(weekStart("2026-07-05")).toBe("2026-06-29"); // the Sunday BEFORE that Monday
  });

  it("miss-1-covered: one missed day with streak ≥3 consumes the rest day, streak survives", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);   // streak 3
    d = noteActivity(d, "2026-07-08", GOAL);                   // missed 07-07
    expect(d.streak).toBe(4);                                  // ...never increments FOR the rest day
    expect(d.restDay).toBe("2026-07-07");
    expect(d.restWeek).toBe("2026-07-06");
  });

  it("rest-day-never-increments: covered gap yields +1 (the active day), not +2", () => {
    let d = run(["2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06"]); // streak 4
    d = noteActivity(d, "2026-07-08", GOAL);                               // miss 07-07, covered
    expect(d.streak).toBe(5);
  });

  it("miss-2-breaks: two consecutive missed days always break", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);   // streak 3
    d = noteActivity(d, "2026-07-09", GOAL);                   // missed 07-07 AND 07-08
    expect(d.streak).toBe(1);
  });

  it("two-misses-same-week-breaks: the weekly rest day is spent once", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);   // Mon–Wed, streak 3
    d = noteActivity(d, "2026-07-10", GOAL);                   // miss Thu 07-09 → covered
    expect(d.streak).toBe(4);
    d = noteActivity(d, "2026-07-12", GOAL);                   // miss Sat 07-11 → SAME Mon–Sun week
    expect(d.streak).toBe(1);                                  // rest already used → break
  });

  it("week-boundary reset: a new Mon–Sun week grants a fresh rest day", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);   // streak 3
    d = noteActivity(d, "2026-07-10", GOAL);                   // miss Thu 07-09 → covered (week of 07-06)
    d = noteActivity(d, "2026-07-11", GOAL);
    d = noteActivity(d, "2026-07-12", GOAL);                   // streak 6 by Sunday
    d = noteActivity(d, "2026-07-14", GOAL);                   // miss Mon 07-13 → NEW week → covered
    expect(d.streak).toBe(7);
    expect(d.restWeek).toBe("2026-07-13");
  });

  it("streak<3 uncovered: nothing to protect yet — behaves as before", () => {
    let d = run(["2026-07-04", "2026-07-05"]);                 // streak 2
    d = noteActivity(d, "2026-07-07", GOAL);                   // miss 07-06
    expect(d.streak).toBe(1);
  });

  it("migration: an old-shape save (no rest fields) works and never retro-breaks", () => {
    const old = { last: "2026-07-05", streak: 6, today: { date: "2026-07-05", resolved: 25 } };
    // yesterday-chain intact exactly as before
    expect(streakInfo(old, "2026-07-06").streak).toBe(6);
    // next-day activity continues the streak and grows the new fields
    const d = noteActivity(old, "2026-07-06", GOAL);
    expect(d.streak).toBe(7);
    expect(d.restWeek).toBe("");
    expect(d.restDay).toBe("");
    // and a 2-day gap on an old save with streak ≥3 is now coverable, not broken
    expect(streakInfo(old, "2026-07-07").streak).toBe(6);
  });

  it("streakInfo: coverable gap shows the streak as alive; restNote fires on the return day", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);
    // 07-08, before playing: yesterday (07-07) is coverable → chain alive
    expect(streakInfo(d, "2026-07-08").streak).toBe(3);
    expect(streakInfo(d, "2026-07-08").restNote).toBe(false);  // not consumed yet
    d = noteActivity(d, "2026-07-08", GOAL);                   // consume
    const info = streakInfo(d, "2026-07-08");
    expect(info.streak).toBe(4);
    expect(info.restNote).toBe(true);                          // "🍵 Rest day used…" day
    expect(streakInfo(d, "2026-07-09").restNote).toBe(false);  // gone the next day
  });

  it("streakInfo: uncoverable gap (rest spent this week) reads 0", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);
    d = noteActivity(d, "2026-07-10", GOAL);                   // rest spent on Thu 07-09
    expect(streakInfo(d, "2026-07-13").streak).toBe(0);        // missed Sat 07-12... wait gap>2 anyway
    // precise same-week double-miss read: last=07-10, check 07-12 (missed 07-11, same week, rest spent)
    expect(streakInfo(d, "2026-07-12").streak).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/daily.test.js`
Expected: FAIL — `addDays`/`weekStart` not exported; shape assertion fails; new cases fail.

- [ ] **Step 4: Implement in `src/daily.js`**

Replace `defaultDaily` with:

```js
export function defaultDaily() {
  return { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" };
}
```

Add after `isYesterday`:

```js
// dateStr + n days, same "YYYY-MM-DD" convention (UTC-safe like isYesterday).
export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d)) return "";
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Monday of the Mon–Sun calendar week containing dateStr (B1: one automatic
// rest day per calendar week, device-local — dateStr is already local).
export function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d)) return "";
  const dow = (d.getUTCDay() + 6) % 7;   // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
```

Replace `noteActivity` with:

```js
// Returns a NEW daily object with `count` added to today's resolved total.
// Never mutates `daily`. Streak increments (once per day) when today's total
// first reaches GOAL. Kind streak (B1): with a streak ≥3, exactly one missed
// day is absorbed by the week's automatic rest day (Mon–Sun); the rest day
// itself never increments the streak — only the active return day does.
export function noteActivity(daily, dateStr, count) {
  const before = daily.today.date === dateStr ? daily.today.resolved : 0;
  const resolved = before + count;
  const today = { date: dateStr, resolved };
  let { last, streak } = daily;
  let restWeek = daily.restWeek || "";
  let restDay = daily.restDay || "";
  const crossedNow = before < GOAL && resolved >= GOAL;
  if (crossedNow && last !== dateStr) {
    if (isYesterday(last, dateStr)) {
      streak += 1;
    } else {
      const missed = last ? addDays(last, 1) : "";
      const covered = streak >= 3 && missed !== "" &&
        addDays(last, 2) === dateStr &&            // exactly one missed day
        weekStart(missed) !== restWeek;             // this week's rest unspent
      if (covered) {
        restWeek = weekStart(missed);
        restDay = missed;
        streak += 1;                                // the return day counts; the rest day never does
      } else {
        streak = 1;
      }
    }
    last = dateStr;
  }
  return { last, streak, today, restWeek, restDay };
}
```

Replace `streakInfo` with:

```js
// {streak, todayResolved, goal, goalMet, restNote} for display. The chain
// also reads alive across a single missed day that the week's rest day can
// (or did) cover — so the player never sees a scary 0 before the rest day is
// even consumed. restNote marks the calm "🍵 rest day used" return day.
export function streakInfo(daily, dateStr) {
  const todayResolved = daily.today.date === dateStr ? daily.today.resolved : 0;
  const restWeek = daily.restWeek || "";
  const restDay = daily.restDay || "";
  const missed = daily.last ? addDays(daily.last, 1) : "";
  const coverableGap = daily.last !== "" && addDays(daily.last, 2) === dateStr &&
    daily.streak >= 3 && (restDay === missed || weekStart(missed) !== restWeek);
  const chainAlive = daily.last === dateStr || isYesterday(daily.last, dateStr) || coverableGap;
  return {
    streak: chainAlive ? daily.streak : 0,
    todayResolved,
    goal: GOAL,
    goalMet: todayResolved >= GOAL,
    restNote: restDay !== "" && isYesterday(restDay, dateStr),
  };
}
```

- [ ] **Step 5: Run to verify pass, then the full suite**

Run: `npx vitest run test/daily.test.js` → PASS.
Run: `npm test` → all green (existing suites unaffected; count grows by the new cases).

- [ ] **Step 6: Commit**

```bash
git add src/daily.js test/daily.test.js
git commit -m "feat(streak): kind streak — weekly rest day absorbs one missed day (B1)"
```

---

### Task 2: B1 wiring — rest-day note on the streak card

**Files:**
- Modify: `index.html` (streak-card markup + CSS)
- Modify: `src/i18n.js` (1 key × 2 locales)
- Modify: `src/main.js` (`updateStreakChip`)

**Interfaces:**
- Consumes: `streakInfo(...).restNote` from Task 1.

- [ ] **Step 1: i18n key (both tables)**

`en` (next to the other `home.*` keys):

```js
    "streak.restUsed": "🍵 Rest day used — your {n}-day streak is safe.",
```

`th` (same position):

```js
    "streak.restUsed": "🍵 ใช้วันพักแล้ว — สตรีค {n} วันของคุณยังปลอดภัย",
```

- [ ] **Step 2: markup — inside `#home-streak`, after the `.mbar.streak-bar` line**

Replace:

```html
      <div class="mbar streak-bar"><i style="width:0%"></i></div>
    </div>
```

with:

```html
      <div class="mbar streak-bar"><i style="width:0%"></i></div>
      <div class="streak-note" id="streak-note" hidden></div>
    </div>
```

(The `#home-streak` card is the only element with a `.streak-bar` child — the anchor is unique.)

- [ ] **Step 3: CSS — after the `.streak-bar i{...}` rule**

```css
  /* B1: calm rest-day note on the return day — informational, never guilt */
  .streak-note{margin-top:6px; font-size:12px; color:var(--lc-brown);}
```

- [ ] **Step 4: main.js — extend `updateStreakChip()`**

Replace:

```js
  if(bar) bar.style.width = Math.min(100, Math.round(100*info.todayResolved/info.goal)) + "%";
  el.classList.toggle("goal-met", info.goalMet);
```

with:

```js
  if(bar) bar.style.width = Math.min(100, Math.round(100*info.todayResolved/info.goal)) + "%";
  const note = el.querySelector("#streak-note");
  if(note){
    note.hidden = !info.restNote;
    if(info.restNote) note.textContent = t("streak.restUsed", { n: info.streak });
  }
  el.classList.toggle("goal-met", info.goalMet);
```

- [ ] **Step 5: Build, test, commit**

```bash
npm run build && npm test
```
Expected: all green (i18n parity holds).

```bash
git add index.html src/i18n.js src/main.js dist/app.js
git commit -m "feat(streak): rest-day note on the streak card (B1)"
```

---

### Task 3: B2 pure logic — `src/stickers.js` (TDD)

**Files:**
- Create: `src/stickers.js`
- Test: `test/stickers.test.js`

**Interfaces:**
- Consumes: `isMastered` from `src/mastery.js`.
- Produces (exact API later tasks use):
  - `defaultStickers(): { earned:{}, queue:[] }` (earned: id → "YYYY-MM-DD")
  - `TOP_NS = [100,300,500]`, `MILESTONE_PCTS = [25,50,75,100]`, `EVENT_STICKERS = ["welcome","first-boss","streak-7","streak-30"]`
  - `scopeNodes(levelCounts): [{id:"HSK{lv}·top{N}"|"HSK{lv}·all", lv, topN}]` (topN node only when the level has MORE than N words; full level always; shared with B3's journey later)
  - `stickerDefs(levelCounts): [{id, kind:"scope"|"milestone"|"event", lv?, topN?, pct?, event?}]` (scope defs only for topN nodes — the full level awards through the 100% milestone, no duplicate)
  - `scopeFacts(levelsData, mastery): { levelCounts, scopePcts, levelPcts }` (floored percentages; Top-N = first N by `f` desc)
  - `evaluateAwards(state, defs, facts, dateStr): { earned, queue }` (facts also carries `sessionDone`, `bossDefeated`, `streak`; never double-awards; new ids appended to queue)
  - `popToast(state): { state, id|null }` (one per call — one per results screen)

- [ ] **Step 1: Write the failing tests**

Create `test/stickers.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  defaultStickers, scopeNodes, stickerDefs, scopeFacts, evaluateAwards, popToast,
  TOP_NS, MILESTONE_PCTS, EVENT_STICKERS,
} from "../src/stickers.js";

// tiny fixture level: 4 words so Top-N nodes vanish (4 ≤ 100) and pcts are easy
const W = (h, f) => ({ h, f });
const LEVELS = { "1": [W("一", 40), W("二", 30), W("三", 20), W("四", 10)] };
const mastered = hs => Object.fromEntries(hs.map(h => [h, { s: 3, k: 3, r: 3 }]));

describe("scopeNodes / stickerDefs", () => {
  it("emits topN nodes only when the level is bigger than N, plus the full level", () => {
    const nodes = scopeNodes({ 1: 205, 2: 479, 3: 1356 });
    expect(nodes.filter(n => n.lv === 1).map(n => n.id)).toEqual(["HSK1·top100", "HSK1·all"]);
    expect(nodes.filter(n => n.lv === 2).map(n => n.id)).toEqual(["HSK2·top100", "HSK2·top300", "HSK2·all"]);
    expect(nodes.filter(n => n.lv === 3).map(n => n.id)).toEqual(["HSK3·top100", "HSK3·top300", "HSK3·top500", "HSK3·all"]);
  });
  it("defs: scope stickers for topN nodes only, 4 milestones per level, 4 events", () => {
    const defs = stickerDefs({ 1: 205, 2: 479 });
    expect(defs.filter(d => d.kind === "scope").map(d => d.id)).toEqual(["scope:HSK1·top100", "scope:HSK2·top100", "scope:HSK2·top300"]);
    expect(defs.filter(d => d.kind === "milestone").length).toBe(8);
    expect(defs.filter(d => d.kind === "event").map(d => d.event)).toEqual(EVENT_STICKERS);
  });
});

describe("scopeFacts", () => {
  it("floors percentages and ranks Top-N by frequency", () => {
    const facts = scopeFacts(LEVELS, mastered(["一", "二", "三"]));  // 3 of 4 = 75%
    expect(facts.levelPcts["1"]).toBe(75);
    expect(facts.scopePcts["HSK1·all"]).toBe(75);
    expect(facts.levelCounts["1"]).toBe(4);
  });
  it("100% requires literally every word (floor, no rounding up)", () => {
    const facts = scopeFacts(LEVELS, mastered(["一", "二", "三"]));
    expect(facts.levelPcts["1"]).toBeLessThan(100);
    const full = scopeFacts(LEVELS, mastered(["一", "二", "三", "四"]));
    expect(full.levelPcts["1"]).toBe(100);
  });
});

describe("evaluateAwards", () => {
  const defs = stickerDefs({ 1: 4 });
  const baseFacts = { scopePcts: {}, levelPcts: { "1": 0 }, sessionDone: false, bossDefeated: false, streak: 0 };

  it("awards milestone thresholds exactly (24 no, 25 yes)", () => {
    let s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, levelPcts: { "1": 24 } }, "2026-07-07");
    expect(Object.keys(s.earned)).toEqual([]);
    s = evaluateAwards(s, defs, { ...baseFacts, levelPcts: { "1": 25 } }, "2026-07-08");
    expect(s.earned["ms:HSK1:25"]).toBe("2026-07-08");
    expect(s.queue).toEqual(["ms:HSK1:25"]);
  });

  it("never double-awards across repeated evaluations", () => {
    let s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, sessionDone: true }, "2026-07-07");
    expect(s.queue).toEqual(["ev:welcome"]);
    s = evaluateAwards(s, defs, { ...baseFacts, sessionDone: true }, "2026-07-08");
    expect(s.queue).toEqual(["ev:welcome"]);          // unchanged
    expect(s.earned["ev:welcome"]).toBe("2026-07-07"); // original date kept
  });

  it("event stickers gate on their facts", () => {
    const s = evaluateAwards(defaultStickers(), defs,
      { ...baseFacts, sessionDone: true, bossDefeated: true, streak: 7 }, "2026-07-07");
    expect(Object.keys(s.earned).sort()).toEqual(["ev:first-boss", "ev:streak-7", "ev:welcome"]);
    expect(s.earned["ev:streak-30"]).toBeUndefined();
  });

  it("does not mutate the input state", () => {
    const s0 = defaultStickers();
    const snapshot = JSON.parse(JSON.stringify(s0));
    evaluateAwards(s0, defs, { ...baseFacts, sessionDone: true }, "2026-07-07");
    expect(s0).toEqual(snapshot);
  });
});

describe("popToast", () => {
  it("pops exactly one queued sticker per call, in FIFO order", () => {
    const s0 = { earned: { a: "d", b: "d" }, queue: ["a", "b"] };
    const p1 = popToast(s0);
    expect(p1.id).toBe("a");
    expect(p1.state.queue).toEqual(["b"]);
    const p2 = popToast(p1.state);
    expect(p2.id).toBe("b");
    const p3 = popToast(p2.state);
    expect(p3.id).toBe(null);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/stickers.test.js`
Expected: FAIL — cannot resolve `../src/stickers.js`.

- [ ] **Step 3: Implement `src/stickers.js`**

```js
"use strict";
// Sticker album (PRD v5 B2). Pure: sticker catalog, mastery facts, award
// evaluation, toast queue. main.js owns persistence (nbhsk.stickers) and
// rendering. Stickers are EARN-ONLY — never purchasable (PRD guardrail).
// Sticker art arrives via the A2 pipeline later; the album renders icon
// placeholders until then. scopeNodes is shared with the B3 journey map.
import { isMastered } from "./mastery.js";

export const TOP_NS = [100, 300, 500];
export const MILESTONE_PCTS = [25, 50, 75, 100];
export const EVENT_STICKERS = ["welcome", "first-boss", "streak-7", "streak-30"];

export function defaultStickers() {
  return { earned: {}, queue: [] };   // earned: sticker id -> "YYYY-MM-DD"
}

// One node per selectable sub-scope of a level: Top-100/300/500 (only when
// the level actually has more than N words) plus the full level.
export function scopeNodes(levelCounts) {
  const nodes = [];
  const lvs = Object.keys(levelCounts).map(Number).sort((a, b) => a - b);
  for (const lv of lvs) {
    for (const n of TOP_NS) {
      if (levelCounts[lv] > n) nodes.push({ id: `HSK${lv}·top${n}`, lv, topN: n });
    }
    nodes.push({ id: `HSK${lv}·all`, lv, topN: 0 });
  }
  return nodes;
}

// The full sticker catalog, in album display order. The full-level node has
// no separate scope sticker — completing it IS the 100% milestone.
export function stickerDefs(levelCounts) {
  const defs = [];
  for (const node of scopeNodes(levelCounts)) {
    if (node.topN > 0) defs.push({ id: `scope:${node.id}`, kind: "scope", lv: node.lv, topN: node.topN });
  }
  const lvs = Object.keys(levelCounts).map(Number).sort((a, b) => a - b);
  for (const lv of lvs) {
    for (const pct of MILESTONE_PCTS) defs.push({ id: `ms:HSK${lv}:${pct}`, kind: "milestone", lv, pct });
  }
  for (const ev of EVENT_STICKERS) defs.push({ id: `ev:${ev}`, kind: "event", event: ev });
  return defs;
}

// Mastery facts for award evaluation and album progress display.
// levelsData: {"1":[{h,f,...}], ...}; mastery: the nbhsk.mastery store.
// Percentages are FLOORED so 100% means literally every word mastered.
export function scopeFacts(levelsData, mastery) {
  const levelCounts = {}, scopePcts = {}, levelPcts = {};
  for (const lv of Object.keys(levelsData)) {
    const words = [...levelsData[lv]].sort((a, b) => b.f - a.f);
    levelCounts[lv] = words.length;
    const marks = words.map(w => (isMastered(mastery, w.h) ? 1 : 0));
    const total = marks.reduce((s, m) => s + m, 0);
    levelPcts[lv] = words.length ? Math.floor(100 * total / words.length) : 0;
    for (const n of TOP_NS) {
      if (words.length > n) {
        let top = 0;
        for (let i = 0; i < n; i++) top += marks[i];
        scopePcts[`HSK${lv}·top${n}`] = Math.floor(100 * top / n);
      }
    }
    scopePcts[`HSK${lv}·all`] = levelPcts[lv];
  }
  return { levelCounts, scopePcts, levelPcts };
}

// Evaluate every unearned sticker against fresh facts. Returns a NEW state;
// newly earned ids are stamped with dateStr and appended to the toast queue.
// facts: {scopePcts, levelPcts, sessionDone, bossDefeated, streak}.
export function evaluateAwards(state, defs, facts, dateStr) {
  const earned = { ...state.earned };
  const queue = [...state.queue];
  const award = id => { earned[id] = dateStr; queue.push(id); };
  for (const d of defs) {
    if (earned[d.id]) continue;
    if (d.kind === "scope") {
      if ((facts.scopePcts[`HSK${d.lv}·top${d.topN}`] ?? 0) >= 100) award(d.id);
    } else if (d.kind === "milestone") {
      if ((facts.levelPcts[String(d.lv)] ?? 0) >= d.pct) award(d.id);
    } else if (d.kind === "event") {
      if (d.event === "welcome" && facts.sessionDone) award(d.id);
      else if (d.event === "first-boss" && facts.bossDefeated) award(d.id);
      else if (d.event === "streak-7" && facts.streak >= 7) award(d.id);
      else if (d.event === "streak-30" && facts.streak >= 30) award(d.id);
    }
  }
  return { earned, queue };
}

// One toast per results screen (PRD B2); the rest stay queued.
export function popToast(state) {
  if (!state.queue.length) return { state, id: null };
  return { state: { earned: state.earned, queue: state.queue.slice(1) }, id: state.queue[0] };
}
```

- [ ] **Step 4: Run to verify pass, then full suite**

Run: `npx vitest run test/stickers.test.js` → PASS (10 tests).
Run: `npm test` → all green.

- [ ] **Step 5: Commit**

```bash
git add src/stickers.js test/stickers.test.js
git commit -m "feat(stickers): pure module — catalog, mastery facts, award queue (B2)"
```

---

### Task 4: B2 album screen — nav sub-screen, markup, renderer

**Files:**
- Modify: `src/nav.js` + `test/nav.test.js`
- Modify: `index.html` (`#s-album` screen + Progress button + CSS)
- Modify: `src/i18n.js` (album/sticker keys × 2 locales)
- Modify: `src/main.js` (imports, `renderAlbum()`, data-go branch, sticker label helpers)

**Interfaces:**
- Consumes: `stickerDefs`, `scopeFacts`, `defaultStickers` from Task 3.
- Produces: `stickerLabel(def)` / `stickerHint(def)` helpers and module state `stickerState` that Task 5's award wiring reuses; screen id `album`.

- [ ] **Step 1: nav.js — progress sub-screen (TDD: extend nav.test.js first)**

Append inside the existing `describe("nav", ...)` in `test/nav.test.js` (inside the `navVisibleOn` and `activeTabFor` describes respectively):

```js
    it("shows the nav on the album (a Progress sub-screen)", () => {
      expect(navVisibleOn("album")).toBe(true);
    });
```

```js
    it("is 'progress' for the album", () => {
      expect(activeTabFor("album")).toBe("progress");
    });
```

Run: `npx vitest run test/nav.test.js` → the 2 new cases FAIL.

In `src/nav.js`, replace:

```js
const MORE_SUBSCREENS = ["scores", "howto"];
```

with:

```js
const MORE_SUBSCREENS = ["scores", "howto"];

// Sub-screens that ride under the Progress tab (B2 sticker album).
const PROGRESS_SUBSCREENS = ["album"];
```

Replace:

```js
const NAV_VISIBLE = new Set([...TABS, ...MORE_SUBSCREENS, "shop"]);
```

with:

```js
const NAV_VISIBLE = new Set([...TABS, ...MORE_SUBSCREENS, ...PROGRESS_SUBSCREENS, "shop"]);
```

And in `activeTabFor`, after the `MORE_SUBSCREENS` line add:

```js
  if (PROGRESS_SUBSCREENS.includes(screen)) return "progress";
```

Run: `npx vitest run test/nav.test.js` → PASS.

- [ ] **Step 2: i18n keys (both tables)**

`en`:

```js
    // sticker album (B2 — earn-only, never sold)
    "progress.album": "Sticker Album",
    "album.title": "Sticker Album",
    "album.back": "← Progress",
    "album.events": "Events",
    "sticker.scopeName": "HSK{lv} · Top {n}",
    "sticker.scopeHint": "Master all Top {n} words of HSK{lv}",
    "sticker.msName": "HSK{lv} · {pct}%",
    "sticker.msHint": "Master {pct}% of HSK{lv}",
    "sticker.welcomeName": "Welcome!",
    "sticker.welcomeHint": "Finish your first session",
    "sticker.bossName": "Boss Buster",
    "sticker.bossHint": "Defeat your first boss",
    "sticker.streak7Name": "7-Day Streak",
    "sticker.streak7Hint": "Keep a 7-day study streak",
    "sticker.streak30Name": "30-Day Streak",
    "sticker.streak30Hint": "Keep a 30-day study streak",
    "results.newSticker": "New sticker: {name}!",
```

`th`:

```js
    // sticker album (B2 — earn-only, never sold)
    "progress.album": "อัลบั้มสติกเกอร์",
    "album.title": "อัลบั้มสติกเกอร์",
    "album.back": "← ความคืบหน้า",
    "album.events": "อีเวนต์",
    "sticker.scopeName": "HSK{lv} · Top {n}",
    "sticker.scopeHint": "เชี่ยวชาญคำศัพท์ Top {n} ของ HSK{lv} ให้ครบ",
    "sticker.msName": "HSK{lv} · {pct}%",
    "sticker.msHint": "เชี่ยวชาญ {pct}% ของ HSK{lv}",
    "sticker.welcomeName": "ยินดีต้อนรับ!",
    "sticker.welcomeHint": "จบเซสชันแรกของคุณ",
    "sticker.bossName": "ผู้พิชิตบอส",
    "sticker.bossHint": "เอาชนะบอสตัวแรก",
    "sticker.streak7Name": "สตรีค 7 วัน",
    "sticker.streak7Hint": "รักษาสตรีคการเรียนต่อเนื่อง 7 วัน",
    "sticker.streak30Name": "สตรีค 30 วัน",
    "sticker.streak30Hint": "รักษาสตรีคการเรียนต่อเนื่อง 30 วัน",
    "results.newSticker": "สติกเกอร์ใหม่: {name}!",
```

- [ ] **Step 3: markup — album screen (insert directly BEFORE the `<!-- SHOP -->` comment) + Progress entry button**

New screen:

```html
  <!-- STICKER ALBUM (B2 — earn-only; sticker art lands via the A2 pipeline,
       tiles use ui-icons placeholders until then) -->
  <div class="screen festive" id="s-album">
    <button class="back" data-go="progress" data-i18n="album.back">← Progress</button>
    <h2 data-i18n="album.title">Sticker Album</h2>
    <div id="album-list"></div>
  </div>
```

In `#s-progress`, directly after the `<h2 data-i18n="progress.title">Progress</h2>` line add:

```html
    <button class="big" data-go="album"><span class="icon-text"><svg class="asset-icon"><use href="assets/ui-icons.svg#star"></use></svg><span data-i18n="progress.album">Sticker Album</span></span></button>
```

- [ ] **Step 4: CSS — after the `.streak-note` rule from Task 2**

```css
  /* B2 sticker album: per-level sections, 4-up grid; unearned = silhouette */
  #album-list{display:flex; flex-direction:column; gap:4px; overflow-y:auto; flex:1;}
  .album-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:6px;}
  .sticker{display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 4px;
    background-color:var(--panel-wash); border:1px solid var(--panel-border); border-radius:12px;
    text-align:center; box-shadow:0 2px 6px rgba(46,42,36,.08);}
  .sticker .asset-icon{width:32px; height:32px; color:var(--lc-green);}
  .sticker.kind-milestone .asset-icon{color:var(--lc-sun-deep);}
  .sticker.kind-event .asset-icon{color:var(--lc-coral);}
  .sticker b{font-size:11px; color:var(--ink); line-height:1.2;}
  .sticker small{font-size:9.5px; color:var(--muted); line-height:1.25;}
  .sticker.locked{opacity:.55;}
  .sticker.locked .asset-icon{color:var(--lc-gray);}
```

- [ ] **Step 5: main.js — imports, state, renderer, route**

Add the import (next to the firstrun.js import):

```js
import { defaultStickers, stickerDefs, scopeFacts, evaluateAwards, popToast } from "./stickers.js";
```

Add module state + catalog right after the `let questState = ...` line region (after `let questToasts = [];`):

```js
/* ============================== sticker album (B2) ============================== */
// earn-only — never purchasable. Persisted immediately on every award so a
// sticker earned mid-session survives reload (PRD B2 acceptance).
const st0 = store.get("stickers", {});
let stickerState = {
  earned: Object.assign({}, st0.earned),
  queue: Array.isArray(st0.queue) ? st0.queue.slice() : [],
};
const STICKER_LEVEL_COUNTS = Object.fromEntries(Object.entries(D.levels).map(([k, v]) => [k, v.length]));
const STICKER_DEFS = stickerDefs(STICKER_LEVEL_COUNTS);

function stickerLabel(def){
  if(def.kind === "scope") return t("sticker.scopeName", { lv: def.lv, n: def.topN });
  if(def.kind === "milestone") return t("sticker.msName", { lv: def.lv, pct: def.pct });
  if(def.event === "welcome") return t("sticker.welcomeName");
  if(def.event === "first-boss") return t("sticker.bossName");
  if(def.event === "streak-7") return t("sticker.streak7Name");
  return t("sticker.streak30Name");
}
function stickerHint(def){
  if(def.kind === "scope") return t("sticker.scopeHint", { lv: def.lv, n: def.topN });
  if(def.kind === "milestone") return t("sticker.msHint", { lv: def.lv, pct: def.pct });
  if(def.event === "welcome") return t("sticker.welcomeHint");
  if(def.event === "first-boss") return t("sticker.bossHint");
  if(def.event === "streak-7") return t("sticker.streak7Hint");
  return t("sticker.streak30Hint");
}
function stickerIcon(def){
  if(def.kind === "scope") return "paw";
  if(def.kind === "milestone") return "star";
  if(def.event === "first-boss") return "target";
  if(def.event === "welcome") return "cards";
  return "streak";
}
function renderAlbum(){
  const box = $("#album-list");
  box.innerHTML = "";
  const tile = def => {
    const earned = !!stickerState.earned[def.id];
    const el = document.createElement("div");
    el.className = `sticker kind-${def.kind}` + (earned ? "" : " locked");
    el.appendChild(iconSvg(stickerIcon(def)));
    const name = document.createElement("b"); name.textContent = stickerLabel(def);
    el.appendChild(name);
    const hint = document.createElement("small");
    hint.textContent = earned ? stickerState.earned[def.id] : stickerHint(def);
    el.appendChild(hint);
    return el;
  };
  for(let lv = 1; lv <= 6; lv++){
    const defs = STICKER_DEFS.filter(d => d.lv === lv);
    if(!defs.length) continue;
    const head = document.createElement("div");
    head.className = "sect"; head.textContent = `HSK${lv}`;
    box.appendChild(head);
    const grid = document.createElement("div"); grid.className = "album-grid";
    defs.forEach(d => grid.appendChild(tile(d)));
    box.appendChild(grid);
  }
  const evHead = document.createElement("div");
  evHead.className = "sect"; evHead.textContent = t("album.events");
  box.appendChild(evHead);
  const evGrid = document.createElement("div"); evGrid.className = "album-grid";
  STICKER_DEFS.filter(d => d.kind === "event").forEach(d => evGrid.appendChild(tile(d)));
  box.appendChild(evGrid);
}
```

In the generic `[data-go]` listener, add a branch after the `shop` branch:

```js
  else if(t==="album"){ renderAlbum(); show("album"); }
```

- [ ] **Step 6: Build, test, commit**

```bash
npm run build && npm test
```
Expected: all green (nav tests now include the 2 album cases; i18n parity holds).

```bash
git add src/nav.js test/nav.test.js index.html src/i18n.js src/main.js dist/app.js
git commit -m "feat(stickers): album screen under Progress — sections, silhouettes, hints (B2)"
```

---

### Task 5: B2 award wiring — evaluation on results, one-toast queue, boss flag, SHELL

**Files:**
- Modify: `src/main.js` (boss flag, endBattle evaluation + toast)
- Modify: `index.html` (toast CSS)
- Modify: `sw.js` (SHELL v26 → v27)

**Interfaces:**
- Consumes: everything Task 3/4 produced (`scopeFacts`, `STICKER_DEFS`, `evaluateAwards`, `popToast`, `stickerLabel`, `stickerIcon`, `stickerState`, `#r-sticker-slot`).

- [ ] **Step 1: session boss flag**

In `startBattle(mode)`, replace:

```js
  B.hitFlash = null; B.plaqueHitAt = 0;
```

with:

```js
  B.hitFlash = null; B.plaqueHitAt = 0;
  B.bossDefeated = false;   // session fact for the first-boss sticker (B2)
```

In `answer()`'s correct branch, replace:

```js
    if(boss) noteAnswer(z.w.h, true);           // both stages passed
```

with:

```js
    if(boss){ noteAnswer(z.w.h, true); B.bossDefeated = true; }   // both stages passed
```

- [ ] **Step 2: award evaluation + toast in `endBattle()`**

Directly after the Phase-3 intro block that ends with

```js
  }else{
    hintEl.style.display = "none";
  }
```

add:

```js
  // B2 sticker awards: evaluate every unearned sticker against fresh facts.
  // Persist immediately (a sticker earned mid-session survives reload); show
  // at most ONE toast per results screen — the rest stay queued.
  const stickerFacts = {
    ...scopeFacts(D.levels, masteryStore),
    sessionDone: B.resolved > 0,
    bossDefeated: !!B.bossDefeated,
    streak: streakInfo(daily, todayStr()).streak,
  };
  stickerState = evaluateAwards(stickerState, STICKER_DEFS, stickerFacts, todayStr());
  store.set("stickers", stickerState);
  const slot = $("#r-sticker-slot");
  const popped = popToast(stickerState);
  if(popped.id){
    stickerState = popped.state;
    store.set("stickers", stickerState);
    const def = STICKER_DEFS.find(d => d.id === popped.id);
    slot.innerHTML = "";
    const toastEl = document.createElement("div");
    toastEl.className = "sticker-toast";
    toastEl.appendChild(iconSvg(stickerIcon(def)));
    const label = document.createElement("span");
    label.textContent = t("results.newSticker", { name: stickerLabel(def) });
    toastEl.appendChild(label);
    slot.appendChild(toastEl);
    slot.style.display = "block";
  }else{
    slot.style.display = "none";
  }
```

- [ ] **Step 3: toast CSS — after the `.sticker.locked .asset-icon` rule**

```css
  /* B2 new-sticker toast on results: calm sun plaque, one per session */
  .sticker-toast{display:flex; align-items:center; justify-content:center; gap:8px;
    background-color:var(--lc-sun); background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun));
    border:2px solid var(--lc-brown); border-radius:12px; color:var(--lc-brown);
    font-weight:800; font-size:14px; padding:8px 10px; margin:0 0 10px;
    box-shadow:0 2px 6px rgba(46,42,36,.18);}
  .sticker-toast .asset-icon{width:20px; height:20px;}
```

- [ ] **Step 4: SHELL bump**

In `sw.js` replace: `const SHELL = "nbhsk-shell-v26";`
with: `const SHELL = "nbhsk-shell-v27";`

- [ ] **Step 5: Build, full suite, commit**

```bash
npm run build && npm test
```
Expected: all green.

```bash
git add src/main.js index.html sw.js dist/app.js
git commit -m "feat(stickers): award evaluation on results, one-toast queue, first-boss flag; SHELL v27 (B2)"
```

> **Controller checkpoint (not the implementer):** scripted browser pass — (1) fresh profile plays the intro → results shows the Welcome sticker toast (the Phase-3 slot activates); album shows Welcome earned in color, everything else silhouetted with hints; reload → album still shows it (persistence). (2) Seed `nbhsk.daily` with a streak-3 ending two days ago → home shows the streak alive; complete a goal → streak 4 + the 🍵 note. (3) TH locale spot-check of album + note.

---

## Self-review notes (already applied)

- **Spec coverage (B1):** every PRD-mandated vitest case has a named test (miss-1-covered, miss-2-breaks, two-misses-same-week-breaks, rest-day-never-increments, week-boundary reset, streak<3 uncovered, migration incl. no-retroactive-break). Calm UI copy verbatim; no purchasable repair anywhere. Mon–Sun device-local weeks via `weekStart` over the already-local date string.
- **Spec coverage (B2):** per-scope stickers = Top-N sub-scopes per level (the full-level completion awards via the 100% milestone — no duplicate; the `·all` node still exists in `scopeNodes` for B3). Level milestones 25/50/75/100 ✓. Event stickers: Welcome (first completed session — activates the Phase-3 A4 slot), first boss, 7-day, 30-day ✓. Album under Progress with earned/unearned states + hints ✓. One toast per session, queue persisted ✓. Earn-only ✓.
- **Judgment calls flagged for review:** "Welcome!" awards on the first *completed session* for existing players too (they never saw the intro; kind, not exploitable). Scope stickers use floored percentages so 100% is literal completion. Sticker tiles show the earned date as the sub-line once earned (art comes with A2).
- **Type consistency:** `stickerState` shape `{earned, queue}` used identically across Tasks 3–5; `STICKER_DEFS`/`STICKER_LEVEL_COUNTS` defined in Task 4, consumed in Task 5; `restNote`/`restWeek`/`restDay` names consistent across daily.js and main.js; Task 4's main.js import deliberately excludes `MILESTONE_PCTS` (only used inside stickers.js).
- **Placeholder scan:** clean.
