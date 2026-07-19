# v85 Android Release Prep

**Purpose:** everything the owner needs to (a) cut a v85-aligned signed Android
build on the Windows machine and (b) fill in the Play Console Store Listing and
Data Safety form, without guessing. This doc is prep-only — no source/build was
changed to produce it. It supplements, and does not replace,
[`OWNER-ACTIONS.md`](../OWNER-ACTIONS.md) (§1, §3, §7), which remains the
authoritative sequenced checklist; this doc adds the version-number decision,
copy-pasteable listing text, and a Data Safety row-by-row grounded in the code.

Prepared: 2026-07-19, against `development` @ `a6e5e7f` (branch state; `main` is
at `ead3ff2`, the deployed v85 web release — see §1 for why the Android build
must come from `main`, not `development`).

---

## 1. Build config verification

### What's currently in the repo

| Setting | Value | Source |
|---|---|---|
| `applicationId` | `com.luckycat.hsk` | `android/app/build.gradle:7` |
| `versionCode` | `1` | `android/app/build.gradle:10` |
| `versionName` | `"1.0"` | `android/app/build.gradle:11` |
| `appId` (Capacitor) | `com.luckycat.hsk` | `capacitor.config.json:2` |
| `appName` | `Lucky Cat HSK` | `capacitor.config.json:3` |
| Web `package.json` version | `0.2.0` | `package.json:3` |
| Deployed web `CACHE_VERSION` | `"v85"` | `sw.js:9` (`SHELL/RUNTIME/AUDIO` all derive from it) |

**Important caveat on where these numbers came from:** `android/` is
git-ignored (`.gitignore:5`) and is regenerated from scratch by `npx cap add
android`. Per `docs/build/ANDROID_BUILD.md:57`, Capacitor's default scaffold
writes `versionName "1.0"` and `versionCode 1`, and the doc's own standing
instruction is to manually re-edit `versionName` to `"1.0.0"` after every fresh
regen — `versionCode` has **never** been bumped past `1` in this doc's
history, across the v69, v74, and v80 signed/candidate builds recorded in that
same file. So the `1` / `"1.0"` seen above is not a stale leftover from a
particular release — it is the checked-in *procedure's* steady state, and
nothing in the repo ties Android's `versionCode`/`versionName` to the web
release number (`v74`, `v80`, `v85`, ...).

**Consistency check against v85:** the web release is `sw.js` `CACHE_VERSION
"v85"` (`docs/STATUS.md:4`, `docs/OWNER-ACTIONS.md:13`). Android's
`versionName "1.0.0"` (per the manual-edit step) carries no version
information tying it to `v85` at all — this is not a "mismatch" in the sense
of contradicting v85, it's that the Android version string has never encoded
the release number. `docs/OWNER-ACTIONS.md:19` confirms: "Latest signed
artifact remains Profile v74; no v85 APK/AAB exists yet."

### Flag: no versionCode bump scheme exists

Because no Play Console app exists yet (`docs/OWNER-ACTIONS.md` §3: "No Play
Console account exists yet"), this v85 build will be the **first-ever Play
Console upload**, so `versionCode 1` would technically be *accepted* by Play.
But shipping the first upload as `1`/`"1.0.0"` — identical to what every prior
private sideload APK also called itself (`docs/build/ANDROID_BUILD.md:83`,
`:127`) — throws away the chance to start a real scheme, and Play requires
every future upload's `versionCode` to strictly increase, so the owner will
have to invent one eventually regardless.

**Recommended values for this v85 store build** (OWNER CONFIRM — this is a
judgment call, not something the repo already decided):
- `versionCode 85` — an integer that reads directly off `CACHE_VERSION "v85"`,
  leaves 84 numbers of headroom below it (never needed — Play only requires
  monotonic increase, not density) and makes "does Android match the web
  release" a glance instead of a lookup.
- `versionName "85.0.0"` — human-readable string shown to users in Play;
  mirrors the same number.
- **Going forward:** bump `versionCode` to match the web release number on
  every store upload (e.g. `v86` → `versionCode 86`); if an Android-only
  respin is needed without a web version bump, use the next free integer
  (e.g. `86` again would collide — use `860` + a sub-counter, or just take the
  next unused integer and note the mapping in `ANDROID_BUILD.md`). Either way,
  **write the chosen scheme into `docs/build/ANDROID_BUILD.md`** once decided,
  since that file is the one that currently pins `versionCode 1`/`versionName
  "1.0.0"` as "already correct" — it needs an update to stop repeating that
  after this release.

**OWNER CONFIRM:** whether `versionCode 85` / `versionName "85.0.0"` is the
scheme you want, or you'd prefer something else (date-based, semver, etc.).
Nothing in the repo already answers this — pick one before running the build.

### Secondary flag: output filenames don't carry the version either

`scripts/build_apk.ps1:44,50` hardcodes the output filenames
`LuckyCatHSK-1.0.0.apk` / `LuckyCatHSK-1.0.0.aab` regardless of what
`versionName` you set in `build.gradle` — so even after bumping to `85.0.0`,
the artifact on disk will still be named `LuckyCatHSK-1.0.0.apk`. This is
cosmetic (doesn't block upload; Play reads the version from inside the AAB
manifest, not the filename) but will be confusing when comparing artifacts
across releases. Not fixing this here since it's a script change, not a doc —
flagging so it doesn't cause a "which file is v85?" mixup later.

---

## 2. Windows build checklist

Faithful to `docs/build/ANDROID_BUILD.md` and `docs/OWNER-ACTIONS.md` §1.
Run on the Windows release machine (`C:\Users\sarac\Desktop\HSK\game`, per
`ANDROID_BUILD.md:49` and `OWNER-ACTIONS.md:33`).

1. **Get the exact v85 source.** Android must be built from `main` (the
   deployed release line), not `development`:
   ```powershell
   cd C:\Users\sarac\Desktop\HSK\game
   git checkout main
   git pull
   git log -1 --oneline   # confirm it shows ead3ff2 (v85) or later
   ```
2. **Install dependencies:**
   ```powershell
   npm ci
   ```
3. **Set the toolchain env vars** (per `ANDROID_BUILD.md:47-48`; only needed if
   not already set as User env vars):
   ```powershell
   $env:JAVA_HOME = [Environment]::GetEnvironmentVariable("JAVA_HOME","User")
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   ```
4. **(Version bump — see §1 above.)** Before syncing, decide and apply the
   `versionCode`/`versionName` values. Because `android/` is regenerated by
   `cap:sync`/`cap add android` and is git-ignored, this edit must be made
   **after** the sync step below touches `android/app/build.gradle`, or it
   will be overwritten. Recommended order: run step 5 first, then edit
   `android/app/build.gradle` (`versionCode`, `versionName`) before step 6/7.
5. **Build + stage + Capacitor sync + branding:**
   ```powershell
   npm run cap:sync
   ```
   This runs `npm run build && node scripts/stage-www.js && npx cap sync
   android && npm run android:brand` (`package.json:19`). If `android/` didn't
   already exist, this alone does **not** scaffold it — per
   `ANDROID_BUILD.md:51`, run `npx cap add android` once first if the folder
   is missing.
6. **Re-apply the manual `build.gradle` edits** (git-ignored, lost on every
   fresh `cap add android` — `ANDROID_BUILD.md:55-72`):
   - `versionName` → `"85.0.0"` (or your confirmed §1 value); Capacitor
     regenerates `"1.0"`.
   - `versionCode` → `85` (or your confirmed §1 value); Capacitor's default
     `1` is what's currently there.
   - `applicationId "com.luckycat.hsk"` — already correct after sync, no edit
     needed.
   - Release **signingConfig** block — add inside `android { }` per the exact
     Gradle snippet in `ANDROID_BUILD.md:59-71` (loads
     `android/keystore.properties`, written and deleted automatically by
     `build_apk.ps1`, so no manual edit needed for this part — just confirm
     it's present if you hand-regenerated `android/` outside the normal
     script flow).
7. **Keystore prerequisites** (`ANDROID_BUILD.md:76-89`, `OWNER-ACTIONS.md:24-49`):
   - Release keystore file must exist at
     `android-signing/nbhsk-release.keystore` (git-ignored; back it up — losing
     it blocks all future updates to this same app id, per
     `ANDROID_BUILD.md:135`).
   - Passwords are in `android-signing/KEYSTORE_INFO.txt` — **never** paste
     them into chat, source files, or `keystore.properties` directly.
   - Set them as env vars for this session only, then build:
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
     (`npm run android:release` = `build_apk.ps1 -Artifact Both`, i.e. both
     APK and AAB in one signed cut — `package.json:22`.)
8. **Where the artifacts land:**
   - `dist-apk\LuckyCatHSK-1.0.0.apk` (private sideload / emulator testing —
     see filename caveat in §1).
   - `dist-apk\LuckyCatHSK-1.0.0.aab` — **this is the one Play Console wants**
     (`OWNER-ACTIONS.md:91`: "Upload a signed Android App Bundle for store
     testing; the private APK is for direct/emulator testing, not the normal
     Play release artifact").
9. **Record the artifact hashes** (`OWNER-ACTIONS.md:52-59`):
   ```powershell
   $artifacts = @("dist-apk\LuckyCatHSK-1.0.0.apk", "dist-apk\LuckyCatHSK-1.0.0.aab")
   Get-Item $artifacts | Select-Object FullName,Length,LastWriteTime
   Get-FileHash $artifacts -Algorithm SHA256
   ```
10. **Verify the signature:**
    ```powershell
    apksigner verify --print-certs dist-apk\LuckyCatHSK-1.0.0.apk
    ```
    Expect `CN=NorthBear` (the cert predates the Lucky Cat rename; per
    `ANDROID_BUILD.md:87-89` this must **never change** without re-signing
    under a new keystore, which breaks update continuity for existing
    installs).
11. **Repeat the accepted emulator/physical-device matrix** listed in
    `OWNER-ACTIONS.md:61-66` (cold launch, Home/Profile, player-avatar state,
    name persistence, HSK1-first welcome, bounded/resumable Cards, every
    question format, pause focus/return, notification permission
    requestability, portrait/landscape, launcher/splash branding, offline
    mode, final empty scan for fatal Android/WebView errors). Real IAP is
    expected to stay hidden since `REVENUECAT_ANDROID_PUBLIC_KEY` is blank
    (`src/monetization/revenuecat-config.js:9`).
12. Only once that matrix passes is the AAB ready to upload to Play Console
    (§3 onward stay manual owner steps — not part of this build checklist).

---

## 3. Play Store listing draft

Grounded in `index.html` (`<title>Lucky Cat HSK 招财猫</title>` —
`index.html:9`), `src/i18n.js` howto copy (`:346-357`), and the differentiator
recorded in project memory (`product-core-concept`): the vocabulary is
**ranked by real-exam frequency**, not the flat official HSK list — this is
the thing to lead with, it's the actual product edge.

### Title (≤30 chars)

```
Lucky Cat HSK 招财猫
```
17 characters. Matches the in-app `<title>` exactly (`index.html:9`) —
recommend keeping the two in sync rather than inventing separate branding.

### Short description (≤80 chars)

```
HSK vocab arcade: words ranked by real exam frequency. EN/TH, offline.
```
70 characters.

### Full description (≤4000 chars)

```
Lucky Cat HSK is a Chinese vocabulary arcade game for HSK 1–6 learners, with
full English and Thai support.

WHY THESE WORDS
Most HSK apps teach the official wordlist as a flat list. Lucky Cat HSK is
different: every word's priority is ranked by how often it actually appears
in real HSK mock exams, not just whether it's on the official syllabus. You
spend your study time on the words that genuinely show up on the test first.

HOW YOU PLAY
Follow Lucky Cat along the Lantern Trail. Each stop presents a Chinese word
with pinyin — choose the correct meaning, and consecutive first-try answers
build your Lucky Flow streak. Miss one and the answer is revealed immediately;
the word goes into your Review Pouch so it comes back until you've learned it.
Every tenth word becomes a two-step Review Challenge: meaning first, then
recall it in reverse. Finish a session's planned words to get a results
postcard with what you learned, extra practice recommendations, rewards, and
your next review time.

Prefer to study before you play? Learn mode drills the same word pool as
flashcards, so you can review first and test yourself after. Every word can
be heard aloud, in the Word Quest, on flashcards, and during review.

BUILT FOR THE LONG HAUL
- Spaced-repetition-aware review: words you're weak on come back sooner.
- Daily quests, a streak system with streak-freeze protection, and a growing
  home street you decorate as you level up.
- HSK 1 through 6 vocabulary, with tests-appeared frequency and core-tier
  data behind every word.
- Bilingual throughout: full English and Thai translations and UI.

PLAY OFFLINE, ANYTIME
Lucky Cat HSK works fully offline once installed — vocabulary and audio are
bundled with the app, no connection required to study.

NO ADS, NO PRESSURE
The app currently ships with no ads. Progress can be kept entirely on your
device as a guest, or optionally backed up to the cloud if you choose to sign
in — that choice is always yours.

Some example sentences are sourced from Tatoeba (tatoeba.org), CC-BY 2.0 FR.
```
~2,020 characters — well under the 4,000 limit, leaving room for the owner to
add screenshots-driven copy or seasonal promotion text later.

**OWNER CONFIRM:** the "NO ADS, NO PRESSURE" paragraph states current reality
(`src/monetization/interstitial-policy.js` is pure gating logic with no AdMob
SDK wired — no ads dependency exists in `package.json`). If ads ship before
this listing goes live, rewrite that paragraph — don't leave it claiming
"no ads" against a build that shows them (this would violate Play's
truthful-listing policy, and `OWNER-ACTIONS.md:161-164` already warns not to
declare behavior that isn't in the uploaded build).

### Category

**Education.** (Google Play's own top-level category for language-learning
apps; no repo source dictates this — it's the obvious fit for a vocabulary
trainer and matches how HSK/Duolingo-style apps are typically listed.)

### Content rating (IARC questionnaire) — pointers only

Google Play's content rating is generated from Google's own IARC
questionnaire inside Play Console, not something this doc can fill in for the
owner. Based on what the app actually does:
- No violence, gore, profanity, gambling, or user-generated content exposed to
  other users (single-player; account features are cloud-*save*, not
  social/chat — confirmed via `src/account.js`, `src/cloud.js`: no
  messaging/sharing surface between users found in `src/`).
- No alcohol/drug/sexual content.
- Contains: in-app account creation (email OTP / anonymous), which the
  questionnaire may ask about under "data collection" / "account creation"
  toggles, separate from content maturity.
- Likely lands at the lowest tier (e.g. "Everyone" / IARC 3+), but **OWNER
  CONFIRM by actually running the Play Console questionnaire** — this doc
  cannot submit answers on the owner's behalf and Google's exact question
  wording/branching isn't reproducible outside the Console.

**OWNER CONFIRM:** target-audience age setting (`OWNER-ACTIONS.md:173` flags
this as a required decision). Note the privacy policy already states a
**13+** general-audience positioning (`docs/legal/privacy-policy.md:114-118`,
§5 "Children") — keep the Play target-audience answer consistent with that
stated policy, since a mismatch (e.g. selecting "Designed for children")
would contradict both the privacy policy and the account/email sign-in flow,
which isn't appropriate for a "designed for children" listing.

---

## 4. Data Safety form answers

Grounded in code, not assumption. Two existing repo docs already did most of
this verification and their conclusions are reused, not re-derived from
scratch, where they're still accurate against the current build:
`docs/legal/data-safety-analytics.md` (analytics-specific) and
`docs/legal/privacy-policy.md` (broader §2 data inventory).

**Scope check — what's actually live in the build you're about to upload:**

| Feature | Live in current build? | Evidence |
|---|---|---|
| Guest/local play (no account, never taps "Connect") | Yes, default — **verified no network** | `docs/legal/privacy-policy.md:31-34`; `src/cloud.js:1-7` comment: "Nothing here runs at module eval; the client is created on first use from the Account screen, so boot and file:// stay network-pure"; confirmed no boot/init call site — `ensureGuest`/`signInAnonymously` are only reachable via the "Connect" button (`src/main.js:651` `accountBtn(t("account.connect"), onAccountConnect)`, rendered only when the user opens the Account tab, `index.html:1338` `data-go="account"`) or a live purchase attempt (both require explicit user action; purchase is currently dark, see below) |
| "Connect" (anonymous cloud account, no email required) | **Yes, live — user-initiated only** | `src/main.js:787-790` `onAccountConnect()` → `ensureGuest()` → `src/cloud.js:54-63` calls `auth.signInAnonymously()` on first connect, creating a server-side anonymous user id, **then immediately syncs local gameplay progress to the cloud** via `syncEdge("sign-in")` → `reconcile()` |
| Email OTP sign-in (upgrades the anonymous connection to an email-linked account) | **Yes, live — user-initiated only** | `src/account.js`, `src/cloud.js` OTP flow (`sendCode`/`verifyCode`) |
| Optional analytics (opt-in toggle) | Code shipped, **off by default**, and the server-side events table is not yet applied in production | `src/analytics/consent.js:3` (`KEY` default `false`); `docs/STATUS.md:92-94`: "no production analytics pipeline exists"; `docs/legal/data-safety-analytics.md:58-59` gates applying the table on this form being approved first |
| In-app purchases (RevenueCat) | **Dark** — public SDK key blank, purchase UI does not surface | `src/monetization/revenuecat-config.js:9` (`REVENUECAT_ANDROID_PUBLIC_KEY = ""`) |
| Ads (AdMob) | **Not implemented** — no ad SDK dependency exists | `package.json` dependencies (no `admob`/ads package); `src/monetization/interstitial-policy.js` is pure gating logic only, SDK-independent by its own comment (`:7-9`) |
| Geolocation / camera / contacts / health / microphone | **Not implemented** | no matches for any of these APIs anywhere in `src/` |

Because analytics is opt-in-and-off-by-default (and its backend table isn't
even live yet) and purchases/ads are fully dark, **the only genuinely-live
data collection in this build is the optional cloud-connect path** — and it
is genuinely optional: verified above that no network call happens until the
user explicitly taps "Connect" on the Account screen (not automatically at
boot, not automatically at first launch). Once tapped, though, it does more
than create an id — it's a one-tap action that both (a) creates a
server-side account (anonymous at minimum, no email required) and (b) syncs
local gameplay progress to the cloud in the same flow. Treat "guest play" and
"tapped Connect" as the two states to declare, not "signed in" vs. "not" —
the anonymous-Connect state is the one easy to under-declare since it doesn't
require an email and could be mistaken for still being "just a guest."
Answer the form for what this specific AAB does, not for the eventual
fully-monetized product — re-run this section when RevenueCat/ads/analytics
go live, since each of those changes the correct answers.

### Does your app collect or share any of the required user data types?

**Yes** (only for users who tap "Connect" on the Account screen — this
includes the no-email anonymous-cloud state, not just email sign-in; a user
who never opens Account/never taps Connect transmits nothing).

| Data type (Play category) | Collected? | Shared? | Optional? | Purpose | Evidence |
|---|---|---|---|---|---|
| **Personal info → Email address** | Yes | No | Yes — only if the user additionally adds an email (a further, separate step after Connect) | Account functionality (cloud save/sync, cross-device) | `docs/legal/privacy-policy.md:37-38`; `src/account.js`/`src/cloud.js` email-OTP flow (`sendCode`/`verifyCode`) |
| **Personal info → User IDs** | Yes | No | Yes — created the moment the user taps "Connect," before any email is entered | Account functionality | `src/cloud.js:54-63` `ensureGuest()`/`signInAnonymously()`; `src/account.js:9-12` (`accountState` distinguishes anon/signedIn) |
| **Personal info → Name** | Yes (display name only, self-chosen, not real-name verified) | No | Yes | Account functionality / personalization | `docs/legal/privacy-policy.md:39` "Display name and language preference" |
| **App activity → App interactions / in-app user progress** (mastery, XP, daily/monthly quest state, wallet/coin balance, freezes, shop, stickers, best scores) | **Yes** — synced the moment "Connect" is tapped, same action that creates the user id | No | Yes — tied to the same Connect action | `src/merge.js:11-12` `SYNC_KEYS = ["mastery","xp","daily","quests","monthly","wallet","freezes","shop","stickers","best"]`; `src/main.js:787-790` `onAccountConnect()` → `syncEdge("sign-in")` → `reconcile()`; `docs/legal/privacy-policy.md:40-41` §2b "mirrored to the cloud so they survive reinstalls and sync across your devices" — map to Play's precise "App activity" sub-bucket (App interactions / other user-generated content / other actions) inside Play Console's own taxonomy list, this doc can only point at the right row |
| **App activity → App interactions** (session/funnel analytics events) | Yes* | No | Yes, opt-in, off by default | Analytics | `src/analytics/consent.js`, `docs/legal/data-safety-analytics.md:29-46` |
| **App info & performance → Diagnostics** | Yes* | No | Yes, opt-in | Analytics | same as above |
| **Device or other IDs** (app-generated `anon_id`, not a hardware/ad ID) | Yes* | No | Yes, opt-in | Analytics | `src/analytics/identity.js:1-4` ("never a device/ad id") |
| **Financial info → Purchase history** | **No** (in this build) | No | — | — | `src/monetization/revenuecat-config.js:9` — public key blank, no purchase flow reachable |
| **Location** (any precision) | No | No | — | — | no geolocation API in `src/` |
| **Photos/videos, audio files, contacts, calendar, health/fitness** | No | No | — | — | no matching APIs in `src/` |

\* Analytics rows: technically true of the *code*, but functionally inert
right now since (a) the toggle defaults off and (b) per `docs/STATUS.md:92-94`
no production pipeline/table exists to receive events yet even if a user
opts in. **OWNER CONFIRM:** whether to declare these rows now (conservative —
matches what the code is *capable* of and avoids re-submitting the form
later) or omit them until the events table is actually applied and this v85
AAB doesn't include a reachable opt-in UI path for it. Recommend declaring
them now, since Play's guidance is to declare what the code can do, not
just what has been exercised in production, and this build does ship the
consent toggle UI. `docs/legal/data-safety-analytics.md:55-61` has a
pre-submission checklist for exactly this — read it before finalizing this
section of the form.

**Per-type follow-ups** (matches `docs/legal/data-safety-analytics.md:43-49`
methodology, applied to the personal-info rows too):
- **Collected or shared?** → Collected only. Supabase is a data
  *processor* acting on the app's behalf (Row-Level Security scoped per user
  — `docs/legal/privacy-policy.md:154-157`), not a third party the data is
  *shared* with in Play's sense.
- **Processed ephemerally?** → No — account/profile data persists in
  Supabase for as long as the account is active (`docs/legal/privacy-policy.md:138-141`, §7 Retention).
  Analytics events, if any, are also stored, not ephemeral.
- **Required or optional?** → Optional — all of it is behind explicit user
  choice (tapping "Connect," separately adding an email, or enabling
  analytics). Never opening the Account screen needs none of it — that is
  the only truly zero-network path (see the verified boot-trigger check
  above; "Connect" itself is one tap, no email required, so don't conflate
  "optional" with "requires signing in with an email").
- **Encrypted in transit?** → Yes (HTTPS/TLS to Supabase).
- **Can users request deletion?** → Yes — in-app **Settings → Sign
  out** stops sync immediately; email-signed-in users get **Settings →
  Account → Delete account** (two-step confirm), or email
  `sarach.northbear@gmail.com` (`docs/legal/privacy-policy.md:120-134`, §6).
  Note the policy caveats this account-deletion UI is "web/PWA... now; the
  Android app gains it with its next release" (`privacy-policy.md:128-129`) —
  **OWNER CONFIRM: verify the account-deletion UI is actually present and
  reachable in the v85 Android build before answering "yes" to in-app
  deletion in the Data Safety form** — if it's still web-only as of this
  build, the Play answer needs to say deletion is via email/support contact
  instead (email deletion is a universal fallback and still satisfies the
  form, per policy §6, but the in-app method must not be claimed if it isn't
  there).

### Not collected / not shared — explicitly answer No

Financial info (in this build), precise/coarse location, contacts, messages,
photos/videos, audio recordings, health/fitness, calendar, and the user's
actual learning content/answers (`docs/legal/privacy-policy.md:22-23,77-78`
"we do not collect contacts, precise location, photos, microphone, or health
data").

### Security practices section

- **Data encrypted in transit** → Yes.
- **Data encrypted at rest** → Supabase-managed (Postgres w/ RLS); OWNER
  CONFIRM the exact at-rest encryption attestation Supabase provides, since
  this repo doesn't document Supabase's own infra guarantees — check
  Supabase's compliance page rather than guessing.
- **Users can request data deletion** → Yes (see above).
- **Committed to Play Families Policy?** → **N/A / No** — this app is not
  targeted at children (`docs/legal/privacy-policy.md:114-118`, §5), don't opt
  into the Families program.

### Independent security review

**OWNER CONFIRM:** Play asks whether the app has had an independent security
review. Nothing in the repo indicates one has been commissioned — answer
"No" unless the owner has separately arranged one.

---

## Summary of every OWNER CONFIRM raised above

1. §1 — confirm the `versionCode`/`versionName` scheme for this build
   (recommended: `versionCode 85`, `versionName "85.0.0"`) and whether to
   update `docs/build/ANDROID_BUILD.md`'s "already correct" note once decided.
2. §3 — confirm the "NO ADS, NO PRESSURE" listing paragraph still matches
   reality at submission time (rewrite if ads ship first).
3. §3 — run the actual Play Console IARC content-rating questionnaire; this
   doc can only predict the likely outcome, not answer it.
4. §3 — confirm the Play target-audience age setting is kept consistent with
   the privacy policy's stated 13+ general-audience positioning.
5. §4 — confirm whether to declare the opt-in analytics Data Safety rows now
   (code exists, toggle ships, but no production events table is applied
   yet) versus deferring until the pipeline is actually live.
6. §4 — verify whether in-app account deletion is reachable in the v85
   **Android** build specifically (policy text says it's web/PWA now, Android
   "with its next release") before answering the in-app-deletion question.
7. §4 — confirm Supabase's at-rest encryption attestation directly from
   Supabase's own documentation for the security-practices section.
8. §4 — confirm whether an independent security review has been
   commissioned (default answer "No" absent other information).
9. §4 — map the "learning progress / wallet / entitlements sync" row (fires
   on the "Connect" tap, before any email is entered — verified via
   `src/main.js:787-790` and `src/merge.js:11-12`) to Play Console's exact
   "App activity" sub-category from its own taxonomy list; this doc
   identifies *that* it must be declared and *why*, but the Play Console UI's
   specific sub-bucket wording isn't reproducible outside the Console.
