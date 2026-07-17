# Analytics provider recommendation (roadmap R3)

_Author: Claude (Opus), 2026-07-16. Decision-support for the "privacy-safe analytics
readiness" roadmap item. **No SDK is wired and no code ships from this doc** — per R3, the
event pipeline stays dark until the owner selects a provider, approves the privacy/consent
text, and the store Data Safety answers match reality. This is the "select a provider" step._

## TL;DR

- **Recommended default: Supabase-native event logging** — log a small, PII-free event
  stream to a Postgres table via the backend we already run, and derive D1/D7 + the purchase
  funnel in SQL. It is the only option that adds **zero new data processor**, which is worth a
  lot under our PDPA + GDPR posture, and our measurement need is small enough that the
  hand-rolled SQL is bounded.
- **Switch trigger → PostHog Cloud (EU):** the moment you want turnkey retention/funnel
  dashboards without writing SQL and will accept **one** more processor. Most powerful option,
  1M events/mo free, EU-resident, clean DPA.
- **Middle path → self-hosted Umami:** turnkey retention + funnel dashboards **without** a
  third-party processor, at the cost of operating one more service on the VPS.
- **Rejected:** Aptabase, Plausible, Matomo-cheap-tier, Countly Lite (none do D1/D7 out of
  box), and GA4/Firebase (breaks the `file://` guest constraint + PDPA/GDPR US-transfer risk).

Whatever we pick, the **consent gate + offline queue + event contract below are
provider-agnostic** — they are our code, not the vendor's, so switching later is cheap.

---

## Constraints that gate the choice (from the repo)

1. **Zero emission for offline guests.** Privacy policy §2a: guest play lives only on-device
   and is "not transmitted." Analytics must be **opt-in, default OFF**, and no SDK may even
   initialize before consent.
2. **Every new processor is a real compliance cost** — a new privacy-policy §4 entry, a new
   Data Safety disclosure, a new DPA, a possible new data region. This is why a no-new-processor
   option is weighted heavily.
3. **PDPA (Thailand) + GDPR/UK.** Prefer cookieless / no-PII / EU-or-configurable residency.
   ⚠️ **No vendor publishes PDPA-specific compliance** — all PDPA fit below is GDPR-by-analogy.
   The privacy policy already flags that a qualified PDPA+GDPR professional must review before
   publish; the provider choice does not remove that step.
4. **Runs on `file://` and inside the Capacitor WebView**, vanilla JS, esbuild IIFE, no framework.
5. **Need is retention-shaped, not pageviews:** D1/D7 cohorts + a purchase funnel + a handful of
   custom events. Modest volume early.

## Event contract (PII-free; formalizes R3's list)

```
event {
  name        // enum, below
  ts          // client ISO8601; server also stamps received_at
  anon_id     // random UUID per install, created ONLY after consent — never a device/ad id
  session_id  // per app-open
  level_scope?// e.g. "HSK3" — never per-word content
  props?      // bounded, enumerated keys only
  app_version, platform  // "web" | "android"
}
```

Names: `session_start`, `session_complete` (+duration bucket), `review_recovery`,
`delayed_recall`, `notif_permission` (granted/denied/dismissed), purchase funnel
(`store_open`, `product_view`, `purchase_start`, `purchase_success`/`_fail`).
**D1/D7 return is derived server-side** from `anon_id` first-seen — never a client-declared
flag. No hanzi/word content, no display name, no auth id in the stream (keep it de-identified
even for signed-in users).

## Consent + offline-guest design (provider-agnostic — our code)

- Single `nbhsk.analyticsEnabled` flag, **default false**, flipped only by the existing
  first-run consent surface (same one AdMob consent uses, privacy §2d).
- `track(name, props)` is a **no-op** and the transport is not initialized unless consent is on.
- **Offline queue** in localStorage; flush on next online + consented; drop queue if consent
  revoked. Matches the existing `audio/index.json` fail-silent-on-`file://` pattern. (Only
  Matomo/Countly/PostHog-native ship a built-in offline queue; for every other option — including
  the two we recommend — this thin queue is ours to write regardless, ~30 lines.)

---

## Provider evaluation (verified 2026 facts, sources at end)

| Provider | D1/D7 retention | New processor? | `file://`/Capacitor | Consent-gate | Cost | Verdict |
|---|---|---|---|---|---|---|
| **Supabase-native** | You build in SQL | **None** (already our processor) | fetch-based, works in WebView; anon-auth cookieless | Fully ours | ~single-$ incremental | **Default** |
| **PostHog Cloud EU** | Built-in, first-class | +1 (EU-resident, clean DPA) | posthog-js script or npm; native Android SDK | `opt_out_*` flags; autocapture must be turned OFF | 1M events/mo free | **Switch-to (power)** |
| **Umami (self-host)** | Built-in (v2.5+) | None if self-hosted | script tag / `/api/send`; WebView ok | `data-auto-track=false` gate | free (MIT) + your hosting | **Middle path** |
| Aptabase | ❌ impossible by design | +1 | ESM only (no IIFE global); no offline queue | manual track = guest-safe | 20k/mo free | Rejected (no retention) |
| Plausible | ❌ precluded by 24h salt | +1 | script; mobile via raw HTTP API | no cohorts at all | no free tier; funnels $19/mo | Rejected (no retention) |
| Matomo | Cohorts = **paid** plugin | +1 or self-host | best offline queue (SW+IndexedDB) | full consent API | Community free; cohorts extra | Rejected (retention costs extra + cookieless degrades it) |
| Countly Lite | ❌ Enterprise-only | +1 or self-host | UMD script; WebView documented; offline queue | strong `require_consent` | Lite free | Rejected (no retention in OSS) |
| GA4 / Firebase | Built-in & strong | +1 (Google) | ❌ web SDK breaks on `file://` | Consent Mode = modeled, not deterministic | free | **Rejected** (file:// + PDPA/GDPR US-transfer risk, controller ambiguity) |

## Why Supabase-native as the default

- **Privacy is the product's whole posture, and this is the strongest privacy story available:**
  no new processor, no third-party cookies/fingerprint, anonymous-auth is cookieless/PII-free by
  default, and full deletion control via SQL. Nothing else here matches that.
- **The measurement need is small.** R3 is ~8 event types + D1/D7 + one funnel. A D1/D7 cohort
  and a funnel are each a standard, one-time SQL pattern; the Supabase SQL editor is the
  "dashboard" until volume justifies a BI tool. This is not a web-analytics-scale build.
- **It reuses a stack we already operate** (Supabase is live, EU region selectable, executed DPA,
  RLS). No new service to host, secure, or keep patched.
- **Honest cost:** you build the cohort/funnel SQL and there's no out-of-the-box chart UI. That is
  the trade for the cleanest compliance surface. If that build stalls or you want dashboards, take
  the switch trigger below — the event contract and consent gate above are unchanged, so the swap
  is cheap.

**Switch to PostHog Cloud EU** if you'd rather have retention/funnel dashboards immediately and
accept one EU-resident processor (turn autocapture OFF, gate init behind consent, use the EU host
so there's no US-transfer question). **Consider self-hosted Umami** if you want those dashboards
*without* a third-party processor and are happy to run one more service on the VPS.

## Owner-setup checklist (the R3 gate — only you can do these)
- [ ] Confirm the provider (this doc recommends Supabase-native).
- [ ] Supabase-native: add an `events` table + RLS (anon insert only, no select), pick/confirm EU
      region; PostHog/Umami: create the project / stand up the instance.
- [ ] Approve privacy-policy §2e wording and **add a §4 processor entry _only if not
      Supabase-native_**.
- [ ] Fill the store Data Safety answers to match the exact shipped event set.
- [ ] Have the named PDPA+GDPR reviewer sign off before the pipeline goes live.

## Validation still needed before build (not owner effort — implementation notes)
- Confirm the chosen transport actually runs inside the Capacitor Android WebView (every vendor
  leaves this undocumented; verified only by a smoke test on-device).
- Confirm offline events buffer + flush correctly from `file://` (our queue, one test).

## Sources & caveats
- Facts verified against providers' own docs/pricing (Aptabase, PostHog, Plausible, Umami, Matomo,
  Countly, GA4/Firebase, Supabase) as of 2026-07-16. Full source URLs are in the research log for
  this thread.
- **Caveats carried forward:** no provider publishes Thailand-PDPA-specific compliance (all
  GDPR-by-analogy); Capacitor-WebView compatibility is inferred for all (fetch-based) and needs a
  device smoke test; GA4's `file://` incompatibility is inferred from its cookie/IndexedDB
  dependency; Supabase's corporate jurisdiction is stated inconsistently across its own pages
  (Singapore in the DPA vs Delaware elsewhere) — worth a line for the privacy reviewer.
