# Re-engagement Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single "come back" local notification, fired after 3 idle days, for players who have established a streak — closing the retention-pack MVP hole that only reminds players whose streak is still live *today*.

**Architecture:** A pure planner `reengagePlan(info)` in `notify.js` decides *whether* to schedule (any live streak) and *how far out* (3 days). The impure edge `syncReengageReminder()` in `native.js` turns that into a concrete Android local notification on a distinct id (1002), rescheduled for `now + 3 days` on every app sync so it fires only after a genuine 3-day absence. `main.js` wires one call at the existing `visibilitychange` sync point and broadens the foreground permission prompt. EN+TH copy added; Thai flagged for native review.

**Tech Stack:** Vanilla ES modules, esbuild bundle, vitest, `@capacitor/local-notifications` (already installed, v6.1.3).

## Global Constraints

- **Pure modules take no `Date`/`Date.now()`/`new Date()`** — callers/edges supply time; `native.js` is the only place that reads the clock (it already does). (`notify.js` header + `daily.js` convention.)
- **Notifications must never break gameplay** — every native call is wrapped in `try/catch` and no-ops on the web/PWA build (`if (!isNative()) return`). (Existing `native.js` contract.)
- **Native-only feature. No SHELL cache bump** — no web shell surface changes. (`sw.js` bump rule does not apply.)
- **No new npm dependencies.** `@capacitor/local-notifications` is already a dependency.
- **i18n: any key referenced via `t("literal")` must exist in BOTH `STRINGS.en` and `STRINGS.th`** or `test/i18n-usage.test.js` fails. Add keys with (or before) their usage.
- **After changing `src/`, run `npm run build`** — the deployed app uses `dist/app.js`.
- **Notification id map:** `1001` = same-day streak-saver (existing, untouched). `1002` = re-engagement nudge (new). Never reuse 1001.
- **Copy tone:** warm/inviting, never guilt-trippy. Thai strings are DRAFTS flagged for `docs/i18n/i18n-translation-review.md`.

---

### Task 1: `reengagePlan` pure planner (notify.js)

**Files:**
- Modify: `src/notify.js`
- Test: `test/notify.test.js`

**Interfaces:**
- Consumes: `info` = a `streakInfo(...)` result, shape `{ streak, todayResolved, goal, goalMet, restNote }` (from `src/daily.js`).
- Produces: `REENGAGE_DAYS` (number, `3`); `reengagePlan(info) -> { schedule: boolean, afterDays: number, hour: number, streak: number }` (`hour` = the already-exported `REMINDER_HOUR`, so the edge stays hour-agnostic like `syncStreakReminder`).

- [ ] **Step 1: Write the failing tests**

Append to `test/notify.test.js` (note: `REMINDER_HOUR` is already imported at the top of this file by the existing `reminderPlan` tests — do not add a duplicate import; add `reengagePlan` and `REENGAGE_DAYS` to that existing import line):

```js
describe("reengagePlan", () => {
  const info = (streak) => ({ streak, todayResolved: 0, goal: 20, goalMet: false, restNote: false });

  it("schedules a nudge when the player has a live streak", () => {
    expect(reengagePlan(info(5))).toEqual({ schedule: true, afterDays: REENGAGE_DAYS, hour: REMINDER_HOUR, streak: 5 });
  });

  it("does not schedule when there is no streak", () => {
    expect(reengagePlan(info(0)).schedule).toBe(false);
  });

  it("carries the current streak count through for the message", () => {
    expect(reengagePlan(info(12)).streak).toBe(12);
  });

  it("REENGAGE_DAYS is 3", () => {
    expect(REENGAGE_DAYS).toBe(3);
  });
});
```

The existing import line at the top of `test/notify.test.js` becomes:

```js
import { reminderPlan, reengagePlan, REMINDER_HOUR, REENGAGE_DAYS } from "../src/notify.js";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd game && npx vitest run test/notify.test.js`
Expected: FAIL — `reengagePlan is not a function` / `REENGAGE_DAYS` undefined.

- [ ] **Step 3: Implement the planner**

Append to `src/notify.js` (after `reminderPlan`):

```js
export const REENGAGE_DAYS = 3;   // idle days before the "come back" nudge

// Should a lapsed-player "come back" nudge be scheduled, and how far out?
// Pure — no Date; native.js (syncReengageReminder) turns afterDays into a
// concrete fire time. Eligibility: any live streak worth returning for — the
// same cohort the streak-saver permission prompt already covers. Rescheduled
// on every app sync, so it only fires after a genuine multi-day absence.
export function reengagePlan(info /* streakInfo(...) result */) {
  return { schedule: info.streak > 0, afterDays: REENGAGE_DAYS, hour: REMINDER_HOUR, streak: info.streak };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd game && npx vitest run test/notify.test.js`
Expected: PASS (existing `reminderPlan` tests + 4 new `reengagePlan` tests).

- [ ] **Step 5: Commit**

```bash
git add src/notify.js test/notify.test.js
git commit -m "feat(notify): reengagePlan — pure lapsed-streak nudge decision"
```

---

### Task 2: `syncReengageReminder` impure edge (native.js)

**Files:**
- Modify: `src/native.js`

**Interfaces:**
- Consumes: a `reengagePlan(...)` result `{ schedule, afterDays, hour, streak }`. Reads `plan.afterDays` and `plan.hour` — no app constant is imported into `native.js`, exactly like `syncStreakReminder` which reads `plan.hour`.
- Produces: `syncReengageReminder(plan, title, body) -> Promise<void>` (never throws; no-op off native).

**Note:** `native.js` is untested-by-design (impure Capacitor edge), exactly like its `syncStreakReminder` sibling. Verification is `npm run build` + code review, not a unit test.

- [ ] **Step 1: Add the function**

In `src/native.js`, immediately after `syncStreakReminder` (before `requestNotifPermission`), add:

```js
// Lapsed-streak "come back" local notification (re-engagement). Web/PWA: inert.
// Distinct id (1002) from the same-day streak-saver (1001) so the two never
// cancel each other. Rescheduled on every sync for `afterDays` out at 19:00
// local, so it only fires if the player is genuinely absent that long. Like
// syncStreakReminder it only CHECKS the existing grant — the foreground prompt
// lives in main.js.
export async function syncReengageReminder(plan, title, body) {
  if (!isNative()) return;
  const LN = plugins().LocalNotifications;
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: 1002 }] });
    if (!plan.schedule) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const at = new Date();
    at.setDate(at.getDate() + plan.afterDays);
    at.setHours(plan.hour, 0, 0, 0);   // civilized time (REMINDER_HOUR via the plan), not a raw +72h stamp
    await LN.schedule({ notifications: [{ id: 1002, title, body, schedule: { at } }] });
  } catch (e) { /* notification failure must never break gameplay */ }
}
```

- [ ] **Step 2: Verify the bundle builds**

Run: `cd game && npm run build`
Expected: esbuild completes with no errors; `dist/app.js` regenerated.

- [ ] **Step 3: Commit**

```bash
git add src/native.js dist/app.js
git commit -m "feat(native): syncReengageReminder — schedule the day-3 come-back nudge (id 1002)"
```

---

### Task 3: i18n copy + main.js wiring

**Files:**
- Modify: `src/i18n.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `reengagePlan` (Task 1), `syncReengageReminder` (Task 2); existing `streakInfo`, `reminderPlan`, `requestNotifPermission`, `t`.
- Produces: keys `notify.comeback.title` / `notify.comeback.body` in both locales; a `syncReengageReminder` call at the `visibilitychange` sync; a broadened permission prompt.

- [ ] **Step 1: Add the EN copy**

In `src/i18n.js`, in the `en` block, immediately after the `"notify.streak.body": ...` line, add:

```js
    "notify.comeback.title": "Your lucky cat misses you 🐱",
    "notify.comeback.body": "Your {n}-day streak is waiting — one quick Word Quest brings it back.",
```

- [ ] **Step 2: Add the TH copy (draft — flag for native review)**

In `src/i18n.js`, in the `th` block, immediately after the `"notify.streak.body": ...` line, add:

```js
    "notify.comeback.title": "เจ้าแมวนำโชคคิดถึงคุณนะ 🐱",
    "notify.comeback.body": "สตรีค {n} วันของคุณรออยู่ — เล่นภารกิจคำศัพท์สั้น ๆ ก็กลับมาได้เลย",
```

- [ ] **Step 3: Import `reengagePlan` in main.js**

In `src/main.js`, change the notify import (currently `import { REMINDER_HOUR, reminderPlan } from "./notify.js";`) to:

```js
import { REMINDER_HOUR, reminderPlan, reengagePlan } from "./notify.js";
```

And add `syncReengageReminder` to the native.js import (currently ends `... syncStreakReminder, requestNotifPermission } from "./native.js";`):

```js
import { initNative, hapticKill, hapticWrong, keepAwake, syncStreakReminder, syncReengageReminder, requestNotifPermission } from "./native.js";
```

- [ ] **Step 4: Wire the re-engage sync at `visibilitychange`**

In `src/main.js`, in the `document.addEventListener("visibilitychange", ...)` hide branch, immediately after the existing `syncStreakReminder(plan, ...)` call, add:

```js
    syncReengageReminder(reengagePlan(inf),
      t("notify.comeback.title", { n: inf.streak }),
      t("notify.comeback.body", { n: inf.streak }));
```

(`inf` and `plan` are already in scope from the existing block.)

- [ ] **Step 5: Broaden the foreground permission prompt**

In `src/main.js`, find:

```js
  if(!notifPermAsked && reminderPlan(info, new Date().getHours()).schedule){
```

Replace that condition with:

```js
  if(!notifPermAsked && (reminderPlan(info, new Date().getHours()).schedule || reengagePlan(info).schedule)){
```

- [ ] **Step 6: Run the full suite + build**

Run: `cd game && npm test && npm run build`
Expected: all tests PASS (notably `test/i18n-usage.test.js` now sees `notify.comeback.*` referenced via `t(...)` and finds both locales), bundle rebuilds.

- [ ] **Step 7: Commit**

```bash
git add src/i18n.js src/main.js dist/app.js
git commit -m "feat(notify): wire day-3 re-engagement nudge + EN/TH copy (TH pending native review)"
```

---

### Task 4: Final verification + PR

**Files:** none (verification + integration).

- [ ] **Step 1: Confirm the whole suite + build are green**

Run: `cd game && npm test && npm run build`
Expected: full vitest suite PASS, `npm run build` clean. (Do NOT pipe to tail/grep — never mask the exit code.)

- [ ] **Step 2: Add the Thai strings to the native-review queue**

Append `notify.comeback.title` / `notify.comeback.body` to the pending list in `docs/i18n/i18n-translation-review.md` (retention/notification section) so the drafted Thai is not mistaken for reviewed. Commit:

```bash
git add docs/i18n/i18n-translation-review.md
git commit -m "docs(i18n): queue notify.comeback.* Thai for native review"
```

- [ ] **Step 3: Push and open the PR to `development`**

```bash
git push -u origin feat/reengage-notification
gh pr create --base development --title "Re-engagement notification (lapsed-streak day-3 nudge)" --body "Adds a single 'come back' local notification, 3 idle days out, for players with an established streak. Closes the retention-pack MVP hole (streak-saver only reminded live-streak-today players). Pure reengagePlan() + native.js edge on notification id 1002; EN/TH copy (TH queued for native review). Native-only, no SHELL bump. Design + plan: docs/planning/2026-07-13-reengagement-notification-{design,plan}.md"
```

---

## Self-Review

**Spec coverage:**
- §4.1 pure `reengagePlan` → Task 1 ✓
- §4.2 `syncReengageReminder` id 1002, perm-check-only, 7pm/afterDays → Task 2 ✓
- §4.3 main.js sync call + permission broadening → Task 3 steps 3–5 ✓
- §4.4 EN+TH copy, TH flagged → Task 3 steps 1–2 + Task 4 step 2 ✓
- §6 testing (notify tests; native untested-by-design; full test+build) → Tasks 1 & 4 ✓
- §7 guardrails (native-only, no widget, no push, no SHELL bump) → Global Constraints ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type consistency:** `reengagePlan` returns `{ schedule, afterDays, hour, streak }` in Task 1 and is consumed identically in Task 2 (`plan.schedule`, `plan.afterDays`, `plan.hour`) and Task 3 (`reengagePlan(inf)`). Notification id `1002` consistent across Task 2 and constraints. `REENGAGE_DAYS = 3` and `hour: REMINDER_HOUR` consistent. ✓

**Note on `REMINDER_HOUR`:** carried through the plan object (`reengagePlan` sets `hour: REMINDER_HOUR`; `syncReengageReminder` reads `plan.hour`), so the impure edge imports no app constant — identical to how `syncStreakReminder` consumes `plan.hour`. No magic number in `native.js`. ✓
