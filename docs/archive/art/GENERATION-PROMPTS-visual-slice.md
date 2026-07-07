# Generation prompts — Visual Slice v1 replacement art

Drop-in files: keep the exact filenames and dimensions and the game picks them up
with zero code changes. Export rules: optimized PNG (or WebP for backgrounds),
no white matte, lossless for sprites. Style anchors: the existing
`assets/cat-study.png` (character rendering) and the visual PRD
(`docs/art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md`) §4–5, §13 (negative prompt).

---

## 1. `bg-home.png` — 1080 × 1920 (portrait, no alpha)

> Cheerful daylight village scene for a cozy mobile learning game, portrait
> 1080×1920. A central stone path leads from the bottom of the frame toward
> small East Asian village houses with gentle curved rooflines, low wooden
> fences, leafy plants, soft green mountains and fluffy clouds behind. Bright
> blue sky occupies the upper third. Warm soft daylight from the upper left,
> gentle painted texture, polished mobile-game illustration, warm slightly
> muted colors (palette: green #32775E, sky blue #5DAADD, sun yellow #F2BC57,
> cream #FBF5E8, warm brown #846043). IMPORTANT: keep the center of the image
> uncluttered — the lower-middle hosts a character sprite and the upper-middle
> hosts the game title; no focal objects there, just path/sky.
> No text anywhere. No people, no animals.

Negative: photorealism, neon, night scene, red lanterns/festival decoration,
flat vector, glassmorphism, sharp corners, human characters, any lettering.

## 2. `bg-battle.png` — 1024 × 512 (landscape, no alpha; 2048 × 1024 at 2× also fine)

> Bright daylight forest clearing for a cute side-view battle scene, landscape
> 1024×512. A clear flat dirt/grass lane runs along the bottom fifth of the
> image where two small characters will stand. Layered friendly trees and
> bushes on both sides, a few rocks, soft green mountains far behind, warm
> sunlight from the upper left with soft shadows. Painterly mobile-game style
> with depth but low detail in the center band (a word card overlays the middle
> of the screen). Warm slightly muted greens and creams (palette: #32775E,
> #5DAADD, #F2BC57, #FBF5E8, #846043). No text. No characters.

Negative: night, lanterns, festival/red-gold decor, photorealism, neon,
horror mood, dense clutter behind the center, any lettering.

## 3. (Optional) raccoon enemy sprite sheets — replaces the code-drawn raccoon

Only if you want painted art instead of the canvas-drawn raccoon that ships
with this round. Contract per visual PRD §5.5 / §9:

- `raccoon-walk.png` — 6 horizontal frames, 256×256 each (sheet 1536×256), transparent.
- `raccoon-happy.png` — 4 horizontal frames, 256×256 each (sheet 1024×256), transparent.

> Chibi gray raccoon ninja, cute toy-like opponent for a friendly learning
> game, in the exact same rendering style and proportions as the supplied
> calico cat reference (round head ~45% of height, short limbs, big paws).
> Dark charcoal sleeveless outfit, blue-gray headband with short tails, small
> wooden staff on the back, black eye-mask markings, ringed tail, pink nose,
> friendly determined expression — never scary. Side view facing LEFT,
> walking cycle of 6 frames (sheet 1) / happy defeat-bow of 4 frames (sheet 2),
> stable foot baseline and centered body on every frame, identical markings
> and colors across frames, transparent background, soft warm daylight.

Negative: realistic animal anatomy, aggressive teeth/claws, weapons in hand,
frame-to-frame color or costume drift, drop shadows baked into the sheet.

---

Integration notes (for whoever drops the files in):
- Same filename → `assets/` → `npm run build` not required for images, but run
  `npm test` anyway; then bump SHELL in `sw.js` when shipping to production.
- If raccoon sheets are supplied, tell the dev round to switch `sprites.js`
  registration + battle draw call from the code-drawn raccoon to the sheets
  (small change; the code-drawn version remains the file:// fallback).
