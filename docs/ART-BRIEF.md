# Art Brief — NorthBear HSK Zombie v2

*Draft spec of artwork to create or commission. **Nothing here blocks the v2 build** — every item ships first as programmatic canvas art (palette swaps, gradients); real art drops in later by replacing sprites, same as the existing `maneki`/`coin` sprite-with-fallback pattern in `sprites.js`.*

## Style anchors

- Match the existing look: warm dark-red background, gold (`#f5c518`) accents, chunky rounded shapes, all-ages lucky-cat theme (no gore — "zombies" are cats that wander off).
- Mobile-first: assets are seen at ~48–80 px on a phone canvas. Bold silhouettes, minimal interior detail.
- Format: PNG with transparency, 2× resolution (e.g. 96×96 for a 48 px draw), flat or softly shaded.

## 1. Cat skins (shop unlockables) — priority HIGH

Walking cat in the same pose set the current `cat.js` draws (walk bob + happy). Four skins, each needed in **walk** and **happy** variants (or a single body sprite the code can bob):

| Skin | Palette / motif | Shop price tier |
|------|-----------------|-----------------|
| Midnight | black body, grey muzzle, amber eyes | low |
| Sakura | white body, pink ears/blossom collar | mid |
| Jade | pale-green body, gold bell collar | mid |
| Gold | all-gold, shimmering (slightly emissive) | premium |

Sizes: 96×96 px source, drawn at ~48 px. Until art exists, `cat.js` renders these as palette recolors.

## 2. Battle backdrops — priority HIGH

Full-canvas background scenes, portrait-friendly, must not fight with the word banner (keep the upper two-thirds low-contrast/dark):

| Backdrop | Scene |
|----------|-------|
| Night Market | lantern strings, distant stalls, deep red/purple sky |
| Temple Dawn | pagoda silhouette, warm orange gradient horizon |
| Bamboo | dark bamboo stalks, mist, teal-green tint |

Size: 720×1280 safe-area design; will be drawn scaled. Until art exists, these are canvas gradient + simple-shape scenes.

## 3. Boss cat — priority MEDIUM

One "boss" cat: same species as the walker but ~1.5× bulkier, gold aura ring, small crown or coin necklace. Needs walk + happy variants. Placeholder: the standard cat drawn at 1.5× scale with a gold glow circle.

## 4. Shop & UI icons — priority LOW

- Shop button icon (coin purse or torii-gate shop front), ~64×64.
- Streak flame icon (currently the 🔥 emoji), ~48×48.
- Coin re-use: the existing `coin` sprite is fine everywhere.

## 5. Nice-to-have / later

- Mascot (maneki) celebration pose for "new best!" on results.
- Shop item thumbnails (auto-croppable from the skin sprites — no separate art needed if skins exist).
- App-store screenshots frame/template once v2 ships.

## Delivery & integration

Drop PNGs into `game/assets/` named `cat-<skin>.png`, `bg-<name>.png`, `cat-boss.png`, register them in `sprites.js`'s manifest, and the existing sprite-or-fallback pattern picks them up. No code redesign needed.
