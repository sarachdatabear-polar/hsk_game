export function killPoints(combo, distFrac) {
  const distBonus = Math.round(8 * Math.max(0, Math.min(1, distFrac)));
  return Math.round((10 + distBonus) * (1 + (combo - 1) * 0.1));
}
