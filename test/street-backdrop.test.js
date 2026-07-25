import { describe, it, expect } from "vitest";
import { backdropFor, backdropAsset } from "../src/street-backdrop.js";

describe("street-backdrop", () => {
  it("maps morning and day to the day scene", () => {
    expect(backdropFor("morning")).toBe("day");
    expect(backdropFor("day")).toBe("day");
  });
  it("maps dusk and night to the market scene", () => {
    expect(backdropFor("dusk")).toBe("market");
    expect(backdropFor("night")).toBe("market");
  });
  it("defaults unknown values to the day scene", () => {
    expect(backdropFor(undefined)).toBe("day");
    expect(backdropFor("noon")).toBe("day");
  });
  it("resolves each kind to its wide asset id", () => {
    expect(backdropAsset("day")).toBe("bg-street-wide");
    expect(backdropAsset("market")).toBe("bg-street-market-wide");
  });
  it("falls back to the day asset for an unknown kind", () => {
    expect(backdropAsset("bogus")).toBe("bg-street-wide");
  });
});
