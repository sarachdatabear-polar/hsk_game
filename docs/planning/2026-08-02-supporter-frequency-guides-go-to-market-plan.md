# Supporter Frequency Guides — Go-to-Market Plan

**Date:** 2026-08-02  
**Product:** Lucky Cat HSK  
**Offer:** 79 THB one-time Supporter Pack  
**Primary market:** Thai learners preparing for HSK1–6  
**Status:** Six-file bundle and automatic delivery code prepared; Resend/Supabase
production configuration and one live end-to-end test remain owner-gated

## Executive decision

This is a good supporter benefit and a better conversion story than leading with
coins or ad removal alone. It gives a learner an immediate, concrete study outcome
while preserving the central promise that every level and learning mode in Lucky Cat
HSK stays free.

Ship it with three rules:

1. Present the guides as a **thank-you gift for supporting the free game**, never as
   vocabulary withheld from free players.
2. Promise **six separate, level-specific PDF guides**, not a vague “HSK word list.”
3. Send the files by transactional email and also provide an entitlement-gated
   re-download path when practical; email delivery must not be the only recovery path.

The correct spelling in all English marketing is **79 baht** or **79 THB**, not
“79 bath.” Thai purchase surfaces should continue to display **79 บาท** or **79฿**.

## Final offer

### Product name

**Lucky Cat HSK Supporter Pack — 79฿ one time**

### Promise

Lucky Cat HSK remains free for everyone. A Supporter receives the existing permanent
benefits plus a six-guide HSK Frequency Study Gift delivered to their verified email.

### Benefits shown before purchase

- Six frequency-ranked PDF study guides: one each for HSK1, HSK2, HSK3, HSK4,
  HSK5, and HSK6.
- Chinese characters, pinyin, English and Thai meanings, frequency, and recurrence
  across mock-exam papers.
- A premium Lucky Cat HSK layout with the same cream-paper palette, green study
  cards, level colors, and reading-cat artwork learners recognize from the game.
- Permanent Supporter badge and thank-you cosmetic.
- 2,000 Lucky Coins.
- Ad-free in the Android app.
- One payment; no subscription.

Do not say “all HSK words” or “guaranteed exam words.” The accurate claim is:

> Six level-specific guides ranking the words that recur most often in the analyzed
> HSK1–6 mock-exam papers. Printed exam text only; listening audio is not included.

## The six deliverables

The send-ready archive is:

`product/supporter-pack/Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip`

It contains exactly these six customer files:

| Guide | Papers analyzed | Words in PDF | Approx. printed-text coverage |
|---|---:|---:|---:|
| HSK1 | 9 | 179 | 98% |
| HSK2 | 10 | 386 | 98% |
| HSK3 | 8 | 846 | 94% |
| HSK4 | 18 | 1,367 | 91% |
| HSK5 | 10 | 1,145 | 70% |
| HSK6 | 10 | 1,466 | 67% |

Selection detail matters for trust:

- HSK1–3 PDFs contain the complete Core set appearing in at least two papers.
- HSK4–6 PDFs use a high-yield cut appearing in at least four papers. Higher-level
  papers have a large one-paper-only tail, so the printable guides prioritize
  recurring words.
- Lower-level words reused in a higher-level paper remain in that level's guide.
- Coverage is calculated independently for each level's analyzed printed corpus.

The redesigned send-ready ZIP is about 18.8 MB (about 25.1 MB after Base64), within
Resend's 40 MB total email limit. Do not add more uncompressed artwork without
re-running the attachment-size gate.

## Positioning

### One-sentence value proposition

**Play every HSK level free; support Lucky Cat once and receive six data-ranked study
guides that show what to learn first at each level.**

### Why a learner buys

The emotional reason is to support a useful independent learning product. The rational
reason is to save study-planning time: instead of staring at a huge vocabulary list,
the learner gets a ranked starting point for the exact level they are preparing for.
The visual continuity matters too: the guides look like a permanent study companion
from the game, not a generic exported spreadsheet.

The hierarchy in the offer should therefore be:

1. Six practical HSK1–6 frequency guides.
2. Help keep Lucky Cat free and improving.
3. Permanent status/cosmetic recognition.
4. Coins and Android ad removal.

Coins should not be the headline. They have value only inside the game; the six guides
make the 79 THB benefit understandable even to a new or light player.

## Audience

### Primary

- Thai learners actively preparing for a specific HSK level.
- Learners who have completed at least one Word Quest and understand the product.
- Returning players with a streak, level-up, or Review Challenge win.

### Secondary

- Chinese teachers and tutors who want a frequency-ranked revision aid.
- English-speaking learners who value the bilingual data and per-level organization.
- Existing free players who want a simple one-time way to support development.

Do not target young children. Store and campaign language stays exam-prep and
learner-focused, consistent with the existing 13+ general-audience positioning.

## In-product funnel

Keep the existing quiet results-screen placement: after a streak save, Review Challenge
win, or level-up, no more than once per day. Change only the value proposition and the
destination copy.

### Results moment

**English**

> Lucky Cat stays free with help from supporters — get six HSK frequency guides 🐾

CTA: **See the 79฿ Supporter Pack**

**Thai — native review before release**

> Lucky Cat เปิดให้เรียนฟรีได้เพราะผู้สนับสนุน — รับคู่มือศัพท์ออกบ่อย HSK ทั้ง 6 ระดับ 🐾

CTA: **ดู Supporter Pack 79 บาท**

### Supporter sheet

**Title:** Support Lucky Cat — once  
**Thai:** สนับสนุน Lucky Cat เพียงครั้งเดียว

**Lead:** Keep every HSK level free and receive a permanent thank-you pack.  
**Thai:** ช่วยให้ทุกระดับ HSK เปิดให้เรียนฟรี พร้อมรับแพ็กของขวัญแบบถาวร

**Benefit bullets:**

- 6 PDF frequency guides — HSK1 through HSK6
- Chinese + pinyin + English + Thai
- 2,000 Lucky Coins
- Permanent Supporter badge and thank-you cosmetic
- Ad-free in the Android app
- Restores on devices linked to your account

**Price:** 79฿ one time · no subscription  
**Primary CTA:** Continue to secure checkout · 79฿  
**Secondary CTA:** Not now — keep playing free

Place this short qualifier under the guide benefit or behind an “About the data” link:

> Ranked from printed mock-exam text. Listening audio is not included. Coverage varies
> by level.

### Purchase success

> You're a Supporter ♥ Your six HSK guides are on the way to **{masked email}**.

Actions:

- **Download the six guides**
- **Resend email**
- **Keep learning**

If download is not implemented at launch, omit that action and promise the actual
manual service level: **“We will email your six guides within 24 hours.”** Never claim
instant delivery until it is tested end to end.

## Delivery plan

### Fallback only: manual concierge delivery

Use this only if an already-paid order needs recovery while automation is not live.
Do not launch an “automatic email” promise on a manual queue:

1. Confirm that the payment is successful and the Supporter entitlement exists.
2. Copy the verified account email; never use unverified free-text addresses.
3. Send `Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip` using the Thai or English
   template in `product/supporter-pack/SEND_TO_SUPPORTER_EMAILS.md`.
4. Record order ID, email sent time, and delivery result. Do not put payment data in
   the email log.
5. If the message bounces, show an in-app notice or contact the user through the
   verified account path and offer correction/resend.

Manual launch service level:

- Send within 24 hours of successful payment.
- Check the queue at least twice per day.
- Use the support reply template for attachment or unzip problems.

### Production: automatic transactional delivery

Implemented in the Stripe and RevenueCat webhooks using the existing
server-authoritative entitlement flow:

`successful purchase → entitlement grant → idempotent delivery claim → Resend attachment`

Requirements:

- Trigger only after the server confirms payment and grants `supporter`.
- Key the permanent delivery row and Resend request by purchase/order ID so
  webhook retries cannot send duplicates.
- Send to the verified account email.
- Keep the archive in a private Supabase bucket; create a ten-minute signed URL
  that Resend fetches as the approximately 18.8 MB attachment.
- Store only order/user references, delivery status, attempt timestamps,
  provider message ID, and a bounded last error.
- Provide an owner resend action and an in-app buyer resend action with a rate limit.
- A refund may remove the entitlement but does not require attempting to retract
  already-delivered files.
- Mobile-store restore must continue to work independently of email.

Email is transactional. Do not add a purchaser to a newsletter or promotional list
without a separate, unticked consent choice.

For native apps, digital Supporter benefits must use the applicable store billing path.
Google Play requires Play Billing for in-app digital goods and ad removal; Apple requires
In-App Purchase for digital content or functionality. The web purchase path can continue
to use the approved web checkout architecture. Relevant primary policies:

- Google Play Payments policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Apple App Review Guidelines §3.1.1: https://developer.apple.com/app-store/review/guidelines/
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311

## External go-to-market channels

### Owned channels first

1. Positive-moment results placement in the game.
2. Supporter sheet and Collection/Shop entry.
3. Lucky Cat website section explaining the six guides with one sample page.
4. Existing user/account email, only where marketing consent already exists.

### Organic content

Create useful content from the dataset rather than repeating “please buy”:

- Short video: “10 words that appear again and again in HSK3 mock exams.”
- Carousel: HSK1 versus HSK4—how the high-yield list changes.
- Post: “Why HSK5 and HSK6 coverage is lower even with more than 1,000 words.”
- Teacher post: one sample page plus a transparent methodology summary.
- Weekly “word frequency surprise” linking to the free game first and the Supporter
  option second.

Use only small samples in public marketing. Show enough to prove quality without making
the post itself a replacement for the six organized guides.

### Communities and partners

- Thai HSK and Chinese-learning Facebook groups where promotion is permitted.
- University Chinese departments, tutors, and HSK prep teachers.
- Thai TikTok, YouTube Shorts, and LINE communities focused on Chinese learning.
- Small teacher/creator partnerships using a disclosure such as “Supporter Pack provided
  for review.”

Never mass-post identical promotional copy, hide commercial intent, or imply official
HSK endorsement.

## Four-week launch sequence

### Week 0 — readiness

- Test a real 79 THB purchase, entitlement grant, restore, and refund path.
- Have a non-team user open all six PDFs on phone and desktop.
- Confirm Thai money and delivery copy with a native reviewer.
- Update the privacy notice for transactional email and the selected email processor.
- Complete the Resend domain, secret, private-bucket upload, and webhook
  deployment checklist in `docs/supabase/README.md`.
- Keep the offer dark until every promise is deliverable.

### Week 1 — soft launch to existing players

- Turn on the existing positive-moment Supporter placement.
- Watch the automatic delivery ledger for every soft-launch purchase; use the
  manual template only to recover a failed order.
- Observe buyer questions and revise the offer FAQ before broader promotion.
- Publish one methodology post and one HSK3 sample post.

### Week 2 — community proof

- Ask buyers for optional feedback about usefulness and file opening—not a rewarded
  store review.
- With permission, publish one short buyer quote.
- Share HSK1 and HSK4 educational samples in two relevant communities.
- Contact 5–10 small teachers or creators with a review copy.

### Week 3 — broaden organic reach

- Publish two short frequency-data videos and one coverage explainer.
- Add the six-guide benefit to the website and store/IAP description where policy allows.
- Broaden promotion only after the automatic live end-to-end test passes.

### Week 4 — review and decide

- Review conversion, delivery failures, support burden, refunds, and retention guardrails.
- Keep 79 THB unchanged until the offer has at least 100 qualified opens; otherwise a
  price test and a messaging test become impossible to distinguish.
- Decide whether the next improvement is better proof/sample content, delivery UX, or
  automation. Do not add a subscription merely because the first sample is small.

## Measurement plan

### Funnel events

- `supporter_offer_impression`
- `supporter_offer_open`
- `supporter_checkout_start`
- `supporter_purchase_success`
- `supporter_gift_email_queued`
- `supporter_gift_email_sent`
- `supporter_gift_email_bounced`
- `supporter_gift_resend`

Do not use email open pixels at launch. They add privacy complexity and do not prove that
the learner used the guides.

### Initial 30-day goals

These are operating targets, not market benchmarks:

- 100% of successful purchases receive the entitlement.
- Manual phase: 100% of gifts sent within 24 hours.
- Automated phase: at least 95% queued within five minutes.
- At least 98% non-bounced delivery after corrected-address resends.
- Fewer than 5% of buyers need delivery support.
- Fewer than 3% refunds/chargebacks; investigate every reason while volume is small.
- Starting conversion hypothesis: 1–3 purchases per 100 qualified offer opens. Reset
  this range after the first 100 opens rather than treating it as an industry promise.
- No material decline in round completion or return rate among users shown the quiet
  offer versus eligible users not shown it.

At 79 THB, 100 Supporters equals 7,900 THB gross before platform fees, payment fees,
tax, refunds, and support cost. Report both gross sales and net proceeds.

## Experiment order

Traffic is likely too small for many simultaneous A/B tests. Use sequential tests:

1. Baseline: current Supporter benefits and placement.
2. Add the six-guide headline while holding price, timing, and button design constant.
3. After at least 100 qualified opens per message, compare checkout-start and purchase
   rates plus retention guardrails.
4. Test one sample-page visual only after the headline result is understood.
5. Test price last. A 79 THB one-time offer is already simple and locally accessible;
   clearer value is the current priority.

## Trust, licensing, and claim guardrails

- Always say “mock-exam papers,” not “official past exams,” unless the source rights and
  provenance are separately verified.
- Always say printed-text coverage; listening audio was not transcribed.
- Coverage describes the analyzed corpus and is not an exam-score guarantee.
- State that Lucky Cat HSK is independent and not affiliated with or endorsed by the
  HSK test owner.
- English gloss cleanup references CC-CEDICT. Keep attribution and the CC BY-SA notice
  with the delivery/support materials; do not imply CC-CEDICT endorses Lucky Cat.
- Do not automatically enroll purchasers in promotional email.
- Do not call the purchase a donation. It is a paid one-time digital Supporter Pack with
  clearly described benefits.

## Launch checklist

- [ ] All six PDFs open and show the correct HSK level.
- [ ] ZIP contains exactly six PDFs and no internal planning files.
- [ ] Real purchase and entitlement grant tested.
- [ ] Actual delivery timing matches the pre-purchase promise.
- [ ] Verified email is available or buyer gets a clear post-purchase email step.
- [ ] Native Thai review complete for price, benefit, delivery, and error copy.
- [ ] Privacy policy and store Data Safety/privacy disclosures cover account email and
      the email processor.
- [ ] Restore remains available without relying on email delivery.
- [ ] Support inbox and resend procedure are staffed.
- [ ] Public sample and methodology copy use the accurate claim language above.

## Recommendation after launch

Keep the six PDFs as a permanent Supporter benefit. If buyers repeatedly ask for sorting,
filtering, or flashcard import, add six level-specific Excel files later as a measured
upgrade. Do not include twelve files at launch: six clearly labeled PDFs are easier to
understand, download, and use, and they match the offer being tested.
