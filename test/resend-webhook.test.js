import { describe, it, expect } from "vitest";
import {
  verifySvixSignature,
  classifyResendEvent,
  buildDeliveryAlert,
  ALERT_TO,
} from "../supabase/functions/_shared/resend-webhook/core.js";

// Build a real signature the same way svix does, so the verifier is tested
// against the wire format, not against itself alone.
async function sign(secretB64, id, timestamp, payload) {
  const key = await crypto.subtle.importKey(
    "raw", Uint8Array.from(atob(secretB64), c => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

const SECRET_B64 = btoa("test-webhook-secret-32-bytes-long!");
const SECRET = `whsec_${SECRET_B64}`;
const NOW = 1_754_300_000;

describe("verifySvixSignature", () => {
  const payload = '{"type":"email.delivered"}';

  it("accepts a valid v1 signature within tolerance", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW + 60,
    })).toBe(true);
  });

  it("accepts when the valid signature is one of several space-separated entries", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,AAAA v1,${sig}`, secret: SECRET, nowSeconds: NOW,
    })).toBe(true);
  });

  it("rejects a wrong signature", async () => {
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: "v1,bm9wZQ==", secret: SECRET, nowSeconds: NOW,
    })).toBe(false);
  });

  it("rejects a stale timestamp (>5 min)", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW + 301,
    })).toBe(false);
  });

  it("rejects a signature computed for a different payload", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), '{"other":true}');
    expect(await verifySvixSignature({
      payload, id: "msg_1", timestamp: String(NOW),
      signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW,
    })).toBe(false);
  });

  it("rejects missing header parts and malformed secrets", async () => {
    const sig = await sign(SECRET_B64, "msg_1", String(NOW), payload);
    for (const patch of [
      { id: null }, { timestamp: null }, { signature: null },
      { secret: null }, { secret: "whsec_%%%not-base64%%%" },
      { timestamp: "not-a-number" },
    ]) {
      expect(await verifySvixSignature({
        payload, id: "msg_1", timestamp: String(NOW),
        signature: `v1,${sig}`, secret: SECRET, nowSeconds: NOW, ...patch,
      })).toBe(false);
    }
  });
});

describe("classifyResendEvent", () => {
  it("maps email.delivered to deliver", () => {
    expect(classifyResendEvent({ type: "email.delivered", data: { email_id: "re_1" } }))
      .toEqual({ action: "deliver", emailId: "re_1" });
  });

  it("maps email.bounced to fail with a reason carrying the bounce detail", () => {
    const c = classifyResendEvent({
      type: "email.bounced",
      data: { email_id: "re_2", bounce: { message: "mailbox full" } },
    });
    expect(c.action).toBe("fail");
    expect(c.emailId).toBe("re_2");
    expect(c.reason).toContain("email.bounced");
    expect(c.reason).toContain("mailbox full");
  });

  it("maps email.failed to fail even without detail", () => {
    const c = classifyResendEvent({ type: "email.failed", data: { email_id: "re_3" } });
    expect(c.action).toBe("fail");
    expect(c.reason).toContain("email.failed");
  });

  it("ignores other event types, missing data, and missing email_id", () => {
    expect(classifyResendEvent({ type: "email.sent", data: { email_id: "re_4" } }).action).toBe("ignore");
    expect(classifyResendEvent({ type: "email.delivered" }).action).toBe("ignore");
    expect(classifyResendEvent(null).action).toBe("ignore");
    expect(classifyResendEvent({}).action).toBe("ignore");
  });

  it("caps the failure reason length", () => {
    const c = classifyResendEvent({
      type: "email.failed",
      data: { email_id: "re_5", failed: { reason: "x".repeat(2000) } },
    });
    expect(c.reason.length).toBeLessThanOrEqual(500);
  });
});

describe("buildDeliveryAlert", () => {
  it("addresses the alert to support@ with order id, domain, and reason", () => {
    const a = buildDeliveryAlert({
      from: "Lucky Cat HSK <gift@mail.luckycathsk.com>",
      orderId: "cs_live_123", buyerDomain: "gmail.com", reason: "email.bounced: mailbox full",
    });
    expect(a.to).toEqual([ALERT_TO]);
    expect(a.from).toBe("Lucky Cat HSK <gift@mail.luckycathsk.com>");
    expect(a.subject).toContain("cs_live_123");
    expect(a.text).toContain("gmail.com");
    expect(a.text).toContain("mailbox full");
    // never leak a full buyer address into the alert
    expect(a.text).not.toContain("@gmail.com@");
  });
});
