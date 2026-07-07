# PRD — Lucky Cat HSK v7 "Shop Seasons"

*Builds on shipped v5 (visual overhaul + kind retention) and v6 (question formats, PR #23). Scope signed off 2026-07-07: new themed catalog + daily rotation + season exclusives + deco tiers.*

---

## 1. Problem statement

The shop was last extended in v4 and has been fully outrun again:

1. **Nothing left to want.** The catalog is 16 items totaling ~40,000 🪙. An active player earns coins from every round plus daily quests and exhausts the catalog within weeks; after that the wallet is a number that only goes up, and the coin reward loop stops meaning anything.
2. **The shop is static.** Every visit shows the same shelf. There is no reason to *check* the shop — only to spend down a balance, once.

## 2. Pillars

- **P1 — New things to want**: genuinely new themed items (new sprite sheets and scenes, *not* palette recolors) at prestige prices, sourced through the v5 art pipeline.
- **P2 — A shop that changes**: a 3-slot **Today's Stock** shelf that rotates daily, and a **Season Corner** whose exclusive sets are only buyable during their real-calendar window and return every year.
- **P3 — Re-spend on what you love**: street decorations gain **upgrade tiers** (★ → ★★ → ★★★), multiplying the sink on items players already display.

## 3. Non-goals

- **No pay-to-win, no purchasable learning advantage** — everything remains cosmetic (binding, per PRD-monetization §2).
- **Stickers stay earn-only** — nothing from the sticker album enters the catalog (binding, per PRD-v5 §Stickers).
- No gacha / randomized purchases — rotation is deterministic, every price is posted.
- No hard FOMO beyond the season window — seasonal items **return every year**; daily-stock items return every cycle. Nothing is ever gone forever.
- No new localStorage keys — `nbhsk.shop` gains a `tiers` field additively; v1–v6 saves load unchanged.
- No backend, no framework/build change, no new npm deps. Date/availability logic is pure and clock-free (caller passes the date).

## 4. Features

### F1 — New themed catalog (permanent)

New `CATALOG` entries, all real new art (see §5 for pipeline + fallback). Prestige band sits above the current 5,000 🪙 ceiling:

| Item | Type | Price 🪙 |
|---|---|---|
| Panda | skin | 8,000 |
| Ninja | skin | 12,000 |
| Astronaut | skin | 20,000 |
| Harbor Night | backdrop | 6,000 |
| Snow Festival | backdrop | 8,000 |
| Mahjong Table | deco | 4,000 |
| Koi Pond | deco | 6,000 |
| Drum Tower | deco | 9,000 |

≈ **+73,000 🪙** of permanent sink. Skins ship as full sheets (6-frame walk + 4-frame happy) registered in `sprites.js`/`assets.js` exactly like `cat-sakura`; each gets a `SKIN_PALETTES` entry so the vector fallback works before its PNG lands.

### F2 — Today's Stock (daily rotation, `pool:"daily"`)

- A 3-slot shelf at the top of the shop screen. Featured items are buyable **only while featured**. Unowned pool items exist *only* on the shelf; once owned they move into their normal type section (equip/display as usual). A line under the shelf says "New stock at midnight"; `nextFeaturedIn(id, date)` exists for logic/tests, not for per-item countdown rows.
- New pool items (~6 at launch, small/impulse band): **Bubble Tea Stand** 2,500 (deco), **Paper Umbrella** 1,800 (deco), **Goldfish Banner** 2,200 (deco), **Neon Cat Sign** 3,500 (deco), **Lion Dance Drum** 4,500 (soundpack), **Star Shower** 3,000 (effect).
- **Pure rotation, no RNG**: `dailyStock(dateStr)` → 3 item ids. `dayIndex = floor(localDaysSinceEpoch)`; slot *i* = `pool[(dayIndex * 3 + i) % pool.length]`. Every pool item is guaranteed back every `ceil(pool.length / 3)` days; the caption under an owned/absent item says "back in ~N days" via `nextFeaturedIn(id, date)`.
- Day boundary is **local midnight** (kind: matches the player's day, same convention as quests/streak).

### F3 — Season Corner (`season:` tag, yearly windows)

Season sets are the showcase art. Items are buyable only inside a fixed month/day window and **return every year**; owned items stay equippable/displayed year-round.

| Season | Window | Set |
|---|---|---|
| `summer` | Jul 1 – Aug 15 | **Beach Cat** skin 12,000 · **Island Sunset** backdrop 8,000 · **Shaved-Ice Cart** deco 4,500 |
| `midautumn` | Sep 1 – Oct 5 | **Mooncake Rabbit** skin 15,000 · **Lantern Festival** backdrop 9,000 · **Mooncake Stall** deco 5,000 |
| `cny` | Jan 20 – Feb 24 | **Dragon** skin 25,000 · **Dragon Gate** backdrop 10,000 · **Firecracker Arch** deco 6,000 |

- `SEASONS` table in `shop.js`: `{ id, label, from:[month,day], to:[month,day] }`; `cny` window approximates the lunar range with fixed Gregorian dates (good enough, no lunar calendar dep).
- Off-season, the corner collapses to a one-line teaser ("🏮 Dragon set returns Jan 20") via `seasonStatus(date)`.
- Launch note: v7 ships during the `summer` window, so the corner is live on day one.
- ≈ **+94,500 🪙** of recurring seasonal sink.

### F4 — Deco upgrade tiers (★ → ★★ → ★★★)

- Every deco (v4's five + all new ones) gains `maxTier: 3`. Owning a deco unlocks the **Upgrade** button in its shop row; `buy()` handles the re-buy.
- `upgradePrice(item, currentTier)`: tier 2 = `1.5 × base`, tier 3 = `2.5 × base` (a maxed deco costs ~5× its base — e.g. Red Lantern 800 → +1,200 → +2,000).
- Stored additively: `defaultShop()` gains `tiers: {}` (`{decoId: 2|3}`; absent = tier 1). `Object.assign(defaultShop(), stored)` covers old saves.
- `street.js`: `streetPieces(level, owned, tiers)` emits the tier; rendering uses the **tier art variant where the pipeline has produced one**, else a **procedural embellishment fallback** (tier 2: warm glow + 1.15× scale; tier 3: duplicate flanking copies / crown accent — pure canvas, deterministic).
- Shop row caption shows current tier stars; "Upgrade ★★ → ★★★ (2,000 🪙)".
- Up to ≈ **+230,000 🪙** of sink if every deco (permanent, pool, and seasonal) is maxed — tiers are the long-tail sink.

## 5. Art pipeline & fallback (blocking nothing)

- Every new item gets a generation prompt appended to `docs/art/GENERATION-PROMPTS-P0-copypaste.md` (same format as v5): skins as sheet prompts, backdrops as scene prompts, decos (+ tier variants where worth it) as object prompts.
- Assets arrive via the drop folder + `scripts/intake_art.py` + the v5 QA gate; filenames pre-agreed in the prompt doc so `sprites.js`/`assets.js` registry entries land with the code.
- **Code never blocks on art**: missing skin PNG → existing vector-cat fallback via `SKIN_PALETTES`; missing backdrop → existing `paintBackdrop` procedural scene; missing deco/tier sprite → canvas-drawn shape (v4 style). Art drops in later with zero code changes.

## 6. Module & API changes (all pure, all tested)

`src/shop.js`:
- `CATALOG` entries gain optional `pool`, `season`, `maxTier` fields.
- New: `SEASONS`, `dailyStock(date)`, `isAvailable(item, date)`, `nextFeaturedIn(id, date)`, `seasonStatus(date)`, `upgradePrice(item, tier)`.
- `buy(wallet, shop, id, date)` extended: rejects unavailable items; routes owned-deco re-buys into tier upgrades.
- `defaultShop()` gains `tiers: {}`.

`src/street.js`: `streetPieces(level, owned, tiers)`; tier-aware draw list.

`src/main.js` / `index.html`: shop screen gains **Today's Stock** and **Season Corner** sections above the existing groups; countdown captions; passes `new Date()` into the pure functions; i18n keys for all new strings (EN + TH).

## 7. Constraints (inherited, binding)

1. Vanilla JS ES modules → esbuild `dist/app.js`; **dist/app.js rebuilt and committed with src changes**; markup/CSS inline in `index.html`; no new npm deps.
2. file:// keeps working — no new fetch paths.
3. `nbhsk.*` keys additive only; all earlier saves load unchanged.
4. Pure logic in tested modules; `main.js` only wires DOM/canvas and supplies the clock.
5. Playable at 360×640 portrait; new shop sections scroll, never push content off-canvas.
6. Cosmetic-only / stickers-earn-only rules from §3 are hard gates for review.
7. Ship commit bumps `SHELL` cache version in `sw.js`.

## 8. Milestones (sequential)

| # | Milestone | Touches | Tests |
|---|-----------|---------|-------|
| M1 | `shop.js` core: catalog fields, `SEASONS`, availability, `dailyStock`, tiers, extended `buy` | `shop.js` | extend `shop.test.js` (rotation determinism + full-cycle coverage, window edges incl. year wrap, tier pricing, old-save load) |
| M2 | Shop UI: Today's Stock + Season Corner sections, countdown captions, upgrade rows, i18n | `main.js`, `index.html`, `i18n.js` | DOM-id smoke; snapshot of section grouping |
| M3 | Street tiers: `streetPieces(level, owned, tiers)` + procedural tier fallbacks | `street.js`, `main.js` | extend `street.test.js` |
| M4 | Art: prompts appended, registry entries + `SKIN_PALETTES` for new skins, intake dry-run | `docs/art/…`, `sprites.js`, `assets.js`, `shop.js` | registry-shape test |
| M5 | Ship prep: regression, dist rebuild, `SHELL` bump, docs | `sw.js`, `dist/`, docs | all green |

Each milestone lands independently: tests green, game playable, no dangling catalog entries.

## 9. Success criteria

- [ ] All existing tests pass; new tests cover rotation, season windows, tiers, and save compatibility.
- [ ] `dailyStock` returns the same 3 items all day, changes at local midnight, and cycles the full pool in `ceil(pool/3)` days.
- [ ] On 2026-07-07 the Season Corner shows the summer set as buyable; on 2026-08-16 it shows only the mid-autumn teaser; a Dragon skin bought in February equips in July.
- [ ] Buying an owned Red Lantern upgrades it: street shows the ★★ variant (or glow fallback) immediately; maxed decos show "★★★" with no buy button.
- [ ] A v6 save loads losslessly; `tiers` defaults to `{}`.
- [ ] New skins render via vector fallback before art intake, and via sheets after `intake_art.py` — with no code change in between.
- [ ] Fresh profile at 360×640: shop screen scrolls cleanly with both new sections visible.
- [ ] `SHELL` bumped and `dist/app.js` rebuilt in the ship commit.
