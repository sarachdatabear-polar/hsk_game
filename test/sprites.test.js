import { describe, it, expect } from "vitest";
import { createSpriteRegistry } from "../src/sprites.js";

function fakeImages() {
  const created = [];
  return {
    created,
    makeImage() {
      const image = { complete: false, naturalWidth: 0, src: "" };
      created.push(image);
      return image;
    },
  };
}

describe("lazy sprite registry", () => {
  it("does not fetch the cosmetic catalog at construction or empty preload", () => {
    const fake = fakeImages();
    const registry = createSpriteRegistry({ makeImage: fake.makeImage });
    registry.loadSprites();
    expect(fake.created).toHaveLength(0);
  });

  it("loads a requested sprite once and returns it only when ready", () => {
    const fake = fakeImages();
    const registry = createSpriteRegistry({ makeImage: fake.makeImage });
    expect(registry.sprite("cat-walk")).toBeNull();
    expect(fake.created).toHaveLength(1);
    expect(fake.created[0].src).toBe("assets/cat-walk.png");
    expect(registry.sprite("cat-walk")).toBeNull();
    expect(fake.created).toHaveLength(1);
    fake.created[0].complete = true;
    fake.created[0].naturalWidth = 1536;
    expect(registry.sprite("cat-walk")).toBe(fake.created[0]);
  });

  it("uses svg paths for effect sprites and ignores unknown ids", () => {
    const fake = fakeImages();
    const registry = createSpriteRegistry({ makeImage: fake.makeImage });
    registry.sprite("fx-correct");
    expect(fake.created[0].src).toBe("assets/fx-correct.svg");
    expect(registry.sprite("not-a-sprite")).toBeNull();
    expect(fake.created).toHaveLength(1);
  });

  it("notifies a static canvas when a lazy sprite becomes ready", () => {
    const fake = fakeImages();
    const ready = [];
    const registry = createSpriteRegistry({ makeImage: fake.makeImage, onReady:name => ready.push(name) });
    registry.sprite("bg-street");
    expect(ready).toEqual([]);
    fake.created[0].onload();
    expect(ready).toEqual(["bg-street"]);
  });
});
