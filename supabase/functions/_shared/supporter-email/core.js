"use strict";

export const SUPPORTER_BUCKET = "supporter-assets";
export const SUPPORTER_OBJECT = "Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip";
export const SUPPORTER_FILENAME = SUPPORTER_OBJECT;
export const RESEND_ENDPOINT = "https://api.resend.com/emails";

function copyFor(locale) {
  if (locale === "th") {
    return {
      subject: "ของขวัญ Supporter จาก Lucky Cat HSK — คู่มือศัพท์ HSK1–6",
      text: [
        "ขอบคุณที่สนับสนุน Lucky Cat HSK ♥",
        "",
        "ไฟล์แนบคือของขวัญสำหรับ Supporter: คู่มือ PDF ศัพท์ออกบ่อยจำนวน 6 ไฟล์ แยกตั้งแต่ HSK1 ถึง HSK6",
        "แต่ละเล่มมีอักษรจีน พินอิน ความหมายภาษาอังกฤษและภาษาไทย พร้อมข้อมูลความถี่จากชุดข้อสอบจำลอง",
        "",
        "สถิติอ้างอิงข้อความในชุดข้อสอบจำลองที่วิเคราะห์ ไม่รวมเสียง Listening และไม่ได้รับประกันคะแนนสอบ",
        "",
        "ขอบคุณที่ช่วยให้ Lucky Cat HSK เปิดให้ทุกคนเรียนฟรีต่อไป",
        "ทีม Lucky Cat HSK",
        "support@luckycathsk.com",
      ].join("\n"),
      html: `
        <h1>ขอบคุณที่เป็น Supporter ♥</h1>
        <p>ไฟล์แนบคือของขวัญสำหรับคุณ: <strong>คู่มือ PDF ศัพท์ออกบ่อยจำนวน 6 ไฟล์</strong>
        แยกตั้งแต่ HSK1 ถึง HSK6</p>
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
      "Your attachment contains six frequency-ranked PDF study guides, one for each level from HSK1 through HSK6.",
      "Each guide includes Chinese, pinyin, English, Thai, and recurrence data from the analyzed mock-exam papers.",
      "",
      "Statistics cover the analyzed printed mock-exam text only. Listening audio is not included, and no exam score is guaranteed.",
      "",
      "Thank you for helping keep Lucky Cat HSK free for every learner.",
      "The Lucky Cat HSK team",
      "support@luckycathsk.com",
    ].join("\n"),
    html: `
      <h1>Thank you for becoming a Supporter ♥</h1>
      <p>Your attachment contains <strong>six frequency-ranked PDF study guides</strong>,
      one for each level from HSK1 through HSK6.</p>
      <p>Each guide includes Chinese, pinyin, English, Thai, and recurrence data
      from the analyzed mock-exam papers.</p>
      <p><small>Statistics cover the analyzed printed mock-exam text only.
      Listening audio is not included, and no exam score is guaranteed.</small></p>
      <p>Thank you for helping keep Lucky Cat HSK free for every learner.</p>
      <p>The Lucky Cat HSK team<br><a href="mailto:support@luckycathsk.com">support@luckycathsk.com</a></p>`,
  };
}

export function supporterEmail(locale) {
  return copyFor(locale === "th" ? "th" : "en");
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
  attachmentUrl,
  orderId,
}) {
  const key = supporterIdempotencyKey(orderId);
  if (typeof fetchImpl !== "function" || !apiKey || !from || !to || !key ||
      !/^https:\/\//.test(String(attachmentUrl || ""))) {
    return { ok: false, reason: "invalid-config" };
  }
  const copy = supporterEmail(locale);
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
        attachments: [{ path: attachmentUrl, filename: SUPPORTER_FILENAME }],
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

