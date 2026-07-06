# Lucky Cat HSK Art Source

This folder holds source art, references, and approved production masters for the Production Art Vertical Slice v1.

## Rules

- `style-guide/REFERENCE-production-target.png` is a visual target only.
- Runtime assets live in `assets/` and must use filenames from `assets/asset-manifest.json`.
- High-resolution masters and layered source files live here, grouped by category.
- Do not mark an asset `approved` in the manifest until it has passed the checklist in `docs/CODEX-ART-HANDOFF-CHECKLIST.md`.
- Do not bake Hanzi, pinyin, Thai, English, scores, buttons, or dynamic labels into raster art.
- Keep transparent PNG edges clean with no white halo.

## Suggested Source Layout

```text
art-source/
  style-guide/
  characters/
  backgrounds/
  ui/
  effects/
  rejected/
```
