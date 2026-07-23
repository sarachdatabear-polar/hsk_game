import { describe, it, expect } from "vitest";
import { makeKeepsake, addKeepsake } from "../src/street-keepsakes.js";

describe("street keepsakes", () => {
  it("makes a deterministic id per (kind, day, set) and includes a word only when given", () => {
    const k1 = makeKeepsake("set", "2026-07-23", { set: "garden", word: "谢谢" });
    expect(k1).toEqual({ id: "set:garden:2026-07-23", kind: "set", day: "2026-07-23", word: "谢谢" });
    const k2 = makeKeepsake("welcome", "2026-07-23");
    expect(k2).toEqual({ id: "welcome:2026-07-23", kind: "welcome", day: "2026-07-23" });
    expect("word" in k2).toBe(false);
  });

  it("appends without mutating and stays idempotent on duplicate id", () => {
    const a = [];
    const b = addKeepsake(a, makeKeepsake("welcome", "2026-07-23"));
    expect(a).toEqual([]);                 // input not mutated
    expect(b).toHaveLength(1);
    const c = addKeepsake(b, makeKeepsake("welcome", "2026-07-23"));
    expect(c).toHaveLength(1);             // duplicate id ignored
  });
});
