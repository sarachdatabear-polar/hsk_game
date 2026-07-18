import { describe, it, expect } from "vitest";
import { createStore } from "../src/storage.js";
import { fakeStorage } from "./fixtures.js";

describe("createStore", () => {
  it("get returns the default when the key is absent", () => {
    const s = createStore({ storage: fakeStorage(), syncKeys: [] });
    expect(s.get("xp", 0)).toBe(0);
    expect(s.get("scope", { levels: [1] })).toEqual({ levels: [1] });
  });

  it("round-trips JSON values under the nbhsk. namespace", () => {
    const backing = fakeStorage();
    const s = createStore({ storage: backing, syncKeys: [] });
    s.set("wallet", 120);
    expect(backing.dump()["nbhsk.wallet"]).toBe("120");
    expect(s.get("wallet", 0)).toBe(120);
  });

  it("get returns the default on corrupt JSON", () => {
    const backing = fakeStorage({ "nbhsk.settings": "{not json" });
    const s = createStore({ storage: backing, syncKeys: [] });
    expect(s.get("settings", { sfxVol: 1 })).toEqual({ sfxVol: 1 });
  });

  it("set on a sync key flips its dirty flag in nbhsk.sync", () => {
    const backing = fakeStorage();
    const s = createStore({ storage: backing, syncKeys: ["xp"] });
    s.set("xp", 500);
    const meta = JSON.parse(backing.dump()["nbhsk.sync"]);
    expect(meta.dirty).toEqual({ xp: true });
  });

  it("dirty flag writes only on the false->true flip (no rewrite when already dirty)", () => {
    const backing = fakeStorage();
    const s = createStore({ storage: backing, syncKeys: ["xp"] });
    s.set("xp", 1);
    const syncWritesAfterFirst = backing.writes.filter((k) => k === "nbhsk.sync").length;
    s.set("xp", 2);
    const syncWritesAfterSecond = backing.writes.filter((k) => k === "nbhsk.sync").length;
    expect(syncWritesAfterFirst).toBe(1);
    expect(syncWritesAfterSecond).toBe(1);
  });

  it("set on a non-sync key never touches nbhsk.sync", () => {
    const backing = fakeStorage();
    const s = createStore({ storage: backing, syncKeys: ["xp"] });
    s.set("tonesBest", 9);
    expect(backing.dump()["nbhsk.sync"]).toBeUndefined();
  });

  it("swallows storage write failures (quota etc.)", () => {
    const backing = fakeStorage();
    backing.setItem = () => { throw new Error("QuotaExceededError"); };
    const s = createStore({ storage: backing, syncKeys: ["xp"] });
    expect(() => s.set("xp", 1)).not.toThrow();
  });
});
