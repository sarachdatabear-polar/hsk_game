# Task: Extract production-ready game assets from a flattened reference image

The attached file `REFERENCE-production-target.png` is a flattened production-art
reference sheet containing characters, animation frames, backgrounds, buttons,
panels, icons, effects and other game assets.

Build and run a deterministic asset-extraction pipeline.

## Critical rule

DO NOT regenerate, redraw, reinterpret, enhance or use generative image tools.

The exact pixels in the reference image are the source of truth.

Do not invent hidden or missing parts of an asset. Do not use generative fill.
Do not modify facial features, colors, outlines, proportions, text or details.

## Main objectives

1. Identify individual game assets visible in the reference sheet.
2. Extract each asset as a separate PNG using direct pixel crops.
3. Preserve an exact, unmodified version of every extracted crop.
4. Produce transparent PNG versions only when transparency can be created
   without changing the visible subject.
5. Create SVG versions using the rules below.
6. Generate a machine-readable asset manifest.
7. Generate visual QA reports so every extraction can be reviewed.

## Extraction priority

Start with the section titled:

`9. ASSET DELIVERABLES (FIRST SET)`

It contains the clearest individual production assets.

Extract obvious items including, when present:

- cat walking animation frames
- cat happy animation frames
- maneki cat
- cat portrait
- home background
- battle background
- market background
- UI panel
- word plaque
- primary button
- secondary button
- correct effect
- wrong effect
- critical effect
- individual UI icons

Then inspect the other sections for additional unique assets.

Do not extract duplicate previews unless they provide a larger or clearer version.

## Output directory

Create this structure:

assets/
  source/
    reference/
      REFERENCE-production-target.png

  png/
    exact/
      characters/
      backgrounds/
      ui/
      icons/
      effects/
      props/

    transparent/
      characters/
      ui/
      icons/
      effects/
      props/

  svg/
    embedded/
      characters/
      backgrounds/
      ui/
      icons/
      effects/
      props/

    vector/
      ui/
      icons/
      effects/

  atlases/
    characters/
    ui/

  metadata/
    assets.json
    assets.csv
    extraction-regions.json

  reports/
    extraction-map.png
    contact-sheet.png
    transparency-checkerboard.png
    comparison-report.html
    unresolved-assets.md

tools/
  extract_assets.py
  create_transparency.py
  create_svg_wrappers.py
  vectorize_simple_assets.py
  build_atlas.py
  generate_reports.py
  validate_assets.py

tests/
  test_pixel_integrity.py
  test_manifest.py

## Exact PNG requirements

For every identified asset:

1. Crop directly from the original reference.
2. Do not resize the exact crop.
3. Do not sharpen, denoise, recolor or compress destructively.
4. Preserve the source color profile when possible.
5. Export losslessly as RGBA PNG.
6. Record the exact source rectangle:

   - x
   - y
   - width
   - height

7. Record the SHA-256 hash of the output.
8. Use stable lowercase kebab-case filenames.

Example:

`cat-walk-01.png`
`cat-walk-02.png`
`bg-home.png`
`ui-button-primary.png`
`fx-correct.png`

## Transparency requirements

Do not claim that a transparent asset is pixel-perfect unless only the background
pixels were removed.

Use these rules:

- Preserve all original RGB values inside the asset.
- Only modify alpha where necessary.
- Preserve anti-aliased edge pixels.
- Do not use aggressive color-key removal.
- Do not erase internal colors that resemble the background.
- Preserve intentional shadows when possible.
- Save the alpha mask separately when useful.
- Mark uncertain extractions as `needs_manual_mask`.
- Never synthesize pixels hidden by another object, border or text.

Create both:

1. The untouched rectangular crop in `assets/png/exact/`
2. The transparent candidate in `assets/png/transparent/`

## SVG requirements

Produce two clearly separated SVG types.

### A. Embedded-raster SVG

For every PNG, create a self-contained SVG in `assets/svg/embedded/`.

Requirements:

- Match the PNG canvas dimensions.
- Embed the PNG as base64 data.
- Set an accurate `viewBox`.
- Preserve aspect ratio.
- Do not link to an external PNG.
- The rendered result must match the PNG exactly.

Add this metadata:

`svgType: "embedded-raster"`
`isTrueVector: false`
`pixelExact: true`

### B. True vector SVG

Only attempt true vector conversion for simple, flat assets such as:

- basic icons
- simple badges
- simple buttons
- panel borders
- flat paw effects
- uncomplicated logos

Do not auto-vectorize:

- characters
- detailed backgrounds
- painterly illustrations
- gradients with complex textures
- small text
- highly detailed effects

True-vector outputs go in `assets/svg/vector/`.

Requirements:

- Use clean paths.
- Minimize unnecessary nodes.
- Preserve the viewBox.
- Preserve transparency.
- Avoid embedded raster images.
- Compare the rendered SVG against the original crop.
- Mark all vectorized files as approximate.
- Do not replace the exact PNG with the traced SVG.

Add this metadata:

`svgType: "true-vector"`
`isTrueVector: true`
`pixelExact: false`
`vectorizationStatus: "approximate"`

If the result is visually poor, do not save it as approved. Record it in
`unresolved-assets.md`.

## Animation-frame requirements

For animation sequences:

- Extract each frame separately.
- Put all frames on an equal-sized transparent canvas.
- Do not stretch individual frames.
- Align character feet to a common baseline.
- Use a consistent bottom-center pivot.
- Record each frame's original crop and placement offset.
- Generate a horizontal sprite sheet.
- Generate a JSON atlas.
- Preserve the original individual frames.

Suggested naming:

`cat-walk-01.png`
`cat-walk-02.png`
`cat-walk-03.png`

Suggested metadata:

- sequence
- frameIndex
- durationMs
- sourceRect
- trimmedRect
- canvasSize
- pivot
- baseline
- offset

Do not invent missing animation frames.

## Background requirements

For backgrounds:

- Extract the exact visible preview.
- Do not upscale it in the exact directory.
- Record the extracted resolution.
- Do not claim it is the original full-resolution game background.
- Mark it as `preview-resolution` when appropriate.

## Asset manifest

Create `assets/metadata/assets.json`.

Use an entry similar to:

```json
{
  "id": "cat-walk-01",
  "name": "Cat Walk Frame 01",
  "category": "character",
  "sourceFile": "REFERENCE-production-target.png",
  "sourceRect": {
    "x": 0,
    "y": 0,
    "width": 100,
    "height": 100
  },
  "exactPng": "assets/png/exact/characters/cat-walk-01.png",
  "transparentPng": "assets/png/transparent/characters/cat-walk-01.png",
  "embeddedSvg": "assets/svg/embedded/characters/cat-walk-01.svg",
  "trueVectorSvg": null,
  "canvasSize": {
    "width": 128,
    "height": 128
  },
  "pivot": {
    "x": 0.5,
    "y": 1.0
  },
  "status": "extracted",
  "transparencyStatus": "review-required",
  "pixelExact": true,
  "resolutionClass": "preview-resolution",
  "sha256": ""
}