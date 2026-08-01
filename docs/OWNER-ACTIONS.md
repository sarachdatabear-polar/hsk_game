# Owner actions

The **v142** release is on `main` and deployed to the web/PWA at **https://luckycathsk.com** (and still at github.io during the migration). Since the last
revision of this doc six releases have shipped: **v137** Stripe PromptPay web
billing (dark) + two accessibility fixes, **v138** guided first quest and
supporter sheet, **v139** profile and friend progress UX, **v140** regenerated
Lucky Cat profile art, **v141** the cache bump carrying the billing +
canonical-origin-gate work, and **v142** button clarity and navigation (centered
wrapping labels, distinct semantic icons for previously-duplicated actions, and
Home **Flashcards** now opening the current Cards deck directly).

Earlier context still worth carrying: **v135 retired the Street surface
entirely** (11 modules / ~2,700 LOC, 44 assets, 159 i18n keys × 2 locales, and
the 15 decoration catalog entries deleted; `features.catJourney` collapsed —
Cat Journey is now the only screen). Today's Picks shows three obtainable Word
Quest cosmetics, Profile counts 20 reusable cosmetics, Cat Journey links
directly to customization, and new-sticker Results feedback opens the Album.

The remaining gates are the quick on-device checks (§A), the web
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

- Current committed/deployed source: `main` == `development` ==
  **`288e9c05`** (v142, button clarity and navigation); service-worker cache
  version **`v142`**, live on **both** `luckycathsk.com` and `github.io`.
  Live-verified 2026-08-01: `https://luckycathsk.com/sw.js` serves
  `CACHE_VERSION = "v142"`. Both working trees are clean and there are no open
  PRs.
- Recorded release gates at the v142 cut: **111 files / 9,662 tests**, ESLint,
  production build, asset validation, and `git diff --check` all green; CI run
  **30697291296**, Pages deploy **30697325515**, Cloudflare deploy
  **30697325514**. Focused live-DOM verification passed 4/4 (EN + TH at 320×568
  and 844×390). Re-run on the VPS 2026-08-01: **111 files / 9,662 tests
  passed.**
  > **⚠ THE FULL ART-HEAVY RESPONSIVE MATRIX WAS NOT RE-RUN AT v142.** It could
  > not finish on the VPS — unrelated Windows EdgeWebView2/MetaTrader processes
  > were consuming most of the 8 GB host RAM and Chromium targets crashed at
  > battle. **Do not kill those trading processes.** The matrix had passed
  > immediately before the v142 changes, and the changed surfaces passed the
  > focused browser gate above.
- Precache headroom (**measured at v136, not re-measured since**): 10,056,341 of
  the 11,010,048 B cap — **931 KB free**, up from ~36 KB, because the Street
  retirement shrank `dist/app.js` and dropped 3 dead precached assets. This is
  what unblocks the 11 pending keepsake bitmaps. Six releases have landed since,
  so re-measure before relying on the exact figure.
- **⚠ THERE IS NO ROLLBACK FLAG FOR CAT JOURNEY ANY MORE.** `features.catJourney`
  was deleted in v135. If Cat Journey is wrong on a device, the rollback is
  **revert the release merge on `main` + a SHELL v137 bump** — not a
  `localStorage` toggle. The old
  `localStorage.setItem("nbhsk.features.catJourney","false")` recipe is dead;
  it will do nothing.
- **The cloud-sync flag is a different flag and it survived.**
  `CAT_JOURNEY_CLOUD_ENABLED` lives in `src/cloud-config.js` (still `true`) and
  gates only whether `catJourney` is a synced key — see §0.
- Latest signed artifact remains Profile v74; **no v127–v142 APK/AAB exists
  yet** — the Android track is ~68 shell versions behind the web.
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

**The sweep shipped as v136 on 2026-07-31** (prod has since advanced to v142 —
the verification figures in this section are the v136 record, kept as the
evidence that the sweep landed). Merge `335f24c2` on `main`; runs
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

   ~~**⚠ NEW AND BLOCKING (2026-08-01): create `support@luckycathsk.com`.**~~
   **— DONE 2026-08-01.** Cloudflare Email Routing enabled; MX
   (`route1/2/3.mx.cloudflare.net`), SPF and DKIM verified from the VPS, and a
   test message confirmed received in Gmail. v143 shipped on the strength of
   it. **⚠ EMAIL ROUTING IS INBOUND ONLY** — you can receive at `support@` but
   cannot reply *as* it; that needs the separate **Email Sending** beta
   (Workers Paid, SMTP `smtps://smtp.mx.cloudflare.net:465`) wired into Gmail's
   "Send mail as". Until then replies go out from the personal Gmail, which is
   acceptable but means the buyer sees a different address than they wrote to.
   *(Original instructions, kept because they are how you re-do this:)*
   The Terms of Service, Refund Policy and Privacy Policy all now publish that
   address, and Stripe shows the support contact to every buyer on receipts.
   **It does not exist yet**, so the v143 legal-pages release MUST NOT ship
   until it routes — publishing a dead support address is worse than the
   personal Gmail it replaced. Fix: Cloudflare dashboard → **Email → Email
   Routing** → enable, add a custom address `support@luckycathsk.com`
   forwarding to your Gmail, and confirm the verification mail Cloudflare sends
   to the destination. Free, ~2 minutes, same dashboard as the `www` item
   below. Reply to a test message once before release so the forward is proven
   in both directions.

   **TWO GAPS FOUND DURING VERIFICATION — BOTH NOW CLOSED (2026-08-01):**
   - ~~**`www.luckycathsk.com` does not resolve**~~ **— DONE, verified
     2026-08-01.** Proxied `CNAME www → luckycathsk.com` plus a wildcard single
     redirect rule (`https://www.luckycathsk.com/*` → `https://luckycathsk.com/${1}`,
     301, preserve query string). Verified end-to-end: every www URL lands 200
     on the apex, path and query string preserved, `http://www` upgraded first;
     apex unchanged (200, v143, `dist/app.js` sha `c0fc449d…`).
     **⚠ DELIBERATELY A REDIRECT, NOT A SECOND WORKER CUSTOM DOMAIN.** The doc
     used to present those as equivalent. They are not: attaching `www` to the
     Worker would serve the real app on two origins, and the browser gives each
     origin its own `localStorage` — so the same person would get two separate
     profiles, streaks, wallets and journey states depending on how they typed
     the URL. It would also mean a second service-worker registration to
     version. The canonical tag already points at the apex; `www` has no reason
     to serve anything.
     **Two traps hit while doing this, recorded so the next person doesn't:**
     (1) the redirect rule's **Target URL must NOT contain `www`** — entering
     `https://www.luckycathsk.com/${1}` makes www redirect to itself, an
     infinite loop (caught live; apex was unaffected throughout). (2) After
     redeploying the fix, edge nodes disagreed for ~15s — some URLs correct,
     others still looping. **Poll until consistent; do not diagnose a second
     config error from a single stale reading.**
   - ~~**Plain `http://luckycathsk.com` serves content instead of redirecting to
     HTTPS**~~ **— DONE, verified 2026-08-01.** `http://luckycathsk.com` now
     returns **301 → `https://luckycathsk.com/`**; Always Use HTTPS is on.
     **Nothing to do here — do not go looking for the setting.**
     *(Original note, kept for the reasoning: the PWA's service worker requires
     a secure context, and an HTTP surface on the canonical domain is exactly
     the thing the store/legal review will ask about.)*
3. **Upgrade Supabase to Pro** ($25/mo) — plan step 5, immediately **before**
   the billing key flip (step 6), **not before that**. Nothing in steps 1–4
   needs it; buying early just starts the meter. The free tier is fine until
   real money is in play (it lacks backups and auto-pauses, which is only
   unacceptable once paid users exist).
4. **Direct Stripe PromptPay go-live** (plan step 6 — replaces the RC Web
   Billing approach above; RC Web Billing cannot carry PromptPay, see the
   preamble):
   0. ~~**Confirm `grant_purchase` is already applied**~~ **— DONE
      2026-07-31. The migration is APPLIED to the live project
      (`eqsodiufgjecoqgxdisn`) and verified, not assumed.**
      `docs/supabase/migrations/2026-07-12-iap-golive.sql` was run via the
      Supabase Management API. Post-apply verification, each queried
      directly:
      - `grant_purchase(p_user_id uuid, p_delta integer, p_reason text,
        p_event_id text, p_order_id text, p_entitlement text)` — exists.
      - `increment_wallet` (the superseded two-write design) — absent.
      - `ledger.event_id` and `ledger.order_id` — both present, type text.
      - `ledger_event_id_uidx` / `ledger_order_id_uidx` — both present.
        These are what make the webhook replay return `{"duplicate":true}`.
      - EXECUTE granted to `service_role` only; `public`/`anon`/
        `authenticated` revoked. Clients cannot call it.
      - `wallet_guard` — replaced, so a service-role purchase grant now
        bypasses the 25,000/day earn clamp.
      **Also smoke-tested against the live DB, zero residue:**
      `grant_purchase` with a non-existent user id returned `unknown-user`
      (the `foreign_key_violation` branch) and wrote no ledger row — so the
      function body really executes and its deleted-account path is real,
      not just declared.
      **NOT yet exercised live:** the `granted` and `duplicate` branches, a
      real wallet increment, and the entitlement upsert. Those need a real
      user row and are covered by the live gate below.

      *Original instructions, kept because they are how you re-check this
      against any other project or after any DB restore:*
      Both edge functions grant by calling
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
      **✅ PASSED 2026-08-01 — the external clock is CLEARED.** Submitted with
      `sarach.northbear@gmail.com` as the contact, not
      `support@luckycathsk.com`, so Stripe's public support contact and the
      v143 legal pages currently disagree. Reconcile by creating the address
      and then editing Stripe's **public/support** details — the legal entity
      and country are locked after activation, public business info is not.
      **What this unlocks, in order:** live keys → a **LIVE webhook endpoint**
      (test-mode endpoints and their `whsec_` do NOT carry over; create a fresh
      one on the same three `checkout.session.*` events and take its new
      signing secret) → confirm **PromptPay reads active in LIVE mode**, not
      pending → Supabase Pro → `STRIPE_CHECKOUT_URL` → the live gate in §6.
      *(Historical, kept because it is what the form needed:)*
      Reference values, taken from the shipped files rather than guessed:
      legal name/address per the privacy policy (**Sarach Sriklab, Bangkok
      10400, Thailand**) but **the Thai ID wins if they differ**, and Stripe
      also wants the name in Thai script; website `https://luckycathsk.com`;
      support `support@luckycathsk.com`; statement descriptor `LUCKYCATHSK`;
      Supporter price **฿79 / 2,000 coins** (`src/monetization/products.js:11`,
      matching the `7900 thb` the rehearsal actually created).
      **⚠ COUNTRY IS IRREVERSIBLE** — Stripe: *"After activating a Stripe
      service on a live account, you can't change the business origin
      country."* PromptPay requires a Thai account, so confirm it reads
      Thailand before submitting.
      **Business type: Individual / sole proprietor**, unless a registered Thai
      company genuinely exists — the company path needs a DBD affidavit
      (หนังสือรับรองนิติบุคคล) issued within the last 6 months. Individuals
      need the Thai national ID (บัตรประจำตัวประชาชน): legal name in Thai
      script, the 13-digit ID number, and **the laser code from the back of the
      card**, on an image carrying no signatures or annotations.
      **The site the reviewer will visit is now covered** — Terms, Refund and
      Privacy pages all ship in v143, and the privacy policy no longer names
      the wrong payment processor. ✅ **v143 SHIPPED 2026-08-01**, and
      `support@luckycathsk.com` routes to Gmail, so that gate is cleared.
      **➤ STEP 1b (do now — it is free, reversible, and buyer-facing):
      reconcile Stripe's public details with the shipped site.** Dashboard →
      **Settings** (gear, top right) → **Business** → **Public details**. These
      are editable after activation — the legal entity and country are not.
      Set all four; three of them are what a buyer sees, and the fourth is what
      they see on their bank statement:
      - **Customer support email → `support@luckycathsk.com`.** Stripe prints
        this on every receipt. It currently reads `sarach.northbear@gmail.com`,
        which disagrees with all three v143 legal pages.
      - **Business website → `https://luckycathsk.com`** (apex, no `www` — www
        is a redirect, not an origin).
      - **Statement descriptor → `LUCKYCATHSK`.** 5–22 chars, ≥5 letters, no
        `< > \ ' " *`. **Do not leave this as the default.** An unrecognisable
        line on a Thai bank statement is the single most common cause of a
        "I don't recognise this charge" dispute, and disputes cost the fee plus
        the goods whether or not you win them.
      - **Shortened descriptor → `LUCKYCAT`** (≤10 chars) if Stripe asks; some
        Thai card networks truncate to the short form.

      While in Settings, two more that cost a minute each and both face the
      buyer directly:
      - **Branding** (Settings → Business → Branding): the icon and accent
        colour render on the **hosted Checkout page**. Checkout is the one
        screen between wanting the game and paying for it, and by default it is
        an unbranded Stripe page — which reads as "is this a real store?" to
        someone about to send ฿79 by PromptPay.
      - **Customer emails** (Settings → Business → Customer emails): confirm
        **"Successful payments"** is ON so buyers actually receive a receipt.
        A receipt is the buyer's proof, and it is also the first thing you will
        ask them to forward when something goes wrong.
   2. In the Stripe Dashboard → **Payment methods**, enable **PromptPay**.
   3. Create the **webhook endpoint** — Stripe Dashboard → **Developers →
      Webhooks → Add endpoint** — pointed at
      `https://<project>.supabase.co/functions/v1/stripe-webhook`, subscribed
      to `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, and
      `checkout.session.async_payment_failed`; copy its `whsec_…` signing
      secret.
   4. **The two functions are ALREADY DEPLOYED with the correct JWT
      asymmetry (2026-07-31) — `stripe-checkout` `verify_jwt=true`,
      `stripe-webhook` `verify_jwt=false`, both `ACTIVE`, confirmed from
      the Management API rather than from the deploy output.** They are
      inert: no secrets, so both fail closed, and nothing can reach them
      while `STRIPE_CHECKOUT_URL` is blank. Smoke-tested live — a JWT-less
      POST to the webhook returns the *function's own* 503, proving
      `--no-verify-jwt` took, and the checkout's CORS preflight returns
      200 through the JWT-ON gateway. Details in
      `docs/supabase/README.md` §Stripe deployment prerequisites.
      **So what is left here is only the secrets** — set
      `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
      (`supabase secrets set …`, or Dashboard → Edge Functions → Secrets).
      **Setting a secret is expected to be enough on its own** — the
      functions read them through `Deno.env.get()` per request, so no
      re-deploy should be needed. **This was NOT tested**, so treat it as
      expected rather than known.
      **⚠ IF YOU DO RE-DEPLOY, THE WEBHOOK MUST KEEP `--no-verify-jwt`.**
      The flag is per-deploy, not sticky. A re-deploy that omits it
      silently flips `verify_jwt` back to true and every real Stripe
      delivery 401s *after* the buyer has paid. Prefer setting the secret
      and NOT re-deploying; if you must, re-check with the API
      (`GET /v1/projects/<ref>/functions`) rather than trusting the deploy
      output.
      **After the secrets are set, re-run the fail-closed probe** — a
      JWT-less `POST` to `stripe-webhook` with a junk body. It should now
      return **401** (the function's own signature rejection), **not** 503.
      A 503 means a secret did not take; a **gateway** 401 (a JSON
      `{"code":…,"message":…}` body rather than the function's plain
      `unauthorized`) means `verify_jwt` got flipped back on.
      *Original instructions, kept because they are how you re-check the
      asymmetry after any re-deploy:* set both Supabase function secrets —
      `STRIPE_SECRET_KEY` and
      `STRIPE_WEBHOOK_SECRET` — and deploy the two functions with the
      **opposite JWT settings** documented in `docs/supabase/README.md`
      §Stripe deployment prerequisites: `stripe-webhook` deploys
      **`--no-verify-jwt`** (Stripe sends no Supabase JWT — skipping this
      flag means every real delivery 401s, silently, after the buyer's money
      has already left their account), `stripe-checkout` deploys **normally**
      (it authenticates the caller itself).
   4.5 ✅ **DONE 2026-07-31 — THE TEST-MODE REHEARSAL WAS RUN AND IT PAID
      FOR ITSELF.** Executed from `http://localhost:8000` over an SSH
      tunnel, against Stripe test mode, with a real PromptPay checkout.
      **PASSED:** session creation with `amount_total 7900` / `currency
      thb` / `payment_method_types ["promptpay","card"]` /
      `client_reference_id` / `metadata.product_id` all correct at
      Stripe; signature verification accepting a real signature AND
      rejecting unsigned + bad-signed bodies; `grant_purchase`'s
      `granted` branch writing ledger + wallet + entitlement atomically;
      and the **replay dedupe** — the same event resent granted exactly
      once (1 ledger row, +2000, 1 entitlement).
      **Not exercised — but the gap turned out to be a non-gap:**
      test-mode PromptPay settled **synchronously**, so the grant rode a
      `checkout.session.completed` that already carried
      `payment_status: "paid"`, and neither the `{"ignored":"not-paid"}`
      branch nor `async_payment_succeeded` ever ran.
      **⚠ THIS WAS ORIGINALLY WRITTEN AS "exactly what a real Thai buyer
      scanning a QR will hit." THAT WAS WRONG — corrected 2026-08-01.**
      Direct measurement plus Stripe's own docs (PromptPay is classified
      **"Real-time payments"**, not delayed-notification) establish that
      PromptPay-on-Checkout does not produce the two-event async pattern
      at all: the session stays `open`/`unpaid` and emits no
      `checkout.session.completed` until the money has actually arrived.
      Full evidence in the §6 live-gate bullet below. So the synchronous
      test-mode run **is** representative of the real buyer's path, and
      those two branches are dead code rather than an untested risk.
      Still genuinely unexercised: the card leg, an abandoned checkout,
      and the client-side return leg (`SITE_ORIGIN` is pinned to the
      canonical domain, so a localhost rehearsal cannot receive its own
      return).
      **IT CAUGHT A LAUNCH-BLOCKING BUG.** The supporter sheet's checkout
      button could never start a purchase — the sheet disabled the button
      before awaiting its handler and `iapBuy` refused already-disabled
      buttons. Silent: no fetch, no toast, no console error. It was live
      on prod in v140 and unreachable only because billing ships dark, so
      it would have surfaced for the first time at the key flip. Fixed in
      `56b31558` with a regression pin.
      **Test-mode teardown, if you re-run this:** the grant lands in the
      LIVE project on whatever account you sign in with. Use a `+alias`
      email. Cleaning up needs BOTH halves — server (entitlement, ledger
      row, wallet) and the browser's `localStorage`, because the wallet
      merge takes `max(local, cloud)` and the device will otherwise push
      the coins straight back.

      *Original guidance, kept because it is how you re-run this:*
      **rehearse the whole gate in Stripe TEST
      MODE first, while verification is still pending.** Stripe issues
      `sk_test_…` keys the moment the account exists, before verification
      completes, and test mode has its own webhook endpoints and its own
      `whsec_…`. So the entire money path can be exercised with fake money
      *now*, on the external clock's own time.
      **This is the single biggest de-risk available**, because the two edge
      functions have never run anywhere: Deno TS does not run under vitest
      and `eslint.config.mjs` ignores `supabase/`. Their `core.js` halves are
      well tested; their `index.ts` wrappers, the Supabase gateway's JWT
      behaviour, the CORS preflight, the bundler's parent-directory import,
      and the real `grant_purchase` round-trip are not.
      **Run it against a LOCAL build (`npm run serve`, `http://localhost:8000`)
      — not the live site.** `isReturnableOrigin` allows localhost precisely
      so this rehearsal is possible. Set the test keys as the function
      secrets, point a test-mode webhook endpoint at the same function URL,
      and fill the two config keys **in your working tree only**.
      **⚠ DO NOT COMMIT TEST-MODE KEYS.** Committing them ships a live
      purchase surface on a public domain that takes fake money — strictly
      worse than shipping dark.
      **What a test-mode pass actually buys you:** the card leg, the replay
      dedupe (`{"duplicate":true}`), the abandoned-checkout leg, the
      signature verification, the `unpaid` ignore branch, and a real
      `granted` return from `grant_purchase` with a real wallet increment
      and entitlement upsert. That is the bulk of the untested surface.
      **What it does not buy you:** proof that PromptPay works. Check
      Stripe test mode → **Payment methods** and confirm PromptPay reads
      **enabled**, not pending — PromptPay capability can stay inactive
      until the account is verified, and `buildSessionParams` hardcodes
      `payment_method_types[0]=promptpay`, so an inactive capability makes
      session creation fail and `stripe-checkout` return a 502
      `stripe-error`. **If PromptPay is not yet available in test mode that
      does NOT block this rehearsal** — run the card leg and get everything
      else proven; confirming PromptPay surfaces and grants is then the only
      thing left for the live gate. *(This line used to say "PromptPay's
      async double-delivery is then the only thing left." There is no async
      double-delivery — see the correction in §6.)*
   5. Fill **`STRIPE_CHECKOUT_URL`** in `src/monetization/stripe-config.js`
      and ship. The client code is already merged dark; a blank
      `STRIPE_CHECKOUT_URL` is a pure no-op.
      **`STRIPE_CHECKOUT_URL` is the ONLY go-live switch** (verified
      2026-07-31). `STRIPE_PUBLISHABLE_KEY` sits in the same file but is
      **read by nothing** — that file is its only mention in `src/` and
      `test/`. Correct for redirect-to-hosted-Checkout: the session is
      created server-side with the SECRET key, so the browser never calls
      Stripe's API. Consequences worth knowing before you touch either:
      filling **only the publishable key turns nothing on**, and filling
      **only the checkout URL turns billing fully on**. Set the publishable
      key if you like (it is safe to commit) but do not read it as a second
      safety catch. Never commit the secret key.
   6. **Live gate — do all four checks below before advertising the 79฿
      price** (the fifth bullet is a diagnosis hint, not a fifth check),
      because
      neither edge function can be unit-tested (Deno TS does not run under
      vitest and `eslint.config.mjs` ignores `supabase/`) — this is the only
      verification they get before real money moves through them.
      **Run this entire gate from `https://luckycathsk.com` only — not the
      `github.io` bridge, not `workers.dev`.** `stripe-checkout`'s
      `SITE_ORIGIN` is hard-coded to the canonical domain (see
      `docs/supabase/README.md` §Stripe deployment prerequisites), so a
      purchase started from either other host still gets charged and
      granted correctly, but returns the buyer to a *different* origin with
      no local pending record — no toast, no visible entitlement, looking
      broken even though nothing was lost. Starting the test from the wrong
      origin will make a working feature look broken.
      - **One real PromptPay checkout** — confirm PromptPay actually
        surfaces at Stripe Checkout for a THB one-time purchase.
        **EXPECT ONE webhook delivery, not two — and do not read the
        success page as a pass.**
        > **⚠ CORRECTED 2026-08-01. This bullet previously said PromptPay
        > settles asynchronously, that `checkout.session.completed` arrives
        > `payment_status: "unpaid"`, and that the grant rides a later
        > `checkout.session.async_payment_succeeded`. That is WRONG for this
        > integration, and following it means waiting for a second delivery
        > that never fires and scoring a correct pass as a failure.**
        >
        > **Measured** (2026-07-31, a real test-mode PromptPay session driven
        > to the QR screen on a throwaway anon uid): while the QR was
        > displayed and unpaid, Stripe emitted only `payment_intent.created`
        > and `payment_intent.requires_action` — **no
        > `checkout.session.completed` fired at all**, and the session stayed
        > `open`/`unpaid`. Across the account's entire test-mode event
        > history: `checkout.session.completed` ×2, **both already
        > `payment_status: "paid"`**; `async_payment_succeeded` ×0;
        > `async_payment_failed` ×0.
        >
        > **The docs agree, so this is not just an inference:** Stripe
        > classifies PromptPay under **"Payment method family: Real-time
        > payments"**, not delayed-notification. The session simply does not
        > complete until the buyer has actually paid.
        >
        > **Consequence:** `{"ignored":"not-paid"}` and the whole
        > `async_payment_succeeded` branch are dead code on this path. They
        > are harmless defensive handling — do **not** delete them on the
        > strength of this note — but their never firing is the expected
        > result, not a missed delivery.

        **PASS = a single `checkout.session.completed`, already carrying
        `payment_status: "paid"`, returns `{"ok":true}` in the Stripe
        delivery log AND the in-game wallet balance actually increases AND
        Supporter status appears.**
        **⚠ DO NOT DECLARE FAILURE IN THE FIRST FEW MINUTES.** Stripe's
        delivery log **lags by minutes**, so "one synchronous delivery"
        does not mean "instantly visible." If the wallet has not moved,
        check the delivery log for the `completed` event and give it a few
        minutes before concluding the grant failed — log lag is the likely
        cause early on, a genuinely missing grant is not. (The old wording
        implied a wait, so this warning used to be implicit; the corrected
        wording removes it, hence stating it outright.)
        A rendered Stripe success page proves
        only that the buyer paid, not that anything was granted — and
        "paid but not granted" is the one failure that costs real money.
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
      - **If the first checkout's POST never fires at all** (no network
        request, immediate failure before Stripe is ever reached): suspect
        the CORS preflight through the JWT-verification-ON gateway before
        suspecting the function body. `stripe-checkout` deploys with JWT
        verification ON, and the browser's preflight `OPTIONS` carries no
        `Authorization` header; `delete-account` is live precedent that
        Supabase's gateway passes `OPTIONS` through regardless, so this is
        expected to work, but it has not been exercised by a real checkout
        until this gate runs.
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

## 1. Build and accept the current (v142) APK/AAB

**Entry criteria: §0 passed.** Use the current `main` release — **v142,
commit `288e9c05`** — for Android. It passes 111 test files / 9,662 tests,
ESLint, production build, asset validation, and the deterministic EN+TH
viewport/format/accessibility gates. **It has not been signed on Windows.**

> **⚠ PULL `main` BEFORE SIGNING — SIGN v142, NOT v136.** This section used to
> name v136 and that number is now six releases stale; signing it would ship an
> artifact missing v137–v142 (Stripe web billing dark, guided first quest and
> supporter sheet, profile/friend progress UX, regenerated profile art, and the
> button clarity pass). **Whatever `main` is when you sign, verify it — do not
> trust this number either.** Check with `git -C game log -1 --format=%h main`
> and `grep CACHE_VERSION game/sw.js` before building.
>
> **⚠ AND NOT v135 OR EARLIER, EVER.** The go-live URL sweep shipped at v136
> (§B3, merge `335f24c2`), so `REMOTE_AUDIO_BASE` (`src/main.js:1193`) is
> `https://luckycathsk.com/audio/` and that origin is **baked into the APK**.
> An artifact signed from v135 or earlier points at `github.io` forever and
> would be stranded when that host retires at plan step 9. Sign once, from
> current `main`.

**Emulator vs real hardware.** A Google-Play-image emulator runs the signed APK
and covers nearly all of the matrix below. Four things are physically
hardware-bound and must wait for a real phone (see §8): **vibration feel, audio
routing/volume, real notification delivery, and battery/mid-range performance.**
The Android Lens QR scan (§A.2) is also impractical on an emulator.

Pull current `main` (v142, `288e9c05`) onto the Windows release checkout, then open a
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
queue, **670 rows, P0 = 95** (regenerated 2026-08-01), sorted so
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

**⚠ THE SHEET YOU WERE ABOUT TO SEND WAS STALE — FIXED 2026-08-01.** It claimed
a 2026-07-29 regeneration but carried **81 missing keys, 164 dead keys, and
English source text that had since changed**. Worse, all **18 `supporter.*`
keys — the purchase sheet a Thai buyer reads immediately before paying ฿79**
(price, "secure checkout", the benefits being sold, the restore-purchase
promise) — had no priority rule and sat at **P3**, below 180 rows of minor copy.
So did the three v143 legal-policy links. A reviewer would have billed for dead
copy and left the money copy for last.

Both are fixed and, more importantly, **now pinned by
`test/thai-review-sheet.test.js`** — the build fails if the sheet drifts out of
sync with `src/i18n.js`, if a money/account key lands at P3, or if the
reviewer's columns arrive pre-filled. This was the *fourth* time this exact
drift was found by hand (after `cat.*`, `quests.*`, `notify.cat.*`); it should
be the last. **Regenerate with:**
`node docs/i18n/scripts/extract-thai-review-sheet.mjs > docs/i18n/thai-review-sheet.csv`

**Scoping the ask:** the file is sorted by priority, so the P0 block is
**rows 2–96** of the CSV. Commissioning that block alone is a defensible first
engagement — it is the money, account, cloud-backup, notification and legal
copy, and it clears the launch-blocking half of the queue. The remaining 575
rows can follow.

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
