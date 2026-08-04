import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { authorizeWebhook, processEvent, verifyWebhookSignature } from "../supabase/functions/rc-webhook/core.js";
import { PRODUCTS, productById } from "../src/monetization/products.js";

// NOTE: this file tests core.js only — the pure event-to-grant decision
// logic. index.ts (the Deno wrapper around Supabase I/O) is intentionally
// thin and untested here; it has no branching worth a unit test beyond what
// core.js already covers, and Deno-flavored TS doesn't run under vitest.

function rcEvent(overrides) {
  return {
    api_version: "1.0",
    event: {
      id: "evt-1",
      type: "INITIAL_PURCHASE",
      app_user_id: "11111111-1111-4111-8111-111111111111",
      product_id: "coins_s",
      transaction_id: "GPA.1234-5678",
      ...overrides,
    },
  };
}

async function signedHeader(rawBody, secret, timestamp) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("processEvent — grants per product", () => {
  it("coins_s grants 1000 coins, no entitlement", () => {
    const r = processEvent(rcEvent({ product_id: "coins_s" }), PRODUCTS);
    expect(r).toEqual({
      ok: true,
      grant: {
        userId: "11111111-1111-4111-8111-111111111111",
        productId: "coins_s",
        eventId: "evt-1",
        orderId: "GPA.1234-5678",
        coins: productById("coins_s").coins,
        entitlement: null,
      },
    });
    expect(r.grant.coins).toBe(1000);
    expect(r.grant.orderId).toBe("GPA.1234-5678");
  });

  it("supporter grants 2000 coins + the supporter entitlement", () => {
    const r = processEvent(rcEvent({ product_id: "supporter" }), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant.coins).toBe(2000);
    expect(r.grant.entitlement).toBe("supporter");
  });

  it.each(PRODUCTS)("grants exactly the catalog coin amount for $id", (product) => {
    const r = processEvent(rcEvent({ product_id: product.id }), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant.coins).toBe(product.coins);
    expect(r.grant.entitlement).toBe(product.entitlement || null);
  });
});

describe("processEvent — accepted event types", () => {
  it("accepts INITIAL_PURCHASE", () => {
    const r = processEvent(rcEvent({ type: "INITIAL_PURCHASE" }), PRODUCTS);
    expect(r.ok).toBe(true);
  });

  it("accepts NON_RENEWING_PURCHASE (RC's type for non-subscription buys)", () => {
    const r = processEvent(rcEvent({ type: "NON_RENEWING_PURCHASE" }), PRODUCTS);
    expect(r.ok).toBe(true);
  });
});

describe("processEvent — ignored event types", () => {
  it("ignores TEST pings", () => {
    const r = processEvent(rcEvent({ type: "TEST" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });

  it("ignores RENEWAL (subscriptions aren't sold; also not a grant trigger)", () => {
    const r = processEvent(rcEvent({ type: "RENEWAL" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });

  it("ignores CANCELLATION", () => {
    const r = processEvent(rcEvent({ type: "CANCELLATION" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });
});

describe("processEvent — malformed / unresolvable events", () => {
  it("rejects an unknown product id", () => {
    const r = processEvent(rcEvent({ product_id: "coins_xxl" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "unknown-product" });
  });

  it("rejects a missing app_user_id", () => {
    const r = processEvent(rcEvent({ app_user_id: undefined }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-user" });
  });

  // Non-UUID app_user_ids are by-design ungrantable: the client app never
  // configures the RC SDK without a Supabase UUID (see
  // src/monetization/provider-revenuecat.js), so a dashboard TEST event's
  // $RCAnonymousID, an out-of-app store redemption, or a misconfigured
  // client can't ever pass grant_purchase's uuid cast. Must ack, not retry.
  it("rejects a non-UUID app_user_id (e.g. RC's $RCAnonymousID test identity)", () => {
    const r = processEvent(rcEvent({ app_user_id: "$RCAnonymousID:abc123" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "invalid-user" });
  });

  it("still grants for a well-formed UUID app_user_id", () => {
    const r = processEvent(rcEvent({ app_user_id: "11111111-1111-4111-8111-111111111111" }), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant.userId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("accepts an uppercase UUID app_user_id", () => {
    const r = processEvent(rcEvent({ app_user_id: "11111111-1111-4111-8111-111111111111".toUpperCase() }), PRODUCTS);
    expect(r.ok).toBe(true);
  });

  it("rejects a missing event id", () => {
    const r = processEvent(rcEvent({ id: undefined }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-event-id" });
  });

  it("rejects a missing store transaction id", () => {
    const r = processEvent(rcEvent({ transaction_id: undefined }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-transaction-id" });
  });

  it("rejects a garbage body with no event object", () => {
    expect(processEvent({ nope: true }, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent(null, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent(undefined, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent("garbage", PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent({ event: null }, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
  });
});

describe("webhook authorization", () => {
  it("accepts only the configured bearer secret", () => {
    expect(authorizeWebhook("Bearer secret-1", "secret-1")).toBe(true);
    expect(authorizeWebhook("Bearer wrong", "secret-1")).toBe(false);
  });

  it("fails closed when the secret is missing", () => {
    expect(authorizeWebhook("Bearer undefined", undefined)).toBe(false);
    expect(authorizeWebhook("Bearer ", "")).toBe(false);
  });

  it("accepts a fresh HMAC over the exact raw body", async () => {
    const now = 1_800_000_000;
    const body = JSON.stringify(rcEvent({ id: "signed" }));
    const header = await signedHeader(body, "signing-secret", now);
    expect(await verifyWebhookSignature(body, header, "signing-secret", now)).toBe(true);
  });

  it("rejects tampering, wrong secrets, malformed headers, and missing configuration", async () => {
    const now = 1_800_000_000;
    const body = JSON.stringify(rcEvent({}));
    const header = await signedHeader(body, "signing-secret", now);
    expect(await verifyWebhookSignature(`${body} `, header, "signing-secret", now)).toBe(false);
    expect(await verifyWebhookSignature(body, header, "wrong", now)).toBe(false);
    expect(await verifyWebhookSignature(body, "garbage", "signing-secret", now)).toBe(false);
    expect(await verifyWebhookSignature(body, header, "", now)).toBe(false);
  });

  it("rejects replayed signatures outside the five-minute window", async () => {
    const signedAt = 1_800_000_000;
    const body = JSON.stringify(rcEvent({}));
    const header = await signedHeader(body, "signing-secret", signedAt);
    expect(await verifyWebhookSignature(body, header, "signing-secret", signedAt + 300)).toBe(true);
    expect(await verifyWebhookSignature(body, header, "signing-secret", signedAt + 301)).toBe(false);
  });
});

describe("grant_purchase migration privileges", () => {
  // 2026-07-12-iap-golive.sql is immutable history: it applied the six-arg
  // signature and stays exactly as it shipped. schema.sql is the fresh-
  // install mirror of CURRENT state, so it moved to the seven-arg signature
  // (p_source, 2026-08-04-entitlement-source.sql) — these must not share a
  // regex, or a future signature change could loosen both without anyone
  // noticing one of them regressed.
  it("explicitly grants only the historical six-argument function to service_role in the 2026-07-12 migration", () => {
    const sql = readFileSync(new URL("../docs/supabase/migrations/2026-07-12-iap-golive.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/grant execute on function public\.grant_purchase\(uuid, integer, text, text, text, text\) to service_role;/i);
    expect(sql).toMatch(/revoke execute on function public\.grant_purchase\(uuid, integer, text, text, text, text\) from public, anon, authenticated;/i);
  });

  it("explicitly grants only the current seven-argument function to service_role in schema.sql", () => {
    const sql = readFileSync(new URL("../docs/supabase/schema.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/grant execute on function public\.grant_purchase\(uuid, integer, text, text, text, text, text\) to service_role;/i);
    expect(sql).toMatch(/revoke execute on function public\.grant_purchase\(uuid, integer, text, text, text, text, text\) from public, anon, authenticated;/i);
  });
});

describe("entitlements.source migration (2026-08-04-entitlement-source.sql)", () => {
  const migration = readFileSync(
    new URL("../docs/supabase/migrations/2026-08-04-entitlement-source.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../docs/supabase/schema.sql", import.meta.url), "utf8");

  it.each([
    ["migration", migration],
    ["schema.sql mirror", schema],
  ])("adds a defaulted trailing p_source param and drops the stale six-arg overload — %s", (_label, sql) => {
    expect(sql).toMatch(/drop function if exists public\.grant_purchase\(uuid, integer, text, text, text, text\);/i);
    expect(sql).toMatch(
      /create or replace function public\.grant_purchase\(\s*p_user_id uuid, p_delta integer, p_reason text, p_event_id text,\s*p_order_id text, p_entitlement text, p_source text default 'revenuecat'\s*\)/i);
  });

  it.each([
    ["migration", migration],
    ["schema.sql mirror", schema],
  ])("records source on BOTH the happy-path insert and the unique_violation heal — %s", (_label, sql) => {
    const inserts = [...sql.matchAll(/insert into public\.entitlements \(user_id, product_id, source\)\s*values \(p_user_id, p_entitlement, coalesce\(p_source, 'revenuecat'\)\)/gi)];
    expect(inserts.length).toBe(2);
  });

  it("keeps first-writer-wins on conflict (never relabels an existing row's source)", () => {
    // Both entitlement inserts in this function must stay "do nothing" — a
    // "do update set source = ..." would let a later duplicate delivery
    // rewrite an already-recorded grant's source.
    expect((migration.match(/on conflict \(user_id, product_id\) do nothing;/gi) || []).length).toBe(2);
    expect(migration).not.toMatch(/on conflict \(user_id, product_id\) do update/i);
  });
});
