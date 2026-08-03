import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  RESEND_ENDPOINT,
  SUPPORTER_FILENAME,
  sendSupporterEmail,
  supporterEmail,
  supporterIdempotencyKey,
} from "../supabase/functions/_shared/supporter-email/core.js";
import { deliverSupporterGift } from "../supabase/functions/_shared/supporter-email/service.js";

function fakeSupabase({ claim = "claimed", email = "learner@example.com", confirmed = true, locale = "th", signedUrl = "https://storage.example/gift.zip" } = {}) {
  const calls = { rpc: [], user: [], storage: [], profile: [] };
  const client = {
    rpc: vi.fn(async (name, args) => {
      calls.rpc.push({ name, args });
      return name === "claim_supporter_delivery"
        ? { data: claim, error: null }
        : { data: args.p_provider_message_id ? "sent" : "failed", error: null };
    }),
    auth: { admin: { getUserById: vi.fn(async userId => {
      calls.user.push(userId);
      return { data: { user: email ? { email, email_confirmed_at: confirmed ? "2026-08-02T00:00:00Z" : null } : null }, error: null };
    }) } },
    from: vi.fn(() => ({
      select: () => ({
        eq: (_column, value) => ({ maybeSingle: async () => {
          calls.profile.push(value);
          return { data: { locale }, error: null };
        } }),
      }),
    })),
    storage: { from: vi.fn(bucket => ({ createSignedUrl: async (object, seconds) => {
      calls.storage.push({ bucket, object, seconds });
      return signedUrl ? { data: { signedUrl }, error: null } : { data: null, error: { message: "missing" } };
    } })) },
  };
  return { client, calls };
}

describe("supporter email copy", () => {
  it("has distinct Thai and English transactional copy", () => {
    expect(supporterEmail("th").subject).toContain("ของขวัญ");
    expect(supporterEmail("en").subject).toContain("Supporter gift");
    expect(supporterEmail("th").text).toContain("6 ไฟล์");
    expect(supporterEmail("en").text).toContain("six frequency-ranked PDF");
  });

  it("derives a stable, bounded idempotency key from the order", () => {
    expect(supporterIdempotencyKey("cs_123")).toBe("supporter-gift/cs_123");
    expect(supporterIdempotencyKey("")).toBeNull();
    expect(supporterIdempotencyKey("x".repeat(221))).toBeNull();
  });
});

describe("sendSupporterEmail", () => {
  it("sends the six-PDF ZIP as an idempotent Resend attachment", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: "email_1" }) }));
    const result = await sendSupporterEmail({
      fetchImpl,
      apiKey: "re_test",
      from: "Lucky Cat HSK <support@luckycathsk.com>",
      to: "learner@example.com",
      locale: "th",
      attachmentUrl: "https://storage.example/gift.zip?token=secret",
      orderId: "cs_123",
    });
    expect(result).toEqual({ ok: true, messageId: "email_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.headers["Idempotency-Key"]).toBe("supporter-gift/cs_123");
    expect(init.headers["User-Agent"]).toContain("Lucky-Cat-HSK");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["learner@example.com"]);
    expect(body.attachments).toEqual([{
      path: "https://storage.example/gift.zip?token=secret",
      filename: SUPPORTER_FILENAME,
    }]);
  });

  it("fails closed on missing configuration or provider rejection", async () => {
    expect(await sendSupporterEmail({})).toEqual({ ok: false, reason: "invalid-config" });
    const fetchImpl = async () => ({ ok: false, status: 422, json: async () => ({ message: "bad" }) });
    await expect(sendSupporterEmail({
      fetchImpl, apiKey: "re_test", from: "x@y.co", to: "a@b.co", locale: "en",
      attachmentUrl: "https://storage.example/gift.zip", orderId: "o1",
    })).resolves.toEqual({ ok: false, reason: "provider", status: 422 });
  });
});

describe("deliverSupporterGift", () => {
  it("claims, resolves the verified email, signs the private asset, sends, and marks sent", async () => {
    const { client, calls } = fakeSupabase();
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: "email_7" }) }));
    const result = await deliverSupporterGift({
      supabase: client, fetchImpl, apiKey: "re_test", from: "Lucky Cat <support@luckycathsk.com>",
      userId: "u1", orderId: "o1",
    });
    expect(result).toEqual({ ok: true, messageId: "email_7" });
    expect(calls.user).toEqual(["u1"]);
    expect(calls.profile).toEqual(["u1"]);
    expect(calls.storage).toEqual([{
      bucket: "supporter-assets",
      object: SUPPORTER_FILENAME,
      seconds: 600,
    }]);
    expect(calls.rpc.map(call => call.name)).toEqual([
      "claim_supporter_delivery",
      "finish_supporter_delivery",
    ]);
    expect(calls.rpc[1].args.p_provider_message_id).toBe("email_7");
  });

  it("does not resend an order already marked sent", async () => {
    const { client, calls } = fakeSupabase({ claim: "sent" });
    const fetchImpl = vi.fn();
    await expect(deliverSupporterGift({
      supabase: client, fetchImpl, apiKey: "re_test", from: "x@y.co", userId: "u1", orderId: "o1",
    })).resolves.toEqual({ ok: true, skipped: "sent" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(calls.user).toEqual([]);
  });

  it("records a failure when no verified email exists", async () => {
    const { client, calls } = fakeSupabase({ confirmed: false });
    const fetchImpl = vi.fn();
    await expect(deliverSupporterGift({
      supabase: client, fetchImpl, apiKey: "re_test", from: "x@y.co", userId: "u1", orderId: "o1",
    })).resolves.toEqual({ ok: false, reason: "verified-email-unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(calls.rpc[1].args.p_error).toBe("verified-email-unavailable");
  });

  it("returns a retryable failure while another invocation owns the send", async () => {
    const { client } = fakeSupabase({ claim: "sending" });
    await expect(deliverSupporterGift({
      supabase: client, apiKey: "re_test", from: "x@y.co", userId: "u1", orderId: "o1",
    })).resolves.toEqual({ ok: false, reason: "claim-sending" });
  });
});

describe("purchase webhook wiring", () => {
  for (const name of ["stripe-webhook", "rc-webhook"]) {
    it(`${name} delivers confirmed Supporter grants and retries`, () => {
      const source = readFileSync(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");
      expect(source).toContain('import { deliverSupporterGift } from "../_shared/supporter-email/service.js"');
      expect(source).toMatch(/data === "granted"[\s\S]*data === "duplicate"/);
      expect(source).toContain('entitlement === "supporter"');
      expect(source).toContain("await deliverSupporterGift({");
      expect(source).toContain('Deno.env.get("RESEND_API_KEY")');
      expect(source).toContain('Deno.env.get("SUPPORTER_EMAIL_FROM")');
      expect(source).toMatch(/if \(!delivery\.ok\) return new Response\("delivery error", \{ status: 500 \}\)/);
    });
  }
});

describe("supporter delivery database surface", () => {
  for (const file of [
    "docs/supabase/schema.sql",
    "docs/supabase/migrations/2026-08-02-supporter-email-delivery.sql",
  ]) {
    it(`is private, idempotent, and service-role-only in ${file}`, () => {
      const sql = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(sql).toMatch(/create table if not exists public\.supporter_deliveries/i);
      expect(sql).toMatch(/order_id\s+text primary key/i);
      expect(sql).toMatch(/create or replace function public\.claim_supporter_delivery/i);
      expect(sql).toMatch(/create or replace function public\.finish_supporter_delivery/i);
      expect(sql).toMatch(/alter table public\.supporter_deliveries enable row level security/i);
      expect(sql).toMatch(/revoke execute on function public\.claim_supporter_delivery\(uuid, text\)[\s\S]*from public, anon, authenticated/i);
      expect(sql).toMatch(/grant execute on function public\.claim_supporter_delivery\(uuid, text\)[\s\S]*to service_role/i);
      expect(sql).toMatch(/revoke execute on function public\.finish_supporter_delivery\(text, text, text\)[\s\S]*from public, anon, authenticated/i);
      expect(sql).toMatch(/grant execute on function public\.finish_supporter_delivery\(text, text, text\)[\s\S]*to service_role/i);
      expect(sql).toMatch(/'supporter-assets'[\s\S]*false[\s\S]*26214400/i);
    });
  }
});
