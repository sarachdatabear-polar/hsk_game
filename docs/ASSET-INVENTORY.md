# Production Art Asset Inventory

## Status Terms

- `planned`: Required by the PRD but not yet supplied or accepted.
- `concept`: Draft exists outside runtime.
- `review`: Candidate runtime file exists and is awaiting art review.
- `approved`: Candidate passed art review but is not wired everywhere.
- `integrated`: Approved asset is loaded by runtime code, staged into `www/`, and covered by validation.
- `rejected`: Candidate exists but must not ship.

## Current Runtime References

The table below lists the live callers and precache sources found by repo scan.
Generated assets are called out explicitly so shipped art dependencies are visible
to reviewers, not implied by a generic asset glob.

| Area | File | Current references | Migration action |
|---|---|---:|---|
| Sprite preload | `src/sprites.js` | `cat-walk.png`, `cat-happy.png`, `cat-midnight-*`, `cat-sakura-*`, `cat-jade-*`, `cat-gold-*`, `cat-boss-*`, `bg-*.png`, `maneki.png`, `coin.png` | Replace hardcoded list with exported registry that covers manifest-backed PNGs. |
| Cat render | `src/cat.js` | `cat-walk.png`, `cat-happy.png`, seasonal cat sheets, boss sheets, fallback vector cat | Keep fallback vector cat; integrate approved base cat sheets first. |
| Battle canvas | `src/main.js` | `bg-${shopState.backdrop}`, `bg-battle.png`, `bg-market.png`, `bg-temple.png`, `bg-bamboo.png`, `maneki.png`, `coin.png`, canvas effects | Add default `bg-battle`, optional `bg-market`, and effect sprite fallbacks. |
| Shop preview | `src/main.js` | Seasonal cat sheets, backdrop images, canvas preview art | Use same registry and preserve canvas fallback previews. |
| Home CSS | `index.html` | `bg-home.png`, `lantern.png`, `cloud.png`, generated `btn-*.png`, `btn-shop.svg`, `coin.png`, `maneki.png`, `ui-icons.svg` | Move toward tokenized CSS and shared SVG icon mechanism. |
| PWA shell | `sw.js` | Current static art list, including `lantern.png`, `cloud.png`, generated button art, seasonal cat sheets, `bg-temple.png`, `bg-bamboo.png`, and `fonts/title.woff2` | Keep tolerant precache and add manifest-backed shell assets after approval. |
| Shop asset generation | `scripts/generate-shop-assets.mjs` | Generates the premium `btn-*.png` and related shop button art in `assets/` | Keep generation source tracked so shipped UI art can be reproduced and reviewed. |
| Staging | `scripts/stage-www.js` | Copies full `assets/` folder | No change unless validation becomes part of staging. |

## P0 Runtime Art Required

| File | Required dimensions | Current status | Notes |
|---|---:|---|---|
| `cat-walk.png` | 1536 x 256, 6 frames | review | Must be transparent and baseline-stable. |
| `cat-happy.png` | 1024 x 256, 4 frames | review | Must read as happy when sampled as stills. |
| `maneki.png` | 512 x 512 minimum | review | Home/street mascot. |
| `cat-portrait.png` | 512 x 512 | planned | Needed for home/profile/shop portrait polish. |
| `bg-home.png` | 1080 x 1920 | review | No baked UI or text. |
| `bg-battle.png` | 1024 x 512 | review | Quiet center for Hanzi. |
| `bg-market.png` | 1024 x 512 | review | Night Market premium scene. |
| `ui-panel.png` | 9-slice friendly | planned | Main panel treatment. |
| `ui-word-plaque.png` | 9-slice friendly | planned | Battle vocabulary plaque treatment. |
| `ui-button-primary.png` | scalable frame | planned | Red/gold button frame. |
| `ui-button-secondary.png` | scalable frame | planned | Jade/dark button frame. |
| `ui-button-neutral.png` | scalable frame | planned | Neutral button frame. |
| `fx-correct.png` | effect atlas | planned | Correct feedback, non-color-only. |
| `fx-wrong.png` | effect atlas | planned | Wrong feedback, non-color-only. |
| `fx-critical.png` | effect atlas | planned | Critical feedback. |
| `ui-icons.svg` | SVG symbol sprite | review | Must include every icon in `required_icons`. |

## Approval Gate

Only change a manifest status to `approved` after checking:

- Cat proportions and lighting match the reference.
- Transparent edges have no white halo.
- Sprite baselines and centers do not drift.
- Background centers stay low contrast behind vocabulary.
- No incorrect Chinese characters appear in backgrounds.
- No dynamic text is baked into art.
- Asset is readable at 360 x 640, 390 x 844, and 412 x 915.

## Task 9 Blocker: Approved Art Batch Absent

Validation date: 2026-07-05.

No approved production-art batch has been supplied in this worktree yet. Existing
runtime files such as `cat-walk.png`, `cat-happy.png`, `bg-home.png`,
`bg-battle.png`, `bg-market.png`, `maneki.png`, and `ui-icons.svg` remain
candidate or generated runtime assets, not approved final production art.

The following P0 files from `assets/asset-manifest.json` are still missing from
`assets/`, so the approved-art integration task is blocked:

- `cat-portrait.png`
- `ui-panel.png`
- `ui-word-plaque.png`
- `ui-button-primary.png`
- `ui-button-secondary.png`
- `ui-button-neutral.png`
- `fx-correct.png`
- `fx-wrong.png`
- `fx-critical.png`

The following P1 files are also absent and remain later-slice art gaps:

- `bg-results.png`
- `ui-badge.png`
- `ui-progress-track.png`
- `ui-progress-fill.png`
- `fx-level-up.png`
- `fx-new-best.png`

Because the approval files are absent, `assets/asset-manifest.json` intentionally
keeps all production-art statuses at `planned`. This preserves the PRD boundary:
do not mark generated placeholders as `approved` or `integrated`.

Task 9 should resume only after approved runtime files are supplied in `assets/`
with the exact manifest filenames.
