import { describe, it, expect, vi } from "vitest";
import { pollForCredit } from "../src/monetization/purchase-poll.js";

function makeHarness(steps = {}) {
  const calls = [];
  const sleep = vi.fn(async () => {});
  const reconcile = vi.fn(async (reason, orderId) => {
    const i = calls.length;
    calls.push({ reason, orderId });
    return (steps[i] || { ok: true, credits: [] });
  });
  return { reconcile, sleep, calls };
}

describe("pollForCredit", () => {
  it("credits only the requested store transaction", async () => {
    const h = makeHarness({
      0: { ok: true, credits: [
        { orderId: "GPA.UNRELATED", delta: 5000 },
        { orderId: "GPA.TARGET", delta: 1000 },
      ] },
    });
    await expect(pollForCredit({ reconcile:h.reconcile, orderId:"GPA.TARGET", sleep:h.sleep }))
      .resolves.toEqual({ credited:true, delta:1000 });
    expect(h.calls).toEqual([{ reason:"purchase", orderId:"GPA.TARGET" }]);
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it("does not treat an unrelated wallet/ledger increase as purchase success", async () => {
    const h = makeHarness({ 0:{ ok:true, credits:[{ orderId:"GPA.OTHER", delta:9000 }] } });
    const r = await pollForCredit({ reconcile:h.reconcile, orderId:"GPA.TARGET", sleep:h.sleep });
    expect(r).toEqual({ credited:false, delta:0 });
    expect(h.calls).toHaveLength(3);
  });

  it("credits an exact row even when the cloud push failed after the local fold", async () => {
    const h = makeHarness({
      0: { ok:false, reason:"network", localChanged:true,
        credits:[{ orderId:"GPA.TARGET", delta:2000 }] },
    });
    await expect(pollForCredit({ reconcile:h.reconcile, orderId:"GPA.TARGET", sleep:h.sleep }))
      .resolves.toEqual({ credited:true, delta:2000 });
  });

  it("continues across failures and can credit on the third try", async () => {
    const h = makeHarness({
      0:{ ok:false, reason:"network" },
      1:{ ok:true, credits:[] },
      2:{ ok:true, credits:[{ orderId:"GPA.TARGET", delta:1200 }] },
    });
    const r = await pollForCredit({ reconcile:h.reconcile, orderId:"GPA.TARGET", sleep:h.sleep });
    expect(r).toEqual({ credited:true, delta:1200 });
    expect(h.sleep).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the provider supplies no order id", async () => {
    const h = makeHarness();
    await expect(pollForCredit({ reconcile:h.reconcile, orderId:"", sleep:h.sleep }))
      .resolves.toEqual({ credited:false, delta:0 });
    expect(h.reconcile).not.toHaveBeenCalled();
  });

  it("respects tries and delay overrides", async () => {
    const h = makeHarness();
    const r = await pollForCredit({ reconcile:h.reconcile, orderId:"GPA.X", sleep:h.sleep,
      tries:5, delayMs:250 });
    expect(r).toEqual({ credited:false, delta:0 });
    expect(h.calls).toHaveLength(5);
    expect(h.sleep).toHaveBeenCalledTimes(4);
    expect(h.sleep).toHaveBeenCalledWith(250);
  });
});
