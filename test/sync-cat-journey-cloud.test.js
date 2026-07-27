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
    // {} by the migration. The read guard in localFromRows is what keeps this
    // inert — without it mergeAll synthesizes a default journey, changed flips
    // true, and main.js toasts "account.restored" at everyone.
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
    const pushed = calls.upserts.find((u) => u.table === "progress");
    if (pushed) expect(pushed.row).not.toHaveProperty("cat_journey");
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
