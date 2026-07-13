# Design — Lapsed-streak re-engagement notification

**Date:** 2026-07-13
**Status:** Approved design, pre-implementation
**Author:** Claude (brainstormed with Jordan)

## 1. Why

The retention pack (PRs #70–71) shipped a same-day streak-saver local notification
(`notify.js` / `native.js` / wired in `main.js`, tested, EN+TH). Its scheduling rule
has a deliberate MVP hole, stated in its own comment:

```js
const schedule = info.streak > 0 && !info.goalMet && hourNow < REMINDER_HOUR;
```

It only reminds a player **who still has a live streak *today***. It does nothing for
the person you most want back: the one who has gone quiet and whose streak is about to
lapse (or has lapsed). This design adds one **re-engagement nudge** for that lapsed
player — the highest-value, fully-unblocked, self-contained slice left in the
notification space, building directly on infrastructure that already exists and is tested.

Directly targets D1/D7 return, the metric post-release observation cares about but the
app cannot currently measure.

## 2. Decisions locked (with Jordan)

1. **Cadence:** a *single* nudge at **3 idle days** (not a day-3 + day-7 ladder). Simplest,
   least spammy, covers the biggest drop-off window. A later day-7 rung is deferred until
   there is data to justify it.
2. **Eligibility:** **only players who have established a streak** (`streak > 0`), not
   one-session bouncers. The nudge feels *earned*, never nags a 30-second tryer, and — key —
   this is the **exact cohort the existing permission prompt already covers**, so it needs
   **zero new permission plumbing**.

## 3. Key mechanism insight

Local notifications can only be scheduled *while the app is open*. Rather than storing a
"last active" timestamp, we **reschedule the nudge for `now + 3 days` on every sync**
(the app already re-syncs the streak reminder on every `visibilitychange`/hide). Each
session bumps the nudge forward; it therefore fires **only if the player is genuinely
absent for 3 full days**. "Last active + 3 days" falls out for free — no new storage.

## 4. Components

### 4.1 `src/notify.js` (pure decision)

Add a pure planner beside `reminderPlan`:

```js
export const REENGAGE_DAYS = 3;

// Should a "come back" nudge exist, and how far out? Pure — no Date; native.js
// turns afterDays into a concrete fire time. Eligibility: any live streak
// worth returning for. Same cohort the streak-saver permission prompt covers.
export function reengagePlan(info /* streakInfo(...) result */) {
  return { schedule: info.streak > 0, afterDays: REENGAGE_DAYS, streak: info.streak };
}
```

### 4.2 `src/native.js` (impure edge)

Add `syncReengageReminder(plan, title, body)`, mirroring `syncStreakReminder` but on a
**distinct notification id `1002`** (1001 remains the same-day streak reminder — no
collision). Behaviour:

- `LN.cancel({ notifications: [{ id: 1002 }] })` first (so every sync re-bumps it).
- If `!plan.schedule` → return after cancel (a lapsed/lost streak with `streak === 0`
  simply won't (re)schedule).
- `checkPermissions()`; only schedule if `display === 'granted'` (never prompts here —
  the foreground prompt stays in `main.js`, same contract as `syncStreakReminder`).
- Fire time: **`today + afterDays` days at `REMINDER_HOUR` (19:00 local)** — a civilized
  hour, not a raw `+72h` timestamp that could land at 3am. Reuses `REMINDER_HOUR`.
- Wrapped in `try/catch` — a notification failure must never break gameplay (existing
  contract).

### 4.3 `src/main.js` (wiring)

- At the existing `visibilitychange`/hide sync block (next to the `syncStreakReminder`
  call), add one `syncReengageReminder(plan, t("notify.comeback.title", { n: inf.streak }),
  t("notify.comeback.body", { n: inf.streak }))` call. The streak count is baked into the
  message at schedule time (notification text is fixed once scheduled).
- **Broaden the permission prompt** minimally: today it asks when
  `reminderPlan(info, hour).schedule` is true. Change to ask when **either**
  `reminderPlan(...).schedule` **or** `reengagePlan(info).schedule` is true. Closes the
  edge case of a player who only ever plays after 19:00 (never triggered the streak-saver
  prompt) but is still re-engagement-eligible. Near-free, strictly better.

### 4.4 i18n (`src/i18n.js`)

Add EN + TH keys. Tone: warm and inviting, never guilt-trippy.

- `notify.comeback.title` — EN: `"Your lucky cat misses you 🐱"`
- `notify.comeback.body` — EN: `"Your {n}-day streak is waiting — one quick Word Quest brings it back."`
- Thai: drafted below, **flagged for the native-Thai review queue**
  (`docs/i18n/i18n-translation-review.md`) — not treated as final.
  - `notify.comeback.title` — TH: `"เจ้าแมวนำโชคคิดถึงคุณนะ 🐱"`
  - `notify.comeback.body` — TH: `"สตรีค {n} วันของคุณรออยู่ — เล่นภารกิจคำศัพท์สั้น ๆ ก็กลับมาได้เลย"`

## 5. Data flow

```
streakInfo(daily, todayStr, freezes)
  → reengagePlan(info)                     // pure: { schedule: streak>0, afterDays:3, streak }
    → syncReengageReminder(plan, title, body)   // impure edge, id 1002
      → schedules 7pm, 3 days out  (bumped forward on every session)
        → fires only after 3 idle days
```

## 6. Testing

- `test/notify.test.js`: add `reengagePlan` cases — schedules iff `streak > 0`; carries
  `afterDays === REENGAGE_DAYS` and the `streak` count through.
- `src/native.js` stays untested-by-design, exactly like its `syncStreakReminder` sibling;
  the pure decision it acts on is what carries the tests.
- Gate: focused `notify` tests → full `npm test` → `npm run build`.

## 7. Scope guardrails (YAGNI / non-goals)

- **Native-only** (matches the existing streak reminder). No PWA/web push.
- **Single nudge** at 3 days. No day-7 rung.
- **No Android home-screen widget** (the other half of the "notifications/widget" roadmap
  item) — heavy native Kotlin work with only emulator validation available; deferred.
- **No new analytics/tracking.**
- **No SHELL cache bump** — native-only change, no web shell surface affected.

## 8. Acceptance

- A player with a live streak who backgrounds the app has notification id 1002 scheduled
  for 19:00 three days out (verified by unit-tested `reengagePlan` + code review of the
  `native.js` edge; the native fire itself is validated on the emulator with the next
  Android cut, not a web-release blocker).
- Returning within 3 days cancels/re-bumps the nudge (it never fires for an active player).
- A player who has never held a streak never schedules it.
- `npm test` and `npm run build` green.
