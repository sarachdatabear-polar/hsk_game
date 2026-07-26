import { describe, it, expect } from "vitest";
import { readVersion, runMigrations, assertSortedLadder, MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../src/migrations.js";
import { fakeStorage } from "./fixtures.js";

describe("readVersion", () => {
  it("null on a fresh install (no nbhsk.* keys at all)", () => {
    expect(readVersion(fakeStorage())).toBe(null);
  });
  it("0 on a legacy install (save data present, no version stamp)", () => {
    expect(readVersion(fakeStorage({ "nbhsk.xp": "500" }))).toBe(0);
  });
  it("reads a stamped version", () => {
    expect(readVersion(fakeStorage({ "nbhsk.schemaVersion": "3" }))).toBe(3);
  });
  it("treats a corrupt stamp with save data present as legacy (0)", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "{bad", "nbhsk.mastery": "{}" });
    expect(readVersion(s)).toBe(0);
  });
  it("treats a corrupt stamp with NO save data as a fresh install (null)", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "{bad" });
    expect(readVersion(s)).toBe(null);
  });
});

describe("assertSortedLadder", () => {
  it("passes on the empty exported ladder", () => {
    expect(() => assertSortedLadder(MIGRATIONS)).not.toThrow();
  });
  it("passes on an ascending ladder", () => {
    expect(() => assertSortedLadder([{ to: 2 }, { to: 3 }, { to: 5 }])).not.toThrow();
  });
  it("throws on an out-of-order ladder", () => {
    expect(() => assertSortedLadder([{ to: 3 }, { to: 2 }])).toThrow(/ascending/i);
  });
  it("throws on a duplicate `to` (would silently skip)", () => {
    expect(() => assertSortedLadder([{ to: 2 }, { to: 2 }])).toThrow(/ascending/i);
  });
});

describe("runMigrations", () => {
  it("fresh install: stamps current, runs nothing", () => {
    const s = fakeStorage();
    let ran = false;
    const end = runMigrations(s, [{ to: 1, up: () => { ran = true; } }], 1);
    expect(end).toBe(1);
    expect(ran).toBe(false);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("1");
  });

  it("legacy install: runs the ladder from 0, stamping each step", () => {
    const s = fakeStorage({ "nbhsk.xp": "500" });
    const order = [];
    const end = runMigrations(s, [
      { to: 1, up: () => order.push(1) },
      { to: 2, up: () => order.push(2) },
    ], 2);
    expect(end).toBe(2);
    expect(order).toEqual([1, 2]);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("2");
  });

  it("already-current install: touches nothing", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "2", "nbhsk.xp": "500" });
    let ran = false;
    runMigrations(s, [{ to: 2, up: () => { ran = true; } }], 2);
    expect(ran).toBe(false);
    expect(s.writes).toEqual([]);
  });

  it("app downgrade (stored version above current): leaves data alone", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "5" });
    expect(runMigrations(s, [], 2)).toBe(5);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
  });

  it("a throwing migration aborts the ladder at the last good version (next boot retries)", () => {
    const s = fakeStorage({ "nbhsk.xp": "500" });
    const end = runMigrations(s, [
      { to: 1, up: () => {} },
      { to: 2, up: () => { throw new Error("boom"); } },
    ], 2);
    expect(end).toBe(1);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("1");
  });

  it("version bump with no ladder entries is a pure stamp", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "1", "nbhsk.xp": "9" });
    expect(runMigrations(s, [], 2)).toBe(2);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("2");
  });
});

describe("v1->v2 migration (street layout / streetProject)", () => {
  it("legacy shop with no streetLayout + non-empty mastery migrates to a v2 layout with welcomeOwned: true", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: ["red-lantern"] }),
      "nbhsk.mastery": JSON.stringify({ "妈妈|1": 3 }),
    });
    const end = runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(end).toBe(5);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.welcomeOwned).toBe(true);
    expect(typeof shop.streetLayout.placements).toBe("object");
    expect(shop.streetProject).toEqual({ v: 1, itemId: "", plotId: "", reserve: false });
  });

  it("empty mastery migrates to welcomeOwned: false", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: [] }),
      "nbhsk.mastery": JSON.stringify({}),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.welcomeOwned).toBe(false);
  });

  it("missing mastery key also migrates to welcomeOwned: false", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: [] }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.welcomeOwned).toBe(false);
  });

  it("corrupt nbhsk.shop JSON does not throw and still stamps current version", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": "{not valid json",
      "nbhsk.mastery": JSON.stringify({ "妈妈|1": 3 }),
    });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    // corrupt shop payload is left untouched, not rewritten
    expect(s.dump()["nbhsk.shop"]).toBe("{not valid json");
  });

  it("missing nbhsk.shop key does nothing but still stamps current version", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.mastery": JSON.stringify({ "妈妈|1": 3 }),
    });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    expect(s.dump()["nbhsk.shop"]).toBeUndefined();
  });

  it("an existing v2 layout's placements survive untouched", () => {
    const existingLayout = {
      v: 3,
      placements: { "plot-small-01": "red-lantern" },
      welcomeOwned: false,
      coachDone: true,
      name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
    };
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: ["red-lantern"], streetLayout: existingLayout }),
      "nbhsk.mastery": JSON.stringify({}),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.placements).toEqual({ "plot-small-01": "red-lantern" });
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.coachDone).toBe(true);
  });

  it("an existing v2 layout's welcomeOwned:true survives even with empty mastery", () => {
    const existingLayout = { v: 2, placements: {}, welcomeOwned: true, coachDone: false };
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: [], streetLayout: existingLayout }),
      "nbhsk.mastery": JSON.stringify({}),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.welcomeOwned).toBe(true);
  });

  it("a dormant v2 layout is NORMALIZED (not rebuilt) — coachDone + placements survive the to:2 entry", () => {
    // Regression (Finding 2): the to:2 entry must not branch on the live
    // current-version constant. With STREET_LAYOUT_VERSION now 5, a `=== 5`
    // check would mis-route this v2 install into migrateLegacyStreet, rebuilding
    // placements and resetting coachDone. `v >= 2` keeps it on the normalize path.
    const existingLayout = { v: 2, placements: { "plot-small-01": "red-lantern" }, welcomeOwned: false, coachDone: true };
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({ owned: ["red-lantern"], streetLayout: existingLayout }),
      "nbhsk.mastery": JSON.stringify({}),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.coachDone).toBe(true);                       // NOT reset
    expect(shop.streetLayout.placements).toEqual({ "plot-small-01": "red-lantern" }); // NOT rebuilt
  });

  it("existing streetProject is not clobbered", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "1",
      "nbhsk.shop": JSON.stringify({
        owned: [],
        streetProject: { v: 1, itemId: "koi-pond", plotId: "plot-medium-01" },
      }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetProject).toEqual({ v: 1, itemId: "koi-pond", plotId: "plot-medium-01", reserve: false });
  });

  it("genuine v0 legacy install (no schemaVersion stamp) runs the to:2 entry end-to-end", () => {
    const s = fakeStorage({
      "nbhsk.xp": "500",
      "nbhsk.mastery": JSON.stringify({ "妈妈|1": 3 }),
      "nbhsk.shop": JSON.stringify({ owned: ["red-lantern"] }),
    });
    expect(readVersion(s)).toBe(0);
    const end = runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(end).toBe(5);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.welcomeOwned).toBe(true);
  });

  it("fresh install (no legacy sentinels) is a pure stamp; migration body never runs", () => {
    const s = fakeStorage();
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe("5");
    expect(s.dump()["nbhsk.shop"]).toBeUndefined();
  });
});

describe("v2 → v3 street ownership migration", () => {
  it("adds the new streetLayout fields and reserve flag on a v2 install", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "2",
      "nbhsk.shop": JSON.stringify({
        owned: ["red-lantern"],
        streetLayout: { v: 2, placements: {}, welcomeOwned: true, coachDone: true },
        streetProject: { v: 1, itemId: "", plotId: "" },
      }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    const shop = JSON.parse(s.getItem("nbhsk.shop"));
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.keepsakes).toEqual([]);
    expect(shop.streetLayout.setsCompleted).toEqual([]);
    expect(shop.streetLayout.lastVisitDay).toBeNull();
    expect(shop.streetLayout.welcomeOwned).toBe(true);   // preserved
    expect(shop.streetProject.reserve).toBe(false);
    expect(s.getItem("nbhsk.schemaVersion")).toBe("5");
  });

  it("no-ops without throwing on corrupt shop JSON", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "2", "nbhsk.shop": "{not json" });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.getItem("nbhsk.schemaVersion")).toBe("5");   // still stamps current
  });

  it("stamps a fresh install straight to current without running entries", () => {
    const s = fakeStorage({});
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.getItem("nbhsk.schemaVersion")).toBe("5");
    expect(s.getItem("nbhsk.shop")).toBeNull();
  });
});

describe("v3→v4 migration", () => {
  it("defaults metNeighbours on a v3 shop layout and stamps v5", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "3",
      "nbhsk.shop": JSON.stringify({
        owned: [], streetLayout: { v: 3, placements: {}, setsCompleted: ["market"] },
      }),
    });
    const v = runMigrations(s);
    expect(v).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
    const shop = JSON.parse(s.getItem("nbhsk.shop"));
    expect(shop.streetLayout.metNeighbours).toEqual([]);
    expect(shop.streetLayout.setsCompleted).toEqual(["market"]);
    expect(shop.streetLayout.v).toBe(5);
  });
  it("no-ops without throwing on a corrupt shop", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "3", "nbhsk.shop": "{not json" });
    expect(() => runMigrations(s)).not.toThrow();
  });
});

describe("v4->v5 migration (builtStages)", () => {
  it("bumps CURRENT_SCHEMA_VERSION to 5", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
  });

  it("seeds finished landmarks from level, leaves unreached at 0", () => {
    // A very-high-xp player has cleared every landmark's unlock level
    // (highest is emperor-gate at level 50; xpForLevel(50) = 30625).
    const s = fakeStorage({
      "nbhsk.schemaVersion": "4",
      "nbhsk.xp": JSON.stringify(999999),
      "nbhsk.shop": JSON.stringify({ owned: [], streetLayout: { v: 4 } }),
    });
    runMigrations(s);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.builtStages).toEqual({
      "lantern-post": 3, "coin-bank": 3, "tailor": 3, "kitten-cafe": 3, "emperor-gate": 3,
    });
    expect(shop.streetLayout.v).toBe(5);
  });

  it("leaves builtStages at 0 for a level-0 (fresh xp) player", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "4",
      "nbhsk.shop": JSON.stringify({ owned: [], streetLayout: { v: 4 } }),
    });
    runMigrations(s);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    // normBuiltStages omits zero-stage entries (see normBuiltStages in street.js).
    expect(shop.streetLayout.builtStages).toEqual({});
  });

  it("seeds exactly three completed landmarks for a mid-level player (level 22)", () => {
    // xp=6000 maps to level 22 (see growth.js: xpForLevel(6000)=22).
    // At level 22, unlock thresholds are: lantern-post:5, coin-bank:10, tailor:20
    // (all pass), but kitten-cafe:30 and emperor-gate:50 do not.
    // Normalized output omits zero-stage entries, so builtStages has exactly 3.
    const s = fakeStorage({
      "nbhsk.schemaVersion": "4",
      "nbhsk.xp": JSON.stringify(6000),
      "nbhsk.shop": JSON.stringify({ owned: [], streetLayout: { v: 4 } }),
    });
    runMigrations(s);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.builtStages).toEqual({
      "lantern-post": 3, "coin-bank": 3, "tailor": 3,
    });
    expect(shop.streetLayout.v).toBe(5);
  });

  it("is a no-op on corrupt shop data (never throws)", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "4", "nbhsk.shop": "{not json" });
    expect(() => runMigrations(s)).not.toThrow();
  });

  it("PRESERVES existing streetLayout fields (name, keepsakes, metNeighbours) and re-stamps v:5", () => {
    // Data-safety regression: ensureStreetLayout() in src/ui/street-screen.js
    // routes any stored layout whose v !== live STREET_LAYOUT_VERSION into
    // migrateLegacyStreet, which DISCARDS name/savedLayouts/keepsakes/
    // setsCompleted/metNeighbours/placements. This migration must re-stamp a
    // stored v:4 layout to v:5 (via normalizeStreetLayout, which preserves
    // fields) BEFORE the player's next Street visit, or that data is lost.
    const s = fakeStorage({
      "nbhsk.schemaVersion": "4",
      "nbhsk.shop": JSON.stringify({
        owned: [],
        streetLayout: {
          v: 4,
          placements: {},
          name: "Meow Lane",
          keepsakes: [{ id: "lantern-keepsake", kind: "gift" }],
          metNeighbours: ["neighbour-a"],
        },
      }),
    });
    runMigrations(s);
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout.v).toBe(5);
    expect(shop.streetLayout.name).toBe("Meow Lane");
    expect(shop.streetLayout.keepsakes).toEqual([{ id: "lantern-keepsake", kind: "gift" }]);
    expect(shop.streetLayout.metNeighbours).toEqual(["neighbour-a"]);
  });
});
