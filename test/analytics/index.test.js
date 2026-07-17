// test/analytics/index.test.js
import { describe, it, expect, vi } from "vitest";
import { createAnalytics } from "../../src/analytics/index.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

function make(overrides = {}) {
  let n = 0;
  const store = overrides.store || memStore();
  const fetchImpl = overrides.fetchImpl || vi.fn().mockResolvedValue({ ok: true, status: 201 });
  const a = createAnalytics({
    store,
    fetchImpl,
    now: () => new Date("2026-07-16T00:00:00.000Z"),
    gen: () => `id-${++n}`,
    isOnline: overrides.isOnline || (() => true),
    isNative: overrides.isNative || (() => false),
    config: { url: "https://x.supabase.co", key: "anon-key" },
  });
  return { a, store, fetchImpl };
}

describe("createAnalytics", () => {
  it("track is a hard no-op when consent is off (no queue write, no fetch)", async () => {
    const { a, store, fetchImpl } = make();
    a.track("session_start");
    expect(store._dump().analyticsQueue).toBeUndefined();
    expect(store._dump().analyticsAnonId).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("when consent on + online, track enqueues then flushes to transport", async () => {
    const { a, fetchImpl } = make();
    a.setConsent(true);
    await a.track("session_start"); // track returns the flush promise when online
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sent[0]).toMatchObject({
      name: "session_start",
      platform: "web",
      anon_id: "id-2", // id-1 is the session id created first
      session_id: "id-1",
    });
  });

  it("offline: track enqueues but does not fetch; flush sends once online", async () => {
    let online = false;
    const store = memStore();
    const { a, fetchImpl } = make({ store, isOnline: () => online });
    a.setConsent(true);
    a.track("session_start");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(store._dump().analyticsQueue.length).toBe(1);
    online = true;
    await a.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(store._dump().analyticsQueue.length).toBe(0);
  });

  it("flush re-enqueues the batch when transport fails", async () => {
    const store = memStore();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { a } = make({ store, fetchImpl });
    a.setConsent(true);
    a.track("session_start");
    await a.flush();
    await a.flush(); // twice, still failing
    expect(store._dump().analyticsQueue.length).toBe(1); // preserved, not lost
  });

  it("setConsent(false) clears the queue and anon id (revocation)", async () => {
    const store = memStore();
    const { a } = make({ store, isOnline: () => false });
    a.setConsent(true);
    a.track("session_start");
    expect(store._dump().analyticsQueue.length).toBe(1);
    a.setConsent(false);
    expect(store._dump().analyticsQueue).toEqual([]);
    expect(store._dump().analyticsAnonId).toBeNull();
    expect(a.isEnabled()).toBe(false);
  });

  it("platform is android when isNative()", () => {
    const store = memStore();
    const { a } = make({ store, isNative: () => true, isOnline: () => false });
    a.setConsent(true);
    a.track("session_start");
    expect(store._dump().analyticsQueue[0].platform).toBe("android");
  });

  it("serializes overlapping flushes: rapid tracks batch into one in-flight run, no scatter", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const store = memStore();
    const { a } = make({ store, fetchImpl });
    a.setConsent(true);
    const p = a.track("session_start"); // starts the only in-flight flush; drains [e1] then awaits send
    a.track("session_complete", { duration_bucket: "1-5m" }); // enqueued; flush guard prevents a 2nd sender
    a.track("review_recovery"); // enqueued too
    await p; // the single flush drain-loop resolves after draining everything
    expect(store._dump().analyticsQueue.length).toBe(0); // all events drained
    // exactly two sends (batch [e1], then batch [e2,e3]) — batched, not one-per-event
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondBatch = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(secondBatch.length).toBe(2);
  });
});
