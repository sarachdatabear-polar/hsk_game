# User Profile First — Implementation Plan

**Date:** 2026-07-15
**Priority:** Build and ship the player profile before expanding authentication.
**Estimated implementation:** 2–3 engineering days, excluding native Thai review and release observation.

## Goal

Give every player a useful profile immediately, including players who never sign in.
The profile should show their Lucky Cat identity, learning progress, streak, earned
stickers, and cosmetic collection in one place.

This first release is device-local and offline-first. It reuses data the game already
stores and does not require Google, Apple, OAuth redirects, new backend tables, or an
avatar-upload service.

## Product decision

Reuse the existing **Progress** bottom-navigation destination as the profile dashboard:

- Change the visible tab label from **Progress** to **Profile**.
- Keep the internal screen/route id `progress` to avoid unnecessary navigation churn.
- Keep detailed HSK progress and Needs Work tools on the same screen.
- Link to the existing Sticker Album and Shop/Collection instead of building duplicate
  album or inventory screens.

The profile works for all account states:

- Local player: profile and progress live on this device.
- Anonymous cloud guest: existing cloud save continues to work.
- Email account: existing cloud save continues to work.
- Future Google/Apple account: the same profile will be attached to the new identity.

## Profile screen

### 1. Identity card

Show at the top of the profile:

- Current equipped Lucky Cat appearance using an existing cat portrait/sprite.
- Player display name.
- Lucky Cat level.
- Current XP and progress to the next level.
- Current streak and coin balance.

The default localized name is **Lucky Learner** until the player chooses a name.
Provide a small **Edit name** action. Names are trimmed, whitespace is collapsed, and
the stored value is limited to 24 Unicode characters.

Store only:

```js
nbhsk.profile = { displayName: "" }
```

Do not store duplicated level, XP, streak, or collection totals in this object; derive
them from the existing authoritative game state.

### 2. Progress summary

Add compact summary cards for:

- Words mastered across HSK1–6.
- Words seen across HSK1–6.
- Current study streak.
- Earned stickers out of total available stickers.

Do not add an all-time accuracy statistic in this release. The game does not currently
persist total correct answers and total attempts, so presenting one would be inaccurate.

### 3. Collection summary

Show:

- Number of owned cosmetic items out of the collectible catalog total.
- Equipped skin and backdrop, falling back to **Default Cat** and **Default**.
- Number of stickers earned.
- **View Collection** button opening the existing Shop screen.
- **View Sticker Album** button opening the existing Album screen.

Exclude consumables such as Streak Freeze from the cosmetic collection denominator.
Decorative item tiers do not increase the owned-item count.

### 4. Existing learning tools

Keep the current profile-screen content below the new summary:

- Smart Review.
- HSK1–6 mastery bars.
- Seen/mastered counts.
- Needs Work list.
- Review These and Practice These actions.

## Architecture

Create `src/profile.js` as a small pure module. It should contain no DOM,
`localStorage`, network, or Supabase calls.

Suggested exports:

```js
export function defaultProfile()
export function normalizeDisplayName(value, maxLength = 24)
export function profileStats({ levels, mastery, stickerState, stickerDefs, shop, catalog })
export function equippedSummary(shop)
```

`profileStats()` should derive its totals from the same helpers and state already used by
the Progress screen, Sticker Album, and Shop. `main.js` remains the wiring/rendering
layer and owns persistence through the existing namespaced store helper.

## Implementation tasks

### Task 1 — Pure profile model

**Files:**

- Create `src/profile.js`.
- Create `test/profile.test.js`.

- [x] Implement display-name normalization, including empty, whitespace, Unicode, and
      maximum-length cases.
- [x] Derive total seen/mastered words without double-counting words across levels.
- [x] Derive earned/available sticker totals.
- [x] Derive owned/available cosmetics while excluding consumables.
- [x] Derive equipped labels with safe defaults when an old or removed item id exists.
- [x] Prove the helpers do not mutate their inputs.

### Task 2 — Profile dashboard UI

**Files:**

- Modify `index.html`.
- Modify `src/main.js`.
- Modify `src/i18n.js`.

- [x] Rename the visible Progress tab/title to Profile in English and Thai while keeping
      the internal `progress` route.
- [x] Add the identity card, XP bar, streak, coins, and Edit name control.
- [x] Add progress-summary cards.
- [x] Add the collection summary and links to Shop and Sticker Album.
- [x] Continue rendering the existing detailed progress and Needs Work sections below.
- [x] Use existing colors, spacing, card styles, icons, and cat assets.
- [x] Ensure all interactive controls meet the existing 44px tap-target floor.
- [x] Do not perform network work when the Profile screen opens.

### Task 3 — Account/profile bridge

**Files:**

- Modify `src/account.js` only if a display-name view field is needed.
- Modify `src/cloud.js` to include `display_name` in profile upserts when a cloud session
  exists.
- Extend `test/account.test.js` and `test/cloud.test.js` as appropriate.

- [x] Local players can create and edit a display name without connecting an account.
- [x] For an existing anonymous/email session, a name edit best-effort upserts
      `profiles.display_name` without blocking or breaking local gameplay.
- [x] Cloud errors remain silent/calm and never roll back the local name.
- [x] Sign out does not erase the device-local profile or gameplay progress.

This task uses the existing `profiles.display_name` database column; no schema migration
is required.

### Task 4 — Navigation and regression coverage

**Files:**

- Extend `test/nav.test.js` only if visible-label behavior needs coverage.
- Extend i18n usage/symmetry tests.
- Update responsive probes to open and inspect the new Profile layout.

- [x] Profile remains the active third bottom-navigation tab.
- [x] Shop returns safely to the expected screen.
- [x] Sticker Album remains under the Profile/Progress tab.
- [x] Existing Smart Review, Needs Work, and HSK progress actions still work.
- [x] Fresh profiles, mature profiles, and profiles with removed cosmetic ids render.
- [x] English and Thai layouts pass at 320px, 360px, 390px, tablet, and landscape
      widths.

### Task 5 — Verification and release

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run the responsive sweep.
- [x] Probe a fresh profile and a populated profile in both English and Thai.
- [x] Verify direct `file://` play and offline profile rendering.
- [x] Verify persisted name/profile data survives reload.
- [x] Run `npm run cap:sync` before the next Android cut.
- [x] Bump the service-worker `SHELL` version because this is a user-facing PWA change.

### Verification evidence

Verified on the VPS on 2026-07-16: 63 test files / 1,880 tests passed; the production
bundle built at 421.3 KB; the responsive harness passed 10/10 permanent viewports, 2/2
listening probes, and 3/3 Results probes. An isolated direct-`file://` Chromium probe
passed for a fresh English profile and a populated Thai profile, including Unicode name
normalization, reload persistence, offline rendering, and derived mastery/coin/equipped
skin state. `npm run cap:sync` completed successfully. The release candidate uses SHELL
v74.

## Acceptance criteria

The profile-first release is complete when:

- Every player can open Profile without logging in.
- The screen shows their cat, name, level, XP, streak, coins, mastery, and collection
  summary.
- Players can edit their local display name.
- Players can reach detailed HSK progress, Needs Work, Sticker Album, and Collection.
- Every displayed statistic comes from existing persisted game data.
- The feature remains fully useful offline.
- Existing email/guest cloud save still works.
- No Google or Apple setup is required to ship this release.

## Deferred authentication roadmap

Authentication becomes a later, separately releasable project:

1. Keep and polish the existing passwordless email-code flow.
2. Add Google sign-in and web/Android callback handling.
3. Add Sign in with Apple and its provider configuration.
4. Add provider-conflict handling and account deletion before an iOS store release.

The future login work should reuse this profile screen. A successful sign-in attaches
the existing device profile and reconciles its progress; it should not introduce a
second profile UI or require players to start over.

## Non-goals for the profile-first release

- Google or Apple authentication.
- Passwords or password-reset flows.
- Public/social profiles, friends, leaderboards, or profile search.
- Profile photos or camera/gallery permissions.
- Avatar uploads or new artwork.
- New cloud tables or database migrations.
- Global accuracy or play-time statistics that are not currently persisted.
