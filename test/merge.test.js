import { describe, it, expect } from "vitest";
import { SYNC_KEYS, defaultSyncMeta, mergeXp, mergeWallet, mergeFreezes,
         mergeBest, mergeStickers, mergeShop, mergeMastery, mergeQuests,
         mergeMonthly, staleMonthlyOwed, mergeAll } from "../src/merge.js";

describe("merge: scalars", () => {
  it("SYNC_KEYS lists the 10 synced keys", () =>
    expect(SYNC_KEYS).toEqual(["mastery","xp","daily","quests","monthly","wallet","freezes","shop","stickers","best"]));
  it("defaultSyncMeta shape", () =>
    expect(defaultSyncMeta()).toEqual({ dirty: {}, lastSyncAt: 0 }));
  it("xp/wallet take max; nullish sides are 0", () => {
    expect(mergeXp(120, 80)).toBe(120);
    expect(mergeXp(undefined, 80)).toBe(80);
    expect(mergeWallet(500, 900)).toBe(900);
    expect(mergeWallet(null, null)).toBe(0);
  });
  it("freezes take max clamped 0–2", () => {
    expect(mergeFreezes(1, 2)).toBe(2);
    expect(mergeFreezes(9, 0)).toBe(2);
    expect(mergeFreezes(undefined, -3)).toBe(0);
  });
});

describe("mergeBest", () => {
  it("per-key max score keeps the winner's date", () => {
    const a = { "k1": { score: 100, date: "2026-07-01" } };
    const b = { "k1": { score: 250, date: "2026-06-01" }, "k2": { score: 40, date: "2026-07-02" } };
    expect(mergeBest(a, b)).toEqual({
      "k1": { score: 250, date: "2026-06-01" },
      "k2": { score: 40, date: "2026-07-02" },
    });
  });
  it("idempotent and empty-side identity", () => {
    const a = { "k": { score: 5, date: "2026-01-01" } };
    expect(mergeBest(a, a)).toEqual(a);
    expect(mergeBest(a, null)).toEqual(a);
    expect(mergeBest(undefined, a)).toEqual(a);
  });
});

describe("mergeStickers", () => {
  it("earned unions with earliest date; queue stays local-only", () => {
    const a = { earned: { s1: "2026-07-05" }, queue: ["s1"] };
    const b = { earned: { s1: "2026-07-01", s2: "2026-07-02" }, queue: ["s2"] };
    expect(mergeStickers(a, b)).toEqual({
      earned: { s1: "2026-07-01", s2: "2026-07-02" },
      queue: ["s1"],
    });
  });
  it("cloud side without queue is fine", () =>
    expect(mergeStickers({ earned: {}, queue: [] }, { earned: { x: "2026-01-01" } }))
      .toEqual({ earned: { x: "2026-01-01" }, queue: [] }));
});

describe("mergeShop", () => {
  const local = { owned: ["skin-a", "deco-1"], skin: "skin-a", backdrop: "", effect: "", soundpack: "", tiers: { "deco-1": 2 } };
  const cloud = { owned: ["skin-b", "deco-1"], skin: "skin-b", backdrop: "bd-1", effect: "", soundpack: "", tiers: { "deco-1": 3 } };
  it("owned unions, tiers per-id max", () => {
    const m = mergeShop(local, cloud, false);
    expect(m.owned.sort()).toEqual(["deco-1", "skin-a", "skin-b"]);
    expect(m.tiers).toEqual({ "deco-1": 3 });
  });
  it("slots: cloud wins when local not dirty", () => {
    const m = mergeShop(local, cloud, false);
    expect(m.skin).toBe("skin-b");
    expect(m.backdrop).toBe("bd-1");
  });
  it("slots: local wins when dirty", () =>
    expect(mergeShop(local, cloud, true).skin).toBe("skin-a"));
  it("missing cloud row returns normalized local", () =>
    expect(mergeShop(local, null, false)).toEqual(local));
  it("no-cloud result does not alias input arrays/objects", () => {
    const m = mergeShop(local, null, false);
    expect(m).toEqual(local);
    expect(m.owned).not.toBe(local.owned);
    expect(m.tiers).not.toBe(local.tiers);
  });
});

describe("mergeMastery", () => {
  it("counts max with k clamped to s; r follows newer ls; ls max", () => {
    const a = { "你": { s: 10, k: 8, r: 0, ls: 2000 } };
    const b = { "你": { s: 7, k: 9, r: 4, ls: 1000 }, "好": { s: 1, k: 1, r: 1, ls: 500 } };
    expect(mergeMastery(a, b)).toEqual({
      "你": { s: 10, k: 9, r: 0, ls: 2000 },   // r=0 from local (newer ls); k min(9,10)=9
      "好": { s: 1, k: 1, r: 1, ls: 500 },
    });
  });
  it("k never exceeds s after cross-side max", () => {
    const a = { "词": { s: 3, k: 3, r: 3, ls: 10 } };
    const b = { "词": { s: 9, k: 2, r: 0, ls: 20 } };
    expect(mergeMastery(a, b)["词"]).toEqual({ s: 9, k: 3, r: 0, ls: 20 });
  });
  it("empty sides", () => {
    expect(mergeMastery(null, null)).toEqual({});
    const a = { "词": { s: 1, k: 0, r: 0, ls: 1 } };
    expect(mergeMastery(a, undefined)).toEqual(a);
  });
});

describe("mergeQuests", () => {
  it("same date: per-quest progress max + done union", () => {
    const a = { date: "2026-07-10", progress: { correct30: 12 }, done: ["boss1"] };
    const b = { date: "2026-07-10", progress: { correct30: 20, combo5: 5 }, done: ["combo5"] };
    const m = mergeQuests(a, b);
    expect(m.progress).toEqual({ correct30: 20, combo5: 5 });
    expect(m.done.sort()).toEqual(["boss1", "combo5"]);
  });
  it("different dates: newer wins wholesale", () => {
    const older = { date: "2026-07-09", progress: { correct30: 30 }, done: ["correct30"] };
    const newer = { date: "2026-07-10", progress: {}, done: [] };
    expect(mergeQuests(older, newer)).toEqual(newer);
    expect(mergeQuests(newer, older)).toEqual(newer);
  });
  it("wholesale winner does not alias its inputs", () => {
    const newer = { date: "2026-07-10", progress: { a: 1 }, done: ["a"] };
    const m = mergeQuests(newer, { date: "2026-07-09", progress: {}, done: [] });
    expect(m).toEqual(newer);
    expect(m.progress).not.toBe(newer.progress);
    expect(m.done).not.toBe(newer.done);
  });
});

describe("mergeMonthly", () => {
  it("same month: done max, claimed OR", () => {
    expect(mergeMonthly({ month: "2026-07", done: 12, claimed: false },
                        { month: "2026-07", done: 9, claimed: true }))
      .toEqual({ month: "2026-07", done: 12, claimed: true });
  });
  it("different months: newer wins", () =>
    expect(mergeMonthly({ month: "2026-06", done: 40, claimed: false },
                        { month: "2026-07", done: 3, claimed: false }))
      .toEqual({ month: "2026-07", done: 3, claimed: false }));
});

describe("merge: stale monthly settle (P0 2026-07-12)", () => {
  const juneDone = { month: "2026-06", done: 40, claimed: false };
  const july     = { month: "2026-07", done: 0,  claimed: false };
  it("owes the reward when the discarded older month is complete and unclaimed", () =>
    expect(staleMonthlyOwed(july, juneDone)).toBe(1500));
  it("order-independent: stale side may be local or cloud", () =>
    expect(staleMonthlyOwed(juneDone, july)).toBe(1500));
  it("owes nothing when already claimed, incomplete, same month, or missing side", () => {
    expect(staleMonthlyOwed(july, { ...juneDone, claimed: true })).toBe(0);
    expect(staleMonthlyOwed(july, { ...juneDone, done: 39 })).toBe(0);
    expect(staleMonthlyOwed(juneDone, juneDone)).toBe(0);
    expect(staleMonthlyOwed(july, null)).toBe(0);           // null -> defaultMonthly month ""
  });
  it("mergeAll credits the owed reward into the merged wallet", () => {
    const local = { monthly: july, wallet: 200 };
    const cloud = { monthly: juneDone, wallet: 100 };
    const m = mergeAll(local, cloud);
    expect(m.wallet).toBe(200 + 1500);
    expect(m.monthly.month).toBe("2026-07");
  });
  it("mergeAll(local, null) baseline owes nothing", () =>
    expect(mergeAll({ monthly: juneDone, wallet: 50 }, null).wallet).toBe(50));
});
