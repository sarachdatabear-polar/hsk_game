"use strict";

import {
  SUPPORTER_BUCKET,
  SUPPORTER_OBJECT,
  sendSupporterEmail,
} from "./core.js";

const SIGNED_URL_SECONDS = 10 * 60;

async function finish(supabase, orderId, messageId, error) {
  const result = await supabase.rpc("finish_supporter_delivery", {
    p_order_id: orderId,
    p_provider_message_id: messageId || null,
    p_error: error || null,
  });
  return !result.error;
}

export async function deliverSupporterGift({
  supabase,
  fetchImpl = globalThis.fetch,
  apiKey,
  from,
  userId,
  orderId,
}) {
  if (!supabase || !userId || !orderId) return { ok: false, reason: "invalid-input" };

  const claim = await supabase.rpc("claim_supporter_delivery", {
    p_user_id: userId,
    p_order_id: orderId,
  });
  if (claim.error) return { ok: false, reason: "storage" };
  if (claim.data === "sent") return { ok: true, skipped: "sent" };
  // A fresh `sending` row means another webhook invocation owns the send.
  // Return a retryable failure; acknowledging it could strand the row if the
  // owner crashes. The SQL claim allows a stale row to be reclaimed later.
  if (claim.data !== "claimed") return { ok: false, reason: `claim-${claim.data || "invalid"}` };

  const userResult = await supabase.auth.admin.getUserById(userId);
  const user = userResult.data && userResult.data.user;
  if (userResult.error || !user || !user.email || !user.email_confirmed_at) {
    await finish(supabase, orderId, null, "verified-email-unavailable");
    return { ok: false, reason: "verified-email-unavailable" };
  }

  let locale = "en";
  const profile = await supabase.from("profiles")
    .select("locale").eq("user_id", userId).maybeSingle();
  if (!profile.error && profile.data && profile.data.locale === "th") locale = "th";

  const signed = await supabase.storage.from(SUPPORTER_BUCKET)
    .createSignedUrl(SUPPORTER_OBJECT, SIGNED_URL_SECONDS);
  const attachmentUrl = signed.data && signed.data.signedUrl;
  if (signed.error || !attachmentUrl) {
    await finish(supabase, orderId, null, "attachment-unavailable");
    return { ok: false, reason: "attachment-unavailable" };
  }

  const sent = await sendSupporterEmail({
    fetchImpl,
    apiKey,
    from,
    to: user.email,
    locale,
    attachmentUrl,
    orderId,
  });
  const recorded = await finish(
    supabase,
    orderId,
    sent.ok ? sent.messageId : null,
    sent.ok ? null : `resend-${sent.reason || "failed"}`,
  );
  if (!recorded) return { ok: false, reason: "storage" };
  return sent;
}

