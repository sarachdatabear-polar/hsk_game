# Owner actions

The **v132** release is on `main` (`9d8c30ed`) and deployed to the web/PWA
(Pages run `30446749729`, 2026-07-29). Since the last revision of this doc:
**v130** profile avatar + friend invite, **v131** static answer timer +
single-stage Review Challenge, **v132** responsive-sweep/QA fixes + i18n
cleanup (no user-visible change). The remaining gates are the quick on-device
checks (§A), the web go-live track (§B), cross-device acceptance of the v129
cloud flip (§0), the signed Android artifact, native Thai sign-off, and
store/legal work.

**TARGET: owner-side ready by 1 August 2026** (Jordan, 2026-07-29). That
covers §A, §B, §0 and the Thai reviewer engagement (§2). The Play store track
(§3–§7) is exempt by arithmetic: Google's closed-testing rule for new personal
accounts (12 testers / 14 days) cannot complete by then.

## Current handoff snapshot

- Current committed/deployed source: `main` == `development` == `9d8c30ed`;
  service-worker cache version **`v132`**.
- Recorded release gates at the v132 cut: 112 files / 9,808 tests, ESLint,
  production build, responsive sweep EN+TH 10/10 all pass; live `dist/app.js`
  verified byte-identical to the committed build (sha256 `6e1dfdf6…` —
  point-in-time check; re-verify after any commit touching `src/`).
- Precache headroom is **thin**: 10,973,841 of the 11,010,048 B cap (~36 KB
  free) as of v130 — the next asset-bearing feature needs a budget check first.
- Latest signed artifact remains Profile v74; **no v127–v132 APK/AAB exists
  yet** — the Android track is ~58 shell versions behind the web.
- Journey cloud sync is **LIVE** as of v129: the migration is applied to
  `eqsodiufgjecoqgxdisn` and `CAT_JOURNEY_CLOUD_ENABLED = true`. See
  [STATUS.md](STATUS.md).

Order: **§A and §B can run in parallel with §0**; §0 blocks §1 (the APK). The
Google/RevenueCat/backend store tracks can overlap once the accounts exist.

## A. Quick on-device checks owed (minutes each — do first)

1. **v131 feel check (post-release verification):** play a round past the
   10th word — the golden raccoon (boss) must die in **one** correct answer
   (single-stage collapse), and the answer timer should feel constant past
   word 30 (no per-word compounding speed-up). If it feels wrong, rollback =
   revert the release merge on `main` + SHELL bump.
2. **v130 QR scan check:** scan one v7/v8-M friend card and one v13-L Thai
   card with iOS Camera and Android Lens (friend-invite spec §3 QA gate).

## B. Web go-live track — target 1 Aug

Owner steps from the locked
[go-live plan](planning/2026-07-25-golive-hosting-billing-plan.md).
Engineering steps 3 (URL sweep), 4 (migration bridge), 7 (placement) and
8 (web coin packs) are built or unblocked and wait only on these:

1. **Buy `luckycathsk.com`** on Cloudflare Registrar (plan step 1). The first
   domino — unblocks Cloudflare Pages, the URL sweep, and the migration bridge.
2. **Stand up Cloudflare Pages** with engineering (plan step 2). The GitHub
   Actions workflow push needs `gh auth refresh -s workflow` run interactively
   on the VPS, or a push from your own machine — the VPS token lacks the
   workflow scope.
3. **Upgrade Supabase to Pro** ($25/mo) — before billing goes live (plan
   step 5).
4. **RevenueCat Web Billing go-live** (plan step 6): in the RC dashboard,
   enable Web Billing + Stripe with **PromptPay**; create the 79฿ `supporter`
   web price and attach the entitlement to the current offering; register the
   Stripe webhook → `rc-webhook`; then hand engineering the **web public key**
   (safe to commit) and run **one real PromptPay THB test checkout** —
   confirming PromptPay actually surfaces for a THB one-time purchase — before
   the price is advertised. The client code is already merged dark; a blank
   key is a pure no-op.
5. **Do NOT yet:** repo-private flip (plan step 9 — only after the github.io
   bridge retires), subscriptions, web ads, or new SKUs before placement
   (step 7) ships.

## 0. Accept the v129 cloud flip on two devices (blocks §1)

The v129 merge algebra is pinned by unit tests and the single-session round-trip
is verified against production, but the real two-device round-trip is not — it
needs two authenticated sessions on **one** account, which cannot be driven
headlessly (anonymous auth mints a distinct uid per profile; the other providers
are Google / Apple / magic-link).

1. Device A: sign in, open Cat Journey, complete a journey. Note the keepsake
   and Cat Bond tier.
2. Device B: sign in to **the same account**, foreground the app, open Cat
   Journey.
3. **Expect:** A's claim is present on B, the keepsake is granted **exactly
   once** (re-enter the screen and cold-restart the app — no second grant), and
   the bond tier matches.
4. Device B: complete a *different* day's journey. Foreground Device A.
5. **Expect:** A shows **both** claims — a union, not a replacement. A
   replacement is a P0: revert `CAT_JOURNEY_CLOUD_ENABLED`, ship immediately,
   and reopen the merge tests.
6. On a device that had journey state *before* v129, confirm nothing was lost
   after the first post-upgrade sync.

**Until this passes, v129 is deployed but not accepted — do not sign an
Android artifact.** A store build carrying a sync regression is far more
expensive to withdraw than a web deploy.

The two anonymous identities created by that production verification have been
**deleted** (2026-07-27) — nothing to clean up. `public.progress` and
`public.wallet` are back to **8** rows, `auth.users` to 10, all 8 progress rows
carrying the `cat_journey = {}` backfill, and no orphaned `profiles` rows. That
8 is the real baseline for any future backfill check.

## 1. Build and accept the current (v132) APK/AAB

**Entry criteria: §0 passed.** Use the current `main` release (**v132**,
`9d8c30ed`) for Android. It passes 112 test files / 9,808 tests, ESLint,
production build, and the deterministic EN+TH viewport/format/accessibility
gates. **It has not been signed on Windows.**

Pull `main` v132 onto the Windows release checkout, then open a
fresh PowerShell in
`C:\Users\sarac\Desktop\HSK\game` and run these as separate lines:

```powershell
$storeSecure = Read-Host "Keystore store password" -AsSecureString
$keySecure   = Read-Host "Keystore key password" -AsSecureString
$env:NBHSK_STORE_PASS = [System.Net.NetworkCredential]::new('', $storeSecure).Password
$env:NBHSK_KEY_PASS   = [System.Net.NetworkCredential]::new('', $keySecure).Password
npm run android:release
Remove-Item Env:\NBHSK_STORE_PASS, Env:\NBHSK_KEY_PASS -ErrorAction SilentlyContinue
$storeSecure = $null
$keySecure = $null
```

Do not paste either password into chat, source files, shell history, or
`keystore.properties`. The build script creates and deletes its temporary
properties file.

Then record:

```powershell
$artifacts = @(
  "dist-apk\LuckyCatHSK-1.0.0.apk",
  "dist-apk\LuckyCatHSK-1.0.0.aab"
)
Get-Item $artifacts | Select-Object FullName,Length,LastWriteTime
Get-FileHash $artifacts -Algorithm SHA256
```

Repeat the accepted emulator matrix: cold launch, Home/Profile, player-avatar
state, name persistence, HSK1-first welcome, bounded/resumable Cards, every
question format, pause focus/return, notification permission requestability,
portrait and landscape, launcher/splash branding, offline mode, and a final
empty scan for fatal Android/WebView errors. Real IAP is expected to remain
hidden because the public RevenueCat key is blank.

**New since v127 — Cat Journey has never run on real hardware.** Add to the
matrix: open the Cat tab, send the cat out, confirm the return vignette and
keepsake arrive and are granted **once** (re-enter the screen and re-launch the
app — no second grant); confirm Cat Bond tier progresses; confirm the journey
notification fires and is cancellable; confirm the rollback flag still restores
Street with all prior state intact
(`localStorage.setItem("nbhsk.features.catJourney","false"); location.reload()`).

**New for v128 —** the quest overlay was unreachable on the Cat tab and is now
top-level `position: fixed`. Open Quests from Cat Journey, confirm the panel is
in-viewport in portrait and landscape, shows 3 dailies plus the monthly claim,
and closes on back/Esc.

**New for v129 —** Journey state now follows the **account**, not the device.
Signing in on the Android build must pull the journey created on another device
(that is §0's check, done before you get here). Also confirm the reverse: a
journey completed on Android appears on the web build under the same account.

**New for v130 —** avatar + friend invite: pick a cat avatar and a gallery
photo avatar (**no camera-permission prompt should appear** — the picker is
gallery-only by design), rename the profile and confirm the avatar survives
the rename, open the friend screen, share a card (empty-name share must prompt
for a name), and scan a received card.

**New for v131 —** repeat §A.1 (single-hit golden raccoon, static timer) on
the signed build.

Once the signed build passes this matrix, it is ready for the store tracks below
(§3–§7). The signed APK/AAB is uploaded to the Play Console, not committed to
the repository.

## 2. Obtain native Thai sign-off

Give the reviewer **`docs/i18n/thai-review-sheet.csv`** — the machine-readable
queue, **753 rows** (P0 unchanged at 71; regenerated 2026-07-29 — the 25 v130
friend/avatar strings joined at P3 and 3 dead rows were dropped), sorted so
money, account, cloud-backup, and notification copy is first in the file. They fill the
`corrected_thai` and `notes` columns; engineering applies the result with
`node docs/i18n/scripts/apply-thai-review-sheet.mjs`. Alternatively they can edit
`src/i18n.js` directly. Either way they must supply their name, review date, and
reviewed commit for the sign-off block. Background and per-block guidance is in
[the review doc](i18n/i18n-translation-review.md).

**Coverage is complete** — all Thai lives in `STRINGS`; `src/cat-memories.js`
(the 30 stories, 12 keepsakes) holds zero Thai characters, only ids. A reviewer
working the CSV is not missing the narrative text.

**P0 escalation — Cat Journey Thai is already live and unreviewed.** The v124–v127
arc added **174 machine-drafted Thai strings** (≈60 memory titles/stories, ≈45
journey UI strings, push-notification copy, reworked onboarding, plus `street.*`,
`scope.*`, `profile.*`, `album.*`, `shop.*`, `howto.*`, `battle.*`, `more.*`
batches) that shipped to production **without** the native review that
[CAT-JOURNEY-EVERGREEN-v1-REVIEW.md](content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md)
itself declares "a production release gate". Thai users see these with no English
fallback. Three of them **silently replaced Thai that had already passed** the
v112–v116 humanization arc — `account.connect`, `learn.stillLearning`,
`learn.knowIt` — so reviewed copy was regressed to machine drafts. Reviewing this
set takes precedence over the older queue; record the reviewer name, date, and
commit in that document's sign-off block, and apply corrections to `src/i18n.js`
in a normal cut (rebuild + SHELL bump).

The mechanical fixes that used to block this — the strings being untagged and
absent from the sheet — are **DONE** (2026-07-27, engineering). For the record,
because the numbers in the older text were off:

- **All 174 arc keys now carry the `TH-REVIEW` marker** in `src/i18n.js` (21
  markers before, 195 after). Scope was computed by diffing the key set against
  the pre-arc tree rather than guessed by prefix; the tagging commit is
  comment-only, verified by diffing both sides of the patch with the marker
  stripped.
- **The sheet was 349 rows stale**, not 185 — 383 committed against 732
  generated. It is regenerated and committed.
- **Three priority rules were missing, not two.** `cat.*` (108 rows) had no rule
  at all and sat in the unclassified P3 bucket. `quests.*` fell through because
  the P1 rule tests `quest.`, which `quests.title` does not match. And
  `notify.cat.*` — the Cat Journey push copy, live since v127 — sat at **P3**
  while every other notification string was P0, contradicting the script's own
  stated policy; the per-family `notify.streak.`/`notify.comeback.` rules have
  been replaced with one prefix-wide `notify.` → P0 rule so the next family
  added cannot repeat it.

What remains here is **owner work only**: get a native reviewer through the
queue and record the sign-off.

## 3. Create Google Play Console

No Play Console account exists yet.

1. Choose Personal or Organization truthfully; do not select Organization
   unless a verifiable legal entity and required identifiers exist.
2. Pay the registration fee and complete identity/contact verification.
3. Complete the real-Android-device verification if Console requests it.
4. Create the app with package id `com.luckycat.hsk`; never create a second
   package id for the same release line.
5. Complete truthful developer profile/contact details. Be aware that public
   identity/address disclosures differ by account type and monetization status.
6. Upload a signed Android App Bundle for store testing; the private APK is for
   direct/emulator testing, not the normal Play release artifact.
7. Follow the closed-testing requirement shown in this account. New personal
   accounts currently document a minimum of 12 opted-in testers continuously
   for 14 days before applying for production access.

Official references:

- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-EN)
- [Developer identity/contact verification](https://support.google.com/googleplay/android-developer/answer/13628312)
- [Device verification](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en-EN)

The live Console is the source of truth if Google shows account-specific steps
that differ from this checklist.

## 4. Create RevenueCat and Play products

No RevenueCat account exists yet.

1. Create the project and Android app for `com.luckycat.hsk`.
2. In Play Console create only the four launch consumables:
   `coins_s`, `coins_m`, `coins_l`, `coins_xl`.
3. Configure truthful localized prices and link Play credentials to RevenueCat.
4. Configure the four products in RevenueCat and make them available to the
   app. Keep `supporter` absent/dark until ads and the advertised ad-removal
   benefit are real.
5. Copy the **public Android SDK key** into
   `src/monetization/revenuecat-config.js` only when closed-track products are
   ready. A public SDK key may be committed; service credentials may not.
6. Configure the webhook bearer authorization and HMAC signing secret. Store
   both directly in RevenueCat/Supabase secret managers, never git.

## 5. Deploy the live Supabase purchase path

This changes production data and therefore remains an owner-authorized
operation:

1. Back up/confirm the target Supabase project and region.
2. Apply `docs/supabase/migrations/2026-07-12-iap-golive.sql`.
3. Deploy `supabase/functions/rc-webhook` with JWT verification disabled for
   this endpoint; the function verifies RevenueCat bearer + HMAC credentials.
4. Set `RC_WEBHOOK_SECRET` and `RC_WEBHOOK_SIGNING_SECRET` as function secrets.
5. Run the documented service-role grant/duplicate smoke and signed-user ledger
   RLS read smoke. Clean up throwaway rows.
6. Send a RevenueCat test event and confirm an accepted/ignored response as
   appropriate, with no unauthorized grant.

## 6. Complete closed-track purchase acceptance

With a license tester and a Play-installed build, test every coin pack plus:

- cancellation (no charge, no grant);
- pending payment (processing copy, no false failure);
- exact localized Play price;
- webhook delay and later reconciliation;
- kill/relaunch between store success and grant;
- duplicate webhook/replay credits exactly once;
- account sign-in change preserves correct RevenueCat/Supabase identity;
- web/PWA remains earn-only with no purchase shelf.

Keep evidence for each transaction/order id without publishing personal or
payment data.

## 7. Finish store/legal attestations

The privacy policy is still a draft. Supply/approve the real operator name,
public contact, Supabase region, retention/deletion behavior, account deletion
path, age positioning, and every SDK actually enabled. Publish it at a stable
public URL before completing Data Safety.

Also complete the app content/IARC, ads declaration, target-audience, Data
Safety, store listing, screenshots/feature graphic, and tester instructions
truthfully. Do not declare RevenueCat, ads, or analytics behavior that is not in
the uploaded build, and do not omit SDK behavior that is enabled.

## 8. Physical-device and product decisions

- Verify vibration feel, audio routing/volume, notification delivery/cancel,
  battery behavior, and mid-range performance on a real Android phone.
- Confirm the recommended next roadmap (release/store readiness plus HSK 3.0
  compatibility audit in parallel), or explicitly select another ranked option
  in [the roadmap](planning/2026-07-16-next-roadmap.md).
- Select analytics/consent providers before any remote event collection is
  implemented.
- Decide on iOS only after Apple account, Mac/Xcode access, legal labels, and
  ongoing platform budget are available.

## Credential cleanup already done

The PowerShell user variables `NBHSK_STORE_PASS` and `NBHSK_KEY_PASS` were
cleared. To re-check without printing secret values:

```powershell
[string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("NBHSK_STORE_PASS", "User"))
[string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("NBHSK_KEY_PASS", "User"))
```

Both should return `True`.
