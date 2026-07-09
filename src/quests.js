// Daily quests. Pure module: no DOM/localStorage/Date.now() — callers always
// pass a "YYYY-MM-DD" date string (local time, see main.js's todayStr()).
"use strict";

// NOTE: the UI renders t("quest.<id>") from src/i18n.js, not `desc` — add a catalog key for any new quest.
export const QUEST_POOL = [
  { id: "correct30", desc: "Answer 30 words correctly",      target: 30, reward: 150 },
  { id: "combo5",    desc: "Reach a ×5 learning streak", target: 5,  reward: 100 },
  { id: "boss1",     desc: "Complete a Review Challenge",      target: 1,  reward: 150 },
  { id: "perfect1",  desc: "Finish a round with no misses",    target: 1,  reward: 250 },
  { id: "review1",   desc: "Play a Smart Review round",        target: 1,  reward: 100 },
  { id: "learn20",   desc: "Mark 20 flashcards as known",       target: 20, reward: 100 },
];

// event name -> quest id it feeds progress into
const EVENT_QUEST = {
  correct: "correct30",
  combo: "combo5",
  boss: "boss1",
  perfect: "perfect1",
  review: "review1",
  learn: "learn20",
};

// combo is a running high-water mark within the round, not an additive count
const HIGH_WATER = new Set(["combo5"]);

// small deterministic string hash (same shape as java.lang.String.hashCode)
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Steps whose cycle length (n / gcd(step, n)) is >= 3 for n = QUEST_POOL.length (6),
// so walking 3 steps from any start always lands on 3 distinct indices.
const STEPS = [1, 2, 4, 5];

export function questsForDate(dateStr) {
  const n = QUEST_POOL.length;
  const h = hashStr(dateStr);
  const start = h % n;
  const step = STEPS[Math.floor(h / n) % STEPS.length];
  const idxs = [];
  let cur = start;
  for (let i = 0; i < 3; i++) { idxs.push(cur); cur = (cur + step) % n; }
  return idxs.map(i => QUEST_POOL[i]);
}

export function defaultQuestState() {
  return { date: "", progress: {}, done: [] };
}

// Returns { state, earned, completed } — a NEW state (no input mutation).
// `earned` is the coin total from any quest(s) that just crossed their target
// in this call; `completed` lists the matching quest objects (for toasts).
export function noteQuestEvent(state, dateStr, eventId, n = 1) {
  const rollover = state.date !== dateStr;
  let progress = rollover ? {} : { ...state.progress };
  let done = rollover ? [] : state.done.slice();
  let earned = 0;
  const completed = [];

  const questId = EVENT_QUEST[eventId];
  const quest = questId && questsForDate(dateStr).find(q => q.id === questId);
  if (quest) {
    const before = progress[quest.id] || 0;
    const raw = HIGH_WATER.has(quest.id) ? Math.max(before, n) : before + n;
    progress[quest.id] = Math.min(raw, quest.target);
    if (progress[quest.id] >= quest.target && !done.includes(quest.id)) {
      done.push(quest.id);
      earned += quest.reward;
      completed.push(quest);
    }
  }

  return { state: { date: dateStr, progress, done }, earned, completed };
}

// Today's 3 quests, each annotated with the player's current progress/done
// flag (0/false if the stored state is from a different date).
export function questStatus(state, dateStr) {
  const sameDay = state.date === dateStr;
  return questsForDate(dateStr).map(q => ({
    ...q,
    progress: sameDay ? (state.progress[q.id] || 0) : 0,
    done: sameDay ? state.done.includes(q.id) : false,
  }));
}

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
