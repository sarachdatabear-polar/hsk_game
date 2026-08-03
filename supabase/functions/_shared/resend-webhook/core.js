"use strict";
// Pure decision logic for the Resend delivery webhook. Runs in BOTH Deno
// (edge function) and Node/vitest — Web Crypto + atob/btoa only, no imports.
// Svix wire format: sign `${id}.${timestamp}.${payload}` with the base64
// secret after "whsec_", compare base64 HMAC-SHA256 against each
// space-separated "v1,<sig>" entry. https://docs.svix.com/receiving/verifying-payloads
export const ALERT_TO = "support@luckycathsk.com";
const TOLERANCE_SECONDS = 300;
const REASON_MAX = 500;

export async function verifySvixSignature({ payload, id, timestamp, signature, secret, nowSeconds }) {
  if (typeof payload !== "string" || !id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Number.isFinite(nowSeconds) ? nowSeconds : Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return signature.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    return version === "v1" && !!sig && sig === expected;
  });
}

export function classifyResendEvent(event) {
  const type = event && event.type;
  const emailId = event && event.data && event.data.email_id;
  if (!emailId || typeof emailId !== "string") return { action: "ignore", reason: "no-email-id" };
  if (type === "email.delivered") return { action: "deliver", emailId };
  if (type === "email.bounced" || type === "email.failed") {
    const detail =
      (event.data.bounce && event.data.bounce.message) ||
      (event.data.failed && event.data.failed.reason) || "";
    const reason = [type, detail].filter(Boolean).join(": ").slice(0, REASON_MAX);
    return { action: "fail", emailId, reason };
  }
  return { action: "ignore", reason: type || "no-type" };
}

export function buildDeliveryAlert({ from, orderId, buyerDomain, reason }) {
  return {
    from,
    to: [ALERT_TO],
    subject: `Supporter guide email FAILED — order ${orderId}`,
    text: [
      `The supporter guide email for order ${orderId} was not delivered.`,
      `Buyer domain: ${buyerDomain || "unknown"}`,
      `Reason: ${reason}`,
      "",
      "The delivery row is back to 'failed' (re-claimable). The buyer can",
      "also self-serve any time via the in-game download button.",
    ].join("\n"),
  };
}
