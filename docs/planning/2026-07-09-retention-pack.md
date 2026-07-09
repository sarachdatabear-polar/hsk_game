# Retention Pack Implementation Plan (streak freezes, monthly quest, streak-saver, rewarded-first pivot)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four verified, backend-free Duolingo-research adoptions: an earnable capped streak-freeze economy, a monthly quest layer with badge, an Android streak-saver notification, and the rewarded-video-first monetization PRD pivot.

**Architecture:** Everything stays in the repo's pure-module + main.js-wiring pattern. Freezes extend `daily.js`'s existing gap-coverage logic (the weekly rest day generalizes to "rest day + owned freezes"); the monthly layer extends `quests.js` with a month-keyed accumulator fed by daily-quest completions; the streak reminder is a pure decision helper plus a `native.js` LocalNotifications wrapper (web build stays inert); the monetization pivot is a docs-only PRD amendment. Leagues and friend streaks are explicitly OUT OF SCOPE (gated on Supabase accounts).

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild, Capacitor (Android), i18n EN/TH.

## Global Constraints

- Repo `/root/work/HSK/game`; branch `feat/retention-pack` off `development` (create AFTER the battle-mobile-fit PR merges). Never stage `game/` from the root repo.
- After changing `src/`, run `npm run build`; tests via `npm test > /tmp/t.txt 2>&1; echo EXIT=$?` (never pipe — capture the real exit code). Node via `. ~/.nvm/nvm.sh`.
- Every user-facing string goes through `t()` with BOTH `en` and `th` keys in `src/i18n.js`; the i18n usage-guard test must be extended for new key prefixes. TH strings get a `// TH: needs native review` comment (open owner item).
- No emoji as structural icons (repo + skill rule) — freeze chip/shop tile use the existing vector/asset-icon pattern.
- `sw.js` SHELL bump only at release cut.
- localStorage keys are namespaced `nbhsk.*`; new stores: `nbhsk.freezes` (number), `nbhsk.monthly` (JSON).
- Existing behavior contracts that must NOT regress: `noteActivity` with the old call shape (no 4th arg) behaves exactly as today; catalog tests hardcode prices (update them deliberately, never mask).
- Android-only pieces (LocalNotifications) must be inert no-ops on web/PWA (guard with `isNative()`), and real-device verification is Jordan's (VPS cannot run `apk:release`).

## File Structure

- `src/daily.js` + `test/daily.test.js` — freeze-aware gap coverage (Task 1).
- `src/shop.js` + `test/shop.test.js` — consumable catalog entry (Task 2).
- `src/quests.js` + `test/quests.test.js` — monthly layer (Task 4).
- `src/stickers.js` + `test/stickers.test.js` — monthly badge event sticker (Task 4).
- `src/notify.js` (new) + `test/notify.test.js` (new) — pure reminder decision (Task 6).
- `src/native.js` — LocalNotifications wrapper (Task 6, no unit tests — bridge code).
- `src/i18n.js` + `test/i18n.test.js` — new keys EN/TH (Tasks 2, 3, 5, 6).
- `src/main.js` — wiring only (Tasks 3, 5, 6).
- `docs/prd/PRD-monetization-and-production.md` — rewarded-first amendment (Task 7).

---

### Task 1: `daily.js` — freezes join the gap-coverage economy

**Files:**
- Modify: `src/daily.js` (noteActivity ~line 44, streakInfo ~line 76)
- Test: `test/daily.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `noteActivity(daily, dateStr, count, freezes = 0)` → adds `freezesUsed` (0|1|2) to the returned object; `streakInfo(daily, dateStr, freezes = 0)` → `coverableGap` display logic honors owned freezes. Old 3-arg calls behave byte-identically (freezes default 0, `freezesUsed: 0`).

- [ ] **Step 1: Write the failing tests** (append to `test/daily.test.js`)

```js
describe("streak freezes (retention pack)", () => {
  const base = (last, streak) => ({ last, streak, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" });
  it("old call shape unchanged: no 4th arg -> freezesUsed 0, rest-day logic as before", () => {
    const d = noteActivity(base("2026-07-06", 5), "2026-07-08", 20);
    expect(d.freezesUsed).toBe(0);
    expect(d.streak).toBe(6);            // rest day covers the one missed day
    expect(d.restDay).toBe("2026-07-07");
  });
  it("one missed day, rest already spent this week -> one freeze covers it", () => {
    const d = { ...base("2026-07-06", 5), restWeek: "2026-07-06" };   // Mon 2026-07-06 week spent
    const r = noteActivity(d, "2026-07-08", 20, 2);
    expect(r.streak).toBe(6);
    expect(r.freezesUsed).toBe(1);
    expect(r.restDay).toBe(d.restDay || "");   // rest untouched
  });
  it("one missed day, rest spent, zero freezes -> streak resets to 1", () => {
    const d = { ...base("2026-07-06", 5), restWeek: "2026-07-06" };
    const r = noteActivity(d, "2026-07-08", 20, 0);
    expect(r.streak).toBe(1);
    expect(r.freezesUsed).toBe(0);
  });
  it("two missed days -> rest covers the first, one freeze covers the second", () => {
    const r = noteActivity(base("2026-07-06", 5), "2026-07-09", 20, 1);
    expect(r.streak).toBe(6);
    expect(r.freezesUsed).toBe(1);
    expect(r.restDay).toBe("2026-07-07");
  });
  it("two missed days, rest spent -> two freezes", () => {
    const d = { ...base("2026-07-06", 5), restWeek: "2026-07-06" };
    const r = noteActivity(d, "2026-07-09", 20, 2);
    expect(r.streak).toBe(6);
    expect(r.freezesUsed).toBe(2);
  });
  it("two missed days, rest spent, one freeze -> not enough, reset", () => {
    const d = { ...base("2026-07-06", 5), restWeek: "2026-07-06" };
    const r = noteActivity(d, "2026-07-09", 20, 1);
    expect(r.streak).toBe(1);
    expect(r.freezesUsed).toBe(0);       // never burn freezes on a lost cause
  });
  it("three missed days are never coverable", () => {
    const r = noteActivity(base("2026-07-06", 9), "2026-07-10", 20, 2);
    expect(r.streak).toBe(1);
    expect(r.freezesUsed).toBe(0);
  });
  it("freezes only rescue streaks >= 3 when the rest day would not (same kindness rule)", () => {
    const r = noteActivity(base("2026-07-06", 2), "2026-07-08", 20, 2);
    expect(r.streak).toBe(6 - 4);        // streak 2 -> gap uncovered by rest (needs >=3); freeze DOES cover it
  });
  it("streakInfo shows the chain alive when owned freezes could cover the gap", () => {
    const d = { ...base("2026-07-06", 5), restWeek: "2026-07-06" };
    expect(streakInfo(d, "2026-07-08", 0).streak).toBe(0);
    expect(streakInfo(d, "2026-07-08", 1).streak).toBe(5);
  });
});
```

DESIGN DECISION encoded above (write the implementation to match): the weekly rest day keeps its `streak >= 3` kindness gate, but a purchased freeze works at ANY streak length (the player paid for it) — so the `streak 2` test expects the freeze to cover (fix the expected value to `3` — streak 2 + 1 — when writing the test; the arithmetic sketch above is the intent: freeze covers, rest would not).

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run test/daily.test.js`
Expected: FAIL — `freezesUsed` undefined, resets where coverage was expected.

- [ ] **Step 3: Implement in `src/daily.js`**

Replace the `else` branch of `noteActivity`'s `crossedNow` block (the current `missed/covered` logic) with, and add `freezes = 0` as the 4th parameter and `freezesUsed` to the return:

```js
export function noteActivity(daily, dateStr, count, freezes = 0) {
  const before = daily.today.date === dateStr ? daily.today.resolved : 0;
  const resolved = before + count;
  const today = { date: dateStr, resolved };
  let { last, streak } = daily;
  let restWeek = daily.restWeek || "";
  let restDay = daily.restDay || "";
  let freezesUsed = 0;
  const crossedNow = before < GOAL && resolved >= GOAL;
  if (crossedNow && last !== dateStr) {
    if (isYesterday(last, dateStr)) {
      streak += 1;
    } else {
      // Gap coverage, kindest-first: the week's automatic rest day (free,
      // needs streak >= 3, one per Mon-Sun week) absorbs one missed day,
      // then owned freezes (paid, no streak gate) absorb the rest. Gaps of
      // more than two missed days are never coverable. Freezes are only
      // consumed when the whole gap is coverable — never on a lost cause.
      const missed = [];
      if (last) {
        let d = addDays(last, 1);
        while (d && d !== dateStr && missed.length < 3) { missed.push(d); d = addDays(d, 1); }
      }
      let restUsedDay = "";
      let uncovered = 0;
      for (const day of missed) {
        if (!restUsedDay && streak >= 3 && weekStart(day) !== restWeek) restUsedDay = day;
        else uncovered += 1;
      }
      const coverable = last !== "" && missed.length >= 1 && missed.length <= 2 && uncovered <= freezes;
      if (coverable) {
        if (restUsedDay) { restWeek = weekStart(restUsedDay); restDay = restUsedDay; }
        freezesUsed = uncovered;
        streak += 1;                     // the return day counts; covered days never do
      } else {
        streak = 1;
      }
    }
    last = dateStr;
  }
  return { last, streak, today, restWeek, restDay, freezesUsed };
}
```

And in `streakInfo`, add the `freezes = 0` param and generalize `coverableGap` (keep the existing variables above it):

```js
export function streakInfo(daily, dateStr, freezes = 0) {
  const todayResolved = daily.today.date === dateStr ? daily.today.resolved : 0;
  const restWeek = daily.restWeek || "";
  const restDay = daily.restDay || "";
  const missed = [];
  if (daily.last && daily.last !== dateStr && !isYesterday(daily.last, dateStr)) {
    let d = addDays(daily.last, 1);
    while (d && d !== dateStr && missed.length < 3) { missed.push(d); d = addDays(d, 1); }
  }
  let restUsable = false, uncovered = 0;
  for (const day of missed) {
    if (!restUsable && daily.streak >= 3 && weekStart(day) !== restWeek) restUsable = true;
    else uncovered += 1;
  }
  const coverableGap = daily.last !== "" && missed.length >= 1 && missed.length <= 2 && uncovered <= freezes;
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

NOTE: at `freezes = 0` this reproduces today's behavior exactly (gap of 1 covered iff rest usable) — the existing daily tests are the regression proof; do not weaken any of them.

- [ ] **Step 4: Run `npx vitest run test/daily.test.js`** — all pass, including every pre-existing test untouched.

- [ ] **Step 5: Full suite + commit**

```bash
npm test > /tmp/t.txt 2>&1; echo EXIT=$?    # expect 0
git add src/daily.js test/daily.test.js
git commit -m "feat(daily): owned streak freezes join gap coverage (rest-day-first, no lost-cause burn)"
```

---

### Task 2: shop sells the freeze (consumable type)

**Files:**
- Modify: `src/shop.js` (CATALOG), `test/shop.test.js`, `src/i18n.js` (+ its guard test if key-prefix-scoped)

**Interfaces:**
- Consumes: nothing new.
- Produces: catalog entry `{ id: "streak-freeze", name: "Streak Freeze", price: 600, type: "consumable", cap: 2 }`; new i18n keys `item.streak-freeze` (EN "Streak Freeze" / TH "น้ำแข็งพิทักษ์สตรีค" `// TH: needs native review`) and `shop.owned-count` (EN "Owned: {n}/{cap}" / TH "มีอยู่: {n}/{cap}"). Task 3 wires purchase/consumption.

- [ ] **Step 1: Failing tests** — append to `test/shop.test.js`:

```js
it("streak-freeze is a capped consumable in the permanent catalog", () => {
  const f = CATALOG.find(i => i.id === "streak-freeze");
  expect(f).toBeTruthy();
  expect(f.type).toBe("consumable");
  expect(f.price).toBe(600);
  expect(f.cap).toBe(2);
  expect(f.pool).toBeUndefined();
  expect(f.season).toBeUndefined();
});
```

Check the existing catalog tests: if any assert the total CATALOG length or enumerate types, update those counts/type-lists deliberately in the same commit (repo memory: catalog tests hardcode values — that is by design, keep them hardcoded and correct).

- [ ] **Step 2: Run `npx vitest run test/shop.test.js`** — new test fails.

- [ ] **Step 3: Implement** — in `src/shop.js` CATALOG, immediately after the `golden-arch` deco line (end of the original permanent band), add:

```js
  { id: "streak-freeze", name: "Streak Freeze", price: 600, type: "consumable", cap: 2 },
```

In `src/i18n.js`, next to the other `item.*` keys add for `en`:
```js
    "item.streak-freeze": "Streak Freeze",
    "shop.owned-count": "Owned: {n}/{cap}",
```
and for `th` (same relative location in the th block):
```js
    "item.streak-freeze": "น้ำแข็งพิทักษ์สตรีค",   // TH: needs native review
    "shop.owned-count": "มีอยู่: {n}/{cap}",        // TH: needs native review
```

- [ ] **Step 4: `npx vitest run test/shop.test.js test/i18n.test.js`** — pass (fix any hardcoded-count tests you identified in Step 1; the i18n guard test must cover `item.streak-freeze` the same way other item names are covered).

- [ ] **Step 5: Full suite + commit**

```bash
npm test > /tmp/t.txt 2>&1; echo EXIT=$?    # expect 0
git add src/shop.js test/shop.test.js src/i18n.js test/i18n.test.js
git commit -m "feat(shop): streak-freeze consumable (600 coins, cap 2) + EN/TH names"
```

---

### Task 3: main.js wiring — buy, own, consume, show

**Files:**
- Modify: `src/main.js` (buy flow in `renderShop`'s click handler; the `noteActivity` call at ~line 151; home streak strip in `renderHome` ~line 136), `src/i18n.js`

**Interfaces:**
- Consumes: Task 1's `freezesUsed` + 4-arg `noteActivity`/3-arg `streakInfo`; Task 2's catalog entry and keys.
- Produces: localStorage store `nbhsk.freezes` (number 0–2) read/written ONLY in main.js via the existing `store` helper; i18n keys `toast.freeze-used` (EN "Streak Freeze used — your {n}-day streak is safe" / TH "ใช้น้ำแข็งพิทักษ์สตรีคแล้ว — สตรีค {n} วันของคุณยังอยู่" `// TH: needs native review`) and `home.freezes` (EN "{n} freeze(s)" / TH "น้ำแข็ง {n} ชิ้น").

- [ ] **Step 1: Read the three wiring points** (`renderShop`'s buy click handler; the daily-activity call `daily = noteActivity(daily, todayStr(), count)` at ~line 151; `renderHome`'s streak strip at ~line 136) and the `store` persistence helper. main.js has no unit tests by design — verification is Step 3's probe.

- [ ] **Step 2: Implement**
  - Module-scope near the other stores: `let freezes = Math.min(2, Number(store.get("freezes")) || 0);`
  - Buy flow: in the shop buy handler, branch on `item.type === "consumable"`: cost check against wallet as usual, then `freezes = Math.min(item.cap, freezes + 1); store.set("freezes", freezes);` — no ownership flag, and render the tile with `t("shop.owned-count", {n: freezes, cap: item.cap})`, disabling Buy at cap. (Follow the exact wallet-deduction + re-render pattern of the existing deco buy branch, including the double-tap re-arm delay from PR #67.)
  - Consumption: change the activity call to `const r = noteActivity(daily, todayStr(), count, freezes); daily = r; if (r.freezesUsed > 0) { freezes = Math.max(0, freezes - r.freezesUsed); store.set("freezes", freezes); toast(t("toast.freeze-used", {n: r.streak})); }` (use the existing toast helper; strip `freezesUsed` if daily is persisted wholesale — persist the same shape as before).
  - Display: streak strip calls become `streakInfo(daily, todayStr(), freezes)`; when `freezes > 0` append a small chip to the streak strip using the existing chip/pill markup pattern with an `asset-icon` SVG (add a simple `freeze` symbol to `assets/ui-icons.svg` following the file's existing symbol format — a 6-spoke snowflake path is fine) and the `home.freezes` label.
  - Add the i18n keys from Interfaces to both `en` and `th` blocks.

- [ ] **Step 3: Probe-verify end to end** (playwright chromium, localStorage bootstrap as usual, plus `nbhsk.wallet=5000`):
  (a) shop shows the freeze tile with "Owned: 0/2"; buy → wallet −600, "Owned: 1/2"; buy again → "2/2" and button disabled;
  (b) seed a gap: set `nbhsk.daily` to `{"last":"<two-days-ago>","streak":5,"today":{"date":"","resolved":0},"restWeek":"<monday-of-missed-week>","restDay":""}` with `nbhsk.freezes=1`, play until 20 words resolve (or set GOAL-1 resolved in the seed and answer one word), and confirm the toast fires, home shows streak 6, and `nbhsk.freezes` dropped to 0;
  (c) home streak strip shows the freeze chip at 1+, hides it at 0.
  Screenshot each state and READ them.

- [ ] **Step 4: Full suite + build + commit**

```bash
npm run build && npm test > /tmp/t.txt 2>&1; echo EXIT=$?   # expect 0
git add src/main.js src/i18n.js assets/ui-icons.svg dist/app.js
git commit -m "feat(streak): buy/own/consume freezes wired — toast, home chip, cap 2"
```

---

### Task 4: `quests.js` monthly layer + badge sticker (pure)

**Files:**
- Modify: `src/quests.js`, `test/quests.test.js`, `src/stickers.js`, `test/stickers.test.js`

**Interfaces:**
- Consumes: `noteQuestEvent`'s existing `completed` array (call site main.js ~line 229).
- Produces:
```js
export const MONTHLY_TARGET = 40;      // daily-quest completions per calendar month
export const MONTHLY_REWARD = 1500;    // coins on claim
export function monthKey(dateStr)      // "2026-07-09" -> "2026-07"
export function defaultMonthly()       // { month: "", done: 0, claimed: false }
export function noteMonthlyProgress(m, dateStr, completedCount)  // NEW state, month rollover resets
export function monthlyStatus(m, dateStr)  // { done, target, reward, complete, claimed } (0s on other-month state)
export function claimMonthly(m)        // { state, earned } — earns once, only when complete
```
Plus stickers.js: `EVENT_STICKERS` gains `"monthly-40"`, awarded when `facts.monthlyDone >= 40` (facts key `monthlyDone`, wired in Task 5).

- [ ] **Step 1: Failing tests** — append to `test/quests.test.js`:

```js
describe("monthly quest layer", () => {
  it("monthKey slices the month", () => expect(monthKey("2026-07-09")).toBe("2026-07"));
  it("accumulates completions within a month and caps at target", () => {
    let m = defaultMonthly();
    m = noteMonthlyProgress(m, "2026-07-09", 2);
    expect(m).toEqual({ month: "2026-07", done: 2, claimed: false });
    m = noteMonthlyProgress(m, "2026-07-10", 39);
    expect(m.done).toBe(40);
  });
  it("rolls over on a new month (done and claimed reset)", () => {
    const m = noteMonthlyProgress({ month: "2026-06", done: 40, claimed: true }, "2026-07-01", 1);
    expect(m).toEqual({ month: "2026-07", done: 1, claimed: false });
  });
  it("status reports zeros for a stale month and completeness at target", () => {
    expect(monthlyStatus({ month: "2026-06", done: 12, claimed: false }, "2026-07-09").done).toBe(0);
    const s = monthlyStatus({ month: "2026-07", done: 40, claimed: false }, "2026-07-09");
    expect(s.complete).toBe(true);
    expect(s.reward).toBe(1500);
  });
  it("claim pays once and only when complete", () => {
    const done = { month: "2026-07", done: 40, claimed: false };
    const r = claimMonthly(done);
    expect(r.earned).toBe(1500);
    expect(r.state.claimed).toBe(true);
    expect(claimMonthly(r.state).earned).toBe(0);
    expect(claimMonthly({ month: "2026-07", done: 39, claimed: false }).earned).toBe(0);
  });
});
```

And to `test/stickers.test.js` (match the existing event-sticker test style): `ev:monthly-40` exists in defs and awards when `facts.monthlyDone >= 40` and not below.

- [ ] **Step 2: `npx vitest run test/quests.test.js test/stickers.test.js`** — fail.

- [ ] **Step 3: Implement** — append to `src/quests.js` (below `questStatus`):

```js
// ---- Monthly layer (retention pack): daily-quest completions accumulate
// into one calendar-month quest with a coin reward + album badge. Pure;
// caller owns persistence (nbhsk.monthly) and feeds completedCount from
// noteQuestEvent's `completed` array.
export const MONTHLY_TARGET = 40;
export const MONTHLY_REWARD = 1500;

export function monthKey(dateStr) { return (dateStr || "").slice(0, 7); }

export function defaultMonthly() { return { month: "", done: 0, claimed: false }; }

export function noteMonthlyProgress(m, dateStr, completedCount) {
  const month = monthKey(dateStr);
  const rollover = m.month !== month;
  const done = Math.min(MONTHLY_TARGET, (rollover ? 0 : m.done) + completedCount);
  return { month, done, claimed: rollover ? false : m.claimed };
}

export function monthlyStatus(m, dateStr) {
  const same = m.month === monthKey(dateStr);
  const done = same ? m.done : 0;
  return { done, target: MONTHLY_TARGET, reward: MONTHLY_REWARD,
           complete: done >= MONTHLY_TARGET, claimed: same ? m.claimed : false };
}

export function claimMonthly(m) {
  if (m.done >= MONTHLY_TARGET && !m.claimed) {
    return { state: { ...m, claimed: true }, earned: MONTHLY_REWARD };
  }
  return { state: m, earned: 0 };
}
```

In `src/stickers.js`: add `"monthly-40"` to `EVENT_STICKERS`, and in `evaluateAwards`' event branch add `else if (d.event === "monthly-40" && facts.monthlyDone >= 40) award(d.id);`.

- [ ] **Step 4: targeted tests pass → full suite → commit**

```bash
npm test > /tmp/t.txt 2>&1; echo EXIT=$?   # expect 0
git add src/quests.js test/quests.test.js src/stickers.js test/stickers.test.js
git commit -m "feat(quests): monthly quest layer (40 completions -> 1500 coins + album badge), pure"
```

---

### Task 5: Quests screen UI + monthly wiring

**Files:**
- Modify: `src/main.js` (`renderQuests` ~line 240 and the `noteQuestEvent` call ~line 229; sticker-facts builders ~lines 1841/1946), `src/i18n.js`, `index.html` (quests screen markup if a container is needed)

**Interfaces:**
- Consumes: Task 4's exports.
- Produces: store `nbhsk.monthly`; i18n keys `quest.monthly.title` (EN "Monthly: {done}/{target} quests" / TH "รายเดือน: {done}/{target} เควสต์"), `quest.monthly.claim` (EN "Claim +{reward}" / TH "รับ +{reward}"), `quest.monthly.badge` (EN "Monthly badge earned!" / TH "ได้เหรียญตรารายเดือนแล้ว!") — all TH `// TH: needs native review`.

- [ ] **Step 1: Implement**
  - Module scope: `let monthly = store.get("monthly") ? JSON.parse(store.get("monthly")) : defaultMonthly();`
  - After the existing `noteQuestEvent` result handling: `if (r.completed.length) { monthly = noteMonthlyProgress(monthly, todayStr(), r.completed.length); store.set("monthly", JSON.stringify(monthly)); }`
  - `renderQuests`: above the daily list, render a monthly bar (reuse the existing `.mbar` progress-bar markup pattern) with `t("quest.monthly.title", ...)` from `monthlyStatus(monthly, todayStr())`; when `complete && !claimed` show a claim button that runs `const c = claimMonthly(monthly); monthly = c.state; store.set("monthly", JSON.stringify(monthly)); wallet += c.earned;` (persist wallet the same way quest rewards already do) and re-renders.
  - Sticker facts: add `monthlyDone: monthlyStatus(monthly, todayStr()).done` to BOTH facts objects (~lines 1841 and 1946) so `evaluateAwards` can award `ev:monthly-40`.
  - i18n keys per Interfaces (EN + TH).

- [ ] **Step 2: Probe-verify**: seed `nbhsk.monthly` `{"month":"<current>","done":39,"claimed":false}`, complete one daily quest in a battle (or seed quest progress at target−1 and finish it) → monthly bar reads 40/40, claim button appears, tapping it adds 1500 coins, sticker album shows the monthly badge. Screenshot quests screen before/after claim + album; READ them.

- [ ] **Step 3: Full suite + build + commit**

```bash
npm run build && npm test > /tmp/t.txt 2>&1; echo EXIT=$?   # expect 0
git add src/main.js src/i18n.js index.html dist/app.js
git commit -m "feat(quests): monthly bar + claim + badge wiring on the Quests screen"
```

---

### Task 6: streak-saver notification (Android)

**Files:**
- Create: `src/notify.js`, `test/notify.test.js`
- Modify: `src/native.js`, `src/main.js` (visibilitychange handler ~line 997 + goal-crossing point in the Task 3 consumption block), `src/i18n.js`, `package.json` (+ `npx cap sync android` artifacts)

**Interfaces:**
- Consumes: `streakInfo` (Task 1 signature).
- Produces:
```js
// src/notify.js — pure decision: should a reminder exist right now, and when?
export const REMINDER_HOUR = 19;   // 7pm local
export function reminderPlan(info /* streakInfo(...) result */, hourNow) {
  // schedule: streak alive (>0), goal not met, and it's not already past the
  // reminder hour... if hourNow >= REMINDER_HOUR schedule for tomorrow-morning
  // safety window instead? NO — keep MVP: schedule only when hourNow < REMINDER_HOUR.
  const schedule = info.streak > 0 && !info.goalMet && hourNow < REMINDER_HOUR;
  return { schedule, hour: REMINDER_HOUR, cancel: info.goalMet };
}
```
native.js: `export function syncStreakReminder(plan, title, body)` — `isNative()` guard; `plugins().LocalNotifications` cancel id 1001 always, then when `plan.schedule` schedule id 1001 at today `plan.hour:00` local. i18n keys `notify.streak.title` (EN "Don't lose your {n}-day streak!" / TH "อย่าให้สตรีค {n} วันหลุดนะ!"), `notify.streak.body` (EN "{remaining} words keep it alive — a quick round does it." / TH "อีก {remaining} คำสตรีคก็รอด — เล่นรอบสั้น ๆ ก็พอ") — TH `// TH: needs native review`.

- [ ] **Step 1: Failing tests** — `test/notify.test.js`:

```js
import { describe, it, expect } from "vitest";
import { reminderPlan, REMINDER_HOUR } from "../src/notify.js";

describe("reminderPlan", () => {
  const info = (streak, goalMet) => ({ streak, goalMet, todayResolved: 0, goal: 20, restNote: false });
  it("schedules when a live streak has not met goal and the hour is before the reminder", () => {
    expect(reminderPlan(info(5, false), 10)).toEqual({ schedule: true, hour: REMINDER_HOUR, cancel: false });
  });
  it("never schedules with no streak to save", () => {
    expect(reminderPlan(info(0, false), 10).schedule).toBe(false);
  });
  it("cancels once the goal is met", () => {
    const p = reminderPlan(info(5, true), 10);
    expect(p.schedule).toBe(false);
    expect(p.cancel).toBe(true);
  });
  it("does not schedule after the reminder hour has passed", () => {
    expect(reminderPlan(info(5, false), REMINDER_HOUR).schedule).toBe(false);
  });
});
```

- [ ] **Step 2: red → implement `src/notify.js` exactly as the Interfaces block (resolve its inline comment: MVP schedules only when `hourNow < REMINDER_HOUR`) → green.**

- [ ] **Step 3: native.js wrapper** — following the file's `plugins()`/`isNative()` pattern:

```js
// Streak-saver local notification (retention pack). Web/PWA: inert.
// Android needs @capacitor/local-notifications + POST_NOTIFICATIONS runtime
// permission (Android 13+) — requestPermissions() on first schedule.
export async function syncStreakReminder(plan, title, body) {
  if (!isNative()) return;
  const LN = plugins().LocalNotifications;
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: 1001 }] });
    if (!plan.schedule) return;
    const perm = await LN.requestPermissions();
    if (perm.display !== "granted") return;
    const at = new Date();
    at.setHours(plan.hour, 0, 0, 0);
    await LN.schedule({ notifications: [{ id: 1001, title, body, schedule: { at } }] });
  } catch (e) { /* notification failure must never break gameplay */ }
}
```

- [ ] **Step 4: main.js hooks** — in the `visibilitychange` handler (~line 997), when `document.hidden`: build `const inf = streakInfo(daily, todayStr(), freezes); const plan = reminderPlan(inf, new Date().getHours());` and call `syncStreakReminder(plan, t("notify.streak.title", {n: inf.streak}), t("notify.streak.body", {remaining: Math.max(0, inf.goal - inf.todayResolved)}))`. In the Task 3 goal-crossing block, when the goal is first met call `syncStreakReminder({ schedule: false, hour: REMINDER_HOUR, cancel: true }, "", "")`. Add the i18n keys.

- [ ] **Step 5: dependency + sync** — `npm i @capacitor/local-notifications` then `npx cap sync android` (run inside `game/`; commit package.json/package-lock and the android/ diff it generates). VERIFICATION LIMIT: on the VPS only unit tests + web-inertness are checkable (probe: web build with the bundle loaded logs no errors and `window.Capacitor` absence short-circuits). Real notification firing is **Jordan's device test** — say so in the report and PR.

- [ ] **Step 6: Full suite + build + commit**

```bash
npm run build && npm test > /tmp/t.txt 2>&1; echo EXIT=$?   # expect 0
git add src/notify.js test/notify.test.js src/native.js src/main.js src/i18n.js package.json package-lock.json android dist/app.js
git commit -m "feat(notify): Android streak-saver local notification (pure plan + native wrapper)"
```

---

### Task 7: PRD amendment — rewarded-video-first

**Files:**
- Modify: `docs/prd/PRD-monetization-and-production.md`

- [ ] **Step 1:** Read the PRD's P1/ads section. Add a dated amendment block at its top (do not delete the original text — strike-through or "superseded" framing, repo convention is archive-don't-delete):

```markdown
> **AMENDMENT 2026-07-09 — rewarded-video-first (supersedes interstitial-first P1).**
> Verified research (docs/planning/2026-07-09-duolingo-comparison.md): Duolingo's ad
> growth format is opt-in rewarded video tied to a resource, and it deliberately
> re-freed paid features to protect the free tier; the "ads only after lessons" rule
> circulating in blogs was refuted. P1 therefore ships rewarded video BEFORE (or
> instead of) interstitials. Placements, in priority order: (1) post-battle coin
> doubler, (2) boss retry, (3) +1 streak freeze (respecting the cap-2 economy from
> the retention pack), (4) timed XP boost. The frequency-cap logic in
> `src/monetization/interstitial-policy.js` applies to whatever format ships —
> generalize its naming to ad-policy when it gets wired. Interstitials, if ever
> added, are P2 and never mid-round. Owner actions (AdMob/RevenueCat registration,
> SDKs) still gate implementation — this amendment changes the order of what gets
> built once they exist, not the gating.
```

- [ ] **Step 2: Commit**

```bash
git add docs/prd/PRD-monetization-and-production.md
git commit -m "docs(prd): monetization P1 pivots to rewarded-video-first (verified research)"
```

---

### Task 8: Full verification + PR

- [ ] **Step 1:** Full suite (real exit code), `node scripts/responsive-sweep.mjs` twice (10/10 — the quests-screen monthly bar and home freeze chip must not regress any viewport gate), and a fresh-profile probe sweep of home/quests/shop screens at 360x640 + 390x844 with screenshots READ for: freeze tile, monthly bar, streak chip, no clipped text EN and TH (`nbhsk.locale='"th"'` pass included).
- [ ] **Step 2:** Push `feat/retention-pack`, PR to `development` titled `feat: retention pack — streak freezes, monthly quest, streak-saver notification, rewarded-first PRD pivot`, body listing per-feature verification + the device-test caveat for notifications. **No self-merge; SHELL bump at release cut.**

---

## Self-Review (done at planning time)

- **Coverage vs approved research list:** freeze economy → Tasks 1–3; monthly quest+badge → Tasks 4–5; streak-saver → Task 6; rewarded-first pivot → Task 7; positioning copy is marketing, not app code — omitted deliberately; leagues/friend-streaks explicitly out of scope (accounts-gated). ✓
- **Type consistency:** `noteActivity(daily, dateStr, count, freezes)` / `freezesUsed` / `streakInfo(daily, dateStr, freezes)` consistent across Tasks 1, 3, 6; `monthKey/noteMonthlyProgress/monthlyStatus/claimMonthly/MONTHLY_TARGET/MONTHLY_REWARD` consistent across Tasks 4–5; `reminderPlan/REMINDER_HOUR/syncStreakReminder` across Task 6. ✓
- **Known open decisions encoded, not hidden:** freeze bypasses the streak≥3 kindness gate (Task 1 Step 1 note); reminder MVP only schedules before 19:00 (Task 6); freeze price 600/cap 2 are launch values (catalog tests pin them). ✓
- **Placeholder scan:** every code step carries literal code; wiring steps name exact anchors (line refs + code patterns) since main.js is wiring-by-design. ✓
