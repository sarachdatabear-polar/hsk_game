import { describe, it, expect, vi } from "vitest";
import { iapVisible } from "../src/monetization/gating.js";

describe("iapVisible", () => {
  it("dev flag true -> visible regardless of provider", async () => {
    expect(await iapVisible(null, true)).toBe(true);
    expect(await iapVisible({ kind: "mock", available: vi.fn(async () => false) }, true)).toBe(true);
  });

  it("mock provider + no flag -> hidden, and never calls available()", async () => {
    const available = vi.fn(async () => true);
    const provider = { kind: "mock", available };
    expect(await iapVisible(provider, false)).toBe(false);
    expect(available).not.toHaveBeenCalled();
  });

  it("real provider (revenuecat) + available true -> visible", async () => {
    const provider = { kind: "revenuecat", available: async () => true };
    expect(await iapVisible(provider, false)).toBe(true);
  });

  it("real provider (revenuecat) + available false -> hidden", async () => {
    const provider = { kind: "revenuecat", available: async () => false };
    expect(await iapVisible(provider, false)).toBe(false);
  });

  it("null provider + no flag -> hidden", async () => {
    expect(await iapVisible(null, false)).toBe(false);
  });
});
