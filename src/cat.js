"use strict";
import { sprite } from "./sprites.js";
import { drawSpriteFrame } from "./sprite-draw.js";

// default palette = current look, so calls without a palette are unchanged.
const DEFAULT_PALETTE = { body: "#e07830", head: "#f09040", ear: "#f09040", inner: "#f5a0b0", leg: "#c87340" };

/* drawCat — friendly walking/celebrating cat.
   state: "walk" | "happy"
   palette: optional {body,head,ear,inner,leg} recolor (see shop.js SKIN_PALETTES)
   scale: optional uniform scale (default 1) around the ground-contact point
   (x, groundY) — bosses draw at 1.5x, but now that scale also carries the
   screen-size factor (see layout.js), a normal cat can exceed 1 on big
   screens too, so the gold aura is gated on the explicit `boss` flag instead
   of `scale > 1`.
   accessories: retained as a legacy argument for older callers. Milestone
   costume overlays are intentionally ignored because the authored cat sheets
   already carry their own clothing; "kitten" remains a separate companion
   drawn by the caller.
   boss: whether this is the boss cat (drives the gold aura only).
   All drawing is self-contained; sprite() returns null until the PNG loads,
   so the vector fallback always shows first (file:// safe). */
export function drawCat(ctx, x, groundY, tMs, state, palette, scale = 1, _accessories = [], boss = false) {
  const pal = palette || DEFAULT_PALETTE;
  const ph = (tMs / 220) % (Math.PI * 2);
  const bob = Math.sin(ph) * 2.5;
  const legSwing = Math.sin(ph) * 6;
  const happy = state === "happy";

  if (boss) {
    // gold aura behind the boss cat — drawn in unscaled world space so it
    // doesn't stretch, before the scale transform below. Radius/offset are
    // expressed relative to the historical 1.5x boss scale so it looks the
    // same as before at any screen size (42 = 28*1.5, groundY-28 likewise).
    ctx.fillStyle = "rgba(245,197,24,.18)";
    ctx.beginPath(); ctx.arc(x, groundY - 28 * (scale / 1.5), 42 * (scale / 1.5), 0, Math.PI * 2); ctx.fill();
  }

  if (scale !== 1) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(scale, scale);
    ctx.translate(-x, -groundY);
  }

  /* --- try sprite sheets first. Purchased skins and bosses have their own
     PNG sheets; filters are only a fallback while those sheets load/miss. --- */
  let drawn = false;
  const baseSprite = boss ? "cat-boss" : pal.sprite || "cat";
  if (state === "walk") {
    let img = sprite(`${baseSprite}-walk`);
    let sheetName = `${baseSprite}-walk`;
    let tint = "none";
    if (!img) {
      img = sprite("cat-walk");
      sheetName = "cat-walk";
      tint = pal.filter || "none";
    }
    if (img) {
      const frame = Math.floor(tMs / 110) % 6;
      ctx.filter = tint;
      drawSpriteFrame(ctx, img, frame, x, groundY, sheetName, 64);
      ctx.filter = "none";
      drawn = true;
    }
  }
  if (!drawn && happy) {
    let img = sprite(`${baseSprite}-happy`);
    let sheetName = `${baseSprite}-happy`;
    let tint = "none";
    if (!img) {
      img = sprite("cat-happy");
      sheetName = "cat-happy";
      tint = pal.filter || "none";
    }
    if (img) {
      const frame = Math.floor(tMs / 80) % 4;
      ctx.filter = tint;
      drawSpriteFrame(ctx, img, frame, x, groundY, sheetName, 64);
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
