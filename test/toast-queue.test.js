import { describe, it, expect, beforeEach } from "vitest";
import { createToastQueue } from "../src/toast-queue.js";

// Fake scheduler: a manual clock. `schedule(fn, delay)` records the callback
// instead of running it; `advance(ms)` runs every callback whose remaining
// delay has elapsed, in the order their deadlines are reached (ties resolve
// in scheduling order, matching real timer semantics closely enough for
// these tests).
function makeClock() {
  let now = 0;
  const pending = []; // { at, fn }
  function schedule(fn, delay) {
    pending.push({ at: now + delay, fn });
  }
  // Advances the clock to `now + ms`, but walks forward one due deadline at a
  // time (rather than jumping straight to the target) so that a callback
  // which itself calls schedule() computes its delay relative to the moment
  // it actually fired — matching real setTimeout semantics, where a timer
  // scheduled inside another timer's callback starts counting from the
  // callback's fire time, not from whenever advance() happens to be called.
  function advance(ms) {
    const target = now + ms;
    for (;;) {
      let nextIdx = -1;
      for (let i = 0; i < pending.length; i++) {
        if (pending[i].at <= target && (nextIdx === -1 || pending[i].at < pending[nextIdx].at)) {
          nextIdx = i;
        }
      }
      if (nextIdx === -1) break;
      const { at, fn } = pending[nextIdx];
      pending.splice(nextIdx, 1);
      now = at;
      fn();
    }
    now = target;
  }
  return { schedule, advance, get pendingCount() { return pending.length; } };
}

describe("createToastQueue", () => {
  let shown, hidden, clock, queue;
  beforeEach(() => {
    shown = [];
    hidden = 0;
    clock = makeClock();
    queue = createToastQueue({
      show: msg => shown.push(msg),
      hide: () => { hidden++; },
      schedule: clock.schedule,
      holdMs: 2600,
      gapMs: 180,
    });
  });

  it("single push shows immediately, leaves nothing pending", () => {
    queue.push("hello");
    expect(shown).toEqual(["hello"]);
    expect(queue.active).toBe(true);
    expect(queue.pending).toBe(0);
  });

  it("two rapid pushes: only the first shows immediately; the second waits for holdMs + gapMs", () => {
    queue.push("first");
    queue.push("second");

    // Only "first" has been shown so far — the core anti-clobber guarantee.
    expect(shown).toEqual(["first"]);
    expect(queue.pending).toBe(1);

    // Advance short of the full hold window: "second" must still not show.
    clock.advance(2599);
    expect(shown).toEqual(["first"]);

    // Cross the hold window: hide() fires for "first", but "second" doesn't
    // show yet — it waits out the gap too.
    clock.advance(1);
    expect(hidden).toBe(1);
    expect(shown).toEqual(["first"]);

    // Short of the gap: still not shown.
    clock.advance(179);
    expect(shown).toEqual(["first"]);

    // Cross the gap: "second" now shows.
    clock.advance(1);
    expect(shown).toEqual(["first", "second"]);
    expect(queue.pending).toBe(0);
    expect(queue.active).toBe(true);
  });

  it("active returns to false after the last message's window fully closes", () => {
    queue.push("only");
    expect(queue.active).toBe(true);
    clock.advance(2600); // hold elapses, hide() fires, gap timer scheduled
    expect(queue.active).toBe(true); // still true during the gap
    clock.advance(180);  // gap elapses
    expect(queue.active).toBe(false);
  });

  it("3-message burst: correct show/hide counts and strict ordering", () => {
    queue.push("a");
    queue.push("b");
    queue.push("c");

    expect(shown).toEqual(["a"]);
    expect(hidden).toBe(0);
    expect(queue.pending).toBe(2);

    clock.advance(2780); // a's hold + gap
    expect(shown).toEqual(["a", "b"]);
    expect(hidden).toBe(1);
    expect(queue.pending).toBe(1);

    clock.advance(2780); // b's hold + gap
    expect(shown).toEqual(["a", "b", "c"]);
    expect(hidden).toBe(2);
    expect(queue.pending).toBe(0);
    expect(queue.active).toBe(true);

    clock.advance(2780); // c's hold + gap
    expect(shown).toEqual(["a", "b", "c"]);
    expect(hidden).toBe(3);
    expect(queue.active).toBe(false);
  });
});
