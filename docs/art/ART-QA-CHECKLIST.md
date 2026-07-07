# Art QA Checklist — PRD v5 A2 (style-locked assets)

Gate order per asset: `python3 scripts/qa_asset.py assets/<file>` (mechanical:
dims, budget, transparency, frame math, palette advisory) → the judgment items
below → set the manifest row's `status` → `npm test`.
An asset may reach `approved`/`integrated` only with qa_asset PASS/WARN (no
FAIL) and every judgment box checked.

## Judgment (manual, vs assets/_plan/REFERENCE-production-target.png)
- [ ] Palette reads as the STYLE-TOKENS.md six-color world; warm, slightly muted; no pure black/white, no neon, no casino gloss.
- [ ] Light comes from the UPPER LEFT; shadows soft, warm, down-right.
- [ ] Silhouette readable at 48–80 px on a phone; friendly round shapes.
- [ ] Line weight consistent with the reference (medium, soft edges).
- [ ] Character proportions match the anchor (round head ≈45% height) and stay identical across every frame.
- [ ] No baked-in Hanzi/pinyin/Thai/English/score text; no money-bag/wealth-medallion focal object.
- [ ] Backgrounds: low-detail center band (word card overlays it); battle lane flat along the bottom fifth.

## Mechanical (qa_asset.py enforces — listed for visibility)
- Dims exactly match the manifest `w`/`h`; sprite sheets: `frameWidth*frames == w`.
- Budgets: backgrounds <350 KB (1024×512 PNGs: `scripts/compress_bg.py`; full-screen 1080×1920: `scripts/to_webp.py`), cat/raccoon sheets <500 KB, coin-class icons <20 KB.
- Alpha where the type requires it; clean transparency (no opaque matte corners).

## Integration
- [ ] Loads through `src/assets.js` / `src/sprites.js`; canvas/CSS fallback still renders with the PNG absent (file:// safety).
- [ ] `npm run assets:validate` exits 0; `npm run assets:report` shows the row with no OVER flag; `npm test` green.
- [ ] Legible at 360×640, 390×844, 412×915; Thai labels unclipped; reduced-motion respected.
- [ ] Log the result (PASS/FAIL + date) in the manifest row's `note` if anything was borderline.
