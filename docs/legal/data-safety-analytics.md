# Google Play Data Safety — analytics answers (DRAFT)

> **DRAFT — developer-authored, not legal advice.** Recommended answers for the Google
> Play Console **Data safety** form covering the optional analytics feature shipped in
> `feat/analytics-dark-transport` (PR #112). Review against the shipped build and confirm
> with a privacy professional before submitting. Pairs with `privacy-policy.md` §2e.
> **Do not submit / do not release to `main` until this is confirmed** — the in-app toggle
> is a user-visible consent surface and the store declaration must match it.

## Ground truth (what the code actually does)

Source: `src/analytics/events.js`, `identity.js`, `transport.js`.

- **Off by default.** Consent flag `nbhsk.analyticsEnabled` defaults `false`; `track()` is a
  hard no-op and no id/network initializes until the user opts in.
- **Events (enumerated, closed set):** `session_start`, `session_complete`, `review_recovery`,
  `delayed_recall`, `notif_permission`, `store_open`, `product_view`, `purchase_start`,
  `purchase_success`, `purchase_fail`.
- **Fields per event:** `name`, `ts`, `anon_id` (random UUID made on-device only after opt-in;
  **not** an advertising/device id), `session_id`, `app_version`, `platform`, `level_scope`,
  and an allowlisted `props` map (`duration_bucket`, `notif result`, `product`, `reason`).
- **Never collected:** name, email, account id, exact location, contacts, the words studied,
  answers, or any free text. Non-allowlisted keys are dropped before send.
- **Transport:** batched HTTPS POST to our own Supabase (PostgREST), anon key only, write-only
  (no read-back). **No third-party analytics/ad SDK.**

## Recommended form answers

**Does your app collect or share any of the required user data types?** → **Yes**
(only when the user opts in — declared as collected because it can be).

| Data type (Play category) | Collected? | Shared? | Optional? | Purpose |
|---|---|---|---|---|
| **App activity → App interactions** (session + funnel events) | Yes | No | **Optional** (opt-in) | Analytics |
| **App info & performance → Diagnostics** (app version, platform) | Yes | No | Optional | Analytics |
| **Device or other IDs** (the app-generated `anon_id` / `session_id`) | Yes* | No | Optional | Analytics |

\* `anon_id` is an app-generated random UUID, not the Android Advertising ID or a hardware
device id. Google's "Device or other IDs" category is broad enough to include an installation
id, so declaring it is the conservative, honest choice. If review concludes it is not an
"identifier" in Play's sense, this row can be dropped — confirm with the privacy reviewer.

**Per-type follow-ups (apply to every row above):**
- **Is this data collected, shared, or both?** → **Collected** (not shared).
- **Is this data processed ephemerally?** → **No** (events are stored in our Supabase `events` table).
- **Is this data required or can users choose?** → **Users can choose** (opt-in toggle, off by default).
- **Is the data encrypted in transit?** → **Yes** (HTTPS/TLS).
- **Can users request that data be deleted?** → **Yes** — via the privacy contact
  (`privacy@DOMAIN`); users can also turn the setting off at any time to stop all collection.

**Not collected / not shared (explicitly answer No):** personal info (name/email/address),
financial info, location, contacts, messages, photos/videos, audio, health, calendar, the
user's learning content or answers.

## Consistency checklist before submitting

- [ ] `privacy-policy.md` §2e matches this sheet, is published, and its URL is in the listing.
- [ ] The `events` table is applied in Supabase **only after** this form + the privacy text are
      approved (the table's existence is the live kill-switch — see `supabase/analytics-events.sql`).
- [ ] The three placeholders `[privacy@DOMAIN]`, `[LEGAL NAME]`, `[REGION]` are filled.
- [ ] Ads (AdMob, §2d) Data Safety answers are handled separately from this analytics sheet.
