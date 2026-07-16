// test/analytics/identity.test.js
import { describe, it, expect } from "vitest";
import { getAnonId, newSessionId, clearAnonId } from "../../src/analytics/identity.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (m[k] === undefined || m[k] === null ? d : m[k]),
    set: (k, v) => { m[k] = v; },
    _dump: () => m,
  };
}

describe("identity", () => {
  it("creates an anon id once and reuses it", () => {
    let n = 0;
    const gen = () => `uuid-${++n}`;
    const store = memStore();
    const first = getAnonId(store, gen);
    const second = getAnonId(store, gen);
    expect(first).toBe("uuid-1");
    expect(second).toBe("uuid-1"); // reused, gen not called again
    expect(store._dump().analyticsAnonId).toBe("uuid-1");
  });

  it("newSessionId returns a fresh id from gen each call", () => {
    let n = 0;
    const gen = () => `s-${++n}`;
    expect(newSessionId(gen)).toBe("s-1");
    expect(newSessionId(gen)).toBe("s-2");
  });

  it("clearAnonId removes the stored id so the next getAnonId regenerates", () => {
    let n = 0;
    const gen = () => `uuid-${++n}`;
    const store = memStore();
    getAnonId(store, gen);       // uuid-1
    clearAnonId(store);
    expect(getAnonId(store, gen)).toBe("uuid-2");
  });
});
