# Cat base-skin regen v2 — match the raccoon's upright side-profile walk

**Why:** In-game the player cat (`cat-walk.png` / `cat-happy.png`) reads as a
different *action and rendering* from the raccoon enemy. The cat is painted in a low,
prone ¾ **crawl/swim pose**; the raccoon is a clean **upright side-profile walk**.
Jordan wants the two to read as the same world / same quality.

**Scope is tight — only the BASE skin is wrong.** Confirmed from
`src/sprite-metrics.js` (union alpha box per sheet, 256px frames):

| sheet          | content box (w×h) | shape                         |
|----------------|-------------------|-------------------------------|
| `cat-walk`     | 256 × 138         | **wide, low → crawl pose** ❌  |
| `raccoon-walk` | 194 × 232         | tall, upright side-profile ✅ |
| `cat-ninja-walk` | 240 × 187       | upright ✅                     |
| `cat-panda-walk` | 240 × 191       | upright ✅                     |
| `cat-dragon/astronaut/mooncake/beach/boss-walk` | ~200–230 tall | upright ✅ |

Every purchasable cat **skin** is already upright and matches the raccoon. Only the
default `cat-walk` + `cat-happy` are the low-crawl anomaly. **Regenerate just those two.**
(This is why the mismatch only shows on the free/default cat — the one most players see.)

---

## Deliverables

Same canvases / manifest entries as today (do **not** change dimensions — the game's
`drawSpriteFrame` + `sprite-metrics.js` pipeline handles anchoring):

- `cat-walk.png` — 1536×256, six 256×256 cells, transparent PNG
- `cat-happy.png` — 1024×256, four 256×256 cells, transparent PNG

## Prompt (prepend the Shared style block + append the Shared negative block from `PROMPTS-education-v1.md`)

**`cat-walk.png`** (attach approved `cat-study.png` as the character reference):

> Sprite sheet, six-frame walking cycle of EXACTLY the same lucky-cat character as the
> attached reference: identical face, fur markings, coral-red scarf, small closed jade
> book, proportions, colors, line weight, and shading. **Full UPRIGHT SIDE-PROFILE walk,
> standing on two legs, body vertical — the same clean side-view walk posture as a chibi
> mascot striding along a path (match the game's raccoon-ninja and cat-ninja walk
> sheets: upright torso, clearly striding legs, head held high).** The cat walks calmly
> to the RIGHT (feet planted on a common baseline). Six equal 256×256 cells in one row:
> (1) left-foot contact, (2) passing pose, (3) up/neutral, (4) right-foot contact,
> (5) passing pose, (6) recovery/loop. Subtle body bob, stable head, slight scarf
> bounce, gentle tail swing; the jade book stays in the same paw, held low and secondary,
> in every frame. **Same foot baseline and horizontal center in every cell; the character
> should fill roughly the same tall footprint as the raccoon (≈190w × 230h of the 256
> frame), NOT lie down or crawl.** No scale/perspective drift. Transparent background.

**`cat-happy.png`** — same character + same upright side-profile build, four-frame
celebration (little victory hop / cheer), feet leaving and returning to the baseline,
scarf and tail lively. Transparent background.

## Acceptance

1. Generate → review against the `PROMPTS-education-v1.md` §11 checklist → save into
   `art-source/education-v1/` → promote to `assets/`.
2. The content box must come out **taller than wide** (upright), i.e. roughly matching
   the raccoon / cat-ninja rows above — NOT the current 256×138.
3. After promoting the PNGs, **regenerate metrics**:
   `python3 scripts/gen_sprite_metrics.py` (updates `src/sprite-metrics.js` so the new
   upright art is anchored/scaled correctly), then `npm run build`.
4. Eyeball in-game: the default cat and the raccoon should read as the same size, same
   upright walk, same rendering quality, on the Lantern Trail.

**Blocker:** raster art can't be produced from the coding harness — this needs Jordan's
image-generation pipeline. Everything else (metrics regen + build) is scripted and ready.
