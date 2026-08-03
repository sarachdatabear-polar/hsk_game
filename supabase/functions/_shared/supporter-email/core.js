"use strict";

export const SUPPORTER_BUCKET = "supporter-assets";
export const SUPPORTER_OBJECT = "Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip";
export const SUPPORTER_FILENAME = SUPPORTER_OBJECT;
export const RESEND_ENDPOINT = "https://api.resend.com/emails";

// One lifetime for BOTH delivery legs (email link and self-serve download):
// the email copy promises "7 days" — keep copy and constant in sync.
export const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

// Delivery is LINK-BASED, not an attachment. The 2026-08-03 live purchase
// failed at Resend with "Invalid Attachment Paths": handing Resend a signed
// URL to fetch (attachments: [{path}]) makes the send depend on a second,
// remote fetch racing the URL's TTL — accepted by the API, failed afterward,
// recorded as sent. A link in the body removes that failure mode entirely and
// avoids the deliverability penalty of an 18MB ZIP from a young domain.
// "7 days" below must stay in sync with SIGNED_URL_SECONDS defined above.
// TH copy edited without a native pass — queue for the Thai reviewer.
// Inline styles only — email clients strip <style> blocks. One consistent
// type scale (16px body / 20px heading / 13px fine print) in the game's
// palette, wrapped in a centered card on the app's cream background.
const P = "margin:0 0 16px;font-size:16px;line-height:1.55;color:#3a3126;";
const H1 = "margin:0 0 20px;font-size:20px;line-height:1.3;color:#3a3126;font-weight:700;";
const FINE = "margin:0 0 16px;font-size:13px;line-height:1.5;color:#8a8177;";
const LINK = "color:#C95A41;";
const BTN = "display:inline-block;padding:12px 22px;background:#C95A41;color:#ffffff;" +
  "font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;";

function emailShell(inner) {
  return `<div style="margin:0;padding:24px 12px;background:#FBF5E8;">` +
    `<div style="max-width:560px;margin:0 auto;padding:28px 24px;background:#ffffff;` +
    `border-radius:12px;font-family:Arial,Helvetica,sans-serif;">${inner}</div></div>`;
}

function escapeHtmlAttr(v) {
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function copyFor(locale, downloadUrl) {
  const href = escapeHtmlAttr(downloadUrl);
  if (locale === "th") {
    return {
      subject: "ของขวัญ Supporter จาก Lucky Cat HSK — คู่มือศัพท์ HSK1–6",
      text: [
        "ขอบคุณที่สนับสนุน Lucky Cat HSK ♥",
        "",
        "ของขวัญสำหรับ Supporter: คู่มือ PDF ศัพท์ออกบ่อยจำนวน 6 ไฟล์ แยกตั้งแต่ HSK1 ถึง HSK6",
        "ดาวน์โหลดได้ที่ลิงก์นี้ (ใช้ได้ 7 วัน):",
        downloadUrl,
        "",
        "แต่ละเล่มมีอักษรจีน พินอิน ความหมายภาษาอังกฤษและภาษาไทย พร้อมข้อมูลความถี่จากชุดข้อสอบจำลอง",
        "หากลิงก์หมดอายุ ตอบกลับอีเมลนี้ได้เลย เราจะส่งลิงก์ใหม่ให้",
        "",
        "สถิติอ้างอิงข้อความในชุดข้อสอบจำลองที่วิเคราะห์ ไม่รวมเสียง Listening และไม่ได้รับประกันคะแนนสอบ",
        "",
        "ขอบคุณที่ช่วยให้ Lucky Cat HSK เปิดให้ทุกคนเรียนฟรีต่อไป",
        "ทีม Lucky Cat HSK",
        "support@luckycathsk.com",
      ].join("\n"),
      html: emailShell(`
        <h1 style="${H1}">ขอบคุณที่เป็น Supporter ♥</h1>
        <p style="${P}">ของขวัญสำหรับคุณ: <strong>คู่มือ PDF ศัพท์ออกบ่อยจำนวน 6 ไฟล์</strong>
        แยกตั้งแต่ HSK1 ถึง HSK6</p>
        <p style="margin:24px 0;"><a href="${href}" style="${BTN}">ดาวน์โหลดคู่มือทั้งหมด (ZIP)</a></p>
        <p style="${FINE}">ลิงก์ใช้ได้ 7 วัน — หากหมดอายุ ตอบกลับอีเมลนี้ได้เลย เราจะส่งลิงก์ใหม่ให้</p>
        <p style="${P}">แต่ละเล่มมีอักษรจีน พินอิน ความหมายภาษาอังกฤษและภาษาไทย
        พร้อมข้อมูลความถี่จากชุดข้อสอบจำลอง</p>
        <p style="${FINE}">สถิติอ้างอิงข้อความในชุดข้อสอบจำลองที่วิเคราะห์ ไม่รวมเสียง Listening
        และไม่ได้รับประกันคะแนนสอบ</p>
        <p style="${P}">ขอบคุณที่ช่วยให้ Lucky Cat HSK เปิดให้ทุกคนเรียนฟรีต่อไป</p>
        <p style="${P}">ทีม Lucky Cat HSK<br><a href="mailto:support@luckycathsk.com" style="${LINK}">support@luckycathsk.com</a></p>`),
    };
  }
  return {
    subject: "Your Lucky Cat HSK Supporter gift — HSK1–6 frequency guides",
    text: [
      "Thank you for supporting Lucky Cat HSK ♥",
      "",
      "Your gift is six frequency-ranked PDF study guides, one for each level from HSK1 through HSK6.",
      "Download them here (link valid for 7 days):",
      downloadUrl,
      "",
      "Each guide includes Chinese, pinyin, English, Thai, and recurrence data from the analyzed mock-exam papers.",
      "If the link has expired, just reply to this email and we will send a fresh one.",
      "",
      "Statistics cover the analyzed printed mock-exam text only. Listening audio is not included, and no exam score is guaranteed.",
      "",
      "Thank you for helping keep Lucky Cat HSK free for every learner.",
      "The Lucky Cat HSK team",
      "support@luckycathsk.com",
    ].join("\n"),
    html: emailShell(`
      <h1 style="${H1}">Thank you for becoming a Supporter ♥</h1>
      <p style="${P}">Your gift is <strong>six frequency-ranked PDF study guides</strong>,
      one for each level from HSK1 through HSK6.</p>
      <p style="margin:24px 0;"><a href="${href}" style="${BTN}">Download all six guides (ZIP)</a></p>
      <p style="${FINE}">The link is valid for 7 days — if it has expired, just reply to
      this email and we will send a fresh one.</p>
      <p style="${P}">Each guide includes Chinese, pinyin, English, Thai, and recurrence data
      from the analyzed mock-exam papers.</p>
      <p style="${FINE}">Statistics cover the analyzed printed mock-exam text only.
      Listening audio is not included, and no exam score is guaranteed.</p>
      <p style="${P}">Thank you for helping keep Lucky Cat HSK free for every learner.</p>
      <p style="${P}">The Lucky Cat HSK team<br><a href="mailto:support@luckycathsk.com" style="${LINK}">support@luckycathsk.com</a></p>`),
  };
}

export function supporterEmail(locale, downloadUrl) {
  return copyFor(locale === "th" ? "th" : "en", downloadUrl);
}

// Keyed per CLAIM, not per order: Resend refuses a reused idempotency key
// with a different payload for 24h, which turned the 2026-08-03 re-delivery
// into a hard "provider" rejection. Double-send protection lives in the DB
// claim (claim_supporter_delivery serializes senders); the nonce scopes the
// Resend key to this claim so retries after a failure are actually possible.
export function supporterIdempotencyKey(orderId, claimNonce = "") {
  const id = typeof orderId === "string" ? orderId.trim() : "";
  const nonce = typeof claimNonce === "string" ? claimNonce.trim() : "";
  const key = nonce ? `supporter-gift/${id}/${nonce}` : `supporter-gift/${id}`;
  if (!id || key.length > 220) return null;
  return key;
}

export async function sendSupporterEmail({
  fetchImpl = globalThis.fetch,
  apiKey,
  from,
  to,
  locale,
  downloadUrl,
  orderId,
  claimNonce,
}) {
  const key = supporterIdempotencyKey(orderId, claimNonce);
  if (typeof fetchImpl !== "function" || !apiKey || !from || !to || !key ||
      !/^https:\/\//.test(String(downloadUrl || ""))) {
    return { ok: false, reason: "invalid-config" };
  }
  const copy = supporterEmail(locale, downloadUrl);
  let response;
  try {
    response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        "User-Agent": "Lucky-Cat-HSK-Supporter-Delivery/1.0",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: "support@luckycathsk.com",
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
      }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  let data = null;
  try { data = await response.json(); } catch { /* error body may not be JSON */ }
  if (!response.ok || !data || !data.id) {
    // Surface Resend's own words — "resend-provider" alone cost a diagnosis
    // round-trip on 2026-08-03.
    const detail = data && (data.message || data.name)
      ? String(data.message || data.name).slice(0, 140) : "";
    return { ok: false, reason: "provider", status: response.status, detail };
  }
  return { ok: true, messageId: data.id };
}

