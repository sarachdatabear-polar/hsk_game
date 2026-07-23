import { describe, it, expect } from "vitest";
import {
  SET_IDS, setMembers, completedSets, newlyCompletedSets, collectionView,
} from "../src/street-collection.js";

describe("street collection sets", () => {
  it("exposes the three real sets, excluding welcome", () => {
    expect(SET_IDS).toEqual(["market", "garden", "festival"]);
    expect(setMembers("garden")).toEqual(["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"]);
    expect(setMembers("welcome")).toEqual([]);
  });

  it("reports a set complete only when every member is owned", () => {
    const garden = ["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"];
    expect(completedSets(garden.slice(0, 3))).toEqual([]);
    expect(completedSets(garden)).toEqual(["garden"]);
  });

  it("returns only newly-completed sets not already granted", () => {
    const garden = ["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"];
    expect(newlyCompletedSets(garden, [])).toEqual(["garden"]);
    expect(newlyCompletedSets(garden, ["garden"])).toEqual([]);
  });

  it("builds a grouped view with owned/tier/price", () => {
    const view = collectionView(["foo-dog"], { "foo-dog": 2 });
    const garden = view.find(g => g.set === "garden");
    const foo = garden.items.find(i => i.id === "foo-dog");
    expect(foo).toEqual({ id: "foo-dog", name: "Foo Dog", price: 3000, owned: true, tier: 2 });
    expect(garden.items.find(i => i.id === "koi-pond").owned).toBe(false);
    expect(garden.complete).toBe(false);
  });
});
