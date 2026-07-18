import { describe, it, expect } from "vitest";
import { CURRENT_SCHEMA_VERSION, readVersion, runMigrations } from "../src/migrations.js";
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
