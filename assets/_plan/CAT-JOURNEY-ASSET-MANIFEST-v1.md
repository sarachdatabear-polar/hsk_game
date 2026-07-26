# Cat Journey Asset Manifest v1

**Created:** 2026-07-26
**Status:** MVP assets generated and placed
**Runtime asset root:** `/root/work/HSK/game/assets`

This is the complete production list for the Cat Journey MVP. The bitmap
illustrations have already been generated and placed in the runtime asset
folder. UI cards, meters, buttons, and icons should remain code-native or reuse
the existing SVG system; they should not be rendered into background art.

## Locked art direction

Cozy painterly storybook illustration, soft cel shading with subtle brush
texture, warm-brown outlines (`#7A5A44`), warm paper (`#FFF8E8`), coral
(`#E65A4F`), jade (`#4FAE8A`), sky (`#6EB6E8`), sun (`#F5C85B`), ink navy
(`#243447`), leaf (`#78B86B`), warm golden-hour light, rounded approachable
shapes, polished mobile-game readability.

Cat continuity:

- cream fur;
- orange forehead patch, one orange ear area, and orange-ringed tail;
- coral scarf;
- friendly rounded face and large warm brown eyes;
- green book or jade learning prop;
- education and exploration, never gambling or casino imagery.

Universal negative block:

> No readable text, no Chinese characters, no pseudo-writing, no logo, no
> watermark, no UI controls, no currency, no coins, no casino cues, no weapons,
> no photorealism, no 3D render, no neon cyberpunk, no harsh black outlines, no
> crowded focal area.

## Runtime inventory

### Generated for the MVP

| Asset | Exact runtime path | Size | Use |
|---|---|---:|---|
| Vocabulary Garden | `game/assets/bg-cat-garden-v1.webp` | 1080×1920 | Bond tier 2 background |
| Morning Market | `game/assets/bg-cat-market-v1.webp` | 1080×1920 | Bond tier 3 background |
| Lantern Riverside | `game/assets/bg-cat-lantern-v1.webp` | 1080×1920 | Bond tier 4 background |
| Scholar Gate | `game/assets/bg-cat-scholar-gate-v1.webp` | 1080×1920 | Bond tier 5 background |
| Ready to explore | `game/assets/cat-journey-ready-v1.png` | 1254×1254 RGBA | Journey available/starting |
| Returned with memory | `game/assets/cat-journey-return-v1.png` | 1254×1254 RGBA | Journey return/reward |
| Resting | `game/assets/cat-rest-v1.png` | 1254×1254 RGBA | Quiet/late-day state |

The character PNGs have transparent backgrounds and bottom-center visual
anchors. The background WebPs are compressed runtime files; do not add text or
buttons directly to them.

### Reuse from the current game

| Asset | Exact runtime path | Cat Journey use |
|---|---|---|
| Study Room | `game/assets/bg-home.webp` | Default tier-1 background |
| Studying cat | `game/assets/cat-study.png` | Active study state |
| Guide cat | `game/assets/cat-guide.png` | First-use explanation |
| Thinking cat | `game/assets/cat-thinking.png` | Goal partly complete |
| Celebrating cat | `game/assets/cat-celebrate.png` | Bond tier unlock |
| Cat portrait | `game/assets/cat-portrait.png` | Compact header/avatar |
| Walk sprite | `game/assets/cat-walk.png` | Optional short send-off motion |
| Happy sprite | `game/assets/cat-happy.png` | Optional return motion |
| Shared icons | `game/assets/ui-icons.svg` | Book, star, calendar, close, back |
| Progress track | `game/assets/ui-progress-track.svg` | Bond meter |
| Progress fill | `game/assets/ui-progress-fill.svg` | Bond meter |
| Mastery badge | `game/assets/ui-badge-mastery.svg` | Scholar/Bond badge |
| Daily-goal effect | `game/assets/fx-daily-goal.svg` | Journey-ready celebration |
| Level-up effect | `game/assets/fx-level-up.svg` | Bond-tier celebration |

### No additional bitmap required

- Bond cards, daily-goal card, primary button, memory card, lock state, and
  background selector should be HTML/CSS with the existing UI SVGs.
- Memory cards should crop the earned background and overlay authored text.
- Keepsakes should initially use simple icons from `ui-icons.svg`; bespoke
  illustrated keepsakes can be a post-MVP content pack.
- Do not generate text inside illustrations. All localization stays in HTML.

## Reproducible generation prompts

Use `game/assets/bg-home.webp` as the style/composition reference for
backgrounds. Use `game/assets/cat-study.png` as the identity/style reference for
cat poses. Generate at the highest supported resolution, then export backgrounds
to 1080×1920 WebP and remove the flat chroma key from character art.

### `bg-cat-garden-v1.webp`

> Create a polished 9:16 portrait mobile-game background using the supplied
> Lucky Cat home background as the style reference. A peaceful Chinese
> vocabulary garden in warm morning sunlight: a winding pale-stone path, jade
> roof pavilion in the distance, flowering shrubs, bamboo, a shallow koi stream,
> soft mountains and sky. Place a round jade reading cushion and one closed
> green book near the lower edge. Keep the center and lower-center 45 percent
> broad, calm, and visually open so a large cat character can be overlaid.
> Painterly storybook illustration, soft cel shading, subtle brush texture,
> warm-brown outlines, coral and jade accents, cozy educational mood, strong
> depth with foreground plants framing the sides. No character, no people.
> Apply the universal negative block.

### `bg-cat-market-v1.webp`

> Create a polished 9:16 portrait mobile-game background using the supplied
> Lucky Cat home background as the style reference. A friendly neighborhood
> morning market courtyard in late-afternoon golden light: traditional tiled
> roofs, coral cloth awnings, fruit and tea stalls, potted greenery, warm wood,
> and a glimpse of a quiet lane. Any hanging tags must be completely blank. Put
> a small tea table and closed green book at a lower corner. Keep a broad
> uncluttered path through the center and lower-center for a large foreground
> cat. Cozy painterly storybook, soft cel shading, subtle brush texture,
> warm-brown outlines, coral-jade-paper palette, inviting learning-adventure
> mood. No character, no people. Apply the universal negative block.

### `bg-cat-lantern-v1.webp`

> Create a polished 9:16 portrait mobile-game background using the supplied
> Lucky Cat home background as the style reference. A magical but calm
> blue-hour riverside terrace: curved stone bridge, distant tiled-roof houses,
> dark blue sky, warm coral lanterns framing the edges, gentle water reflections,
> flowering branches, and a wooden viewing deck. Add a jade cushion and closed
> green book near one lower corner. Leave the center and lower-center open for a
> large cat character. Cozy painterly storybook, soft cel shading, subtle brush
> texture, warm-brown outlines, rich blue with warm coral and jade highlights,
> wholesome educational celebration. No character, no people. Apply the
> universal negative block.

### `bg-cat-scholar-gate-v1.webp`

> Create a polished 9:16 portrait mobile-game background using the supplied
> Lucky Cat home background as the style reference. An open-air scholar's
> pavilion overlooking misty mountains and a distant ceremonial jade-roof gate.
> Frame the sides with warm wooden shelves, blank scrolls, plum blossom, books,
> an inkstone, and brushes. Put a large round jade-and-paper rug in the open
> lower center, with a small reading desk confined to a lower corner. The gate
> may use a simple paw-print or closed-book motif only. Keep the main
> center/lower-center open for a foreground cat. Warm sunrise, cozy painterly
> storybook, soft cel shading, subtle brush texture, warm-brown outlines,
> coral-jade-paper palette, aspirational educational mood. No character, no
> people. Apply the universal negative block.

### `cat-journey-ready-v1.png`

> Using the supplied Lucky Cat study illustration as the exact character and
> rendering reference, create one centered full-body mascot pose on a perfectly
> flat solid `#FF00FF` background. The same cream cat with orange forehead patch,
> orange ear detail, orange-ringed tail, coral scarf, warm brown eyes, rounded
> proportions, warm-brown outlines, painterly soft cel shading and subtle brush
> texture. The cat stands, gives a small friendly wave, and wears a tiny jade
> cross-body book satchel with a green book visible. Expression: eager, brave,
> and welcoming, ready for a small learning adventure. Preserve empty space
> around the silhouette; do not crop ears, paws, tail, scarf, or satchel. No
> cast shadow. Apply the universal negative block except for the required chroma
> background.

### `cat-journey-return-v1.png`

> Using the supplied Lucky Cat study illustration as the exact character and
> rendering reference, create one centered full-body mascot pose on a perfectly
> flat solid `#FF00FF` background. The same cream cat with orange forehead patch,
> orange ear detail, orange-ringed tail, coral scarf, warm-brown outlines,
> painterly soft cel shading and subtle brush texture. The cat sits happily with
> a jade travel satchel and proudly holds up a small cream postcard containing
> only a painted green leaf—no writing or symbols. Expression: delighted to see
> the learner again, eyes smiling. Preserve empty space around the complete
> silhouette; do not crop the cat, postcard, tail, or satchel. No cast shadow.
> Apply the universal negative block except for the required chroma background.

### `cat-rest-v1.png`

> Using the supplied Lucky Cat study illustration as the exact character and
> rendering reference, create one centered full-body mascot pose on a perfectly
> flat solid `#FF00FF` background. The same cream cat with orange forehead patch,
> orange ear detail, orange-ringed tail, coral scarf, warm-brown outlines,
> painterly soft cel shading and subtle brush texture. The cat is peacefully
> curled asleep on a round tufted jade cushion, with one closed green book beside
> the cushion. Expression and body language are safe, content, and restful—not
> sad, sick, hungry, or abandoned. Preserve empty space around the complete
> silhouette; do not crop ears, cushion, tail, scarf, or book. No cast shadow.
> Apply the universal negative block except for the required chroma background.

## Export recipe

Background export:

```sh
convert INPUT.png -resize '1080x1920^' -gravity center \
  -extent 1080x1920 -quality 84 game/assets/OUTPUT.webp
```

Character transparency:

```sh
python3 /root/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input INPUT.png \
  --out game/assets/OUTPUT.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Validate from `game/`:

```sh
npm run assets:validate
identify assets/bg-cat-*-v1.webp assets/cat-*-v1.png
```

If a character has a visible magenta fringe on a dark background, regenerate
from the source or retry the transparency helper with `--edge-contract 1`.

## Optional post-MVP asset pack

Do not block the first Cat Journey release on these:

- 12 small transparent keepsakes (leaf, tea cup, paper kite, bamboo sprig,
  lantern, bridge charm, brush, bookmark, flower, market fruit, bell, fan);
- 3 additional cat reactions (surprised, proud, cozy reading);
- rain and winter background variants;
- one short walk-away sprite transition for the journey start.

Each optional asset should follow the same locked art direction, remain
text-free, and be added to `game/assets/asset-manifest.json` before integration.
