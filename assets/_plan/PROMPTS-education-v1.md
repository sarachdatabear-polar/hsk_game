# Image-Generation Prompt Pack — Education-First v1

Compiled from `ART-PRODUCTION-ORDER-DETAILED.md` (source of truth). One copy-paste block
per raster asset, in production order. **Generate → review against §11 checklist → save
into `art-source/education-v1/` → only then promote to `assets/`.**

## How to run this pack

1. Generate **1. cat-study** first. It is the character master — nothing else may be
   generated until it is approved.
2. For every later cat asset, **attach the approved `cat-study.png` as an image
   reference** and keep the continuity line in the prompt.
3. Request the exact canvas size. If the tool can't hit it, generate larger at the same
   aspect ratio and downscale — never upscale.
4. Transparent background is required for all characters and effects. If a generation
   comes back with a checkerboard *painted* into the pixels, reject it.
5. Paste the **Negative** list into the tool's negative-prompt field, or append it to the
   prompt as "Do not include: …".

## Shared style block (prepend to every prompt)

> **Warmth Pass v2** (see `ART-DIRECTION-warmth-pass-v2.md`) — cozy painterly storybook,
> education-first. Guardrails unchanged: no gold-coin/gambling (Shared negative block).

> Cozy painterly storybook children's-education illustration: soft cel shading with gentle
> brushy texture and subtle gradient depth, medium-weight warm-brown (#7A5A44) outlines,
> rounded friendly shapes, low visual noise. Warm golden-hour study-room light — soft
> upper-left key, gentle warm rim light, cozy amber ambient glow, faint dust motes/bokeh.
> Palette (warm, slightly richer saturation): warm paper #FFF8E8, coral red #E65A4F, soft
> jade #4FAE8A, sky blue #6EB6E8, sun yellow #F5C85B, ink navy #243447, leaf green #78B86B,
> warm-brown outlines #7A5A44; amber/lantern glow as ambient warmth only; gold strictly a
> tiny accent. Charming, huggable lucky-cat character appeal; inviting, lived-in feel.

## Shared negative block

> casino, jackpot, gambling, slot machine, poker chips, money bag, gold coins pile, neon
> glow, metallic bevel, black-and-gold luxury, weapons, combat, angry expression, readable
> text, Chinese characters, watermark, signature, photorealism, 3D render, checkerboard
> background

---

## 1. `cat-study.png` — CHARACTER MASTER (approve before anything else)

**Canvas:** 512×512, transparent PNG. Character fills 72–78% of canvas height, ≥30 px
clear padding around ears/paws/tail.

**Prompt:**
> [shared style block] A friendly lucky-cat mascot sitting and reading: white/cream fur
> with light-orange patches on the forehead, one ear, and tail; large round head, compact
> rounded body, short limbs, upright medium-large ears, small coral-pink nose, soft curved
> happy eyes, expressive tail curling gently behind the body. Wearing a simple coral-red
> scarf. Holding an open vocabulary book with warm cream pages and a soft jade cover, one
> small jade bookmark and one or two paper tabs visible; the pages show only abstract
> brush-like marks, no readable text. Front-facing, slightly three-quarter seated pose,
> head tilted a little toward the viewer, both feet visible, paws naturally supporting
> the book. Calm curious smile — "let's learn together". Soft upper-left daylight, warm
> chin/book shadow, subtle jade reflected light. Full body centered on a fully transparent
> background, clean silhouette, no scenery.

**Negative:** [shared negative block], raised fortune paw as main gesture, crown, ornate
costume, background scenery

**Accept when:** face reads clearly when scaled to 64 px; orange patches exactly on
forehead + one ear + tail; alpha edges clean with no white fringe.

---

## 2. `cat-walk.png` — walk cycle (attach approved cat-study)

**Canvas:** 1536×256, six 256×256 cells left→right, transparent PNG, no gaps between cells.

**Prompt:**
> [shared style block] Sprite sheet, six-frame walking cycle of EXACTLY the same lucky-cat
> character as the attached reference: identical face, fur markings, coral-red scarf,
> proportions, colors, line weight, and shading. The cat walks calmly to the right
> carrying a small closed jade book held low and visually secondary. Six equal 256×256
> cells in one horizontal row: (1) left-foot contact, (2) passing pose, (3) up/neutral
> pose, (4) right-foot contact, (5) passing pose, (6) recovery/loop pose. Subtle body bob,
> stable head, slight scarf bounce, gentle tail swing; the book stays attached to the same
> paw in every frame. Same foot baseline and horizontal center in every cell, no scale or
> perspective drift. Transparent background.

**Negative:** [shared negative block], running, marching, combat stance, frame numbers,
guide lines, grid lines, cell borders

**Accept when:** overlaying frames shows a stable baseline and center; loop 1→6→1 plays
smoothly; character indistinguishable from cat-study.

---

## 3. `cat-happy.png` — success animation (attach approved cat-study)

**Canvas:** 1024×256, four 256×256 cells, transparent PNG.

**Prompt:**
> [shared style block] Sprite sheet, four-frame happy/encouraging animation of EXACTLY the
> same lucky-cat character as the attached reference (same face, markings, red scarf,
> proportions, line style). Holding a small book or flashcard. Four equal 256×256 cells in
> one horizontal row: (1) calm happy pose, (2) slight upward bounce, (3) raised paw or
> proud book-lift pose, (4) settle pose. Clear warm smile, "great job" energy — proud and
> supportive, minimal detached sparkles. Same baseline and center in all cells.
> Transparent background.

**Negative:** [shared negative block], jackpot pose, trophy, confetti explosion, money rain

---

## 4. `cat-portrait.png` (attach approved cat-study)

**Canvas:** 512×512, transparent PNG. Face occupies 55–65% of canvas.

**Prompt:**
> [shared style block] Head-and-upper-body portrait of EXACTLY the same lucky-cat
> character as the attached reference. Ears fully visible, coral-red scarf visible at the
> neck, optional small book edge in a lower corner. Bright, reassuring, approachable
> expression looking at the viewer. Soft even daylight, no dramatic shadows. Transparent
> background, no circular frame.

**Negative:** [shared negative block], full-body tiny figure, baked-in circular frame,
dramatic rim lighting

---

## 5. `cat-guide.png` (attach approved cat-study)

**Canvas:** 512×512, transparent PNG.

**Prompt:**
> [shared style block] Same lucky-cat character as the attached reference in a helpful
> teaching pose: body at a slight three-quarter angle, face toward the viewer, one paw
> pointing gently outward, the other holding a single flashcard (or small clipboard /
> open book). Patient, encouraging, warm expression. Transparent background.

**Negative:** [shared negative block], stern teacher, commanding pose, pointer stick used
as a weapon

---

## 6. `cat-thinking.png` (attach approved cat-study)

**Canvas:** 512×512, transparent PNG.

**Prompt:**
> [shared style block] Same lucky-cat character as the attached reference in a curious
> thinking pose: one paw lightly touching the chin, eyes looking up or at a flashcard held
> in the other paw (or a pencil), relaxed tail, optional single small pale question-note
> sparkle nearby. Mood: supportive curiosity — "let's try again" — absolutely not sad.
> Transparent background.

**Negative:** [shared negative block], sadness, tears, shame, drooping ears, dark cloud

---

## 7. `cat-celebrate.png` (attach approved cat-study)

**Canvas:** 512×512, transparent PNG.

**Prompt:**
> [shared style block] Same lucky-cat character as the attached reference celebrating
> calmly: both paws slightly raised, or one paw holding a small jade-and-sun-yellow
> mastery badge. Optional props: book, small ribbon, bookmark, two or three floating paper
> stars. Joyful but controlled — a proud student, not a jackpot winner. Transparent
> background.

**Negative:** [shared negative block], fireworks wall, trophy pile, oversized crown,
raining coins

---

## 8. `maneki.png` (attach approved cat-study)

**Canvas:** 512×512, transparent PNG.

**Prompt:**
> [shared style block] Simplified iconic brand version of the same lucky-cat character as
> the attached reference: bolder shapes, fewer details, one educational prop (small book
> or flashcard), strong readable silhouette designed to stay clear at 48 px. Same face,
> markings, and red scarf. Transparent background.

**Negative:** [shared negative block], giant gold coin, fortune-shop styling, intricate
detail

---

## 9. `bg-home.png`

**Canvas:** 1080×1920 portrait.

**Prompt:**
> [shared style block] Cozy Chinese-learning study room opening onto a sunny storybook
> neighborhood. Small bookshelf, low study desk with vocabulary cards and a pencil cup,
> paper lantern, jade-green potted plant, soft window or doorway showing subtle tiled
> roofs outside, a lesson board with abstract brush marks only, a reading cushion. Warm
> morning daylight from upper-left with gentle room fill. Composition: calm, low-detail
> center (mascot and buttons will be overlaid there); open quiet top area; lower third
> visually clear; decorative detail concentrated at the edges. No characters.

**Negative:** [shared negative block], casino lounge, cash counter, shop storefront,
signboards with readable writing, baked-in UI panels

---

## 10. `bg-quest.png`

**Canvas:** 1024×512 landscape.

**Prompt:**
> [shared style block] Peaceful storybook learning path through a small Chinese
> neighborhood at soft late afternoon / gentle dusk with blue-green ambience and warm
> paper-lantern accents. Stone or dirt path along the lower-middle, trees and shrubs,
> tiled roofs, a small library or study pavilion, abstract blank signboards, distant
> mountains for layered depth. The center and upper-center must stay dark enough and calm
> — large vocabulary text will be overlaid there — with no bright light source behind the
> middle. Details live near the left and right edges. No characters.

**Negative:** [shared negative block], battle arena, neon street, bright moon dead-center,
readable shop signs

---

## 11. `bg-flashcards.png`

**Canvas:** 1080×1920 portrait.

**Prompt:**
> [shared style block] Quiet library corner / study desk scene: stack of books, pencil
> cup, neat stack of flashcards, bookmark, small desk lamp, small plant, shelf edge, soft
> window or curtain. Soft neutral daylight or warm lamp light. Very quiet, low-contrast
> center — a large flashcard UI will sit there — with all detail kept near the edges.
> Calm, focused, low-pressure mood. No characters.

**Negative:** [shared negative block], clutter in center, strong patterns, harsh shadows

---

## 12. `bg-results.png`

**Canvas:** 1080×1920 portrait.

**Prompt:**
> [shared style block] Soft celebratory learning space: paper stars, gentle ribbons, an
> open book, small mastery badges, light paper-slip confetti, a plant or shelf detail.
> Celebration concentrated at the top corners and edges; large open calm center for a
> results card. Warm, proud, encouraging — a classroom celebration, not a win screen.
> No characters.

**Negative:** [shared negative block], fireworks, giant trophy, podium, black-and-gold
winner screen

---

## 13. `bg-progress.png`

**Canvas:** 1080×1920 portrait.

**Prompt:**
> [shared style block] Learning-garden journey path viewed gently from above: stepping
> stones winding upward, small book-shaped milestone markers, abstract blank milestone
> plaques, flowers and leaves, little path posts, a tiny reading pavilion. Mood of growth
> and long-term progress. Calm center column (progress UI overlays there), detail at the
> sides. No characters.

**Negative:** [shared negative block], map pins, readable milestone numbers, game-board
dice

---

## 14. `bg-collection.png`

**Canvas:** 1080×1920 portrait.

**Prompt:**
> [shared style block] Friendly wardrobe and study-accessory room: wooden shelves, scarf
> hooks with a few colorful scarves, small badges, decorative book covers, folded fabrics,
> framed scene previews (abstract, unreadable). Warm, inviting, playful — a dressing-up
> corner, not a store. Quiet center for the collection grid UI. No characters.

**Negative:** [shared negative block], price tags, cash register, luxury boutique,
storefront counter

---

## Already produced as SVG (do NOT generate)

`ui-icons.svg`, all `ui-*` surfaces, and all `fx-*` effects are shipped as hand-authored
SVG in `assets/` (see manifest). Raster replacements are only needed if a later art pass
decides to repaint them; the SVG set is spec-compliant.

## After each approved generation

1. Save the master into `art-source/education-v1/characters/` or `backgrounds/`.
2. Verify against `ART-PRODUCTION-ORDER-DETAILED.md` §11 checklist.
3. Copy to `assets/` with the exact runtime filename.
4. Update `assets/asset-manifest.json` status (`review` → `approved` → `integrated`).
5. Run `npm test`, `npm run build`, bump `SHELL` in `sw.js` before release.
