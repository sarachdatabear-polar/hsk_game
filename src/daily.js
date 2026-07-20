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
export function noteActivity(daily, dateStr, count, freezes = 0) {
  // Backward local-date jump guard (timezone travel, clock correction): a
  // dateStr earlier than daily.last must never reset or rewind the streak.
  // Treat it as if it were daily.last itself — same-day accounting, `last`
  // never moves backward. Plain string compare is correct for ISO yyyy-mm-dd.
  const effectiveDate = daily.last && dateStr < daily.last ? daily.last : dateStr;
  const before = daily.today.date === effectiveDate ? daily.today.resolved : 0;
  const resolved = before + count;
  const today = { date: effectiveDate, resolved };
  let { last, streak } = daily;
  let restWeek = daily.restWeek || "";
  let restDay = daily.restDay || "";
  let freezesUsed = 0;
  const crossedNow = before < GOAL && resolved >= GOAL;
  if (crossedNow && last !== effectiveDate) {
    if (isYesterday(last, effectiveDate)) {
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
        while (d && d !== effectiveDate && missed.length < 3) { missed.push(d); d = addDays(d, 1); }
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
    last = effectiveDate;
  }
  return { last, streak, today, restWeek, restDay, freezesUsed };
}

// {streak, todayResolved, goal, goalMet, restNote} for display. The chain
// also reads alive across a single missed day that the week's rest day can
// (or did) cover — so the player never sees a scary 0 before the rest day is
// even consumed. restNote marks the calm "🍵 rest day used" return day.
export function streakInfo(daily, dateStr, freezes = 0) {
  // Backward local-date jump guard: mirrors noteActivity — a dateStr earlier
  // than daily.last is reported as if it were daily.last, never as a fresh
  // gap (which would otherwise walk forward, never reach dateStr, and hit
  // the 3-missed cap, wrongly reporting streak 0).
  const effectiveDate = daily.last && dateStr < daily.last ? daily.last : dateStr;
  const todayResolved = daily.today.date === effectiveDate ? daily.today.resolved : 0;
  const restWeek = daily.restWeek || "";
  const restDay = daily.restDay || "";
  // (a consumed rest day always advances `last` past restDay, so the only
  //  question is whether the missed days' coverage — rest first, then owned
  //  freezes — spans the whole gap; mirrors noteActivity's kindest-first walk)
  const missed = [];
  if (daily.last && daily.last !== effectiveDate && !isYesterday(daily.last, effectiveDate)) {
    let d = addDays(daily.last, 1);
    while (d && d !== effectiveDate && missed.length < 3) { missed.push(d); d = addDays(d, 1); }
  }
  let restUsable = false, uncovered = 0;
  for (const day of missed) {
    if (!restUsable && daily.streak >= 3 && weekStart(day) !== restWeek) restUsable = true;
    else uncovered += 1;
  }
  const coverableGap = daily.last !== "" && missed.length >= 1 && missed.length <= 2 && uncovered <= freezes;
  const chainAlive = daily.last === effectiveDate || isYesterday(daily.last, effectiveDate) || coverableGap;
  return {
    streak: chainAlive ? daily.streak : 0,
    todayResolved,
    goal: GOAL,
    goalMet: todayResolved >= GOAL,
    restNote: restDay !== "" && isYesterday(restDay, effectiveDate),
  };
}
