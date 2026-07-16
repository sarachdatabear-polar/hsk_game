import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RES = join(ROOT, "native", "android-res");

function pngSize(path) {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe("deterministic Android branding", () => {
  it("tracks branded launcher anchors at every density", () => {
    for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
      for (const name of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]) {
        expect(existsSync(join(RES, `mipmap-${density}`, name)), `${density}/${name}`).toBe(true);
      }
    }
    expect(pngSize(join(RES, "mipmap-xxxhdpi", "ic_launcher.png"))).toEqual({ width: 192, height: 192 });
  });

  it("tracks a portrait Lucky Cat splash instead of Capacitor fallback art", () => {
    expect(pngSize(join(RES, "drawable-nodpi", "splash.png"))).toEqual({ width: 1080, height: 1920 });
  });

  it("release sync always stages the tracked brand pack", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["cap:sync"]).toContain("npm run android:brand");
    expect(readFileSync(join(ROOT, "scripts", "build_apk.ps1"), "utf8")).toContain("npm run cap:sync");
  });

  it("authoring script contains no retired NorthBear identity", () => {
    const source = readFileSync(join(ROOT, "scripts", "make_android_icons.py"), "utf8");
    expect(source).not.toMatch(/NorthBear|熊|msyhbd/i);
    expect(source).toContain('pwa" / "icons" / "icon-512.png');
  });
});
