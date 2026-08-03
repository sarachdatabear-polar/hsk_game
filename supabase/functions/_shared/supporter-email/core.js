"use strict";

export const SUPPORTER_BUCKET = "supporter-assets";
export const SUPPORTER_OBJECT = "Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip";
export const SUPPORTER_FILENAME = SUPPORTER_OBJECT;
export const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Delivery is LINK-BASED, not an attachment. The 2026-08-03 live purchase
// failed at Resend with "Invalid Attachment Paths": handing Resend a signed
// URL to fetch (attachments: [{path}]) makes the send depend on a second,
// remote fetch racing the URL's TTL — accepted by the API, failed afterward,
// recorded as sent. A link in the body removes that failure mode entirely and
// avoids the deliverability penalty of an 18MB ZIP from a young domain.
// "7 days" below must stay in sync with SIGNED_URL_SECONDS in service.js.
// TH copy edited without a native pass — queue for the Thai reviewer.
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
      html: `
        <h1>ขอบคุณที่เป็น Supporter ♥</h1>
        <p>ของขวัญสำหรับคุณ: <strong>คู่มือ PDF ศัพท์ออกบ่อยจำนวน 6 ไฟล์</strong>
        แยกตั้งแต่ HSK1 ถึง HSK6</p>
        <p><a href="${href}"><strong>ดาวน์โหลดคู่มือทั้งหมด (ZIP)</strong></a><br>
        <small>ลิงก์ใช้ได้ 7 วัน — หากหมดอายุ ตอบกลับอีเมลนี้ได้เลย เราจะส่งลิงก์ใหม่ให้</small></p>
        <p>แต่ละเล่มมีอักษรจีน พินอิน ความหมายภาษาอังกฤษและภาษาไทย
        พร้อมข้อมูลความถี่จากชุดข้อสอบจำลอง</p>
        <p><small>สถิติอ้างอิงข้อความในชุดข้อสอบจำลองที่วิเคราะห์ ไม่รวมเสียง Listening
        และไม่ได้รับประกันคะแนนสอบ</small></p>
        <p>ขอบคุณที่ช่วยให้ Lucky Cat HSK เปิดให้ทุกคนเรียนฟรีต่อไป</p>
        <p>ทีม Lucky Cat HSK<br><a href="mailto:support@luckycathsk.com">support@luckycathsk.com</a></p>`,
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
    html: `
      <h1>Thank you for becoming a Supporter ♥</h1>
      <p>Your gift is <strong>six frequency-ranked PDF study guides</strong>,
      one for each level from HSK1 through HSK6.</p>
      <p><a href="${href}"><strong>Download all six guides (ZIP)</strong></a><br>
      <small>The link is valid for 7 days — if it has expired, just reply to
      this email and we will send a fresh one.</small></p>
      <p>Each guide includes Chinese, pinyin, English, Thai, and recurrence data
      from the analyzed mock-exam papers.</p>
      <p><small>Statistics cover the analyzed printed mock-exam text only.
      Listening audio is not included, and no exam score is guaranteed.</small></p>
      <p>Thank you for helping keep Lucky Cat HSK free for every learner.</p>
      <p>The Lucky Cat HSK team<br><a href="mailto:support@luckycathsk.com">support@luckycathsk.com</a></p>`,
  };
}

export function supporterEmail(locale, downloadUrl) {
  return copyFor(locale === "th" ? "th" : "en", downloadUrl);
}

export function supporterIdempotencyKey(orderId) {
  const id = typeof orderId === "string" ? orderId.trim() : "";
  if (!id || id.length > 220) return null;
  return `supporter-gift/${id}`;
}

export async function sendSupporterEmail({
  fetchImpl = globalThis.fetch,
  apiKey,
  from,
  to,
  locale,
  downloadUrl,
  orderId,
}) {
  const key = supporterIdempotencyKey(orderId);
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
    return { ok: false, reason: "provider", status: response.status };
  }
  return { ok: true, messageId: data.id };
}

