"use strict";
import { sprite } from "./sprites.js";

// default palette = current look, so calls without a palette are unchanged.
const DEFAULT_PALETTE = { body: "#e07830", head: "#f09040", ear: "#f09040", inner: "#f5a0b0", leg: "#c87340" };

/* drawCat — friendly walking/celebrating cat.
   state: "walk" | "happy"
   palette: optional {body,head,ear,inner,leg} recolor (see shop.js SKIN_PALETTES)
   scale: optional uniform scale (default 1) around the ground-contact point
   (x, groundY) — used at 1.5 for bosses, with a gold aura behind the cat.
   All drawing is self-contained; sprite() returns null until the PNG loads,
   so the vector fallback always shows first (file:// safe). */
export function drawCat(ctx, x, groundY, tMs, state, palette, scale = 1) {
  const pal = palette || DEFAULT_PALETTE;
  const ph = (tMs / 220) % (Math.PI * 2);
  const bob = Math.sin(ph) * 2.5;
  const legSwing = Math.sin(ph) * 6;
  const happy = state === "happy";

  if (scale !== 1) {
    if (scale > 1) {
      // gold aura behind an enlarged (boss) cat — drawn in unscaled world
      // space so it doesn't stretch, before the scale transform below.
      ctx.fillStyle = "rgba(245,197,24,.18)";
      ctx.beginPath(); ctx.arc(x, groundY - 28, 42, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(scale, scale);
    ctx.translate(-x, -groundY);
  }

  /* --- try sprite sheet first; equipped skins recolor it with ctx.filter
     (pal.filter), so the real art is kept for every skin. The vector path
     below only covers the pre-load frames / missing PNGs. --- */
  let drawn = false;
  const tint = pal.filter || "none";
  if (state === "walk") {
    const img = sprite("cat-walk");
    if (img) {
      const frame = Math.floor(tMs / 110) % 6;
      ctx.filter = tint;
      ctx.drawImage(img, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
      ctx.filter = "none";
      drawn = true;
    }
  }
  if (!drawn && happy) {
    const img = sprite("cat-happy");
    if (img) {
      const frame = Math.floor(tMs / 80) % 4;
      ctx.filter = tint;
      ctx.drawImage(img, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
      ctx.filter = "none";
      drawn = true;
    }
  }

  /* --- vector cat fallback --- */
  if (!drawn) {
  ctx.save();
  ctx.translate(x, groundY);
  if (happy) {
    ctx.rotate(-0.25);
    ctx.globalAlpha = 0.85;
    // gold sparkle dots
    ctx.fillStyle = "#f5c518";
    const sparkOffsets = [[-18, -60], [18, -60], [0, -72], [-22, -42], [22, -42]];
    for (const [sx, sy] of sparkOffsets) {
      ctx.beginPath(); ctx.arc(sx, sy + bob, 2.5, 0, 7); ctx.fill();
    }
  }

  // legs
  ctx.strokeStyle = pal.leg; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-5 + legSwing * 0.4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -20);  ctx.lineTo(5 - legSwing * 0.4, 0);  ctx.stroke();

  // body (torso)
  ctx.fillStyle = pal.body;
  ctx.fillRect(-11, -40 + bob, 22, 22);

  // raised paw (toward left, where the bear/mascot is)
  ctx.strokeStyle = pal.body; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -34 + bob); ctx.lineTo(-24, -30 + bob + legSwing * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -28 + bob); ctx.lineTo(-22, -24 + bob - legSwing * 0.3); ctx.stroke();

  // head
  ctx.fillStyle = pal.head;
  ctx.beginPath(); ctx.arc(0, -48 + bob, 10, 0, 7); ctx.fill();

  // ears
  ctx.fillStyle = pal.ear;
  ctx.beginPath(); ctx.moveTo(-8, -56 + bob); ctx.lineTo(-13, -65 + bob); ctx.lineTo(-2, -58 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, -56 + bob);  ctx.lineTo(13, -65 + bob);  ctx.lineTo(2, -58 + bob);  ctx.closePath(); ctx.fill();
  // inner ear
  ctx.fillStyle = pal.inner;
  ctx.beginPath(); ctx.moveTo(-7, -57 + bob); ctx.lineTo(-11, -63 + bob); ctx.lineTo(-3, -59 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -57 + bob);  ctx.lineTo(11, -63 + bob);  ctx.lineTo(3, -59 + bob);  ctx.closePath(); ctx.fill();

  // eye + nose
  ctx.fillStyle = "#1c1008";
  ctx.beginPath(); ctx.arc(-4, -50 + bob, 1.8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -50 + bob, 1.8, 0, 7); ctx.fill();
  ctx.fillStyle = "#e05a78";
  ctx.beginPath(); ctx.arc(0, -47 + bob, 1.2, 0, 7); ctx.fill();

  // whiskers
  ctx.strokeStyle = "#1c1008"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-4, -47 + bob); ctx.lineTo(-14, -45 + bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, -47 + bob); ctx.lineTo(-14, -48 + bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -47 + bob);  ctx.lineTo(14, -45 + bob);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -47 + bob);  ctx.lineTo(14, -48 + bob);  ctx.stroke();

  ctx.restore();
  }

  if (scale !== 1) ctx.restore();
}
