import { describe, it, expect } from "vitest";
import { BUILDINGS, DECO_IDS, DECO_SPRITE_SCALE, UNIT_FRAC, streetPieces, streetProgress, streetMetrics,
         assignDecoAnchors, DECO_CLASS, CLASS_SIZE, DECO_ANCHORS, LANES,
         LANDMARK_SCALE,
         WELCOME_ID, DECO_META, STREET_PLOTS, defaultStreetLayout,
         normalizeStreetLayout, itemFitsPlot, streetOwnedIds, compatibleStreetPlots,
         firstFreeStreetPlot,
         unplacedStreetItems, streetInventory, placeStreetItem, storeStreetItem, autoArrangeStreet,
         migrateLegacyStreet, streetWorldMetrics, STREET_LAYOUT_VERSION } from "../src/street.js";
import { MILESTONES } from "../src/growth.js";

describe("street", () => {
  it("BUILDINGS mirrors growth MILESTONES levels", () => {
    expect(BUILDINGS.map(b => b.lv)).toEqual(MILESTONES.map(m => m.lv));
    expect(BUILDINGS.map(b => b.lv)).toEqual([5, 10, 20, 30, 50]);
  });

  it("streetPieces(1, []) is empty — nothing unlocked, nothing owned", () => {
    expect(streetPieces(1, [])).toEqual([]);
  });

  it("streetPieces(10, []) has exactly 2 buildings in ascending slot order", () => {
    const pieces = streetPieces(10, []);
    expect(pieces.length).toBe(2);
    expect(pieces.every(p => p.kind === "building")).toBe(true);
    expect(pieces.map(p => p.id)).toEqual(["lantern-post", "coin-bank"]);
    expect(pieces[0].slot).toBeLessThan(pieces[1].slot);
  });

  it("every milestone building uses an authored landmark draw scale", () => {
    const landmarks = streetPieces(50, []);
    expect(landmarks).toHaveLength(BUILDINGS.length);
    for (const piece of landmarks) {
      expect(piece.scale).toBe(LANDMARK_SCALE[piece.id]);
      expect(piece.scale).toBeGreaterThan(2.5);
    }
  });

  it("decos appear only when owned; assignment is independent of the owned array's order", () => {
    const owned = ["golden-arch", "red-lantern"]; // out-of-order ownership
    const pieces = streetPieces(1, owned).filter(p => p.kind === "deco");
    expect(pieces.map(p => p.id).sort()).toEqual(["golden-arch", "red-lantern"]);
    const reordered = streetPieces(1, ["red-lantern", "golden-arch"]).filter(p => p.kind === "deco");
    expect(pieces).toEqual(reordered);
  });

  it("unknown owned ids are ignored", () => {
    const pieces = streetPieces(1, ["midnight", "bells", "red-lantern"]);
    expect(pieces.map(p => p.id)).toEqual(["red-lantern"]);
  });

  it("is deterministic — two calls with the same inputs deep-equal", () => {
    const a = streetPieces(30, ["red-lantern", "tea-sign"]);
    const b = streetPieces(30, ["red-lantern", "tea-sign"]);
    expect(a).toEqual(b);
  });

  it("all slots are within [0,1], and unique within each depth lane (no same-lane overlap)", () => {
    const pieces = streetPieces(50, DECO_IDS.slice());
    for (const p of pieces) {
      expect(p.slot).toBeGreaterThanOrEqual(0);
      expect(p.slot).toBeLessThanOrEqual(1);
    }
    const byLane = {};
    for (const p of pieces) (byLane[p.laneY] = byLane[p.laneY] || []).push(p.slot);
    for (const slots of Object.values(byLane)) expect(new Set(slots).size).toBe(slots.length);
  });

  it("at max level with everything owned, all 5 buildings + 15 decos appear", () => {
    const pieces = streetPieces(50, DECO_IDS.slice());
    expect(pieces.length).toBe(20);
    expect(pieces.filter(p => p.kind === "building").length).toBe(5);
    expect(pieces.filter(p => p.kind === "deco").length).toBe(15);
  });

  it("streetProgress counts unlocked buildings and finds the next one", () => {
    expect(streetProgress(1)).toEqual({ unlocked: 0, total: 5, next: { lv: 5, name: "Lantern Post" } });
    expect(streetProgress(4)).toEqual({ unlocked: 0, total: 5, next: { lv: 5, name: "Lantern Post" } });
    expect(streetProgress(5)).toEqual({ unlocked: 1, total: 5, next: { lv: 10, name: "Coin Bank" } });
    expect(streetProgress(49)).toEqual({ unlocked: 4, total: 5, next: { lv: 50, name: "Emperor's Gate" } });
    expect(streetProgress(50)).toEqual({ unlocked: 5, total: 5, next: null });
  });

  it("DECO_IDS covers every catalog deco exactly (v7 cross-module guard)", async () => {
    const { CATALOG } = await import("../src/shop.js");
    const catalogDecos = CATALOG.filter(i => i.type === "deco").map(i => i.id);
    expect([...DECO_IDS].sort()).toEqual([...catalogDecos].sort());
    expect(DECO_IDS.length).toBe(15);
  });

  it("all 15 deco slots are inside (0,1), unique within each depth lane", () => {
    const pieces = streetPieces(1, [...DECO_IDS]);
    expect(pieces.length).toBe(15);
    for (const p of pieces) { expect(p.slot).toBeGreaterThan(0); expect(p.slot).toBeLessThan(1); }
    const byLane = {};
    for (const p of pieces) (byLane[p.laneY] = byLane[p.laneY] || []).push(p.slot);
    for (const slots of Object.values(byLane)) expect(new Set(slots).size).toBe(slots.length);
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
});

describe("streetMetrics", () => {
  it("returns object with unit, backY, frontY, backScale", () => {
    const m = streetMetrics(300, 400);
    expect(m).toHaveProperty("unit");
    expect(m).toHaveProperty("backY");
    expect(m).toHaveProperty("frontY");
    expect(m).toHaveProperty("backScale");
  });

  it("unit is the minimum of h*0.30 and w*0.105", () => {
    // h-bound case: tall canvas (300w, 400h)
    // unit = Math.min(400 * 0.30, 300 * 0.105) = Math.min(120, 31.5) = 31.5
    const tall = streetMetrics(300, 400);
    expect(tall.unit).toBeCloseTo(Math.min(120, 31.5), 5);

    // w-bound case: wide canvas (1000w, 200h)
    // unit = Math.min(200 * 0.30, 1000 * 0.105) = Math.min(60, 105) = 60
    const wide = streetMetrics(1000, 200);
    expect(wide.unit).toBeCloseTo(Math.min(60, 105), 5);
  });

  it("backY and frontY are constant fractions", () => {
    const m1 = streetMetrics(100, 200);
    const m2 = streetMetrics(500, 800);
    expect(m1.backY).toBe(0.86);
    expect(m1.frontY).toBe(1.0);
    expect(m2.backY).toBe(0.86);
    expect(m2.frontY).toBe(1.0);
  });

  it("backY is less than frontY", () => {
    const m = streetMetrics(400, 300);
    expect(m.backY).toBeLessThan(m.frontY);
  });

  it("backScale is constant and less than 1", () => {
    const m1 = streetMetrics(100, 200);
    const m2 = streetMetrics(800, 600);
    expect(m1.backScale).toBe(0.78);
    expect(m2.backScale).toBe(0.78);
    expect(m1.backScale).toBeLessThan(1);
  });

  it("all outputs are finite and positive for w,h ∈ [1, 2000]", () => {
    for (let w = 1; w <= 2000; w += 100) {
      for (let h = 1; h <= 2000; h += 100) {
        const m = streetMetrics(w, h);
        expect(Number.isFinite(m.unit)).toBe(true);
        expect(m.unit).toBeGreaterThan(0);
        expect(Number.isFinite(m.backY)).toBe(true);
        expect(m.backY).toBeGreaterThan(0);
        expect(Number.isFinite(m.frontY)).toBe(true);
        expect(m.frontY).toBeGreaterThan(0);
        expect(Number.isFinite(m.backScale)).toBe(true);
        expect(m.backScale).toBeGreaterThan(0);
      }
    }
  });

  it("two calls with same inputs deep-equal", () => {
    const a = streetMetrics(300, 400);
    const b = streetMetrics(300, 400);
    expect(a).toEqual(b);
  });
});

describe("scene composer", () => {
  it("every class has a CLASS_SIZE and every lane orders back < mid < front", () => {
    for (const cls of Object.values(DECO_CLASS)) expect(CLASS_SIZE[cls]).toBeGreaterThan(0);
    expect(LANES.back.laneY).toBeLessThan(LANES.mid.laneY);
    expect(LANES.mid.laneY).toBeLessThan(LANES.front.laneY);
  });

  it("every deco id has a class and every class anchor list fits its census", () => {
    const census = {};
    for (const id of DECO_IDS) {
      expect(DECO_CLASS[id], id).toBeTruthy();
      census[DECO_CLASS[id]] = (census[DECO_CLASS[id]] || 0) + 1;
    }
    for (const cls of Object.keys(census)) expect(DECO_ANCHORS[cls].length).toBe(census[cls]);
  });

  it("assignment is stable under growth (an item never moves when more are bought)", () => {
    const some = ["red-lantern", "noodle-stall", "koi-pond"];
    const more = [...some, "golden-arch", "foo-dog", "drum-tower"];
    const a = assignDecoAnchors(some), b = assignDecoAnchors(more);
    for (const id of some) expect(b.get(id)).toEqual(a.get(id));
  });

  it("assignment is permanent — buying any other deco never moves an owned one", () => {
    for (const owned of DECO_IDS) {
      const before = assignDecoAnchors([owned]);
      for (const extra of DECO_IDS) {
        if (extra === owned) continue;
        const after = assignDecoAnchors([owned, extra]);
        expect(after.get(owned)).toEqual(before.get(owned));
      }
    }
  });

  it("all 15 owned: same-lane neighbours overlap at most 40%", () => {
    const decos = streetPieces(1, DECO_IDS.slice()).filter(p => p.kind === "deco");
    expect(decos.length).toBe(15);
    const F = DECO_SPRITE_SCALE * UNIT_FRAC;   // draw-box width fraction at scale 1
    const byLane = {};
    for (const p of decos) (byLane[p.laneY] = byLane[p.laneY] || []).push(p);
    for (const lane of Object.values(byLane)) {
      lane.sort((x, y) => x.slot - y.slot);
      for (let i = 1; i < lane.length; i++) {
        const a = lane[i - 1], b = lane[i];
        expect(b.slot - a.slot).toBeGreaterThanOrEqual(0.6 * (F * a.scale + F * b.scale) / 2);
      }
    }
  });

  it("gateways sit on the road-center anchors", () => {
    const decos = streetPieces(1, ["golden-arch", "firecracker-arch"]).filter(p => p.kind === "deco");
    expect(decos.length).toBe(2);
    for (const p of decos) expect(p.slot).toBe(0.5);
  });

  it("pieces come back sorted back-to-front, then left-to-right", () => {
    const pieces = streetPieces(60, DECO_IDS.slice());
    for (let i = 1; i < pieces.length; i++) {
      const prev = pieces[i - 1], cur = pieces[i];
      expect(prev.laneY < cur.laneY || (prev.laneY === cur.laneY && prev.slot <= cur.slot)).toBe(true);
    }
  });
});

describe("street v2 authored layout", () => {
  const ALL = DECO_IDS.slice();

  it("every catalog deco and the Welcome Lantern have complete value metadata", () => {
    for (const id of [...DECO_IDS, WELCOME_ID]) {
      expect(DECO_META[id], id).toBeTruthy();
      expect(["gateway", "large", "medium", "small"]).toContain(DECO_META[id].cls);
      expect(["market", "garden", "festival", "welcome"]).toContain(DECO_META[id].set);
      expect(["light", "food", "water", "flutter", "celebrate"]).toContain(DECO_META[id].behavior);
    }
  });

  it("has 18 unique, in-bounds authored plots across every lane and size", () => {
    expect(STREET_PLOTS).toHaveLength(18);
    expect(new Set(STREET_PLOTS.map(p => p.id)).size).toBe(18);
    for (const p of STREET_PLOTS) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(["back", "mid", "front"]).toContain(p.lane);
      expect(["gateway", "large", "medium", "small"]).toContain(p.size);
    }
  });

  it("enforces typed plot compatibility with smaller items allowed upward", () => {
    const bySize = size => STREET_PLOTS.find(p => p.size === size);
    expect(itemFitsPlot("golden-arch", bySize("gateway"))).toBe(true);
    expect(itemFitsPlot("golden-arch", bySize("large"))).toBe(false);
    expect(itemFitsPlot("noodle-stall", bySize("large"))).toBe(true);
    expect(itemFitsPlot("noodle-stall", bySize("medium"))).toBe(false);
    expect(itemFitsPlot("tea-sign", bySize("large"))).toBe(true);
    expect(itemFitsPlot("tea-sign", bySize("medium"))).toBe(true);
    expect(itemFitsPlot("red-lantern", bySize("small"))).toBe(true);
    expect(itemFitsPlot("red-lantern", bySize("medium"))).toBe(true);
    expect(itemFitsPlot("red-lantern", bySize("gateway"))).toBe(false);
  });

  it("normalizes corrupt layouts idempotently without mutating the input", () => {
    const input = {
      v: 99, welcomeOwned: true, coachDone: true,
      placements: {
        "plot-small-01": "red-lantern",
        "plot-small-02": "red-lantern",       // duplicate
        "plot-small-03": "golden-arch",       // incompatible
        "plot-medium-01": "not-owned",
        "unknown-plot": "tea-sign",
      },
    };
    const before = structuredClone(input);
    const n = normalizeStreetLayout(input, ["red-lantern", "golden-arch", "tea-sign"]);
    expect(input).toEqual(before);
    expect(n).toEqual({
      v: 3, welcomeOwned: true, coachDone: true,
      placements: { "plot-small-01": "red-lantern" },
      name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
    });
    expect(normalizeStreetLayout(n, ["red-lantern", "golden-arch", "tea-sign"])).toEqual(n);
  });

  it("Welcome Lantern is additive only when its earned flag is set", () => {
    expect(streetOwnedIds(["red-lantern"], defaultStreetLayout())).toEqual(["red-lantern"]);
    expect(streetOwnedIds(["red-lantern"], { ...defaultStreetLayout(), welcomeOwned: true }))
      .toEqual(["red-lantern", WELCOME_ID]);
  });

  it("streetInventory lists only placeable street items, tagged and filtered by placement", () => {
    const owned = ["red-lantern", "panda", "market", "sakura-fx", "bells", "tea-sign"];
    const layout = placeStreetItem(defaultStreetLayout(), owned, "red-lantern", "plot-small-01");
    expect(streetInventory(owned, layout, "all")).toEqual([
      { id: "red-lantern", placed: true },
      { id: "tea-sign", placed: false },
    ]);
    expect(streetInventory(owned, layout, "placed")).toEqual([{ id: "red-lantern", placed: true }]);
    expect(streetInventory(owned, layout, "stored")).toEqual([{ id: "tea-sign", placed: false }]);
    expect(streetInventory(owned, { ...layout, welcomeOwned: true }, "all"))
      .toContainEqual({ id: WELCOME_ID, placed: false });
  });

  it("place, move, store and swap are immutable", () => {
    const owned = ["red-lantern", "paper-umbrella", "tea-sign"];
    const start = defaultStreetLayout();
    const a = placeStreetItem(start, owned, "red-lantern", "plot-small-02");
    expect(start.placements).toEqual({});
    expect(a.placements["plot-small-02"]).toBe("red-lantern");
    const b = placeStreetItem(a, owned, "paper-umbrella", "plot-small-03");
    const swapped = placeStreetItem(b, owned, "red-lantern", "plot-small-03");
    expect(swapped.placements["plot-small-03"]).toBe("red-lantern");
    expect(swapped.placements["plot-small-02"]).toBe("paper-umbrella");
    const moved = placeStreetItem(swapped, owned, "tea-sign", "plot-medium-01");
    const stored = storeStreetItem(moved, owned, "tea-sign");
    expect(Object.values(stored.placements)).not.toContain("tea-sign");
    expect(unplacedStreetItems(owned, stored)).toContain("tea-sign");
  });

  it("rejects an occupied target when the displaced item cannot fit the source", () => {
    const owned = ["red-lantern", "tea-sign"];
    let l = placeStreetItem(defaultStreetLayout(), owned, "red-lantern", "plot-small-02");
    l = placeStreetItem(l, owned, "tea-sign", "plot-medium-01");
    const rejected = placeStreetItem(l, owned, "red-lantern", "plot-medium-01");
    expect(rejected).toEqual(l); // medium tea sign cannot move into the small source plot
  });

  it("reports compatible empty plots independently of occupied compatible plots", () => {
    const owned = ["red-lantern"];
    const l = placeStreetItem(defaultStreetLayout(), owned, "red-lantern", "plot-small-02");
    expect(compatibleStreetPlots("red-lantern", l).some(p => p.id === "plot-small-02")).toBe(true);
    expect(compatibleStreetPlots("red-lantern", l, { includeOccupied: false })
      .some(p => p.id === "plot-small-02")).toBe(false);
  });

  it("firstFreeStreetPlot returns a free compatible plot when one is open", () => {
    const l = defaultStreetLayout();
    const plotId = firstFreeStreetPlot("red-lantern", l);
    expect(plotId).not.toBeNull();
    expect(itemFitsPlot("red-lantern", plotId)).toBe(true);
    expect(l.placements[plotId]).toBeUndefined();
  });

  it("firstFreeStreetPlot returns null once every compatible plot is occupied", () => {
    // "large" items only fit the 5 "large" plots (gateway/large/medium/small
    // plots all outrank them except gateway, which large items can't use) —
    // far fewer plots to fill than a "small" item, which fits everywhere
    // non-gateway. Fillers just need to fit a large plot (rank <= large).
    const largePlots = STREET_PLOTS.filter(p => p.size === "large").map(p => p.id);
    const fillers = ["red-lantern", "paper-umbrella", "goldfish-banner", "foo-dog", "koi-pond"];
    expect(fillers).toHaveLength(largePlots.length);
    let l = defaultStreetLayout();
    largePlots.forEach((plotId, i) => {
      l = placeStreetItem(l, fillers, fillers[i], plotId);
    });
    expect(largePlots.every(id => Object.keys(l.placements).includes(id))).toBe(true);
    expect(firstFreeStreetPlot("drum-tower", l)).toBeNull();
  });

  it("firstFreeStreetPlot returns null for an item that fits no plot", () => {
    expect(firstFreeStreetPlot("no-such-item", defaultStreetLayout())).toBeNull();
  });

  it("auto-arranges all 15 catalog items plus Welcome exactly once with room left", () => {
    const l = autoArrangeStreet(ALL, { ...defaultStreetLayout(), welcomeOwned: true });
    const ids = Object.values(l.placements);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(16);
    expect(ids.sort()).toEqual([...ALL, WELCOME_ID].sort());
    expect(STREET_PLOTS.length - ids.length).toBe(2);
    for (const [plotId, id] of Object.entries(l.placements)) expect(itemFitsPlot(id, plotId)).toBe(true);
  });

  it("auto-arrange preserves every valid existing placement", () => {
    let l = placeStreetItem(defaultStreetLayout(), ALL, "red-lantern", "plot-small-05");
    l = placeStreetItem(l, ALL, "golden-arch", "plot-gateway-02");
    const a = autoArrangeStreet(ALL, l);
    expect(a.placements["plot-small-05"]).toBe("red-lantern");
    expect(a.placements["plot-gateway-02"]).toBe("golden-arch");
  });

  it("legacy migration keeps all owned catalog items and leaves Welcome unplaced", () => {
    const l = migrateLegacyStreet(ALL, { welcomeOwned: true });
    const ids = Object.values(l.placements);
    expect(ids).toHaveLength(15);
    expect(new Set(ids)).toEqual(new Set(ALL));
    expect(l.welcomeOwned).toBe(true);
    expect(ids).not.toContain(WELCOME_ID);
    expect(unplacedStreetItems(ALL, l)).toEqual([WELCOME_ID]);
  });

  it("v2 streetPieces uses plot positions, metadata, tiers and the welcome sprite alias", () => {
    let l = { ...defaultStreetLayout(), welcomeOwned: true };
    l = placeStreetItem(l, ["koi-pond"], "koi-pond", "plot-medium-01");
    l = placeStreetItem(l, ["koi-pond"], WELCOME_ID, "plot-small-02");
    const pieces = streetPieces(1, ["koi-pond"], { "koi-pond": 3 }, l);
    const koi = pieces.find(p => p.id === "koi-pond");
    const welcome = pieces.find(p => p.id === WELCOME_ID);
    expect(koi).toMatchObject({ plotId: "plot-medium-01", behavior: "water", tier: 3 });
    expect(welcome).toMatchObject({ plotId: "plot-small-02", behavior: "light", spriteId: "red-lantern" });
  });

  it("one-screen metrics fit portrait and landscape without horizontal sections", () => {
    const portrait = streetWorldMetrics(390, 400);
    expect(portrait).toMatchObject({ worldW: 390, sections: 1 });
    expect(portrait.unit).toBeGreaterThan(0);
    const landscape = streetWorldMetrics(844, 390);
    expect(landscape.worldW).toBe(844);
    expect(landscape.sections).toBe(1);
    expect(streetWorldMetrics(390, 400)).toEqual(portrait);
  });
});

describe("streetLayout v3 ownership fields", () => {
  it("defaults the five new fields", () => {
    expect(defaultStreetLayout()).toEqual({
      v: 3, placements: {}, welcomeOwned: false, coachDone: false,
      name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
    });
    expect(STREET_LAYOUT_VERSION).toBe(3);
  });

  it("normalizes and defends the new fields", () => {
    const out = normalizeStreetLayout({
      v: 2, placements: {}, name: "  My Street  ",
      savedLayouts: [{ name: "A", placements: {} }, "junk", { name: "B", placements: {} },
                     { name: "C", placements: {} }, { name: "D", placements: {} }],
      keepsakes: [{ id: "k1", kind: "welcome", day: "2026-07-23" }, null],
      setsCompleted: ["market", "market", 7, "garden"],
      lastVisitDay: "2026-07-23",
    }, []);
    expect(out.v).toBe(3);
    expect(out.name).toBe("My Street");            // trimmed, capped at 24
    expect(out.savedLayouts).toHaveLength(3);      // capped at 3, junk dropped
    expect(out.keepsakes).toEqual([{ id: "k1", kind: "welcome", day: "2026-07-23" }]); // nulls dropped
    expect(out.setsCompleted).toEqual(["market", "garden"]); // deduped, non-strings dropped
    expect(out.lastVisitDay).toBe("2026-07-23");
  });

  it("coerces a missing/garbage lastVisitDay to null and name to ''", () => {
    const out = normalizeStreetLayout({ name: 7, lastVisitDay: 123 }, []);
    expect(out.name).toBe("");
    expect(out.lastVisitDay).toBeNull();
  });
});
