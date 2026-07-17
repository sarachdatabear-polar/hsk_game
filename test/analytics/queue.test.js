// test/analytics/queue.test.js
import { describe, it, expect } from "vitest";
import { enqueue, drain, clear, DEFAULT_CAP } from "../../src/analytics/queue.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

describe("queue", () => {
  it("enqueues and drains in order", () => {
    const store = memStore();
    enqueue(store, { name: "a" });
    enqueue(store, { name: "b" });
    expect(drain(store)).toEqual([{ name: "a" }, { name: "b" }]);
    expect(drain(store)).toEqual([]); // drained
  });

  it("drops the oldest when over cap", () => {
    const store = memStore();
    for (let i = 0; i < 5; i++) enqueue(store, { i }, 3);
    expect(drain(store)).toEqual([{ i: 2 }, { i: 3 }, { i: 4 }]);
  });

  it("clear empties the queue", () => {
    const store = memStore();
    enqueue(store, { name: "a" });
    clear(store);
    expect(drain(store)).toEqual([]);
  });

  it("DEFAULT_CAP is a sane bound", () => {
    expect(DEFAULT_CAP).toBeGreaterThan(0);
  });
});
