// test/analytics/consent.test.js
import { describe, it, expect } from "vitest";
import { isEnabled, setEnabled } from "../../src/analytics/consent.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

describe("consent", () => {
  it("defaults to false", () => {
    expect(isEnabled(memStore())).toBe(false);
  });

  it("only true when the flag is strictly true", () => {
    expect(isEnabled(memStore({ analyticsEnabled: true }))).toBe(true);
    expect(isEnabled(memStore({ analyticsEnabled: "yes" }))).toBe(false);
  });

  it("setEnabled coerces to a strict boolean", () => {
    const store = memStore();
    setEnabled(store, 1);
    expect(store._dump().analyticsEnabled).toBe(true);
    setEnabled(store, false);
    expect(store._dump().analyticsEnabled).toBe(false);
  });
});
