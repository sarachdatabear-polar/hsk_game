import { describe, it, expect, beforeEach, vi } from "vitest";

// Mirror of test/sync-cat-journey-cloud.test.js, pinned the other way. Since
// v129 the module default is TRUE, and reconcile() takes no options parameter,
// so the rollback path (a flag-OFF client meeting a cloud row that now HAS a
// cat_journey column) can only be exercised by mocking the constant. These
// tests moved here from test/sync.test.js when the flag flipped.
vi.mock("../src/cloud-config.js", async (importOriginal) => ({
  ...(await importOriginal()),
  CAT_JOURNEY_CLOUD_ENABLED: false,
}));

const { reconcile, __resetForTests } = await import("../src/sync.js");
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
  it("catJourney is not a synced key when the capability is off", () => {
    expect(SYNC_KEYS).not.toContain("catJourney");
  });

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
