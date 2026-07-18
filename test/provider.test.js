import { describe, it, expect } from "vitest";
import { getProvider } from "../src/monetization/provider.js";

// Injected RevenueCat opts so no test touches the real SDK or Capacitor.
const rcOpts = (over) => ({ revenuecat: { apiKey: "rc_test_key", isNative: () => true, sdk: {}, ...over } });

describe("getProvider selection", () => {
  it("blank key -> mock, even on native", () => {
    expect(getProvider(rcOpts({ apiKey: "" })).kind).toBe("mock");
  });
  it("whitespace-only key -> mock (key must be meaningfully set)", () => {
    expect(getProvider(rcOpts({ apiKey: "   " })).kind).toBe("mock");
  });
  it("key set but not native (browser/file://) -> mock", () => {
    expect(getProvider(rcOpts({ isNative: () => false })).kind).toBe("mock");
  });
  it("key set + native -> revenuecat", () => {
    expect(getProvider(rcOpts({})).kind).toBe("revenuecat");
  });
  it("no opts at all -> mock (shipped config has a blank key)", () => {
    // Safe in node: the blank shipped key short-circuits before isNative runs.
    expect(getProvider().kind).toBe("mock");
  });
  it("constructs synchronously and cheaply (boot-path contract)", () => {
    const p = getProvider(rcOpts({}));
    expect(typeof p.available).toBe("function");
    expect(typeof p.purchase).toBe("function");
  });
});
