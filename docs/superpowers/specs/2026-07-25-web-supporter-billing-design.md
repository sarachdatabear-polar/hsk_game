# Web Supporter Billing — Design Spec

**Date:** 2026-07-25
**Owner:** Jordan
**Status:** Approved direction (brainstormed + approved 2026-07-25)
**Applies to:** `game/` (web/PWA path). Native billing path unchanged.
**Related:** `docs/prd/PRD-monetization-and-production.md` (§6 auth, §7 IAP),
`docs/superpowers/specs/2026-07-11-iap-purchase-flow-design.md`.

---

## 0. TL;DR

Sell the **one-time Supporter unlock** on the web/PWA via **RevenueCat Web Billing
(Stripe backend)**, so browser and iOS-Safari users can buy at full margin (no
app-store cut) with **PromptPay** for the Thai market. The purchase is **cross-platform**:
because both web and native key RevenueCat off the same **Supabase user UUID**, an
unlock bought on web appears in the native apps (ad-free + cosmetic) once the user signs
in with the same email. Coin packs are **out of scope** for this cut.

This is a **small wiring task on top of rails that already exist and are live**, not a
new subsystem.

---

## 1. Goal & non-goals

### Goal
Let a web user buy the Supporter unlock and have it (a) take effect immediately on web
(thank-you cosmetic + badge + 2,000 coins), (b) be **restorable** on a new device / after
a cache-clear via the existing email-OTP flow, and (c) **carry to the native apps** when
they launch/are installed, with progress intact.

### Non-goals (this cut)
- **Coin packs on web.** Consumables don't restore across devices by design
  (PRD §7.4); defer to a later cut.
- **Ads on web.** AdMob is native-only; there is nothing to remove on web.
- **Any "buy cheaper on web" prompt inside the native app.** Play anti-steering forbids
  it; honoring an already-owned entitlement is fine, advertising the web purchase is not.
- **A new/separate account or magic-link system.** We reuse the existing email-OTP account
  flow verbatim (see §3).

---

## 2. Current state (grounding — verified 2026-07-25)

**LIVE in production (reuse as-is):**
- **Auth / identity.** `src/cloud.js` `ensureGuest()` reuses a signed-in session or mints
  an anonymous Supabase UUID. `src/account.js` holds the `local → guest → signedIn` state
  machine + email-OTP (`sendCode`/`verifyCode`), including the **anonymous→email upgrade**
  (`updateUser({email})` verified as `email_change`) that **preserves the UUID** and merges
  guest progress. Shipped in PR #74; **verified live with Jordan's account (user 57fc58c0).**
- **Account panel UI.** Wired in `main.js` (`renderAccount`, account tab at the tab router),
  reachable in the running app.
- **RevenueCat App User ID = Supabase UUID.** `main.js` passes `ensureUserId` (→ `ensureGuest`
  UUID) into the provider. Native `provider-revenuecat.js` already uses it.
- **Webhook.** `supabase/functions/rc-webhook/` grants on **event type only**
  (`INITIAL_PURCHASE`/`NON_RENEWING_PURCHASE`) via the `grant_purchase` RPC — **store-agnostic**,
  so a web `RC_BILLING`/`STRIPE` purchase is granted with **no code change**.
- **Supabase backend.** Project `lucky-cat-hsk` (ref `eqsodiufgjecoqgxdisn`), 5 tables +
  RLS, anon + email auth on, custom SMTP for OTP delivery.
- **Cloud sync.** `reconcile`/`pushDirty` wired to sign-in (`syncEdge`) and purchase
  (`pushEdge`); the ledger-cursor purchase fold is implemented + unit-tested.

**DARK (this is what we light up):**
- **Purchase UI.** `src/monetization/gating.js` hides IAP unless a real provider reports
  `available()`. On web the seam falls back to the **mock** (hidden unless the dev flag), so
  **no purchase is possible on web today** — because there is no web provider.

**Conclusion:** the identity + migration + entitlement-grant machinery is already built and
live. The missing piece is a **web billing provider** and the seam branch that selects it.

---

## 3. Architecture

### 3.1 Identity & migration (reuse — no new design)
Web keeps using `ensureGuest` → Supabase UUID as the RevenueCat App User ID, and the
existing email-OTP account flow for sign-in/restore. This **is** the migration bridge:

> Buy on web → (prompted to) sign in with email → the anonymous UUID upgrades to a
> permanent account **without changing the UUID** → the same UUID resolves the same
> RevenueCat customer and the same cloud-synced progress on the native app later.

Anonymous, never-signed-in web users remain device-local (matches PRD §6.1). They are
prompted to attach an email **at the moment of purchase** so the unlock is recoverable;
attaching the email is what makes their account portable to native.

### 3.2 The one new module: `src/monetization/provider-revenuecat-web.js`
A web provider implementing the **existing provider seam interface** (`provider.js`):
`kind`, `available()`, `supports()`, `supportsRestore()`, `price()`, `purchase()`,
`restore()` — all async, never throw. Built to the **same injectable-deps pattern** as
`provider-revenuecat.js` so every branch is unit-testable in Vitest without a browser
(inject the SDK; default to lazy `import("@revenuecat/purchases-js")`).

**Boot & platform constraints (must hold):**
- **Construct cheaply and synchronously.** No SDK init or network in the constructor —
  `getProvider()` runs eagerly at boot. SDK configure / product fetch happen inside
  `available()`/`ready()`, exactly like the native provider.
- **Degrade to mock cleanly.** On `file://`, offline, or missing web-billing key,
  `available()` resolves false and the seam keeps the mock (hidden in prod), mirroring the
  `audio/index.json` fetch-fails-silently pattern. A web-billing failure must never block
  boot or crash the app.
- **Identity guard.** Reuse the native provider's rule: the RC App User ID must be the
  UUID from `ensureUserId`; never let the SDK create its own `$RCAnonymousID` or accept an
  email as the identifier.

### 3.3 Seam branch: `src/monetization/provider.js`
Today `getProvider()` returns the RevenueCat provider only when `isNative()` **and** a key
is set, else the mock. Add a **web branch**: when **not native**, a **web-billing public
key** is configured, and we're not on `file://`, return `revenueCatWebProvider(...)` wired
to the same `ensureUserId`, product ids, and restorable ids. Otherwise fall back to the
mock as today. Native behavior is unchanged.

Web-billing key + config live in `src/monetization/revenuecat-config.js` (add a
`REVENUECAT_WEB_PUBLIC_KEY` alongside the existing Android key; empty string = web billing
off = mock fallback, so the code can merge before the dashboard is configured).

### 3.4 Purchase → entitlement flow (reuse backend)
1. Web user taps **Become a Supporter** → `iapBuy` (existing) → web provider `purchase("supporter")`.
2. RevenueCat Web Billing runs Stripe checkout (card / **PromptPay**).
3. On success RevenueCat fires `NON_RENEWING_PURCHASE` (store `RC_BILLING`) → **existing
   `rc-webhook`** → `grant_purchase` RPC writes the `supporter` entitlement + 2,000 coins,
   keyed to the Supabase UUID.
4. Client credits via the **existing purchase-poll / reconcile** path (`purchase-poll.js`,
   `sync.js` ledger cursor) — the same mechanism the native flow uses; no new client grant
   logic. Cosmetic + badge apply from the `supporter` entitlement as they already do.

### 3.5 Cross-platform result
Same entitlement row + same UUID ⇒ signing into the native app with the same email shows
the unlock (ad-free + cosmetic) and the synced progress. No extra plumbing — it is a
consequence of §3.1.

---

## 4. Product framing on web

The `supporter` product's headline native benefit is "remove ads." Because the unlock is
**cross-platform**, that stays honest as a **mobile** benefit. Web copy:

> **Become a Supporter — 79฿ / $2.99, once.**
> Support the project · a thank-you cosmetic · a Supporter badge · 2,000 coins ·
> **ad-free on the mobile app**.

Clear-eyed note (Jordan's call, accepted): a web-only buyer who never installs mobile gets
cosmetic + badge + coins (which are earnable anyway) — the "ad-free" value only materializes
on mobile. The **cross-platform install is what makes $3 worth it**, so the framing should
lean into "own it everywhere," not hide it.

Price display uses RevenueCat/Stripe's localized price string when available (never
hard-code — `products.js` prices are mock-era display only); PromptPay enabled for TH.

---

## 5. UI touchpoints

- **Buy CTA.** Surface the Supporter offer on web wherever `iapVisible(provider, devFlag)`
  now returns true — the existing shop/IAP section renders it once the web provider reports
  `available()`. Reuse the existing `renderIapSections`/`iapBuy` path; do not fork it.
- **Email connect at purchase.** After a successful web purchase by an anonymous user,
  prompt (non-blocking) to attach an email via the **existing** account panel flow, framed
  as "save your unlock so you can restore it / use it on mobile." Never force it before play.
- **Restore.** The existing account panel "connect / enter email → OTP" is the restore path;
  add a plain-language "Restore purchase" affordance that routes into that same flow.

No new account/auth UI is built — only reuse + labels/copy.

---

## 6. Owner-gated config (not code — Jordan, dashboard)

1. **RevenueCat:** enable **Web Billing** with the **Stripe** backend; create/attach the
   `supporter` web product + price (79฿ / $2.99); connect the existing entitlement so the
   webhook grants fire. Provide the **web billing public key** for `revenuecat-config.js`.
2. **Stripe:** connect account; **enable PromptPay** (+ cards); confirm the webhook →
   `rc-webhook` endpoint is registered for web events.
3. **Pre-launch (tracked elsewhere):** switch OTP email sender to a proper domain
   (currently Gmail SMTP); Thai VAT-on-digital-services question for an accountant.

Code can merge with an empty web key (mock fallback); the feature activates when the key
is set.

---

## 7. Testing

- **Unit (Vitest, no browser):** the new web provider with an **injected fake SDK** —
  cover `available()` true/false, `purchase()` ok / cancelled / pending / failed /
  unavailable, `restore()`, the identity guard (rejects non-UUID app user id), and the
  cheap-sync-construct rule. Mirror `test/` coverage of the native provider.
- **Seam:** `getProvider()` returns the web provider only under (not-native + key set +
  not file://); mock otherwise; **native path unchanged** (regression assertion).
- **Gating:** `iapVisible` shows the web purchase UI only when the web provider is
  `available()`.
- **Bundle/precache check (advisor-flagged):** measure `@revenuecat/purchases-js` added to
  the bundle; HANDOFF notes the precache byte pin is tight — the `assets:validate` /
  precache size test must stay green or the pin is adjusted deliberately (lazy-import keeps
  it out of the always-loaded path where possible).
- **Manual sandbox (owner-gated, after §6):** a real Stripe test purchase → webhook grant →
  entitlement appears on web → sign in with email → confirm the same entitlement resolves on
  a second device/session.

---

## 8. Risks & open items

| Risk / item | Handling |
|---|---|
| `purchases-js` inflates the bundle past the precache pin | §7 size check; lazy-import; adjust pin deliberately if needed |
| Web-billing key absent at merge time | Empty key = mock fallback; feature dark until §6 done — safe to merge |
| Account panel not reachable on web (assumed reachable) | Verify in the plan's first task; if native-gated, ungate for web |
| Cloud sync exercised at low volume in prod so far | Cross-platform carry relies on it; manual second-device test in §7 covers it |
| Play anti-steering | No web-purchase CTA inside the native app; honoring-only (§1 non-goals) |
| Thai VAT on digital services | Owner + accountant; out of engineering scope |

---

## 9. Definition of done

- Web provider + seam branch merged with unit tests green; native path unchanged.
- With the web-billing key set (owner config done), a sandbox Stripe purchase grants the
  `supporter` entitlement on web via the existing webhook, and the same entitlement +
  progress resolve after email sign-in on a second session.
- Bundle/precache size test green (or pin consciously adjusted).
- No purchase-related regression to the native flow; no new auth/account UI beyond copy.
