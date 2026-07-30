// Pure sequential message queue for street toasts. Shows one message at a
// time through injected show/hide callbacks and an injected scheduler, so
// rapid successive enqueues never clobber each other — each message gets its
// full on-screen window before the next appears. DOM-free by design (the
// scheduler and show/hide are injected) so it can be unit-tested with a fake
// clock. The caller owns the DOM wiring.
export function createToastQueue({ show, hide, schedule, holdMs = 2600, gapMs = 180 }) {
  const queue = [];
  let active = false;
  function pump() {
    if (active) return;
    if (queue.length === 0) return;
    const msg = queue.shift();
    active = true;
    show(msg);
    schedule(() => {
      hide();
      schedule(() => { active = false; pump(); }, gapMs);
    }, holdMs);
  }
  return {
    push(msg) { queue.push(msg); pump(); },
    get pending() { return queue.length; },
    get active() { return active; },
  };
}
