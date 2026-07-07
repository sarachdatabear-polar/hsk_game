# Generation prompts v5 — style-locked to the reference (PRD v5 A2)

Every prompt below = **MASTER STYLE PROMPT + the asset clause**. Keep the exact
filename and dimensions and the file is drop-in (`assets/`, registries unchanged).
Workflow per asset: generate → `python3 scripts/compress_bg.py <file>` (backgrounds
only) → `python3 scripts/qa_asset.py assets/<file>` → manual checklist
(`docs/art/ART-QA-CHECKLIST.md`) → set manifest status → `npm test`.

## MASTER STYLE PROMPT (prepend to every asset clause)

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game,
> polished mobile-game quality, storybook watercolor–flat hybrid with soft edges
> and gentle painted texture (no gradients harsher than soft daylight falloff).
> Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57,
> coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8,
> deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted,
> never pure black, never pure white, never neon. Soft warm daylight from the
> UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood,
> rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes,
> consistent medium line weight. No text or lettering of any kind.

**Global negative:** photorealism, neon, casino/jackpot glitter, black-and-gold
framing, cold gray UI chrome, glassmorphism, sharp corners, horror mood, human
characters, any lettering, watermark.

**Character anchor:** match the rendering, proportions and cheerfulness of
`assets/cat-study.png` (round head ≈45% of height, short limbs, big paws,
friendly expression) and the reference sheet
`assets/_plan/REFERENCE-production-target.png`.

---

## P0 — missing art (vector placeholders / no file today)

### `bg-market.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: night market)

> Cozy evening night-market lane for a cute side-view battle scene, landscape
> 1024×512. Warm paper lanterns strung overhead (soft amber glow, not neon),
> small wooden food stalls with cloth awnings on both sides, a clear flat lane
> along the bottom fifth where two small characters stand. Deep-teal dusk sky,
> lantern light stays warm sun-yellow/coral. Low detail in the center band (a
> word card overlays the middle). Even at night, keep the mood warm and safe —
> a festival evening, not darkness.

Negative (add): pitch-black night, red-only lighting, crowds, people.

### `bg-temple.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: temple dawn)

> Peaceful hillside temple courtyard at dawn for a cute side-view battle scene,
> landscape 1024×512. Small East Asian temple with gently curved rooflines to
> one side, stone lanterns, a leafy old tree, soft pink-gold dawn sky fading to
> sky blue, morning mist over distant green hills. Clear flat stone path along
> the bottom fifth for two small characters; low detail in the center band.

### `bg-bamboo.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: bamboo grove)

> Sun-dappled bamboo grove for a cute side-view battle scene, landscape
> 1024×512. Tall friendly bamboo stalks framing both sides, warm light shafts
> from the upper left through the leaves, a few smooth stones and ferns, a
> clear flat earth path along the bottom fifth for two small characters; low
> detail in the center band. Fresh greens within the palette, cream sky glimpses.

### `bg-battle.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: daylight forest — replaces legacy night-festival art with baked-in 福 text)

> Bright daylight forest clearing for a cute side-view battle scene, landscape
> 1024×512. A clear flat dirt/grass lane runs along the bottom fifth where two
> small characters stand. Layered friendly trees and bushes on both sides, a
> few rocks, soft green mountains far behind, warm sunlight from the upper
> left with soft shadows. Low detail in the center band (a word card overlays
> the middle). Fresh greens and creams within the palette.

Negative (add): night, lanterns, festival/red-gold decor, dense clutter behind the center.

### `raccoon-walk.png` — 1536×256 (6 frames of 256×256), alpha, ≤500 KB
### `raccoon-happy.png` — 1024×256 (4 frames of 256×256), alpha, ≤500 KB

> Chibi gray raccoon ninja, cute toy-like opponent, in the exact same rendering
> style and proportions as the calico cat anchor. Dark charcoal sleeveless
> outfit, blue-gray headband with short tails, small wooden staff on the back,
> black eye-mask markings, ringed tail, pink nose, friendly determined
> expression — never scary. Side view facing LEFT. Sheet 1: walking cycle,
> 6 frames of 256×256 laid out horizontally (total 1536×256). Sheet 2: happy
> defeat-bow, 4 frames of 256×256 (total 1024×256). Stable foot baseline,
> centered body, identical markings and colors on every frame, transparent
> background, no baked-in drop shadows.

Negative (add): realistic anatomy, teeth/claws bared, weapons in hand,
frame-to-frame color or costume drift.

## P1 — style-drift candidates (existing art predates the style lock)

### `cat-walk.png` — 1536×256 (6×256×256), alpha, ≤500 KB · `cat-happy.png` — 1024×256 (4×256×256), alpha, ≤500 KB

> The hero calico lucky cat (white body, orange and brown patches, red collar
> with small gold bell) exactly matching the character anchor. Sheet 1: side
> view facing RIGHT, cheerful walking cycle, 6 frames of 256×256 horizontally.
> Sheet 2: front-facing happy celebration (paws up, closed happy eyes), 4
> frames of 256×256. Stable foot baseline, identical markings every frame,
> transparent background.

### Shop skin sheets — same two-sheet contract as the hero cat (walk 1536×256 / happy 1024×256, alpha, ≤500 KB each)

Generate each skin as a re-colored variant of the hero cat prompt — SAME pose
timing, SAME frame layout, only fur/outfit palette changes:

- `cat-midnight-walk.png` / `cat-midnight-happy.png` — deep blue-charcoal fur, pale cream muzzle/paws, teal collar.
- `cat-sakura-walk.png` / `cat-sakura-happy.png` — soft pink-cream fur, white patches, coral collar, tiny blossom on ear.
- `cat-jade-walk.png` / `cat-jade-happy.png` — pale jade-green fur, cream muzzle, green collar with leaf tag.
- `cat-gold-walk.png` / `cat-gold-happy.png` — warm golden fur, cream muzzle, brown collar with small gold bell (warm and restrained — never metallic chrome).

### `cat-boss-walk.png` — 1536×256 · `cat-boss-happy.png` — 1024×256 (alpha, ≤500 KB each)

> A bigger, rounder boss cat: gray-and-white fur, small red general's sash and
> tiny fabric shoulder guards (cloth, not metal armor), bushy tail, confident
> grin — imposing but friendly, a rival not a monster. Same frame contract and
> facing as the raccoon (faces LEFT).

### Street decos — alpha, warm daylight, ≤120 KB each

- `lantern.png` — 256×384: single warm paper lantern on a short rope loop, sun-yellow/coral paper, wooden top and base, soft inner glow.
- `cloud.png` — 512×256: one soft cream cumulus cloud, gentle warm underlight, storybook painted edges.
- `coin.png` — 128×128, ≤20 KB: single friendly gold coin with a paw-print emboss, warm sun-yellow with brown outline — flat friendly token, no sparkle burst.

## P2 — regenerate ONLY on owner decision (current files are already style-locked)

The six big backgrounds (`bg-home`, `bg-flashcards`, `bg-results`,
`bg-progress`, `bg-collection`, `bg-quest`) were generated with palette-locked
prompts in earlier rounds, and the UI plaque/buttons/tags/badges/fx stamps/orbs
are **SVGs extracted directly from the reference sheet** (pack v2) — regenerating
those risks drift, not fixes. If one fails the A2 QA gate at review time, reuse
its original prompt from `docs/art/GENERATION-PROMPTS-visual-slice.md` (bg-home,
bg-battle) with the master prompt above; fx/plaque/button PNG replacements also
need a `sprites.js` `SVG_SPRITES` edit (a dev-round change — file it, don't
improvise it).

---

Integration notes: same filename → `assets/` → no rebuild needed for images;
run `npm test`; set the manifest row's `status`; log the QA result in
`docs/art/ART-QA-CHECKLIST.md`; bump `sw.js` SHELL once per shipped round.
Full-screen 1080×1920 backgrounds ship as WebP q80 (`python3 scripts/to_webp.py`);
1024×512 battle backdrops stay PNG via `scripts/compress_bg.py`.
