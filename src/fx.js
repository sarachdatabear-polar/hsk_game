"use strict";
// Answer-effect specs — pure, no DOM/canvas. main.js turns these into
// particles/floaters it integrates and draws each frame. Kept separate from
// the render loop so counts/kinds/math can be unit-tested without a canvas.

// Gold-coin burst on a kill. Counts and the coin/dot split are deterministic
// (tests assert on them); only the velocities are randomized, mirroring the
// original inline burst in killZombie.
// `style` selects an equipped effect pack (shop item id); omitted/falsy keeps
// the original gold-coin look exactly as before these packs existed.
export function coinBurst(x, y, boss, style) {
  const count = boss ? 28 : 12;
  const coins = boss ? 12 : 5;
  const vyMax = boss ? 260 : 200;

  if (style === "sakura-fx") {
    const specs = [];
    for (let i = 0; i < count; i++) {
      specs.push({
        x, y,
        vx: (Math.random() - 0.5) * 280,   // ±140, narrower than the default burst
        vy: -Math.random() * vyMax,
        life: 0.9 + Math.random() * 0.4,   // 0.9 - 1.3, lingers a bit
        kind: "petal",
        g: 120                              // slow fall
      });
    }
    return specs;
  }

  if (style === "firecracker-fx") {
    const extra = 6;
    const specs = [];
    for (let i = 0; i < count + extra; i++) {
      specs.push({
        x, y,
        vx: (Math.random() - 0.5) * 480 * 1.3,
        vy: -Math.random() * vyMax * 1.3,
        life: 0.6 + Math.random() * 0.3,
        kind: i < coins ? "cracker" : "spark"
      });
    }
    return specs;
  }

  if (style === "star-shower") {
    const extra = 4;
    const specs = [];
    for (let i = 0; i < count + extra; i++) {
      specs.push({
        x, y,
        vx: (Math.random() - 0.5) * 360,
        vy: -Math.random() * vyMax * 1.15,
        life: 0.8 + Math.random() * 0.4,
        kind: "star",
        g: 220                              // gentle fall, slower than crackers
      });
    }
    return specs;
  }

  const specs = [];
  for (let i = 0; i < count; i++) {
    specs.push({
      x, y,
      vx: (Math.random() - 0.5) * 480,   // ±240
      vy: -Math.random() * vyMax,
      life: 0.6 + Math.random() * 0.3,   // 0.6 - 0.9
      kind: i < coins ? "coin" : "dot"
    });
  }
  return specs;
}

// Combo counter floater shown above the mascot on a correct
// answer; no floater below a 3-combo (matches the HUD's own combo threshold).
export function comboFloater(x, y, combo) {
  if (combo < 3) return null;
  return { x, y, text: `x${combo}`, life: 0.9, vy: -60 };
}

// 16-point spark ring, evenly spaced, fired every 10th combo (10, 20, ...).
export function fireworkRing(x, y) {
  const n = 16, speed = 170;
  const specs = [];
  for (let i = 0; i < n; i++) {
    const angle = i * (Math.PI * 2 / n);
    specs.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      kind: "spark"
    });
  }
  return specs;
}

export function feedbackEffect(kind, x, y) {
  if (kind === "wrong") return { kind: "wrong", x, y, life: 0.55, sprite: "fx-wrong", orb: "vfx-orb-red" };
  if (kind === "critical") return { kind: "critical", x, y, life: 0.75, sprite: "fx-critical", orb: "vfx-orb-gold" };
  // 10-combo milestone: pure orb pop, no stamp (the combo floater carries the number)
  if (kind === "streak") return { kind: "streak", x, y, life: 0.75, sprite: null, orb: "vfx-orb-blue" };
  return { kind: "correct", x, y, life: 0.6, sprite: "fx-correct", orb: "vfx-orb-green" };
}

// Wallet bonus for a miss-free round, capped so it stays a nice-to-have.
export function perfectBonus(score) {
  return Math.min(500, Math.round(score * 0.25));
}
