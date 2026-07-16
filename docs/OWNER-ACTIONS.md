# Owner actions

The v76 app code was merged into `development` by
[PR #103](https://github.com/sarachdatabear-polar/hsk_game/pull/103) at
`cb17797`, then promoted to `main` by
[PR #104](https://github.com/sarachdatabear-polar/hsk_game/pull/104) (merge
`57fbc42`). **The web/PWA release is done** — v76 is live on GitHub Pages
(verified serving `nbhsk-shell-v76`). Shipping the web build to `main` is
routine and does not wait on the gates below; those gates govern the **signed
Android build and store/legal submission**, which are separate artifacts. This
file contains only actions that require the app owner, private credentials,
legal attestations, external accounts, payments, a real device, or a product
decision.

## Current handoff snapshot

- Web release: **live**. `main` (merge `57fbc42`, app code `cb17797`) is
  deployed to GitHub Pages at SHELL v76.
- PRs: **#103 merged** (`fix/release-readiness-audit` → `development`),
  **#104 merged** (`development` → `main`).
- GitHub CI: no checks were configured or reported on the PRs at merge time.
- Recorded local gates: 68 files / 1,916 tests, build, 95 assets, EN+TH browser
  matrices, offline launch, performance/cache budgets, and Capacitor branding
  sync pass.
- Remaining owner gates are **Android + store only** — the web build needs no
  further promotion.

Do these in order. The Google/RevenueCat/backend tracks can overlap once the
accounts exist.

## 1. Build and accept the v76 APK/AAB

This is the one gate still fully open. The v76 source (now on both `main` and
`development` at `cb17797`) passes 68 test files / 1,916 tests, 95 asset checks,
production build, Capacitor sync, offline launch, and the expanded EN+TH
viewport/format/accessibility gates. **It has not been signed on Windows** — the
signed APK/AAB is a separate artifact from the already-live web build.

Pull `main` (or `development`, same app code) at `cb17797` onto the Windows
release checkout, then open a fresh PowerShell in
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

Once the signed build passes this matrix, it is ready for the store tracks below
(§3–§7). The web release to `main` is already done, so no further
`development` → `main` promotion is required for v76; the signed APK/AAB is
uploaded to the Play Console, not merged to `main`.

## 2. Obtain native Thai sign-off

Give the reviewer [the prioritized 377-string queue](i18n/i18n-translation-review.md).
They must edit `src/i18n.js` or return exact key/value corrections, then supply
their name, review date, and reviewed commit for the sign-off block. Money,
account-loss, cloud-backup, and notification copy is P0.

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
