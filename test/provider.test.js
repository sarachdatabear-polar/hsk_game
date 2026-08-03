import { describe, it, expect } from "vitest";
import { getProvider } from "../src/monetization/provider.js";
import { STRIPE_SITE_ORIGIN } from "../src/monetization/stripe-config.js";

// Injected RevenueCat opts so no test touches the real SDK or Capacitor.
const rcOpts = (over) => ({ revenuecat: { apiKey: "rc_test_key", isNative: () => true, sdk: {}, ...over } });
// Since the 2026-08-03 go-live flip the SHIPPED checkout URL is non-blank, so
// tests exercising RC/mock gating must dark the Stripe branch explicitly or
// getProvider falls through to stripe-web instead of the branch under test.
const darkStripe = { stripe: { checkoutUrl: "" } };

describe("getProvider selection", () => {
  it("blank key -> mock, even on native", () => {
    expect(getProvider({ ...rcOpts({ apiKey: "" }), ...darkStripe }).kind).toBe("mock");
  });
  it("whitespace-only key -> mock (key must be meaningfully set)", () => {
    expect(getProvider({ ...rcOpts({ apiKey: "   " }), ...darkStripe }).kind).toBe("mock");
  });
  it("key set but not native (browser/file://) -> mock", () => {
    expect(getProvider({ ...rcOpts({ isNative: () => false }), ...darkStripe }).kind).toBe("mock");
  });
  it("key set + native -> revenuecat", () => {
    expect(getProvider(rcOpts({})).kind).toBe("revenuecat");
  });
  it("no opts at all -> stripe-web (BILLING LIVE 2026-08-03: shipped checkout URL is set)", () => {
    // This is the go-live pin: shipped defaults on web now select Stripe.
    // If this fails with "mock", someone blanked STRIPE_CHECKOUT_URL — that
    // is the kill switch, so a failure here after a deliberate darkening is
    // expected and this pin should be flipped back then.
    expect(getProvider().kind).toBe("stripe-web");
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
  ...darkStripe,                                       // stripe outranks RC-web; dark it
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
  it("no opts -> stripe-web (shipped checkout URL is live; blank URL is the kill switch)", () => {
    expect(getProvider().kind).toBe("stripe-web");
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
    // getOrigin is injected because there is no `location` under vitest: the
    // real default reads location.origin, and the origin gate correctly
    // refuses an empty one. Stand in for the browser so this keeps testing the
    // null-store path it was written for.
    const p = getProvider({ stripe: {
      checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => false,
      getOrigin: () => STRIPE_SITE_ORIGIN,
    } });
    expect(p.kind).toBe("stripe-web");
    await expect(p.purchase("supporter")).resolves.toEqual({ ok: false, reason: "needs-account" });
  });

  it("defaults the origin pin to the shipped canonical origin, so a bridge purchase is refused", async () => {
    const p = getProvider({ stripe: {
      checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => false,
      getOrigin: () => "https://sarachdatabear-polar.github.io",
    } });
    await expect(p.purchase("supporter")).resolves.toEqual({ ok: false, reason: "wrong-origin" });
  });

  it("never selects stripe-web on file://", () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => true } });
    expect(p.kind).not.toBe("stripe-web");
  });
});

// ── GO-LIVE PIN (2026-08-03, owner decision: "go with supporter only") ──────
// Shipped defaults on web must sell the Supporter and NOTHING else. Web coin
// packs are go-live step 8 and open by widening STRIPE_WEB_PRODUCT_IDS — when
// that decision is made, this pin is the test to update.
import { STRIPE_CHECKOUT_URL, STRIPE_WEB_PRODUCT_IDS } from "../src/monetization/stripe-config.js";

describe("shipped go-live config (supporter-only)", () => {
  it("checkout URL points at the live project's stripe-checkout function", () => {
    expect(STRIPE_CHECKOUT_URL).toBe(
      "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/stripe-checkout");
  });
  it("shipped provider is stripe-web and supports exactly the supporter", () => {
    const p = getProvider();
    expect(p.kind).toBe("stripe-web");
    expect(p.supports("supporter")).toBe(true);
    for (const id of ["coins_s", "coins_m", "coins_l", "coins_xl"]) {
      expect(p.supports(id)).toBe(false);
    }
  });
  it("web product list is exactly [supporter]", () => {
    expect(STRIPE_WEB_PRODUCT_IDS).toEqual(["supporter"]);
  });
});
