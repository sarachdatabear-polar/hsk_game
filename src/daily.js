// Daily streak tracking. Pure module: no Date.now()/`new Date()` for "today" —
// callers always pass a "YYYY-MM-DD" date string (local time, see main.js).
export const GOAL = 20;          // words resolved per day to keep the streak alive
const DAY_MS = 86400000;

export function defaultDaily() {
  return { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" };
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
