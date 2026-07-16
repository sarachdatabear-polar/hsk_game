#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "native", "android-res");
const TARGET = path.join(ROOT, "android", "app", "src", "main", "res");

if (!fs.existsSync(SOURCE)) {
  console.error(`android-branding: missing tracked resource pack: ${SOURCE}`);
  process.exit(1);
}
if (!fs.existsSync(TARGET)) {
  console.error("android-branding: Android project missing; run npx cap add android first");
  process.exit(1);
}

// Capacitor scaffolds white/blue splash variants in many qualified drawable
// directories. Remove every old variant so Android cannot select one instead
// of the single tracked drawable-nodpi Lucky Cat splash.
for (const name of fs.readdirSync(TARGET)) {
  if (!name.startsWith("drawable")) continue;
  const oldSplash = path.join(TARGET, name, "splash.png");
  if (fs.existsSync(oldSplash)) fs.rmSync(oldSplash);
}

fs.cpSync(SOURCE, TARGET, { recursive: true, force: true });

const required = [
  "mipmap-mdpi/ic_launcher.png",
  "mipmap-xxxhdpi/ic_launcher_foreground.png",
  "mipmap-anydpi-v26/ic_launcher.xml",
  "drawable-nodpi/splash.png",
];
for (const rel of required) {
  if (!fs.existsSync(path.join(TARGET, rel))) {
    console.error(`android-branding: failed to stage ${rel}`);
    process.exit(1);
  }
}
console.log(`android-branding: staged ${required.length} verified Lucky Cat resource anchors`);
