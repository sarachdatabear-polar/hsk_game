# Lucky Cat HSK — Monetization & Production PRD

> End-to-end product requirements for taking Lucky Cat HSK from a working PWA/Android
> prototype to a production-grade, monetized app on **both** the Google Play Store and
> Apple App Store — without ever compromising the core mission: **helping people learn
> HSK Chinese vocabulary through gamification.**

**Status:** Approved direction (decisions locked via design review, July 2026)
**Owner:** Jordan
**Applies to:** `game/` (vanilla JS + esbuild + Capacitor). Data pipeline at repo root is unchanged.

---

## 0. TL;DR

- **App is FREE to download** (store listing shows *"Free · Offers in-app purchases"*). No hard paywall.
- **Learning is 100% free, forever.** Money only ever touches cosmetics, buying coins (to skip the *cosmetic* grind), and removing ads. Nothing is pay-to-win; content is never gated.
- **Single currency: coins.** Earned by studying, buyable in packs, toppable via opt-in rewarded ads.
- **Respectful hybrid ads:** rewarded video is the star; interstitials only after the results screen, hard-capped; no banners; nothing during battle/flashcards.
- **IAP v1:** one-time **79฿ Supporter** unlock (removes ads + thank-you cosmetic + badge + coin bonus) and **coin packs**. Subscription designed into the data model, shipped in v2.
- **Prices are purchasing-power-localized** for Thailand/SEA (core market), full price in wealthy markets.
- **Backend: Supabase from v1** (stay on JS/Capacitor — no Flutter rewrite). Optional sign-in, cloud save, server-validated purchases, offline-first.
- **RevenueCat** wraps StoreKit + Play Billing for cross-platform IAP + receipt validation.
- **Simultaneous iOS + Android** launch.
- **UI localized Thai + English** (word glosses are already CN/EN/TH).

---

## 1. Objective & Guardrails

### 1.1 Primary objective
Help Thai (and global) learners **acquire and retain HSK vocabulary**, using gamification
(streaks, quests, mastery, cosmetic rewards) as the engagement engine. Revenue exists to
*sustain and grow* that mission, never to obstruct it.

### 1.2 Non-negotiable guardrails
1. **Learning is never gated.** All 6 HSK levels, all words, all game modes, SRS/Smart Review, mastery tracking, and progress are free forever — never behind an ad or a purchase.
2. **No pay-to-win.** Nothing purchasable affects learning outcomes or scoring advantage. The shop is cosmetic-only.
3. **Ads never interrupt learning.** No ads during battle or flashcards. Rewarded ads are always opt-in.
4. **The results screen leads with learning.** What you learned / mastered is shown *before* any monetization prompt (double-coins, etc.).
5. **Store-listing framing stays learning-first** so the app is never reclassified as kids-directed (see §4).

### 1.3 How monetization *reinforces* learning (gamification tie-in)
- **Coins are earned by studying** — the reward loop is inseparable from the learning loop.
- **Daily quests are study goals** (answer N correctly, complete a Smart Review, no-miss round).
- **Daily streak + daily bonus chest** drive the return-habit that is itself the learning behavior.
- **Cosmetics are a "proud to show" reward** for consistent study, not a shortcut around it.

---

## 2. Market Context (research-grounded)

| Insight | Implication for us | Source |
|---|---|---|
| Free-to-play = ~70%+ of mobile-game revenue; paid apps are 3–5% of apps and thrive only in high-income markets. | Free download, not a paywall. | [Mirava](https://www.mirava.io/blog/freemium-vs-paid-apps-revenue-by-region) |
| Thailand is ~72% Android / ~28% iOS; card penetration ~20%, but TrueMoney/PromptPay/carrier billing are supported on Play. | Payments are viable in TH; Android is the bigger slice. | [Statcounter](https://gs.statcounter.com/os-market-share/mobile/thailand), [2c2p](https://2c2p.com/articles/thailand-payment-methods/) |
| Default store currency conversion over-prices SEA 2–3×; localizing lifted a comparable app's SEA conversion +38%. | Hand-set PPP prices for TH/SEA. | [Mirava](https://www.mirava.io/blog/localized-pricing-in-app-purchases-guide) |
| Rewarded video: $15–25 eCPM & opt-in; interstitials $3–6; banners ~$0.20–0.80. Rewarded-ad watchers convert to payers up to 4.5×. | Rewarded-first; capped interstitials; no banners. | [Gamigion](https://www.gamigion.com/ad-monetization-in-mobile-games-benchmark-report-2025/), [Tenjin](https://tenjin.com/blog/ad-mon-gaming-2026/) |
| Hybrid (ads+IAP) is used by ~72% of devs; ads don't cannibalize IAP (86% report no harm). Blended ARPDAU ~$0.15–0.50. | Hybrid model with a single wallet. | [Gamigion](https://www.gamigion.com/2025-hybridcasual-market-overview-with-real-data/) |
| Duolingo (closest analog): ~80% revenue from subscriptions, ~$35M from gem IAP; its gems buy *power* (hearts) — we deliberately have none. | Coin-buying is a *minor* earner; don't over-engineer it. Subscription is a v2 opportunity. | [ElectroIQ](https://electroiq.com/stats/duolingo-statistics/) |
| One-time purchases are the fastest-growing edu segment (6%→17%); parents/learners prefer them to subscriptions. | One-time Supporter unlock fits edu buyers. | [Adapty](https://adapty.io/blog/education-app-subscription-benchmarks/) |
| Kids-directed apps (COPPA/GDPR-K) are barred from personalized ads (≈half the eCPM) + heavy compliance. | Declare 13+/general; keep listing exam-focused. | [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Andromo](https://www.andromo.com/blog/kid-app-coppa-gdpr/) |

---

## 3. Coin Economy Specification ("the back-up logic")

Single currency: **coins**. Stored locally (offline-first) and mirrored to Supabase when
signed in. *Purchased* coins are server-granted and authoritative; *earned* coins are
local-first and reconciled with anti-cheat sanity caps (see §6).

### 3.1 Sources (coins in) — *moderately generous; today's rates kept*

| Source | Amount | Notes / cap |
|---|---|---|
| Correct answer (battle) | `killPoints` ≈ **10–18** each | base 10 + up to 8 distance bonus × combo multiplier (`scoring.js`, unchanged) |
| Round completion (20 words) | ≈ **300–500** | sum of per-word points, banked at results |
| Perfect round bonus | `perfectBonus(score)` | existing; no misses in a round |
| Daily quests (3/day) | **100–250** each → ~**350–500/day** | `quests.js`, unchanged |
| **Rewarded: Double coins @ results** | **+100%** of the round | opt-in; **max 1× per round** |
| **Rewarded: Daily bonus chest** | 50 free, or **~200** with ad | **1× per day**; home screen |
| **Rewarded: Shop top-up** | **+100** | opt-in at point of purchase intent; daily soft cap (e.g. 5×) |
| **Rewarded: Revive** | grants **1 heart** (not coins) | **max 1× per round**; keeps round going |
| Sign-in bonus (new) | one-time **+500** | incentivizes account creation → cloud save |
| Supporter thank-you (new) | one-time **+2,000** | granted on 79฿ purchase |

### 3.2 Sinks (coins out)

| Sink | Cost range | Notes |
|---|---|---|
| Shop cosmetics (16 items: skins, backdrops, effects, soundpacks, street decos) | **500–5,000**, ≈**40,000** total | `shop.js`, unchanged |
| *(v2)* Lucky-cat draw / gifting / seasonal exclusives | TBD | only if a real coin-sink is needed later |

### 3.3 Balance targets
- First cheap cosmetic: **~1–2 days** of casual play (~20 min/day).
- A mid-tier item: **~weekly**.
- Whole catalog (free, no ads): **~3–5 weeks**; rewarded faucets meaningfully shorten this.
- **Anti-inflation:** rewarded placements are per-round/per-day capped; server enforces a
  max plausible earned-coins/day (flag & clamp beyond it). Purchased coins bypass caps.

### 3.4 Why buying coins still sells
Coins are attainable free, so packs sell on **impatience** ("I want *that* skin now"),
not necessity — consistent with the research that coin-IAP is a minor, goodwill-safe earner.
The real revenue engine is **rewarded ads (non-payers) + Supporter unlock**.

---

## 4. Audience & Store Positioning

- **Declared target audience: 13+ / general.** HSK is a formal proficiency exam (the "Chinese TOEFL"); real learners skew teen-and-adult.
- **Content rating:** Everyone/Teen via IARC questionnaire.
- **Personalized ads allowed** (not kids-directed) → higher eCPM, standard SDKs, no verifiable-parental-consent burden.
- **Hard rule:** store listing copy, screenshots, and keywords stay **exam-prep / learning-framed** (e.g. "Learn HSK vocabulary," not "fun game for kids"). Cute art is fine; kid-targeted *marketing* is not — it risks reclassification into Families/Kids policy and would gut ad revenue.

---

## 5. Ads Specification (respectful hybrid)

### 5.1 Formats & placement

| Format | Where | Rules |
|---|---|---|
| **Rewarded video** (star) | Double-coins @ results, daily chest, shop top-up, revive | Always **opt-in**; per-round/day caps (§3.1) |
| **Interstitial** | **Only after the results screen** | Min **180s** between; **never** two in a row; **suppressed in the first session**; **never** shown to Supporter owners |
| **Banner** | — | **None. Anywhere.** |
| Any ad during battle/flashcards | — | **Forbidden.** |

### 5.2 Tech
- **Network:** Google **AdMob** (via a maintained Capacitor plugin), mediation added later if fill/eCPM warrants.
- **Consent:** **Google UMP** CMP for GDPR/consent, **ATT** (App Tracking Transparency) prompt on iOS before any tracking. Non-consented users get non-personalized ads.
- **Supporter entitlement disables** interstitials app-wide (rewarded remains available as an opt-in bonus).

### 5.3 Acceptance criteria
- No ad ever appears during a battle round or a flashcard session.
- A brand-new install sees **zero** interstitials in session 1.
- Owning Supporter removes **all** interstitials immediately and permanently (verified after restore).
- Every rewarded placement grants its reward **only** on verified completion; a dismissed/failed ad grants nothing and shows a friendly retry.

---

## 6. Backend Architecture (Supabase, from v1)

**Stack unchanged:** vanilla JS + esbuild + Capacitor. Supabase is added via `supabase-js`.
**No Flutter.** The `file://` + offline constraint is preserved: the app is fully playable
offline/guest; cloud features activate only when online **and** signed in.

### 6.1 Auth
- **Guest by default** (Supabase anonymous session) — "just open and play" is preserved.
- **Optional sign-in:** Google, Apple (required by Apple if any third-party sign-in is offered), email magic-link.
- Signing in **merges** the local guest profile into the cloud account.

### 6.2 Data model (indicative)

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | `id`, `display_name`, `locale`, `created_at` | 1 row/user |
| `progress` | `user_id`, `mastery` (JSON), `xp`, `streak`, `daily`, `quests`, `best` | mirrors current `localStorage` keys |
| `wallet` | `user_id`, `coins`, `earned_today`, `updated_at` | coins reconciled; anti-cheat clamp |
| `entitlements` | `user_id`, `product_id`, `source`, `granted_at` | written by RevenueCat webhook (§7) |
| `ledger` *(optional)* | `user_id`, `delta`, `reason`, `ts` | audit trail for purchased coins |
| `leaderboards` *(v2)* | `user_id`, `scope`, `score` | opt-in, moderated |

Row-Level Security: users can read/write only their own rows; entitlements/purchased-coin
grants are **service-role only** (written by the webhook, never the client).

### 6.3 Sync strategy
- **Local-first:** gameplay writes to `localStorage` immediately (no latency, offline-safe).
- **Reconcile on:** app foreground, sign-in, and after a purchase.
- **Conflict resolution:** last-write-wins per field by server timestamp; **coins special-cased** — purchased coins are server-authoritative; earned coins take `max(local, cloud)` within the daily anti-cheat cap.

### 6.4 Compliance surface it introduces
Storing identifiable data triggers **Thailand PDPA** + **EU GDPR** obligations: privacy
policy, lawful basis, data-subject access/erasure, and honest **Data Safety / privacy
nutrition label** disclosures (§9).

---

## 7. IAP Specification

### 7.1 Products (register in Play Console + App Store Connect)

| Product | Type | Thailand | Global base | Grants |
|---|---|---|---|---|
| **Supporter (Remove Ads)** | Non-consumable | **79฿** | $2.99 | remove ads + thank-you skin + supporter badge + **2,000 coins** |
| **Coins S** | Consumable | 29฿ | $0.99 | 1,000 |
| **Coins M** | Consumable | 99฿ | $2.99 | 3,500 (+17%) |
| **Coins L** | Consumable | 169฿ | $4.99 | 6,500 (+30%) |
| **Coins XL** | Consumable | 329฿ | $9.99 | 15,000 (+50%) |
| *(v2)* **Lucky Cat Plus** | Auto-renewing sub | TBD | TBD | remove ads + monthly coin stipend + exclusive rotating skins + cloud-sync perks |

**App download price: Free**, all regions.

### 7.2 Plumbing
- **RevenueCat** SDK (Capacitor) is the single IAP interface across StoreKit + Play Billing:
  handles purchase, **server-side receipt validation**, entitlement state, and **Restore Purchases**.
- **Coin grants** happen server-side: RevenueCat **webhook → Supabase Edge Function** writes to `wallet`/`entitlements` (client never self-grants purchased coins).
- **Restore Purchases** button in Settings (required by Apple) re-syncs entitlements.

### 7.3 Pricing setup note
Google removed pricing templates (Oct 2025): per-country prices are set **per product**.
Budget a one-time chore to hand-set TH + priority SEA (ID/VN/PH) prices on all 5 products;
elsewhere auto-convert the USD base.

### 7.4 Acceptance criteria
- Buying Supporter removes ads instantly and **survives reinstall / new device** (via Restore + cloud entitlement).
- Coin packs credit the correct amount **once**, server-side, even if the app is killed mid-purchase (idempotent webhook).
- All prices display in the user's local currency; Thailand shows exactly **79฿ / 29 / 99 / 169 / 329฿**.

---

## 8. Platforms & Build

**Simultaneous iOS + Android.** Cross-platform by construction (Capacitor + Supabase + RevenueCat).

### 8.1 Android
- Play Console; **new personal accounts must run closed testing with 12 testers opted-in for 14 continuous days** before production — schedule this ~3 weeks pre-launch (org account is exempt).
- Google Play Billing (via RevenueCat); Data Safety form; AdMob app-id.

### 8.2 iOS (added cost accepted)
- **Apple Developer Program $99/yr**; a **Mac + Xcode** is required to build the Capacitor iOS target.
- `npx cap add ios`; StoreKit (via RevenueCat); **ATT** prompt; privacy nutrition labels; Sign in with Apple (mandatory if Google sign-in is offered).
- Apple review is stricter — budget for a rejection round.

### 8.3 Existing pipeline (unchanged)
- `npm run build` (esbuild) → `dist/app.js`; `npm run cap:sync`; PWA `sw.js` **`SHELL` cache version bumped every ship**.

---

## 9. Production-Grade / Store-Readiness Checklist

- [ ] **Privacy policy** (public URL) covering ads, analytics, Supabase-stored data, and IAP.
- [ ] **PDPA (Thailand) + GDPR (EU)** compliance: lawful basis, consent, data access/erasure flow.
- [ ] **Google Play Data Safety** form + **Apple privacy nutrition labels** — accurate to what AdMob, RevenueCat, Supabase, and analytics collect.
- [ ] **Consent management:** Google UMP (GDPR) + ATT (iOS) wired before any ad/tracking init.
- [ ] **IARC age rating** questionnaire (target Everyone/Teen).
- [ ] **Crash reporting + analytics:** Firebase Crashlytics + GA4; RevenueCat revenue analytics; Supabase custom events for the learning + monetization funnel.
- [ ] **Account deletion** path (Apple & Google both require in-app account deletion if accounts exist).
- [ ] **QA on real low-end Android + a range of iPhones**; verify offline play, `file://` fallback, and ad/IAP flows in sandbox.
- [ ] **Store assets** (Thai + English): title, description, keywords (learning-framed), screenshots, feature graphic, using the existing production-art plan.
- [ ] **Restore Purchases** + **Manage/how-to-cancel** (for v2 sub) present.

---

## 10. Localization

- Extract all UI strings (menus, buttons, quest text, results, paywall/Supporter copy, error states) into a **`th` / `en` dictionary**; select by device language with a **manual toggle** in Settings.
- Word glosses remain CN/EN/TH (already built).
- Chinese UI deferred to v2.

---

## 11. Analytics & KPIs

**Learning KPIs (mission health — watch these first):**
- Words seen / mastered per user; HSK-level mastery %; Smart Review usage; quest completion; **streak length**; D1/D7/D30 retention.

**Business KPIs:**
- DAU/MAU; session length; **blended ARPDAU** (target ~$0.15–0.50); rewarded-ad engagement rate & eCPM; interstitial eCPM; **IAP conversion** (1–5% typical); **Supporter attach rate**; coin-pack revenue mix.

**Guardrail metric:** ad-complaint rate / 1-star "too many ads" reviews → if it rises, loosen ad cadence (mission > marginal ad revenue).

---

## 12. Phased Roadmap

| Phase | Scope | Definition of done |
|---|---|---|
| **P0 — Foundations** | i18n (TH/EN) extraction; Supabase project + auth + data model; RevenueCat account + products; analytics + consent (UMP/ATT); privacy policy; Capacitor iOS target added. | Guest + sign-in work; strings localized; consent gates ad/analytics init. |
| **P1 — Ads** | AdMob integration; 4 rewarded faucets; capped post-results interstitial; Supporter-disables-ads flag. | All §5 acceptance criteria pass. |
| **P2 — IAP** | Supporter + 4 coin packs via RevenueCat; webhook→Supabase server grants; Restore Purchases. | All §7 acceptance criteria pass; sandbox purchases verified both stores. |
| **P3 — Cloud & economy** | Cloud save + reconciliation; server coin anti-cheat; sign-in/Supporter bonuses. | Progress + entitlements survive reinstall/new device; anti-cheat clamp verified. |
| **P4 — Store readiness** | Data Safety/nutrition labels; IARC; store listings (TH/EN) + assets; **Android 12×14-day closed test**; submit both stores. | Approved on Play + App Store. |
| **P5 — v2 (post-launch)** | Lucky Cat Plus subscription; leaderboards; optional gem economy *only if* a real sink appears. | Separate PRD. |

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Reclassified as kids-directed → ads gutted | Learning-framed listing; declare 13+; no kid-targeted marketing (§4). |
| Low ad fill/eCPM in Thailand | Rewarded-first (higher eCPM); add mediation if needed; Supporter + coin IAP as backstop. |
| Store rejection (privacy/IAP/ATT) | Complete §9 before submit; budget one iOS rejection round. |
| Coin cheating (localStorage editable) | Purchased coins server-authoritative; earned coins clamped by daily cap; cosmetic-only means low stakes anyway. |
| Supabase free-tier limits at scale | Monitor MAU/storage; upgrade tier as revenue grows (RevenueCat/ads fund it). |
| iOS complexity for a solo dev | RevenueCat + Capacitor abstract most of it; Mac/Xcode acquired in P0. |
| Subscription (v2) feels like "pay to remove ads" | Give Plus real recurring value (stipend + exclusive rotating skins + cloud perks) before shipping it. |

---

## 14. Open Questions (for later, not blocking v1)

- Lucky Cat Plus price/perk mix and whether it *replaces* or *coexists* with the one-time Supporter.
- Whether a v2 gem economy is ever justified (needs a non-cosmetic sink — currently none).
- Leaderboard scope + moderation model.
- Priority SEA markets beyond Thailand for hand-set pricing (ID/VN/PH?).

---

*Learning-first, always. Every decision above defends the free learning core; revenue rides on cosmetics, patience, and goodwill — never on the vocabulary itself.*
