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

// Web-billing selection. Inject a non-empty web key + not-native + not-file://.
const webOpts = (over) => ({
  revenuecat: { apiKey: "", isNative: () => false },   // keep native branch off
  revenuecatWeb: { apiKey: "rcb_web_key", isNative: () => false, isFileProtocol: () => false, sdk: {}, ...over },
});

describe("getProvider web selection", () => {
  it("web key + not native + not file:// -> revenuecat-web", () => {
    expect(getProvider(webOpts()).kind).toBe("revenuecat-web");
  });
  it("blank web key -> mock", () => {
    expect(getProvider(webOpts({ apiKey: "" })).kind).toBe("mock");
  });
  it("native takes the native branch, never web", () => {
    // Native key set + native true -> native; web opts ignored.
    const p = getProvider({
      revenuecat: { apiKey: "goog_key", isNative: () => true, sdk: {} },
      revenuecatWeb: { apiKey: "rcb_web_key", isNative: () => true, isFileProtocol: () => false, sdk: {} },
    });
    expect(p.kind).toBe("revenuecat");
  });
  it("file:// -> mock (never web)", () => {
    expect(getProvider(webOpts({ isFileProtocol: () => true })).kind).toBe("mock");
  });
  it("no opts -> mock (shipped keys are blank)", () => {
    expect(getProvider().kind).toBe("mock");
  });
});

describe("provider selection — stripe web", () => {
  const stripeOpts = {
    stripe: { checkoutUrl: "https://fn/stripe-checkout", isNative: () => false, isFileProtocol: () => false },
  };

  it("selects stripe-web on web when a checkout url is configured", () => {
    expect(getProvider(stripeOpts).kind).toBe("stripe-web");
  });

  it("prefers stripe-web over revenuecat-web when both are configured", () => {
    const p = getProvider({ ...stripeOpts, revenuecatWeb: { apiKey: "rcb_x", sdk: {}, isNative: () => false } });
    expect(p.kind).toBe("stripe-web");
  });

  it("falls back to mock when the stripe checkout url is blank (shipped dark)", () => {
    expect(getProvider({ stripe: { checkoutUrl: "", isNative: () => false } }).kind).toBe("mock");
  });

  it("never selects stripe-web on native — RevenueCat owns Android", () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => true } });
    expect(p.kind).not.toBe("stripe-web");
  });

  // The test above overrides stripe.isNative, so it only exercises Stripe's OWN
  // guard and passes under any branch order. This one pins the ORDER: RC is
  // native-configured while Stripe uses the real shared isNative (false under
  // vitest), so if the Stripe branch were moved above the native RC branch,
  // Stripe would win and this fails.
  it("pins branch ORDER: a native-configured RevenueCat beats a configured Stripe", () => {
    const p = getProvider({
      revenuecat: { apiKey: "goog_real_key", isNative: () => true },
      stripe: { checkoutUrl: "https://fn/x" },
    });
    expect(p.kind).toBe("revenuecat");
  });

  it("tolerates a null store — purchase resolves rather than throwing", async () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => false } });
    expect(p.kind).toBe("stripe-web");
    await expect(p.purchase("supporter")).resolves.toEqual({ ok: false, reason: "needs-account" });
  });

  it("never selects stripe-web on file://", () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => true } });
    expect(p.kind).not.toBe("stripe-web");
  });
});
