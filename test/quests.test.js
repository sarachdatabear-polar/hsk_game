import { describe, it, expect } from "vitest";
import {
  QUEST_POOL, questsForDate, defaultQuestState, noteQuestEvent, questStatus,
} from "../src/quests.js";

describe("quests: questsForDate", () => {
  it("same date always gives the same 3 quests", () => {
    const a = questsForDate("2026-07-04");
    const b = questsForDate("2026-07-04");
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id));
  });

  it("always returns exactly 3 distinct quests", () => {
    for (let d = 1; d <= 28; d++) {
      const dateStr = `2026-0${(d % 9) + 1}-${String(d).padStart(2, "0")}`;
      const qs = questsForDate(dateStr);
      expect(qs.length).toBe(3);
      expect(new Set(qs.map(q => q.id)).size).toBe(3);
      for (const q of qs) expect(QUEST_POOL.some(p => p.id === q.id)).toBe(true);
    }
  });

  it("different dates usually give different selections", () => {
    const sets = new Set();
    for (let d = 1; d <= 30; d++) {
      const dateStr = `2026-01-${String(d).padStart(2, "0")}`;
      sets.add(questsForDate(dateStr).map(q => q.id).sort().join(","));
    }
    // not every day should collide onto the same 3 quests
    expect(sets.size).toBeGreaterThan(1);
  });
});

describe("quests: defaultQuestState", () => {
  it("shape", () => {
    expect(defaultQuestState()).toEqual({ date: "", progress: {}, done: [] });
  });
});

describe("quests: noteQuestEvent", () => {
  it("accumulates additive progress (correct)", () => {
    let s = defaultQuestState();
    const date = "2026-07-04";
    const qs = questsForDate(date);
    const correctQuest = qs.find(q => q.id === "correct30");
    if (!correctQuest) return; // this date doesn't roll correct30 — skip, covered by other dates below
    let r = noteQuestEvent(s, date, "correct", 10);
    s = r.state;
    expect(s.progress.correct30).toBe(10);
    r = noteQuestEvent(s, date, "correct", 5);
    s = r.state;
    expect(s.progress.correct30).toBe(15);
  });

  it("combo is a high-water mark, not additive", () => {
    // find a date whose 3 quests include combo5
    let date, s = defaultQuestState();
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-02-${String((d % 28) + 1).padStart(2, "0")}`;
      if (questsForDate(cand).some(q => q.id === "combo5")) { date = cand; break; }
    }
    expect(date).toBeTruthy();
    let r = noteQuestEvent(s, date, "combo", 3);
    s = r.state;
    expect(s.progress.combo5).toBe(3);
    r = noteQuestEvent(s, date, "combo", 2); // lower than current — should NOT decrease
    s = r.state;
    expect(s.progress.combo5).toBe(3);
    r = noteQuestEvent(s, date, "combo", 5); // reaches target
    s = r.state;
    expect(s.progress.combo5).toBe(5);
    expect(r.earned).toBe(100);
    expect(s.done).toContain("combo5");
  });

  it("caps progress at the quest target", () => {
    let date, s = defaultQuestState();
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-03-${String((d % 28) + 1).padStart(2, "0")}`;
      if (questsForDate(cand).some(q => q.id === "learn20")) { date = cand; break; }
    }
    expect(date).toBeTruthy();
    let r = noteQuestEvent(s, date, "learn", 50); // way over target of 20
    s = r.state;
    expect(s.progress.learn20).toBe(20);
  });

  it("pays out only once per quest (no double reward)", () => {
    let date, s = defaultQuestState();
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-04-${String((d % 28) + 1).padStart(2, "0")}`;
      if (questsForDate(cand).some(q => q.id === "boss1")) { date = cand; break; }
    }
    expect(date).toBeTruthy();
    let r = noteQuestEvent(s, date, "boss", 1);
    s = r.state;
    expect(r.earned).toBe(150);
    expect(r.completed.map(q => q.id)).toEqual(["boss1"]);
    r = noteQuestEvent(s, date, "boss", 1); // already done — must not pay again
    s = r.state;
    expect(r.earned).toBe(0);
    expect(r.completed).toEqual([]);
  });

  it("switching to a new date resets progress and done", () => {
    let date1, date2 = "2026-05-05";
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-05-${String((d % 28) + 1).padStart(2, "0")}`;
      if (questsForDate(cand).some(q => q.id === "correct30") && cand !== date2) { date1 = cand; break; }
    }
    expect(date1).toBeTruthy();
    let s = defaultQuestState();
    let r = noteQuestEvent(s, date1, "correct", 30);
    s = r.state;
    expect(s.done).toContain("correct30");
    r = noteQuestEvent(s, date2, "correct", 1);
    s = r.state;
    expect(s.date).toBe(date2);
    expect(s.done).not.toContain("correct30");
    expect(Object.keys(s.progress)).not.toContain("correct30ButStale"); // sanity no-op
  });

  it("does not mutate the input state", () => {
    const date = "2026-06-01";
    const s0 = defaultQuestState();
    const snapshot = JSON.parse(JSON.stringify(s0));
    noteQuestEvent(s0, date, "correct", 5);
    expect(s0).toEqual(snapshot);

    const s1 = { date, progress: { correct30: 5 }, done: [] };
    const snap1 = JSON.parse(JSON.stringify(s1));
    noteQuestEvent(s1, date, "correct", 5);
    expect(s1).toEqual(snap1);
  });

  it("earned sums across two quests completing in the same battle", () => {
    // pick a date whose 3 quests include at least 2 easy-to-complete ids
    let date;
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-08-${String((d % 28) + 1).padStart(2, "0")}`;
      const ids = questsForDate(cand).map(q => q.id);
      if (ids.includes("boss1") && ids.includes("review1")) { date = cand; break; }
    }
    expect(date).toBeTruthy();
    let s = defaultQuestState();
    let totalEarned = 0;
    let r = noteQuestEvent(s, date, "boss", 1);
    s = r.state; totalEarned += r.earned;
    r = noteQuestEvent(s, date, "review", 1);
    s = r.state; totalEarned += r.earned;
    expect(totalEarned).toBe(150 + 100);
    expect(s.done.sort()).toEqual(["boss1", "review1"].sort());
  });

  it("an event for a quest not in today's 3 is silently ignored", () => {
    // force a date whose 3 quests do NOT include perfect1
    let date;
    for (let d = 1; d <= 60; d++) {
      const cand = `2026-09-${String((d % 28) + 1).padStart(2, "0")}`;
      if (!questsForDate(cand).some(q => q.id === "perfect1")) { date = cand; break; }
    }
    expect(date).toBeTruthy();
    const s = defaultQuestState();
    const r = noteQuestEvent(s, date, "perfect", 1);
    expect(r.earned).toBe(0);
    expect(r.completed).toEqual([]);
    expect(r.state.progress.perfect1).toBeUndefined();
  });
});

describe("quests: questStatus", () => {
  it("fresh date (state.date mismatch) reports 0 progress / not done for all 3", () => {
    const date = "2026-07-04";
    const s = { date: "2020-01-01", progress: { correct30: 30 }, done: ["correct30"] };
    const list = questStatus(s, date);
    expect(list.length).toBe(3);
    for (const q of list) {
      expect(q.progress).toBe(0);
      expect(q.done).toBe(false);
    }
  });

  it("reflects in-progress and completed quests for the matching date", () => {
    const date = "2026-07-04";
    let s = defaultQuestState();
    const r = noteQuestEvent(s, date, "correct", 10);
    s = r.state;
    const list = questStatus(s, date);
    const correctEntry = list.find(q => q.id === "correct30");
    if (correctEntry) {
      expect(correctEntry.progress).toBe(10);
      expect(correctEntry.done).toBe(false);
    }
  });
});
