import { describe, it, expect } from "vitest";
import { SYNC_KEYS, defaultSyncMeta, slotsOf, mergeXp, mergeWallet, mergeFreezes,
         mergeBest, mergeStickers, mergeShop, mergeMastery, mergeQuests,
         mergeMonthly, mergeAll, streetLayoutOf, streetProjectOf, shopPreferencesOf } from "../src/merge.js";
import { defaultShop } from "../src/shop.js";

describe("merge: scalars", () => {
  it("SYNC_KEYS lists the 10 synced keys", () =>
    expect(SYNC_KEYS).toEqual(["mastery","xp","daily","quests","monthly","wallet","freezes","shop","stickers","best"]));
  it("defaultSyncMeta shape", () =>
    expect(defaultSyncMeta()).toEqual({ dirty: {}, lastSyncAt: 0, lastLedgerAt: "", shopSlots: null, shopPreferences: null }));
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
  const emptyLayout = { v: 2, placements: {}, welcomeOwned: false, coachDone: false };
  const emptyProject = { v: 1, itemId: "", plotId: "" };
  const local = { owned: ["skin-a", "deco-1"], skin: "skin-a", backdrop: "", effect: "", soundpack: "", tiers: { "deco-1": 2 }, streetLayout: emptyLayout, streetProject: emptyProject };
  const cloud = { owned: ["skin-b", "deco-1"], skin: "skin-b", backdrop: "bd-1", effect: "", soundpack: "", tiers: { "deco-1": 3 }, streetLayout: emptyLayout, streetProject: emptyProject };
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
    expect(m.streetLayout).not.toBe(local.streetLayout);
  });

  it("layout preference independently follows its own dirty flag", () => {
    const a = { ...local, owned: ["red-lantern"], streetLayout: {
      ...emptyLayout, placements: { "plot-small-02": "red-lantern" }, coachDone: true,
    } };
    const b = { ...cloud, owned: ["red-lantern"], streetLayout: {
      ...emptyLayout, placements: { "plot-small-03": "red-lantern" },
    } };
    expect(mergeShop(a, b, { slotsDirty: false, layoutDirty: true }).streetLayout.placements)
      .toEqual({ "plot-small-02": "red-lantern" });
    expect(mergeShop(a, b, { slotsDirty: true, layoutDirty: false }).streetLayout.placements)
      .toEqual({ "plot-small-03": "red-lantern" });
  });

  it("legacy cloud without a layout cannot erase a local arrangement", () => {
    const a = { ...local, owned: ["red-lantern"], streetLayout: {
      ...emptyLayout, placements: { "plot-small-02": "red-lantern" },
    } };
    const legacyCloud = { owned: [], skin: "", backdrop: "", effect: "", soundpack: "", tiers: {} };
    expect(mergeShop(a, legacyCloud, false).streetLayout.placements)
      .toEqual({ "plot-small-02": "red-lantern" });
  });

  it("normalizes layout after additive ownership merge; new items stay inventory", () => {
    const a = { ...local, owned: ["red-lantern"], streetLayout: {
      ...emptyLayout, placements: { "plot-small-02": "red-lantern" },
    } };
    const b = { ...cloud, owned: ["tea-sign"], streetLayout: emptyLayout };
    const m = mergeShop(a, b, { layoutDirty: true });
    expect(m.owned.sort()).toEqual(["red-lantern", "tea-sign"]);
    expect(m.streetLayout.placements).toEqual({ "plot-small-02": "red-lantern" });
  });

  it("exposes canonical layout-only and combined preference baselines", () => {
    const s = { ...local, owned: ["red-lantern"], streetLayout: {
      ...emptyLayout, placements: { "plot-small-02": "red-lantern", unknown: "x" },
    } };
    expect(streetLayoutOf(s).placements).toEqual({ "plot-small-02": "red-lantern" });
    expect(shopPreferencesOf(s)).toEqual({
      slots: slotsOf(s),
      streetLayout: streetLayoutOf(s),
      streetProject: streetProjectOf(s),
    });
  });

  it("project preference follows its own dirty flag independently", () => {
    const a = { ...local, streetProject: { v: 1, itemId: "koi-pond", plotId: "plot-medium-01" } };
    const b = { ...cloud, streetProject: { v: 1, itemId: "tea-sign", plotId: "plot-medium-02" } };
    expect(mergeShop(a, b, { projectDirty: true }).streetProject).toEqual(a.streetProject);
    expect(mergeShop(a, b, { layoutDirty: true, projectDirty: false }).streetProject).toEqual(b.streetProject);
  });

  it("a merged purchase clears the active project on every device", () => {
    const a = { ...local, streetProject: { v: 1, itemId: "koi-pond", plotId: "plot-medium-01" } };
    const b = { ...cloud, owned: [...cloud.owned, "koi-pond"] };
    expect(mergeShop(a, b, { projectDirty: true }).streetProject).toEqual(emptyProject);
  });

  it("legacy cloud without a project cannot erase an active local goal", () => {
    const a = { ...local, streetProject: { v: 1, itemId: "koi-pond", plotId: "plot-medium-01" } };
    const legacyCloud = { ...cloud };
    delete legacyCloud.streetProject;
    expect(mergeShop(a, legacyCloud).streetProject).toEqual(a.streetProject);
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

// P1 2026-07-12: e7ce6d0's staleMonthlyOwed() credited the stale-month reward
// into the merged wallet AFTER the max-fold — double-paying whenever a
// device's own boot-time settle (main.js settleMonthlyNow, via quests.js's
// settleMonthly) already paid that reward into ITS wallet before an
// unpushed/still-stale cloud row got reconciled. The fix settles each side
// into its OWN wallet first (mergeAll's `today` option, using the same
// settleMonthly), then max-folds — so a side that already banked the reward
// can't have it added a second time by the other side's stale row.
describe("merge: stale monthly settle (P1 2026-07-12, race-safe)", () => {
  const juneDone = { month: "2026-06", done: 40, claimed: false };
  const july     = { month: "2026-07", done: 0,  claimed: false };
  const TODAY = "2026-07-15";

  it("cloud stale + local current: reward settles into the cloud side, wins the fold", () => {
    const local = { monthly: july, wallet: 200 };
    const cloud = { monthly: juneDone, wallet: 100 };
    const m = mergeAll(local, cloud, { today: TODAY });
    expect(m.wallet).toBe(1600);          // max(200+0, 100+1500)
    expect(m.monthly).toEqual({ month: "2026-07", done: 0, claimed: false });
  });

  it("order-independent: stale side may be local or cloud, total is the same", () => {
    const local = { monthly: juneDone, wallet: 100 };
    const cloud = { monthly: july, wallet: 200 };
    const m = mergeAll(local, cloud, { today: TODAY });
    expect(m.wallet).toBe(1600);          // max(100+1500, 200+0)
  });

  it("credits nothing when already claimed, incomplete, or same month", () => {
    const claimed = mergeAll({ monthly: july, wallet: 200 },
      { monthly: { ...juneDone, claimed: true }, wallet: 100 }, { today: TODAY });
    expect(claimed.wallet).toBe(200);
    const incomplete = mergeAll({ monthly: july, wallet: 200 },
      { monthly: { ...juneDone, done: 39 }, wallet: 100 }, { today: TODAY });
    expect(incomplete.wallet).toBe(200);
    const sameMonth = mergeAll({ monthly: { month: "2026-07", done: 10, claimed: false }, wallet: 200 },
      { monthly: { month: "2026-07", done: 5, claimed: false }, wallet: 100 }, { today: TODAY });
    expect(sameMonth.wallet).toBe(200);
  });

  it("a side with no monthly data (defaultMonthly's month:\"\") never settles, credits nothing", () => {
    // Distinct from a truly-stale local month with a missing cloud row: under
    // the new self-settle design that case now legitimately earns its own
    // reward (see the "already settled" test below) — that's the fix, not a
    // regression. This checks the actual no-op: a side whose monthly is
    // simply absent (month "") always passes through per settleMonthly.
    const local = { monthly: july, wallet: 200 };   // same month as TODAY: not stale
    const cloud = { wallet: 100 };                  // no monthly key at all
    expect(mergeAll(local, cloud, { today: TODAY }).wallet).toBe(200);
  });

  it("regression: a boot-settled local wallet is not double-paid by a still-stale cloud row", () => {
    // Local already ran settleMonthlyNow() at boot: its 2500 wallet already
    // includes the 1500 for June. Cloud never pushed since, so it still
    // shows June done:40 unclaimed with the pre-settle wallet (1000).
    const local = { monthly: { month: "2026-07", done: 3, claimed: false }, wallet: 2500 };
    const cloud = { monthly: juneDone, wallet: 1000 };
    const m = mergeAll(local, cloud, { today: TODAY });
    // Buggy post-fold credit would give max(2500,1000)+1500 = 4000.
    expect(m.wallet).toBe(2500);          // max(2500+0, 1000+1500) = max(2500,2500)
  });

  it("mergeAll(local, null) where local is already settled: wallet unchanged", () => {
    const local = { monthly: { month: "2026-07", done: 20, claimed: false }, wallet: 500 };
    expect(mergeAll(local, null, { today: TODAY }).wallet).toBe(500);
  });

  it("both sides stale on the SAME month: each self-credits once, single payment survives the fold", () => {
    // Sharpest proof of settle-before-fold: if settle ran only once (or
    // post-fold), 1000+1500 on one side and a bare 1000 on the other would
    // max-fold to 2500 too — but so would a double-credit bug that summed
    // instead of maxed (2500+2500=5000 would be the double-pay tell). Both
    // sides holding the identical stale month means the settle is the ONLY
    // thing distinguishing this from a same-month no-op, and the fold must
    // still land on exactly one reward.
    const local = { monthly: juneDone, wallet: 1000 };
    const cloud = { monthly: juneDone, wallet: 1000 };
    const m = mergeAll(local, cloud, { today: TODAY });
    expect(m.wallet).toBe(2500);          // max(1000+1500, 1000+1500), not summed
  });

  it("both sides stale on DIFFERENT months: each self-credits its own, max-fold absorbs one (wallet fold is max-never-sum)", () => {
    const local = { monthly: { month: "2026-05", done: 40, claimed: false }, wallet: 1000 };
    const cloud = { monthly: juneDone, wallet: 1000 };
    const m = mergeAll(local, cloud, { today: TODAY });
    expect(m.wallet).toBe(2500);          // max(1000+1500, 1000+1500) — universal max, never a sum
  });

  it("omitting `today` preserves the old pure behavior: no settle, wallet is the plain max", () => {
    const local = { monthly: july, wallet: 200 };
    const cloud = { monthly: juneDone, wallet: 100 };
    const m = mergeAll(local, cloud);     // no opts.today
    expect(m.wallet).toBe(200);           // plain max(200,100), no 1500 credit
    expect(m.monthly).toEqual(mergeMonthly(july, juneDone));
  });
});

// Coin-purchase go-live (P1 2026-07-12): purchased coins are granted
// server-side — the webhook inserts an event_id-tagged ledger row AND
// atomically increments the cloud wallet. THE FOLD subtracts unseenPurchased
// from the cloud contribution before the max fold (neutralizing the cloud's
// already-counted purchase) and adds it back once after — see mergeAll's own
// comment in src/merge.js for the full reasoning.
describe("merge: ledger-cursor purchase fold (THE FOLD, coin-purchase go-live)", () => {
  it("purchase-eaten-pre-fix scenario is fixed: local unpushed ahead, cloud already carries the webhook's grant — credited once", () => {
    // Pre-fix: max(local 5000, cloud 5000) would eat the 1000-coin purchase
    // entirely (cloud's pre-purchase value coincidentally equals local's).
    const local = { wallet: 5000 };
    const cloud = { wallet: 4000 + 1000 };   // webhook already added the pack
    expect(mergeAll(local, cloud, { unseenPurchased: 1000 }).wallet).toBe(6000);
  });

  it("well-synced scenario: local already pushed 5000, cloud is 6000 incl. the purchase — credited once, NOT summed on top", () => {
    const local = { wallet: 5000 };
    const cloud = { wallet: 6000 };
    expect(mergeAll(local, cloud, { unseenPurchased: 1000 }).wallet).toBe(6000); // not 7000
  });

  it("unseenPurchased=0 is byte-identical to omitting the option entirely", () => {
    const local = { wallet: 5000 };
    const cloud = { wallet: 4000 };
    const withZero = mergeAll(local, cloud, { unseenPurchased: 0 });
    const omitted = mergeAll(local, cloud, {});
    expect(withZero).toEqual(omitted);
    expect(withZero.wallet).toBe(5000);
  });

  it("spent-down cloud after subtracting unseen goes negative — mergeWallet's floor-at-0 clamp absorbs it, doesn't sink the fold", () => {
    const local = { wallet: 5000 };
    const cloud = { wallet: 300 };   // cloud contribution pre-clamp: 300 - 1000 = -700
    expect(mergeAll(local, cloud, { unseenPurchased: 1000 }).wallet).toBe(6000);
  });
});

describe("slotsOf", () => {
  it("extracts exactly the four equip slots", () => {
    const s = slotsOf({ owned: ["a"], skin: "skin-red", backdrop: "market",
                        effect: "sparkle", soundpack: "retro", tiers: { a: 2 } });
    expect(s).toEqual({ skin: "skin-red", backdrop: "market", effect: "sparkle", soundpack: "retro" });
  });
  it("normalizes null/undefined through defaultShop", () => {
    expect(slotsOf(null)).toEqual(slotsOf(undefined));
    expect(slotsOf(null)).toEqual(slotsOf(defaultShop()));
    expect(Object.keys(slotsOf(null)).sort()).toEqual(["backdrop", "effect", "skin", "soundpack"]);
  });
});

describe("defaultSyncMeta shopSlots", () => {
  it("defaults shopSlots to null (pre-upgrade metas adopt it via Object.assign)", () => {
    expect(defaultSyncMeta().shopSlots).toBeNull();
  });
});
