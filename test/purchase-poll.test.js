import { describe, it, expect, vi } from "vitest";
import { pollForCredit } from "../src/monetization/purchase-poll.js";

// Fake wallet ledger the fake reconcile() can mutate, so getWallet() reflects
// "what a real reconcile would have written to the store" without touching
// localStorage or real timers.
function makeHarness(walletSteps) {
  // walletSteps[i] is the wallet value AFTER the i-th reconcile call resolves
  // (index 0 = after try 1, etc). Starts undefined until the first call.
  let wallet = walletSteps.start;
  const reconcileCalls = [];
  const sleepCalls = [];
  const reconcile = vi.fn(async (reason) => {
    reconcileCalls.push(reason);
    const i = reconcileCalls.length - 1;
    if (walletSteps.fail && walletSteps.fail.includes(i)) return { ok: false, reason: "network" };
    if (walletSteps.after && i in walletSteps.after) wallet = walletSteps.after[i];
    return { ok: true };
  });
  const getWallet = () => wallet;
  const sleep = vi.fn(async (ms) => { sleepCalls.push(ms); });
  return { reconcile, getWallet, sleep, reconcileCalls, sleepCalls };
}

describe("pollForCredit", () => {
  it("credits on try 1: wallet increases right after the first reconcile", async () => {
    const h = makeHarness({ start: 1000, after: { 0: 1500 } });
    const r = await pollForCredit({
      reconcile: h.reconcile, walletBefore: 1000, getWallet: h.getWallet, sleep: h.sleep,
    });
    expect(r).toEqual({ credited: true, delta: 500 });
    expect(h.reconcileCalls).toEqual(["purchase"]);
    expect(h.sleepCalls).toEqual([]);   // no sleep needed once credited on try 1
  });

  it("credits on try 3: first two tries see no increase, third does", async () => {
    const h = makeHarness({ start: 2000, after: { 2: 3200 } });
    const r = await pollForCredit({
      reconcile: h.reconcile, walletBefore: 2000, getWallet: h.getWallet, sleep: h.sleep,
    });
    expect(r).toEqual({ credited: true, delta: 1200 });
    expect(h.reconcileCalls.length).toBe(3);
    // sleep runs between tries (after try 1, after try 2) but never after the
    // final (successful) try.
    expect(h.sleepCalls).toEqual([2000, 2000]);
  });

  it("never credited: exhausts all tries, wallet never moves -> {credited:false}, delta 0", async () => {
    const h = makeHarness({ start: 500 });
    const r = await pollForCredit({
      reconcile: h.reconcile, walletBefore: 500, getWallet: h.getWallet, sleep: h.sleep,
    });
    expect(r).toEqual({ credited: false, delta: 0 });
    expect(h.reconcileCalls.length).toBe(3);
    // sleep is called between tries (1->2, 2->3) but NOT after the last try —
    // 3 tries means exactly 2 sleeps.
    expect(h.sleepCalls).toEqual([2000, 2000]);
  });

  it("reconcile failure ({ok:false}) is treated as no-credit-this-try but polling continues", async () => {
    const h = makeHarness({ start: 800, fail: [0], after: { 1: 1800 } });
    const r = await pollForCredit({
      reconcile: h.reconcile, walletBefore: 800, getWallet: h.getWallet, sleep: h.sleep,
    });
    expect(r).toEqual({ credited: true, delta: 1000 });
    expect(h.reconcileCalls.length).toBe(2);   // try 1 (failed) + try 2 (credited)
    expect(h.sleepCalls).toEqual([2000]);      // one sleep, between try 1 and try 2
  });

  it("respects injected tries/delayMs overrides", async () => {
    const h = makeHarness({ start: 10 });
    const r = await pollForCredit({
      reconcile: h.reconcile, walletBefore: 10, getWallet: h.getWallet, sleep: h.sleep,
      tries: 5, delayMs: 250,
    });
    expect(r).toEqual({ credited: false, delta: 0 });
    expect(h.reconcileCalls.length).toBe(5);
    expect(h.sleepCalls).toEqual([250, 250, 250, 250]);   // 5 tries -> 4 sleeps
  });

  it("passes the \"purchase\" reason to reconcile on every try", async () => {
    const h = makeHarness({ start: 1 });
    await pollForCredit({ reconcile: h.reconcile, walletBefore: 1, getWallet: h.getWallet, sleep: h.sleep });
    expect(h.reconcileCalls.every(r => r === "purchase")).toBe(true);
  });
});
