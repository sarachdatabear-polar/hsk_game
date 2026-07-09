# P2 prompts — remaining shop-tile art (copy-paste ready)

Closes the shop grid's **photo-vs-icon gap** (UI audit F7): every purchasable
should read as a real framed illustration, but eleven tiles still fall back to
crude procedural vector doodles. Two groups:

1. **5 legacy street decos** (`red-lantern, noodle-stall, tea-sign, foo-dog,
   golden-arch`) — the only ids in `DECO_IDS` with no prompt and no PNG. They
   render via `drawStreetDecoLegacy` on both the street and in the shop tile.
2. **6 non-visual purchasables** — 3 effects (`sakura-fx, firecracker-fx,
   star-shower`) and 3 soundpacks (`bells, arcade, lion-drum`). They have no art
   at all; the shop paints tiny vector icons for them (`renderShopPreview`).

Same workflow as `GENERATION-PROMPTS-P0-copypaste.md`. For **Google AI Studio**
(aistudio.google.com → an image model / "Nano Banana") or **ChatGPT**. One block
per asset: paste the whole block as a single message. **Square / 1:1 is fine for
all eleven** — intake crops to the subject and fits it into the target box.

Don't resize, crop, or compress anything yourself. Download the raw PNGs into
`art-drop/` named after the target (e.g. `deco-foo-dog.png`; a browser suffix
like `deco-foo-dog (2).png` is fine), then run:

```
python3 scripts/intake_art.py
```

It crops/resizes to spec, strips the solid background to transparency,
compresses, and runs the QA gate. Generate 2–3 candidates per asset if you like.
Manifest rows for all eleven are already added (status `planned`, so they never
load until installed — no 404s). The **shop/street sprite-draw wiring lands with
the art round**, same as the v7 deco batch, so tile draw can be sized against
real pixels.

These draw small (deco ~40–90 px on the street, tiles ~60 px in the shop grid),
so silhouettes must stay **chunky and readable — one clear object, no fine
detail**. Every one drops the baked lettering and demoted-gold styling the
legacy vectors carried (the old `tea-sign` baked a 茶 glyph; `red-lantern` /
`golden-arch` leaned red-and-gold) — the style lock forbids both.

---

# Group 1 — legacy street decos (512×512, transparent)

## deco-red-lantern.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute round paper lantern game asset on a plain solid pure-white background, centered, portrait orientation, hanging from a short carved warm-brown wooden hook that stands on a small base. Warm coral paper panels with a soft sun-yellow rim, carved wooden cap and base, a small cream cloth tassel below, gentle warm inner glow. Round friendly shape, clean chunky silhouette, medium line weight. Completely blank paper — absolutely no text, characters or symbols.
> Strictly avoid: fire-engine or blood red, red-and-gold festival styling, gold metallic trim, any lettering or Chinese characters, photorealism, neon glow, drop shadow, background scenery, people, watermark.

## deco-noodle-stall.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute small wooden noodle stall game asset on a plain solid pure-white background, centered, sitting on the ground. Warm brown counter cart with a scalloped sun-yellow cloth awning, a big steaming cream bowl of noodles with a coral spoon resting on the counter, a small blank hanging cloth flag. Round friendly shapes, clean chunky silhouette, medium line weight.
> Strictly avoid: any lettering or logos on the flag, photorealism, neon, drop shadow, background scenery, people, watermark.

## deco-tea-sign.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute hanging tea-house shop sign game asset on a plain solid pure-white background, centered, portrait orientation, standing on a short carved warm-brown wooden post with a little cross-beam. A rounded cream signboard hangs from the beam by two small ropes, showing a simple painted deep-teal teapot with a coral tea-leaf sprig and a curl of steam as its only decoration. Round friendly shapes, clean chunky silhouette. The board carries ONLY the little teapot picture — absolutely no text or Chinese characters.
> Strictly avoid: any lettering or Chinese characters (no 茶), photorealism, neon, gold metallic trim, drop shadow, background scenery, people, watermark.

## deco-foo-dog.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute friendly guardian-lion (foo dog) statue game asset on a plain solid pure-white background, centered, sitting upright on a small soft-gray stone plinth. Smooth carved soft-gray stone with warm light-sand highlights, a round curly mane, one front paw resting on a round ball, big friendly eyes and a gentle smile — a cheerful guardian, never fierce or scary. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering, bared teeth or a snarling/angry expression, gold metallic trim, photorealism, neon, drop shadow, background scenery, people, watermark.

## deco-golden-arch.png — street deco, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute ceremonial gateway arch (paifang) game asset on a plain solid pure-white background, centered, standing on the ground, wider than tall. A rounded warm-brown carved wood arch on two sturdy posts, topped with a gently curved deep-teal tiled roof and a soft sun-yellow painted trim (matte, not metallic), two small coral festival banners hanging from the beam. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: shiny metallic gold or chrome, black-and-gold framing, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.

---

# Group 2 — effect & soundpack shop tiles (512×512, transparent)

Small illustrated emblems that stand in for a non-visual purchase (a particle
effect or an audio pack), drawn as one clear cutout object so they sit in the
shop grid like the cat-skin tiles do.

## tile-sakura-fx.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute blossoming sakura branch game asset on a plain solid pure-white background, centered: a warm-brown branch with clusters of soft coral-pink cherry blossoms and a few petals gently drifting off to one side. Round friendly shapes, clean chunky silhouette, cheerful spring mood.
> Strictly avoid: any lettering, photorealism, neon, harsh pink, drop shadow, background scenery, people, watermark.

## tile-firecracker-fx.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute bundle of festive firecracker rolls game asset on a plain solid pure-white background, centered, portrait orientation: a cluster of plump coral paper firecracker tubes tied together with a sun-yellow ribbon bow, with a few soft cream and sun-yellow confetti sparkles floating around them. Festive but soft — no flames, no explosion. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: fire, sparks, smoke or explosions, red-only color scheme, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.

## tile-star-shower.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute cluster of shooting stars game asset on a plain solid pure-white background, centered: three or four plump five-point sun-yellow storybook stars of different sizes, each with a gentle soft-coral trailing tail, arranged like a friendly falling star shower, soft warm glow. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: electric or neon colors, lens flares or glare bursts, any lettering, photorealism, drop shadow, background scenery (no night sky), people, watermark.

## tile-bells.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute temple bell game asset on a plain solid pure-white background, centered, portrait orientation: a rounded warm sun-yellow bronze bell hanging by a short coral rope loop from a small carved warm-brown wooden beam, with a soft cream highlight and a little wooden striker resting beside it. Cozy and friendly. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: shiny metallic chrome, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.

## tile-arcade.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute little retro arcade cabinet game asset on a plain solid pure-white background, centered, portrait orientation: a chunky rounded warm-brown wooden cabinet with a softly glowing sky-blue screen (blank, no picture), a small coral joystick and two sun-yellow round buttons, a cream speaker grille. Toy-like and cheerful. Round friendly shapes, clean chunky silhouette.
> Strictly avoid: any lettering, numbers or images on the screen, real neon or electric colors, photorealism, glare, drop shadow, background scenery, people, watermark.

## tile-lion-drum.png — shop tile, 512×512, transparent

> Warm daylight storybook illustration, storybook watercolor–flat hybrid with soft edges, polished mobile-game quality. Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted, never neon.
> A single cute festival lion-dance drum game asset on a plain solid pure-white background, centered, sitting on a small warm-brown wooden stand: a big round coral drum barrel with sun-yellow stud rivets and a cream drumhead, two wooden drumsticks resting across the top, a short sun-yellow ribbon draped over one side. Round friendly shapes, clean chunky silhouette, festive mood.
> Strictly avoid: red-and-gold festival styling, gold metallic trim, any lettering or Chinese characters, photorealism, neon, drop shadow, background scenery, people, watermark.
