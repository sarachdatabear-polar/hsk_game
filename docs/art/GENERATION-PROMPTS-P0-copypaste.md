# P0 prompts — copy-paste ready for browser generation

For **Google AI Studio** (aistudio.google.com → model picker → an image model /
"Nano Banana") or **ChatGPT**. One block per asset: paste the whole block as a
single message. Settings: pick **16:9 / landscape** where the UI allows it —
never square.

Don't resize, crop, or compress anything yourself. Download the raw PNGs into
`~/Desktop/hsk-art-drop/`, named after the target (e.g. `bg-market.png` — a
browser suffix like `bg-market (2).png` is fine), then run:

```
python3 scripts/intake_art.py
```

It crops/resizes to spec, strips sprite backgrounds, compresses, and runs the
QA gate. Generate 2–3 candidates per asset if you like — the script QAs every
candidate it finds and you keep the winner.

---

## bg-battle.png — daylight forest (replaces the legacy night-festival art)

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Bright daylight forest clearing for a cute side-view battle scene, wide 16:9 landscape. A clear flat dirt-and-grass lane runs along the bottom fifth of the image where two small characters will stand. Layered friendly trees and bushes on both sides, a few rocks, soft green mountains far behind, warm sunlight from the upper left with soft shadows. Low detail in the center band (a word card overlays the middle). Fresh greens and creams within the palette.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, glassmorphism, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, night, lanterns, festival or red-gold decor, dense clutter behind the center.

## bg-market.png — night market

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Cozy evening night-market lane for a cute side-view battle scene, wide 16:9 landscape. Warm paper lanterns strung overhead (soft amber glow, not neon), small wooden food stalls with cloth awnings on both sides, a clear flat lane along the bottom fifth of the image where two small characters will stand. Deep-teal dusk sky, lantern light stays warm sun-yellow and coral. Low detail in the center band (a word card overlays the middle). Even at night, keep the mood warm and safe — a festival evening, not darkness.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, pitch-black night, red-only lighting, crowds, people.

## bg-temple.png — temple dawn

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm light, soft contact shadows. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Peaceful hillside temple courtyard at dawn for a cute side-view battle scene, wide 16:9 landscape. Small East Asian temple with gently curved rooflines to one side, stone lanterns, a leafy old tree, soft pink-gold dawn sky fading to sky blue, morning mist over distant green hills. Clear flat stone path along the bottom fifth of the image for two small characters; low detail in the center band.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark.

## bg-bamboo.png — bamboo grove

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Sun-dappled bamboo grove for a cute side-view battle scene, wide 16:9 landscape. Tall friendly bamboo stalks framing both sides, warm light shafts from the upper left through the leaves, a few smooth stones and ferns, a clear flat earth path along the bottom fifth of the image for two small characters; low detail in the center band. Fresh greens within the palette, cream sky glimpses.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark.

---

## raccoon-walk.png — 6-frame walk sheet  ⚠ ATTACH `assets/cat-study.png` to the same message

> Use the attached calico cat as the exact style, rendering and proportion reference (round head about 45% of total height, short limbs, big paws, friendly).
> A character animation sprite sheet on a plain solid pure-white background: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character. The character: chibi gray raccoon ninja, cute toy-like opponent, in the exact same storybook rendering style as the attached cat. Dark charcoal sleeveless outfit, blue-gray headband with short tails, small wooden staff strapped on the back, black eye-mask markings, ringed tail, pink nose, friendly determined expression — never scary. Side view facing LEFT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings, colors and costume in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, teeth or claws bared, weapon held in hands, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## raccoon-happy.png — 4-frame defeat-bow sheet  ⚠ ATTACH `assets/cat-study.png` too

> Use the attached calico cat as the exact style, rendering and proportion reference.
> A character animation sprite sheet on a plain solid pure-white background: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character. The character: the same chibi gray raccoon ninja as before (dark charcoal sleeveless outfit, blue-gray headband, small wooden staff on the back, black eye-mask markings, ringed tail, pink nose). A happy, good-natured defeat-bow sequence: standing → starting to bow → deep friendly bow with a smile → back up with a cheerful expression, eyes closed happily. Side view facing LEFT. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, sad or humiliated mood, teeth bared, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

---

# Bonus queue — P1 decos that HARD-violate the style lock (baked-in lettering)

The 2026-07-07 QA audit found the current `lantern.png` (red-gold + baked 福,
38% on-palette) and `coin.png` (four baked characters) break the "no lettering"
rule, same offense as the legacy bg-battle. Generate whenever convenient —
lower priority than the six P0 assets above. Square / 1:1 is fine for both;
intake handles sizing.

## lantern.png — street deco, 256×384, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute paper lantern game asset on a plain solid pure-white background, centered, portrait orientation. Warm sun-yellow and coral paper panels, carved wooden top and base, hanging from a short rope loop, soft warm inner glow, small cloth tassel below. Round friendly shape, clean silhouette, medium line weight. Completely blank paper — absolutely no text, characters, calligraphy or symbols on the lantern.
> Strictly avoid: red-and-gold festival styling, any lettering or Chinese characters, gold metallic trim, photorealism, neon glow, drop shadow, background scenery, watermark.

## coin.png — street deco, 128×128, transparent

> Warm storybook illustration, watercolor–flat hybrid, polished mobile-game quality. Palette: sun yellow #F2BC57, light sand #EAC796, warm brown #846043, paper cream #FBF5E8, ink #2E2A24 — warm and muted, never metallic chrome, never neon.
> A single friendly round gold coin game asset on a plain solid pure-white background, centered, viewed straight on. Warm sun-yellow face with a warm brown outline and a simple embossed cat paw-print in the center — a flat friendly token like a storybook sticker. Clean silhouette, no shine burst, no sparkle.
> Strictly avoid: any lettering or Chinese characters, square hole, metallic gradient shine, sparkle burst, photorealism, drop shadow, background scenery, watermark.
