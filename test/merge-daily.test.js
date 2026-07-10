import { describe, it, expect } from "vitest";
import { mergeDaily, mergeAll } from "../src/merge.js";

const d = (last, streak, today = { date: "", resolved: 0 }, restWeek = "", restDay = "") =>
  ({ last, streak, today, restWeek, restDay });

describe("mergeDaily", () => {
  it("fresh device joining a live chain extends it", () => {
    // cloud: 10-day streak ending yesterday; local: crossed goal today, streak 1
    const local = d("2026-07-10", 1, { date: "2026-07-10", resolved: 25 });
    const cloud = d("2026-07-09", 10);
    const m = mergeDaily(local, cloud);
    expect(m.streak).toBe(11);
    expect(m.last).toBe("2026-07-10");
  });
  it("two-day-newer chain connects when within N's span", () => {
    const local = d("2026-07-10", 2);          // covers 07-09..07-10
    const cloud = d("2026-07-08", 10);         // abuts
    expect(mergeDaily(local, cloud).streak).toBe(12);
  });
  it("disconnected old chain does NOT resurrect", () => {
    const local = d("2026-07-10", 1);
    const cloud = d("2026-06-01", 50);
    expect(mergeDaily(local, cloud)).toMatchObject({ last: "2026-07-10", streak: 1 });
  });
  it("same last: larger streak wins, no double count", () => {
    const a = d("2026-07-10", 6), b = d("2026-07-10", 5);
    expect(mergeDaily(a, b).streak).toBe(6);
    expect(mergeDaily(b, a).streak).toBe(6);
  });
  it("overlapping divergence never exceeds true chain", () => {
    // shared chain of 5 synced earlier; A played 07-10 (6), B stopped at 07-09 (5)
    const a = d("2026-07-10", 6), b = d("2026-07-09", 5);
    expect(mergeDaily(a, b).streak).toBe(6);
  });
  it("today: same date takes max resolved, never sums", () => {
    const a = d("2026-07-10", 1, { date: "2026-07-10", resolved: 12 });
    const b = d("2026-07-10", 1, { date: "2026-07-10", resolved: 19 });
    expect(mergeDaily(a, b).today).toEqual({ date: "2026-07-10", resolved: 19 });
  });
  it("today: newer date wins across dates", () => {
    const a = d("2026-07-09", 3, { date: "2026-07-09", resolved: 30 });
    const b = d("2026-07-10", 4, { date: "2026-07-10", resolved: 2 });
    expect(mergeDaily(a, b).today).toEqual({ date: "2026-07-10", resolved: 2 });
  });
  it("empty sides normalize", () => {
    expect(mergeDaily(null, null)).toEqual(
      { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" });
    const only = d("2026-07-10", 3, { date: "2026-07-10", resolved: 21 }, "2026-07-06", "2026-07-07");
    expect(mergeDaily(only, undefined)).toEqual(only);
    expect(mergeDaily(undefined, only)).toEqual(only);
  });
});

describe("mergeAll", () => {
  const local = {
    mastery: { "你": { s: 2, k: 2, r: 2, ls: 100 } }, xp: 50,
    daily: d("2026-07-10", 1, { date: "2026-07-10", resolved: 20 }),
    quests: { date: "2026-07-10", progress: {}, done: [] },
    monthly: { month: "2026-07", done: 2, claimed: false },
    wallet: 700, freezes: 1,
    shop: { owned: ["a"], skin: "a", backdrop: "", effect: "", soundpack: "", tiers: {} },
    stickers: { earned: {}, queue: [] },
    best: { k1: { score: 10, date: "2026-07-10" } },
  };
  it("null cloud returns normalized local (baseline identity)", () => {
    const m = mergeAll(local, null, { shopDirty: false });
    expect(m.xp).toBe(50);
    expect(m.wallet).toBe(700);
    expect(m.daily.streak).toBe(1);
    expect(Object.keys(m).sort()).toEqual(
      ["best","daily","freezes","mastery","monthly","quests","shop","stickers","wallet","xp"]);
  });
  it("cloud contributions fold in", () => {
    const cloud = { ...local, xp: 900, wallet: 100,
      daily: d("2026-07-09", 7), best: {}, mastery: {}, stickers: { earned: { s9: "2026-07-01" } } };
    const m = mergeAll(local, cloud, { shopDirty: false });
    expect(m.xp).toBe(900);
    expect(m.wallet).toBe(700);
    expect(m.daily.streak).toBe(8);
    expect(m.stickers.earned).toEqual({ s9: "2026-07-01" });
    expect(m.stickers.queue).toEqual([]);   // never announced from cloud
  });
});
