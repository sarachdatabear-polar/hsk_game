import { describe, expect, it } from "vitest";
import {
  CAT_KEEPSAKES,
  CAT_MEMORIES,
  eligibleMemories,
  keepsakeById,
  memoryById,
  memoryForJourney,
  validateCatMemoryContent,
} from "../src/cat-memories.js";
import { STRINGS } from "../src/i18n.js";

describe("Cat Journey memory content", () => {
  it("ships the full-product base floor with valid bilingual references", () => {
    expect(CAT_MEMORIES).toHaveLength(30);
    expect(CAT_KEEPSAKES).toHaveLength(12);
    expect(eligibleMemories({ bondTier: 0 }).length).toBeGreaterThanOrEqual(7);
    expect(validateCatMemoryContent({ strings: STRINGS })).toEqual([]);
  });

  it("returns the same memory for the same day, history, and tier", () => {
    expect(memoryForJourney("2026-07-26")).toEqual(memoryForJourney("2026-07-26"));
  });

  it("prefers unseen eligible memories until the tier set is complete", () => {
    const eligible = eligibleMemories({ bondTier: 0 });
    const owned = eligible.slice(0, -1).map(item => item.id);
    expect(memoryForJourney("2026-07-26", owned).id).toBe(eligible.at(-1).id);
  });

  it("cannot repeat an exact story during the first seven Study Buddy claims", () => {
    const history = [];
    for (let day = 1; day <= 7; day++) {
      const date = `2026-08-${String(day).padStart(2, "0")}`;
      const selected = memoryForJourney(date, history, { bondTier: 0 });
      history.push({ id: selected.id, day: date });
    }
    expect(new Set(history.map(item => item.id))).toHaveLength(7);
  });

  it("unlocks destination content by bond tier", () => {
    expect(eligibleMemories({ bondTier: 0 }).every(item => item.minBondTier === 0)).toBe(true);
    expect(eligibleMemories({ bondTier: 4 })).toHaveLength(30);
  });

  it("falls back to least-recently-seen after all eligible stories appear", () => {
    const eligible = eligibleMemories({ bondTier: 0 });
    const history = eligible.map((item, i) => ({
      id: item.id,
      day: `2026-07-${String(i + 1).padStart(2, "0")}`,
    }));
    expect(memoryForJourney("2026-08-01", history, { bondTier: 0 }).id).toBe(eligible[0].id);
  });

  it("looks up known story and keepsake IDs and rejects unknown IDs", () => {
    expect(memoryById(CAT_MEMORIES[0].id)).toEqual(CAT_MEMORIES[0]);
    expect(keepsakeById(CAT_KEEPSAKES[0].id)).toEqual(CAT_KEEPSAKES[0]);
    expect(memoryById("removed-memory")).toBeNull();
    expect(keepsakeById("removed-keepsake")).toBeNull();
  });

  it("validator rejects duplicate IDs and missing references/translations", () => {
    const bad = [{
      ...CAT_MEMORIES[0],
      destinationId: "missing",
      keepsakeId: "missing",
      titleKey: "missing.title",
    }, CAT_MEMORIES[0]];
    expect(validateCatMemoryContent({ memories: bad, strings: STRINGS })).toEqual(expect.arrayContaining([
      "unknown destination: garden-leaf",
      "unknown keepsake: garden-leaf",
      "missing en translation: missing.title",
      "missing th translation: missing.title",
      "duplicate memory id: garden-leaf",
    ]));
  });
});
