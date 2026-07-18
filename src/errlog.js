"use strict";
// Crash-visibility ring buffer. Pure helpers only; main.js installs the
// window handlers and persists through the store under "errlog" (local-only —
// deliberately NOT in merge.js SYNC_KEYS, and never transmitted: analytics
// stays dark until the Settings consent toggle ships).
export const ERRLOG_MAX = 30;
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
