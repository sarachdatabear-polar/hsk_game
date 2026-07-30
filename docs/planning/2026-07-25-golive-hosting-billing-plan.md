# Go-Live Plan — Hosting, Billing & Monetization

**Date:** 2026-07-25
**Owner:** Jordan
**Status:** LOCKED — decided direction (advised by Fable, verified against repo)
**Scope:** Migrate web hosting to an owned domain, turn on web billing, then grow
monetization. Native (Capacitor/Android) path unchanged except the audio origin.

> Context: the web Supporter billing code is already merged and ships **dark**
> (blank `REVENUECAT_WEB_PUBLIC_KEY`). This plan is the go-live sequence, not new
> feature work. See `docs/superpowers/specs/2026-07-25-web-supporter-billing-design.md`.

---

## The decisions (baked in — no more options)

- **Domain:** buy `luckycathsk.com`. Use it for *everything* — site, audio, Stripe,
  privacy. No `github.io` / `pages.dev` / `netlify.app` host anywhere.
- **Host:** Cloudflare Pages (unmetered bandwidth — required by the 132 MB audio set;
  Netlify's 100 GB/mo cap would be blown at ~10k users).
- **Private repo:** yes, but **last** (step 9). It hides source/history only — the game
  + `data/words.js` + audio ship to every browser regardless, so it's a mild deterrent,
  not protection. Free Cloudflare Pages deploys from a private repo, so no hosting cost.
- **Supabase Pro ($25/mo):** upgrade at billing go-live (step 5), **not** "when traction
  warrants" — free tier has no backups and auto-pauses; paid users' data can't live there.
- **Supporter price:** keep **79฿ / $2.99**, one-time, exactly as built. Good launch model.
- **Monetization order:** placement first (step 7), then coin packs (step 8). Placement
  beats any price change.
- **User-progress migration bridge:** mandatory (step 4) — moving origin orphans
  `localStorage` (`nbhsk.*`) + anonymous Supabase sessions. Do it while the user cohort
  is tiny (public web only just launched).

**Total infra cost at ~10k users:** ~$0–25/mo flat (Cloudflare free + Supabase Pro) +
payment fees. Break-even ≈ 12 Supporter sales/month.

---

## Execute in this order

| # | Step | Who |
|---|------|-----|
| 1 | Buy `luckycathsk.com` on Cloudflare Registrar (at-cost). | **Jordan** |
| 2 | Stand up Cloudflare Pages on that domain; deploy via `wrangler pages deploy www/` from GitHub Actions (keeps the `npm test` gate). Both sites live during migration. | Claude + Jordan (workflow push needs `gh auth refresh -s workflow` — VPS token lacks it) |
| 3 | One URL-sweep commit — see checklist below. Tests green. | Claude |
| 4 | Turn `github.io` into a migration bridge: banner/redirect prompting existing users to email-OTP sign-in so progress follows. Do within days. | Claude (build) + Jordan (deploy) |
| 5 | Upgrade Supabase to **Pro ($25/mo)** — before billing. | **Jordan** |
| 6 | Billing go-live: enter RC web public key in `revenuecat-config.js`, run **one real PromptPay THB test checkout**, then flip live. | **Jordan** (dashboard) + Claude (key commit) |
| 7 | Monetization sprint 1 — **placement:** surface the Supporter offer at streak-saved / boss-won / level-mastered moments; make the badge visible in friend-compare/street. | Claude |
| 8 | Monetization sprint 2 — ship the already-coded **coin packs on web** (`coins_s/m/l/xl`), lead with `coins_s` at impulse THB pricing. | Claude |
| 9 | Retire the `github.io` bridge after ~4–6 weeks, **then flip the repo private.** | **Jordan** |
| 10 | Apply analytics `events.sql` only *with* a 90-day retention job + insert-size cap. | Claude + Jordan |

## Step 3 — URL-sweep checklist (all → `https://luckycathsk.com/…`)

> **Line numbers re-verified against `main` @ `a524cd24` (v135), 2026-07-30.**
> The two `src/main.js` numbers originally written here (1057, 3964) had drifted
> and are corrected below. There are **exactly 7 occurrences of
> `sarachdatabear-polar.github.io` across 3 files** — the list below is complete.
> Re-grep before executing, since v136+ will move them again:
> `grep -rn "sarachdatabear-polar.github.io" src/ index.html test/`

- [ ] `src/main.js:1192-1193` (was 1057) — `REMOTE_AUDIO_BASE` native audio origin → `https://luckycathsk.com/audio/`. The value is `isNative() ? "https://…github.io/hsk_game/audio/" : "audio/"`, so **only the native build bakes it in** — *critical: strands installed APKs if Pages is torn down before this ships in a new APK.*
- [ ] `src/main.js:4257` (was 3964) — privacy link href, set on native so the link doesn't leave the WebView
- [ ] `index.html` — 4 tags: `canonical` (:12), `og:url` (:16), `og:image` (:17), `twitter:image` (:23)
- [ ] `test/social-meta.test.js:21` — update asserted URL (build gates on `npm test`)
- [ ] `sw.js` — bump `SHELL` cache version (PWA cache-bust)

## Watch-items
- **Cloudflare Pages 20,000-file limit:** `www/` is ~14,076 today (132 MB / ~14k mp3s).
  Under, but audio is the growth axis — migrate audio to R2 behind the same
  `luckycathsk.com/audio/` URL if the count/deploy-time becomes a problem (deferred).
- **PromptPay:** confirm RC Web Billing surfaces PromptPay for a THB one-time purchase
  via a real test checkout before advertising 79฿ (THB-only, TH Stripe account).

## Do NOT (right now)
No subscription · no web ads · no R2 migration · no repo-private flip before step 9 ·
no new SKUs before the placement work (step 7) ships.
