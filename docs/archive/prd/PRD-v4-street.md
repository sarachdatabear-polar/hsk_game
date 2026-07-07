# PRD — Lucky Cat HSK v4 "Lucky Cat Street"

*Builds on shipped v3 ("Lucky Cat Grows"). Scope signed off 2026-07-04: Street + all three new shop item types, hybrid street economy.*

---

## 1. Problem statement

v3 gave the player XP levels, quests, and juice, but two loose ends remain (deferred from v3):

1. **Coins outpace the shop.** The catalog is 7 items (4 skins, 3 backdrops) totaling ~15,500 🪙; an active player exhausts it in days. Wallets accumulate with nothing to want.
2. **Progress is a number, not a place.** Level milestones grant cat accessories only visible mid-battle. There is no persistent, at-a-glance *world* that reflects how far you've come — the "lucky cat brings wealth" fantasy stops at the cat.

## 2. Pillars

- **P1 — A street that grows with you**: the home screen shows Lucky Cat Street; landmark buildings appear free at existing level milestones (learning = a growing town), purchased decorations fill it in (hybrid economy, as decided).
- **P2 — More to buy**: three new shop item types — battle **effect packs**, **sound packs**, and **street decorations** — extending the existing catalog/equip model.

## 3. Non-goals

- No new art assets — street, effects, and decorations are canvas-drawn; sounds are WebAudio synth recipes (no audio files).
- No new localStorage keys — street state derives from `nbhsk.xp` (level) + `nbhsk.shop` (owned decos). Shop object gains fields additively.
- No backend, no framework/build change, no new npm deps, no data-pipeline change.
- No interactive street (tap-to-inspect buildings etc.) — v4 street is a living picture. Achievement *scenes* stay deferred.

## 4. Features

### F1 — Effect packs (shop `type:"effect"`, one equip slot)

- New `CATALOG` entries: **Sakura Petals** (2,000 🪙), **Firecrackers** (3,500 🪙). Default gold burst remains free/implicit (empty slot).
- `defaultShop()` gains `effect: ""`. `equipItem` already routes by `item.type` — slot works unchanged.
- `fx.js`: `coinBurst(x, y, boss, style)` gains an optional style. Counts stay deterministic per style (unit-testable):
  - `"sakura"` → same counts, kinds become `petal` (drawn as pink rounded arcs, slower fall — lower gravity handled by a per-spec `g` field, default 500).
  - `"firecracker"` → +6 extra `spark` specs, kinds `cracker` (red) + `spark`, faster velocities.
- `main.js` `draw()` renders new kinds (`petal`, `cracker`); `killZombie` passes `shopState.effect`.

### F2 — Sound packs (shop `type:"soundpack"`, one equip slot)

- New `CATALOG` entries: **Temple Bells** (2,500 🪙), **Arcade** (4,000 🪙). Default square-wave set stays free.
- `sfx.js`: export a `PACKS` table — per pack, tone recipes (freq/dur/wave/vol sequences) for `kill`, `wrong`, `bite`, `combo`. `sfx.pack = "default"|"bells"|"arcade"`; the four methods look up the active recipe. `main.js` sets `sfx.pack` from `shopState.soundpack` on boot and on equip.
  - Bells: triangle/sine, longer decays, lower volumes. Arcade: square, short, chippy, higher pitches.
- Unit tests assert `PACKS` shape (all packs × all four events present, sane freq/dur ranges) — the audible part stays untested like today's tones.

### F3 — Street decorations (shop `type:"deco"`, own-to-display, no slot)

- New `CATALOG` entries (~5, escalating): **Red Lantern** 800, **Noodle Stall** 1,500, **Tea Sign** 2,200, **Foo Dog** 3,000, **Golden Arch** 5,000 🪙.
- Decos are owned, never equipped — every owned deco appears on the street. Shop rows show Buy → "On street ✓".
- Shop screen gains three sections: Effects, Sounds, Street (existing render loop already branches per type; extend it).

### F4 — Lucky Cat Street (home screen)

- **Pure module `src/street.js`**:
  - `BUILDINGS`: landmark per existing growth milestone — Lv 5 Lantern Post, Lv 10 Coin Bank, Lv 20 Tailor Shop, Lv 30 Kitten Café, Lv 50 Emperor's Gate (mirrors `growth.js` MILESTONES levels; ids/names independent).
  - `streetPieces(level, owned)` → deterministic ordered draw list `[{id, kind:"building"|"deco", slot}]`: buildings in fixed slots by milestone order, owned decos interleaved in fixed deco slots. Max ~10 pieces; layout math pure and unit-tested.
  - `streetProgress(level)` → `{unlocked, total, next}` for the caption.
- **Home screen**: a `<canvas id="street-cv">` strip (~92 px tall, full card width) between the pills row and the quest panel. `main.js` draws it: night-sky gradient, ground line, then each piece as simple shapes in the game's dark-red/gold palette (reuse `roundRect`-style helpers; no assets). Mascot cat sits at the left end always.
  - Lv 1, nothing owned → empty lot + caption "Lucky Cat Street — grows as you learn". Caption line under the canvas shows next unlock: "Next: Lv 10 — Coin Bank".
  - Redraw on `show("home")`, level-up, and purchase. DPR-crisp like the battle canvas.
- Street derives 100% from `levelForXp(xp)` + `shopState.owned` — nothing new stored.

## 5. Constraints (inherited, binding)

1. Vanilla JS ES modules → esbuild `dist/app.js`; markup/CSS inline in `index.html`; no new npm deps.
2. file:// keeps working — no new fetch.
3. `nbhsk.*` keys additive only; v3 (and v1) saves load unchanged. `Object.assign(defaultShop(), stored)` covers the new shop fields.
4. Pure logic in tested modules; `main.js` only wires DOM/canvas.
5. Playable at 360×640 portrait; street strip must fit without pushing Play below the fold on 640-tall screens.
6. Cat rendering rules unchanged (PNG + `ctx.filter`; overlays after filter reset).
7. Ship commit bumps `SHELL` `nbhsk-shell-v6` → `-v7`.

## 6. Milestones (sequential — all touch `main.js`/`index.html`)

| # | Milestone | Touches | Tests |
|---|-----------|---------|-------|
| M1 | Effect packs end-to-end (catalog+slot, fx styles, draw kinds, shop section) | `shop.js`, `fx.js`, `main.js`, `index.html` | extend `shop.test.js`, `fx.test.js` |
| M2 | Sound packs end-to-end (catalog+slot, `PACKS`, shop section) | `shop.js`, `sfx.js`, `main.js` | extend `shop.test.js`, new `sfx.test.js` |
| M3 | Street: decos in catalog + `street.js` + home canvas strip + captions | `shop.js`, `street.js` (new), `main.js`, `index.html` | `street.test.js`, extend `shop.test.js` |
| M4 | Ship prep: regression, DOM-id check, SHELL v7, docs + USER-CHECKLIST | `sw.js`, docs | all green |

Each milestone lands independently: tests green, game playable, no dangling catalog entries (decos enter the catalog in M3 together with the street).

## 7. Success criteria

- [ ] All existing 135 tests pass; new tests cover fx styles, PACKS shape, street layout, and shop slots.
- [ ] Buy + equip Sakura Petals → kill bursts visibly change; empty slot keeps gold coins.
- [ ] Buy + equip Temple Bells → kill/wrong/bite/combo all change flavor; toggle back to default works.
- [ ] At Lv 5+ a building stands on the street with no purchase; buying a Red Lantern adds it immediately.
- [ ] Fresh profile: empty street + "grows as you learn" caption; v3 save upgrades losslessly.
- [ ] file:// open works; 360×640 home screen shows Play without scrolling past the street.
- [ ] `SHELL` bumped to v7 in the ship commit.
