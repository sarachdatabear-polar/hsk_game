# v129 Cloud Flip + Open Release Gates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn on Cat Journey cloud sync (SHELL v129) without any existing user losing journey state, and clear the two documentation/pipeline blockers that stop the remaining owner gates from starting.

**Architecture:** Three tracks. **Track A** is the v129 release: two flag-independent code commits land first (a null guard and the missing flag-ON test), then the live Supabase migration is applied and re-queried, then a tiny flip commit ships. **Track B** unblocks native Thai review by fixing the sheet generator's priority rules and tagging the live Cat Journey strings. **Track C** is owner-only work (signed Android artifact, iPhone pass, Thai sign-off) — entry criteria and checklists, not agent tasks.

**Tech Stack:** Vanilla JS ES modules, esbuild, Vitest, Supabase (PostgREST + Management API), GitHub Pages auto-deploy on push to `main`.

## Global Constraints

- **Repo:** all work is in the **game repo** at `/root/work/HSK/game` (a separate nested git repo). **Never stage `game/` from the root repo.**
- **Branch flow:** commit on `development`, then merge `development` → `main` for the release. `main` == `development` == `d9374606` at plan time.
- **Branch discipline, because two tracks run in parallel.** `git merge --ff-only` appears in Tasks 4, 5, and 8, and only the *first* one is a fast-forward — after that, `main` has moved and the other track's `development` is behind it. **Before every `checkout development`, resync:**
  ```sh
  git checkout development && git merge --ff-only main
  ```
  Every merge step in this plan also ends on `main`, so the next task must check out `development` explicitly rather than assuming it is there. If `--ff-only` ever refuses, **stop** — that means the two tracks diverged and someone needs to look, not force it.
- **Pushing to `main` auto-deploys to production.** There is no staging environment. Treat every `main` merge as a prod rollout.
- **PWA cache busting:** any user-facing change bumps `CACHE_VERSION` in `sw.js`, and `test/sw-precache.test.js:93` pins that exact literal. **Bump both in the same commit, then re-run the full suite AFTER the bump** (the v117 lesson).
- **Gate commands, all must pass before any merge to `main`:** `npm test` (107 files / 9,709 tests), `npm run lint`, `npm run build`, `npm run assets:validate`.
- **Never pipe `npm test` to `tail`/`grep` when gating a commit** — it masks the exit code.
- **Precache headroom is 65,604 bytes** (10,944,444 of 11,010,048 used). Standing constraint, not a v129 task: v129 adds roughly zero bytes. Raising the cap is not an acceptable fix.
- **Supabase project ref:** `eqsodiufgjecoqgxdisn`. Management-API token at `/root/.supabase-token` (mode 0600). **Never echo the token into a commit, a log, or chat.**
- **`npm run apk:release` does not run on the VPS** — it is keystore-bound to Jordan's Windows desktop.
- **`dist/app.js` is tracked.** Any commit that changes `src/` must run `npm run build` and stage the rebuilt bundle, or the tree ships stale. Tasks 1–3 change only `src/sync.js` and tests; Task 4 rebuilds and stages once, which covers them.

---

## Findings that shaped this plan (verified this session, do not re-derive)

1. **The migration's `not null default '{}'` is safe.** At flip time every pre-existing `progress` row will carry `cat_journey = {}`, so `mergeCatJourney(realLocal, {})` fires for **100% of existing users** — this is the modal case, not an edge case. Traced it: `normalizeCatJourney({})` yields defaults; claims merge by day (union), `mergeJourneyGoalHistory` takes `Math.max` of counts and a union of days, `lastSeenBondTier` takes `Math.max`, and `journeyPreferenceOf` compares `selectedBackgroundAt` where the real side has a positive timestamp and the empty side has `0`. Every field is additive or max-folded. **The migration ships as written.** Task 2 pins this with a regression test so it cannot silently regress.
2. **`pushSyncRows` is a column-subset upsert** (`cloud.js:131`, plain PostgREST `.upsert(row)`). Omitted columns are left alone on conflict-update. This is what makes the Task 1 null guard work, and it is why the still-unreleased v74/v85 signed Android artifact — which pushes flag-OFF rows with no `cat_journey` key at all — cannot blank the column during mixed-client rollout.
3. **`merge.js:20` freezes `SYNC_KEYS = syncKeysFor()` at import time**, and `reconcile()` takes no options parameter. A test that only passes `{catJourneyCloudEnabled: true}` into `rowsFromLocal` exercises one leaf while every `SYNC_KEYS` consumer stays flag-OFF — a test that passes while testing nothing. **That is the exact failure mode v128 just wrote up** (the neutered no-arg test seam). Task 2 therefore uses a `vi.mock` of `cloud-config.js` in a **separate test file**, so the whole module graph is flag-ON, and the existing flag-OFF tests in `test/sync.test.js` stay flag-OFF.
4. **The live `progress` table has no `cat_journey` column yet** — confirmed by a read-only `information_schema` query through the Management API. That same API accepts DDL, so **applying the migration is agent work on the VPS, not an owner action.**
5. **The flip introduces a wrong toast unless the read side is guarded too.** `mergeAll`'s guard passes on the backfilled `{}`, synthesizing a default journey object; `baseline = mergeAll(local, null, …)` has no such key; so `changed` is `true` and `main.js:939` toasts `account.restored` at **every user who never opened the Cat tab**. Task 1 fixes this on the read side, symmetrically with the write side. Not data loss — but universal and wrong.
6. **All Cat Journey Thai lives in `STRINGS`.** `src/cat-memories.js` (the 30 stories / 12 keepsakes) holds **zero Thai characters** — ids only. So the sheet extractor's `STRINGS`-only reach is complete coverage, and Track B genuinely closes the gate rather than half-closing it.
7. **The two-device check is not agent-executable.** Anonymous auth mints a distinct uid per browser profile, and the other enabled providers (Google / Apple / magic-link) cannot be driven from the VPS. It is C4, an owner gate — not a step inside Task 5.
8. **The Thai review sheet is 349 rows stale, not 185.** Regenerating today yields 732 rows vs the committed 383. The P3 (unclassified) bucket is 181 rows, of which **`cat.` = 108** and **`quests.` = 1**. Those are the two missing priority rules: `cat.*` has no rule at all, and `quests.*` falls through because the P1 rule tests `startsWith("quest.")`, which `"quests.title"` does not match. The generator's placeholder/`<b>` parity guard currently passes clean.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/sync.js` | Modify (~line 76) | Omit `cat_journey` from the pushed row when local journey state is absent |
| `test/sync.test.js` | Modify (Task 1 adds one `it`; Task 4 makes two dark assertions explicit and relocates one test) | Pins the null guard; the rest stays default-path |
| `test/sync-cat-journey-cloud.test.js` | **Create** (Task 2) | `vi.mock`s `cloud-config.js` **on**, so `SYNC_KEYS` and `reconcile` run flag-ON end to end |
| `test/sync-cat-journey-dark.test.js` | **Create** (Task 4) | Mirror, `vi.mock`ed **off** — keeps rollback-path coverage that the flip would otherwise delete |
| `src/cloud-config.js` | Modify (line 12) | Flip `CAT_JOURNEY_CLOUD_ENABLED` to `true` |
| `sw.js` | Modify (line 13) | `CACHE_VERSION` → `"v129"` |
| `test/sw-precache.test.js` | Modify (line 93) | Pin the new literal |
| `docs/i18n/scripts/extract-thai-review-sheet.mjs` | Modify (RULES array) | Add the `cat.` and `quests.` priority rules |
| `docs/i18n/thai-review-sheet.csv` | Regenerate | The reviewer-facing queue |
| `src/i18n.js` | Modify (th block) | `// TH-REVIEW` markers on the untagged Cat Journey strings |
| `docs/STATUS.md`, `docs/OWNER-ACTIONS.md`, `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md`, root `HANDOFF.md` | Modify | Record what actually shipped |

---

# TRACK A — the v129 cloud flip

## Task 1: Make "empty means absent" symmetric on both sides of the column

**One rule, both directions.** The column is `not null`, so "no journey state" cannot be expressed as `null` on the wire — it has to be an **omitted key** going up and a **skipped assignment** coming down.

**Write side.** Today `rowsFromLocal` sends `{}` when local journey state is missing. `pushSyncRows` is a column-subset upsert, so an omitted key preserves the stored value — but `{}` overwrites it. `pushDirty`'s post-reconcile path writes that row directly with no merge, so a client whose `nbhsk.catJourney` key is missing would blank a real cloud journey.

**Read side — this one is a defect the flip would otherwise introduce, traced this session.** The migration backfills every existing row to `{}`. With the flag on, `localFromRows` sets `local.catJourney = {}`; mergeAll's `l.catJourney != null || c.catJourney != null` guard (merge.js:379) passes on the non-null `{}`; and `mergeCatJourney(null, {})` returns a **full default object**. Meanwhile `baseline = mergeAll(local, null, …)` (sync.js:257) has **no `catJourney` key at all**, so `changed = !eq(merged, baseline)` is **true**. And `main.js:939` does:

```js
if(r.ok && reason === "sign-in" && r.changed) toast(t("account.restored"));
```

So **every user who has never opened the Cat tab gets a spurious "restored your account" toast on their first sign-in after v129**, plus a default journey object written into `localStorage` where there was previously nothing. No data is lost, but it is a visible, universal, wrong message. Treating an empty `{}` as absent on read fixes both.

This whole task is flag-independent and safe to land before the migration.

**Files:**
- Modify: `src/sync.js:76` (write side) and `src/sync.js:90` (read side)
- Test: `test/sync.test.js` (add after the existing `"Cat Journey row mapping is present only when the backend capability is enabled"` test, ~line 90)

**Interfaces:**
- Consumes: `rowsFromLocal(userId, l, { catJourneyCloudEnabled })` and `localFromRows(progressRow, walletRow, { catJourneyCloudEnabled })` — unchanged signatures.
- Produces: with the flag on, `rowsFromLocal` emits `progress.cat_journey` **only when `l.catJourney` is non-null**, and `localFromRows` sets `local.catJourney` **only when `p.cat_journey` is a non-empty object**. Tasks 2 and 4 both rely on this.

- [ ] **Step 1: Write the failing test**

Add to `test/sync.test.js`, inside the `describe("row mapping", ...)` block:

```js
  it("omits cat_journey entirely when there is no local journey state (never blanks the cloud column)", () => {
    // The column is `not null default '{}'`, so absence CANNOT be sent as null.
    // pushSyncRows is a column-subset upsert, so an omitted key preserves
    // whatever the cloud row already holds. Sending `{}` would instead
    // overwrite a real journey on pushDirty's direct (unmerged) push path.
    const missing = rowsFromLocal("u1", {}, { catJourneyCloudEnabled: true });
    expect(missing.progress).not.toHaveProperty("cat_journey");
    const nulled = rowsFromLocal("u1", { catJourney: null }, { catJourneyCloudEnabled: true });
    expect(nulled.progress).not.toHaveProperty("cat_journey");
    // A real value still rides.
    const real = normalizeCatJourney({ ...defaultCatJourney(), lastSeenBondTier: 1 });
    expect(rowsFromLocal("u1", { catJourney: real }, { catJourneyCloudEnabled: true })
      .progress.cat_journey).toEqual(real);
  });

  it("reads the migration's {} backfill as ABSENT, not as an empty journey", () => {
    // The migration backfills every existing row to `{}`. Mapping that to a
    // local value makes mergeAll synthesize a full default object, which
    // differs from the null-cloud baseline — so reconcile reports changed:true
    // and main.js:939 toasts "account.restored" at every user who has never
    // opened the Cat tab. Absent on the wire must stay absent locally.
    expect(localFromRows({ cat_journey: {} }, null, { catJourneyCloudEnabled: true }))
      .not.toHaveProperty("catJourney");
    expect(localFromRows({}, null, { catJourneyCloudEnabled: true }))
      .not.toHaveProperty("catJourney");
    // A real value still comes through.
    const real = normalizeCatJourney({ ...defaultCatJourney(), lastSeenBondTier: 1 });
    expect(localFromRows({ cat_journey: real }, null, { catJourneyCloudEnabled: true }).catJourney)
      .toEqual(real);
  });
```

- [ ] **Step 2: Run both and confirm they FAIL**

```bash
cd /root/work/HSK/game && npx vitest run test/sync.test.js -t "omits cat_journey entirely"
cd /root/work/HSK/game && npx vitest run test/sync.test.js -t "reads the migration"
```

Expected: FAIL on both — the first reports the row *does* have `cat_journey` (value `{}`); the second reports `catJourney` present as `{}`. If either passes, stop: that guard is already present.

- [ ] **Step 3: Implement both guards**

In `src/sync.js`, replace line 76:

```js
  if (catJourneyCloudEnabled) progress.cat_journey = l.catJourney || {};
```

with:

```js
  // Omit rather than default to `{}`. The column is `not null`, so absence has
  // to be expressed as a MISSING KEY — pushSyncRows is a PostgREST column-subset
  // upsert, so an omitted column keeps its stored value on conflict-update.
  // Sending `{}` would let a client with no local journey state blank a real
  // cloud journey on pushDirty's direct (unmerged) push path.
  if (catJourneyCloudEnabled && l.catJourney != null) progress.cat_journey = l.catJourney;
```

…and replace line 90:

```js
  if (catJourneyCloudEnabled) local.catJourney = p.cat_journey;
```

with:

```js
  // The mirror of the write guard above, and it is load-bearing at the v129
  // flip: the migration backfills every pre-existing row to `{}`, and mapping
  // that to a local value makes mergeAll synthesize a full default journey
  // object (merge.js:379's `!= null` guard passes on `{}`). That differs from
  // the null-cloud baseline, so reconcile returns changed:true and main.js
  // toasts "account.restored" at every user who has never opened the Cat tab.
  // Empty on the wire means absent.
  if (catJourneyCloudEnabled && p.cat_journey && Object.keys(p.cat_journey).length) {
    local.catJourney = p.cat_journey;
  }
```

- [ ] **Step 4: Run the full sync suite and confirm PASS**

```bash
cd /root/work/HSK/game && npx vitest run test/sync.test.js
```

Expected: all pass, including the pre-existing `"Cat Journey row mapping is present only when the backend capability is enabled"` test (it passes a real `catJourney`, so it is unaffected).

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game && git checkout development
git add src/sync.js test/sync.test.js
git commit -m "fix(sync): treat an empty cat_journey as absent in both directions

The column is not-null, so absence must be an omitted key, not {}.

Write side: PostgREST's subset upsert preserves omitted columns, but sending {}
let a client with no local journey blank a real cloud journey on pushDirty's
unmerged push path.

Read side: the migration backfills every pre-existing row to {}, which mergeAll
would turn into a synthesized default journey object — differing from the
null-cloud baseline, so reconcile returns changed:true and main.js toasts
'account.restored' at every user who has never opened the Cat tab.

Flag-independent — lands ahead of the v129 flip."
```

---

## Task 2: The missing flag-ON reconcile test

**This is the task that protects every existing user.** It must exercise the real module constants, not an injected option — otherwise it repeats v128's neutered-seam mistake. A separate file with a hoisted `vi.mock` gives a genuinely flag-ON module graph (including `merge.js`'s import-time `SYNC_KEYS`) while leaving `test/sync.test.js` flag-OFF.

**Files:**
- Create: `test/sync-cat-journey-cloud.test.js`
- Modify: none

**Interfaces:**
- Consumes: `rowsFromLocal` from Task 1; `reconcile(store, reason, now)` and `__resetForTests()` from `src/sync.js`; `__setClientForTests(client)` from `src/cloud.js`; `SYNC_KEYS` from `src/merge.js`; `defaultCatJourney`/`normalizeCatJourney` from `src/cat-journey.js`.
- Produces: no production API. Its guarantee — "an existing user's journey survives the flip" — is what Task 4 depends on.

- [ ] **Step 1: Create the flag-ON test file**

Create `test/sync-cat-journey-cloud.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";

// THE WHOLE POINT OF A SEPARATE FILE. merge.js computes
// `export const SYNC_KEYS = syncKeysFor()` at import time, and reconcile()
// takes no options parameter — so passing {catJourneyCloudEnabled:true} into a
// leaf helper would leave every SYNC_KEYS consumer flag-OFF and produce a test
// that passes while testing nothing (exactly the neutered-seam failure the
// v128 review documented). vi.mock is hoisted above the imports below, so the
// entire module graph loads flag-ON here, and test/sync.test.js stays flag-OFF.
vi.mock("../src/cloud-config.js", async (importOriginal) => ({
  ...(await importOriginal()),
  CAT_JOURNEY_CLOUD_ENABLED: true,
}));

const { reconcile, rowsFromLocal, localFromRows, __resetForTests } = await import("../src/sync.js");
const { __setClientForTests } = await import("../src/cloud.js");
const { SYNC_KEYS } = await import("../src/merge.js");
const { defaultCatJourney, normalizeCatJourney } = await import("../src/cat-journey.js");

const SESSION = { user: { id: "u1", is_anonymous: false } };

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d),
    set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); },
    _raw: m,
  };
}

// Mirrors test/sync.test.js's fakeClient, trimmed to the branches this file
// needs (progress/wallet select + upsert, and the ledger chain reconcile
// always walks). Duplicated deliberately: those helpers are file-local, and
// importing across test files would drag the flag-OFF graph in here.
function fakeClient({ session, progressRow = null, walletRow = null } = {}) {
  const calls = { upserts: [] };
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    from: (table) => {
      if (table === "ledger") {
        return { select: () => ({ eq: () => ({
          not: () => ({ gt: () => ({ order: async () => ({ data: [], error: null }) }) }),
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }) }) };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: table === "progress" ? progressRow : walletRow, error: null }) }) }),
        upsert: async (row) => { calls.upserts.push({ table, row }); return { error: null }; },
      };
    },
  };
  return { client, calls };
}

beforeEach(() => { __resetForTests(); __setClientForTests(null); delete globalThis.navigator; });

describe("Cat Journey cloud sync, flag ON", () => {
  it("catJourney is a synced key when the capability is on", () => {
    expect(SYNC_KEYS).toContain("catJourney");
  });

  it("THE FLIP-DAY CASE: a migration-default {} cloud row does not erase real local journey state", async () => {
    // 2026-07-27-cat-journey.sql adds the column as `not null default '{}'`, so
    // on the first flag-ON reconcile EVERY pre-existing row reads back as {}.
    // This is the modal case at flip time, not an edge case.
    const local = normalizeCatJourney({
      ...defaultCatJourney(),
      lastSeenBondTier: 2,
      claims: [{ day: "2026-07-26", returnedAt: 1000, storyId: "garden-leaf", keepsakeId: "leaf" }],
    });
    const store = memStore({ catJourney: local });
    const { client, calls } = fakeClient({
      session: SESSION,
      progressRow: { user_id: "u1", cat_journey: {} },
      walletRow: { user_id: "u1", coins: 0, freezes: 0 },
    });
    __setClientForTests(client);

    const r = await reconcile(store, "sign-in", 1_000_000);

    expect(r.ok).toBe(true);
    const after = store.get("catJourney", null);
    expect(after.claims).toHaveLength(1);
    expect(after.claims[0].storyId).toBe("garden-leaf");
    expect(after.claims[0].keepsakeId).toBe("leaf");
    expect(after.lastSeenBondTier).toBe(2);
    // …and the merged state is what gets pushed back, not the empty cloud row.
    const pushed = calls.upserts.find((u) => u.table === "progress").row;
    expect(pushed.cat_journey.claims).toHaveLength(1);
  });

  it("THE OTHER FLIP-DAY CASE: a user who never opened the Cat tab sees no change at all", async () => {
    // The larger population: local catJourney absent, cloud row backfilled to
    // {} by the migration. Task 1's read guard is what keeps this inert —
    // without it mergeAll synthesizes a default journey, changed flips true,
    // and main.js:939 toasts "account.restored" at everyone.
    const store = memStore({ sync: { dirty: {}, lastSyncAt: 0 } });
    const { client, calls } = fakeClient({
      session: SESSION,
      progressRow: { user_id: "u1", xp: 0, mastery: {}, daily: {}, quests: {},
        monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} }, cat_journey: {} },
      walletRow: { user_id: "u1", coins: 0, freezes: 0 },
    });
    __setClientForTests(client);

    const r = await reconcile(store, "sign-in", 1_000_000);

    expect(r.ok).toBe(true);
    expect(r.changed).toBe(false);                       // no spurious "account.restored" toast
    expect(store.get("catJourney", null)).toBe(null);    // nothing synthesized into localStorage
    const pushed = calls.upserts.find((u) => u.table === "progress").row;
    expect(pushed).not.toHaveProperty("cat_journey");    // and nothing pushed back
  });

  it("a real cloud journey lands locally on a device that has none", async () => {
    const cloud = normalizeCatJourney({
      ...defaultCatJourney(),
      claims: [{ day: "2026-07-25", returnedAt: 500, storyId: "rooftop-bell" }],
    });
    const store = memStore({});
    const { client } = fakeClient({
      session: SESSION,
      progressRow: { user_id: "u1", cat_journey: cloud },
      walletRow: { user_id: "u1", coins: 0, freezes: 0 },
    });
    __setClientForTests(client);

    expect((await reconcile(store, "sign-in", 1_000_000)).ok).toBe(true);
    expect(store.get("catJourney", null).claims[0].storyId).toBe("rooftop-bell");
  });

  it("two devices' claims union rather than last-write-wins", async () => {
    const localState = normalizeCatJourney({
      ...defaultCatJourney(),
      claims: [{ day: "2026-07-26", returnedAt: 1000, storyId: "garden-leaf" }],
    });
    const cloudState = normalizeCatJourney({
      ...defaultCatJourney(),
      claims: [{ day: "2026-07-25", returnedAt: 500, storyId: "rooftop-bell" }],
    });
    const store = memStore({ catJourney: localState });
    const { client } = fakeClient({
      session: SESSION,
      progressRow: { user_id: "u1", cat_journey: cloudState },
      walletRow: { user_id: "u1", coins: 0, freezes: 0 },
    });
    __setClientForTests(client);

    expect((await reconcile(store, "sign-in", 1_000_000)).ok).toBe(true);
    expect(store.get("catJourney", null).claims.map((c) => c.day).sort())
      .toEqual(["2026-07-25", "2026-07-26"]);
  });

  it("round-trips through the row mapping with the real module constant", () => {
    const state = normalizeCatJourney({ ...defaultCatJourney(), lastSeenBondTier: 1 });
    const row = rowsFromLocal("u1", { catJourney: state }).progress;
    expect(row.cat_journey).toEqual(state);
    expect(localFromRows(row, null).catJourney).toEqual(state);
  });
});
```

- [ ] **Step 2: Run it and confirm it PASSES**

```bash
cd /root/work/HSK/game && npx vitest run test/sync-cat-journey-cloud.test.js
```

Expected: 6 pass. These are characterization tests over merge code that Task 1 has already corrected — passing first time is the expected outcome. Step 3 is what proves they are not vacuous.

- [ ] **Step 3: RED-CHECK — prove the tests can actually fail (do not skip)**

A green test over existing behavior is worthless until you have watched it go red. Run **both** probes, and revert each immediately.

Probe A — prove the flag-ON graph is real (not the flag-OFF one):

```bash
cd /root/work/HSK/game
# temporarily neuter the mock: change CAT_JOURNEY_CLOUD_ENABLED: true -> false
sed -i 's/CAT_JOURNEY_CLOUD_ENABLED: true,/CAT_JOURNEY_CLOUD_ENABLED: false,/' test/sync-cat-journey-cloud.test.js
npx vitest run test/sync-cat-journey-cloud.test.js   # EXPECT: failures
git checkout -- test/sync-cat-journey-cloud.test.js
```

Expected: the `SYNC_KEYS` test and the round-trip test fail. If everything still passes, the mock is not taking effect — fix that before continuing, because the whole file is then testing the flag-OFF path.

Probe C — prove the "never opened the Cat tab" test would catch the toast regression:

```bash
cd /root/work/HSK/game
# temporarily revert Task 1's read guard to the unconditional assignment
sed -i 's/  if (catJourneyCloudEnabled \&\& p.cat_journey \&\& Object.keys(p.cat_journey).length) {/  if (catJourneyCloudEnabled) { \/\/PROBE/' src/sync.js
npx vitest run test/sync-cat-journey-cloud.test.js   # EXPECT: THE OTHER FLIP-DAY CASE fails
git checkout -- src/sync.js
```

Expected: `"THE OTHER FLIP-DAY CASE"` fails on `r.changed` being `true`. That assertion is the one standing between v129 and a wrong toast at every existing user.

Probe B — prove the flip-day test would catch an LWW regression:

```bash
cd /root/work/HSK/game
# temporarily make the cloud side win wholesale in mergeAll
sed -i 's/    merged.catJourney = mergeCatJourney(l.catJourney, c.catJourney);/    merged.catJourney = c.catJourney;/' src/merge.js
npx vitest run test/sync-cat-journey-cloud.test.js   # EXPECT: flip-day test fails
git checkout -- src/merge.js
```

Expected: `"THE FLIP-DAY CASE"` fails on `after.claims` being empty. Confirm `git status` is clean of all three probes before Step 4.

- [ ] **Step 4: Run the full suite and the linter**

```bash
cd /root/work/HSK/game && npm test && npm run lint
```

Expected: 108 files (one new), 9,714 tests, exit 0. Do not pipe to `tail` or `grep`.

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add test/sync-cat-journey-cloud.test.js
git commit -m "test(sync): flag-ON Cat Journey cloud coverage, incl. the migration-default {} case

Separate file with a hoisted vi.mock of cloud-config so the WHOLE module graph
loads flag-ON — merge.js freezes SYNC_KEYS at import and reconcile() takes no
options, so an injected-option test would leave SYNC_KEYS flag-OFF and pass
while testing nothing (the v128 neutered-seam failure mode).

Pins the modal flip-day case: the migration adds cat_journey as
not null default '{}', so every pre-existing row reads back {} on the first
flag-ON reconcile. Red-checked against both a flag-OFF mock and an LWW merge."
```

---

## Task 3: Apply the migration to the live project and confirm the column

**This is the gate, not a step.** No flag flip may be committed until the re-query in Step 3 returns the column. Read the rollback note at the end of this task before starting.

**Files:**
- Applies: `docs/supabase/migrations/2026-07-27-cat-journey.sql` (**unchanged** — see Finding 1; the `not null default '{}'` is safe and Task 2 pins why)
- Modifies: nothing in the repo

- [ ] **Step 1: Confirm the column is absent (baseline)**

```bash
cd /root/work/HSK/game
TOKEN=$(cat /root/.supabase-token)
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name from information_schema.columns where table_schema='"'"'public'"'"' and table_name='"'"'progress'"'"' and column_name='"'"'cat_journey'"'"';"}'
```

Expected: `[]`. If it already returns a row, the migration was applied elsewhere — skip to Step 3 and record that.

- [ ] **Step 2: Apply the migration**

The SQL file is idempotent (`add column if not exists`) and wrapped in a transaction. Send it verbatim rather than retyping it:

```bash
cd /root/work/HSK/game
TOKEN=$(cat /root/.supabase-token)
node -e '
const fs=require("fs");
const q=fs.readFileSync("docs/supabase/migrations/2026-07-27-cat-journey.sql","utf8");
process.stdout.write(JSON.stringify({query:q}));
' > /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/migration.json
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/migration.json
```

Expected: a success response with no `error` / `message` field. If the API rejects the `begin;`/`commit;` wrapper (it runs statements in its own transaction), re-send with only the `alter table` and `comment on` statements — the file's semantics are unchanged.

- [ ] **Step 3: Re-query and confirm — THIS IS THE GATE**

```bash
TOKEN=$(cat /root/.supabase-token)
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='"'"'public'"'"' and table_name='"'"'progress'"'"' and column_name='"'"'cat_journey'"'"';"}'
```

Expected exactly:

```json
[{"column_name":"cat_journey","data_type":"jsonb","is_nullable":"NO","column_default":"'{}'::jsonb"}]
```

If this does not match, **stop**. Do not proceed to Task 4.

- [ ] **Step 4: Confirm RLS still covers the new column**

```bash
TOKEN=$(cat /root/.supabase-token)
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select relrowsecurity from pg_class where oid = '"'"'public.progress'"'"'::regclass;"}'
```

Expected: `[{"relrowsecurity":true}]`. Table-level RLS covers all columns, so no policy change is needed — this step just proves it was not disabled.

- [ ] **Step 5: Record the evidence (no commit yet)**

Paste the Step 3 and Step 4 outputs into the Track A section of root `HANDOFF.md` as the migration-applied record. It is committed as part of Task 5.

**Rollback note — read before Step 2.** Adding the column is safe and reversible (`alter table public.progress drop column cat_journey;`) *while the flag is off*, because nothing reads or writes it. Once Task 4 ships, rollback is **asymmetric**: reverting `CAT_JOURNEY_CLOUD_ENABLED` fixes new clients, but any device that has already merged against a cloud row has written merged state into `localStorage`, and that is not undone by a flag. Task 2's tests are the safety net here — "we can revert" is not.

---

## Task 4: Flip the flag and cut SHELL v129

Keep this commit tiny. It is the prod rollout.

**Files:**
- Modify: `src/cloud-config.js:12`
- Modify: `sw.js:13`
- Modify: `test/sw-precache.test.js:93`

**Interfaces:**
- Consumes: Task 1's guard, Task 2's tests, Task 3's confirmed column.
- Produces: `CAT_JOURNEY_CLOUD_ENABLED === true`; `CACHE_VERSION === "v129"`.

- [ ] **Step 1: Flip the flag**

In `src/cloud-config.js`, replace lines 8–12:

```js
// Dark until docs/supabase/migrations/2026-07-27-cat-journey.sql is applied
// to the live project. Keeping the capability explicit prevents an older
// progress table from rejecting every sync upsert because it has no
// cat_journey column yet.
export const CAT_JOURNEY_CLOUD_ENABLED = false;
```

with:

```js
// LIVE since v129 (2026-07-27): docs/supabase/migrations/2026-07-27-cat-journey.sql
// is applied to project eqsodiufgjecoqgxdisn and the column was re-queried as
// jsonb / not null / default '{}'. The constant stays explicit so the
// capability can be darkened again for NEW clients if the column ever has to
// be rolled back — note that already-merged local state is not undone by that.
export const CAT_JOURNEY_CLOUD_ENABLED = true;
```

- [ ] **Step 2: Rehome the two flag-OFF tests the flip invalidates**

**Two tests in `test/sync.test.js` will fail the moment the flag flips, and this is predicted, not discovered.** Both assert dark-capability behavior against the module default, which the flip changes:

1. **Line ~85**, inside `"Cat Journey row mapping is present only when the backend capability is enabled"`:
   `const dark = rowsFromLocal("u1", { catJourney }); expect(dark.progress).not.toHaveProperty("cat_journey");`
   `catJourney` is a real value, so flag-ON now emits the column.
2. **Line ~150**, the whole `"dark Cat Journey capability preserves local state and omits the unknown cloud column"` test. It goes through `reconcile()`, which takes **no options parameter** — so it cannot be made explicit with an argument.

(Line ~76 is fine — that local has no `catJourney` key, so Task 1's guard omits the column either way. Do not touch it.)

Fix #1 in place, by making the dark assertion explicit instead of relying on a default that no longer means what it did:

```js
    const dark = rowsFromLocal("u1", { catJourney }, { catJourneyCloudEnabled: false });
    expect(dark.progress).not.toHaveProperty("cat_journey");
```

…and in the same test, change the final line from the bare-default form to an explicit one:

```js
    expect(localFromRows(enabled.progress, null, { catJourneyCloudEnabled: false }))
      .not.toHaveProperty("catJourney");
```

Fix #2 by **moving** the test, not deleting it. The rollback path still matters — a flag-OFF client must not choke on the now-present cloud column — and `reconcile()` can only be driven flag-OFF by mocking the constant. Create `test/sync-cat-journey-dark.test.js` as the mirror of Task 2's file:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mirror of test/sync-cat-journey-cloud.test.js, pinned the other way. Since
// v129 the module default is TRUE, and reconcile() takes no options parameter,
// so the rollback path (a flag-OFF client meeting a cloud row that now HAS a
// cat_journey column) can only be exercised by mocking the constant. This test
// moved here from test/sync.test.js when the flag flipped.
vi.mock("../src/cloud-config.js", async (importOriginal) => ({
  ...(await importOriginal()),
  CAT_JOURNEY_CLOUD_ENABLED: false,
}));

const { reconcile, __resetForTests } = await import("../src/sync.js");
const { __setClientForTests } = await import("../src/cloud.js");
const { defaultCatJourney, normalizeCatJourney } = await import("../src/cat-journey.js");

const SESSION = { user: { id: "u1", is_anonymous: false } };

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d),
    set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); },
    _raw: m,
  };
}

function fakeClient({ session, progressRow = null, walletRow = null } = {}) {
  const calls = { upserts: [] };
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    from: (table) => {
      if (table === "ledger") {
        return { select: () => ({ eq: () => ({
          not: () => ({ gt: () => ({ order: async () => ({ data: [], error: null }) }) }),
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }) }) };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: table === "progress" ? progressRow : walletRow, error: null }) }) }),
        upsert: async (row) => { calls.upserts.push({ table, row }); return { error: null }; },
      };
    },
  };
  return { client, calls };
}

beforeEach(() => { __resetForTests(); __setClientForTests(null); delete globalThis.navigator; });

describe("Cat Journey rollback path, flag OFF", () => {
  it("preserves local journey state and never pushes the column", async () => {
    const catJourney = normalizeCatJourney({
      ...defaultCatJourney(),
      claims: [{ day: "2026-07-27", returnedAt: 10, storyId: "garden-leaf" }],
    });
    const { client, calls } = fakeClient({
      session: SESSION,
      // The column EXISTS in the cloud row now — that's the post-v129 world a
      // rolled-back client actually meets. It must be ignored, not merged.
      progressRow: { user_id: "u1", xp: 0, mastery: {}, daily: {}, quests: {},
        monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} },
        cat_journey: { v: 2, claims: [{ day: "2026-07-20", returnedAt: 1 }] } },
      walletRow: { user_id: "u1", coins: 0, freezes: 0 },
    });
    __setClientForTests(client);
    const store = memStore({ catJourney, sync: { dirty: {}, lastSyncAt: 0 } });

    const r = await reconcile(store, "sign-in", 1_000_000);

    expect(r.ok).toBe(true);
    expect(store.get("catJourney", null)).toEqual(catJourney);
    const pushed = calls.upserts.find((call) => call.table === "progress").row;
    expect(pushed).not.toHaveProperty("cat_journey");
  });
});
```

Then **delete** the now-relocated test from `test/sync.test.js` (the whole `it("dark Cat Journey capability preserves local state and omits the unknown cloud column", …)` block, ~lines 150–166).

**Do not "fix" either test by weakening an assertion.** If a failure appears that is *not* one of these two, stop and investigate — that is a real finding.

- [ ] **Step 3: Bump the shell version and its pin, in this same commit**

`sw.js:13`: `const CACHE_VERSION = "v128";` → `const CACHE_VERSION = "v129";`

`test/sw-precache.test.js:93`: `expect(swSrc).toContain('const CACHE_VERSION = "v128"');` → `…"v129"');`

Leave `AUDIO_VERSION` alone — no audio changed.

- [ ] **Step 4: Run the ENTIRE gate AFTER the bump**

```bash
cd /root/work/HSK/game && npm test && npm run lint && npm run build && npm run assets:validate
```

Expected: exit 0 on all four, 109 test files (Task 2's plus Step 2's), and the test count up by roughly 5 from 9,709 net of the one relocated test. Two things to check in the output:
1. `test/sync.test.js` passes with the Step 2 edits applied. Any *other* failure is a real finding — investigate, do not weaken the assertion.
2. `dist/app.js` size and the precache total. Note both; expect a delta of well under 1 KB against the 65,604-byte headroom.

- [ ] **Step 5: Browser-verify the built artifact before pushing**

```bash
cd /root/work/HSK/game && npm run qa:cat-journey
```

Expected: PASS at 320×568, 390×844, 844×390, zero JS errors. Cloud sync is inert for an anonymous local run — this confirms the flip broke nothing in the UI path, not that sync works. Sync is confirmed in Task 5.

- [ ] **Step 6: Commit and merge to `main` (this deploys)**

```bash
cd /root/work/HSK/game
# dist/app.js IS tracked in this repo — omitting it ships a stale bundle and
# breaks Task 5's local-vs-live SHA comparison. `npm run build` in Step 4
# regenerated it; stage it.
git add src/cloud-config.js sw.js dist/app.js test/sw-precache.test.js \
        test/sync.test.js test/sync-cat-journey-dark.test.js
git commit -m "feat(sync): enable Cat Journey cloud sync — SHELL v129

Migration 2026-07-27-cat-journey.sql applied to eqsodiufgjecoqgxdisn; column
re-queried as jsonb/not null/default '{}'. Flag-ON coverage landed ahead of
this in test/sync-cat-journey-cloud.test.js, including the modal flip-day case
(every pre-existing row reads back {}).

The two dark-capability tests the flip invalidates are made explicit / moved to
test/sync-cat-journey-dark.test.js rather than weakened — the rollback path
still needs coverage, and reconcile() takes no options.

SHELL v128 -> v129 with the sw-precache pin in the same commit; full suite
re-run after the bump."
git push origin development
git checkout main && git merge --ff-only development && git push origin main
```

- [ ] **Step 7: Watch the deploy**

```bash
cd /root/work/HSK/game && gh run list --limit 3
```

Wait for the `deploy-pages.yml` run to report SUCCESS. Record the run ID.

---

## Task 5: Post-deploy verification and the two-device check

**Files:**
- Modify: root `/root/work/HSK/HANDOFF.md`, `game/docs/STATUS.md`, `game/docs/OWNER-ACTIONS.md`

- [ ] **Step 1: Verify what is actually live**

```bash
cd /root/work/HSK/game
curl -s https://luckycathsk.com/sw.js | grep -n "CACHE_VERSION\|AUDIO_VERSION"
curl -s -o /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/live-app.js https://luckycathsk.com/dist/app.js
sha256sum /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/live-app.js dist/app.js
grep -c "CAT_JOURNEY_CLOUD_ENABLED\|cat_journey" /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/live-app.js
```

Expected: `"v129"`, AUDIO unchanged at v1, and the two SHA-256 hashes **identical**. (If `luckycathsk.com` is not yet the live origin, use the GitHub Pages URL recorded in `docs/STATUS.md`.)

- [ ] **Step 2: Confirm a real row round-trips**

The client is anonymous-auth, so a live write is testable without a password. In a browser on the live site: open Cat Journey, send the cat out, then confirm the row server-side:

```bash
TOKEN=$(cat /root/.supabase-token)
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select user_id, jsonb_array_length(coalesce(cat_journey->'"'"'claims'"'"','"'"'[]'"'"'::jsonb)) as claims, updated_at from public.progress where cat_journey <> '"'"'{}'"'"'::jsonb order by updated_at desc limit 5;"}'
```

Expected: at least one row with a non-empty `cat_journey` and a recent `updated_at`.

- [ ] **Step 3: Confirm the "never opened the Cat tab" path is inert — for a uid that actually has a row**

Read this before running it. A **fresh** browser profile cannot test this: anonymous auth mints a new uid, `fetchSyncRows` returns no row at all, and the `{}`-backfill path never executes. The backfill only exists for a uid that already had a `progress` row before the migration.

So use a profile that has **synced before v129 and never opened the Cat tab**:

1. Confirm the uid has a pre-existing row and that the migration backfilled it:

```bash
TOKEN=$(cat /root/.supabase-token)
curl -s -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select count(*) filter (where cat_journey = '"'"'{}'"'"'::jsonb) as backfilled, count(*) as total from public.progress;"}'
```

Expected: `backfilled` equals the number of rows that predate v129 — this is the population Step 3 is about.

2. In that existing profile, load the live site, let the new shell activate, and foreground it so a sign-in reconcile runs.

**Expect:** no "restored your account" toast, and `localStorage.getItem("nbhsk.catJourney")` still `null`. A toast means Task 1's read guard did not ship — revert the flag and reopen Task 1.

**If no such profile is available on this machine, do not fabricate a pass.** Record the step as not-run, note that the behavior is covered by the Probe-C-verified unit test, and fold the live confirmation into C4 step 6.

- [ ] **Step 4: Hand the two-device check to Track C — do not claim it**

The real acceptance test needs **two authenticated sessions on the same account**, and no agent on the VPS can produce that: anonymous auth mints a distinct uid per profile, and the other enabled providers are Google / Apple / magic-link (`docs/supabase/README.md` §3). Two browser profiles do **not** reproduce it.

This is **C4**, below. Record the flip as *deployed and unit-verified*, with the cross-device gate **open**.

- [ ] **Step 5: Update the docs to say what shipped**

Update, in the game repo:
- `docs/STATUS.md` — SHELL v129 live, cloud journey **enabled**, migration applied (paste the Task 3 Step 3 evidence), and the cross-device gate listed as **OPEN (C4)**.
- `docs/OWNER-ACTIONS.md` — the header still says v127 and "no v127 APK/AAB exists". Correct to v129, and change the §1 line "Journey state is device-local in v127, so do **not** expect it to follow the account across devices" — from v129 it **does** follow the account, and the device matrix should now check that.

And in the root repo, `/root/work/HSK/HANDOFF.md` — new LATEST block: what shipped, the Pages run ID, the migration evidence, what was verified in production, and what is still open.

**Write only what was actually verified.** The cross-device behavior was verified by unit tests and by a live single-session round-trip; it was **not** verified across two devices. Say that.

- [ ] **Step 6: Commit both repos separately**

```bash
cd /root/work/HSK/game
git add docs/STATUS.md docs/OWNER-ACTIONS.md
git commit -m "docs: record v129 live — Cat Journey cloud sync enabled, migration applied

Cross-device acceptance (C4) remains OPEN: it needs two authenticated sessions
on one account, which the VPS cannot produce."
git push origin development && git checkout main && git merge --ff-only development && git push origin main

cd /root/work/HSK
git add HANDOFF.md
git commit -m "docs(handoff): v129 shipped — Cat Journey cloud flip, migration applied, cross-device gate open"
```

Two separate repos. Never `git add game/` from the root repo.

---

# TRACK B — unblock native Thai review

Independent of Track A; can run in parallel. **Ends at "a reviewer can start."** Sign-off itself is Track C.

## Task 6: Fix the two missing priority rules and regenerate the sheet

Regenerating today yields 732 rows against the committed 383 — the sheet is 349 rows stale, and 181 of those land in the unclassified P3 bucket. `cat.` (108 rows, the live Cat Journey copy) has no rule at all, and `quests.` (1 row) falls through because the P1 rule tests `startsWith("quest.")`, which `"quests.title"` does not match. Buried at P3, the escalated Cat Journey strings sit below 180 rows of low-priority copy.

**Files:**
- Modify: `docs/i18n/scripts/extract-thai-review-sheet.mjs` (the `RULES` array, lines 25–40)
- Regenerate: `docs/i18n/thai-review-sheet.csv`

- [ ] **Step 1: Capture the current output as a baseline**

```bash
cd /root/work/HSK/game
node docs/i18n/scripts/extract-thai-review-sheet.mjs \
  > /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/sheet-before.csv
```

Expected on stderr: `rows: 732  {"P0":69,"P1":182,"P2":300,"P3":181}` and `parity: OK`. If parity reports problems, **fix the placeholder/`<b>` mismatch first** — the script exits 1 and the sheet is not trustworthy.

- [ ] **Step 2: Add the two rules**

In `docs/i18n/scripts/extract-thai-review-sheet.mjs`, in the `RULES` array:

Change the P1 line (line 37) so the Cat Journey quest entry point is not orphaned by the missing dot:

```js
  ["P1", (k) => ["welcome.", "scope.", "learn.", "fc.", "battle.", "tones.", "howto.", "results.", "quest.", "quests."].some((p) => k.startsWith(p))],
```

And add a `cat.` rule to the P2 group (line 39) — Cat Journey is world/collection copy, same tier as `street.`/`journey.`, which it replaced as the default tab:

```js
  // `cat.` is the Cat Journey full product (v127+). It replaced Street as the
  // default tab, so it belongs at Street's tier — NOT the unclassified P3
  // bucket, where 108 live strings would sit below 180 rows of minor copy.
  ["P2", (k) => ["profile.", "progress.", "album.", "sticker.", "milestone.", "shop.", "item.", "season.", "street.", "cat.", "building.", "journey.", "nav.", "more."].some((p) => k.startsWith(p))],
```

- [ ] **Step 3: Regenerate and diff against the baseline**

```bash
cd /root/work/HSK/game
node docs/i18n/scripts/extract-thai-review-sheet.mjs > docs/i18n/thai-review-sheet.csv
```

Expected on stderr: `rows: 732  {"P0":69,"P1":183,"P2":408,"P3":72}` — P3 drops by 109, P1 gains 1, P2 gains 108. `parity: OK`. Row count is unchanged at 732: nothing was added or dropped, only reprioritized.

(These are not arithmetic — the rule change was simulated against the live `src/i18n.js` while writing this plan and produced exactly this line. A different result means `src/i18n.js` moved since 2026-07-27; re-derive rather than forcing the numbers.)

```bash
grep -c '^"P2","cat\.' docs/i18n/thai-review-sheet.csv   # expect 108
grep -c '^"P3","cat\.' docs/i18n/thai-review-sheet.csv   # expect 0
grep '^"P1","quests\.' docs/i18n/thai-review-sheet.csv   # expect 1 row
```

- [ ] **Step 4: Commit**

```bash
cd /root/work/HSK/game && git checkout development
git add docs/i18n/scripts/extract-thai-review-sheet.mjs docs/i18n/thai-review-sheet.csv
git commit -m "fix(i18n): classify cat.* and quests.* in the Thai review sheet, regenerate

The sheet was 349 rows stale. cat.* (108 live Cat Journey strings, P0-escalated)
had no rule and sat in the unclassified P3 bucket; quests.* fell through because
the P1 rule tests 'quest.', which 'quests.title' does not match.

732 rows, parity OK. No rows added or dropped — reprioritized only."
```

---

## Task 7: Tag the untagged Cat Journey Thai strings

`// TH-REVIEW` on a `STRINGS.th` line is the machine-readable marker for "drafted, not natively reviewed". Codex used a prose comment instead, so nothing entered the queue. 21 lines carry the marker today; none of the Cat Journey block does.

**Scope is `src/i18n.js` and nothing else — verified.** The 30 stories and 12 keepsakes live in `src/cat-memories.js`, which was a plausible second home for narrative Thai. It contains **zero Thai characters** (`grep -c '[ก-๙]' src/cat-memories.js` → `0`); the module holds ids that resolve through `STRINGS`. So the extractor's `STRINGS`-only reach is complete coverage, not a partial view.

**Files:**
- Modify: `src/i18n.js` (the `STRINGS.th` block)

- [ ] **Step 1: Compute the tagging set deterministically**

Do not rely on a prefix guess or on the docs' "185". The scope is: **every key belonging to the Cat Journey surface, plus every key the Cat Journey arc introduced** — computed against the pre-arc tree, minus anything already tagged.

```bash
cd /root/work/HSK/game
git show df875840~1:src/i18n.js > /tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/i18n-prearc.js
node --input-type=module -e '
const a = await import("/tmp/claude-0/-root-work-HSK/9b4b0f82-37c9-4be6-abac-000d78d856de/scratchpad/i18n-prearc.js");
const b = await import("/root/work/HSK/game/src/i18n.js");
const before = new Set(Object.keys(a.STRINGS.en));
const scope = Object.keys(b.STRINGS.en).filter(
  (k) => !before.has(k) || k.startsWith("cat.") || k.startsWith("journey."));
console.log("tagging scope:", scope.length);
console.log(scope.join("\n"));
'
grep -c "TH-REVIEW" src/i18n.js   # baseline: 21
```

Expected: **174 keys** (108 `cat.*` + 9 `journey.*` + 57 others the arc added across `home.`, `album.`, `howto.`, `shop.`, `profile.`, `scope.`, …). That corroborates the docs' "185" rather than contradicting it — the figure was taken from a slightly different base. **Use the number you measure**, and correct the docs in Task 8 rather than repeating either figure blind.

Subtract any key already carrying `// TH-REVIEW` (a handful of `account.delete*` and `iap.*` lines do). Never double-tag.

- [ ] **Step 2: Add the marker to every one of those `th` lines**

Append `// TH-REVIEW` to each Step 1 key's line in the `STRINGS.th` block only — never in `STRINGS.en`, and never to a line that already carries the marker. Match the existing style exactly (`"key": "ค่า", // TH-REVIEW`).

- [ ] **Step 3: Verify the tagging and that nothing else moved**

```bash
cd /root/work/HSK/game
grep -c "TH-REVIEW" src/i18n.js                       # expect 21 + the Step 1 count
git diff --stat src/i18n.js                           # only src/i18n.js, only comment additions
git diff src/i18n.js | grep '^-' | grep -v '^---'     # expect ONLY lines that reappear with the marker
node docs/i18n/scripts/extract-thai-review-sheet.mjs > /dev/null   # expect parity: OK, exit 0
```

The third command is the important one: **no Thai string value may change in this task.** This is a comment-only commit.

- [ ] **Step 4: Full gate — the i18n tests are strict**

```bash
cd /root/work/HSK/game && npm test && npm run lint
```

Expected: exit 0. Comments do not change `dist/app.js` behavior, but the i18n parity/coverage tests are the ones that would catch a fat-fingered value.

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add src/i18n.js
git commit -m "chore(i18n): TH-REVIEW-tag the live Cat Journey Thai strings

Comment-only. These shipped in v124-v127 as machine drafts with no English
fallback and, because the prose note used in their place was not machine
readable, never entered the review queue. Tagging is what puts them there."
```

---

## Task 8: Correct the review docs so a reviewer can actually start

**Files:**
- Modify: `docs/i18n/i18n-translation-review.md`, `docs/OWNER-ACTIONS.md`, `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md`

- [ ] **Step 1: Update the review doc's counts and scope**

`docs/i18n/i18n-translation-review.md` describes a 377-string queue. The regenerated sheet has **732** rows. Update the count, add a short "Cat Journey (v127)" paragraph to the P0 escalation section stating that this block is **already live to Thai users with no English fallback** — so it is corrective review, not pre-release review — and point at the `cat.` rows in the CSV.

- [ ] **Step 2: Update OWNER-ACTIONS §2**

It currently says "the prioritized 377-string queue" and "**None of the 185 lines carries the `TH-REVIEW` marker**". Replace both with the measured numbers (732 sheet rows; the Task 7 Step 1 tagging count, ~174), and state that the strings are now tagged and present in the sheet at P2, with the P0 money/account/notification rows still first in the file. Add the verified note that `src/cat-memories.js` holds no Thai, so the sheet is the complete surface — a reviewer working the CSV is not missing the story text.

- [ ] **Step 3: Make the sign-off block fillable**

In `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md`, leave the native-Thai checkbox **unchecked** — only Jordan's reviewer may check it — but add the three fields the sign-off needs and a pointer to the CSV rows:

```markdown
- [ ] Native Thai review complete
  - Reviewer name:
  - Review date:
  - Reviewed commit:
  - Scope: the `cat.*` rows in `docs/i18n/thai-review-sheet.csv` (P2 block),
    plus every `// TH-REVIEW` line in `src/i18n.js`.
  - Corrections are applied with `node docs/i18n/scripts/apply-thai-review-sheet.mjs`;
    each applied line drops its `// TH-REVIEW` marker in the same commit.
```

- [ ] **Step 4: Commit and merge**

```bash
cd /root/work/HSK/game
git add docs/i18n/i18n-translation-review.md docs/OWNER-ACTIONS.md docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md
git commit -m "docs(i18n): correct review counts, scope the Cat Journey Thai gate, make sign-off fillable"
git push origin development && git checkout main && git merge --ff-only development && git push origin main
```

**Scope boundary:** Tasks 6–8 make the queue reviewable. **No agent may check the sign-off box or edit a Thai string value as if reviewed.** That is Track C.

---

# TRACK C — owner-gated (not agent work)

These need Jordan's hardware, credentials, or judgment. Listed with entry criteria so they can start the moment they unblock.

## C1 — Signed v129 APK/AAB

**Entry criteria:** Track A Task 5 complete **and C4 passed**. Not merely "v129 is deployed" — a store artifact carrying a sync regression cannot be pulled back the way a web deploy can.
**Where:** Windows desktop only — `npm run apk:release` is keystore-bound and does not run on the VPS.
**Blocker to note:** `docs/OWNER-ACTIONS.md` §1 is written for **v127** and its device matrix says journey state is device-local. Task 5 Step 4 fixes that. Do not start C1 against the stale text.
**Adds to the accepted matrix, new for v129:** sign in on two Android devices (or one device plus the web build) and confirm the journey claim and bond tier follow the account, and that the keepsake grants exactly once per claim.
**Also still true:** the latest signed artifact is Profile **v74**. There is no v127 or v128 artifact — the Android track is ~55 shell versions behind the web.

## C2 — iPhone on-device Cat Journey pass

**Entry criteria:** v129 live on the web (Task 4 Step 6). Nothing else blocks it — this is the PWA, not a store build.
**Why it cannot be delegated:** the responsive sweep runs headless Chromium on the VPS. It cannot catch iOS Safari behavior — PWA install, standalone-mode viewport insets, Web Speech fallback when no bundled MP3 exists, or notification permission.
**Check specifically:** Cat Journey renders correctly in standalone mode with the home-indicator inset; the quest overlay (new in v128, `position: fixed` at top level) opens and closes on iOS; journey state survives a cold app kill; and — new in v129 — signing in on iPhone pulls the journey from another device.

## C4 — The two-device check (the v129 acceptance gate)

**Entry criteria:** Track A Task 5 complete (v129 live, single-session round-trip confirmed).
**Why it cannot be delegated:** it needs two authenticated sessions on **the same account**. Anonymous auth mints a distinct uid per browser profile, and the remaining providers are Google / Apple / magic-link — none drivable from the VPS. Unit tests pin the merge algebra; they cannot pin the real round-trip.
**If Jordan would rather this be automatable in future:** enabling email+password for a single throwaway test account would make it agent-runnable from then on. That is a backend policy decision, not something to do unasked.

Steps:
1. Device A: sign in, open Cat Journey, complete a journey, note the keepsake and bond tier.
2. Device B: sign in to **the same account**, foreground the app, open Cat Journey.
3. **Expect:** the Device A claim is present on B, the keepsake is granted **exactly once** (re-enter the screen and cold-restart — no second grant), and the bond tier matches.
4. Device B: complete a *different* day's journey. Foreground Device A.
5. **Expect:** A shows **both** claims — a union, not a replacement. A replacement is a P0 regression: revert `CAT_JOURNEY_CLOUD_ENABLED`, ship immediately, and reopen Task 2.
6. **Existing-user check:** on a device that had journey state *before* v129, confirm nothing was lost after the first post-upgrade sync. This is the `{}`-backfill path.

**Until C4 passes, v129 is deployed but not accepted.** Do not start C1 (the signed artifact) against an unaccepted cloud flip — a store build carrying a sync regression is far more expensive to withdraw than a web deploy.

## C3 — Native Thai sign-off

**Entry criteria:** Track B complete (Tasks 6–8).
**What the reviewer gets:** `docs/i18n/thai-review-sheet.csv`, 732 rows, P0 money/account/notification first, the Cat Journey block at P2, `corrected_thai` and `notes` blank for them to fill.
**What comes back:** the filled CSV, applied with `node docs/i18n/scripts/apply-thai-review-sheet.mjs`, plus reviewer name / date / reviewed commit for the sign-off block.
**Standing rule this gate exists to enforce:** machine Thai is staged, not shipped. This block was shipped, which is why it is a P0 correction rather than a routine review.

---

# TRACK D — standing constraints and deferred backlog

**Not tasks. Record them so the next session does not rediscover them.**

- **Precache headroom: 65,604 bytes** (10,944,444 of 11,010,048). The next ~65 KB of always-loaded anything fails CI. Raising the cap is the wrong fix — the right fix is moving assets to runtime fetch. v129 does not consume meaningful headroom; the next asset-bearing feature will.
- **Three screens are still orphaned by the same `show()` rewrite that hid quests:** Street Projects, keepsakes, and the resident collection. Deferred **by design** — none holds an unclaimed reward, which is the only reason quests was in v128's scope. They are reachable via the rollback flag (`localStorage.setItem("nbhsk.features.catJourney","false")`), so this is a discoverability bug, not data loss. Worth its own plan before the flag is retired: **do not retire the Street rollback flag until these three have a home in Cat Journey.**
- **The Android track is ~55 shell versions behind the web** (signed artifact v74 vs web v129). Every unreleased shell version widens the on-device matrix that C1 has to cover in one pass.
- **`git push` from the VPS fails for anything touching `.github/workflows/`** — the stored `gh` token lacks the `workflow` scope. None of this plan's tasks touch that path. If one ever does: `gh auth refresh -s workflow` (interactive, needs Jordan).

---

## Sequencing summary

```
Track A (serial, gated):   T1 ──► T2 ──► T3 [GATE: column confirmed] ──► T4 [DEPLOYS] ──► T5
Track B (parallel):        T6 ──► T7 ──► T8
Track C (owner):           C4 needs A-T5  ──►  C1 needs C4
                           C2 needs A-T4      C3 needs B-T8
```

Tasks 1 and 2 are flag-independent and land before the migration — deliberately, so the flip commit (Task 4) stays small and revertible for new clients.

**Two hard gates:**
- **Task 3's re-query.** If the column is not confirmed, Task 4 does not start.
- **C4, the two-device check.** v129 is *deployed* at Task 4 and *accepted* only at C4. C1 (the signed store artifact) waits on acceptance, not deployment — withdrawing a store build is far more expensive than reverting a web deploy.

**Agent scope ends at Task 5 and Task 8.** No agent checks the Thai sign-off box, edits a Thai value as if reviewed, or writes "two-device verified" into any doc.

---

# APPENDIX — what actually happened (executed 2026-07-27)

**Tracks A and B are DONE and deployed.** The plan body above is left unedited as
the pre-execution record; where it predicted a number and reality differed, this
appendix is authoritative.

| Task | Commit | Outcome |
|---|---|---|
| 1 | `b1f958db` | As planned. Both guards; both tests RED first, then green. |
| 2 | `1f35727e` | As planned, **plus a third red-check probe** (Probe C, the read guard). |
| 3 | — (no commit) | Gate PASSED. Column `jsonb / NOT NULL / '{}'`, **8** rows backfilled, RLS on, comment applied. Applied from the VPS via the Management API — agent work, confirmed. |
| 4 | `b5ea5ab4` | **Four** tests broke, not two (see below). SHELL v129, Pages run `30255502093` SUCCESS. |
| 5 | `41c6f9bf` (+ root `48f3dee`) | Step 3 was executable after all (see below). |
| 6 | `a1527d87` | **Three** rules missing, not two (see below). |
| 7 | `633e41c4` | 174 keys tagged, comment-only, verified. |
| 8 | `0422a364` (+ root `7b23c76`) | As planned, plus the third rule's documentation. |

## Where the plan was wrong

1. **Task 4 Step 2 predicted two failing tests; four failed.** The two extra were
   a third in `test/sync.test.js` (`localSnapshot reads Cat Journey without
   making the dark capability a sync key` — its `SYNC_KEYS` negative assertion)
   and two in `test/merge.test.js` (`SYNC_KEYS lists the 11 synced keys`, and
   `syncKeysFor(false)).toEqual(SYNC_KEYS)`). All were the same class — flag-OFF
   assertions leaning on a module default that changed meaning — and all were
   made explicit or moved, none weakened. `merge.test.js` now pins the
   always-synced 11 via `syncKeysFor(false)` and asserts `catJourney` as the
   12th. **Lesson: grep for every `SYNC_KEYS` and `syncKeysFor` assertion before
   flipping a constant that one of them is frozen from, not just the obvious
   file.**

2. **Task 6 predicted two missing priority rules; there were three.**
   `notify.cat.*` — the Cat Journey push copy, live since v127 — sat at **P3**
   while every other notification string was P0, contradicting the extractor's
   own stated policy. It was not in the P3-prefix census the plan ran because
   that census grouped by first segment (`notify` showed only 2 rows and looked
   minor). The per-family `notify.streak.`/`notify.comeback.` rules are now one
   prefix-wide `notify.` → P0 rule, so the next family added cannot repeat it.
   Final sheet: 732 rows, **P0 71 / P1 183 / P2 408 / P3 70**.

3. **Task 5 Step 3 was executable — the plan was too pessimistic.** It assumed
   only an existing local browser profile could exercise the `{}`-backfill read
   path. In fact anonymous auth is created by an explicit "Back up my progress"
   tap (`ensureGuest` in `cloud.js`), so a two-pass headless probe works: pass 1
   creates the identity and writes the row, then `storageState` is persisted and
   pass 2 re-enters with that **same session** against a row that now carries the
   backfill. Result: `nbhsk.catJourney` stayed `null`, **zero toasts**, zero JS
   errors, sync settled — the toast defect confirmed fixed in production against
   a real backfilled row. Probe scripts are in the session scratchpad, not the
   repo.

4. **The branch-discipline paragraph describes a flow that wasn't followed.** The
   docs commits were made while already on `main`, then merged `main` →
   `development` rather than the other way. Both branches ended equal at
   `0422a364`, so nothing is broken, but the `--ff-only` resync advice is still
   the right instruction for anyone running these tracks genuinely in parallel.

## Verified numbers (supersede the plan body)

- **109 test files / 9,718 tests**, ESLint clean, production build, 134 asset checks.
- `dist/app.js` 659,853 → **659,919** (+66 B).
- Precache **10,946,106 / 11,010,048 → 63,942 B headroom** (73 of 74 entries).
  The plan quoted 65,604 from the prior handoff; the measured figure is ~1.6 KB
  lower. That is a measurement discrepancy in the earlier record, not a
  regression from this cut.
- One console 400 during probe 1 is **pre-existing and expected**:
  `public.ledger` lacks `event_id`/`order_id` because `2026-07-12-iap-golive.sql`
  is deliberately unapplied, which hits reconcile's documented `not-migrated`
  safe-degradation path.

## Left open, by design

**C4 (two-device acceptance) — v129 is deployed but NOT accepted.** It gates the
signed Android artifact. Also open: the iPhone on-device pass, and native Thai
sign-off itself (the queue is ready; the reviewer is not engaged). The
native-review checkboxes were deliberately left unchecked.
