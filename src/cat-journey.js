"use strict";

export const CAT_JOURNEY_VERSION = 1;
export const JOURNEY_DURATION_MS = 20 * 60 * 1000;

export const CAT_BACKGROUNDS = Object.freeze([
  { id: "bg-home", file: "bg-home.webp", unlockPoints: 0, nameKey: "cat.bg.home" },
  { id: "bg-cat-garden-v1", file: "bg-cat-garden-v1.webp", unlockPoints: 15, nameKey: "cat.bg.garden" },
  { id: "bg-cat-market-v1", file: "bg-cat-market-v1.webp", unlockPoints: 40, nameKey: "cat.bg.market" },
  { id: "bg-cat-lantern-v1", file: "bg-cat-lantern-v1.webp", unlockPoints: 85, nameKey: "cat.bg.lantern" },
  { id: "bg-cat-scholar-gate-v1", file: "bg-cat-scholar-gate-v1.webp", unlockPoints: 150, nameKey: "cat.bg.scholar" },
]);

export const BOND_TIERS = Object.freeze([
  { id: "study-buddy", points: 0, nameKey: "cat.tier.studyBuddy" },
  { id: "curious-paws", points: 15, nameKey: "cat.tier.curiousPaws" },
  { id: "neighborhood-explorer", points: 40, nameKey: "cat.tier.explorer" },
  { id: "lantern-friend", points: 85, nameKey: "cat.tier.lanternFriend" },
  { id: "scholar-cat", points: 150, nameKey: "cat.tier.scholarCat" },
]);

const validDay = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const whole = value => Math.max(0, Math.floor(Number(value) || 0));
const backgroundIds = new Set(CAT_BACKGROUNDS.map(item => item.id));

export function defaultCatJourney() {
  return {
    v: CAT_JOURNEY_VERSION,
    selectedBackground: "bg-home",
    goalDaysCount: 0,
    lastGoalDay: "",
    lastSeenBondTier: 0,
    claimedDays: [],
    activeJourney: null,
    memories: [],
  };
}

export function normalizeCatJourney(value) {
  const source = value && typeof value === "object" ? value : {};
  const claimedDays = [...new Set(
    (Array.isArray(source.claimedDays) ? source.claimedDays : []).filter(validDay),
  )].sort().slice(-45);
  const seenDays = new Set();
  const memories = [];
  for (const item of Array.isArray(source.memories) ? source.memories : []) {
    if (!item || typeof item.id !== "string" || !validDay(item.day) || seenDays.has(item.day)) continue;
    seenDays.add(item.day);
    memories.push({ id: item.id, day: item.day });
  }
  memories.sort((a, b) => a.day.localeCompare(b.day));

  let activeJourney = null;
  const active = source.activeJourney;
  if (active && validDay(active.day)) {
    const departedAt = whole(active.departedAt);
    const readyAt = Math.max(departedAt, whole(active.readyAt));
    if (departedAt > 0) activeJourney = { day: active.day, departedAt, readyAt };
  }

  return {
    v: CAT_JOURNEY_VERSION,
    selectedBackground: backgroundIds.has(source.selectedBackground)
      ? source.selectedBackground : "bg-home",
    goalDaysCount: whole(source.goalDaysCount),
    lastGoalDay: validDay(source.lastGoalDay) ? source.lastGoalDay : "",
    lastSeenBondTier: Math.min(BOND_TIERS.length - 1, whole(source.lastSeenBondTier)),
    claimedDays,
    activeJourney,
    memories: memories.slice(-120),
  };
}

export function noteGoalDay(value, today, goalMet) {
  const state = normalizeCatJourney(value);
  if (!goalMet || !validDay(today) || (state.lastGoalDay && today <= state.lastGoalDay)) return state;
  return {
    ...state,
    goalDaysCount: state.goalDaysCount + 1,
    lastGoalDay: today,
  };
}

export function bondPointsOf({ masteredWords = 0, totalXp = 0, dailyGoalDays = 0 } = {}) {
  return whole(masteredWords) + Math.floor(whole(totalXp) / 100) + whole(dailyGoalDays) * 2;
}

export function bondProgressOf(points) {
  const total = whole(points);
  let index = 0;
  for (let i = 1; i < BOND_TIERS.length; i++) {
    if (total < BOND_TIERS[i].points) break;
    index = i;
  }
  const current = BOND_TIERS[index];
  const next = BOND_TIERS[index + 1] || null;
  const into = total - current.points;
  const need = next ? next.points - current.points : 0;
  return {
    current,
    next,
    points: total,
    into,
    need,
    pct: next ? Math.min(100, Math.round((100 * into) / need)) : 100,
  };
}

export function unlockedBackgrounds(points) {
  const total = whole(points);
  return CAT_BACKGROUNDS.filter(item => item.unlockPoints <= total);
}

export function selectCatBackground(value, id, points) {
  const state = normalizeCatJourney(value);
  if (!unlockedBackgrounds(points).some(item => item.id === id)) return state;
  return { ...state, selectedBackground: id };
}

export function journeyStatus(value, { today, goalMet = false, now = Date.now() } = {}) {
  const state = normalizeCatJourney(value);
  if (state.activeJourney) {
    return whole(now) >= state.activeJourney.readyAt ? "returned" : "exploring";
  }
  if (validDay(today) && state.claimedDays.includes(today)) return "done";
  return goalMet ? "ready" : "needs-goal";
}

export function startCatJourney(value, { today, goalMet = false, now = Date.now() } = {}) {
  const state = normalizeCatJourney(value);
  if (!validDay(today) || journeyStatus(state, { today, goalMet, now }) !== "ready") return state;
  const departedAt = whole(now);
  return {
    ...state,
    claimedDays: [...new Set([...state.claimedDays, today])].sort().slice(-45),
    activeJourney: {
      day: today,
      departedAt,
      readyAt: departedAt + JOURNEY_DURATION_MS,
    },
  };
}

export function completeCatJourney(value, memory, now = Date.now()) {
  const state = normalizeCatJourney(value);
  if (!state.activeJourney || whole(now) < state.activeJourney.readyAt) return state;
  if (!memory || typeof memory.id !== "string") return state;
  const day = state.activeJourney.day;
  const memories = state.memories.filter(item => item.day !== day);
  memories.push({ id: memory.id, day });
  memories.sort((a, b) => a.day.localeCompare(b.day));
  return {
    ...state,
    activeJourney: null,
    memories: memories.slice(-120),
  };
}

export function minutesUntilReturn(value, now = Date.now()) {
  const state = normalizeCatJourney(value);
  if (!state.activeJourney) return 0;
  return Math.max(0, Math.ceil((state.activeJourney.readyAt - whole(now)) / 60000));
}
