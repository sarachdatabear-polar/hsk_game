export function drawZombie(ctx, x, groundY, tMs, state) {
  const speed = state === "dash" ? 3 : 1;
  const ph = (tMs / (220 / speed)) % (Math.PI * 2);
  const bob = Math.sin(ph) * 2.5;
  const legSwing = Math.sin(ph) * (state === "dash" ? 10 : 6);
  const dying = state === "dying";
  ctx.save();
  ctx.translate(x, groundY);
  if (dying) { ctx.globalAlpha = 0.5; ctx.rotate(0.9); }
  // legs
  ctx.strokeStyle = "#3f6b33"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-5 + legSwing * 0.4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -20);  ctx.lineTo(5 - legSwing * 0.4, 0);  ctx.stroke();
  // body (torn shirt)
  ctx.fillStyle = "#5d4a63";
  ctx.fillRect(-11, -40 + bob, 22, 22);
  // arms reaching left (toward the bear)
  ctx.strokeStyle = "#7ec850"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -34 + bob); ctx.lineTo(-24, -30 + bob + legSwing * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -28 + bob); ctx.lineTo(-22, -24 + bob - legSwing * 0.3); ctx.stroke();
  // head
  ctx.fillStyle = "#8fce58";
  ctx.beginPath(); ctx.arc(0, -48 + bob, 10, 0, 7); ctx.fill();
  // eye + mouth
  ctx.fillStyle = "#1c241a";
  ctx.beginPath(); ctx.arc(-4, -50 + bob, 1.8, 0, 7); ctx.fill();
  ctx.fillRect(-7, -44 + bob, 6, 1.6);
  // hair tuft
  ctx.strokeStyle = "#3f6b33"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -58 + bob); ctx.lineTo(2, -62 + bob); ctx.stroke();
  ctx.restore();
}
