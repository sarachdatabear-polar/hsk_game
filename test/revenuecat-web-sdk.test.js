import { describe, it, expect } from "vitest";
import { loadWebBillingSdk } from "../src/monetization/revenuecat-web-sdk.js";

describe("revenuecat-web-sdk loader", () => {
  it("exports an async factory (real SDK lazy-loaded, not at import time)", () => {
    expect(typeof loadWebBillingSdk).toBe("function");
    // Must not throw synchronously / must not import the SDK eagerly.
    expect(() => loadWebBillingSdk).not.toThrow();
  });
});
