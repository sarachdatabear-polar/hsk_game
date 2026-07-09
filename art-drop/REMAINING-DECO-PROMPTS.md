# Remaining shop art to generate — 10 street decorations

These are the shop items still missing painted art (everything else is done).
Source: extracted from `docs/art/GENERATION-PROMPTS-P0-copypaste.md` (v7 street deco batch).

## Workflow
1. Generate each image (AI Studio / ChatGPT). Square 1:1 output is fine — intake crops to the subject and fits it into a 512×512 bottom-anchored box.
2. Save each as **`deco-<id>.png`** (e.g. `deco-koi-pond.png`) into this `art-drop/` folder.
3. Run `python3 scripts/intake_art.py` → review candidates → install with `python3 scripts/intake_art.py --install deco-<id>.png:cand-NN`.
4. After installing: set the manifest entry to `integrated`, `npm test`, `npm run build`, bump `SHELL` in `sw.js`.

These draw ~40–90 px on the street and fit into the shop tile — keep silhouettes chunky and readable, one clear object, no fine detail.

---

## 1. deco-mahjong-table.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute low square wooden mahjong table game asset on a plain solid pure-white background, centered, sitting on the ground. Warm brown carved wood frame, deep-teal felt top, a few neat stacks of small blank cream tiles and two little round stools tucked at the sides. Round friendly shapes, clean chunky silhouette, medium line weight. Tiles are completely blank — absolutely no characters, dots or symbols on them.
> Strictly avoid: any lettering or Chinese characters, tile markings, photorealism, neon, drop shadow, background scenery, people or animals, watermark.

## 2. deco-koi-pond.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute round garden koi pond game asset on a plain solid pure-white background, centered, sitting on the ground, viewed from a slight three-quarter angle so the water surface shows. Smooth soft-gray stone rim, calm sky-blue water, two friendly koi (one coral, one cream with sun-yellow patches) and a couple of small green lily pads. Clean chunky silhouette, round friendly shapes.
> Strictly avoid: any lettering, photorealism, neon, realistic water reflections, drop shadow, background scenery, fountain spray, people or animals besides the koi, watermark.

## 3. deco-drum-tower.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute miniature wooden drum tower game asset on a plain solid pure-white background, centered, standing on the ground, portrait orientation. Two short stories of warm brown carved wood with a gently curved deep-teal tiled roof, a big round coral drum with cream drumhead hanging under the top roof, small rope details. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or calligraphy, photorealism, neon, gold metallic trim, drop shadow, background scenery, people, watermark.

## 4. deco-bubble-tea.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden bubble-tea stand game asset on a plain solid pure-white background, centered, sitting on the ground. Little warm brown counter cart with a scalloped coral-and-cream cloth awning, two oversized cream cups with sun-yellow lids and fat straws on the counter, a small blank hanging shop flag. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or logos on cups or flag, photorealism, neon, drop shadow, background scenery, people, watermark.

## 5. deco-paper-umbrella.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute open oil-paper parasol game asset on a plain solid pure-white background, centered, standing upright on the ground leaning in a small wooden stand, portrait orientation. Coral and cream paper panels with a soft sun-yellow rim, warm brown bamboo ribs and handle. Completely plain paper panels. Round friendly shape, clean chunky silhouette.
> Strictly avoid: any lettering, painted flowers or scenes on the paper, photorealism, neon, drop shadow, background scenery, a person holding it, watermark.

## 6. deco-goldfish-banner.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute goldfish streamer banner game asset on a plain solid pure-white background, centered, portrait orientation: a warm brown bamboo pole standing on a small base with one plump coral-and-cream cloth goldfish windsock swimming from its top, tail rippling, plus a short sun-yellow ribbon. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering, photorealism, neon, drop shadow, background scenery, sky or clouds, people, watermark.

## 7. deco-neon-cat-sign.png — 512×512, transparent

> Warm evening storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never true neon colors.
> A single cute glowing cat-sign game asset on a plain solid pure-white background, centered, portrait orientation: a deep-teal wooden signboard on a short post, carrying a simplified sitting lucky-cat outline drawn as a soft glowing sun-yellow and coral tube light, one paw raised. The glow is warm and cozy like a paper lantern, not electric. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: real neon colors (electric pink, cyan, purple), any lettering or characters, photorealism, glare or lens flares, drop shadow, background scenery, watermark.

## 8. deco-shaved-ice-cart.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden shaved-ice cart game asset on a plain solid pure-white background, centered, sitting on the ground. Little warm brown cart on two wheels with a sky-blue and cream striped canopy, a big fluffy mound of shaved ice in a cream bowl on top drizzled with coral and sun-yellow syrup, a small hand crank at the side. Round friendly shapes, clean chunky silhouette — summer treat mood.
> Strictly avoid: any lettering or price signs, photorealism, neon, drop shadow, background scenery, people, watermark.

## 9. deco-mooncake-stall.png — 512×512, transparent

> Warm evening storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden mooncake stall game asset on a plain solid pure-white background, centered, sitting on the ground. Warm brown counter stall with a deep-teal cloth awning, neat pyramids of plump round sun-yellow mooncakes with a simple scalloped flower pattern pressed on top, one small warm paper lantern hanging from the awning corner. Mooncake tops carry only the scalloped flower pattern — no characters. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering or Chinese characters stamped on mooncakes or signs, red-and-gold festival styling, photorealism, neon, drop shadow, background scenery, people, watermark.

## 10. deco-firecracker-arch.png — 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute festive archway game asset on a plain solid pure-white background, centered, standing on the ground: a rounded warm brown bamboo arch with two strings of plump coral firecracker rolls hanging down its sides, tied with sun-yellow ribbon bows, a small cream paper pinwheel at the top. Festive but soft — no flames, no explosion. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: fire, sparks, smoke or explosions, red-only color scheme, gold metallic trim, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.
