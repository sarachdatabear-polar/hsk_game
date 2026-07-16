# Analytics Dark Transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dark, provider-agnostic analytics transport (Supabase-native) that emits nothing until a consent flag is on and the owner completes the R3 gate.

**Architecture:** A new pure-module cluster `src/analytics/` (events contract, identity, consent gate, offline queue, raw-fetch transport, orchestrator factory), unit-tested by dependency injection. `main.js` constructs one instance and wires session-lifecycle tracking + a Settings toggle. Events are batch-POSTed with the anon key only (never the user JWT) to Supabase PostgREST.

**Tech Stack:** Vanilla JS ES modules, esbuild IIFE bundle, vitest, Supabase PostgREST (`fetch`).

## Global Constraints

- **House contract for every `src/analytics/*` module:** never throws; offline-guarded; takes an injected `{get, set}` store (never touches `localStorage` directly); pure and unit-tested. Mirrors `src/cloud.js` / `src/sync.js`.
- **localStorage keys:** `nbhsk.*` namespaced via the caller's `store` helper. Analytics keys: `nbhsk.analyticsEnabled`, `nbhsk.analyticsAnonId`, `nbhsk.analyticsQueue`. Callers pass the **bare** key (`store.get("analyticsEnabled", false)`).
- **Consent flag `nbhsk.analyticsEnabled` defaults to `false`.** `track()` is a hard no-op until it is `true`. Zero emission for offline guests.
- **Transport uses the anon key ONLY** (both `apikey` and `Authorization: Bearer`), never a user JWT, so every insert runs as the `anon` role. `Prefer: return=minimal` is **required** (the table has no SELECT policy).
- **No PII:** no hanzi/word content, display name, or auth id in any event — only enumerated names + allowlisted prop keys survive `makeEvent`.
- **UUID generator is injected** with a non-crypto fallback (`crypto.randomUUID` is undefined on `file://`).
- **`crypto.randomUUID`, `Date`, `fetch` are never referenced directly inside `src/analytics/*`** — they arrive as injected deps (`gen`, `now`, `fetchImpl`) so modules stay pure/testable.
- **Tests:** vitest, ESM, one `test/analytics/<module>.test.js` per module. DI over mocking (in-memory `memStore`, fake `fetch`), matching `test/sync.test.js`.
- **`main.js` wiring is untested by design** — Task 8 verifies via build + headless smoke, not unit tests.
- After changing `src/`, run `npm run build` — the deployed app uses `dist/app.js`.
- **This lands on `development` and stays dark by construction** (no `events` table exists yet). Do NOT bump `sw.js` `SHELL` in this branch.

---

### Task 1: Event contract (`events.js`)

**Files:**
- Create: `src/analytics/events.js`
- Test: `test/analytics/events.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `EVENT_NAMES: readonly string[]`
  - `PROP_ALLOWLIST: Readonly<Record<string, string[]>>`
  - `makeEvent(name: string, ctx: object): object | null` — validated PII-free record, or `null` for an unknown name. `ctx` fields: `ts, anon_id, session_id, app_version, platform, level_scope?, props?`.
  - `durationBucket(ms: number): string`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/events.test.js`
Expected: FAIL — cannot resolve `../../src/analytics/events.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/events.js
// Event contract for the analytics dark transport. Pure — no I/O.
// PII-free by construction: only enumerated names + allowlisted prop keys survive.

export const EVENT_NAMES = Object.freeze([
  "session_start",
  "session_complete",
  "review_recovery",
  "delayed_recall",
  "notif_permission",
  "store_open",
  "product_view",
  "purchase_start",
  "purchase_success",
  "purchase_fail",
]);

// Allowlisted prop keys per event. Anything not listed is dropped.
export const PROP_ALLOWLIST = Object.freeze({
  session_start: [],
  session_complete: ["duration_bucket"],
  review_recovery: [],
  delayed_recall: [],
  notif_permission: ["result"], // "granted" | "denied" | "dismissed"
  store_open: [],
  product_view: ["product"],
  purchase_start: ["product"],
  purchase_success: ["product"],
  purchase_fail: ["product", "reason"],
});

function pickAllowed(name, props) {
  const allowed = PROP_ALLOWLIST[name] || [];
  const out = {};
  if (props && typeof props === "object") {
    for (const k of allowed) if (props[k] !== undefined) out[k] = props[k];
  }
  return out;
}

// Build a validated, PII-free event record. Returns null for an unknown name.
export function makeEvent(name, ctx = {}) {
  if (!EVENT_NAMES.includes(name)) return null;
  const ev = {
    name,
    ts: ctx.ts,
    anon_id: ctx.anon_id,
    session_id: ctx.session_id,
    app_version: ctx.app_version,
    platform: ctx.platform,
  };
  if (ctx.level_scope) ev.level_scope = ctx.level_scope;
  const props = pickAllowed(name, ctx.props);
  if (Object.keys(props).length) ev.props = props;
  return ev;
}

export function durationBucket(ms) {
  const min = ms / 60000;
  if (min < 1) return "<1m";
  if (min < 5) return "1-5m";
  if (min < 15) return "5-15m";
  if (min < 30) return "15-30m";
  return ">30m";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/events.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/analytics/events.js test/analytics/events.test.js
git commit -m "feat(analytics): event contract with PII-free prop allowlist"
```

---

### Task 2: Anonymous identity (`identity.js`)

**Files:**
- Create: `src/analytics/identity.js`
- Test: `test/analytics/identity.test.js`

**Interfaces:**
- Consumes: an injected `store` (`{get(key, default), set(key, value)}`) and a `gen()` UUID function.
- Produces:
  - `getAnonId(store, gen): string` — reuse `nbhsk.analyticsAnonId` or create one on first call.
  - `newSessionId(gen): string`
  - `clearAnonId(store): void`

- [ ] **Step 1: Write the failing test**

```js
// test/analytics/identity.test.js
import { describe, it, expect } from "vitest";
import { getAnonId, newSessionId, clearAnonId } from "../../src/analytics/identity.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

describe("identity", () => {
  it("creates an anon id once and reuses it", () => {
    let n = 0;
    const gen = () => `uuid-${++n}`;
    const store = memStore();
    const first = getAnonId(store, gen);
    const second = getAnonId(store, gen);
    expect(first).toBe("uuid-1");
    expect(second).toBe("uuid-1"); // reused, gen not called again
    expect(store._dump().analyticsAnonId).toBe("uuid-1");
  });

  it("newSessionId returns a fresh id from gen each call", () => {
    let n = 0;
    const gen = () => `s-${++n}`;
    expect(newSessionId(gen)).toBe("s-1");
    expect(newSessionId(gen)).toBe("s-2");
  });

  it("clearAnonId removes the stored id so the next getAnonId regenerates", () => {
    let n = 0;
    const gen = () => `uuid-${++n}`;
    const store = memStore();
    getAnonId(store, gen);       // uuid-1
    clearAnonId(store);
    expect(getAnonId(store, gen)).toBe("uuid-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/identity.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/identity.js
// Anonymous identity for analytics. Pure + injectable store/gen.
// anon_id is a random UUID created ONLY on first call (i.e. after consent),
// never a device/ad id. session_id is per app-open.

const ANON_KEY = "analyticsAnonId";

export function getAnonId(store, gen) {
  let id = store.get(ANON_KEY, null);
  if (!id) {
    id = gen();
    store.set(ANON_KEY, id);
  }
  return id;
}

export function newSessionId(gen) {
  return gen();
}

export function clearAnonId(store) {
  store.set(ANON_KEY, null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/identity.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/identity.js test/analytics/identity.test.js
git commit -m "feat(analytics): anonymous install id + per-session id"
```

---

### Task 3: Consent gate (`consent.js`)

**Files:**
- Create: `src/analytics/consent.js`
- Test: `test/analytics/consent.test.js`

**Interfaces:**
- Consumes: injected `store`.
- Produces:
  - `isEnabled(store): boolean` — reads `nbhsk.analyticsEnabled`, default `false`.
  - `setEnabled(store, on): void` — writes the boolean flag. (The revoke cascade — clearing queue + anon id — lives in the orchestrator, Task 6, so this module stays a pure flag.)

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/consent.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/consent.js
// Analytics consent flag. Default OFF. Pure + injectable store.
const KEY = "analyticsEnabled";

export function isEnabled(store) {
  return store.get(KEY, false) === true;
}

export function setEnabled(store, on) {
  store.set(KEY, on === true);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/consent.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/consent.js test/analytics/consent.test.js
git commit -m "feat(analytics): consent gate flag (default off)"
```

---

### Task 4: Offline queue (`queue.js`)

**Files:**
- Create: `src/analytics/queue.js`
- Test: `test/analytics/queue.test.js`

**Interfaces:**
- Consumes: injected `store`.
- Produces:
  - `DEFAULT_CAP: number` (200)
  - `enqueue(store, event, cap = DEFAULT_CAP): number` — append, drop-oldest on overflow, return new length.
  - `drain(store): object[]` — return all queued events and empty the queue.
  - `clear(store): void`

- [ ] **Step 1: Write the failing test**

```js
// test/analytics/queue.test.js
import { describe, it, expect } from "vitest";
import { enqueue, drain, clear, DEFAULT_CAP } from "../../src/analytics/queue.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

describe("queue", () => {
  it("enqueues and drains in order", () => {
    const store = memStore();
    enqueue(store, { name: "a" });
    enqueue(store, { name: "b" });
    expect(drain(store)).toEqual([{ name: "a" }, { name: "b" }]);
    expect(drain(store)).toEqual([]); // drained
  });

  it("drops the oldest when over cap", () => {
    const store = memStore();
    for (let i = 0; i < 5; i++) enqueue(store, { i }, 3);
    expect(drain(store)).toEqual([{ i: 2 }, { i: 3 }, { i: 4 }]);
  });

  it("clear empties the queue", () => {
    const store = memStore();
    enqueue(store, { name: "a" });
    clear(store);
    expect(drain(store)).toEqual([]);
  });

  it("DEFAULT_CAP is a sane bound", () => {
    expect(DEFAULT_CAP).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/queue.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/queue.js
// Bounded offline queue for analytics events. Pure + injectable store.
const KEY = "analyticsQueue";
export const DEFAULT_CAP = 200;

export function enqueue(store, event, cap = DEFAULT_CAP) {
  const q = store.get(KEY, []);
  q.push(event);
  while (q.length > cap) q.shift(); // drop oldest on overflow
  store.set(KEY, q);
  return q.length;
}

export function drain(store) {
  const q = store.get(KEY, []);
  store.set(KEY, []);
  return q;
}

export function clear(store) {
  store.set(KEY, []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/queue.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/queue.js test/analytics/queue.test.js
git commit -m "feat(analytics): bounded localStorage offline queue"
```

---

### Task 5: Supabase transport (`transport.js`)

**Files:**
- Create: `src/analytics/transport.js`
- Test: `test/analytics/transport.test.js`

**Interfaces:**
- Consumes: an injected `fetchImpl` plus `{ url, key }`.
- Produces:
  - `send(events: object[], opts: { url, key, fetchImpl }): Promise<{ ok: boolean, status: number }>` — batch POST, never throws.

- [ ] **Step 1: Write the failing test**

```js
// test/analytics/transport.test.js
import { describe, it, expect, vi } from "vitest";
import { send } from "../../src/analytics/transport.js";

const opts = (fetchImpl) => ({ url: "https://x.supabase.co", key: "anon-key", fetchImpl });

describe("transport.send", () => {
  it("POSTs the batch to /rest/v1/events with anon key + Prefer: return=minimal", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const events = [{ name: "session_start" }];
    const r = await send(events, opts(fetchImpl));
    expect(r).toEqual({ ok: true, status: 201 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/events");
    expect(init.method).toBe("POST");
    expect(init.headers.apikey).toBe("anon-key");
    expect(init.headers.Authorization).toBe("Bearer anon-key");
    expect(init.headers.Prefer).toBe("return=minimal");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(events);
  });

  it("does not call fetch for an empty batch", async () => {
    const fetchImpl = vi.fn();
    const r = await send([], opts(fetchImpl));
    expect(r.ok).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never throws when fetch rejects — returns { ok:false }", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await send([{ name: "x" }], opts(fetchImpl));
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
  });

  it("reports ok:false on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const r = await send([{ name: "x" }], opts(fetchImpl));
    expect(r).toEqual({ ok: false, status: 404 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/transport.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/transport.js
// Raw-fetch transport to Supabase PostgREST. Never throws.
// Uses ONLY the anon key (no user JWT) so every insert runs as the `anon`
// role and events stay de-identified even for signed-in players.
// `Prefer: return=minimal` is REQUIRED: the events table has no SELECT
// policy, so a returned row (PostgREST default) would fail RLS.

export async function send(events, { url, key, fetchImpl }) {
  if (!events || !events.length) return { ok: true, status: 0 };
  try {
    const res = await fetchImpl(`${url}/rest/v1/events`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(events),
    });
    return { ok: !!res.ok, status: res.status || 0 };
  } catch {
    return { ok: false, status: 0 };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/transport.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/transport.js test/analytics/transport.test.js
git commit -m "feat(analytics): anon-key raw-fetch PostgREST transport"
```

---

### Task 6: Orchestrator factory (`index.js`)

**Files:**
- Create: `src/analytics/index.js`
- Test: `test/analytics/index.test.js`

**Interfaces:**
- Consumes: `makeEvent` (Task 1), `getAnonId`/`newSessionId`/`clearAnonId` (Task 2), `isEnabled`/`setEnabled` (Task 3), `enqueue`/`drain`/`clear` (Task 4), `send` (Task 5).
- Produces:
  - `createAnalytics({ store, fetchImpl, now, gen, isOnline, isNative, config }): { track, flush, setConsent, isEnabled }`
    - `track(name, props): void` — no-op unless consent on.
    - `flush(): Promise<void>`
    - `setConsent(on): void`
    - `isEnabled(): boolean`
  - `config` is `{ url, key }`.

- [ ] **Step 1: Write the failing test**

```js
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/analytics/index.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/analytics/index.js
// Orchestrator for the dark analytics transport. Constructed once by main.js
// with all impure deps injected. track() is a hard no-op until consent is on.

import { makeEvent } from "./events.js";
import { getAnonId, newSessionId, clearAnonId } from "./identity.js";
import { isEnabled, setEnabled } from "./consent.js";
import { enqueue, drain, clear } from "./queue.js";
import { send } from "./transport.js";

// Injected at build time via esbuild --define; falls back to "dev" in tests/raw modules.
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export function createAnalytics({ store, fetchImpl, now, gen, isOnline, isNative, config }) {
  const sessionId = newSessionId(gen);
  const platform = isNative && isNative() ? "android" : "web";

  function baseCtx() {
    return {
      ts: now().toISOString(),
      anon_id: getAnonId(store, gen),
      session_id: sessionId,
      app_version: APP_VERSION,
      platform,
    };
  }

  async function flush() {
    if (!isEnabled(store)) return;
    if (isOnline && !isOnline()) return;
    const batch = drain(store);
    if (!batch.length) return;
    const r = await send(batch, { url: config.url, key: config.key, fetchImpl });
    if (!r.ok) for (const e of batch) enqueue(store, e);
  }

  function track(name, props) {
    if (!isEnabled(store)) return;
    const ev = makeEvent(name, {
      ...baseCtx(),
      level_scope: props && props.level_scope,
      props,
    });
    if (!ev) return;
    enqueue(store, ev);
    // Return the flush promise when online so callers/tests can await it;
    // main.js calls track() fire-and-forget, which is fine.
    if (!isOnline || isOnline()) return flush();
  }

  function setConsent(on) {
    setEnabled(store, on);
    if (!on) {
      clear(store);
      clearAnonId(store);
    }
  }

  return { track, flush, setConsent, isEnabled: () => isEnabled(store) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/analytics/index.test.js`
Expected: PASS (all six cases).

- [ ] **Step 5: Run the whole analytics suite + full suite**

Run: `npx vitest run test/analytics/` then `npm test`
Expected: all analytics tests pass; the full ~350-test suite still green (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/analytics/index.js test/analytics/index.test.js
git commit -m "feat(analytics): orchestrator factory (consent-gated track + flush)"
```

---

### Task 7: Inject `app_version` at build time

**Files:**
- Create: `scripts/build.mjs`
- Modify: `package.json` (`scripts.build`)

**Interfaces:**
- Produces: a global `__APP_VERSION__` string define at bundle time, consumed by `src/analytics/index.js` (Task 6).

**Why:** `package.json` `version` (`0.2.0`) is not exposed to the bundle today. A node build script reads it and injects it cross-platform (the inline `esbuild` CLI can't interpolate the version portably for the Windows `cap:sync` path).

- [ ] **Step 1: Create the build script**

```js
// scripts/build.mjs
// Bundles src/main.js → dist/app.js, injecting the package version as
// __APP_VERSION__ (used by the analytics event contract). Replaces the inline
// esbuild CLI so the version is sourced from package.json cross-platform.
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  minify: true,
  outfile: "dist/app.js",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
```

- [ ] **Step 2: Point the build script at it**

In `package.json`, change the `build` script from:
```json
"build": "esbuild src/main.js --bundle --format=iife --minify --outfile=dist/app.js",
```
to:
```json
"build": "node scripts/build.mjs",
```

- [ ] **Step 3: Run the build and confirm it still produces the bundle**

Run: `npm run build && test -f dist/app.js && echo OK`
Expected: `OK` (no esbuild errors). Note: `__APP_VERSION__` only appears in the bundle once `index.js` is imported (Task 8) — this task just proves the new build path works.

- [ ] **Step 4: Confirm tests still pass**

Run: `npm test`
Expected: full suite green (build change is behavior-neutral for existing code).

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs package.json
git commit -m "build(analytics): inject __APP_VERSION__ from package.json via node build script"
```

---

### Task 8: Wire session lifecycle + Settings toggle (`main.js`, `i18n.js`)

**Files:**
- Modify: `src/main.js` (construct instance; `session_start`/`session_complete`; flush on edges; toggle handler)
- Modify: `src/i18n.js` (consent toggle strings, `en` + `th`)
- Modify: `index.html` (one toggle row in the More/settings surface)

**Interfaces:**
- Consumes: `createAnalytics` (Task 6); `SUPABASE_URL` / `SUPABASE_KEY` from `src/cloud-config.js`; `isNative` from `src/native.js`.
- Produces: nothing consumed by later tasks. **`main.js` wiring is untested by design** — verified by build + smoke, not unit tests.

**Context for the worker (read before editing):**
- `store` helper is defined at `src/main.js:83`. Construct the analytics instance just after it.
- The online-edge handler is `src/main.js:1730` (`window.addEventListener("online", …)`); `syncEdge` is `src/main.js:714`; the app-hide path is `src/main.js:1726` (`pushEdge("hide")`).
- The existing sound toggle is the pattern to mirror: `#more-sound` in `index.html`, handler `toggleSfx` at `src/main.js:1567`, wired at `src/main.js:1573`. Put the analytics toggle in the same More/settings surface.
- i18n `STRINGS` has `en` and `th` blocks only (no `zh`). Add keys to **both** (a parity test enforces this).

- [ ] **Step 1: Add i18n strings to `src/i18n.js`**

Add these keys to the `en` block and matching translated values to the `th` block (translate the values; keep keys identical):
```js
// en
"settings.analytics": "Share anonymous usage data",
"settings.analyticsHint": "Helps improve the game. No personal info, no word history. Off by default.",
// th
"settings.analytics": "แชร์ข้อมูลการใช้งานแบบไม่ระบุตัวตน",
"settings.analyticsHint": "ช่วยพัฒนาเกม ไม่มีข้อมูลส่วนตัว ไม่มีประวัติคำศัพท์ ปิดไว้เป็นค่าเริ่มต้น",
```

- [ ] **Step 2: Add the toggle markup to `index.html`**

In the More/settings surface (next to `#more-sound`), add a toggle row bound to `#analytics-consent`, labelled with `t("settings.analytics")` and hint `t("settings.analyticsHint")`, following the existing row markup/classes. It must render **off** by default.

- [ ] **Step 3: Construct the analytics instance in `src/main.js`**

Add the import near the other helper imports (top of file):
```js
import { createAnalytics } from "./analytics/index.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./cloud-config.js";
import { isNative } from "./native.js"; // if not already imported
```
Just after the `store` helper (`src/main.js:83`), add:
```js
function analyticsUuid() {
  try {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  // Non-crypto fallback (crypto.randomUUID is undefined on file://):
  return "axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
const analytics = createAnalytics({
  store,
  fetchImpl: (...args) => fetch(...args),
  now: () => new Date(),
  gen: analyticsUuid,
  isOnline: () => navigator.onLine !== false,
  isNative,
  config: { url: SUPABASE_URL, key: SUPABASE_KEY },
});
let analyticsSessionStart = Date.now();
```

- [ ] **Step 4: Track session lifecycle + flush on edges**

- At boot (after the instance is created / after first screen shows), call `analytics.track("session_start");` and set `analyticsSessionStart = Date.now();`.
- In the app-hide path (`src/main.js:1726`, alongside `pushEdge("hide")`), add:
```js
analytics.track("session_complete", { duration_bucket: durationBucket(Date.now() - analyticsSessionStart) });
```
Import `durationBucket` from `./analytics/events.js`.
- In the `online` handler (`src/main.js:1730`) and inside `syncEdge` (`src/main.js:714`), add `analytics.flush();`.

- [ ] **Step 5: Wire the toggle handler**

After the toggle markup is present, add (mirroring `toggleSfx`):
```js
const analyticsToggle = document.getElementById("analytics-consent");
if (analyticsToggle) {
  analyticsToggle.checked = analytics.isEnabled(); // false by default
  analyticsToggle.addEventListener("change", () => {
    analytics.setConsent(analyticsToggle.checked);
  });
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: no errors; `dist/app.js` regenerated.

- [ ] **Step 7: Confirm `__APP_VERSION__` landed in the bundle**

Run: `grep -o "0\.2\.0" dist/app.js | head -1`
Expected: prints `0.2.0` (the define was applied and `index.js` is now bundled).

- [ ] **Step 8: Headless smoke — boots clean, dark by default**

Run: `npm run serve` (separate shell) then load the app headless (Playwright chromium, per the repo screenshot harness) and check the console.
Expected: app boots, `window.HSK_DATA` present, **0 console errors**, and with the toggle untouched **no request to `/rest/v1/events`** occurs (network tab empty for that path). Toggling analytics ON then reloading may attempt a flush that 404s (no table yet) — that must not throw or surface any user-visible error.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: full suite green (unchanged — wiring is in the untested `main.js`).

- [ ] **Step 10: Commit**

```bash
git add src/main.js src/i18n.js index.html dist/app.js
git commit -m "feat(analytics): wire session lifecycle + Settings consent toggle (dark)"
```

---

### Task 9: Draft the `events` table DDL (owner applies)

**Files:**
- Create: `supabase/analytics-events.sql`

**Interfaces:** none (SQL artifact; not auto-run — the repo has no migrations dir, tables are applied via the Supabase SQL editor).

- [ ] **Step 1: Write the draft migration**

```sql
-- supabase/analytics-events.sql
-- DRAFT — DO NOT APPLY until the R3 owner gate is complete:
--   privacy-policy §2e text approved, store Data Safety answers filled,
--   PDPA/GDPR reviewer sign-off. The shipped Settings toggle goes LIVE the
--   instant this table exists — that existence is the real kill-switch.
-- Apply via the Supabase SQL editor (this repo has no migrations runner).
-- Verify no existing `events` table conflicts before running.

create table if not exists public.events (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  name         text not null,
  ts           timestamptz,
  anon_id      uuid not null,
  session_id   uuid,
  level_scope  text,
  props        jsonb,
  app_version  text,
  platform     text
);

alter table public.events enable row level security;

-- Client is write-only: anon may INSERT, and there is deliberately NO SELECT
-- policy (matches the transport's `Prefer: return=minimal`).
create policy "anon insert events" on public.events
  for insert to anon with check (true);
```

- [ ] **Step 2: Sanity-check the SQL parses (optional, no live DB)**

Visual review only — confirm column set matches the event contract in `src/analytics/events.js` (`name, ts, anon_id, session_id, level_scope, props, app_version, platform`).

- [ ] **Step 3: Commit**

```bash
git add supabase/analytics-events.sql
git commit -m "docs(analytics): draft events table DDL + anon-insert RLS (owner applies)"
```

---

## Final verification (after all tasks)

- [ ] `npm test` — full suite green, including the new `test/analytics/*` files.
- [ ] `npm run build` — clean; `dist/app.js` contains `0.2.0`.
- [ ] Headless smoke — boots with `HSK_DATA`, 0 console errors, **no `/rest/v1/events` request while the toggle is off** (the dark guarantee, empirically).
- [ ] `git log --oneline` — one commit per task, messages as above.

## Self-review notes (spec coverage)

- Event contract + PII allowlist → Task 1. Identity → Task 2. Consent default-off → Task 3. Offline queue → Task 4. Raw-fetch transport w/ `Prefer: return=minimal` + anon-only → Task 5. Orchestrator (no-op-when-off, flush, revoke-cascade) → Task 6. `app_version` build inject → Task 7. Session-lifecycle wiring + Settings toggle + i18n → Task 8. Draft DDL/RLS + kill-switch invariant → Task 9.
- Out of scope (as specified): first-run consent card; funnel/SRS/notif wiring; server-side D1/D7 SQL. No `SHELL` bump (dark, `development`-only).
