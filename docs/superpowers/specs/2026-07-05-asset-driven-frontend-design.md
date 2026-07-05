# Asset-Driven Front-End — Production Art Migration (PRD)

**Date:** 2026-07-05
**Project:** Lucky Cat HSK (`game/`)
**Reference:** `art-source/style-guide/REFERENCE-production-target.png` (Production Art Plan)
**Status:** Approved design — ready for implementation planning

---

## 1. Goals & principles

**Goal:** Migrate the Lucky Cat HSK front-end from code-drawn UI to an **asset-driven**
front-end that matches the Production Art Plan, where *every visual element is a stored
image asset* declared in one registry, with dynamic text/numbers layered live on top.

**Principles (non-negotiable):**

1. **Every visual chrome element is an asset** with a stable `id` and file — no
   `linear-gradient`/`box-shadow`-drawn panels, buttons, plaques, badges, tags, or bars
   in the shipped look of a migrated screen.
2. **Text stays live** — score, level, coins, HSK word/pinyin/meaning, answer labels
   render as DOM text over asset frames.
3. **Graceful fallback preserved** — every asset load falls back to the current CSS/canvas
   draw so the game still runs on `file://` and during slow loads (existing pattern in
   `cat.js` / `main.js`).
4. **One source of truth** — `assets/asset-manifest.json` ⇄ `src/assets.js` registry ⇄
   the Asset Tracker stay in sync.
5. **Method-agnostic production** — this PRD defines each asset's *contract*; how it is
   painted (AI tool, generator script, or hand) is per-asset and open.

**Scope:** Full program — Vertical Slice v1 (P0) in full detail, plus the expansion set
(P1). Organized by milestone so it decomposes into separate implementation plans.

---

## 2. Asset contract & registry

Every asset slot is defined once with this contract (manifest fields):

| Field | Meaning |
|---|---|
| `id` | stable key (e.g. `ui-button-primary`) used in code + tracker |
| `file` | filename in `assets/` |
| `type` | `background` / `character` / `sprite-sheet` / `ui-frame` / `effect-atlas` / `icon-sprite` |
| `w`, `h` | intrinsic pixel size |
| `slice` | 9-slice margins `[top,right,bottom,left]` for `ui-frame` (else `null`) |
| `frames` / `frameWidth` / `frameHeight` | for sprite-sheets & effect atlases |
| `states` | for buttons: `default` / `pressed` / `disabled` variants |
| `anchor` | placement anchor for canvas-drawn art (characters/effects) |
| `fallback` | name of the CSS/canvas fallback routine |
| `status` | `planned` → `concept` → `review` → `approved` → `integrated` |
| `priority` | `P0` (VS v1) / `P1` (expansion) |

**Runtime — `src/assets.js`:**

- `REGISTRY` — the asset table, kept in sync with `asset-manifest.json`.
- `preload()` — warms all P0 assets on boot; P1 lazily on first use.
- `frameCSS(id)` — returns a `border-image` shorthand string for `ui-frame` assets.
- `img(id)` — returns an `Image` (or `null` when unavailable) for canvas art.

UI frames are applied via CSS `border-image` on the existing class-based elements. Icons
remain the SVG `<use href="assets/ui-icons.svg#…">` sprite (already satisfies the rule).

---

## 3. Full asset inventory

Every visual element enumerated as a stored asset with a stable id.
`P0` = Vertical Slice v1, `P1` = expansion.

### 3.1 Global / shared chrome

| id | file | type | notes | P | fallback |
|---|---|---|---|---|---|
| `ui-panel` | ui-panel.png | ui-frame (9-slice) | rounded wood panel, gold trim | P0 | CSS panel |
| `ui-button-primary` | ui-button-primary.png | ui-frame ×states | red; default/pressed/disabled | P0 | CSS btn |
| `ui-button-secondary` | ui-button-secondary.png | ui-frame ×states | green (correct-answer) | P0 | CSS btn |
| `ui-button-neutral` | ui-button-neutral.png | ui-frame ×states | dark answer + disabled grey | P0 | CSS btn |
| `ui-badge` | ui-badge.png | ui-frame | round paw badge | P0 | CSS circle |
| `ui-tag` | ui-tag.png | ui-frame | HSK-level tag (dark red) | P0 | CSS pill |
| `ui-progress-track` | ui-progress-track.png | ui-frame (9-slice) | empty bar | P0 | CSS bar |
| `ui-progress-fill` | ui-progress-fill.png | ui-frame (9-slice) | green fill, clipped by % | P0 | CSS bar |
| `ui-hud-pill` | ui-hud-pill.png | ui-frame | coin/gem/streak HUD capsule | P0 | CSS pill |
| `ui-nav-bar` | ui-nav-bar.png | ui-frame (9-slice) | bottom nav container | P0 | CSS bar |
| `ui-icons` | ui-icons.svg | icon-sprite | all glyphs (see 3.6) | P0 | inline SVG |

### 3.2 Home screen

| id | file | type | notes | P |
|---|---|---|---|---|
| `bg-home` | bg-home.png | background | night-market vertical | P0 |
| `maneki-home` | maneki.png | character | big waving mascot | P0 |
| `cat-portrait` | cat-portrait.png | character | HUD avatar (Lv badge) | P0 |
| `home-logo` | home-logo.png | ui-frame | "LUCKY CAT HSK" title lockup | P0 |
| `home-street-card` | home-street-card.png | ui-frame (9-slice) | "Lucky Cat Street / Level 12" panel | P0 |
| `btn-battle` | btn-battle.png | ui-frame ×states | large primary BATTLE plate | P0 |
| `btn-flashcards` | btn-flashcards.png | ui-frame ×states | secondary plate | P0 |
| nav icons | via `ui-icons` | icon | home/shop/street/progress/quests | P0 |

### 3.3 Battle screen

| id | file | type | notes | P |
|---|---|---|---|---|
| `bg-battle` | bg-battle.png | background | night-market landscape | P0 |
| `cat-base-walk` | cat-walk.png | sprite-sheet | 6×256² player cat | P0 |
| `cat-base-happy` | cat-happy.png | sprite-sheet | 4×256² celebrate | P0 |
| `enemy-scholar` | enemy-scholar.png | character/sheet | black-hat opponent cat | P0 |
| `ui-word-plaque` | ui-word-plaque.png | ui-frame (9-slice) | central hanzi plaque | P0 |
| `ui-scroll-banner` | ui-scroll-banner.png | ui-frame | vertical "加油" cheer scroll | P0 |
| `ui-round-badge` | ui-round-badge.png | ui-frame | "Round 5/10" | P0 |
| `ui-boss-hp` | ui-boss-hp.png | ui-frame (9-slice) | enemy HP track+fill | P0 |
| `ui-combo-meter` | ui-combo-meter.png | ui-frame | flame combo track | P0 |
| `ui-combo-ring` | ui-combo-ring.png | ui-frame | "x2" multiplier ring | P0 |
| hearts | via `ui-icons` | icon | heart / heart-empty | P0 |
| answer buttons | `ui-button-secondary` / `-neutral` | ui-frame | 4 choice plates (correct=green) | P0 |

### 3.4 Effects (canvas atlases)

| id | file | frames | notes | P |
|---|---|---|---|---|
| `fx-correct` | fx-correct.png | atlas | gold paw burst | P0 |
| `fx-wrong` | fx-wrong.png | atlas | dark-red paw | P0 |
| `fx-critical` | fx-critical.png | atlas | "CRITICAL!" sunburst | P0 |
| `fx-level-up` | fx-level-up.png | atlas | level-up flash | P1 |
| `fx-new-best` | fx-new-best.png | atlas | new-record flourish | P1 |
| `fx-vfx-pack` | fx-*.png | atlas ×~4 | expansion "More VFX" (swirl/star/nova/spark) | P1 |

### 3.5 Other screens (scope, flashcards, results, scores, progress, shop, how-to)

| id | file | type | notes | P |
|---|---|---|---|---|
| `bg-results` | bg-results.png | background | results/festive | P1 |
| `bg-shop` | bg-market.png | background | shop backdrop | P1 |
| `bg-generic` | bg-festive.png | background | shared for scores/progress/howto | P1 |
| `ui-card-flashcard` | ui-card-flashcard.png | ui-frame (9-slice) | flashcard face | P1 |
| `ui-shop-item` | ui-shop-item.png | ui-frame (9-slice) | shop list-item frame | P1 |
| `ui-result-panel` | ui-result-panel.png | ui-frame (9-slice) | results summary panel | P1 |
| shop previews | `shop-<sku>.png` | character/bg thumb | one per SKU (skins/bg/fx) | P1 |

### 3.6 Icon sprite (`ui-icons.svg`) — required glyphs

`heart`, `heart-empty`, `coin`, `diamond`/`gem`, `audio`, `muted`, `pause`, `settings`,
`close`, `back`, `home`, `shop`, `street`, `progress`, `quests`, `flashcards`, `battle`,
`check`, `wrong`, `paw`, `streak`, `flame`, `star`, `play`, `target`, `infinity`, `cards`,
`pencil`, `repeat`, `lock`, `trophy`.

### 3.7 Expansion set (P1, lighter contract — from the roadmap)

| group | ids | count |
|---|---|---|
| Cat skins | `cat-{midnight,sakura,jade,gold}-{walk,happy}` | 4 skins ×2 |
| Boss cat | `cat-boss-{walk,happy}` | 1 |
| Backgrounds | `bg-{forest,temple-dawn,bamboo}` | 3 scenes |
| Street decor | `decor-{lantern,tree,stall,sign,bonsai,statue,…}` | 15+ |
| Effects | expansion VFX pack | ~4 |
| Shop items | skin/bg/fx preview thumbs | per SKU |
| Marketing | `mkt-app-icon`, `mkt-feature-graphic`, `mkt-screenshot-*` | set |

### 3.8 Style Bible (governs every asset)

These rules are **acceptance criteria**: an asset that violates them fails the Visual
Consistency gate regardless of subject.

**Color palette** (sampled from the reference; locked as CSS custom properties + a
`assets/style-guide/palette.png` swatch asset):

| token | role | hex |
|---|---|---|
| `--c-main` | maroon base (panels, tags) | `#701210` |
| `--c-accent` | red (primary buttons, hearts) | `#bc2916` |
| `--c-gold-1` | gold trim / strokes | `#ee8524` |
| `--c-gold-2` | gold highlight | `#f7c23b` |
| `--c-jade` | jade (secondary / correct) | `#155643` |
| `--c-night` | night sky / dark UI | `#081a27` |
| `--c-text` | text / silhouette ink | `#141013` |

**Material & light:** single warm **key light from upper-left**. **Gold = shiny** (high
specular, bright rim). **Jade = smooth** (soft gloss, low specular). **Wood = warm matte**.
**Roof tiles = cool & dark**. Consistent light direction across every character, UI frame,
and effect — no conflicting shadows between adjacent assets. Reference tiles stored:
`art-source/style-guide/material-{lantern,gold,jade,roof}.png`.

**Line & shading:** clean silhouettes, **medium uniform line weight**, **soft cel-shading**,
**strong rim light**, **readable at small sizes**. No thin lines that vanish when downscaled.

**Typography:** Hanzi/title = `LuckyTitle` (`assets/fonts/title.woff2`, bundled). Pinyin/UI
= Segoe UI / system stack. Thai = Noto Sans Thai. Tokens `--font-hanzi/-pinyin/-thai`.
Add a rounded pinyin + clean Thai display font as production assets if the system stack
fails the readability gate.

**UI style:** rounded panels, **gold trim**, subtle background patterns, **clear hierarchy,
high contrast**. All `ui-frame` 9-slices share one corner-radius family and trim thickness.

**Icon style:** **bold silhouette, gold strokes, consistent stroke thickness** across the
whole `ui-icons.svg` sprite. Every glyph legible as a solid shape at nav size.

---

## 4. Integration & loading

- **`src/assets.js`** exports `REGISTRY`, `preload()`, `frameCSS(id)`, `img(id)`.
- **UI frames:** swap current `background`/`gradient` declarations for `border-image:` on
  the *same* class-based elements (e.g. `.big.primary` → `border-image: var(--f-btn-primary)`),
  driven by a CSS custom property that `assets.js` sets. Text/children unchanged.
- **Button states:** `:active` / `[disabled]` swap to the `pressed` / `disabled` slice of
  the same asset.
- **Canvas art** (characters/effects/sprite-sheets): loaded via `img(id)` in
  `sprites.js` / `cat.js` / `fx.js`; existing draw path unchanged.
- **Fallback (mandatory):** every `frameCSS` / `img` returns a CSS/canvas fallback when the
  asset is missing or still loading, so `file://` and cold loads never break.
- **Build:** after wiring, `npm run build` (esbuild → `dist/app.js`); bump the `SHELL`
  cache version in `sw.js`.

---

## 5. Asset tracker & quality gates

**Tracker:** `asset-manifest.json` is the single source. `scripts/asset-report.mjs` prints
the tracker table (id · file · status · priority · present?) mirroring the reference's
"Asset Tracker" panel. Status flow: `planned → concept → review → approved → integrated`.

**Quality gates — every asset must pass before `integrated`:**

1. **Visual consistency** — obeys §3.8 (light direction, palette, line weight).
2. **Technical correctness** — clean transparency, exact declared dimensions, crisp edges,
   correct 9-slice margins.
3. **Mobile readability** — legible at final on-screen size, high contrast.
4. **Performance** — optimized file size, no wasted pixels; the P0 set stays within a
   stated total-KB budget.

---

## 6. Milestones / rollout

1. **M0 — Contract & registry:** `assets.js`, `frameCSS` / `img`, manifest schema fields,
   fallbacks, `asset-report.mjs`. No art yet — game still runs entirely on fallbacks.
2. **M1 — VS v1 P0 art:** all P0 assets (§3.1–3.4, §3.6, §3.8 reference tiles) authored,
   gated, integrated. The "first complete look."
3. **M2 — Other screens (§3.5).**
4. **M3 — Expansion (§3.7):** skins, boss, backgrounds, street decor, VFX, shop previews,
   marketing.

Each milestone: integrate → `npm test` + `npm run build` → SHELL bump → verify on
`localhost:8000` (rule out stale SW / stale Pages) → branch / PR.

---

## 7. Testing & acceptance

- **Unit (vitest):** `assets.js` registry integrity — every `required_icons` glyph exists
  in the sprite; every manifest `id` unique; `frameCSS` / `img` return a fallback for
  unknown / missing ids.
- **Manual / visual:** each screen matches the reference mockup; toggling assets off
  confirms fallbacks render.
- **Done =** zero `linear-gradient` / `box-shadow`-drawn chrome in the shipped look of
  migrated screens; every §3 item present and `integrated`; all gates pass.

**Deliverable of this PRD:** the spec doc + an updated `asset-manifest.json` reflecting the
full §3 inventory and the new contract fields.
