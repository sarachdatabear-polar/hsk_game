import { describe, it, expect } from "vitest";
import { ERRLOG_MAX, errorEntry, pushError, describeErrorEvent } from "../src/errlog.js";

describe("errorEntry", () => {
  it("builds a compact entry", () => {
    expect(errorEntry("error", "boom", "at foo.js:1", 1700000000000)).toEqual({
      at: 1700000000000, src: "error", msg: "boom", stk: "at foo.js:1",
    });
  });
  it("truncates long messages and stacks to 300 chars", () => {
    const e = errorEntry("error", "x".repeat(1000), "y".repeat(1000), 0);
    expect(e.msg.length).toBe(300);
    expect(e.stk.length).toBe(300);
  });
  it("stringifies missing fields safely", () => {
    const e = errorEntry(undefined, undefined, undefined, 0);
    expect(e.src).toBe("error");
    expect(e.msg).toBe("");
    expect(e.stk).toBe("");
  });
});

describe("pushError", () => {
  it("appends without mutating the input", () => {
    const log = [];
    const next = pushError(log, { at: 1 });
    expect(next).toHaveLength(1);
    expect(log).toHaveLength(0);
  });
  it("drops the oldest entries past the cap", () => {
    let log = [];
    for (let i = 0; i < ERRLOG_MAX + 5; i++) log = pushError(log, { at: i });
    expect(log).toHaveLength(ERRLOG_MAX);
    expect(log[0].at).toBe(5);
    expect(log[log.length - 1].at).toBe(ERRLOG_MAX + 4);
  });
  it("recovers from a corrupt (non-array) stored log", () => {
    expect(pushError("garbage", { at: 1 })).toEqual([{ at: 1 }]);
  });
});

describe("describeErrorEvent", () => {
  it("reads an ErrorEvent-shaped object", () => {
    const d = describeErrorEvent({ message: "boom", error: { message: "boom", stack: "s1" } });
    expect(d).toEqual({ source: "error", message: "boom", stack: "s1" });
  });
  it("reads a PromiseRejectionEvent-shaped object with an Error reason", () => {
    const d = describeErrorEvent({ reason: { message: "nope", stack: "s2" } });
    expect(d).toEqual({ source: "unhandledrejection", message: "nope", stack: "s2" });
  });
  it("reads a rejection with a non-Error reason", () => {
    const d = describeErrorEvent({ reason: "just a string" });
    expect(d).toEqual({ source: "unhandledrejection", message: "just a string", stack: "" });
  });
  it("survives an empty event", () => {
    const d = describeErrorEvent({});
    expect(d.source).toBe("error");
    expect(d.message).toBe("unknown");
  });
});
