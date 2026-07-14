# Art task — regen `cat-walk` v2 (clean matte)  ·  audit #7

**Status:** queued for Jordan (owner-gated art regen). Raised 2026-07-14 from the audit
UI fixes round; the size half of #7 is already fixed in code (`src/sprite-draw.js`
shared-scale anchoring). See `docs/planning/2026-07-14-audit-uiux-fixes-plan.md` §#7.

## Defect

The battle cat shows a faint **white halo** on a wrong/idle answer but not on a correct
one. Cause is a white anti-alias **fringe baked into `assets/cat-walk.png`** (the walk
pose), part of the v2 side-profile art (`be7f9e3`). It is **not** a code-drawn box and
**not** a transparency problem — the sheet is properly transparent otherwise.

Measured (2026-07-14):

| sheet | transparent | near-white semi-transparent fringe pixels |
|---|---|---|
| `cat-walk.png`  | ~91% | **629 (19.6% of its fringe)** ← the halo |
| `cat-happy.png` | ~92% | 12 (0.7%) — clean, use as the reference |

The white shows against the game's cream/painted battle background as a light rim on the
walking cat only.

## Ask

Re-export **`assets/cat-walk.png`** (all 6 frames, 256px columns) with a **clean matte** —
composite/erode the edge so partial-alpha edge pixels carry the cat's own edge colour, not
white — matching `cat-happy.png`'s clean edges. Keep the pose, palette, scarf, and the
green book unchanged. Interior fur is fully opaque and must be untouched.

**Do not** auto-"make near-white transparent" — the cat's fur is light and that eats it.

## Optional (nice-to-have, not required)

The size half is already handled in code by anchoring `cat-happy`'s scale to `cat-walk`'s
bbox height. If the walk sheet is being re-rendered anyway, framing it to fill the 256 box
more like the purchased skins (which fill ~l8–28 / t12 / b244) would let the auto-metrics
normalize the default cat exactly like every skin and make the code anchor redundant — but
that is a cleanup, not a blocker.

## After the new PNG lands

1. Drop it in via the normal art-intake flow.
2. `python3 scripts/gen_sprite_metrics.py` (metrics regen after any character-sheet change).
3. `npm run build` → `npm test`.
4. Re-check the correct-vs-wrong cat in a battle screenshot — no white rim, consistent size.
   (The `src/sprite-draw.js` `SCALE_ANCHOR` reads live metrics, so it survives the regen;
   revisit only if you do the optional re-framing above.)
