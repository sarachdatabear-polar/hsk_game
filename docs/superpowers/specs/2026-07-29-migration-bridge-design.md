# Migration Bridge — design spec (2026-07-29)

Go-live plan **step 4**: turn github.io into a migration bridge to
`luckycathsk.com` so existing users' progress follows via the live email-OTP
account flow. Designed with Jordan 2026-07-29. Built **dark now** (pre-domain);
flipping is a config change + one github.io deploy.

## Decisions (owner-approved)

- **Two phases, config-set.** Phase 1 (~weeks 1–4): dismissible banner, game fully
  playable. Phase 2 (final week+): blocking launch screen — sign in, or continue
  anyway for this session after one explicit tap. Nobody loses progress silently.
- **Brand-new visitors auto-redirect.** No meaningful local progress → immediate
  `location.replace(target)`; they never build data on the doomed origin.
- **Mechanism is the existing account flow** (locked by the go-live plan and the
  billing spec's "no new auth UI" rule): sign-in/email-attach pushes the cloud row;
  signing in on the new domain pulls it. The bridge builds NO auth UI — it routes
  to the existing account panel.
- **Signed-in users get softer copy** — their progress already follows; CTA is just
  "Continue at luckycathsk.com", no sign-in ask.
- **Ships dark**: blank `MIGRATION_TARGET_URL` = the bridge does not exist.

## Non-goals

- No URL/fragment data export, no new sync machinery, no new auth UI.
- No changes on the luckycathsk.com side (signing in there already reconciles).
- No countdown copy in v1 (phase 2's copy warns "this address is closing soon";
  exact dates can be added at flip time as plain string edits).
- Not shown in the Android app, ever.

## Architecture

### Config — `src/migration-config.js` (new)

```js
export const MIGRATION_TARGET_URL = "";   // blank = bridge off (dark)
export const MIGRATION_PHASE = 1;         // 1 = banner, 2 = blocking screen
export const MIGRATION_SOURCE_HOSTS = ["sarachdatabear-polar.github.io"];
```

Flip = set URL (later bump phase), rebuild, deploy github.io. Each phase change is
one more github.io deploy; the new-domain deploy carries the same code inert.

### Policy — `src/migration.js` (new, pure)

`migrationMode(input)` → `"off" | "redirect-new" | "banner" | "block"`, with
`input = { targetUrl, phase, host, isNative, hasProgress, signedIn, dismissedDay, today }`.

- **Fail-closed guards, in order:** blank/invalid `targetUrl` → off; `isNative` →
  off; `host` not in `MIGRATION_SOURCE_HOSTS` → off (the same bundle ships to the
  new domain and into the APK — it must be inert there).
- `!hasProgress` → `redirect-new`.
- phase 2 → `block` (dismiss does not apply; "continue anyway" is session-scoped
  UI state, not persisted).
- phase 1 → `banner`, unless `dismissedDay === today` → off for the rest of the
  day (reappears tomorrow).
- `signedIn` never changes the mode, only the copy variant (`copyVariant(signedIn)`
  helper or an equivalent flag the UI reads).

`hasMeaningfulProgress({ introDone, xp, masteryCount })` → boolean (any of:
intro finished, xp > 0, mastered/attempted words exist). Pure, unit-tested.

### UI — `src/ui/migration-bridge.js` (new factory)

`createMigrationBridge({ $, store, t, getMode, openAccount, targetUrl })`, mounted
once by `main.js` at boot (frozen-file rule: mount + deps only).

- `redirect-new` → `location.replace(targetUrl)` immediately at boot.
- `banner` → a slim banner at the top of the home screen: one line + two actions —
  **Save my progress** (opens the existing account panel) / **Continue at the new
  site** (link to `targetUrl`) — and a dismiss ✕ (stores `dismissedDay = today`).
  Signed-in variant drops the sign-in ask.
- `block` → top-level `position:fixed` overlay at launch (house `.pause-overlay`
  convention, joins the `#word-overlay,#friend-overlay,…` rule): headline, the same
  two actions, plus **Continue anyway** (closes the overlay for this session only).
- After a successful sign-in from the bridge, re-render: the user now sees the
  signed-in variant (their progress is safe; go when ready).

### Storage

`nbhsk.migration` = `{ dismissedDay: "YYYY-MM-DD" }` via `createStore`.
**Local-only, NOT in `SYNC_KEYS`** (a dismissal is per-device noise). New key,
absence-safe, no migration-ladder entry.

### i18n

~6 new keys (`migration.*`): banner line (guest + signed-in variants), save CTA,
go-to-new-site CTA, block headline/body, continue-anyway. EN + TH, Thai tagged
`// TH-REVIEW`.

## Error handling

- All guards fail closed (off). Malformed stored `dismissedDay` → treated as absent.
- `openAccount` routes through the existing account tab handler; if unavailable,
  the link CTA still works (progress-less continue is never blocked).
- The redirect uses `location.replace` so github.io drops out of history.

## Testing

- `test/migration.test.js` — full matrix: blank URL off; native off; wrong host off
  (incl. the literal luckycathsk.com host); fresh-visitor redirect; phase 1
  banner + same-day dismiss + next-day reappear; phase 2 block regardless of
  dismiss; `hasMeaningfulProgress` cases; signed-in copy variant.
- Factory untested by design (DOM wiring); probe on the built bundle with a host
  override seam: banner show/dismiss/next-day, block + continue-anyway, fresh
  redirect, and BOTH inert cases (blank target; wrong host) — zero console errors.
- Probe caveat (accepted): the real cross-origin redirect can only be smoke-tested
  on domain day (go-live step 4 flip checklist).
- Full gate: `npm test` unmasked, lint, build, EN+TH sweeps (bridge dark ⇒ 10/10
  unchanged).

## Release

Mergeable to `development` dark any time; rides any release cut inert. Activation
(owner-gated, domain day): set `MIGRATION_TARGET_URL`, rebuild, SHELL bump, deploy
github.io; later bump `MIGRATION_PHASE = 2` the same way; retire at plan step 9.

## Open items

- Native Thai review of the new `migration.*` strings (standing queue).
- Domain-day smoke test of the real redirect + cross-origin sign-in round-trip.
