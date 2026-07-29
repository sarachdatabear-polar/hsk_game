# Supporter Placement — design spec (2026-07-29)

Go-live plan **step 7** ("Monetization sprint 1 — placement"), designed with Jordan
2026-07-29. Sequenced **before** coin packs on web (step 8); "placement beats any
price change."

## Decisions (owner-approved)

- **Tone: quiet line.** The celebration stays the hero. One warm sentence + one small
  button at the **bottom** of the results screen. No popup, no overlay, never blocks play.
  Honors the PRD §1.2 guardrail: results lead with learning before any monetization prompt.
- **Frequency: peak moments only, max once per day.** Shown only on rounds where a peak
  moment actually happened, and only if not already shown today.
- **Peak moments (any one qualifies):**
  1. **Streak saved** — this round's daily note consumed a freeze/rest day
     (`freezesUsed > 0` from `daily.js noteActivity`; today this only fires a mid-play
     toast — the fact must additionally ride into the results facts object the same way
     `bossDefeated` already does).
  2. **Review Challenge won** — `bossDefeated` fact (golden raccoon, single-stage
     since v131).
  3. **Level up** — `levelUps > 0` this round (milestone or not).
- **Badge surfaces: friend cards + profile.** (Owner explicitly chose these two;
  Cat Journey and shop-only were offered and not picked.)
- **Supporters never see the line.** They **do** see their badge.
- **Ships dark.** Everything gates on the same async `supporterOn` check the shop
  shelf uses (`iapOn && provider.supports("supporter")`). Blank RevenueCat key,
  missing provider, or a failed check all fail **closed** (nothing renders). Mergeable
  before billing go-live.

## Non-goals

- No new purchase UI — the button routes to the **existing** shop supporter card.
- No coin-pack placement (that is step 8, after this ships).
- No ads, no analytics events (analytics is behind the R3 owner gate).
- No new image assets (precache headroom is ~36 KB; the badge is CSS/text only).
- No Cat Journey badge in this cut.
- Supporter is **not** a new compared metric in friend-compare — display attribute only.

## Architecture

Three small pieces, all following house patterns:

### 1. Policy — `src/monetization/supporter-moment.js` (new, pure)

Mirrors `interstitial-policy.js`'s shape (pure decision module, injected `now`):

- `shouldShowSupporterMoment(state, facts, todayDay)` → `{ show, reason }`
  - `state`: `{ lastShownDay }` (persisted blob, see Storage)
  - `facts`: `{ streakSaved, bossDefeated, leveledUp, isSupporter, supporterOn }`
  - Denies unless: `supporterOn` && `!isSupporter` && at least one moment fact true
    && `lastShownDay !== todayDay`.
- `recordSupporterMomentShown(state, todayDay)` → new state (called when the row
  actually renders).
- Day granularity = the same local date-string convention `daily.js` uses.

### 2. Results row — `src/ui/supporter-moment-row.js` (new factory)

`createSupporterMomentRow({ $, t, store, isSupporter, supporterOn, goShopSupporter })`
per the established `src/ui/*` factory convention (`main.js` stays frozen: it only
mounts the factory and calls it with the round's facts from `endBattle`, alongside the
existing sticker-facts assembly).

- Renders into a new `#r-supporter` element in the results markup (`index.html`),
  placed **after** the missed-words review list / CTAs and the next-review hint.
  Hidden by default; also `hidden` whenever policy says no.
- Content: one line + one button.
  - EN: `results.supporterLine` = "Lucky Cat is free thanks to supporters — join them 🐾"
  - EN: `results.supporterCta` = "Become a Supporter"
  - TH mirrors, `// TH-REVIEW` tagged (machine-drafted, queued for native review).
- Button → `goShopSupporter()`: navigate to shop and reveal/scroll to the existing
  supporter card. No purchase logic in this module.
- Rendering the row calls `recordSupporterMomentShown` and persists.

### 3. Badge

**Friend cards — codec `LCH2` → `LCH3`** (`src/friend-compare.js`):

- 9th pipe-delimited field: `supporter` as `"1"`/`"0"`. Encode always emits `LCH3`.
- Decode accepts `LCH1`/`LCH2`/`LCH3`; the field is lenient — anything but `"1"`
  is `false` (same discipline as `avatar`/`day`; wire data is untrusted).
- `normalizeFriendCard` gains `supporter: !!card.supporter` with default `false`,
  so stored remembered-friend entries need **no migration** (absence-tolerated;
  no stored-shape change, so no `CURRENT_SCHEMA_VERSION` bump).
- `getMyCard()` assembly in `main.js` adds `supporter: isSupporter(ent)` (touching
  existing feature wiring, which the frozen-main.js rule permits).
- **Not** added to `METRICS`; `buildFriendCompare` output unchanged.

**Friend screen** (`src/ui/friend-screen.js`): a small ♥ mark overlaid on
`avatarChip` (pure CSS class, e.g. `.avatar-chip-supporter::after`), applied in all
three chip call sites — my-card preview, remembered-friend rows, compare head — plus
`title`/aria text from the existing `account.supporterChip` string.

**Profile screen**: render the existing `account.supporterChip` ("Supporter ♥")
string as a chip in the profile name row when `isSupporter(ent)` — same conditional
pattern as the account panel's chip at `main.js:849`.

## Data flow

```
round ends → endBattle() assembles facts (existing path for bossDefeated/levelUps;
  freezesUsed newly carried) → supporter-moment-row.render(facts)
    → shouldShowSupporterMoment(state, facts, today)
      → show: unhide #r-supporter, recordSupporterMomentShown → store
      → deny: keep hidden (reason discarded; no logging)
tap CTA → goShopSupporter() → existing shop supporter card → existing iapBuy flow
purchase success (existing flow) → ent.supporter=true → line never shows again;
  ♥ badge appears on profile + next shared friend card (LCH3)
```

## Storage

- New key `nbhsk.supporterMoment` = `{ lastShownDay: "<dateStr>" }`, via
  `src/storage.js` `createStore` as always.
- **Local-only, deliberately NOT in `SYNC_KEYS`** — it is an impression cap;
  worst cross-device case is one extra quiet line on the other device. (Explicit
  sync-vs-local decision per AGENTS.md.)
- No migration ladder entry needed: new key, absence handled by `defaultState()`.

## Error handling

- All gating fails closed: provider absent/blank key/async check unresolved → row
  hidden, badge unaffected (badge depends only on local `ent` / decoded card).
- Malformed wire `supporter` field → `false`, never throws (codec clamps).
- `goShopSupporter` when shop shelf is hidden (race: billing turned off between
  render and tap) → plain shop screen, no crash — the reveal step is a no-op if the
  section is hidden.

## Testing

- `test/supporter-moment.test.js` — policy: each moment qualifies alone; no-moment
  denies; supporter denies; dark (`supporterOn=false`) denies; same-day cap denies;
  next-day allows; record round-trips state.
- `test/friend-compare.test.js` (extend) — LCH3 encode/decode round-trip with and
  without supporter; LCH1/LCH2 legacy decode still passes with `supporter:false`;
  hostile field values clamp; METRICS/compare rows unchanged.
- Row factory: DOM-level behavior via the established headless-chromium probe pattern
  on the **built** bundle (row present after a qualifying round with dev-IAP forced;
  absent when dark; absent for supporter), plus i18n keys auto-covered by the
  `i18n-usage` test.
- Full gate per house rules: `npm test` unmasked, lint, build, responsive sweep.

## Release

Mergeable to `development` dark at any time. User-visible only after the owner's
billing go-live (RC web key). Release cut = normal ritual: rebuild `dist/`, SHELL
bump + `sw-precache` pin in the same commit, suite re-run after the bump.

## Open items

- Native Thai review of the 2 new strings (joins the standing queue via `TH-REVIEW`).
- Cat Journey badge — explicitly deferred; revisit after this ships.
