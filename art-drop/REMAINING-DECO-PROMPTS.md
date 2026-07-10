# Remaining shop art to generate — 3 preview tiles (the asset-gated F6 batch)

The 10 v7 street decos previously listed here all shipped (PR #63). What remains is
the **shop preview-tile batch**: 2 regenerations + 1 new tile from the v50 audit (F6).

Why regenerate: the existing `tile-arcade.png` / `tile-lion-drum.png` raws in this
folder were generated on **plain white** — light object parts (drumhead, speaker
grille) mean the white can't be auto-removed cleanly, and white tiles clash with the
4 dark tiles already shipped (`tile-bells`, `tile-sakura-fx`, `tile-firecracker-fx`,
`tile-star-shower`). These tiles are used **full-bleed** (no background removal), so
the background must be part of the art: **soft dark gray with a warm golden radial
glow** behind the subject.

## Workflow (full batch before intake — all 3 in this folder, then say go)
1. Generate each image (AI Studio / ChatGPT). Square 1:1 is fine — the tile path
   center-crops to a 96×64 landscape preview, so keep the subject centered with
   breathing room top/bottom.
2. Save over the old raws with the same names: **`tile-arcade.png`**,
   **`tile-lion-drum.png`**, plus new **`tile-streak-freeze.png`** — all into this
   `art-drop/` folder.
3. Tell Claude "go" — intake, manifest, sprite registration, the small code change
   to give consumables the painted-tile path, precache + SHELL bump are Claude's job.

---

## 1. tile-arcade.png — shop tile for the "Arcade" soundpack

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute retro arcade cabinet game asset, centered on a **soft dark-gray
> background with a warm golden radial glow** behind it (the glow fades to dark
> toward the edges — the background is part of the image, not removed later).
> Deep-teal cabinet body with warm-brown trim, cream screen glowing softly sun-yellow,
> two chunky coral buttons and a little joystick. Round friendly shapes, clean chunky
> silhouette, medium line weight, subject fills about two-thirds of the frame.
> Strictly avoid: any lettering or characters on the screen or marquee, photorealism,
> neon colors, drop shadow, background scenery, people or animals, watermark.

## 2. tile-lion-drum.png — shop tile for the "Lion Dance Drum" soundpack

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute Chinese lion-dance drum game asset, centered on a **soft dark-gray
> background with a warm golden radial glow** behind it (the glow fades to dark
> toward the edges — the background is part of the image, not removed later).
> Big round coral drum body with warm-brown wooden stand, cream drumhead, sun-yellow
> tassels and two crossed drumsticks resting on top. Round friendly shapes, clean
> chunky silhouette, medium line weight, subject fills about two-thirds of the frame.
> Strictly avoid: any lettering or characters, photorealism, neon colors, drop
> shadow, background scenery, people or lion costumes, watermark.

## 3. tile-streak-freeze.png — shop tile for the "Streak Freeze" consumable (NEW, audit F6)

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute frozen charm game asset: a small sky-blue ice crystal shaped like a
> rounded snowflake with a tiny flame sealed safely inside it glowing sun-yellow,
> centered on a **soft dark-gray background with a warm golden radial glow** behind
> it (the glow fades to dark toward the edges — the background is part of the image,
> not removed later). A few tiny pale-blue sparkles around it. Round friendly shapes,
> clean chunky silhouette, medium line weight, subject fills about two-thirds of the
> frame.
> Strictly avoid: any lettering or characters, photorealism, neon colors, drop
> shadow, background scenery, snowmen, people or animals, watermark.
