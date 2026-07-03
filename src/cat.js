"use strict";
import { sprite } from "./sprites.js";

/* drawCat — friendly walking/celebrating cat.
   state: "walk" | "happy"
   All drawing is self-contained; sprite() returns null until the PNG loads,
   so the vector fallback always shows first (file:// safe). */
export function drawCat(ctx, x, groundY, tMs, state) {
  const ph = (tMs / 220) % (Math.PI * 2);
  const bob = Math.sin(ph) * 2.5;
  const legSwing = Math.sin(ph) * 6;
  const happy = state === "happy";

  /* --- try sprite sheet first --- */
  if (state === "walk") {
    const img = sprite("cat-walk");
    if (img) {
      const frame = Math.floor(tMs / 110) % 6;
      ctx.drawImage(img, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
      return;
    }
  }
  if (happy) {
    const img = sprite("cat-happy");
    if (img) {
      const frame = Math.floor(tMs / 80) % 4;
      ctx.drawImage(img, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
      return;
    }
  }

  /* --- vector cat fallback --- */
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
  ctx.strokeStyle = "#c87340"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-5 + legSwing * 0.4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -20);  ctx.lineTo(5 - legSwing * 0.4, 0);  ctx.stroke();

  // body (orange torso)
  ctx.fillStyle = "#e07830";
  ctx.fillRect(-11, -40 + bob, 22, 22);

  // raised paw (toward left, where the bear/mascot is)
  ctx.strokeStyle = "#e07830"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -34 + bob); ctx.lineTo(-24, -30 + bob + legSwing * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -28 + bob); ctx.lineTo(-22, -24 + bob - legSwing * 0.3); ctx.stroke();

  // head
  ctx.fillStyle = "#f09040";
  ctx.beginPath(); ctx.arc(0, -48 + bob, 10, 0, 7); ctx.fill();

  // ears
  ctx.fillStyle = "#f09040";
  ctx.beginPath(); ctx.moveTo(-8, -56 + bob); ctx.lineTo(-13, -65 + bob); ctx.lineTo(-2, -58 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, -56 + bob);  ctx.lineTo(13, -65 + bob);  ctx.lineTo(2, -58 + bob);  ctx.closePath(); ctx.fill();
  // inner ear pink
  ctx.fillStyle = "#f5a0b0";
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
