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
  let flushing = false;

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
    if (flushing) return;
    if (!isEnabled(store)) return;
    if (isOnline && !isOnline()) return;
    flushing = true;
    try {
      while (true) {
        if (!isEnabled(store)) break;
        if (isOnline && !isOnline()) break;
        const batch = drain(store);
        if (!batch.length) break;
        const r = await send(batch, { url: config.url, key: config.key, fetchImpl });
        if (!r.ok) {
          for (const e of batch) enqueue(store, e);
          break;
        }
      }
    } finally {
      flushing = false;
    }
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
