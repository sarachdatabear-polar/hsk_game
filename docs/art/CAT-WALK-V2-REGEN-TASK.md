# Art task — regen `cat-walk` v2 (clean matte)  ·  audit #7

**Status:** ✅ DONE 2026-07-14. Jordan dropped the clean-matte walk regen; intaken via
`repack_cat_sheets.py` + `gen_sprite_metrics.py`. Halo cut from 19.6% → **5.1%** of edge
pixels; new walk bbox (100×124) now matches cat-happy (99×127), so size parity is natural
in the art (the `src/sprite-draw.js` anchor is now a harmless no-op safety net). 1834 tests
green; verified in-game (no white rim, consistent size). Prompt used is below for the record.

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

## Generation prompt (copy-paste)

The halo is really a **matte** problem: the generator ships opaque on a near-white
background, and `scripts/repack_cat_sheets.py` flood-fills that to transparent — but
anti-aliased edge pixels that are *fur-colour blended toward white* aren't "neutral
near-white", so they survive as a light rim. The fix in the prompt is a **crisp
continuous dark outline + pure-flat-white background + no shadow/glow**, so the outermost
ring is the dark outline (a clean flood-fill barrier) and any residual fringe reads dark,
not white.

> A cheerful calico lucky cat walking in a **side profile facing right**, in the same
> warm storybook watercolour-flat hybrid style, proportions, and scale as the current
> game cat and the raccoon character. White body with orange-and-brown patches, a **red
> neckerchief/scarf**, holding a small **jade-green book** — friendly and upright, not
> crawling. A **6-frame horizontal walking cycle**, each frame the full character on a
> stable foot baseline, identical markings, scarf, and book on every frame (no
> frame-to-frame colour or costume drift), with a **clear blank gap between each frame**.
> Every frame has a **crisp, continuous dark-brown outline** around the whole silhouette —
> no soft, feathered, or glowing edges. **Pure flat white (#FFFFFF) background, perfectly
> uniform — no gradient, no vignette, no drop shadow, no ground/contact shadow, no ambient
> glow.** Match the pose scale and foot baseline of the existing clean `cat-happy` sitting
> pose so the walk and happy poses read at the same size.

Notes:
- **Match `cat-happy.png` for orientation, palette, scarf, and scale** — it is the clean
  reference; only the walk sheet needs redoing. (If you'd rather redo both for perfectly
  consistent framing, use the same prompt with "a 4-frame happy sitting/celebration cycle"
  and drop both into the intake.)
- The generator's canvas size doesn't matter — `repack_cat_sheets.py` re-slices on the
  blank gutters between frames, so the **clear gap between frames** is what matters.
- If a faint rim still survives the keyer, that's a pipeline gap, not a prompt gap — the
  guaranteed fix is an edge de-matte pass in `remove_background()` (un-multiply white from
  partial-alpha edge pixels); ask Claude to add it.

## After the new PNG lands

1. Drop it in via the normal art-intake flow.
2. `python3 scripts/gen_sprite_metrics.py` (metrics regen after any character-sheet change).
3. `npm run build` → `npm test`.
4. Re-check the correct-vs-wrong cat in a battle screenshot — no white rim, consistent size.
   (The `src/sprite-draw.js` `SCALE_ANCHOR` reads live metrics, so it survives the regen;
   revisit only if you do the optional re-framing above.)
