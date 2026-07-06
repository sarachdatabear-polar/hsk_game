import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readPng, validateAssets } from "../tools/asset_pipeline.mjs";

const root = path.resolve(import.meta.dirname, "..");

describe("reference asset extraction", () => {
  test("manifest validates against source pixels", () => {
    expect(validateAssets()).toBeGreaterThan(40);
  });

  test("every exact crop has a review classification", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "metadata", "assets.json"), "utf8"));
    for (const asset of manifest.assets) {
      expect(["approved", "uncertain"]).toContain(asset.reviewStatus);
      expect(asset.transparentPng).toBe(null);
      const exact = readPng(path.join(root, asset.exactPng));
      expect(exact.width).toBe(asset.sourceRect.width);
      expect(exact.height).toBe(asset.sourceRect.height);
    }
  });
});
