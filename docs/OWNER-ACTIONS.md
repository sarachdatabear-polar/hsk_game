# Owner actions

The **v136** release is on `main` and deployed to the web/PWA at **https://luckycathsk.com** (and still at github.io during the migration). Since the last
revision of this doc: **v133** fixed the pre-launch intro/rest-day issues,
**v134** repaired the Cat Journey Shop/Profile path, and **v135 retired the
Street surface entirely** (11 modules / ~2,700 LOC, 44 assets, 159 i18n keys ×
2 locales, and the 15 decoration catalog entries deleted; `features.catJourney`
collapsed — Cat Journey is now the only screen). Today's Picks shows three
obtainable Word Quest cosmetics, Profile counts 20 reusable cosmetics, Cat
Journey links directly to customization, and new-sticker Results feedback opens
the Album. The remaining gates are the quick on-device checks (§A), the web
go-live track (§B), cross-device acceptance of the v129 cloud flip (§0), the
signed Android artifact, native Thai sign-off, and store/legal work.

**TARGET: owner-side ready by 1 August 2026, WITH A SANCTIONED SLIP TO
6 AUGUST** (Jordan, 2026-07-29; slip granted 2026-07-31: *"the deploy date can
be shift to 6 August if everything is not ready"*). That covers §A, §B, §0 and
the Thai reviewer engagement (§2). The Play store track (§3–§7) is exempt by
arithmetic: Google's closed-testing rule for new personal accounts (12 testers /
14 days) cannot complete by then.

**What the slip buys, concretely:** §0's union check cannot happen before
1 August (see §0 — one journey per calendar day, and the 31 Jul journey was
already started), and §0 gates the signed APK. Against a hard 1 Aug that left
zero slack; against 6 Aug there is room to run §0 properly, sign, and work the
emulator matrix without rushing. **Billing is explicitly NOT in this window** —
Stripe/RevenueCat do not exist yet and the web billing code ships dark, so
launch does not wait on it.

## Current handoff snapshot

- Current committed/deployed source: `main` == **`335f24c2`** (v136, the URL
  sweep — see §B3); service-worker cache version **`v136`**, live on
  **both** `luckycathsk.com` and `github.io`.
- Recorded release gates at the v135/v136 cuts: 103 files / 9,484 tests, ESLint,
  production build, 131 validated assets, responsive sweep EN+TH 10/10 plus
  all Cat Journey, Results, onboarding, Cards-resume, format, and accessibility
  probes. (Test count fell 9,820 → 9,484 because the Street test files were
  deleted with the feature; the delta is reconciled per-file in `../HANDOFF.md`.)
- Precache headroom is **no longer thin**: 10,056,341 of the 11,010,048 B cap —
  **931 KB free**, up from ~36 KB, because the Street retirement shrank
  `dist/app.js` and dropped 3 dead precached assets. This is what unblocks the
  11 pending keepsake bitmaps.
- **⚠ THERE IS NO ROLLBACK FLAG FOR CAT JOURNEY ANY MORE.** `features.catJourney`
  was deleted in v135. If Cat Journey is wrong on a device, the rollback is
  **revert the release merge on `main` + a SHELL v137 bump** — not a
  `localStorage` toggle. The old
  `localStorage.setItem("nbhsk.features.catJourney","false")` recipe is dead;
  it will do nothing.
- **The cloud-sync flag is a different flag and it survived.**
  `CAT_JOURNEY_CLOUD_ENABLED` lives in `src/cloud-config.js` (still `true`) and
  gates only whether `catJourney` is a synced key — see §0.
- Latest signed artifact remains Profile v74; **no v127–v136 APK/AAB exists
  yet** — the Android track is ~60 shell versions behind the web.
- **Post-release browser verification of v135 is done** (2026-07-30): the
  legacy-install migration ladder (15/15, idempotent), fresh install, Cat
  Journey + all five of its sub-surfaces in EN and TH (36/36), and the
  browser-checkable half of §A.3. Details in `../HANDOFF.md`. None of it
  replaces a real device.
- Journey cloud sync is **LIVE** as of v129: the migration is applied to
  `eqsodiufgjecoqgxdisn` and `CAT_JOURNEY_CLOUD_ENABLED = true`. See
  [STATUS.md](STATUS.md).

Order: **§A and §B can run in parallel with §0**; §0 blocks §1 (the APK). The
Google/RevenueCat/backend store tracks can overlap once the accounts exist.

## B3. URL sweep — SHIPPED (plan step 3)

**v136 is live on both hosts (2026-07-31).** Merge `335f24c2` on `main`; runs
**30567020748** (Cloudflare) and **30567021056** (Pages) both SUCCESS. All 7
occurrences of the `github.io` origin in shipped code now point at
`luckycathsk.com`: `REMOTE_AUDIO_BASE` (`src/main.js:1193`), the native privacy
link (`:4257`), `index.html`'s canonical/`og:url`/`og:image`/`twitter:image`,
and the asserted URL in `test/social-meta.test.js`. SHELL v135 → v136 with the
coupled `sw-precache.test.js` pin in the same commit; suite re-run after the
bump (103 files / **9,484 exit 0**, lint 0, build 0, zero dist drift).

**Live-verified on BOTH origins:** each serves `CACHE_VERSION "v136"`, a
`dist/app.js` with sha256 `4e0c5892…` **identical to the committed bundle**, a
canonical of `https://luckycathsk.com/`, and working audio (6,336 B).

**The bridge is intact** — `github.io` still fully works, because only the
*native* branch of `REMOTE_AUDIO_BASE` is absolute; web keeps the relative
`"audio/"` path, so each host serves its own audio. No existing user is
orphaned. Both canonicals pointing at the new domain is intended: it tells
search engines which origin is authoritative while both are up.

**⚠ CONSEQUENCE FOR THE ANDROID TRACK:** any APK signed from `main` at or after
`335f24c2` carries `https://luckycathsk.com/audio/` baked in. That is now the
store-artifact-safe origin — but it also means the domain's auto-renew is
load-bearing for every installed app, not just the website.

## A. Quick on-device checks owed (minutes each — do first)

These need a **real device or an emulator**; the headless browser passes
recorded above do not discharge them.

1. **v131 feel check (post-release verification):** play a round past the
   10th word — the golden raccoon (boss) must die in **one** correct answer
   (single-stage collapse), and the answer timer should feel constant past
   word 30 (no per-word compounding speed-up). If it feels wrong, rollback =
   revert the release merge on `main` + SHELL bump.
2. **v130 QR scan check:** scan one v7/v8-M friend card and one v13-L Thai
   card with iOS Camera and Android Lens (friend-invite spec §3 QA gate).
   *iOS half is doable with an iPhone today. The Android Lens half is the one
   check an emulator handles badly* — the emulated camera renders a virtual
   scene, so scanning a QR off a second screen is fiddly. Defer it to real
   Android hardware rather than fighting the emulator.
3. **v134 journey check — PARTLY DISCHARGED (2026-07-30, headless Chromium on
   prod).** Verified in-browser: Customize Word Quest shows exactly **three**
   Today's Picks across three categories (Panda / Temple Dawn / Star Shower)
   with **no** Street decoration in the markup, and Profile → Collection reads
   **0/20 cosmetics** — matching the 20 non-consumable items derived from the
   live `CATALOG`, so the target survived the deletion of the 15 decos.
   **Still owed on a device:** earn a new sticker and confirm its Results
   plaque opens the Album (needs real play).
4. **v135 Cat Journey look (new).** Cat Journey is now the only screen and has
   **no rollback flag**, so give it a real look: Cat tab renders, the four
   buttons (Backgrounds / My progress / Customize Word Quest / Quests) all open
   their surfaces, the Quests modal is in-viewport in portrait *and* landscape
   and closes on back/Esc, and nothing anywhere says "Street". Verified in
   desktop Chromium in both locales; unverified on a phone.

## B. Web go-live track — target 1 Aug (slip to 6 Aug sanctioned)

Owner steps from the locked
[go-live plan](planning/2026-07-25-golive-hosting-billing-plan.md).
Engineering steps 3 (URL sweep), 4 (migration bridge), 7 (placement) and
8 (web coin packs) are built or unblocked and wait only on these:

**Start the payment-rails setup on day one, out of order.** Everything else here
is under our control; Stripe account verification is the only item with an
**external approval clock**. **RC Web Billing PromptPay was checked and ruled
out:** RevenueCat Web Billing exposes only card / Apple Pay / Google Pay, and
RevenueCat — not us — controls that list; PromptPay is not on it and cannot be
added merchant-side. Step 6 below no longer routes through RC Web Billing at
all — it goes straight to Stripe Checkout via two Supabase edge functions
(`stripe-checkout`, `stripe-webhook`; see `docs/supabase/README.md` §Stripe
deployment prerequisites). Start Stripe account verification immediately and
let it run in the background while you do steps 1–2.

1. ~~**Buy `luckycathsk.com`**~~ **— DONE 2026-07-30.** Registered at Cloudflare
   Registrar, `2026-07-30T17:14:22Z`, expires `2027-07-30`, NS
   `cameron/chan.ns.cloudflare.com`, status `clientTransferProhibited`.
   **⚠ AUTO-RENEW IS LOAD-BEARING:** once the URL sweep ships,
   `https://luckycathsk.com/audio/` is baked into every signed APK, so a lapsed
   domain silently breaks audio on every installed Android app — not just the
   website.
2. ~~**Stand up Cloudflare hosting**~~ **— DONE 2026-07-30. LIVE at
   https://lucky-cat-hsk.sarach-northbear.workers.dev**
   Deployed by `.github/workflows/deploy-cloudflare.yml` on merge `462ba8eb`,
   run **30564171730 SUCCESS** (1m12s; 13,324 assets uploaded in 19s).
   **Target is Cloudflare WORKERS STATIC ASSETS, not Pages** — Cloudflare's docs
   now steer new projects to Workers and the dashboard no longer offers a Pages
   creation path. Same host, same unmetered-bandwidth guarantee ("requests to
   static assets are free and unlimited", no storage cost), same 20,000-file
   free-tier cap, and a 100,000-file ceiling on Workers Paid — 5× what Pages
   could offer, which is a better long-run answer for the audio set than the
   deferred R2 move. See `wrangler.jsonc`.
   **VERIFIED against the live origin:** index 200, `dist/app.js` 200 and
   sha256 `9060ca44…` **byte-identical to both the committed bundle and the
   github.io copy**, `data/words.js` 200 (3,177,401 B), `sw.js` serves
   `CACHE_VERSION "v135"`, `pwa/manifest.webmanifest` 200, `privacy.html` 200,
   audio 200 (`audio/的.mp3` 6,336 B, matching github.io byte-for-byte), and the
   retired `assets/bg-street.png` correctly **404s**. Both hosts are live, as
   the migration window requires.
   *(Owner steps now closed: Cloudflare account, Account ID, and an
   `Edit Cloudflare Workers` API token, stored as the repo secrets
   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.)*
   **CUSTOM DOMAIN ATTACHED AND VERIFIED — `https://luckycathsk.com` IS LIVE
   (2026-07-30).** Apex resolves to Cloudflare anycast (`172.67.164.5`,
   `104.21.82.217`). Verified against the live domain: index 200 (154,672 B),
   `dist/app.js` 200 with sha256 `9060ca44…` **byte-identical to the committed
   bundle**, `data/words.js` 200, `sw.js` `CACHE_VERSION "v135"`, manifest 200,
   `assets/ui-icons.svg` 200, audio 200 (`audio/的.mp3` 6,336 B), `privacy.html`
   307 → `/privacy` 200 (Cloudflare's `html_handling` drops the extension —
   harmless extra hop), retired `assets/bg-street.png` **404**, TLS
   `ssl_verify_result=0` over HTTP/2.

   **TWO GAPS FOUND DURING VERIFICATION — owner-side, both quick:**
   - **`www.luckycathsk.com` does not resolve** (NXDOMAIN — only the apex was
     attached). Add it as a second custom domain on the same Worker, or a
     redirect rule to the apex. Anyone typing `www.` currently gets nothing.
   - **Plain `http://luckycathsk.com` serves content instead of redirecting to
     HTTPS** (returns 200 on port 80, no 301). Turn on **SSL/TLS → Edge
     Certificates → Always Use HTTPS.** This matters more than usual here: the
     PWA's service worker requires a secure context, and an HTTP surface on the
     canonical domain is exactly the thing the store/legal review will ask about.
3. **Upgrade Supabase to Pro** ($25/mo) — plan step 5, immediately **before**
   the billing key flip (step 6), **not before that**. Nothing in steps 1–4
   needs it; buying early just starts the meter. The free tier is fine until
   real money is in play (it lacks backups and auto-pauses, which is only
   unacceptable once paid users exist).
4. **Direct Stripe PromptPay go-live** (plan step 6 — replaces the RC Web
   Billing approach above; RC Web Billing cannot carry PromptPay, see the
   preamble):
   0. **Confirm `grant_purchase` is already applied — before anything else
      in this list.** Both edge functions grant by calling
      `supabase.rpc("grant_purchase", …)`; that function comes from
      `docs/supabase/migrations/2026-07-12-iap-golive.sql`, which does not
      apply itself. Skip this and the failure is silent and after the fact:
      the RPC errors, the function 500s, Stripe retries and gives up, the
      buyer's money is already gone, and nothing was ever granted — the only
      trace is Stripe's own delivery log. Confirm it, don't assume it: in the
      Supabase SQL editor, `select 1 from pg_proc where proname =
      'grant_purchase';` should return a row (or Dashboard → Database →
      Functions → look for `grant_purchase`). If it doesn't, apply the
      migration first and re-check before moving on to step 1.
   1. Create a **Thailand-based Stripe account** and complete its
      verification (this is the external clock — start it early).
   2. In the Stripe Dashboard → **Payment methods**, enable **PromptPay**.
   3. Create the **webhook endpoint** — Stripe Dashboard → **Developers →
      Webhooks → Add endpoint** — pointed at
      `https://<project>.supabase.co/functions/v1/stripe-webhook`, subscribed
      to `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, and
      `checkout.session.async_payment_failed`; copy its `whsec_…` signing
      secret.
   4. Set both Supabase function secrets — `STRIPE_SECRET_KEY` and
      `STRIPE_WEBHOOK_SECRET` — and deploy the two functions with the
      **opposite JWT settings** documented in `docs/supabase/README.md`
      §Stripe deployment prerequisites: `stripe-webhook` deploys
      **`--no-verify-jwt`** (Stripe sends no Supabase JWT — skipping this
      flag means every real delivery 401s, silently, after the buyer's money
      has already left their account), `stripe-checkout` deploys **normally**
      (it authenticates the caller itself).
   5. Fill `STRIPE_CHECKOUT_URL` and `STRIPE_PUBLISHABLE_KEY` in
      `src/monetization/stripe-config.js` (the publishable key is safe to
      commit; never the secret key) and ship. The client code is already
      merged dark; a blank `STRIPE_CHECKOUT_URL` is a pure no-op.
   6. **Live gate — do all four before advertising the 79฿ price**, because
      neither edge function can be unit-tested (Deno TS does not run under
      vitest and `eslint.config.mjs` ignores `supabase/`) — this is the only
      verification they get before real money moves through them:
      - **One real PromptPay checkout** — confirm PromptPay actually
        surfaces at Stripe Checkout for a THB one-time purchase, and that the
        entitlement lands after payment confirms.
      - **One real card checkout** — confirm the card path also grants.
      - **One abandoned checkout** — start and walk away; confirm no
        entitlement is granted and no coins move.
      - **One replayed webhook delivery**, via `stripe listen` or
        `stripe events resend`, to prove the session-id dedupe holds: the
        same event delivered twice must grant exactly once, not twice.
        **PASS:** the replay's response body is `{"duplicate":true}` (visible
        in the Stripe delivery log) and the wallet balance is unchanged from
        after the first delivery. **FAIL:** a second `{"ok":true}` grant and
        the balance **doubled** — the `supporter` product alone is worth
        2,000 coins (`src/monetization/products.js:11`), so a failed dedupe
        is not subtle, it is a visibly doubled balance.
   7. **At the key flip, also verify the supporter placement path on web:**
      finish a qualifying round (level up is easiest) → the results line
      shows → its button lands on a shop where the supporter card actually
      renders. The line is key-gated but does not wait for the RC SDK — a
      chunk-load failure would show the line with no card behind it
      (accepted trade-off, see the placement spec's Implementation
      deviation).
5. **Do NOT yet:** repo-private flip (plan step 9 — only after the github.io
   bridge retires), subscriptions, web ads, or new SKUs before placement
   (step 7) ships.

## 0. Accept the v129 cloud flip on two devices (blocks §1)

The v129 merge algebra is pinned by unit tests and the single-session round-trip
is verified against production, but the real two-device round-trip is not — it
needs two authenticated sessions on **one** account, which cannot be driven
headlessly (anonymous auth mints a distinct uid per profile; the other providers
are Google / Apple / magic-link).

**"Two devices" means two authenticated sessions, not two phones.** A Windows
browser and a Mac browser signed into the same account satisfy this check — the
whole point is that journey state follows the *account*. No phone required.
Sign-in is **email OTP** (`signInWithOtp`, `src/cloud.js:75`): same email
address on both machines, one code each.

> **⚠ THIS CHECK SPANS TWO CALENDAR DAYS — IT CANNOT BE COMPRESSED, AND IT
> BLOCKS THE APK.** Two hard timings are baked into the feature:
> 1. A journey takes **20 real minutes** (`JOURNEY_DURATION_MS`,
>    `src/cat-journey.js:4`) between sending the cat out and the return vignette.
> 2. There is **one journey per calendar day**. `journeyStatus` returns `"done"`
>    when `today <= latestClaimDay(state)` (`src/cat-journey.js:301`), and once
>    Device A's claim syncs to Device B, B is "done" for today too.
>
> So steps 1–3 (propagation + granted-exactly-once) run **today**; steps 4–5 —
> the union check, which is the half that detects the P0 — cannot run until
> **tomorrow**. Start day one immediately; the 20-minute journey timer is dead
> time you can spend on §B.

**Rollback if this fails:** `CAT_JOURNEY_CLOUD_ENABLED` in `src/cloud-config.js`
is a **source constant, not a runtime flag** — reverting it means editing the
file, rebuilding, bumping SHELL and shipping, not toggling `localStorage`. It
survived the v135 Street retirement unchanged (the flag that was deleted is the
unrelated `features.catJourney`). Setting it `false` drops `catJourney` from
`syncKeysFor()`, so journey state goes back to device-local; already-synced rows
stay in Supabase harmlessly.

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

## 1. Build and accept the current (v136) APK/AAB

**Entry criteria: §0 passed.** Use the current `main` release (**v136**) for
Android. It passes 103 test files / 9,484 tests, ESLint, production build, 131
asset checks, and the deterministic EN+TH viewport/format/accessibility gates.
**It has not been signed on Windows.**

> **⚠ USE v136 OR LATER — NOT v135.** The go-live URL sweep has now SHIPPED
> (§B3, merge `335f24c2`), so `REMOTE_AUDIO_BASE` (`src/main.js:1193`) is
> `https://luckycathsk.com/audio/` and that origin is **baked into the APK**.
> An artifact signed from v135 or earlier points at `github.io` forever and
> would be stranded when that host retires at plan step 9. Pull `main` again
> before signing — the earlier plan to sign v135 as a throwaway acceptance
> artifact and re-sign later is now unnecessary: sign once, from v136+.

**Emulator vs real hardware.** A Google-Play-image emulator runs the signed APK
and covers nearly all of the matrix below. Four things are physically
hardware-bound and must wait for a real phone (see §8): **vibration feel, audio
routing/volume, real notification delivery, and battery/mid-range performance.**
The Android Lens QR scan (§A.2) is also impractical on an emulator.

Pull `main` v136 onto the Windows release checkout, then open a
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
notification fires and is cancellable.

**REMOVED FROM THE MATRIX (v135):** the old line "confirm the rollback flag
still restores Street" is obsolete —
`localStorage.setItem("nbhsk.features.catJourney","false")` is now a no-op and
Street no longer exists to restore. Do not spend time on it.

**New for v135 —** on first launch of an install that carried pre-v135 data,
confirm nothing was lost: coins, mastery, streak, owned cosmetics and equipped
skin/backdrop all survive the schema-8 migration, and the app does not show a
brick counter anywhere. (Verified in desktop Chromium against prod; unverified
on Android WebView, which is the point of checking here.)

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

**Also confirm the Street is gone from the native build:** no "Street" tab,
label, or screen anywhere; Cat Journey's four buttons all work; the Quests modal
opens in portrait and landscape and closes on back.

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
