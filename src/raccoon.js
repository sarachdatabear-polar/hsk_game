"use strict";
import { sprite } from "./sprites.js";
import { drawSpriteFrame } from "./sprite-draw.js";
/* drawRaccoon — the battle enemy: a cute chibi gray raccoon ninja (PRD §5.4).
   Same draw contract as the old walker (drawCat/drawZombie before it):
   drawRaccoon(ctx, x, groundY, tMs, state, scale, boss).
   state: "walk" | "happy" (defeat — comical bow, still cute) | "wrong" (smug
   little hop as it retreats). Faces LEFT (toward the player, who stands to
   its left) — asymmetric bits (tail, staff-on-back, headband tails) trail to
   the right/rear accordingly.
   scale: uniform scale around the ground-contact point (x, groundY), same
   convention as cat.js — bosses pass 1.5x (times the screen-size factor).
   boss: bigger + darker headband + the same warm gold aura hook cat.js uses
   for its boss cat, so the enemy still reads as "bigger threat" without any
   weapon being brandished (§13: cute, never scary/violent). */

// Warm/muted palette per the art-direction note — no pure black, no chrome.
const FUR = "#A39D93";        // soft warm gray fur
const FUR_DARK = "#6B655D";   // ears / mask / tail rings (warm-toned dark gray)
const OUTFIT = "#3A3F47";     // charcoal sleeveless outfit
const OUTLINE = "#846043";    // warm brown outline (staff wood + outfit trim)
const HEADBAND = "#7A94A8";   // blue-gray headband
const HEADBAND_BOSS = "#54677A"; // darker band for the boss variant
const NOSE = "#E88FA0";       // pink nose
const EYE_LIGHT = "#F5F1E8";  // cream (not pure white) eye highlight
const INK = "#3A2E1D";        // warm dark-brown linework (not pure black)

// Unscaled content height (ground to top of the painted/vector art) — lets
// main.js place the floating HP bar just above the head at any scale. Set to
// match cat.js's CONTENT_H so the sprite draw (which scales each sheet's
// measured content box to this height, see sprite-draw.js) puts the raccoon
// at the same effective size as the player cat. The vector fallback below is
// natively ~74 units ground-to-ear-tip, so it carries an extra VECTOR_SCALE
// correction to also land on this height.
export const RACCOON_HEIGHT = 64;

// vector fallback is ~74 units ground-to-ear-tip natively; scale it down to
// agree with the sprite path's RACCOON_HEIGHT.
const VECTOR_SCALE = RACCOON_HEIGHT / 74;

/* raccoonBob — pure animation math, unit-testable in isolation.
   Returns {bob, legSwing}: bob is a vertical offset (world units, pre-scale)
   added to body/head y; legSwing is a horizontal leg-swing magnitude the
   caller mirrors left/right. */
export function raccoonBob(tMs, state) {
  if (state === "happy") {
    // Defeat: a slow, damped bow that settles into a dizzy sit rather than
    // oscillating forever — reads as "sat down", not "still walking".
    const settle = Math.min(1, tMs / 600);
    const wobble = Math.sin(tMs / 90) * 1.4 * (1 - settle);
    return { bob: 8 * settle + wobble, legSwing: 0 };
  }
  if (state === "wrong") {
    // Smug little hop as it retreats: quicker cadence, a real hop (not a
    // walk stride), small leg kick.
    const ph = (tMs / 150) % (Math.PI * 2);
    const hop = Math.abs(Math.sin(ph)) * 4.5;
    return { bob: -hop, legSwing: Math.sin(ph) * 4 };
  }
  // "walk" (and any unknown/legacy state) — steady bobbing walk cycle,
  // same cadence cat.js uses so the two characters read as one world.
  const ph = (tMs / 220) % (Math.PI * 2);
  return { bob: Math.sin(ph) * 2.5, legSwing: Math.sin(ph) * 6 };
}

export function drawRaccoon(ctx, x, groundY, tMs, state, scale = 1, boss = false) {
  const { bob, legSwing } = raccoonBob(tMs, state);
  const happy = state === "happy";
  const wrong = state === "wrong";

  if (boss) {
    // Same warm-aura recipe as drawCat's boss cat, drawn unscaled (before the
    // scale transform) so it doesn't stretch. Expressed relative to the
    // historical 1.5x boss scale so it looks right at any screen size.
    ctx.save();
    ctx.fillStyle = "rgba(245,197,24,.18)";
    ctx.beginPath();
    ctx.arc(x, groundY - 28 * (scale / 1.5), 42 * (scale / 1.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (scale !== 1) {
    ctx.translate(x, groundY);
    ctx.scale(scale, scale);
    ctx.translate(-x, -groundY);
  }

  /* --- try sprite sheets first (walk/happy sheets; "wrong" borrows the walk sheet as a stopgap — see below). Sheets already face
     LEFT, same as the vector art, so no mirroring is needed. Frames are
     scaled into a box the size of RACCOON_HEIGHT so the sprite lines up with
     the same ground-contact/scale convention the vector fallback uses. --- */
  let drawn = false;
  if (state === "walk") {
    const img = sprite("raccoon-walk");
    if (img) {
      const frame = Math.floor(tMs / 110) % 6;
      drawSpriteFrame(ctx, img, frame, x, groundY, "raccoon-walk", RACCOON_HEIGHT);
      drawn = true;
    }
  }
  if (!drawn && happy) {
    const img = sprite("raccoon-happy");
    if (img) {
      const frame = Math.floor(tMs / 80) % 4;
      drawSpriteFrame(ctx, img, frame, x, groundY, "raccoon-happy", RACCOON_HEIGHT);
      drawn = true;
    }
  }
  // Stopgap until a dedicated raccoon-wrong sheet lands (art round, audit
  // 2026-07-20): reuse the walk sheet at a slow amble so the wrong-state
  // raccoon keeps the painted style instead of dropping to the grey vector
  // ghost. The retreat drift comes from main.js moving z.x; the bob hop and
  // smug lean stay vector-only niceties.
  if (!drawn && wrong) {
    const img = sprite("raccoon-walk");
    if (img) {
      const frame = Math.floor(tMs / 160) % 6;
      drawSpriteFrame(ctx, img, frame, x, groundY, "raccoon-walk", RACCOON_HEIGHT);
      drawn = true;
    }
  }

  /* --- vector raccoon fallback --- */
  if (!drawn) {
  ctx.save();
  ctx.translate(x, groundY);
  // vector art is natively ~74 units ground-to-ear; scale down to agree
  // with the sprite path's RACCOON_HEIGHT (see VECTOR_SCALE above). Scaling
  // about the origin here (post-translate, so about the ground-contact
  // point) keeps the feet planted on groundY.
  ctx.scale(VECTOR_SCALE, VECTOR_SCALE);

  if (happy) {
    ctx.rotate(0.18);          // comical forward bow
  } else if (wrong) {
    ctx.rotate(-0.08);         // smug little backward lean while hopping away
  }

  const headband = boss ? HEADBAND_BOSS : HEADBAND;

  // ringed tail — a raised loop behind the back/shoulder (not a low drag
  // trail) so it stays clear of the arms and reads as its own shape, tip
  // trailing to the rear/right since the raccoon faces left.
  ctx.strokeStyle = FUR_DARK; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(8, -18 + bob); ctx.quadraticCurveTo(25, -34 + bob, 15, -58 + bob); ctx.stroke();
  ctx.strokeStyle = "#E4DFD4"; ctx.lineWidth = 2.6;
  for (const p of [[10.5, -24], [16, -34], [18.5, -45]]) {
    ctx.beginPath(); ctx.moveTo(p[0] - 2.6, p[1] + 1.6 + bob); ctx.lineTo(p[0] + 2.6, p[1] - 1.6 + bob); ctx.stroke();
  }

  // legs
  ctx.strokeStyle = FUR_DARK; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-5 - legSwing * 0.4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -20);  ctx.lineTo(5 + legSwing * 0.4, 0);  ctx.stroke();

  // charcoal sleeveless outfit (torso), warm-brown trim instead of black
  ctx.fillStyle = OUTFIT;
  ctx.fillRect(-11, -40 + bob, 22, 22);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
  ctx.strokeRect(-11, -40 + bob, 22, 22);

  // short wooden staff strapped diagonally across its back, over the outfit
  // (visible, but never brandished/pointed at anything)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-7, -41 + bob); ctx.lineTo(9, -18 + bob); ctx.stroke();

  // small paws, symmetric swing (nothing brandished, nothing reaching)
  ctx.strokeStyle = FUR; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-9, -34 + bob); ctx.lineTo(-15, -26 + bob + legSwing * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -34 + bob);  ctx.lineTo(15, -26 + bob - legSwing * 0.2); ctx.stroke();

  // round head, gray fur (~45-50% of total height, matching the art spec)
  ctx.fillStyle = FUR;
  ctx.beginPath(); ctx.arc(0, -49 + bob, 11, 0, Math.PI * 2); ctx.fill();

  // ears
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath(); ctx.moveTo(-9, -57 + bob); ctx.lineTo(-13, -66 + bob); ctx.lineTo(-3, -59 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, -57 + bob);  ctx.lineTo(13, -66 + bob);  ctx.lineTo(3, -59 + bob);  ctx.closePath(); ctx.fill();

  // headband with a couple of little trailing tails (rear side, since facing left)
  ctx.fillStyle = headband;
  ctx.fillRect(-11, -55 + bob, 22, 5);
  ctx.beginPath(); ctx.moveTo(11, -55 + bob); ctx.lineTo(17, -51 + bob); ctx.lineTo(11, -50 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(11, -52 + bob); ctx.lineTo(16, -47 + bob); ctx.lineTo(10, -47 + bob); ctx.closePath(); ctx.fill();

  // darker eye-mask stripes (the raccoon marking)
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath(); ctx.ellipse(-4, -50 + bob, 3.6, 2.6, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -50 + bob, 3.6, 2.6, 0.15, 0, Math.PI * 2); ctx.fill();

  // eyes — friendly and determined, never angry
  if (happy) {
    // dizzy: cute closed curved eyes drawn right over the mask
    ctx.strokeStyle = EYE_LIGHT; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-4, -49 + bob, 2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, -49 + bob, 2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  } else {
    ctx.fillStyle = EYE_LIGHT;
    ctx.beginPath(); ctx.ellipse(-4, -50 + bob, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -50 + bob, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK;
    if (wrong) {
      // smug half-lidded look: a flat line instead of a round pupil
      ctx.fillRect(-5.4, -50 + bob, 2.8, 1.1);
      ctx.fillRect(2.6, -50 + bob, 2.8, 1.1);
    } else {
      ctx.beginPath(); ctx.arc(-4, -50 + bob, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -50 + bob, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // pink nose
  ctx.fillStyle = NOSE;
  ctx.beginPath(); ctx.arc(0, -46 + bob, 1.4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
  }

  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* drawHpBar — floating cosmetic HP bar above the raccoon. frac is 0..1;
   positioning (x, y, w) is entirely left to the caller so it can be placed
   above the raccoon's head at any scale/boss size. T5 recolor: cream border,
   deep-teal track, primary-green fill (battle-interface round §4 — same
   geometry/signature, palette tokens only). */
export function drawHpBar(ctx, x, y, w, frac, scale = 1) {
  const f = Math.max(0, Math.min(1, frac));
  const h = 6 * scale;
  const bw = Math.max(1, 1.2 * scale);
  ctx.save();
  ctx.fillStyle = "#1F4D4A";
  roundedRect(ctx, x - w / 2, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = "#FBF5E8"; ctx.lineWidth = bw;
  roundedRect(ctx, x - w / 2, y, w, h, h / 2); ctx.stroke();
  if (f > 0) {
    const pad = Math.min(scale, w / 2, h / 2);
    const innerW = Math.max(0, (w - pad * 2) * f);
    const innerH = Math.max(0, h - pad * 2);
    ctx.fillStyle = "#32775E";
    roundedRect(ctx, x - w / 2 + pad, y + pad, innerW, innerH, innerH / 2);
    ctx.fill();
  }
  ctx.restore();
}
