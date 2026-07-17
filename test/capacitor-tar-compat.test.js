import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const patch = readFileSync(new URL("../scripts/patch-capacitor-tar.mjs", import.meta.url), "utf8");

describe("Capacitor 6 patched-tar compatibility", () => {
  it("pins a non-vulnerable tar and reapplies the compatibility patch after installs", () => {
    expect(pkg.overrides?.["@capacitor/cli"]?.tar).toBe("7.5.20");
    expect(pkg.scripts?.postinstall).toBe("node scripts/patch-capacitor-tar.mjs");
    expect(patch).toContain("tar_1.default || tar_1");
    expect(patch).toContain("Capacitor CLI not installed; nothing to patch");
    expect(patch).toContain("expected Capacitor template call not found");
  });
});
