# Thai UI translation review

## Status

**Owner action required before store launch:** no native-Thai approval is
recorded for `STRINGS.th` in `src/i18n.js`. Treat all 377 Thai values as draft,
even when they read naturally. A native reviewer should edit the source table,
then record the reviewer, date, and reviewed commit below.

Local engineering audit completed 2026-07-16:

- 377/377 English keys have Thai values.
- Every `{placeholder}` set matches its English source.
- Allowed inline HTML tag structure matches across languages.
- Every translatable value contains Thai script; the 12 exceptions are
  intentional codes, numbers, or input formats (`HSK`, `Lv`, `Top`, email,
  numeric ranges, star ratings, tone numbers, and progress fractions).
- The previously documented literal `{min}` Smart Review bug is fixed; the
  call site passes both `{have}` and `{min}`.
- Thai layouts and the permanent 10-viewport suite have passed across all major
  screens, every advanced question format, Results, card resume, and dialog
  focus. Layout checks do not replace linguistic review.

## Native-review order

Review by player risk rather than development date.

### P0 — money, account, and notifications

Review these prefixes/keys first because wording affects purchases, account
expectations, or notification tone:

- `iap.*`, `shop.getCoins`, `shop.supporter*`, `account.supporterChip`
- `item.supporter`, `item.coins_s`, `item.coins_m`, `item.coins_l`,
  `item.coins_xl`
- `account.*`
- `notify.streak.*`, `notify.comeback.*`, `toast.freeze-used`,
  `streak.restUsed`

Confirm especially that:

- purchase failure/processing copy never implies a completed charge;
- guest-account copy clearly explains the risk of losing access with the
  device;
- cloud-backup claims match actual behavior;
- notifications feel warm and never guilt the player;
- `supporter` remains hidden until its advertised ad-removal benefit exists.

#### P0 review table

Every concrete key under the prefixes above, expanded from `src/i18n.js` as
of commit `5d99354` (2026-07-19). English and Thai columns are copied
verbatim from the source — do not edit them here; put corrections in
"Reviewed Thai" (or edit `src/i18n.js` directly, see "How to return this
review" below).

Keys marked † already carry a `// TH-REVIEW` engineering flag in
`src/i18n.js` (machine-translated or relabeled, no native pass yet) — give
those priority attention. None of the rows below have recorded native
sign-off — treat the whole table as draft, including the notification/toast
block, which sits under a "best-effort TH pending native review" comment in
the source (`src/i18n.js:480`) but isn't individually †-flagged.

**Money & purchases** — `iap.*`, `shop.getCoins`, `shop.supporter*`,
`account.supporterChip`, `item.supporter`, `item.coins_*`

| Key | English | Current Thai | Reviewed Thai (reviewer fills) | OK? |
| --- | --- | --- | --- | --- |
| `shop.getCoins` | Get Coins | เติมเหรียญ | | |
| `shop.supporterTitle` | Supporter | ผู้สนับสนุน | | |
| `shop.supporterDesc` | Remove ads forever · +2,000 coins · Supporter badge | ปิดโฆษณาถาวร · รับ 2,000 เหรียญ · แบดจ์ผู้สนับสนุน | | |
| `shop.supporterOwned` | Thank you for supporting Lucky Cat! ♥ | ขอบคุณที่สนับสนุน Lucky Cat! ♥ | | |
| `iap.amount` | {coins} coins | {coins} เหรียญ | | |
| `iap.pending` | Processing… | กำลังดำเนินการ… | | |
| `iap.failed` | Purchase failed — nothing was charged. Try again. | การซื้อไม่สำเร็จ — ยังไม่มีการเรียกเก็บเงิน ลองใหม่อีกครั้ง | | |
| `iap.success` | +{coins} coins added! | ได้รับ +{coins} เหรียญแล้ว! | | |
| `iap.supporterThanks` | You're a Supporter now — thank you! ♥ | คุณเป็นผู้สนับสนุนแล้ว — ขอบคุณ! ♥ | | |
| `iap.restore` | Restore Purchases | กู้คืนการซื้อ | | |
| `iap.restored` | Supporter restored ♥ | กู้คืนสถานะผู้สนับสนุนแล้ว ♥ | | |
| `iap.nothingToRestore` | Nothing to restore | ไม่มีรายการให้กู้คืน | | |
| `iap.restoreFailed` | Restore failed — check your connection and try again. | กู้คืนไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่ | | |
| `iap.processing` † | Purchase is processing — your coins will arrive shortly. | การซื้อกำลังดำเนินการ — เหรียญของคุณจะเข้าบัญชีในไม่ช้า | | |
| `account.supporterChip` | Supporter ♥ | ผู้สนับสนุน ♥ | | |
| `item.supporter` | Supporter Pack | แพ็กผู้สนับสนุน | | |
| `item.coins_s` | Coin Pouch | ถุงเหรียญ | | |
| `item.coins_m` | Coin Stack | กองเหรียญ | | |
| `item.coins_l` | Coin Chest | หีบเหรียญ | | |
| `item.coins_xl` | Coin Vault | คลังเหรียญ | | |

**Account** — `account.*` (guest/cloud-backup/delete flows carry the most
account-loss risk; give `explain.*`, `delete*`, `restored`, `benefit.*`
priority)

| Key | English | Current Thai | Reviewed Thai (reviewer fills) | OK? |
| --- | --- | --- | --- | --- |
| `account.row` | Account | บัญชี | | |
| `account.title` | Account | บัญชี | | |
| `account.status.local` | On this device | อยู่บนเครื่องนี้ | | |
| `account.status.guest` | Guest account | บัญชีผู้เยี่ยมชม | | |
| `account.status.signedIn` | Signed in as {email} | เข้าสู่ระบบเป็น {email} | | |
| `account.explain.offline` | Cloud accounts need an internet connection — your progress is safe on this device. | บัญชีคลาวด์ต้องใช้อินเทอร์เน็ต — ความคืบหน้าของคุณยังปลอดภัยบนเครื่องนี้ | | |
| `account.explain.local` | Your progress lives on this device. Connect to back it up to the cloud. | ความคืบหน้าของคุณอยู่บนเครื่องนี้ เชื่อมต่อเพื่อสำรองข้อมูลบนคลาวด์ | | |
| `account.explain.guest` | Connected as a guest. Add your email so your account isn't lost with this device. | เชื่อมต่อแบบผู้เยี่ยมชมแล้ว เพิ่มอีเมลเพื่อไม่ให้บัญชีหายไปพร้อมเครื่อง | | |
| `account.explain.signedIn` | Your account is linked. Your progress backs up to the cloud automatically. | บัญชีของคุณเชื่อมต่อแล้ว ความคืบหน้าจะสำรองขึ้นคลาวด์ให้อัตโนมัติ | | |
| `account.connect` | Connect | เชื่อมต่อ | | |
| `account.sendCode` | Send code | ส่งรหัส | | |
| `account.verify` | Verify | ยืนยัน | | |
| `account.resend` | Resend code | ส่งรหัสอีกครั้ง | | |
| `account.resendWait` | Resend in {s}s | ส่งใหม่ได้ใน {s} วิ | | |
| `account.signOut` | Sign out | ออกจากระบบ | | |
| `account.delete` † | Delete account | ลบบัญชี | | |
| `account.deleteConfirm` † | Permanently erase your cloud data? Signing out instead keeps it. | ลบข้อมูลบนคลาวด์อย่างถาวรหรือไม่? การออกจากระบบจะเก็บข้อมูลไว้ | | |
| `account.deleteConfirmYes` † | Delete permanently | ลบถาวร | | |
| `account.deleteCancel` † | Cancel | ยกเลิก | | |
| `account.deleteDone` † | Cloud account deleted | ลบบัญชีคลาวด์แล้ว | | |
| `account.deleteFail` † | Couldn't delete — try again | ลบไม่สำเร็จ — ลองอีกครั้ง | | |
| `account.emailPh` | your@email.com | your@email.com | | |
| `account.codePh` | code from the email | รหัสจากอีเมล | | |
| `account.codeSent` | Code sent — check your email | ส่งรหัสแล้ว — เช็กอีเมลของคุณ | | |
| `account.changeEmail` | Use a different email | ใช้อีเมลอื่น | | |
| `account.signedIn` | Signed in! | เข้าสู่ระบบแล้ว! | | |
| `account.signedOut` | Signed out | ออกจากระบบแล้ว | | |
| `account.err.offline` | No internet connection | ไม่มีการเชื่อมต่ออินเทอร์เน็ต | | |
| `account.err.network` | Couldn't reach the cloud — try again | ติดต่อคลาวด์ไม่ได้ — ลองอีกครั้ง | | |
| `account.err.badEmail` | That email doesn't look right | อีเมลนี้ดูไม่ถูกต้อง | | |
| `account.err.badCode` | Wrong or expired code — try again | รหัสผิดหรือหมดอายุ — ลองอีกครั้ง | | |
| `account.lastSynced` | Last synced {when} | ซิงค์ล่าสุด {when} | | |
| `account.neverSynced` | Not synced yet | ยังไม่ได้ซิงค์ | | |
| `account.restored` | Progress restored ✓ | กู้คืนความคืบหน้าแล้ว ✓ | | |
| `account.benefit.safe` | Keeps your streak, coins and mastery backed up | สำรองสตรีค เหรียญ และคำที่เชี่ยวชาญของคุณไว้ให้ | | |
| `account.benefit.devices` | Works on phone and computer — pick up where you left off | ใช้ได้ทั้งมือถือและคอมพิวเตอร์ — เล่นต่อจากที่ค้างไว้ | | |
| `account.benefit.free` | Free — no password, just an email later if you want | ฟรี — ไม่ต้องตั้งรหัสผ่าน แค่อีเมลทีหลังถ้าต้องการ | | |

**Notifications & streak safety** — `notify.streak.*`, `notify.comeback.*`,
`toast.freeze-used`, `streak.restUsed`

| Key | English | Current Thai | Reviewed Thai (reviewer fills) | OK? |
| --- | --- | --- | --- | --- |
| `toast.freeze-used` | Streak Freeze used — your {n}-day streak is safe | ใช้น้ำแข็งพิทักษ์สตรีคแล้ว — สตรีค {n} วันของคุณยังอยู่ | | |
| `notify.streak.title` | Don't lose your {n}-day streak! | อย่าให้สตรีค {n} วันหลุดนะ! | | |
| `notify.streak.body` | {remaining} words keep it alive — a quick Word Quest does it. | อีก {remaining} คำสตรีคก็รอด — เล่นภารกิจคำศัพท์สั้น ๆ ก็พอ | | |
| `notify.comeback.title` | Your lucky cat misses you 🐱 | เจ้าแมวนำโชคคิดถึงคุณนะ 🐱 | | |
| `notify.comeback.body` | You were on a {n}-day roll — jump back in and get it going again! | คุณทำสตรีคได้ตั้ง {n} วัน — กลับมาลุยต่อกันเลย! | | |
| `streak.restUsed` | 🍵 Rest day used — your {n}-day streak is safe. | 🍵 ใช้วันพักแล้ว — สตรีค {n} วันของคุณยังปลอดภัย | | |

**New launch key — not covered by the prefix list above**

`settings.privacy` was added for launch (Task 4: Privacy Policy link on the
Settings screen) after this doc's P0 prefix list was written. It has no
native-Thai review recorded and belongs in this P0 pass.

| Key | English | Current Thai | Reviewed Thai (reviewer fills) | OK? |
| --- | --- | --- | --- | --- |
| `settings.privacy` | Privacy Policy | นโยบายความเป็นส่วนตัว | | |

#### How to return this review

Either works — pick whichever is easier:

1. **Edit the source directly.** Change the Thai string values inside
   `STRINGS.th` in `src/i18n.js` (leave `STRINGS.en` untouched), keeping every
   `{placeholder}` and the existing `<b>` markup exactly as in English. Then
   run `npm test`, `npm run build`, and note your commit SHA below.
2. **Return key → value pairs.** Fill the "Reviewed Thai" and "OK?" columns
   in the tables above (or list `key: corrected Thai text` for anything not
   already OK) and send the doc/list back; engineering will apply the edits
   and run tests/build.

Either way, do not remove the `// TH-REVIEW` comments yourself — engineering
clears them when the corresponding row is signed off.

#### P0 sign-off

Fast-track sign-off for this P0 pass only — separate from the full-doc
"Sign-off" block at the bottom of this file, which covers all 377 keys
(P0–P2) once the complete review is done.

- Native reviewer: _pending_
- Review date: _pending_
- Reviewed commit (the `src/i18n.js` commit the review was done against):
  _pending_

### P1 — core learning and results

- `welcome.*`, `scope.*`, `learn.*`, `fc.*`
- `battle.*`, `tones.*`, `howto.*`
- `results.*`, `quest.*`, `quest.monthly.*`

Keep the learning terms consistent throughout: Word Quest, Smart Review,
Review Challenge, Review Pouch, Lucky Flow, mastery, pinyin, tone, and hanzi.
Read every interpolated sentence aloud with real values such as 1, 8, 20, and
100; Thai does not need English plural inflection, but classifiers and word
order must stay natural.

### P2 — Profile, collection, and world

- `profile.*`, `progress.*`, `album.*`, `sticker.*`, `milestone.*`
- `shop.*`, `item.*`, `season.*`
- `street.*`, `building.*`, `journey.*`, `nav.*`, `more.*`

Confirm the Thai brand terms (including `ถนนนำโชค`) and cosmetic item names.
Short labels must still make sense at 320 px without relying on truncation.

## Reviewer safety notes

- Edit plain text only. Do not add markup except the existing `<b>` pairs in
  `scope.readout` and `howto.*`.
- Preserve every placeholder exactly, including braces and spelling.
- `progress.levelRow` receives `{pct}` already wrapped in bold HTML; do not add
  a percent sign or another tag around it.
- Leave technical tokens such as HSK, XP, and `Lv` only when they are clearer
  to Thai players than a localized alternative.
- After edits run `npm test`, `npm run build`, and the EN+TH responsive sweep.

## Sign-off

- Native reviewer: _pending_
- Review date: _pending_
- Reviewed commit: _pending_
- Remaining exceptions approved by owner: _pending_
