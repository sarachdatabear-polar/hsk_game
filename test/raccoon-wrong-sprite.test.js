import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/sprites.js", () => ({ sprite: vi.fn() }));
vi.mock("../src/sprite-draw.js", () => ({ drawSpriteFrame: vi.fn() }));
import { sprite } from "../src/sprites.js";
import { drawSpriteFrame } from "../src/sprite-draw.js";
import { drawRaccoon } from "../src/raccoon.js";

// Every ctx method becomes a no-op; property sets land on the target.
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => (t[k] = v, true) });

describe("wrong-state sprite stopgap", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses the walk sheet for the wrong state when loaded (no vector ghost)", () => {
    sprite.mockImplementation(name => (name === "raccoon-walk" ? {} : null));
    drawRaccoon(ctx, 100, 200, 0, "wrong", 1, false);
    expect(drawSpriteFrame).toHaveBeenCalledTimes(1);
    expect(drawSpriteFrame.mock.calls[0][5]).toBe("raccoon-walk");
  });

  it("still falls back to vector when no sheet has loaded", () => {
    sprite.mockReturnValue(null);
    drawRaccoon(ctx, 100, 200, 0, "wrong", 1, false);
    expect(drawSpriteFrame).not.toHaveBeenCalled();
  });
});
