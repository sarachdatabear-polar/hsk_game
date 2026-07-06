// Canvas font-stack constants for the Visual Slice v1 look. Pure module (no
// DOM) so it's trivially testable; main.js wires these into ctx.font strings.
export const HANZI_STACK = "'LC Hanzi','Noto Serif SC','Segoe UI',serif";
export const LATIN_STACK = "'LC Latin','LC Thai','Segoe UI',sans-serif";

// Builds a canvas ctx.font string, e.g. fontString(700, 23.6, LATIN_STACK)
// -> "700 24px 'LC Latin','LC Thai','Segoe UI',sans-serif"
export function fontString(weight, px, stack) {
  return `${weight} ${Math.round(px)}px ${stack}`;
}
