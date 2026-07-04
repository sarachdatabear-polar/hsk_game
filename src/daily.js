// Daily streak tracking. Pure module: no Date.now()/`new Date()` for "today" —
// callers always pass a "YYYY-MM-DD" date string (local time, see main.js).
export const GOAL = 20;          // words resolved per day to keep the streak alive
const DAY_MS = 86400000;

export function defaultDaily() {
  return { last: "", streak: 0, today: { date: "", resolved: 0 } };
}

// a is exactly one calendar day before b. UTC-safe: parses "YYYY-MM-DD" as
// UTC midnight so there's no local-timezone/DST drift across month/year
// boundaries.
export function isYesterday(a, b) {
  if (!a || !b) return false;
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  if (isNaN(da) || isNaN(db)) return false;
  return db.getTime() - da.getTime() === DAY_MS;
}

// Returns a NEW daily object with `count` added to today's resolved total.
// Never mutates `daily`. Resets today's bucket if the stored date differs
// from dateStr. Streak increments (at most once per day) the moment today's
// resolved total first reaches GOAL.
export function noteActivity(daily, dateStr, count) {
  const before = daily.today.date === dateStr ? daily.today.resolved : 0;
  const resolved = before + count;
  const today = { date: dateStr, resolved };
  let { last, streak } = daily;
  const crossedNow = before < GOAL && resolved >= GOAL;
  if (crossedNow && last !== dateStr) {
    streak = isYesterday(last, dateStr) ? streak + 1 : 1;
    last = dateStr;
  }
  return { last, streak, today };
}

// {streak, todayResolved, goal, goalMet} for display. `streak` reads 0 if the
// chain is broken (last completed day is neither today nor yesterday).
export function streakInfo(daily, dateStr) {
  const todayResolved = daily.today.date === dateStr ? daily.today.resolved : 0;
  const chainAlive = daily.last === dateStr || isYesterday(daily.last, dateStr);
  return {
    streak: chainAlive ? daily.streak : 0,
    todayResolved,
    goal: GOAL,
    goalMet: todayResolved >= GOAL,
  };
}
