import { describe, it, expect } from "vitest";
import { createAssets, REGISTRY, frameCSS, img } from "../src/assets.js";

function fakeImages() {
  const created = [];
  const makeImage = () => {
    const image = { complete: false, naturalWidth: 0, onload: null, _src: "" };
    Object.defineProperty(image, "src", {
      set(v) {
        image._src = v;
      },
      get() {
        return image._src;
      },
    });
    created.push(image);
    return image;
  };
  return { created, makeImage };
}

function fakeRoot() {
  const vars = {};
  return {
    vars,
    style: {
      setProperty: (key, value) => {
        vars[key] = value;
      },
    },
  };
}

const fixture = {
  assets: [
    {
      id: "ui-card-paper",
      file: "ui-card-paper.png",
      type: "ui-surface",
      status: "approved",
      priority: "P0",
      slice: [24, 24, 24, 24],
      fallback: "css:.card",
    },
    {
      id: "ui-button-primary",
      file: "ui-button-primary.png",
      type: "ui-surface",
      status: "approved",
      priority: "P0",
      slice: [16, 16, 16, 16],
      states: ["default", "pressed", "disabled"],
      fallback: "css:.big.primary",
    },
    {
      id: "ui-tab",
      file: "ui-tab.png",
      type: "ui-surface",
      status: "planned",
      priority: "P0",
      slice: null,
      fallback: "css:.chip",
    },
    {
      id: "ui-badge-mastery",
      file: "ui-badge-mastery.png",
      type: "ui-surface",
      status: "approved",
      priority: "P0",
      slice: null,
      fallback: "css:.hud-round",
    },
    {
      id: "cat-walk",
      file: "cat-walk.png",
      type: "sprite-sheet",
      status: "approved",
      priority: "P0",
      fallback: "canvas:drawCat",
    },
    {
      id: "bg-results",
      file: "bg-results.png",
      type: "background",
      status: "approved",
      priority: "P1",
      fallback: "css:.screen.festive",
    },
    {
      id: "ui-icons",
      file: "ui-icons.svg",
      type: "icon-sprite",
      status: "integrated",
      priority: "P0",
      fallback: "svg:inline",
    },
  ],
};

describe("createAssets", () => {
  it("preload() only fetches P0 approved/integrated PNGs", () => {
    const { created, makeImage } = fakeImages();
    createAssets(fixture, { makeImage, root: fakeRoot() }).preload();
    expect(created.map(i => i._src).sort()).toEqual([
      "assets/cat-walk.png",
      "assets/ui-badge-mastery.png",
      "assets/ui-button-primary-disabled.png",
      "assets/ui-button-primary-pressed.png",
      "assets/ui-button-primary.png",
      "assets/ui-card-paper.png",
    ]);
  });

  it("img() returns null until the image has loaded", () => {
    const { created, makeImage } = fakeImages();
    const assets = createAssets(fixture, { makeImage, root: fakeRoot() });
    assets.preload();
    expect(assets.img("cat-walk")).toBeNull();
    const image = created.find(i => i._src === "assets/cat-walk.png");
    image.complete = true;
    image.naturalWidth = 1536;
    expect(assets.img("cat-walk")).toBe(image);
  });

  it("img() lazy-loads P1 assets on first call", () => {
    const { created, makeImage } = fakeImages();
    const assets = createAssets(fixture, { makeImage, root: fakeRoot() });
    expect(assets.img("bg-results")).toBeNull();
    expect(created.some(i => i._src === "assets/bg-results.png")).toBe(true);
  });

  it("falls back safely for unknown ids", () => {
    const assets = createAssets(fixture, {
      makeImage: fakeImages().makeImage,
      root: fakeRoot(),
    });
    expect(assets.img("nope")).toBeNull();
    expect(assets.frameCSS("nope")).toBe("none");
  });

  it("frameCSS() is 'none' before load and never fetches planned assets", () => {
    const { created, makeImage } = fakeImages();
    const assets = createAssets(fixture, { makeImage, root: fakeRoot() });
    assets.preload();
    expect(assets.frameCSS("ui-card-paper")).toBe("none");
    expect(assets.frameCSS("ui-tab")).toBe("none");
    expect(created.some(i => i._src === "assets/ui-tab.png")).toBe(false);
  });

  it("frameCSS() returns the shorthand and sets --f-<id> after load", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const assets = createAssets(fixture, { makeImage, root });
    assets.preload();
    const image = created.find(i => i._src === "assets/ui-card-paper.png");
    image.complete = true;
    image.naturalWidth = 96;
    image.onload();
    const expected =
      'url("assets/ui-card-paper.png") 24 24 24 24 fill / 24px 24px 24px 24px stretch';
    expect(assets.frameCSS("ui-card-paper")).toBe(expected);
    expect(root.vars["--f-ui-card-paper"]).toBe(expected);
  });

  it("state variants resolve to sibling files and their own vars", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const assets = createAssets(fixture, { makeImage, root });
    assets.preload();
    const pressed = created.find(i => i._src === "assets/ui-button-primary-pressed.png");
    pressed.complete = true;
    pressed.naturalWidth = 64;
    pressed.onload();
    expect(assets.frameCSS("ui-button-primary", "pressed")).toContain(
      'url("assets/ui-button-primary-pressed.png")'
    );
    expect(root.vars["--f-ui-button-primary-pressed"]).toBe(
      assets.frameCSS("ui-button-primary", "pressed")
    );
    expect(assets.frameCSS("ui-button-primary")).toBe("none");
  });

  it("a loaded ui-surface with slice:null still returns 'none'", () => {
    const { created, makeImage } = fakeImages();
    const assets = createAssets(fixture, { makeImage, root: fakeRoot() });
    assets.preload();
    const image = created.find(i => i._src === "assets/ui-badge-mastery.png");
    image.complete = true;
    image.naturalWidth = 48;
    image.onload();
    expect(assets.frameCSS("ui-badge-mastery")).toBe("none");
  });
});

describe("singleton bound to the real manifest", () => {
  it("exposes the manifest as REGISTRY", () => {
    expect(Object.keys(REGISTRY).length).toBeGreaterThan(0);
    expect(REGISTRY["cat-walk"].file).toBe("cat-walk.png");
  });

  it("degrades to fallbacks without a DOM", () => {
    expect(frameCSS("ui-card-paper")).toBe("none");
    expect(img("cat-walk")).toBeNull();
    expect(img("unknown-id")).toBeNull();
  });
});
