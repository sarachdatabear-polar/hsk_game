# Lucky Cat HSK — Privacy Policy (DRAFT)

> **DRAFT — not legal advice.** This is a developer-authored working draft to
> unblock store setup and the Supabase/RevenueCat/AdMob integration. It MUST be
> reviewed by a qualified privacy professional (Thailand PDPA + EU GDPR) and the
> bracketed placeholders filled before it is published or linked from either app
> store. It reflects the *intended* data practices per the Monetization &
> Production PRD (§6.4, §9); confirm each claim against the shipped build.

**Effective date:** [DATE]
**App:** Lucky Cat HSK
**Provider / data controller:** [LEGAL NAME / ENTITY], [ADDRESS]
**Contact:** [privacy@DOMAIN]

---

## 1. Who this applies to and our approach

Lucky Cat HSK helps people learn HSK Chinese vocabulary. **You can install and
play entirely as a guest, offline, without an account.** In that mode your
progress lives only on your device and is not sent to us. Cloud features, ads,
purchases, and the optional analytics setting add data collection, described
below. We collect the minimum
needed to run those features and never sell your personal data.

This policy covers our obligations under Thailand's **Personal Data Protection
Act (PDPA)** and the EU/UK **General Data Protection Regulation (GDPR)**.

## 2. Data we collect

**a) Guest play (default) — stored only on your device.**
Learning progress, mastery, streak, quests, wallet/coins, owned cosmetics, and
preferences are saved in your device's local storage (`nbhsk.*`). This data is
**not transmitted to us** while you play as an offline guest.

**b) Account & cloud save (optional — only if you sign in).**
- Authentication identifier from your chosen sign-in method (Google, Apple, or
  email magic-link) and, for anonymous sessions, a Supabase-issued anonymous ID.
- Display name and language (locale) preference.
- Your learning progress, wallet/coin balance, and entitlements — mirrored to
  the cloud so they survive reinstalls and sync across your devices.

**c) Purchases (only if you buy something).**
In-app purchases (the one-time Supporter unlock and coin packs) are processed by
**Apple App Store / Google Play** via **RevenueCat**. We receive a purchase/
entitlement confirmation and a purchase token — **we do not receive or store
your payment card details.**

**d) Ads (only if ads are shown).**
We show ads via **Google AdMob**. Depending on your consent choice, AdMob may
process an advertising identifier, coarse device/usage signals, and your consent
state to serve personalized or non-personalized ads. On first run (and on iOS,
via App Tracking Transparency) you choose your consent; non-consented users
receive **non-personalized** ads.

**e) Product analytics (only if you turn it on).**
Lucky Cat HSK includes an **optional, off-by-default** setting — *Settings → "Share
anonymous usage data."* If, and only if, you switch it on, the app sends a small set of
**anonymous, aggregate usage events** so we can see how the game is used and improve it:
- **What events:** app session start/end (with a coarse duration bucket such as "5–15m"),
  learning-recovery and delayed-recall milestones, your response to the notification-permission
  prompt (granted / denied / dismissed), and store/purchase funnel steps (store opened, product
  viewed, purchase started / succeeded / failed — with the product id and a failure reason).
- **What is attached:** a random **analytics id** generated on your device *only after you opt
  in* (never an advertising or device identifier), a per-session id, the app version, the
  platform (web / Android), and the HSK level you're studying.
- **What is never collected:** your name, email, account id, IP-derived identity, the specific
  words you study, your answers, or any free text. Events carry only the enumerated fields above.
- **Where it goes:** our own **Supabase** backend (§4) — there is **no third-party analytics or
  advertising SDK**. Events are write-only from the app.

You can turn this off again at any time in Settings; turning it off stops all event collection
immediately. This setting is independent of ads (§2d) and is **off unless you choose it**. Basic
crash/technical diagnostics provided by the app stores or operating system may still apply under
their own policies.

We do **not** collect contacts, precise location, photos, microphone, or health
data.

## 3. Why we use it and the legal basis (GDPR)

| Purpose | Data | Legal basis |
|---|---|---|
| Run the game / save progress locally | §2a | Contract / necessary to provide the service |
| Optional cloud save & cross-device sync | §2b | Contract (you chose to sign in) |
| Process purchases & restore entitlements | §2c | Contract |
| Show ads to support the free app | §2d | **Consent** (personalized) / legitimate interest (non-personalized), per your choice |
| Optional product analytics to improve the game | §2e | **Consent** (opt-in, off by default; withdraw any time in Settings) |
| Keep the app stable and secure (store/OS crash diagnostics) | §2e | Legitimate interest |

Under PDPA the equivalent bases (consent, contractual necessity, legitimate
interest) apply.

## 4. Who we share it with (processors)

We use these service providers, who process data on our behalf:
- **Supabase** — authentication, database, cloud storage (hosting region: Singapore, `ap-southeast-1`).
- **RevenueCat** — purchase validation and entitlement management.
- **Google AdMob** — ad serving and (with consent) measurement.
- **Apple / Google** — sign-in and payment processing for their platforms.

We do not sell personal data or share it for cross-context behavioral
advertising beyond the ad-serving described above. [Link each provider's own
privacy policy before publishing.]

## 5. Children

Lucky Cat HSK is directed to a **general audience aged 13 and older** (HSK is a
formal proficiency exam taken by teens and adults). It is **not directed to
children under 13**, and we do not knowingly collect personal data from
children under 13. If you believe a child has provided personal data, contact us
and we will delete it.

## 6. Your rights

Subject to PDPA/GDPR, you may **access, correct, delete, or export** your
personal data, **object to or restrict** processing, and **withdraw consent**
(including ad-personalization consent) at any time.
- **In-app:** sign out to stop cloud sync; use **Settings → Delete account** to
  erase your cloud data. [Confirm this control ships.]
- **By email:** [privacy@DOMAIN]. We respond within the statutory timeframe
  (PDPA/GDPR: without undue delay, and within 30 days).

Withdrawing consent or deleting your account does not affect the lawfulness of
processing already carried out, and you may continue to play as an offline guest.

## 7. Retention

Cloud data is kept while your account is active and deleted [within X days]
after you delete your account or after [X months] of inactivity. Local device
data persists until you clear it or uninstall. Purchase records are retained as
required for tax/audit purposes.

## 8. International transfers

Your data may be processed outside your country (e.g., our providers' servers).
Where required, we rely on appropriate safeguards (e.g., Standard Contractual
Clauses) for such transfers. [Confirm provider regions and safeguards.]

## 9. Security

We use industry-standard measures (encrypted transport, Supabase Row-Level
Security so users can access only their own data, server-side validation of
purchases). No system is perfectly secure, but purchased entitlements and coins
are server-authoritative to limit abuse.

## 10. Changes

We will update this policy as the app evolves and post the new effective date
here; material changes will be surfaced in-app.

## 11. Contact

Questions or requests: **[privacy@DOMAIN]** — [LEGAL NAME], [ADDRESS].
Thailand users may also lodge a complaint with the PDPC; EU/UK users with their
local supervisory authority.
