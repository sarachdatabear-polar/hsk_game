import { describe, it, expect, vi } from "vitest";
import { loadWebBillingSdk } from "../src/monetization/revenuecat-web-sdk.js";

describe("loadWebBillingSdk", () => {
  it("is an async factory (SDK not imported at module load)", () => {
    expect(typeof loadWebBillingSdk).toBe("function");
  });

  it("injects the bundle once, then returns the adapter from the global", async () => {
    const scope = {};
    const inject = vi.fn(async () => { scope.__luckyWebBilling = { create: () => ({ tag: "adapter" }) }; });
    const adapter = await loadWebBillingSdk({ scope, injectScript: inject });
    expect(inject).toHaveBeenCalledOnce();
    expect(adapter).toEqual({ tag: "adapter" });
  });

  it("does not re-inject when the global is already present", async () => {
    const scope = { __luckyWebBilling: { create: () => ({ tag: "cached" }) } };
    const inject = vi.fn();
    const adapter = await loadWebBillingSdk({ scope, injectScript: inject });
    expect(inject).not.toHaveBeenCalled();
    expect(adapter).toEqual({ tag: "cached" });
  });

  it("throws if the bundle loads but never sets the global", async () => {
    const scope = {};
    const inject = vi.fn(async () => {});
    await expect(loadWebBillingSdk({ scope, injectScript: inject })).rejects.toThrow();
  });
});
