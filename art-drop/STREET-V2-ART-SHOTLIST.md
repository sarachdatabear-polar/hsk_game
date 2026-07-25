# Street v2 art shot-list — the B/C batch (canvas, neighbours, construction)

_Companion to `docs/superpowers/specs/2026-07-23-street-ownership-design.md` (the
deferred new-art roadmap). Code work on the B/C layer starts only after this batch
lands — **full P1 batch in `art-drop/` first, then say "go"** (house rule)._

## How many files? — P1 checklist (24 files, this is the batch)

Panoramas (2 files):
- [ ] 1. `bg-street-wide.png`
- [ ] 2. `bg-street-market-wide.png`

Neighbour Pang, red panda shopkeeper (4 files):
- [ ] 3. `neighbour-pang-walk-a.png`
- [ ] 4. `neighbour-pang-walk-b.png`
- [ ] 5. `neighbour-pang-idle.png`
- [ ] 6. `neighbour-pang-portrait.png`

Neighbour Tiao, rabbit courier (4 files):
- [ ] 7. `neighbour-tiao-walk-a.png`
- [ ] 8. `neighbour-tiao-walk-b.png`
- [ ] 9. `neighbour-tiao-idle.png`
- [ ] 10. `neighbour-tiao-portrait.png`

Neighbour Wen, tortoise tea-master (4 files):
- [ ] 11. `neighbour-wen-walk-a.png`
- [ ] 12. `neighbour-wen-walk-b.png`
- [ ] 13. `neighbour-wen-idle.png`
- [ ] 14. `neighbour-wen-portrait.png`

Landmark construction stages (10 files):
- [ ] 15. `landmark-lantern-post-stage1.png`
- [ ] 16. `landmark-lantern-post-stage2.png`
- [ ] 17. `landmark-tailor-stage1.png`
- [ ] 18. `landmark-tailor-stage2.png`
- [ ] 19. `landmark-kitten-cafe-stage1.png`
- [ ] 20. `landmark-kitten-cafe-stage2.png`
- [ ] 21. `landmark-coin-bank-stage1.png`
- [ ] 22. `landmark-coin-bank-stage2.png`
- [ ] 23. `landmark-emperor-gate-stage1.png`
- [ ] 24. `landmark-emperor-gate-stage2.png`

P2 (7 files, OPTIONAL — generate later, after the P1 layer is playable): wide
panoramas for the other backdrop themes, listed at the bottom.

## Generation tips (read once)

- **Sizes:** panoramas are 2:1 landscape (2048×1024 ideal; if your tool only offers
  16:9, use it — intake crops). Everything else is square 1:1 (512×512 ideal; larger
  is fine, don't upscale small outputs).
- **Sprites** (neighbours + construction) are generated on a **plain flat light-gray
  background (#B2AEA9), no gradients, no cast shadow on the ground** — intake removes
  the background. Subject centered with breathing room, never touching the edges.
- **Character consistency:** generate all 4 poses of one neighbour in the SAME chat,
  telling the tool to keep the exact same character as the previous image, changing
  only the pose.
- **Construction consistency:** when generating a landmark's two stages, paste the
  finished landmark art (from `assets/landmark-<id>.png`) into the chat as reference
  and say the stages must match its palette, angle, and proportions.
- Drop raw outputs straight into `art-drop/` with the exact target filenames (a
  browser suffix like `(2)` is fine). Don't resize/crop/compress. Then say **go**.

---

## 1. `bg-street-wide.png` — wide day street stage (2:1 landscape, full-bleed)

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A wide panoramic village street scene in daylight, 2:1 landscape, full-bleed
> background art for a cozy game. A warm sandy dirt road runs across the full width
> of the lower third. Behind the road: a low wooden fence, gentle green hills, and
> small distant trees under a soft blue sky with cream clouds. At the FAR LEFT edge
> and FAR RIGHT edge only: one modest unpainted timber shopfront each, partially
> cropped by the frame, framing the scene. The entire central 60% of the image is a
> deliberately EMPTY open stage — nothing taller than a fence post there, no stalls,
> no lanterns, no props, no signs — this space is reserved for game objects drawn on
> top. Storybook watercolor texture, soft warm light.
> Strictly avoid: any lettering or characters, photorealism, neon colors, drop
> shadow, watermark, people, animals, market stalls or props in the central area.

## 2. `bg-street-market-wide.png` — wide night market stage (2:1 landscape, full-bleed)

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> The SAME wide village street stage as a matching day version: sandy dirt road
> across the full width of the lower third, low wooden fence and hills behind, one
> modest timber shopfront cropped at the far left edge and one at the far right edge
> — but now at NIGHT with a cozy market mood. Deep teal night sky with a few soft
> stars. Exactly two thin strings of small paper lanterns stretched high across the
> TOP EDGE of the image only. Warm sun-yellow window glow from the two edge
> shopfronts spilling softly onto the road. The entire central 60% of the image
> stays a deliberately EMPTY open stage — no stalls, no standing lanterns, no props,
> no signs — that space is reserved for game objects drawn on top. Storybook
> watercolor texture, warm pools of light on the road.
> Strictly avoid: any lettering or characters, photorealism, neon colors, drop
> shadow, watermark, people, animals, market stalls or props in the central area.

---

## Neighbour Pang — round red panda shopkeeper (files 3–6)

Generate all four in one chat, same character throughout.

### 3. `neighbour-pang-walk-a.png` — walk frame A

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute round red panda character for a cozy game, chubby and small like a
> plush toy, russet fur with cream face markings and a striped tail, wearing a deep
> teal shop apron, carrying a small brown paper parcel under one arm. Full body,
> side profile facing RIGHT, mid-walk stride with the LEFT foreleg stepped forward,
> cheerful bustling expression. Round friendly shapes, clean chunky silhouette,
> medium line weight. Centered on a plain flat light-gray background (#B2AEA9),
> subject not touching the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people.

### 4. `neighbour-pang-walk-b.png` — walk frame B

> Same character as the previous image, identical in every detail — same red panda,
> same deep teal apron, same parcel, same side profile facing RIGHT, same size in
> frame, same plain flat light-gray background (#B2AEA9) — changing ONLY the pose:
> now the RIGHT foreleg is stepped forward in the walk stride (the opposite step of
> the previous image). No other changes.

### 5. `neighbour-pang-idle.png` — idle pose

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — changing ONLY the pose: standing at rest,
> facing the viewer at a slight three-quarter angle, holding the little parcel with
> both paws in front of the belly, content smile, tail curled around the feet.

### 6. `neighbour-pang-portrait.png` — portrait bust

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — now a BUST PORTRAIT: head, shoulders and the
> top of the teal apron only, filling most of the frame, facing the viewer with a
> warm welcoming smile, one paw raised in a small wave.

---

## Neighbour Tiao — lop-eared rabbit courier (files 7–10)

Generate all four in one chat, same character throughout.

### 7. `neighbour-tiao-walk-a.png` — walk frame A

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute lop-eared rabbit character for a cozy game, small and quick-looking,
> soft cream fur with light-sand ear tips, ONE ear always flopped down over the side
> of the face and one ear up, wearing a coral messenger satchel on a strap across
> the body. Full body, side profile facing RIGHT, mid-walk stride with the LEFT
> foot stepped forward, curious alert expression. Round friendly shapes, clean
> chunky silhouette, medium line weight. Centered on a plain flat light-gray
> background (#B2AEA9), subject not touching the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people.

### 8. `neighbour-tiao-walk-b.png` — walk frame B

> Same character as the previous image, identical in every detail — same rabbit,
> same flopped ear, same coral satchel, same side profile facing RIGHT, same size in
> frame, same plain flat light-gray background (#B2AEA9) — changing ONLY the pose:
> now the RIGHT foot is stepped forward in the walk stride (the opposite step of the
> previous image). No other changes.

### 9. `neighbour-tiao-idle.png` — idle pose

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — changing ONLY the pose: sitting on the haunches
> facing the viewer at a slight three-quarter angle, holding a small cream envelope
> in both front paws, head tilted with a curious expression, the flopped ear still
> down.

### 10. `neighbour-tiao-portrait.png` — portrait bust

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — now a BUST PORTRAIT: head, shoulders and the
> satchel strap only, filling most of the frame, facing the viewer with a bright
> eager smile, the flopped ear down and the other ear tall.

---

## Neighbour Wen — elderly tortoise tea-master (files 11–14)

Generate all four in one chat, same character throughout.

### 11. `neighbour-wen-walk-a.png` — walk frame A

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> A single cute elderly tortoise character for a cozy game, small and gentle, a
> light-sand colored shell with a soft cream rim, primary-green skin, tiny round
> glasses perched on the nose, carrying a steaming cream teacup carefully in both
> hands. Full body, side profile facing RIGHT, mid-walk with the LEFT foot stepped
> slightly forward (a slow, careful step), calm content smile with eyes almost
> closed. Round friendly shapes, clean chunky silhouette, medium line weight.
> Centered on a plain flat light-gray background (#B2AEA9), subject not touching
> the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people.

### 12. `neighbour-wen-walk-b.png` — walk frame B

> Same character as the previous image, identical in every detail — same tortoise,
> same glasses, same teacup held in both hands, same side profile facing RIGHT,
> same size in frame, same plain flat light-gray background (#B2AEA9) — changing
> ONLY the pose: now the RIGHT foot is stepped slightly forward (the opposite slow
> step of the previous image). No other changes.

### 13. `neighbour-wen-idle.png` — idle pose

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — changing ONLY the pose: sitting cross-legged
> facing the viewer at a slight three-quarter angle, the teacup resting on one
> palm, a thin curl of steam rising, serene smile, eyes closed.

### 14. `neighbour-wen-portrait.png` — portrait bust

> Same character as the previous images, identical in every detail, same plain flat
> light-gray background (#B2AEA9) — now a BUST PORTRAIT: head, shoulders and the
> top rim of the shell only, filling most of the frame, facing the viewer, the tiny
> round glasses catching a soft glint, raising the teacup slightly as a greeting.

---

## Landmark construction stages (files 15–24)

For each pair: open a chat, paste the FINISHED landmark art from
`assets/landmark-<id>.png` as reference, and say the stages must match its palette,
angle, proportions, and ground position. Each prompt below is complete on its own;
add "match the attached finished building" when you paste the reference.

### 15. `landmark-lantern-post-stage1.png` — scaffold stage

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon. Match the attached finished lantern-post landmark's
> palette, angle, proportions, and ground position.
> A construction site where a tall decorative lantern post will stand, for a cozy
> game: a single bare warm-brown timber post set upright in fresh sandy ground,
> neat coils of rope at its base, two wooden stakes with a taut string line, a small
> tidy pile of timber offcuts. Clearly "just begun" but tidy and charming, not
> messy. Centered on a plain flat light-gray background (#B2AEA9), subject not
> touching the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people, animals.

### 16. `landmark-lantern-post-stage2.png` — half-built stage

> Same style, palette, angle and size as the previous image — the SAME lantern-post
> construction site, one stage further: the post now raised to full height with its
> curved wooden hanging arm attached at the top, but the arm still EMPTY — one
> single unlit paper lantern resting on the ground at the base waiting to be hung,
> the rope coils mostly used up, the string line and stakes removed. Same plain
> flat light-gray background (#B2AEA9), no ground shadow.

### 17. `landmark-tailor-stage1.png` — scaffold stage

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon. Match the attached finished tailor-shop landmark's
> palette, angle, proportions, and ground position.
> A construction site where a small tailor shop will stand, for a cozy game: a
> staked-out rectangular timber floor frame on sandy ground, corner posts up but no
> walls, and beside the frame a neat stack of folded cloth bolts in coral, deep
> teal and cream, with a wooden crate of tools. Tidy, hopeful, charming. Centered
> on a plain flat light-gray background (#B2AEA9), subject not touching the edges,
> no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people, animals.

### 18. `landmark-tailor-stage2.png` — half-built stage

> Same style, palette, angle and size as the previous image — the SAME tailor-shop
> construction site, one stage further: warm-brown timber walls now raised with a
> door opening and one round window hole, but NO roof yet — open rafters only — and
> through the door opening a bare wooden shop counter is visible inside, the cloth
> bolts now stacked neatly against the inside wall. Same plain flat light-gray
> background (#B2AEA9), no ground shadow.

### 19. `landmark-kitten-cafe-stage1.png` — scaffold stage

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon. Match the attached finished kitten-cafe landmark's
> palette, angle, proportions, and ground position.
> A construction site where a small cozy cat cafe will stand, for a cozy game: a
> neat pallet of cream and light-sand bricks, two wooden sawhorses with a plank
> across them, a stone foundation outline on sandy ground, and a rolled-up coral
> awning fabric leaning against the brick pallet. Tidy and inviting, not messy.
> Centered on a plain flat light-gray background (#B2AEA9), subject not touching
> the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people, animals.

### 20. `landmark-kitten-cafe-stage2.png` — half-built stage

> Same style, palette, angle and size as the previous image — the SAME cat-cafe
> construction site, one stage further: the building shell now stands at full
> height in cream brick with an empty door opening and two empty round window
> holes, no awning and no roof tiles yet, and by the entrance two small paint pots
> (coral and deep teal) with a brush resting across one. Same plain flat light-gray
> background (#B2AEA9), no ground shadow.

### 21. `landmark-coin-bank-stage1.png` — scaffold stage

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon. Match the attached finished coin-bank landmark's
> palette, angle, proportions, and ground position.
> A construction site where a small sturdy coin bank building will stand, for a
> cozy game: heavy soft-gray stone foundation slabs laid flat in sandy ground,
> wooden pegs with taut string lines marking the walls, and a neat stack of cut
> stone blocks beside the foundation. Solid, tidy, promising. Centered on a plain
> flat light-gray background (#B2AEA9), subject not touching the edges, no ground
> shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people, animals.

### 22. `landmark-coin-bank-stage2.png` — half-built stage

> Same style, palette, angle and size as the previous image — the SAME coin-bank
> construction site, one stage further: the soft-gray stone walls now built to half
> height, and the bank's round warm-brown vault door — with its sun-yellow coin
> emblem — leaning against the half wall waiting to be installed, the string lines
> removed. Same plain flat light-gray background (#B2AEA9), no ground shadow.

### 23. `landmark-emperor-gate-stage1.png` — scaffold stage

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon. Match the attached finished emperor-gate landmark's
> palette, angle, proportions, and ground position.
> A construction site where a grand Chinese gateway will stand, for a cozy game:
> two tall bamboo scaffold towers standing where the gate's two pillars will rise,
> lashed with rope at the joints, a coil of rope and a wooden mallet at their base
> on sandy ground. Orderly and full of promise. Centered on a plain flat light-gray
> background (#B2AEA9), subject not touching the edges, no ground shadow.
> Strictly avoid: lettering, photorealism, neon colors, drop shadow, background
> scenery, watermark, people, animals.

### 24. `landmark-emperor-gate-stage2.png` — half-built stage

> Same style, palette, angle and size as the previous image — the SAME gateway
> construction site, one stage further: both grand coral-red pillars now raised to
> full height with their warm-brown bases, but NO crossbeam or roof connecting them
> yet — the bamboo scaffold towers still attached to the outside of each pillar.
> Same plain flat light-gray background (#B2AEA9), no ground shadow.

---

## P2 — remaining wide panoramas (7 files, OPTIONAL, generate later)

Only after the P1 layer is playable. Same recipe as prompt #1/#2 — a wide 2:1
"empty stage" (road across the lower third, one cropped edge structure each side,
**central 60% completely clear**) — re-themed per backdrop. Files:
`bg-street-bamboo-wide.png` (bamboo grove greens), `bg-street-dragon-gate-wide.png`
(coral-red gate mood), `bg-street-harbor-night-wide.png` (night harbor, water
behind the fence), `bg-street-island-sunset-wide.png` (sunset sky, sand road),
`bg-street-lantern-festival-wide.png` (dusk, two lantern strings top edge only),
`bg-street-snow-festival-wide.png` (snow-dusted road and hills),
`bg-street-temple-wide.png` (distant temple silhouette behind the hills). The
current 1024×512 backdrops keep working until these land.

## Workflow reminder

All 24 P1 files into `art-drop/`, raw, unresized, then say **go** — intake QA,
background removal, sprite registration, precache and the code layer are Claude's
job.
