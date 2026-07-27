# Cat Journey v127 — post-deploy review findings

**Date:** 2026-07-27
**Range reviewed:** `013a4787..7fa2c721` (4 commits: `39c4961c`, `b0e3a054`,
`df875840`, `7fa2c721`)
**Status of that code:** **already live in production** at SHELL v127
(Pages run `30242642301`, 2026-07-27 06:24Z). It was auto-deployed unreviewed;
this document is the review that should have preceded it.

**Method:** three independent Fable reviewers, one per dimension (data layer /
feature + `main.js` wiring / content + i18n + assets + PWA shell), each told
that the code was live and that the 9,708 passing tests are not evidence of
correctness. Every finding below was re-verified by hand before being recorded.

**Attribution matters here.** Some findings predate this arc and are not
Codex's doing. Each is tagged **[NEW]** (introduced by this range) or
**[PRE-EXISTING]**.

---

## P0 — fix before anything else

### 1. [PRE-EXISTING] Identity-switch defeats the `sessionReconciled` latch → unrecoverable cloud data loss

`src/sync.js:33` (latch), `:320-323` (blind-push gate), `src/main.js:987`
(`onAccountVerify`) and `:990-998` (`onAccountSignOut`).

`sessionReconciled` is a bare module-scope boolean, set once at `sync.js:277`
and **keyed to nothing**. Neither sign-in nor sign-out resets it. Sequence:

1. Boot as guest → `syncEdge("sign-in")` reconciles the **guest uid** → latch `true`.
2. User signs into their real account → new uid → `reconcile` **fails on network**
   (latch correctly untouched — but it is still `true` from step 1).
3. Network recovers; a hide/interval edge reaches `pushDirty`. Dirty keys exist
   from guest play, `meta.dirty.monthly` is absent, latch is `true` → the blind
   branch (`sync.js:324-333`) upserts `rowsFromLocal(realUid, localSnapshot)`:
   a **full-row overwrite** of guest-era state onto the real account's
   `progress` and `wallet`. No merge ever ran for that uid.

For a reinstall-then-sign-in user the cloud row is their only copy, so this is
unrecoverable. Same class as the `2a4efae7` bricks-zeroing bug. The latch's own
comment claims it prevents exactly this; it does not hold across a uid change.

Dated 2026-07-19 in-comment — **this predates Cat Journey**. But the flag flip
(below) adds `cat_journey` to the clobber payload, so it widens.

**Fix shape:** record the uid alongside the latch and treat a different uid as
un-reconciled; or reset the latch in `onAccountVerify`/`onAccountSignOut`.

Orderings verified to hold: cooldown return, failed/aborted reconcile,
`midRound` deferral, and a failed final push after the merged writes.

### 2. [NEW] The daily-quest loop went dark for every user

`src/main.js:1302` rewrites `"street"` → `"cat-journey"` whenever
`CAT_JOURNEY_ENABLED` (default `true`), so the Street screen is unreachable.
`#street-quests-btn` (`index.html:1994`) lives inside `#s-street` and is the
**only** opener of `#quest-overlay`. `renderQuests()` is called only on the now
dead street branch (`main.js:1328`).

Every user on defaults completes 3 daily quests and fills the 40-quest monthly
bar with no way to see any of it, and the **1,500-coin monthly claim button is
dead UI**. Coins are not permanently lost — daily rewards auto-grant in
`questEvent` (`main.js:653`) and `settleMonthly` auto-pays an unclaimed complete
month at rollover (`src/quests.js:128-139`) — but the payout is silently delayed
by up to ~4 weeks and the whole loop is invisible.

Street Projects, the keepsakes viewer, and the resident collection are orphaned
the same way; quests is the only one holding an unclaimed currency reward.

---

## P1 — before flipping `CAT_JOURNEY_CLOUD_ENABLED`

### 3. [NEW] The flag-ON reconcile path has zero test coverage

`src/sync.js:248, 278, 330` call `localFromRows`/`rowsFromLocal` with no options
object, so they always read the module constant. The only flag-ON tests are pure
row-mapping units with an explicit override (`test/sync.test.js:86-89`). **No
test runs `reconcile` or `pushDirty` with the flag on.** The suite will stay
green after the flip regardless of what that path does.

Add a `reconcile`-level test with the enabled mapping (test seam or
`vi.mock` of `cloud-config`) asserting that a populated cloud `cat_journey`
survives a null-local reconcile and vice versa.

### 4. [NEW] `rowsFromLocal` coerces `l.catJourney || {}` — a push does not merge

`src/sync.js:69`. A never-opened-Journey device would upsert `{}` over another
device's state. Safe *today* only because `reconcile()` pushes post-merge and
`pushDirty`'s blind push sits behind the latch in finding 1 — which finding 1
shows is not airtight. Change to
`if (catJourneyCloudEnabled && l.catJourney != null)` at flip time.

### Verified sound (do not re-litigate without new evidence)

- **The `{}`-cloud merge is genuinely an identity on populated local state.**
  Cloud `'{}'::jsonb` → `normalizeCatJourney` → defaults; claims union by day,
  goal history unchanged (`""` throughDay contributes nothing), and at the
  `at=0` preference tie the lexical rule picks the **smaller** id — every
  `bg-cat-*` sorts before `bg-home` (confirmed against `CAT_BACKGROUNDS`,
  `cat-journey.js:6-11`), so a real selection survives.
- **`localSnapshot` includes `catJourney` unconditionally** (`sync.js:50`) — the
  bricks-class omission was *not* repeated.
- **Flag-flip enrolment has no dirty-bit hole.** `SYNC_KEYS = syncKeysFor()` at
  module load is safe because the flag is build-time; the flip is a rebuild.
  Pre-flip journey data is not stranded — `localSnapshot` always carries it.
- **`mergeCatJourney` is a sound CRDT**: commutative, idempotent; a returned
  claim can never revert to active; a set `storyId` is never dropped.
- **The v5→v6 migration is correct and idempotent**, verified against the actual
  v1 shape recovered from `b0e3a054`. Touches only `nbhsk.catJourney`;
  early-returns on absent/corrupt input; does not rewrite `shop`,
  `streetLayout`, or `mastery`.
- **Current dark-mode behaviour is safe**: no path writes `cat_journey` while
  dark; the SQL migration is additive and safe to apply *before* the flip; old
  cached bundles that upsert without the column leave it untouched.

---

## P2 — worth fixing, not blocking

### 5. [NEW] Hidden full re-render twice per answer, over unboundedly growing state

`src/main.js:309` (`addXp`) and `:493` (`noteDaily`) each call
`catJourneyScreen?.render()` on every answer. `render()` → `facts()`
(`ui/cat-journey-screen.js:44-57`) normalizes at least 3× (two
`JSON.stringify` in `same()`) and rebuilds up to 20 memory-card DOM trees —
**while the screen is hidden mid-battle**. Claims are permanent by design and
`goalHistory.days` grows one entry per goal day forever, so the per-answer cost
grows monotonically for the life of the profile. A two-year daily player on a
low-end Android absorbs this inside the battle loop.

### 6. [NEW] Clock-forward play locks the feature until the fake date arrives

`src/cat-journey.js:58-76`, `noteGoalDay`, and `journeyStatus` (`:301`) accept
future days with no clamp against now. Set the date forward, meet the goal, send
the cat, restore the clock → the cat reads "done"/"exploring" every real day
until the calendar catches up, with no in-app recovery short of deleting
`nbhsk.catJourney`. Self-inflicted and *not* a farming vector (the monotonic
guards hold), but the failure is unrecoverable in-app.

### 7. [NEW] 185 machine-drafted Thai strings live, none tagged, none in the review queue

Across the whole arc — ~60 memory titles/stories, ~45 journey UI strings, push
notification copy, reworked onboarding, plus `street.*`, `scope.*`, `profile.*`,
`album.*`, `shop.*`, `howto.*`, `battle.*`, `more.*` batches. **Zero** carry the
`TH-REVIEW` marker (the convention is established — 20+ tagged lines already
exist). `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md:51-63` declares itself
"a production release gate" with its native-review boxes unchecked, and it
shipped anyway.

Three strings **silently regressed Thai that had already passed the v112–v116
humanization arc**: `account.connect`, `learn.stillLearning`, `learn.knowIt`.

The review machinery cannot see any of it: `docs/i18n/thai-review-sheet.csv` has
zero `cat.*` rows and `docs/i18n/` was never touched. Worse,
`docs/i18n/scripts/extract-thai-review-sheet.mjs:26-41` has no rule for `cat.*`,
`home.cat.*`, or `notify.cat.*`, so on regeneration they all sort to **P3
(lowest)** — including notification copy that the script's own policy puts in
P0. Add a `notify.cat.*` → P0 rule and a `cat.`/`home.cat.` rule, tag the lines,
regenerate.

Structural i18n integrity is **clean**: EN and TH both 732 keys, zero missing
counterparts, zero placeholder mismatches. The defect is procedural, not broken
text.

---

## P3 — small, cheap, batch whenever

- **[NEW] Two-tab clobber.** `persist()` (`ui/cat-journey-screen.js:39-42`)
  writes whole state; no `storage` listener. Tab B can overwrite tab A's
  completed journey and lose that memory. Not farmable.
- **[NEW] `selectedBackgroundDevice` is dead.** No production caller supplies
  `device` (`ui/cat-journey-screen.js:208, 336`; `migrateV1` hard-codes `""`),
  so the device tie-break at `merge.js:104` is unreachable and
  `test/merge.test.js:104-115` asserts invented data — a test of the
  implementation, not a requirement. Plumb a real device id or delete the field.
  Matters *at flip*, when that LWW design is supposed to start working.
- **[NEW] `cat-journey-screen.js:208`** auto-demotion stamps
  `selectedBackgroundAt: 0`, unlike the user tap at `:336`. No reachable trigger
  found, but it would ping-pong against cloud if one appeared. Pass `{ at: now() }`.
- **[NEW] Double-tap "Send exploring"** (`ui/cat-journey-screen.js:317-318`)
  re-reads status as `"exploring"`, falls into the study-CTA branch, and yanks
  the user to the scope screen.
- **[NEW] First-visit-offline**: no journey art is precached and the keepsake
  `<img>` (`:127-131`) has no `onerror`, unlike the character image (`:221-224`)
  → broken-image glyph. Runtime cache covers it after one online view.
- **[PRE-EXISTING] `localeCompare` on hanzi** (`merge.js:67-70, 106`).
  Collation is runtime-locale dependent, so two devices in different locales can
  pick different winners for the same conflict → non-converging ping-pong. A
  codepoint compare (`a < b`) is locale-independent for free.
- **[NEW] Cosmetic**: the first flag-ON reconcile for journey-less users reports
  a spurious `changed: true` → a false "progress restored" toast, once per device.
- **[NEW] Stale doc**: `assets/_plan/CAT-JOURNEY-ASSET-MANIFEST-v1.md` still
  lists the poses as 1254×1254 (they are 512×512 since `7fa2c721`) and numbers
  destinations 2–5 against a runtime that uses 0-based tiers. A regeneration pass
  following it would reintroduce ~1.2 MB of oversized files.
- **[NEW] `scripts/responsive-sweep.mjs`** hardcodes expected Thai copy, so the
  sweep breaks the moment native review corrects those strings.

## Accepted, with the reasoning recorded

- **`mergeJourneyGoalHistory` is not associative** (`merge.js:72-83`). With
  `d1<d2<d3`, merge order decides whether a distinct goal day survives: one order
  totals 6, the other 5. Each *individual* fold is monotone, so the module's
  "no fold can lose progress" header holds per-fold — but the converged bond-day
  count depends on who syncs first. Bounded to **bond points only** (2/day); no
  inflation, no claim or memory loss. A perfect union is impossible because v1
  stored only a count. **Accepted** — amend the header comment rather than spend
  a remediation cycle. Re-examine only if bond points ever gate something real.

## Watch item

**Precache headroom is 64 KB.** 73 entries, 10,944,340 bytes against the
11,010,048-byte cap in `test/sw-precache.test.js:54-61` — 0.6% margin. The arc
did the right thing (all 7 journey images runtime-cached and explicitly
excluded), but `dist/app.js` grew to 659,749 bytes. The next ~65 KB of
always-loaded anything fails CI; the tempting wrong fix is raising the cap.

---

## Recommended sequencing

Two cuts, deliberately not bundled:

**v128 — the live defects.** Finding 1 (latch, uid-keyed) + finding 2 (a quest
entry point that survives the Street rewrite). Both are live and neither needs
the Supabase migration. Rebuild, SHELL v127→v128, bump the
`test/sw-precache.test.js` pin in the same commit, **re-run the full suite after
the bump** (the v117 lesson), then merge and live-verify.

**v129 — the cloud-sync flip.** Findings 3 and 4 first (test + push guard), then
apply `docs/supabase/migrations/2026-07-27-cat-journey.sql`, re-query to confirm
the column, flip the flag, rebuild, SHELL bump, and finish with a **two-device
check** — journey state is cross-device by definition, so one browser proves
nothing.

Owner-gated and parallel to both: native Thai sign-off (finding 7), the iPhone
on-device Cat Journey pass, and a signed v127+ APK/AAB.
