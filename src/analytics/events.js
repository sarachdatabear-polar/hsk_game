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
  "street_open",
  "street_preview",
  "street_decorate_start",
  "street_decorate_complete",
  "street_item_interact",
  "street_purchase",
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
  street_open: ["source", "owned_bucket", "placed_bucket"],
  street_preview: ["item_id", "source"],
  street_decorate_start: ["owned_bucket", "placed_bucket"],
  street_decorate_complete: ["actions_bucket", "used_auto_arrange"],
  street_item_interact: ["behavior", "tier"],
  street_purchase: ["item_id", "source", "placed_immediately"],
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
export function makeEvent(name, ctx) {
  ctx = ctx || {};
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
