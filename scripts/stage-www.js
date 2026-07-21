#!/usr/bin/env node
/* Assemble the shippable web assets into www/ for Capacitor.
 *
 * Capacitor copies the ENTIRE webDir into the native project, so webDir must be
 * a clean folder holding only what the app ships — never the repo root (which
 * would drag in node_modules/.git/android/src/test). This stages exactly the
 * five asset groups the game loads at runtime. Run after `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WWW = path.join(ROOT, "www");

// files/dirs the running game actually references (index.html + bundle + data + pwa).
// Audio is staged separately below — its set depends on the target (APK vs Pages).
const ITEMS = ["index.html", "privacy.html", "dist", "data", "pwa", "sw.js", "assets"];

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

// Audio set selection: --audio=core|full CLI flag, else AUDIO_SET env var,
// else default "full". The web/Pages deploy ships every generated mp3 (the
// complete Xiaoxiao voice set for the app's lazy-fetch ladder); the
// Capacitor/APK path passes --audio=core explicitly to keep the app small,
// staging only the bundled set listed in audio/index.json. Falls back to the
// core list on a checkout without index-full.json.
const audioFlag = process.argv.find((a) => a.startsWith("--audio="));
const AUDIO_SET = audioFlag ? audioFlag.slice("--audio=".length) : (process.env.AUDIO_SET || "full");
const AUDIO_SRC = path.join(ROOT, "audio");
const AUDIO_DST = path.join(WWW, "audio");
fs.mkdirSync(AUDIO_DST, { recursive: true });
for (const f of ["index.json", "index-full.json"]) {
  const p = path.join(AUDIO_SRC, f);
  if (fs.existsSync(p)) { fs.copyFileSync(p, path.join(AUDIO_DST, f)); files++; }
}
const fullPath = path.join(AUDIO_SRC, "index-full.json");
const listFile = AUDIO_SET === "full" && fs.existsSync(fullPath) ? "index-full.json" : "index.json";
const audioList = JSON.parse(fs.readFileSync(path.join(AUDIO_SRC, listFile), "utf8"));
for (const h of audioList) {
  const f = path.join(AUDIO_SRC, `${h}.mp3`);
  if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(AUDIO_DST, `${h}.mp3`)); files++; }
}
console.log(`stage-www: copied ${ITEMS.length} groups (${files} files) into www/ — audio set "${AUDIO_SET}" (${audioList.length} listed)`);
