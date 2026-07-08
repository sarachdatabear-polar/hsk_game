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

---

## v7 Shop Seasons batch

Skin sprite sheets are re-colored variants of the hero cat — same rendering,
same frame grid, only fur/costume changes. Backdrops follow the same
side-view battle-lane composition as the existing four backdrops above.

## cat-panda-walk.png — panda skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: round panda-patterned cat, white body with black ears/eye patches/paws, small red collar with gold bell like the hero cat. Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-panda-happy.png — panda skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same round panda-patterned cat as cat-panda-walk.png, white body with black ears/eye patches/paws, small red collar with gold bell. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-ninja-walk.png — ninja skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: night-blue ninja cat with a coral-red scarf, dark cloth wraps on the paws, a cheerful sneaking pose (low crouch, one paw forward). Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, weapons in hand, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-ninja-happy.png — ninja skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same night-blue ninja cat as cat-ninja-walk.png, coral-red scarf, dark cloth wraps on the paws. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, weapons in hand, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-astronaut-walk.png — astronaut skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: white space-suit cat, soft padded fabric suit (cloth, not metal), sky-blue visor glint on the helmet, tiny antenna on top, small chest control panel. Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, hard metal armor, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-astronaut-happy.png — astronaut skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same white space-suit cat as cat-astronaut-walk.png, sky-blue visor glint, tiny antenna. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, hard metal armor, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-beach-walk.png — beach skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: sunny beach cat, sun-yellow fur, a teal swim ring worn around the waist, tiny sunglasses pushed up on the head. Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-beach-happy.png — beach skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same sunny beach cat as cat-beach-walk.png, sun-yellow fur, teal swim ring around the waist. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-mooncake-walk.png — mooncake rabbit skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: cream cat wearing a soft rabbit-ear hood, holding a small golden mooncake with a paw. Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, any lettering or symbols on the mooncake, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-mooncake-happy.png — mooncake rabbit skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same cream rabbit-hooded cat as cat-mooncake-walk.png, holding the golden mooncake. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, any lettering or symbols on the mooncake, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-dragon-walk.png — dragon skin, 6-frame walk sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-walk.png`: EXACTLY 6 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-walk.png. The character: coral-red dragon-costume cat, soft cloth costume with gold belly scales, two small friendly horns on a hood, no tail spikes. Side view facing RIGHT, cheerful walking cycle: contact, down, passing, up poses smoothly looping across the 6 frames. Feet stay on one common ground line in every frame, body stays centered in each frame, identical markings and colors in every frame. No shadows on the ground, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, horror/monster mood, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## cat-dragon-happy.png — dragon skin, 4-frame happy sheet

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> A character animation sprite sheet on a plain solid pure-white background, matching the rendering, proportions and cheerfulness of the hero cat sprite `assets/cat-happy.png`: EXACTLY 4 frames in one horizontal row, evenly spaced, all frames the same size and the same character, same grid as cat-happy.png. The character: the same coral-red dragon-costume cat as cat-dragon-walk.png, gold belly scales, small horns. Front-facing happy celebration (paws up, closed happy eyes) across the 4 frames. Feet on one common ground line, identical markings and colors every frame. No shadows, no background scenery — plain flat white only.
> Strictly avoid: realistic anatomy, horror/monster mood, frame-to-frame color or costume drift, drop shadows, background elements, text, watermark.

## bg-harbor-night.png — harbor boardwalk at dusk

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Harbor boardwalk at dusk for a cute side-view battle scene, wide 16:9 landscape, 1024×512. Moored wooden junk boats bobbing along a calm harbor, warm lanterns strung along the boardwalk casting soft glow on the water, deep-teal dusk sky fading to coral at the horizon. Clear flat wooden boardwalk along the bottom fifth of the image where two small characters will stand; low detail in the center band (a word card overlays the middle).
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, pitch-black night, crowds, people.

## bg-snow-festival.png — snowy village festival

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Snowy village festival lane for a cute side-view battle scene, wide 16:9 landscape, 1024×512. Soft snow-dusted wooden buildings on both sides, glowing ice lanterns carved in round friendly shapes, warm stall lights spilling onto the snow, pale sky-blue winter sky. Clear flat snow-packed path along the bottom fifth of the image where two small characters will stand; low detail in the center band.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, harsh blizzard, gray dead winter mood.

## bg-island-sunset.png — tropical island shore at sunset

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Tropical island shore at sunset for a cute side-view battle scene, wide 16:9 landscape, 1024×512. Palm-tree silhouettes framing both sides, a warm coral-and-sun-yellow sunset sky reflecting on gentle waves, light sand along the shoreline. Clear flat sandy beach lane along the bottom fifth of the image where two small characters will stand; low detail in the center band.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, harsh tropical storm mood.

## bg-lantern-festival.png — mid-autumn lantern festival night

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Mid-autumn lantern festival night for a cute side-view battle scene, wide 16:9 landscape, 1024×512. Floating paper lanterns drifting over a calm river, a warm full moon in a deep-teal sky, soft lantern glow in sun-yellow and coral along the riverbank. Clear flat riverside path along the bottom fifth of the image where two small characters will stand; low detail in the center band. Even at night, keep the mood warm and safe — a festival evening, not darkness.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, pitch-black night, crowds, people.

## bg-dragon-gate.png — vermilion dragon gate at dawn

> Warm storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Vermilion dragon gate with gold trim at dawn for a cute side-view battle scene, wide 16:9 landscape, 1024×512. A rounded ceremonial gate arching to one side, warm festival banners in coral and sun-yellow hanging along its beams, soft pink-gold dawn sky, morning mist over distant hills. Clear flat stone path along the bottom fifth of the image where two small characters will stand; low detail in the center band.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, dense clutter behind the center.

## bg-street.png — sunny village street (Lucky Cat Street home backdrop)

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game, polished mobile-game quality, storybook watercolor–flat hybrid with soft edges and gentle painted texture (no gradients harsher than soft daylight falloff). Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never pure black, never pure white, never neon. Soft warm daylight from the UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood, rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes, consistent medium line weight. No text or lettering of any kind.
> Sunny village street viewed side-on for a cute home-screen backdrop, wide 16:9 landscape, 1024×512. Cream sky brightening toward the horizon, soft rolling green hills far behind, a light sand road running along the bottom fifth of the image where small building and decor pieces will be placed. Low detail in the middle band — keep it airy and uncluttered, not a busy market street. No characters or people anywhere in the scene.
> Strictly avoid: photorealism, neon, casino glitter, black-and-gold framing, cold gray UI chrome, sharp corners, horror mood, human characters, any lettering or calligraphy, watermark, night sky, dense clutter in the middle band.

---

# v7 street deco batch — 10 shop decos (P1)

The tier-2/tier-3 street decos from v7 Shop Seasons ship with procedural
vector fallbacks; these prompts replace them with real art. (The v7 plan's
follow-up note said "11 new decos" — the actual count in `DECO_IDS` is 10:
3 permanent + 4 daily-pool + 3 seasonal.)

Square / 1:1 output is fine for all of them — intake crops to the subject and
fits it into a 512×512 bottom-anchored box. Name downloads `deco-<id>.png`
(e.g. `deco-koi-pond.png`), drop into `art-drop/`, run
`python3 scripts/intake_art.py`. These draw at roughly 40–90 px on the street,
so silhouettes must stay chunky and readable — one clear object, no fine
detail. Sprite-draw wiring in `drawTieredDeco` lands together with the first
installed deco so it can be sized against real art.

## deco-mahjong-table.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute low square wooden mahjong table game asset on a plain solid pure-white background, centered, sitting on the ground. Warm brown carved wood frame, deep-teal felt top, a few neat stacks of small blank cream tiles and two little round stools tucked at the sides. Round friendly shapes, clean chunky silhouette, medium line weight. Tiles are completely blank — absolutely no characters, dots or symbols on them.
> Strictly avoid: any lettering or Chinese characters, tile markings, photorealism, neon, drop shadow, background scenery, people or animals, watermark.

## deco-koi-pond.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute round garden koi pond game asset on a plain solid pure-white background, centered, sitting on the ground, viewed from a slight three-quarter angle so the water surface shows. Smooth soft-gray stone rim, calm sky-blue water, two friendly koi (one coral, one cream with sun-yellow patches) and a couple of small green lily pads. Clean chunky silhouette, round friendly shapes.
> Strictly avoid: any lettering, photorealism, neon, realistic water reflections, drop shadow, background scenery, fountain spray, people or animals besides the koi, watermark.

## deco-drum-tower.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute miniature wooden drum tower game asset on a plain solid pure-white background, centered, standing on the ground, portrait orientation. Two short stories of warm brown carved wood with a gently curved deep-teal tiled roof, a big round coral drum with cream drumhead hanging under the top roof, small rope details. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or calligraphy, photorealism, neon, gold metallic trim, drop shadow, background scenery, people, watermark.

## deco-bubble-tea.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden bubble-tea stand game asset on a plain solid pure-white background, centered, sitting on the ground. Little warm brown counter cart with a scalloped coral-and-cream cloth awning, two oversized cream cups with sun-yellow lids and fat straws on the counter, a small blank hanging shop flag. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or logos on cups or flag, photorealism, neon, drop shadow, background scenery, people, watermark.

## deco-paper-umbrella.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute open oil-paper parasol game asset on a plain solid pure-white background, centered, standing upright on the ground leaning in a small wooden stand, portrait orientation. Coral and cream paper panels with a soft sun-yellow rim, warm brown bamboo ribs and handle. Completely plain paper panels. Round friendly shape, clean chunky silhouette.
> Strictly avoid: any lettering, painted flowers or scenes on the paper, photorealism, neon, drop shadow, background scenery, a person holding it, watermark.

## deco-goldfish-banner.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute goldfish streamer banner game asset on a plain solid pure-white background, centered, portrait orientation: a warm brown bamboo pole standing on a small base with one plump coral-and-cream cloth goldfish windsock swimming from its top, tail rippling, plus a short sun-yellow ribbon. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering, photorealism, neon, drop shadow, background scenery, sky or clouds, people, watermark.

## deco-neon-cat-sign.png — street deco, 512×512, transparent

> Warm evening storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never true neon colors.
> A single cute glowing cat-sign game asset on a plain solid pure-white background, centered, portrait orientation: a deep-teal wooden signboard on a short post, carrying a simplified sitting lucky-cat outline drawn as a soft glowing sun-yellow and coral tube light, one paw raised. The glow is warm and cozy like a paper lantern, not electric. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: real neon colors (electric pink, cyan, purple), any lettering or characters, photorealism, glare or lens flares, drop shadow, background scenery, watermark.

## deco-shaved-ice-cart.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden shaved-ice cart game asset on a plain solid pure-white background, centered, sitting on the ground. Little warm brown cart on two wheels with a sky-blue and cream striped canopy, a big fluffy mound of shaved ice in a cream bowl on top drizzled with coral and sun-yellow syrup, a small hand crank at the side. Round friendly shapes, clean chunky silhouette — summer treat mood.
> Strictly avoid: any lettering or price signs, photorealism, neon, drop shadow, background scenery, people, watermark.

## deco-mooncake-stall.png — street deco, 512×512, transparent

> Warm evening storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden mooncake stall game asset on a plain solid pure-white background, centered, sitting on the ground. Warm brown counter stall with a deep-teal cloth awning, neat pyramids of plump round sun-yellow mooncakes with a simple scalloped flower pattern pressed on top, one small warm paper lantern hanging from the awning corner. Mooncake tops carry only the scalloped flower pattern — no characters. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or Chinese characters stamped on mooncakes or signs, red-and-gold festival styling, photorealism, neon, drop shadow, background scenery, people, watermark.

## deco-firecracker-arch.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute festive archway game asset on a plain solid pure-white background, centered, standing on the ground: a rounded warm brown bamboo arch with two strings of plump coral firecracker rolls hanging down its sides, tied with sun-yellow ribbon bows, a small cream paper pinwheel at the top. Festive but soft — no flames, no explosion. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: fire, sparks, smoke or explosions, red-only color scheme, gold metallic trim, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.
