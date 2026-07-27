"use strict";

export const CAT_JOURNEY_VERSION = 2;
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
const idOf = value => typeof value === "string" ? value.trim() : "";
const backgroundIds = new Set(CAT_BACKGROUNDS.map(item => item.id));

function defaultGoalHistory() {
  return { baselineCount: 0, throughDay: "", days: [] };
}

export function defaultCatJourney() {
  return {
    v: CAT_JOURNEY_VERSION,
    selectedBackground: "bg-home",
    selectedBackgroundAt: 0,
    selectedBackgroundDevice: "",
    goalHistory: defaultGoalHistory(),
    lastSeenBondTier: 0,
    claims: [],
  };
}

function normalizeGoalHistory(value) {
  const source = value && typeof value === "object" ? value : {};
  const throughDay = validDay(source.throughDay) ? source.throughDay : "";
  const days = [...new Set(
    (Array.isArray(source.days) ? source.days : [])
      .filter(validDay)
      .filter(day => !throughDay || day > throughDay),
  )].sort();
  return {
    baselineCount: whole(source.baselineCount),
    throughDay,
    days,
  };
}

function normalizeClaim(value) {
  if (!value || typeof value !== "object" || !validDay(value.day)) return null;
  const departedAt = whole(value.departedAt);
  const returnedAt = whole(value.returnedAt);
  if (!departedAt && !returnedAt) return null;
  const readyAt = departedAt
    ? Math.max(departedAt, whole(value.readyAt) || departedAt + JOURNEY_DURATION_MS)
    : 0;
  return {
    day: value.day,
    departedAt,
    readyAt,
    returnedAt: returnedAt ? Math.max(returnedAt, readyAt) : 0,
    destinationId: backgroundIds.has(value.destinationId) ? value.destinationId : "",
    storyId: idOf(value.storyId || value.id),
    keepsakeId: idOf(value.keepsakeId),
    wordKey: idOf(value.wordKey),
  };
}

function earlierPositive(a, b) {
  if (!a) return b;
  if (!b) return a;
  return Math.min(a, b);
}

function mergeDuplicateClaim(a, b) {
  const departedAt = earlierPositive(a.departedAt, b.departedAt);
  const readyAt = earlierPositive(a.readyAt, b.readyAt);
  const returnedAt = earlierPositive(a.returnedAt, b.returnedAt);
  return normalizeClaim({
    day: a.day,
    departedAt,
    readyAt,
    returnedAt,
    destinationId: a.destinationId || b.destinationId,
    storyId: a.storyId || b.storyId,
    keepsakeId: a.keepsakeId || b.keepsakeId,
    wordKey: a.wordKey || b.wordKey,
  });
}

function normalizeClaims(values) {
  const byDay = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    const claim = normalizeClaim(value);
    if (!claim) continue;
    const prior = byDay.get(claim.day);
    byDay.set(claim.day, prior ? mergeDuplicateClaim(prior, claim) : claim);
  }
  return [...byDay.values()].sort((a, b) =>
    a.day.localeCompare(b.day) || a.departedAt - b.departedAt);
}

function migrateV1(source) {
  const claimedDays = [...new Set(
    (Array.isArray(source.claimedDays) ? source.claimedDays : []).filter(validDay),
  )];
  const byDay = new Map(claimedDays.map(day => [day, {
    day,
    departedAt: 0,
    readyAt: 0,
    returnedAt: 1,
    destinationId: "",
    storyId: "",
    keepsakeId: "",
    wordKey: "",
  }]));

  for (const memory of Array.isArray(source.memories) ? source.memories : []) {
    if (!memory || !validDay(memory.day) || !idOf(memory.id)) continue;
    const prior = byDay.get(memory.day) || {};
    byDay.set(memory.day, {
      ...prior,
      day: memory.day,
      returnedAt: whole(prior.returnedAt) || 1,
      storyId: idOf(memory.id),
    });
  }

  const active = source.activeJourney;
  if (active && validDay(active.day) && whole(active.departedAt)) {
    const prior = byDay.get(active.day);
    // A returned memory is stronger than a stale same-day active record. When
    // no memory exists, the active record replaces claimedDays' placeholder.
    if (!prior?.storyId) {
      const departedAt = whole(active.departedAt);
      byDay.set(active.day, {
        day: active.day,
        departedAt,
        readyAt: Math.max(departedAt, whole(active.readyAt) || departedAt + JOURNEY_DURATION_MS),
        returnedAt: 0,
        destinationId: "",
        storyId: "",
        keepsakeId: "",
        wordKey: "",
      });
    }
  }

  return {
    v: CAT_JOURNEY_VERSION,
    selectedBackground: source.selectedBackground,
    selectedBackgroundAt: 0,
    selectedBackgroundDevice: "",
    goalHistory: {
      baselineCount: whole(source.goalDaysCount),
      throughDay: validDay(source.lastGoalDay) ? source.lastGoalDay : "",
      days: [],
    },
    lastSeenBondTier: source.lastSeenBondTier,
    claims: [...byDay.values()],
  };
}

export function normalizeCatJourney(value) {
  const raw = value && typeof value === "object" ? value : {};
  const source = raw.v === CAT_JOURNEY_VERSION || raw.goalHistory || raw.claims
    ? raw
    : migrateV1(raw);
  return {
    v: CAT_JOURNEY_VERSION,
    selectedBackground: backgroundIds.has(source.selectedBackground)
      ? source.selectedBackground : "bg-home",
    selectedBackgroundAt: whole(source.selectedBackgroundAt),
    selectedBackgroundDevice: idOf(source.selectedBackgroundDevice),
    goalHistory: normalizeGoalHistory(source.goalHistory),
    lastSeenBondTier: Math.min(BOND_TIERS.length - 1, whole(source.lastSeenBondTier)),
    claims: normalizeClaims(source.claims),
  };
}

export function goalDaysCountOf(value) {
  const { goalHistory } = normalizeCatJourney(value);
  return goalHistory.baselineCount + goalHistory.days.length;
}

function latestGoalDay(goalHistory) {
  return goalHistory.days[goalHistory.days.length - 1] || goalHistory.throughDay;
}

export function noteGoalDay(value, today, goalMet) {
  const state = normalizeCatJourney(value);
  if (!goalMet || !validDay(today) || (latestGoalDay(state.goalHistory) && today <= latestGoalDay(state.goalHistory))) {
    return state;
  }
  return {
    ...state,
    goalHistory: {
      ...state.goalHistory,
      days: [...state.goalHistory.days, today],
    },
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

export function selectCatBackground(value, id, points, { at = 0, device = "" } = {}) {
  const state = normalizeCatJourney(value);
  if (!unlockedBackgrounds(points).some(item => item.id === id) || state.selectedBackground === id) return state;
  return {
    ...state,
    selectedBackground: id,
    selectedBackgroundAt: whole(at),
    selectedBackgroundDevice: idOf(device),
  };
}

// Keeps one canonical bundled-word key for today's possible journey. Rank 3
// is a word that crossed the mastery threshold, rank 2 is a weak/due recovery,
// and rank 1 is any other correct answer. Equal-rank candidates keep the first
// word so repeated renders/answers cannot churn the eventual memory.
export function chooseJourneyWord(value, {
  wordKey = "", newlyMastered = false, recovered = false,
} = {}) {
  const current = value && typeof value === "object" ? value : {};
  const currentWordKey = idOf(current.wordKey);
  const currentRank = Math.min(3, whole(current.rank));
  const nextWordKey = idOf(wordKey);
  if (!nextWordKey) return { wordKey: currentWordKey, rank: currentRank };
  const nextRank = newlyMastered ? 3 : recovered ? 2 : 1;
  if (currentWordKey && currentRank >= nextRank) {
    return { wordKey: currentWordKey, rank: currentRank };
  }
  return { wordKey: nextWordKey, rank: nextRank };
}

export function activeClaimOf(value) {
  return normalizeCatJourney(value).claims
    .filter(claim => !claim.returnedAt && claim.departedAt)
    .sort((a, b) => a.departedAt - b.departedAt || a.day.localeCompare(b.day))[0] || null;
}

export function memoryRecordsOf(value) {
  return normalizeCatJourney(value).claims
    .filter(claim => claim.returnedAt && (claim.storyId || claim.keepsakeId))
    .map(claim => ({
      id: claim.storyId || claim.keepsakeId,
      day: claim.day,
      storyId: claim.storyId,
      keepsakeId: claim.keepsakeId,
      destinationId: claim.destinationId,
      wordKey: claim.wordKey,
      returnedAt: claim.returnedAt,
    }));
}

function latestClaimDay(state) {
  return state.claims[state.claims.length - 1]?.day || "";
}

export function journeyStatus(value, { today, goalMet = false, now = Date.now() } = {}) {
  const state = normalizeCatJourney(value);
  const active = activeClaimOf(state);
  if (active) return whole(now) >= active.readyAt ? "returned" : "exploring";
  if (validDay(today) && latestClaimDay(state) && today <= latestClaimDay(state)) return "done";
  return goalMet ? "ready" : "needs-goal";
}

export function startCatJourney(value, {
  today, goalMet = false, now = Date.now(), destinationId = "", wordKey = "",
} = {}) {
  const state = normalizeCatJourney(value);
  if (!validDay(today) || journeyStatus(state, { today, goalMet, now }) !== "ready") return state;
  const departedAt = whole(now);
  if (!departedAt) return state;
  return normalizeCatJourney({
    ...state,
    claims: [...state.claims, {
      day: today,
      departedAt,
      readyAt: departedAt + JOURNEY_DURATION_MS,
      returnedAt: 0,
      destinationId,
      storyId: "",
      keepsakeId: "",
      wordKey,
    }],
  });
}

export function completeCatJourney(value, memory, now = Date.now()) {
  const state = normalizeCatJourney(value);
  const active = activeClaimOf(state);
  const at = whole(now);
  if (!active || at < active.readyAt || !memory || typeof memory !== "object") return state;
  const storyId = idOf(memory.storyId || memory.id);
  const keepsakeId = idOf(memory.keepsakeId);
  if (!storyId && !keepsakeId) return state;
  return normalizeCatJourney({
    ...state,
    claims: state.claims.map(claim => claim.day !== active.day ? claim : {
      ...claim,
      returnedAt: Math.max(at, claim.readyAt, 1),
      destinationId: backgroundIds.has(memory.destinationId)
        ? memory.destinationId : claim.destinationId,
      storyId,
      keepsakeId,
      wordKey: idOf(memory.wordKey) || claim.wordKey,
    }),
  });
}

export function minutesUntilReturn(value, now = Date.now()) {
  const active = activeClaimOf(value);
  if (!active) return 0;
  return Math.max(0, Math.ceil((active.readyAt - whole(now)) / 60000));
}

// Pure native-edge plan. The notification layer always cancels id 1003 first,
// then schedules only while a persisted claim is still away and its return is
// in the future. It never asks for permission.
export function journeyReturnNotificationPlan(value, now = Date.now()) {
  const active = activeClaimOf(value);
  const at = active ? active.readyAt : 0;
  return {
    schedule: !!active && at > whole(now),
    cancel: !active || at <= whole(now),
    at,
  };
}
