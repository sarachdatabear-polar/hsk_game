# Art Brief - NorthBear HSK Zombie v2

*Artwork spec and implementation notes. **Nothing here blocks the v2 build** - the shop now has real generated PNG unlock assets with canvas/vector fallbacks, and higher-fidelity painted assets can replace the same filenames later.*

## Style anchors

- Match the existing look: warm dark-red background, gold (`#f5c518`) accents, chunky rounded shapes, all-ages lucky-cat theme (no gore - "zombies" are cats that wander off).
- Mobile-first: assets are seen at ~48-80 px on a phone canvas. Bold silhouettes, minimal interior detail.
- Format: PNG with transparency, 2x resolution (e.g. 96x96 for a 48 px draw), flat or softly shaded.

## 1. Cat skins (shop unlockables) - priority HIGH

Walking cat in the same pose set the current `cat.js` draws (walk bob + happy). Four skins, each needed in **walk** and **happy** variants (or a single body sprite the code can bob):

| Skin | Palette / motif | Shop price tier |
|------|-----------------|-----------------|
| Midnight | black body, grey muzzle, amber eyes | low |
| Sakura | white body, pink ears/blossom collar | mid |
| Jade | pale-green body, gold bell collar | mid |
| Gold | all-gold, shimmering (slightly emissive) | premium |

Implemented as 6-frame walk and 4-frame happy PNG sheets in `game/assets/`:
`cat-midnight-*`, `cat-sakura-*`, `cat-jade-*`, and `cat-gold-*`. `cat.js`
uses these sheets first and falls back to filtered base art if a sheet is still loading.

## 2. Battle backdrops - priority HIGH

Full-canvas background scenes, portrait-friendly, must not fight with the word banner (keep the upper two-thirds low-contrast/dark):

| Backdrop | Scene |
|----------|-------|
| Night Market | lantern strings, distant stalls, deep red/purple sky |
| Temple Dawn | pagoda silhouette, warm orange gradient horizon |
| Bamboo | dark bamboo stalks, mist, teal-green tint |

Implemented as `bg-market.png`, `bg-temple.png`, and `bg-bamboo.png` in
`game/assets/`. The canvas-drawn versions remain as first-load/missing-asset fallbacks.

## 3. Boss cat - priority MEDIUM

One "boss" cat: same species as the walker but ~1.5x bulkier, gold aura ring,
small crown or coin necklace. Implemented as `cat-boss-walk.png` and
`cat-boss-happy.png`, with the gold aura still drawn in canvas.

## 3b. Cat growth accessories (v3) - priority MEDIUM

The Lv1->Lv50 growth system dresses the cat as it levels; currently vector overlays, replaceable by sprite variants (either accessory-only transparent PNGs layered at the same anchor points, or full dressed-cat sheets per tier):

| Unlock | Accessory |
|--------|-----------|
| Lv5 | Red scarf around the neck |
| Lv10 | Gold coin charm on the chest |
| Lv20 | Chinese outfit (red/gold vest) |
| Lv30 | Kitten follower (mini cat trailing behind - needs its own small walk sprite, ~48x48 source) |
| Lv50 | Emperor crown + gold halo |

## 4. Shop & UI icons - priority LOW

- Shop button icon (coin purse or torii-gate shop front), ~64x64.
- Streak flame icon, ~48x48.
- Coin re-use: the existing `coin` sprite is fine everywhere.

## 5. Nice-to-have / later

- Mascot (maneki) celebration pose for "new best!" on results.
- Shop item thumbnails (auto-croppable from the skin sprites - no separate art needed if skins exist).
- App-store screenshots frame/template once v2 ships.

## Delivery & integration

Drop replacement PNGs into `game/assets/` using the existing names
(`cat-<skin>-walk.png`, `cat-<skin>-happy.png`, `bg-<name>.png`,
`cat-boss-walk.png`, `cat-boss-happy.png`), then register any new names in
`sprites.js`. No code redesign needed for same-name replacements.
