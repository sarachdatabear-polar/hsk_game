#!/usr/bin/env node
/* Assemble the shippable web assets into www/ for Capacitor.
 *
 * Capacitor copies the ENTIRE webDir into the native project, so webDir must be
 * a clean folder holding only what the app ships — never the repo root (which
 * would drag in node_modules/.git/android/src/test). This stages exactly the
 * five asset groups the game loads at runtime. Run after `npm run build`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WWW = path.join(ROOT, "www");

// files/dirs the running game actually references (index.html + bundle + data + audio + pwa)
const ITEMS = ["index.html", "dist", "data", "audio", "pwa", "sw.js", "assets"];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

let files = 0;
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    // Skip `_`-prefixed dirs (e.g. assets/_plan/ — source art docs + reference
    // board that live beside the runtime assets but must never ship in the app).
    for (const name of fs.readdirSync(src)) {
      if (name.startsWith("_")) continue;
      copy(path.join(src, name), path.join(dst, name));
    }
  } else {
    fs.copyFileSync(src, dst);
    files++;
  }
}

for (const item of ITEMS) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) { console.error(`stage-www: missing ${item}`); process.exit(1); }
  copy(src, path.join(WWW, item));
}
console.log(`stage-www: copied ${ITEMS.length} groups (${files} files) into www/`);
