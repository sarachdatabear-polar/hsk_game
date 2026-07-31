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

describe("v5->v6 migration (Cat Journey permanent claims)", () => {
  it("migrates the complete v1 journey shape without losing active or returned data", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "5",
      "nbhsk.catJourney": JSON.stringify({
        v: 1,
        selectedBackground: "bg-cat-garden-v1",
        goalDaysCount: 9,
        lastGoalDay: "2026-07-26",
        lastSeenBondTier: 1,
        claimedDays: ["2026-07-25", "2026-07-26"],
        activeJourney: { day: "2026-07-26", departedAt: 100, readyAt: 200 },
        memories: [{ id: "garden-leaf", day: "2026-07-25" }],
      }),
    });
    expect(runMigrations(s)).toBe(CURRENT_SCHEMA_VERSION);
    expect(s.getItem("nbhsk.schemaVersion")).toBe(String(CURRENT_SCHEMA_VERSION));
    const journey = JSON.parse(s.getItem("nbhsk.catJourney"));
    expect(journey).toMatchObject({
      v: 2,
      selectedBackground: "bg-cat-garden-v1",
      goalHistory: { baselineCount: 9, throughDay: "2026-07-26", days: [] },
      lastSeenBondTier: 1,
    });
    expect(journey.claims).toHaveLength(2);
    expect(journey.claims[0]).toMatchObject({
      day: "2026-07-25",
      storyId: "garden-leaf",
    });
    expect(journey.claims[1]).toMatchObject({
      day: "2026-07-26",
      departedAt: 100,
      readyAt: 200,
      returnedAt: 0,
    });
  });

  it("retains more than 120 v1 memories and is idempotent", () => {
    const memories = Array.from({ length: 130 }, (_, i) => ({
      id: `legacy-${i}`,
      day: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
    }));
    const s = fakeStorage({
      "nbhsk.schemaVersion": "5",
      "nbhsk.catJourney": JSON.stringify({
        v: 1,
        claimedDays: memories.map(item => item.day),
        memories,
      }),
    });
    runMigrations(s);
    const first = s.getItem("nbhsk.catJourney");
    expect(JSON.parse(first).claims).toHaveLength(130);
    runMigrations(s);
    expect(s.getItem("nbhsk.catJourney")).toBe(first);
  });

  it("leaves corrupt Cat Journey JSON untouched while still stamping current", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "5",
      "nbhsk.catJourney": "{bad json",
    });
    expect(() => runMigrations(s)).not.toThrow();
    expect(s.getItem("nbhsk.catJourney")).toBe("{bad json");
    expect(s.getItem("nbhsk.schemaVersion")).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it("does not create Cat Journey state when the key is absent", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "5" });
    runMigrations(s);
    expect(s.getItem("nbhsk.catJourney")).toBeNull();
  });
});

describe("v6->v7 migration (profile avatar)", () => {
  it("absent profile: untouched (defaults supply the field at read time), still stamps current", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "6", "nbhsk.xp": "100" });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.profile"]).toBeUndefined();
    expect(JSON.parse(s.dump()["nbhsk.schemaVersion"])).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("name-only profile gains a monogram avatar, name byte-identical", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "น้องแมว 🐱" }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.profile"]))
      .toEqual({ displayName: "น้องแมว 🐱", avatar: { kind: "monogram" } });
  });

  it("corrupt profile JSON: no-op on the key, version still advances", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "6", "nbhsk.profile": "{not json" });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.profile"]).toBe("{not json");
    expect(JSON.parse(s.dump()["nbhsk.schemaVersion"])).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("a profile already carrying a cat avatar survives; garbage avatar -> monogram", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J", avatar: { kind: "cat", id: "panda" } }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.profile"]).avatar).toEqual({ kind: "cat", id: "panda" });

    const g = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J", avatar: "hax" }),
    });
    runMigrations(g, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(g.dump()["nbhsk.profile"]).avatar).toEqual({ kind: "monogram" });
  });

  it("re-running the v7 entry is idempotent", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J" }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    const once = s.dump()["nbhsk.profile"];
    MIGRATIONS.find(m => m.to === 7).up(s);   // simulate a mid-ladder crash retry
    expect(s.dump()["nbhsk.profile"]).toBe(once);
  });
});

describe("v7->v8 migration (Street retirement)", () => {
  it("CURRENT_SCHEMA_VERSION is 9 and the ladder stays sorted", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(9);
    expect(() => assertSortedLadder(MIGRATIONS)).not.toThrow();
  });

  it("fresh install (no legacy sentinels) is a pure stamp; migration body never runs", () => {
    const s = fakeStorage();
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe(String(CURRENT_SCHEMA_VERSION));
    expect(s.dump()["nbhsk.shop"]).toBeUndefined();
  });

  it("missing nbhsk.shop key does nothing but still stamps current version", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "7" });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.schemaVersion"]).toBe(String(CURRENT_SCHEMA_VERSION));
    expect(s.dump()["nbhsk.shop"]).toBeUndefined();
  });

  it("corrupt nbhsk.shop JSON does not throw and still stamps current version", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "7", "nbhsk.shop": "{not valid json" });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.schemaVersion"]).toBe(String(CURRENT_SCHEMA_VERSION));
    // corrupt shop payload is left untouched, not rewritten
    expect(s.dump()["nbhsk.shop"]).toBe("{not valid json");
  });

  it("strips streetLayout/streetProject/tiers, prunes retired deco ids from owned, preserves non-deco owned ids and other shop fields, and removes nbhsk.bricks — idempotently", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "7",
      "nbhsk.shop": JSON.stringify({
        owned: ["skin-base", "cat-panda", "red-lantern", "koi-pond"],
        skin: "skin-base", backdrop: "market", effect: "", soundpack: "",
        streetLayout: { v: 5, placements: { "plot-small-01": "red-lantern" }, welcomeOwned: true, coachDone: true },
        streetProject: { v: 1, itemId: "koi-pond", plotId: "plot-medium-01", reserve: false },
        tiers: { "red-lantern": 2 },
      }),
      "nbhsk.bricks": "40",
    });
    const end = runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(end).toBe(CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.schemaVersion"]).toBe(String(CURRENT_SCHEMA_VERSION));
    const shop = JSON.parse(s.dump()["nbhsk.shop"]);
    expect(shop.streetLayout).toBeUndefined();
    expect(shop.streetProject).toBeUndefined();
    expect(shop.tiers).toBeUndefined();
    expect(shop.owned).toEqual(["skin-base", "cat-panda"]);   // retired decos pruned, non-decos kept
    expect(shop.skin).toBe("skin-base");                       // untouched fields preserved
    expect(shop.backdrop).toBe("market");
    expect(s.dump()["nbhsk.bricks"]).toBeUndefined();

    // Idempotent: re-running the to:8 entry directly (mid-ladder crash retry,
    // same pattern as the v7 profile test above) is a byte-identical no-op.
    const once = s.dump()["nbhsk.shop"];
    MIGRATIONS.find(m => m.to === 8).up(s);
    expect(s.dump()["nbhsk.shop"]).toBe(once);
  });
});

describe("v8->v9 migration (guided onboarding)", () => {
  it("marks the old completed intro as complete without changing old keys", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "8",
      "nbhsk.introDone": "true",
      "nbhsk.mastery": "{}",
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.onboarding"])).toMatchObject({
      version: 1, stage: "complete", appTourStep: 3,
    });
    expect(s.dump()["nbhsk.introDone"]).toBe("true");
    expect(s.dump()["nbhsk.mastery"]).toBe("{}");
  });

  it("marks a pre-tour player with mastery as complete", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "8",
      "nbhsk.mastery": JSON.stringify({ "你": { r: 1 } }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.onboarding"]).stage).toBe("complete");
  });

  it("leaves a genuinely fresh profile without onboarding data", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "8" });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.onboarding"]).toBeUndefined();
    expect(s.dump()["nbhsk.schemaVersion"]).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it("preserves a partially completed new onboarding record byte-for-byte", () => {
    const raw = JSON.stringify({ version: 1, stage: "quest", accountChoice: "try-first", questTip: 2 });
    const s = fakeStorage({
      "nbhsk.schemaVersion": "8",
      "nbhsk.introDone": "true",
      "nbhsk.onboarding": raw,
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.onboarding"]).toBe(raw);
  });

  it("the v9 entry is idempotent", () => {
    const s = fakeStorage({ "nbhsk.introDone": "true" });
    MIGRATIONS.find(m => m.to === 9).up(s);
    const once = s.dump()["nbhsk.onboarding"];
    MIGRATIONS.find(m => m.to === 9).up(s);
    expect(s.dump()["nbhsk.onboarding"]).toBe(once);
  });
});
