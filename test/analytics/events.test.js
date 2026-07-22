// test/analytics/events.test.js
import { describe, it, expect } from "vitest";
import { EVENT_NAMES, makeEvent, durationBucket } from "../../src/analytics/events.js";

const base = {
  ts: "2026-07-16T00:00:00.000Z",
  anon_id: "anon-1",
  session_id: "sess-1",
  app_version: "0.2.0",
  platform: "web",
};

describe("makeEvent", () => {
  it("builds a session_start event with the base fields", () => {
    const ev = makeEvent("session_start", { ...base });
    expect(ev).toEqual({
      name: "session_start",
      ts: "2026-07-16T00:00:00.000Z",
      anon_id: "anon-1",
      session_id: "sess-1",
      app_version: "0.2.0",
      platform: "web",
    });
  });

  it("returns null for an unknown event name", () => {
    expect(makeEvent("not_a_real_event", { ...base })).toBeNull();
  });

  it("keeps only allowlisted prop keys and drops the rest (PII strip)", () => {
    const ev = makeEvent("session_complete", {
      ...base,
      props: { duration_bucket: "1-5m", hanzi: "猫", email: "a@b.c" },
    });
    expect(ev.props).toEqual({ duration_bucket: "1-5m" });
  });

  it("omits props entirely when none are allowlisted", () => {
    const ev = makeEvent("session_start", { ...base, props: { hanzi: "猫" } });
    expect(ev.props).toBeUndefined();
  });

  it("includes level_scope only when truthy", () => {
    expect(makeEvent("session_start", { ...base }).level_scope).toBeUndefined();
    expect(makeEvent("session_start", { ...base, level_scope: "HSK3" }).level_scope).toBe("HSK3");
  });

  it("every declared name maps through makeEvent", () => {
    for (const n of EVENT_NAMES) expect(makeEvent(n, { ...base }).name).toBe(n);
  });

  it("keeps only the PII-free Street funnel dimensions", () => {
    expect(makeEvent("street_preview", { ...base, props: { item_id: "koi-pond", source: "street_shop", email: "nope@example.com" } }).props)
      .toEqual({ item_id: "koi-pond", source: "street_shop" });
    expect(makeEvent("street_decorate_complete", { ...base, props: { actions_bucket: "4+", used_auto_arrange: true, exact_actions: 17 } }).props)
      .toEqual({ actions_bucket: "4+", used_auto_arrange: true });
    expect(makeEvent("street_purchase", { ...base, props: { item_id: "koi-pond", source: "street_preview", placed_immediately: false, coins: 6000 } }).props)
      .toEqual({ item_id: "koi-pond", source: "street_preview", placed_immediately: false });
  });
});

describe("durationBucket", () => {
  it("buckets by minutes", () => {
    expect(durationBucket(30 * 1000)).toBe("<1m");
    expect(durationBucket(3 * 60000)).toBe("1-5m");
    expect(durationBucket(10 * 60000)).toBe("5-15m");
    expect(durationBucket(20 * 60000)).toBe("15-30m");
    expect(durationBucket(45 * 60000)).toBe(">30m");
  });
});
