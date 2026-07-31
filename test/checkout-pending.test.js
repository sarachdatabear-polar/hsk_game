import { describe, it, expect } from "vitest";
import { PENDING_TTL_MS, writePending, readPending, clearPending } from "../src/monetization/checkout-pending.js";

function fakeStore() {
  const map = new Map();
  return {
    map,
    get: (k, d) => (map.has(k) ? map.get(k) : d),
    set: (k, v) => map.set(k, v),
    remove: k => map.delete(k),
  };
}

const T0 = 1_800_000_000_000;

describe("checkout-pending", () => {
  it("round-trips a pending record", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0 + 1000)).toEqual({ sessionId: "cs_1", productId: "supporter", startedAt: T0 });
  });

  it("stores under the local-only key `checkout`", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(s.map.has("checkout")).toBe(true);
  });

  it("expires after 24h so an abandoned checkout never lingers", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0 + PENDING_TTL_MS - 1)).not.toBeNull();
    expect(readPending(s, T0 + PENDING_TTL_MS + 1)).toBeNull();
  });

  it("removes the key when it expires rather than re-reading it forever", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    readPending(s, T0 + PENDING_TTL_MS + 1);
    expect(s.map.has("checkout")).toBe(false);
  });

  it("clears on demand", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    clearPending(s);
    expect(readPending(s, T0)).toBeNull();
  });

  it("returns null for absent, malformed, or incomplete records", () => {
    const s = fakeStore();
    expect(readPending(s, T0)).toBeNull();
    s.set("checkout", "not-an-object");
    expect(readPending(s, T0)).toBeNull();
    s.set("checkout", { productId: "supporter", startedAt: T0 });
    expect(readPending(s, T0)).toBeNull();
  });

  it("ignores a write with no session id", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "", productId: "supporter", now: T0 });
    expect(readPending(s, T0)).toBeNull();
  });
});
