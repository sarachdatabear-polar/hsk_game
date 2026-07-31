import { describe, it, expect } from "vitest";
import { PENDING_TTL_MS, writePending, readPending, clearPending, markAnnounced } from "../src/monetization/checkout-pending.js";

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
    expect(readPending(s, T0 + 1000)).toEqual({ sessionId: "cs_1", productId: "supporter", startedAt: T0, announced: false });
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

  it("markAnnounced sets the flag and readPending surfaces it", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0).announced).toBe(false);
    markAnnounced(s);
    expect(readPending(s, T0).announced).toBe(true);
    // must not disturb the rest of the record
    expect(readPending(s, T0).sessionId).toBe("cs_1");
    expect(readPending(s, T0).startedAt).toBe(T0);
  });

  it("markAnnounced is a no-op with no pending record", () => {
    const s = fakeStore();
    markAnnounced(s);
    expect(readPending(s, T0)).toBeNull();
    // Not just "still reads null" -- must not write a junk record under the
    // key either. Spreading a null `raw` into `{...raw, announced:true}`
    // would write `{announced:true}`, which readPending happens to also
    // reject (no sessionId) -- so asserting only the read leaves the guard
    // itself unpinned.
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

  it("returns valid record at exact TTL boundary", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0 + PENDING_TTL_MS)).not.toBeNull();
  });

  it("clears via set(null) fallback when store lacks remove()", () => {
    const map = new Map();
    const s = {
      map,
      get: (k, d) => (map.has(k) ? map.get(k) : d),
      set: (k, v) => map.set(k, v),
    };
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    clearPending(s);
    expect(readPending(s, T0)).toBeNull();
  });

  it("handles non-numeric startedAt by treating it as expired", () => {
    const s = fakeStore();
    s.set("checkout", { sessionId: "cs_1", startedAt: "not-a-number" });
    expect(readPending(s, T0)).toBeNull();
  });
});
