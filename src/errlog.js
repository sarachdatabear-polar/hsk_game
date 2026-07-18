"use strict";
// Crash-visibility ring buffer. Pure helpers only; main.js installs the
// window handlers and persists through the store under "errlog" (local-only —
// deliberately NOT in merge.js SYNC_KEYS, and never transmitted: analytics
// stays dark until the Settings consent toggle ships).
export const ERRLOG_MAX = 30;
// A crash inside the rAF loop fires the same error every frame (~60×/s). Without
// this, each one is a JSON stringify + localStorage write. Collapse a repeat of
// the immediately-preceding entry (same msg+stk) within this window into a no-op.
export const ERRLOG_DEDUPE_MS = 5000;
const FIELD_MAX = 300;

export function errorEntry(source, message, stack, at) {
  return {
    at,                                       // epoch ms, injected by caller
    src: String(source || "error"),
    msg: String(message == null ? "" : message).slice(0, FIELD_MAX),
    stk: String(stack == null ? "" : stack).slice(0, FIELD_MAX),
  };
}

export function pushError(log, entry, max = ERRLOG_MAX) {
  const list = Array.isArray(log) ? log.slice() : [];
  list.push(entry);
  return list.length > max ? list.slice(list.length - max) : list;
}

// Like pushError, but drops a duplicate of the last entry (same msg+stk) seen
// within `windowMs`. Returns the input array UNCHANGED (same reference) when it
// throttles, so the caller can `if (next !== log) store.set(...)` and skip the
// persist entirely on the hot per-frame path.
export function pushErrorThrottled(log, entry, { max = ERRLOG_MAX, windowMs = ERRLOG_DEDUPE_MS } = {}) {
  if (Array.isArray(log) && log.length) {
    const last = log[log.length - 1];
    if (last.msg === entry.msg && last.stk === entry.stk && entry.at - last.at < windowMs) {
      return log;
    }
  }
  return pushError(log, entry, max);
}

export function describeErrorEvent(ev) {
  if (ev && "reason" in ev) {
    const r = ev.reason;
    return {
      source: "unhandledrejection",
      message: r && r.message ? r.message : String(r),
      stack: r && r.stack ? r.stack : "",
    };
  }
  const e = ev && ev.error;
  return {
    source: "error",
    message: (ev && ev.message) || (e && e.message) || "unknown",
    stack: e && e.stack ? e.stack : "",
  };
}
