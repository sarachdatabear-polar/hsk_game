import { describe, expect, it } from "vitest";
import { CAT_MEMORIES, memoryById, memoryForJourney } from "../src/cat-memories.js";

describe("Cat Journey memories", () => {
  it("returns the same memory for the same day and inventory", () => {
    expect(memoryForJourney("2026-07-26")).toEqual(memoryForJourney("2026-07-26"));
  });

  it("prefers an unseen memory until the set is complete", () => {
    const owned = CAT_MEMORIES.slice(0, -1).map(item => item.id);
    expect(memoryForJourney("2026-07-26", owned).id).toBe(CAT_MEMORIES.at(-1).id);
  });

  it("looks up known ids and rejects stale ids", () => {
    expect(memoryById(CAT_MEMORIES[0].id)).toEqual(CAT_MEMORIES[0]);
    expect(memoryById("removed-memory")).toBeNull();
  });
});
