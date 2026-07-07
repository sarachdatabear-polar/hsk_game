# v7 "Shop Seasons" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PRD v7 (docs/prd/PRD-v7-shop-seasons.md): a new themed catalog band, a 3-slot daily-rotating "Today's Stock" shelf, a real-calendar Season Corner, and deco upgrade tiers (★→★★→★★★).

**Architecture:** All rotation/availability/tier logic is pure and clock-free in `src/shop.js` (caller passes a `"YYYY-MM-DD"` local date string, same convention as `daily.js`/`quests.js`). `src/street.js` gains a `tiers` parameter. `main.js`/`index.html` only wire DOM + supply `todayStr()`. New skins/backdrops register sprite names + vector palettes now; PNG art arrives later through the v5 intake pipeline with zero code changes (missing file → existing fallbacks).

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest. No new npm deps.

**Branch:** `feat/v7-shop-seasons` off `development`. Work in the main tree (`C:\Users\sarac\Desktop\HSK\game`).

## Global Constraints (from PRD §7 — binding)

- No new npm dependencies; no framework; markup/CSS inline in `index.html`.
- `file://` must keep working — no new `fetch()` paths.
- `localStorage` keys additive only: `nbhsk.shop` gains a `tiers` field; v1–v6 saves load unchanged via the existing `Object.assign(defaultShop(), stored)` in `main.js:70`.
- Pure logic in tested modules; `main.js` only wires DOM/canvas and supplies the clock (`todayStr()` at `main.js:106`).
- Cosmetic-only, stickers stay earn-only, no gacha, no hard FOMO (seasons return yearly; pool items return every cycle).
- Ship commit: rebuild + commit `dist/app.js`, bump `SHELL` in `sw.js` (currently `nbhsk-shell-v29` → `v30`).
- Every commit ends with the `Co-Authored-By` trailer per harness convention.
- **Never run `git stash`** and never commit files you did not change (guard from prior incidents).
- All commands run inside `C:\Users\sarac\Desktop\HSK\game`. Run tests with `npx vitest run <file>` (or `npm test` for the full suite).

## Existing code you build on (verified 2026-07-07)

- `src/shop.js` — `CATALOG` (16 items), `SKIN_PALETTES` (4 skins), `defaultShop()`, `canAfford(wallet,id)`, `buy(wallet,shop,id)`, `equipItem(shop,id,type)`. All pure.
- `src/daily.js` — exports `addDays(dateStr, n)` (UTC-safe on `"YYYY-MM-DD"`). Reuse it; do not re-implement.
- `src/street.js` — `BUILDINGS`, `DECO_IDS` (5), `streetPieces(level, owned)`, `streetProgress(level)`. `BUILDING_SLOTS`/`DECO_SLOTS` are module-private.
- `src/fx.js` — `coinBurst(x, y, boss, style)`: branches on `style === "sakura-fx" | "firecracker-fx"`, unknown style falls through to the default gold burst. `count = boss?28:12`, `coins = boss?12:5`, `vyMax = boss?260:200`.
- `src/sfx.js` — `PACKS` table (`default`, `bells`, `arcade`); unknown pack id falls back to `PACKS.default` at every call site.
- `src/sprites.js` — `SPRITE_NAMES` array; `loadSprites()` fire-and-forget; `sprite(name)` returns null until loaded → every draw site has a vector fallback. Missing PNGs are safe (verified: `test/sw-precache.test.js` only requires precache entries for files that exist on disk).
- `src/main.js` — `renderShop()` at ~1694, `renderShopPreview()` at ~1773 (branches per item type; soundpack branch keys on `item.id==="bells"` else arcade; effect branch keys on `item.id==="sakura-fx"` else firecracker), `renderStreet()` at ~1822 (calls `streetPieces(level, shopState.owned)`), `drawStreetDeco(c, id, x, gy, h)` at ~2012 (switch per deco id, no default case), particle draw kinds at ~1239 (`coin`/`spark`/`petal`/`cracker`/else-dot), `paintBackdrop(c,w,h,gy,style,t)` at ~1091 (has a final `else` generic gradient → new backdrop ids fall back automatically), `shopState = Object.assign(defaultShop(), store.get("shop", {}))` at line 70.
- `src/i18n.js` — exports `STRINGS`, `t(key, params)`, `getLocale()`, `setLocale()`, `detectLocale()`. `test/i18n.test.js` has a placeholder-parity test across EN/TH — new keys must use identical `{param}` names in both locales.
- `index.html` — shop screen `#s-shop` at ~848: `#shop-wallet` readout then five `.sect` + `.scorelist` pairs (`#shop-skins`, `#shop-backdrops`, `#shop-effects`, `#shop-sounds`, `#shop-street`).

---

### Task 1: Catalog expansion (data + shape tests)

**Files:**
- Modify: `src/shop.js` (CATALOG only)
- Test: `test/shop.test.js`

**Interfaces:**
- Produces: `CATALOG` entries with optional fields `pool: "daily"`, `season: "summer"|"midautumn"|"cny"`, `maxTier: 3`. Item ids used by every later task: permanent `panda, ninja, astronaut, harbor-night, snow-festival, mahjong-table, koi-pond, drum-tower`; pool `bubble-tea, paper-umbrella, goldfish-banner, neon-cat-sign, lion-drum, star-shower`; seasonal `beach, island-sunset, shaved-ice-cart, mooncake-rabbit, lantern-festival, mooncake-stall, dragon, dragon-gate, firecracker-arch`.

- [ ] **Step 1: Write the failing tests** — append to `test/shop.test.js` inside `describe("shop", ...)`:

```js
  it("v7 catalog: permanent prestige items with expected ids/prices", () => {
    const pick = id => CATALOG.find(i => i.id === id);
    expect(pick("panda")).toMatchObject({ type: "skin", price: 8000 });
    expect(pick("ninja")).toMatchObject({ type: "skin", price: 12000 });
    expect(pick("astronaut")).toMatchObject({ type: "skin", price: 20000 });
    expect(pick("harbor-night")).toMatchObject({ type: "backdrop", price: 6000 });
    expect(pick("snow-festival")).toMatchObject({ type: "backdrop", price: 8000 });
    expect(pick("mahjong-table")).toMatchObject({ type: "deco", price: 4000 });
    expect(pick("koi-pond")).toMatchObject({ type: "deco", price: 6000 });
    expect(pick("drum-tower")).toMatchObject({ type: "deco", price: 9000 });
    // permanent items carry neither pool nor season
    for (const id of ["panda", "harbor-night", "drum-tower"]) {
      expect(pick(id).pool).toBeUndefined();
      expect(pick(id).season).toBeUndefined();
    }
  });

  it("v7 catalog: daily pool is exactly the six launch items", () => {
    const pool = CATALOG.filter(i => i.pool === "daily");
    expect(pool.map(i => i.id)).toEqual([
      "bubble-tea", "paper-umbrella", "goldfish-banner",
      "neon-cat-sign", "lion-drum", "star-shower",
    ]);
    expect(pool.map(i => i.price)).toEqual([2500, 1800, 2200, 3500, 4500, 3000]);
    expect(pool.find(i => i.id === "lion-drum").type).toBe("soundpack");
    expect(pool.find(i => i.id === "star-shower").type).toBe("effect");
  });

  it("v7 catalog: three season sets, three items each", () => {
    const byId = id => CATALOG.find(i => i.id === id);
    expect(CATALOG.filter(i => i.season === "summer").map(i => i.id))
      .toEqual(["beach", "island-sunset", "shaved-ice-cart"]);
    expect(CATALOG.filter(i => i.season === "midautumn").map(i => i.id))
      .toEqual(["mooncake-rabbit", "lantern-festival", "mooncake-stall"]);
    expect(CATALOG.filter(i => i.season === "cny").map(i => i.id))
      .toEqual(["dragon", "dragon-gate", "firecracker-arch"]);
    expect(byId("dragon").price).toBe(25000);
    expect(byId("beach").price).toBe(12000);
    expect(byId("mooncake-rabbit").price).toBe(15000);
  });

  it("v7 catalog: every deco (old and new) has maxTier 3; nothing else does", () => {
    for (const i of CATALOG) {
      if (i.type === "deco") expect(i.maxTier, i.id).toBe(3);
      else expect(i.maxTier, i.id).toBeUndefined();
    }
  });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run test/shop.test.js` → the four new tests FAIL (ids missing / maxTier undefined).

- [ ] **Step 3: Implement** — in `src/shop.js`, add `maxTier: 3` to the five existing deco rows, then append after the existing `golden-arch` row (keep the two-space alignment style of the file):

```js
  // ---- v7 permanent prestige band (PRD v7 F1) ----
  { id: "panda",     name: "Panda",     price: 8000,  type: "skin" },
  { id: "ninja",     name: "Ninja",     price: 12000, type: "skin" },
  { id: "astronaut", name: "Astronaut", price: 20000, type: "skin" },
  { id: "harbor-night",  name: "Harbor Night",  price: 6000, type: "backdrop" },
  { id: "snow-festival", name: "Snow Festival", price: 8000, type: "backdrop" },
  { id: "mahjong-table", name: "Mahjong Table", price: 4000, type: "deco", maxTier: 3 },
  { id: "koi-pond",      name: "Koi Pond",      price: 6000, type: "deco", maxTier: 3 },
  { id: "drum-tower",    name: "Drum Tower",    price: 9000, type: "deco", maxTier: 3 },
  // ---- v7 Today's Stock daily pool (F2) — buyable only while featured ----
  { id: "bubble-tea",      name: "Bubble Tea Stand", price: 2500, type: "deco", pool: "daily", maxTier: 3 },
  { id: "paper-umbrella",  name: "Paper Umbrella",   price: 1800, type: "deco", pool: "daily", maxTier: 3 },
  { id: "goldfish-banner", name: "Goldfish Banner",  price: 2200, type: "deco", pool: "daily", maxTier: 3 },
  { id: "neon-cat-sign",   name: "Neon Cat Sign",    price: 3500, type: "deco", pool: "daily", maxTier: 3 },
  { id: "lion-drum",       name: "Lion Dance Drum",  price: 4500, type: "soundpack", pool: "daily" },
  { id: "star-shower",     name: "Star Shower",      price: 3000, type: "effect",    pool: "daily" },
  // ---- v7 Season Corner (F3) — buyable only inside the season window ----
  { id: "beach",            name: "Beach Cat",        price: 12000, type: "skin",     season: "summer" },
  { id: "island-sunset",    name: "Island Sunset",    price: 8000,  type: "backdrop", season: "summer" },
  { id: "shaved-ice-cart",  name: "Shaved-Ice Cart",  price: 4500,  type: "deco",     season: "summer", maxTier: 3 },
  { id: "mooncake-rabbit",  name: "Mooncake Rabbit",  price: 15000, type: "skin",     season: "midautumn" },
  { id: "lantern-festival", name: "Lantern Festival", price: 9000,  type: "backdrop", season: "midautumn" },
  { id: "mooncake-stall",   name: "Mooncake Stall",   price: 5000,  type: "deco",     season: "midautumn", maxTier: 3 },
  { id: "dragon",           name: "Dragon",           price: 25000, type: "skin",     season: "cny" },
  { id: "dragon-gate",      name: "Dragon Gate",      price: 10000, type: "backdrop", season: "cny" },
  { id: "firecracker-arch", name: "Firecracker Arch", price: 6000,  type: "deco",     season: "cny", maxTier: 3 },
```

**Heads-up:** the pre-existing test `"CATALOG has 4 skins, 3 backdrops, 2 effects, and 2 soundpacks..."` and `"CATALOG has 5 street decorations..."` now fail. Update them in place to the new totals — skins 10 (`["midnight","sakura","jade","gold","panda","ninja","astronaut","beach","mooncake-rabbit","dragon"]`), backdrops 8, effects 3, soundpacks 3, decos 15 — keeping their id/price assertions extended rather than deleted.

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/shop.test.js` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shop.js test/shop.test.js
git commit -m "feat(shop): v7 catalog — prestige band, daily-pool and season items, deco maxTier"
```

---

### Task 2: Availability engine (rotation + season windows)

**Files:**
- Modify: `src/shop.js`
- Test: `test/shop.test.js`

**Interfaces:**
- Consumes: Task 1 catalog fields; `addDays` from `src/daily.js`.
- Produces (exact signatures, used by Tasks 3 and 7):
  - `SEASONS: [{ id, label, from:[month,day], to:[month,day] }]`
  - `dailyStock(dateStr) -> [id, id, id]`
  - `nextFeaturedIn(id, dateStr) -> number|null` (0 = featured today; null = not a pool item)
  - `isAvailable(item, dateStr) -> boolean` (permanent items: true even with `dateStr === undefined`; gated items with no date: false)
  - `seasonStatus(dateStr) -> { active: seasonObj|null, next: seasonObj, nextInDays: number }` (`next` = nearest upcoming other season, wrapping the year)

- [ ] **Step 1: Write the failing tests** — append a new `describe("shop v7 availability", ...)` block to `test/shop.test.js` (import the new names at the top: `SEASONS, dailyStock, nextFeaturedIn, isAvailable, seasonStatus`):

```js
describe("shop v7 availability", () => {
  const byId = id => CATALOG.find(i => i.id === id);

  it("SEASONS windows match the PRD", () => {
    expect(SEASONS.map(s => s.id)).toEqual(["summer", "midautumn", "cny"]);
    expect(SEASONS[0]).toMatchObject({ from: [7, 1], to: [8, 15] });
    expect(SEASONS[1]).toMatchObject({ from: [9, 1], to: [10, 5] });
    expect(SEASONS[2]).toMatchObject({ from: [1, 20], to: [2, 24] });
  });

  it("dailyStock: 3 unique pool ids, stable for the same date", () => {
    const a = dailyStock("2026-07-07");
    expect(a.length).toBe(3);
    expect(new Set(a).size).toBe(3);
    for (const id of a) expect(byId(id).pool).toBe("daily");
    expect(dailyStock("2026-07-07")).toEqual(a);
  });

  it("dailyStock: full pool cycles in ceil(6/3)=2 days and then repeats", () => {
    const day0 = dailyStock("2026-07-07");
    const day1 = dailyStock("2026-07-08");
    const union = new Set([...day0, ...day1]);
    expect(union.size).toBe(6);                      // full-cycle coverage
    expect(dailyStock("2026-07-09")).toEqual(day0);  // period 2
  });

  it("nextFeaturedIn: 0 when featured today, 1 when featured tomorrow, null for non-pool", () => {
    const today = "2026-07-07";
    const featured = dailyStock(today);
    const absent = CATALOG.filter(i => i.pool === "daily" && !featured.includes(i.id));
    expect(nextFeaturedIn(featured[0], today)).toBe(0);
    expect(nextFeaturedIn(absent[0].id, today)).toBe(1);
    expect(nextFeaturedIn("red-lantern", today)).toBe(null);
  });

  it("isAvailable: permanent items always, even with no date", () => {
    expect(isAvailable(byId("panda"), undefined)).toBe(true);
    expect(isAvailable(byId("red-lantern"), "2026-07-07")).toBe(true);
  });

  it("isAvailable: pool items only while featured, never without a date", () => {
    const today = "2026-07-07";
    const featured = dailyStock(today);
    const absent = CATALOG.filter(i => i.pool === "daily" && !featured.includes(i.id));
    expect(isAvailable(byId(featured[0]), today)).toBe(true);
    expect(isAvailable(absent[0], today)).toBe(false);
    expect(isAvailable(byId(featured[0]), undefined)).toBe(false);
  });

  it("isAvailable: season window edges (PRD success criteria)", () => {
    const beach = byId("beach"), dragon = byId("dragon");
    expect(isAvailable(beach, "2026-07-01")).toBe(true);   // first day
    expect(isAvailable(beach, "2026-08-15")).toBe(true);   // last day
    expect(isAvailable(beach, "2026-06-30")).toBe(false);
    expect(isAvailable(beach, "2026-08-16")).toBe(false);
    expect(isAvailable(dragon, "2026-01-20")).toBe(true);
    expect(isAvailable(dragon, "2026-02-24")).toBe(true);
    expect(isAvailable(dragon, "2026-02-25")).toBe(false);
    expect(isAvailable(dragon, undefined)).toBe(false);
  });

  it("seasonStatus: active summer on launch day; teaser after it ends; year wrap to cny", () => {
    expect(seasonStatus("2026-07-07").active.id).toBe("summer");
    const after = seasonStatus("2026-08-16");
    expect(after.active).toBe(null);
    expect(after.next.id).toBe("midautumn");
    expect(after.nextInDays).toBe(16);                     // Aug 16 -> Sep 1
    expect(seasonStatus("2026-11-01").next.id).toBe("cny"); // wraps into January
  });

  it("a season item bought in-window equips out-of-window (no date gating on equip)", () => {
    const shop = { ...defaultShop(), owned: ["dragon"] };
    expect(equipItem(shop, "dragon").skin).toBe("dragon");
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run test/shop.test.js` → new block FAILS ("dailyStock is not a function" etc.).

- [ ] **Step 3: Implement** — in `src/shop.js`, add at the top `import { addDays } from "./daily.js";` and after `SKIN_PALETTES`:

```js
// ---- v7 availability (PRD v7 F2/F3). All date params are local "YYYY-MM-DD"
// strings (same convention as daily.js/quests.js); parsing uses the UTC trick
// so device timezone never shifts the day.
export const SEASONS = [
  { id: "summer",    label: "Summer",         from: [7, 1],  to: [8, 15] },
  { id: "midautumn", label: "Mid-Autumn",     from: [9, 1],  to: [10, 5] },
  { id: "cny",       label: "Lunar New Year", from: [1, 20], to: [2, 24] },
];

const dayIndex = dateStr => Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000);

// Pure rotation, no RNG: slot i on day d = pool[(d*3 + i) % pool.length].
export function dailyStock(dateStr) {
  const pool = CATALOG.filter(i => i.pool === "daily");
  const d = dayIndex(dateStr);
  return [0, 1, 2].map(i => pool[(((d * 3 + i) % pool.length) + pool.length) % pool.length].id);
}

// Days until `id` is next featured (0 = today). null for non-pool ids.
export function nextFeaturedIn(id, dateStr) {
  const item = CATALOG.find(i => i.id === id);
  if (!item || item.pool !== "daily") return null;
  const cycle = Math.ceil(CATALOG.filter(i => i.pool === "daily").length / 3);
  for (let n = 0; n <= cycle; n++) {
    if (dailyStock(addDays(dateStr, n)).includes(id)) return n;
  }
  return null; // unreachable while the pool is non-empty
}

// [month,day] window containment; supports windows that wrap the new year.
function inWindow(dateStr, from, to) {
  const [, m, d] = dateStr.split("-").map(Number);
  const md = m * 100 + d, lo = from[0] * 100 + from[1], hi = to[0] * 100 + to[1];
  return lo <= hi ? md >= lo && md <= hi : md >= lo || md <= hi;
}

export function isAvailable(item, dateStr) {
  if (!item) return false;
  if (item.pool === "daily") return !!dateStr && dailyStock(dateStr).includes(item.id);
  if (item.season) {
    if (!dateStr) return false;
    const s = SEASONS.find(s => s.id === item.season);
    return !!s && inWindow(dateStr, s.from, s.to);
  }
  return true;
}

// Days from dateStr to the next occurrence of [month,day] (always >= 1).
function daysUntil(dateStr, [m, d]) {
  const y = Number(dateStr.slice(0, 4));
  const today = dayIndex(dateStr);
  for (const year of [y, y + 1]) {
    const target = Math.floor(Date.UTC(year, m - 1, d) / 86400000);
    if (target > today) return target - today;
  }
  return 366; // unreachable
}

export function seasonStatus(dateStr) {
  const active = SEASONS.find(s => inWindow(dateStr, s.from, s.to)) || null;
  let next = null, best = Infinity;
  for (const s of SEASONS) {
    if (s === active) continue;
    const n = daysUntil(dateStr, s.from);
    if (n < best) { best = n; next = s; }
  }
  return { active, next, nextInDays: best };
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/shop.test.js` → all PASS. If the `nextInDays` Aug 16→Sep 1 assertion disagrees by one, the bug is in `daysUntil` (it must count exact UTC-day difference; Aug 16 + 16 = Sep 1).

- [ ] **Step 5: Commit**

```bash
git add src/shop.js test/shop.test.js
git commit -m "feat(shop): v7 availability — dailyStock rotation, season windows, seasonStatus"
```

---

### Task 3: Tiers + extended buy()

**Files:**
- Modify: `src/shop.js`
- Test: `test/shop.test.js`

**Interfaces:**
- Consumes: `isAvailable` from Task 2.
- Produces (used by Task 7 UI):
  - `defaultShop() -> { owned:[], skin:"", backdrop:"", effect:"", soundpack:"", tiers:{} }`
  - `upgradePrice(item, currentTier) -> number|null` (tier1→2 = round(1.5×price), tier2→3 = round(2.5×price); null when not tierable or maxed)
  - `buy(wallet, shop, id, dateStr)` — 4th param optional; owned tierable deco → tier upgrade (allowed regardless of date, PRD F4); unowned gated item → requires `isAvailable(item, dateStr)`.

- [ ] **Step 1: Write the failing tests** — append a `describe("shop v7 tiers", ...)` block (add `upgradePrice` to the import):

```js
describe("shop v7 tiers", () => {
  const lantern = CATALOG.find(i => i.id === "red-lantern"); // 800, deco, maxTier 3

  it("defaultShop includes an empty tiers map", () => {
    expect(defaultShop().tiers).toEqual({});
  });

  it("upgradePrice: 1.5x then 2.5x base; null when maxed or not tierable", () => {
    expect(upgradePrice(lantern, 1)).toBe(1200);
    expect(upgradePrice(lantern, 2)).toBe(2000);
    expect(upgradePrice(lantern, 3)).toBe(null);
    expect(upgradePrice(CATALOG.find(i => i.id === "gold"), 1)).toBe(null);
  });

  it("re-buying an owned deco upgrades its tier and charges upgradePrice", () => {
    let shop = { ...defaultShop(), owned: ["red-lantern"] };
    let r = buy(1200, shop, "red-lantern");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.tiers).toEqual({ "red-lantern": 2 });
    r = buy(2000, r.shop, "red-lantern");
    expect(r.shop.tiers).toEqual({ "red-lantern": 3 });
    expect(buy(99999, r.shop, "red-lantern").ok).toBe(false); // maxed
  });

  it("upgrade fails when wallet is short; inputs not mutated", () => {
    const shop = { ...defaultShop(), owned: ["red-lantern"] };
    const before = JSON.stringify(shop);
    const r = buy(1199, shop, "red-lantern");
    expect(r.ok).toBe(false);
    expect(JSON.stringify(shop)).toBe(before);
  });

  it("legacy shop object without a tiers field upgrades cleanly (old-save load)", () => {
    const legacy = { owned: ["red-lantern"], skin: "", backdrop: "", effect: "", soundpack: "" };
    const r = buy(1200, legacy, "red-lantern");
    expect(r.ok).toBe(true);
    expect(r.shop.tiers).toEqual({ "red-lantern": 2 });
  });

  it("re-buying an owned non-deco still fails", () => {
    const shop = { ...defaultShop(), owned: ["midnight"] };
    expect(buy(99999, shop, "midnight").ok).toBe(false);
  });

  it("gated first purchases respect availability; upgrades do not need the window", () => {
    const today = "2026-07-07"; // summer active
    let r = buy(4500, defaultShop(), "shaved-ice-cart", today);
    expect(r.ok).toBe(true);
    // upgrade in deep winter still works — item already owned
    r = buy(Math.round(4500 * 1.5), r.shop, "shaved-ice-cart", "2026-12-01");
    expect(r.ok).toBe(true);
    expect(r.shop.tiers["shaved-ice-cart"]).toBe(2);
    // but a first purchase out of window fails
    expect(buy(99999, defaultShop(), "shaved-ice-cart", "2026-12-01").ok).toBe(false);
    // and a gated first purchase with no date fails
    expect(buy(99999, defaultShop(), "shaved-ice-cart").ok).toBe(false);
  });

  it("pool item buyable only while featured", () => {
    const today = "2026-07-07";
    const featured = dailyStock(today);
    const absent = CATALOG.filter(i => i.pool === "daily" && !featured.includes(i.id));
    expect(buy(99999, defaultShop(), featured[0], today).ok).toBe(true);
    expect(buy(99999, defaultShop(), absent[0].id, today).ok).toBe(false);
  });
});
```

**Heads-up:** the pre-existing `"defaultShop shape"` test fails — update its expected object to include `tiers: {}`.

- [ ] **Step 2: Run to verify they fail** — `npx vitest run test/shop.test.js`.

- [ ] **Step 3: Implement** — in `src/shop.js` replace `defaultShop` and `buy`, add `upgradePrice`:

```js
export function defaultShop() {
  return { owned: [], skin: "", backdrop: "", effect: "", soundpack: "", tiers: {} };
}

// Next-tier price for a tierable item, or null when maxed / not tierable.
// tier 1 -> 2 costs 1.5x base; tier 2 -> 3 costs 2.5x base (PRD v7 F4).
export function upgradePrice(item, currentTier) {
  if (!item || !item.maxTier || currentTier >= item.maxTier) return null;
  return Math.round(item.price * (currentTier === 1 ? 1.5 : 2.5));
}

export function buy(wallet, shop, id, dateStr) {
  const item = byId(id);
  if (!item) return { ok: false, wallet, shop };
  if (shop.owned.includes(id)) {
    // Owned tierable deco -> tier upgrade. Availability is not re-checked:
    // once owned, seasonal/pool decos upgrade year-round (PRD v7 F4).
    if (item.type !== "deco" || !item.maxTier) return { ok: false, wallet, shop };
    const cur = (shop.tiers && shop.tiers[id]) || 1;
    const price = upgradePrice(item, cur);
    if (price === null || wallet < price) return { ok: false, wallet, shop };
    return {
      ok: true,
      wallet: wallet - price,
      shop: { ...shop, tiers: { ...(shop.tiers || {}), [id]: cur + 1 } },
    };
  }
  if (!isAvailable(item, dateStr)) return { ok: false, wallet, shop };
  if (wallet < item.price) return { ok: false, wallet, shop };
  return {
    ok: true,
    wallet: wallet - item.price,
    shop: { ...shop, owned: [...shop.owned, id] },
  };
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/shop.test.js`, then the full suite `npm test` (other suites import `defaultShop`; fix any shape-assumption fallout the same way as the defaultShop-shape test — expected-object updates only, never logic changes).

- [ ] **Step 5: Commit**

```bash
git add src/shop.js test/shop.test.js
git commit -m "feat(shop): v7 deco tiers — tiers state, upgradePrice, availability-gated buy"
```

---

### Task 4: street.js — new decos + tier passthrough

**Files:**
- Modify: `src/street.js`
- Test: `test/street.test.js`

**Interfaces:**
- Consumes: deco ids from Task 1.
- Produces: `streetPieces(level, owned, tiers = {})` — deco pieces gain `tier: tiers[id] || 1`; building pieces are unchanged (no `tier` field). `DECO_IDS` grows to 15.

- [ ] **Step 1: Write the failing tests** — append inside `describe("street", ...)`:

```js
  it("DECO_IDS covers every catalog deco exactly (v7 cross-module guard)", async () => {
    const { CATALOG } = await import("../src/shop.js");
    const catalogDecos = CATALOG.filter(i => i.type === "deco").map(i => i.id);
    expect([...DECO_IDS].sort()).toEqual([...catalogDecos].sort());
    expect(DECO_IDS.length).toBe(15);
  });

  it("all 15 deco slots are unique and inside (0,1)", () => {
    const pieces = streetPieces(1, [...DECO_IDS]);
    expect(pieces.length).toBe(15);
    const slots = pieces.map(p => p.slot);
    expect(new Set(slots).size).toBe(15);
    for (const s of slots) { expect(s).toBeGreaterThan(0); expect(s).toBeLessThan(1); }
  });

  it("deco pieces carry their tier; default 1; buildings carry none", () => {
    const pieces = streetPieces(10, ["red-lantern", "koi-pond"], { "koi-pond": 3 });
    const lantern = pieces.find(p => p.id === "red-lantern");
    const koi = pieces.find(p => p.id === "koi-pond");
    const building = pieces.find(p => p.kind === "building");
    expect(lantern.tier).toBe(1);
    expect(koi.tier).toBe(3);
    expect(building.tier).toBeUndefined();
  });

  it("two-argument call still works (tiers defaults to {})", () => {
    const pieces = streetPieces(1, ["red-lantern"]);
    expect(pieces[0].tier).toBe(1);
  });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run test/street.test.js`.

- [ ] **Step 3: Implement** — in `src/street.js` replace `DECO_IDS`, `DECO_SLOTS`, and `streetPieces`:

```js
// Display order for owned decorations; ids owned but absent here are ignored.
// v7 adds the permanent prestige decos, the daily-pool decos, and the three
// seasonal decos (order fixes each one's street slot below).
export const DECO_IDS = [
  "red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch",
  "mahjong-table", "koi-pond", "drum-tower",
  "bubble-tea", "paper-umbrella", "goldfish-banner", "neon-cat-sign",
  "shaved-ice-cart", "mooncake-stall", "firecracker-arch",
];

const BUILDING_SLOTS = [.18, .34, .5, .66, .82];
// First five match v4 so existing streets do not reshuffle; the ten new
// fractions fill remaining gaps between buildings.
const DECO_SLOTS = [
  .10, .26, .42, .58, .74,
  .06, .14, .22, .30, .38,
  .46, .54, .62, .70, .90,
];

export function streetPieces(level, owned, tiers = {}) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i] });
  });
  DECO_IDS.forEach((id, i) => {
    if (owned.includes(id)) pieces.push({ id, kind: "deco", slot: DECO_SLOTS[i], tier: tiers[id] || 1 });
  });
  return pieces.sort((a, b) => a.slot - b.slot);
}
```

**Heads-up:** existing street tests that `toEqual` deco pieces without a `tier` field will fail — extend those expected objects with `tier: 1` (the building-only tests are unaffected).

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/street.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/street.js test/street.test.js
git commit -m "feat(street): 15-deco slot map + tier passthrough in streetPieces"
```

---

### Task 5: fx + sfx packs (Star Shower, Lion Dance Drum)

**Files:**
- Modify: `src/fx.js`, `src/sfx.js`
- Test: `test/fx.test.js`, `test/sfx.test.js` (both exist — append; mirror each file's local style)

**Interfaces:**
- Consumes: catalog ids `star-shower` (effect), `lion-drum` (soundpack) from Task 1.
- Produces: `coinBurst(x, y, boss, "star-shower")` returns `count+4` specs all `kind:"star", g:220`; `PACKS["lion-drum"]` with the standard `{kill, wrong, bite, combo}` shape. Task 6 draws `kind === "star"` particles.

- [ ] **Step 1: Write the failing tests**

Append to `test/fx.test.js`:

```js
  it("star-shower burst: count+4 specs, all star kind with slow-fall gravity", () => {
    const specs = coinBurst(10, 20, false, "star-shower");
    expect(specs.length).toBe(16); // 12 + 4
    expect(specs.every(s => s.kind === "star")).toBe(true);
    expect(specs.every(s => s.g === 220)).toBe(true);
  });

  it("star-shower boss burst scales with the boss count", () => {
    expect(coinBurst(0, 0, true, "star-shower").length).toBe(32); // 28 + 4
  });
```

Append to `test/sfx.test.js`:

```js
  it("lion-drum pack has the full spec shape", () => {
    const p = PACKS["lion-drum"];
    expect(p).toBeTruthy();
    for (const k of ["kill", "wrong", "bite"]) {
      expect(Array.isArray(p[k])).toBe(true);
      for (const s of p[k]) {
        expect(typeof s.f).toBe("number");
        expect(typeof s.d).toBe("number");
        expect(typeof s.w).toBe("string");
        expect(typeof s.v).toBe("number");
      }
    }
    expect(Array.isArray(p.combo.tones)).toBe(true);
    expect(typeof p.combo.boff).toBe("number");
    expect(typeof p.combo.mult).toBe("number");
  });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run test/fx.test.js test/sfx.test.js`.

- [ ] **Step 3: Implement**

In `src/fx.js` `coinBurst`, insert before the default-burst block (after the `firecracker-fx` branch):

```js
  if (style === "star-shower") {
    const extra = 4;
    const specs = [];
    for (let i = 0; i < count + extra; i++) {
      specs.push({
        x, y,
        vx: (Math.random() - 0.5) * 360,
        vy: -Math.random() * vyMax * 1.15,
        life: 0.8 + Math.random() * 0.4,
        kind: "star",
        g: 220                              // gentle fall, slower than crackers
      });
    }
    return specs;
  }
```

In `src/sfx.js` `PACKS`, add after `arcade` (deep festival drum: low sine thumps, muted wrong):

```js
  "lion-drum": {
    kill:  [{ f: 150, d: .18, w: "sine",     v: .22, at: 0   },
            { f: 320, d: .1,  w: "triangle", v: .16, at: .09 }],
    wrong: [{ f: 90,  d: .3,  w: "sine",     v: .2,  at: 0   }],
    bite:  [{ f: 130, d: .16, w: "sine",     v: .22, at: 0   },
            { f: 80,  d: .28, w: "sine",     v: .18, at: .1  }],
    combo: { boff: -400, mult: 1.5,
             tones: [{ d: .12, w: "sine",     v: .14, at: 0   },
                     { d: .14, w: "triangle", v: .14, at: .07 }] },
  },
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/fx.test.js test/sfx.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/fx.js src/sfx.js test/fx.test.js test/sfx.test.js
git commit -m "feat(fx,sfx): star-shower burst kind + lion-drum sound pack"
```

---

### Task 6: Sprite registry, skin palettes, generation prompts

**Files:**
- Modify: `src/sprites.js`, `src/shop.js` (SKIN_PALETTES only), `docs/art/GENERATION-PROMPTS-P0-copypaste.md`
- Create: `test/shop-registry.test.js`

**Interfaces:**
- Consumes: skin/backdrop ids from Task 1.
- Produces: `SKIN_PALETTES` entries for `panda, ninja, astronaut, beach, mooncake-rabbit, dragon` (each `{ sprite, body, head, ear, inner, leg, filter }`); `SPRITE_NAMES` includes each palette's `<sprite>-walk`/`-happy` plus `bg-<id>` for the five new backdrops. Missing PNGs are safe: `sprite()` returns null → vector cat / procedural backdrop fallback (verified — `test/sw-precache.test.js` only requires on-disk files).

- [ ] **Step 1: Write the failing test** — create `test/shop-registry.test.js`:

```js
import { describe, it, expect } from "vitest";
import { CATALOG, SKIN_PALETTES } from "../src/shop.js";
import { SPRITE_NAMES } from "../src/sprites.js";

// PRD v7 §5: registry entries land with the code so art drops in later with
// zero code changes. Every purchasable skin/backdrop must be pre-registered.
describe("shop <-> sprite registry", () => {
  it("every skin has a palette with a registered walk+happy sheet", () => {
    for (const s of CATALOG.filter(i => i.type === "skin")) {
      const pal = SKIN_PALETTES[s.id];
      expect(pal, `SKIN_PALETTES missing ${s.id}`).toBeTruthy();
      expect(typeof pal.filter).toBe("string");
      expect(SPRITE_NAMES, `${pal.sprite}-walk`).toContain(pal.sprite + "-walk");
      expect(SPRITE_NAMES, `${pal.sprite}-happy`).toContain(pal.sprite + "-happy");
    }
  });

  it("every backdrop has its bg-<id> sprite registered", () => {
    for (const b of CATALOG.filter(i => i.type === "backdrop")) {
      expect(SPRITE_NAMES, `bg-${b.id}`).toContain("bg-" + b.id);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run test/shop-registry.test.js`.

- [ ] **Step 3: Implement**

In `src/shop.js` append to `SKIN_PALETTES` (vector-fallback hexes + a `ctx.filter` recolor of the base sheet until each sheet lands):

```js
  panda:     { sprite: "cat-panda", body: "#f4f4f0", head: "#ffffff", ear: "#26262c", inner: "#3a3a40", leg: "#26262c",
               filter: "grayscale(1) brightness(1.32) contrast(1.08)" },
  ninja:     { sprite: "cat-ninja", body: "#23233a", head: "#2c2c46", ear: "#2c2c46", inner: "#c1272d", leg: "#16162a",
               filter: "grayscale(.85) brightness(.45)" },
  astronaut: { sprite: "cat-astronaut", body: "#e8ecf4", head: "#f4f7fd", ear: "#f4f7fd", inner: "#4a7fd4", leg: "#b8c2d4",
               filter: "grayscale(.9) brightness(1.35)" },
  beach:     { sprite: "cat-beach", body: "#f3b23e", head: "#ffd27a", ear: "#ffd27a", inner: "#2aa8c4", leg: "#d08a20",
               filter: "saturate(1.4) brightness(1.2) hue-rotate(10deg)" },
  "mooncake-rabbit": { sprite: "cat-mooncake", body: "#efe6da", head: "#f8f2e8", ear: "#f8f2e8", inner: "#c9a34e", leg: "#cbbfa8",
               filter: "sepia(.4) brightness(1.25)" },
  dragon:    { sprite: "cat-dragon", body: "#b3202a", head: "#c92f30", ear: "#c92f30", inner: "#f5c518", leg: "#7c1418",
               filter: "saturate(1.5) hue-rotate(-20deg) brightness(.95)" },
```

In `src/sprites.js` extend `SPRITE_NAMES` (after the `cat-gold` pair and after `bg-bamboo` respectively):

```js
  "cat-panda-walk", "cat-panda-happy",
  "cat-ninja-walk", "cat-ninja-happy",
  "cat-astronaut-walk", "cat-astronaut-happy",
  "cat-beach-walk", "cat-beach-happy",
  "cat-mooncake-walk", "cat-mooncake-happy",
  "cat-dragon-walk", "cat-dragon-happy",
```
```js
  "bg-harbor-night", "bg-snow-festival", "bg-island-sunset",
  "bg-lantern-festival", "bg-dragon-gate",
```

Append to `docs/art/GENERATION-PROMPTS-P0-copypaste.md` a `## v7 Shop Seasons batch` section: one block per file, same copy-paste format as the existing blocks (master style prompt from `docs/art/GENERATION-PROMPTS-v5.md` + the clause below), targets named exactly:

| File | Clause |
|---|---|
| `cat-panda-walk.png` / `cat-panda-happy.png` | round panda-patterned cat, white body with black ears/eye patches/paws — 6-frame walk sheet / 4-frame happy sheet, same grid as cat-walk.png |
| `cat-ninja-walk.png` / `cat-ninja-happy.png` | night-blue ninja cat with coral-red scarf, sneaking pose |
| `cat-astronaut-walk.png` / `cat-astronaut-happy.png` | white space-suit cat, sky-blue visor glint, tiny antenna |
| `cat-beach-walk.png` / `cat-beach-happy.png` | sunny beach cat, sun-yellow fur, teal swim ring around waist |
| `cat-mooncake-walk.png` / `cat-mooncake-happy.png` | cream rabbit-hooded cat holding a golden mooncake |
| `cat-dragon-walk.png` / `cat-dragon-happy.png` | coral-red dragon-costume cat, gold belly scales, small horns |
| `bg-harbor-night.png` | harbor boardwalk at dusk, moored junk boats, warm lanterns on water, 1024×512 |
| `bg-snow-festival.png` | snowy village festival, ice lanterns, warm stall lights on snow, 1024×512 |
| `bg-island-sunset.png` | tropical island shore at sunset, palm silhouettes, coral sky, 1024×512 |
| `bg-lantern-festival.png` | mid-autumn lantern festival night, floating lanterns over a river, 1024×512 |
| `bg-dragon-gate.png` | vermilion dragon gate with gold trim, festival banners, dawn light, 1024×512 |

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/shop-registry.test.js`, then `npm test` (the sw-precache suite must stay green — new names have no on-disk files, so no precache additions are required).

- [ ] **Step 5: Commit**

```bash
git add src/shop.js src/sprites.js test/shop-registry.test.js docs/art/GENERATION-PROMPTS-P0-copypaste.md
git commit -m "feat(art): v7 skin palettes, sprite registry entries, generation prompts"
```

---

### Task 7: Shop UI — Today's Stock, Season Corner, upgrade rows, i18n

**Files:**
- Modify: `index.html` (shop screen markup + one CSS rule), `src/i18n.js`, `src/main.js`

**Interfaces:**
- Consumes: `dailyStock`, `seasonStatus`, `upgradePrice`, extended `buy` (Tasks 2–3); `getLocale`/`t` from `i18n.js`; `todayStr()` (`main.js:106`).
- Produces: DOM ids `#shop-daily`, `#shop-daily-note`, `#shop-season`, `#shop-season-note`; i18n keys listed below (used only here).

- [ ] **Step 1: index.html markup** — inside `#s-shop`, directly after `<div class="readout" id="shop-wallet"></div>`, insert:

```html
    <div class="sect" data-i18n="shop.daily">Today's Stock</div>
    <div class="scorelist" id="shop-daily"></div>
    <p class="shop-note" id="shop-daily-note" data-i18n="shop.dailyNote">New stock at midnight</p>
    <div class="sect" data-i18n="shop.season">Season Corner</div>
    <div class="scorelist" id="shop-season"></div>
    <p class="shop-note" id="shop-season-note"></p>
```

And in the `<style>` block, next to the existing `.shop-*` rules, add:

```css
.shop-note{color:var(--muted);font-size:12px;margin:2px 4px 12px}
```

- [ ] **Step 2: i18n keys** — in `src/i18n.js`, append to the EN table after `"shop.coins"`:

```js
    "shop.daily": "Today's Stock",
    "shop.dailyNote": "New stock at midnight",
    "shop.season": "Season Corner",
    "shop.seasonUntil": "Available until {date}",
    "shop.seasonReturns": "🏮 {name} set returns {date}",
    "shop.upgrade": "Upgrade {stars} ({coins})",
    "shop.maxed": "★★★",
    "season.summer": "Summer",
    "season.midautumn": "Mid-Autumn",
    "season.cny": "Lunar New Year",
```

and the TH table (same params — the placeholder-parity test enforces this):

```js
    "shop.daily": "สินค้าวันนี้",
    "shop.dailyNote": "ของใหม่มาตอนเที่ยงคืน",
    "shop.season": "มุมเทศกาล",
    "shop.seasonUntil": "มีถึง {date}",
    "shop.seasonReturns": "🏮 เซ็ต {name} จะกลับมา {date}",
    "shop.upgrade": "อัปเกรด {stars} ({coins})",
    "shop.maxed": "★★★",
    "season.summer": "ฤดูร้อน",
    "season.midautumn": "ไหว้พระจันทร์",
    "season.cny": "ตรุษจีน",
```

Also add the ten key/value pairs to `docs/i18n/i18n-translation-review.md`'s pending-review table (same format as existing rows).

- [ ] **Step 3: main.js wiring** — update the import at line 21 to also pull `dailyStock, seasonStatus, upgradePrice` from `./shop.js`, and ensure `getLocale` is imported from `./i18n.js` (add it to the existing i18n import if absent). Then replace the whole `renderShop()` function with:

```js
function renderShop(){
  sfx.pack = shopState.soundpack || "default";  // keep sfx in sync with the equipped slot
  $("#shop-wallet").innerHTML = t("shop.wallet", { coins: wallet.toLocaleString() });
  const today = todayStr();
  const dailyBox = $("#shop-daily"), seasonBox = $("#shop-season");
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), decoBox = $("#shop-street");
  for(const b of [dailyBox, seasonBox, skinBox, bdBox, fxBox, sndBox, decoBox]) b.innerHTML = "";

  // Today's Stock — the 3 featured pool items; once owned they live in their type section
  for(const id of dailyStock(today)){
    const item = CATALOG.find(i => i.id === id);
    if(item && !shopState.owned.includes(id)) dailyBox.appendChild(makeShopRow(item, today));
  }

  // Season Corner — active set is buyable; off-season shows the next set's teaser
  const st = seasonStatus(today);
  const seasonNote = $("#shop-season-note");
  if(st.active){
    for(const item of CATALOG.filter(i => i.season === st.active.id && !shopState.owned.includes(i.id))){
      seasonBox.appendChild(makeShopRow(item, today));
    }
    seasonNote.textContent = t("shop.seasonUntil", { date: fmtMonthDay(st.active.to) });
  }else{
    seasonNote.textContent = t("shop.seasonReturns", { name: t("season." + st.next.id), date: fmtMonthDay(st.next.from) });
  }

  // Permanent sections — pool/season items appear here only once owned
  for(const item of CATALOG){
    if((item.pool || item.season) && !shopState.owned.includes(item.id)) continue;
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : decoBox;
    box.appendChild(makeShopRow(item, today));
  }
  startShopPreviewLoop();
}

// "Jul 1" / "1 ก.ค." for a [month, day] pair, in the active locale.
const fmtMonthDay = ([m, d]) =>
  new Date(2026, m - 1, d).toLocaleDateString(getLocale() === "th" ? "th-TH" : "en-US", { month: "short", day: "numeric" });

function makeShopRow(item, today){
  const owned = shopState.owned.includes(item.id);
  const equipped = shopState[item.type] === item.id;
  const tier = (shopState.tiers && shopState.tiers[item.id]) || 1;
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const left = document.createElement("span");
  left.className = "shop-left";
  const preview = document.createElement("canvas");
  preview.className = "shop-preview";
  preview.setAttribute("aria-hidden", "true");
  preview._shopItem = item;
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  const stars = item.type === "deco" && owned ? " " + "★".repeat(tier) : "";
  copy.innerHTML = `<b>${item.name}${stars}</b><small>${t("shop.coins", { coins: item.price.toLocaleString() })}</small>`;
  left.replaceChildren(preview, copy);
  const btn = document.createElement("button");
  const doBuy = () => {
    const r = buy(wallet, shopState, item.id, today);
    if(!r.ok) return;
    wallet = r.wallet; shopState = r.shop;
    store.set("wallet", wallet); store.set("shop", shopState);
    updateWalletChip(); renderShop(); renderStreet();
  };
  if(item.type === "deco"){
    // Owning a deco displays it on the street; re-buys upgrade its tier (v7 F4).
    if(!owned){
      btn.className = "chip";
      btn.textContent = t("shop.buy");
      btn.disabled = !canAfford(wallet, item.id);
      btn.onclick = doBuy;
    }else if(item.maxTier && tier < item.maxTier){
      const up = upgradePrice(item, tier);
      btn.className = "chip";
      btn.textContent = t("shop.upgrade", { stars: "★".repeat(tier + 1), coins: up.toLocaleString() });
      btn.disabled = wallet < up;
      btn.onclick = doBuy;
    }else{
      btn.className = "chip on";
      btn.textContent = t("shop.maxed");
      btn.disabled = true;
    }
  }else{
    btn.className = "chip" + (equipped ? " on" : "");
    if(equipped){
      btn.textContent = t("shop.equipped"); btn.disabled = true;
    }else if(owned){
      btn.textContent = t("shop.equip");
      btn.onclick = ()=>{ shopState = equipItem(shopState, item.id); store.set("shop", shopState); renderShop(); };
    }else{
      btn.textContent = t("shop.buy");
      btn.disabled = !canAfford(wallet, item.id);
      btn.onclick = doBuy;
    }
  }
  row.appendChild(left); row.appendChild(btn);
  renderShopPreview(preview, item, performance.now());
  return row;
}
```

Then extend `renderShopPreview`: in the effect branch add a `star-shower` case before the firecracker fallback, and in the soundpack branch add a `lion-drum` case before the arcade fallback:

```js
    }else if(item.id==="star-shower"){
      c.fillStyle = "#ffe08a";
      for(const [x,y,r] of [[18,14,4],[33,22,5],[44,12,3],[25,30,3.5]]) drawStarMark(c, x, y, r);
```
```js
    }else if(item.id==="lion-drum"){
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(28,24,12,9,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(16,20,24,3);
      c.strokeStyle = "#7a1c14"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(20,10); c.lineTo(26,19); c.moveTo(38,10); c.lineTo(32,19); c.stroke();
```

And add the shared 4-point star helper near `drawStreetDeco`:

```js
// Small 4-point star (shop previews + star-shower particles).
function drawStarMark(c, x, y, r){
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r); c.fill();
}
```

Finally, in the particle draw loop (~line 1246), add a `star` kind between `cracker` and the else-dot:

```js
    }else if(p.kind==="star"){
      ctx.fillStyle = "#ffe08a"; drawStarMark(ctx, p.x, p.y, 5.2);
```

- [ ] **Step 4: Verify** — `npm test` (DOM-id consistency + i18n placeholder-parity suites must pass) and `npm run build` (must bundle clean). Then a manual smoke: `npm run serve`, open `http://localhost:8000`, and check — Today's Stock shows 3 items; Season Corner shows the summer set with "Available until Aug 15"; buying Red Lantern then reopening shop shows "Upgrade ★★ (1,200)"; TH toggle relabels every new string; battle with Star Shower equipped pops star particles (grant coins via a quick battle or temporarily via console `localStorage` edit — restore after).

- [ ] **Step 5: Commit**

```bash
git add index.html src/i18n.js src/main.js docs/i18n/i18n-translation-review.md
git commit -m "feat(shop-ui): Today's Stock + Season Corner sections, tier upgrade rows, i18n"
```

---

### Task 8: Street rendering — tier embellishments + 10 new deco shapes

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `streetPieces(level, owned, tiers)` (Task 4); `drawStreetDeco(c, id, x, gy, h)` switch (~line 2012).
- Produces: tier-aware street drawing; canvas shapes for every new deco id (procedural fallback until tier art exists, PRD v7 F4/§5).

- [ ] **Step 1: Pass tiers into the street** — in `renderStreet()` change the pieces line and the deco draw call:

```js
  const pieces = streetPieces(level, shopState.owned, shopState.tiers || {});
```
```js
    if(p.kind==="building") drawStreetBuilding(sc, p.id, x, gy, h);
    else drawTieredDeco(sc, p, x, gy, h);
```

- [ ] **Step 2: Tier embellishment fallback** — add above `drawStreetDeco` (pure canvas, deterministic; tier 2 = warm glow + 1.15× scale, tier 3 = flanking mini copies, per PRD v7 F4):

```js
function drawTieredDeco(c, p, x, gy, h){
  const tier = p.tier || 1;
  if(tier >= 3){
    const dx = h * .26;
    c.save(); c.globalAlpha = .8;
    drawStreetDeco(c, p.id, x - dx, gy, h * .68);
    drawStreetDeco(c, p.id, x + dx, gy, h * .68);
    c.restore();
  }
  if(tier >= 2){
    c.save();
    c.shadowColor = "rgba(255,214,95,.55)"; c.shadowBlur = 12;
    c.translate(x, gy); c.scale(1.15, 1.15); c.translate(-x, -gy);
    drawStreetDeco(c, p.id, x, gy, h);
    c.restore();
  }else{
    drawStreetDeco(c, p.id, x, gy, h);
  }
}
```

- [ ] **Step 3: New deco shapes** — extend the `switch` in `drawStreetDeco` with ten cases (v5 warm palette: cream `#fdf6e3`, wood `#8a5a2c`, coral `#e8734a`, red `#c1272d`, gold `#f5c518`, sky `#7fd7ff`, green `#2f7d4f`; each silhouette legible at ~72 px):

```js
    case "mahjong-table":
      c.fillStyle = "#2f7d4f"; c.fillRect(-s*.5,-s*.55,s,s*.16);
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.4,s*.1,s*.4); c.fillRect(s*.32,-s*.4,s*.1,s*.4);
      c.fillStyle = "#fdf6e3";
      for(const tx of [-s*.3,-s*.1,s*.1,s*.28]) c.fillRect(tx,-s*.72,s*.14,s*.14);
      break;
    case "koi-pond":
      c.fillStyle = "#3f8fb0"; c.beginPath(); c.ellipse(0,-s*.14,s*.55,s*.22,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(-s*.14,-s*.16,s*.16,s*.07,-.5,0,Math.PI*2); c.fill();
      c.fillStyle = "#fdf6e3"; c.beginPath(); c.ellipse(s*.16,-s*.1,s*.13,s*.06,.4,0,Math.PI*2); c.fill();
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.ellipse(0,-s*.14,s*.58,s*.25,0,0,Math.PI*2); c.stroke();
      break;
    case "drum-tower":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.34,-s*1.15,s*.68,s*1.15);
      c.fillStyle = "#c1272d"; c.beginPath(); c.moveTo(-s*.48,-s*1.15); c.lineTo(0,-s*1.5); c.lineTo(s*.48,-s*1.15); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0,-s*.62,s*.2,s*.24,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-s*.62,s*.07,0,Math.PI*2); c.fill();
      break;
    case "bubble-tea":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.4,-s*.7,s*.8,s*.7);
      c.fillStyle = "#f5c518"; c.fillRect(-s*.48,-s*.86,s*.96,s*.16);
      c.fillStyle = "#e8a9c9"; c.fillRect(-s*.12,-s*1.2,s*.24,s*.3);
      c.strokeStyle = "#5a3a1c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,-s*1.2); c.lineTo(s*.06,-s*1.34); c.stroke();
      break;
    case "paper-umbrella":
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*.9); c.stroke();
      c.fillStyle = "#e8734a"; c.beginPath(); c.arc(0,-s*.9,s*.5,Math.PI,0); c.fill();
      c.strokeStyle = "#fdf6e3"; c.lineWidth = 1.5;
      for(const a of [-2.5,-1.9,-1.2,-.6]){ c.beginPath(); c.moveTo(0,-s*.9); c.lineTo(Math.cos(a)*s*.5,-s*.9+Math.sin(a)*s*.5); c.stroke(); }
      break;
    case "goldfish-banner":
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*1.4); c.stroke();
      c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(s*.2,-s*1.1,s*.3,s*.12,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.moveTo(s*.46,-s*1.1); c.lineTo(s*.62,-s*1.2); c.lineTo(s*.62,-s*1.0); c.closePath(); c.fill();
      break;
    case "neon-cat-sign":
      c.fillStyle = "#23233a"; c.fillRect(-s*.36,-s*1.1,s*.72,s*.8);
      c.strokeStyle = "#7fd7ff"; c.lineWidth = 2; c.strokeRect(-s*.36,-s*1.1,s*.72,s*.8);
      c.strokeStyle = "#f5c518"; c.beginPath(); c.arc(0,-s*.72,s*.18,0,Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(-s*.14,-s*.86); c.lineTo(-s*.06,-s*.98); c.moveTo(s*.14,-s*.86); c.lineTo(s*.06,-s*.98); c.stroke();
      break;
    case "shaved-ice-cart":
      c.fillStyle = "#fdf6e3"; c.fillRect(-s*.4,-s*.62,s*.8,s*.5);
      c.fillStyle = "#7fd7ff"; c.beginPath(); c.arc(0,-s*.72,s*.22,Math.PI,0); c.fill();
      c.fillStyle = "#e8734a"; c.fillRect(-s*.06,-s*.94,s*.12,s*.1);
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2;
      c.beginPath(); c.arc(-s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
      c.beginPath(); c.arc(s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
      break;
    case "mooncake-stall":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.6,s*.84,s*.6);
      c.fillStyle = "#c1272d"; c.fillRect(-s*.5,-s*.78,s,s*.18);
      c.fillStyle = "#f5c518";
      for(const tx of [-s*.26,-s*.02,s*.2]){ c.beginPath(); c.arc(tx+s*.06,-s*.42,s*.09,0,Math.PI*2); c.fill(); }
      break;
    case "firecracker-arch":
      c.strokeStyle = "#c1272d"; c.lineWidth = 3;
      c.beginPath(); c.arc(0,-s*.2,s*.62,Math.PI,0); c.stroke();
      c.fillStyle = "#c1272d";
      for(const [ax,ay] of [[-s*.62,-s*.2],[s*.62,-s*.2],[-s*.5,-s*.62],[s*.5,-s*.62],[0,-s*.82]]) c.fillRect(ax-2,ay,4,s*.18);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-s*.82,s*.06,0,Math.PI*2); c.fill();
      break;
```

- [ ] **Step 4: Verify** — `npm test` green, `npm run build` clean. Manual smoke: on `npm run serve`, buy `mahjong-table` (console-grant coins, restore after), confirm it renders on the home street; upgrade Red Lantern twice and confirm the glow (★★) then flanking copies (★★★) appear; shop previews for all ten new decos render non-blank.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat(street): tier embellishment rendering + canvas shapes for v7 decos"
```

---

### Task 9: Ship prep — regression, dist, SHELL bump, docs, PR

**Files:**
- Modify: `sw.js`, `dist/app.js` (rebuilt), `docs/planning/V2-EXECUTION-PLAN.md`

- [ ] **Step 1: Full regression** — `npm test` → all suites green (expect ~420+). Fix anything red before proceeding.
- [ ] **Step 2: Bump SHELL** — in `sw.js`: `const SHELL = "nbhsk-shell-v29";` → `"nbhsk-shell-v30"`. (If another session already took v30, use the next free number and note it in the commit message.)
- [ ] **Step 3: Rebuild dist** — `npm run build`; confirm `dist/app.js` changed (`git status`).
- [ ] **Step 4: Docs** — append a short `## v7 "Shop Seasons" (2026-07-07)` status section to `docs/planning/V2-EXECUTION-PLAN.md`: spec pointer to `docs/prd/PRD-v7-shop-seasons.md`, one `- [x]` line per landed task (1–8), plus known deferrals: art PNGs pending intake (vector/procedural fallbacks live), tier-specific art variants deferred to intake, item names remain English pending i18n pass 2.
- [ ] **Step 5: Commit + PR**

```bash
git add sw.js dist/app.js docs/planning/V2-EXECUTION-PLAN.md
git commit -m "chore(release): v7 shop seasons — SHELL v30, dist rebuild, status doc"
git push -u origin feat/v7-shop-seasons
gh pr create --base development --title "PRD v7: Shop Seasons — themed catalog, daily stock, season corner, deco tiers"
```

PR body: summary per PRD feature (F1–F4), test counts before/after, the fallback story (no art blocked), and the standard generated-with footer.

---

## Self-review notes (spec coverage)

- F1 catalog → Task 1; F2 rotation → Task 2 (+UI Task 7); F3 seasons → Tasks 2, 7; F4 tiers → Tasks 3, 4, 7, 8. §5 art pipeline → Task 6. §6 module list → shop (1–3), street (4), main/index/i18n (7–8). §7 constraints → global section + Task 9. §9 success criteria each map to a test or the Task 7/8 manual smoke; "same 3 items all day / changes at midnight" holds by construction (pure function of the date string) and is covered by the stable-for-same-date test.
- The PRD's `nextFeaturedIn` "back in ~N days" caption is explicitly logic/tests-only (PRD F2) — no UI consumes it in v7.
- Old tests knowingly touched: defaultShop shape, catalog counts, street deco `toEqual` objects — each updated in its task's heads-up note.

## Post-review follow-ups (filed 2026-07-08)

Non-blocking items surfaced by the final whole-branch review of `feat/v7-shop-seasons`, deferred to future rounds:

- **Deco generation prompts + decor-type manifest rows for the 11 new decos** — the tier-2/tier-3 street decos shipped with procedural glow/flank fallbacks only; next art round needs copy-paste generation prompts (per the `GENERATION-PROMPTS-v5.md` format) plus corresponding `"decor"`-type rows in `assets/asset-manifest.json`.
- **Per-id procedural scenes or prompt-priority for the 5 new backdrops** — `bg-harbor-night`, `bg-snow-festival`, `bg-island-sunset`, `bg-lantern-festival`, `bg-dragon-gate` all currently share the same generic gradient fallback (`canvas:paintBackdrop-default`); needs either distinct procedural paint routines per backdrop or an explicit priority order for art-drop intake.
- **`doBuy`/`renderStreet` dead-call cleanup** — a follow-up pass should check for and remove any now-unreachable/redundant calls between `doBuy` and `renderStreet` left over from the shop rewrite.
- **Empty "Today's Stock" shelf cosmetic state** — when every pool item in the daily rotation is already owned, the shelf currently renders empty with no explicit "nothing new today" treatment; needs a cosmetic empty state.
- **Shop-registry test hardening** — add assertions that soundpack ids are a subset of `PACKS` and that every effect id referenced by the catalog is handled by `coinBurst` (or its equivalent), so a future catalog addition without matching sound/effect wiring fails loudly in tests rather than silently falling back.
- **Art-drop raw PNG pruning policy after install** — `scripts/intake_art.py`'s `drop/processed/<target>/cand-NN/` output accumulates candidate PNGs indefinitely; needs a policy (and possibly a script) for pruning installed/rejected candidates after a winner is chosen.
