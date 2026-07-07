import { describe, it, expect } from "vitest";
import { isFirstRun, introDeck } from "../src/firstrun.js";

const W = (h, f) => ({ h, f, p: h + "p", e: h + "e", lv: 1 });

describe("isFirstRun", () => {
  it("true only when the intro never ran AND no mastery exists", () => {
    expect(isFirstRun(false, {})).toBe(true);
  });
  it("false once the intro completed", () => {
    expect(isFirstRun(true, {})).toBe(false);
  });
  it("false for existing players (mastery present, key absent) — no retro intro", () => {
    expect(isFirstRun(false, { "你": { seen: 3 } })).toBe(false);
  });
});

describe("introDeck", () => {
  const pool = [W("一", 50), W("二", 900), W("三", 10), W("四", 700), W("五", 300), W("六", 800), W("七", 5), W("八", 600)];
  it("picks the n most frequent words, most frequent first", () => {
    expect(introDeck(pool, 6).map(w => w.h)).toEqual(["二", "六", "四", "八", "五", "一"]);
  });
  it("defaults to 6 and caps at the pool size", () => {
    expect(introDeck(pool).length).toBe(6);
    expect(introDeck(pool.slice(0, 3), 6).length).toBe(3);
  });
  it("does not mutate the input pool", () => {
    const order = pool.map(w => w.h).join("");
    introDeck(pool, 6);
    expect(pool.map(w => w.h).join("")).toBe(order);
  });
});
