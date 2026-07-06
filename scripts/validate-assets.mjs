#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "assets", "asset-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const allowedStatuses = new Set(manifest.status_values);
const allowedTypes = new Set(manifest.types || []);
const approvedStatuses = new Set(["approved", "integrated"]);
const frameTypes = new Set(["ui-surface", "ui-frame"]);

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`asset validation: ${message}`);
}

function stateFile(asset, state) {
  return state === "default" ? asset.file : asset.file.replace(/\.png$/, `-${state}.png`);
}

function assetFiles(asset) {
  const states = asset.states || ["default"];
  return states.map(state => stateFile(asset, state));
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`${path.basename(filePath)} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

for (const asset of manifest.assets) {
  if (!allowedStatuses.has(asset.status)) {
    fail(`${asset.id} has invalid status '${asset.status}'`);
  }

  if (allowedTypes.size && !allowedTypes.has(asset.type)) {
    fail(`${asset.id} has invalid type '${asset.type}'`);
  }

  if (frameTypes.has(asset.type)) {
    if (!Object.prototype.hasOwnProperty.call(asset, "slice")) {
      fail(`${asset.id} is missing slice`);
    } else if (
      asset.slice !== null &&
      (!Array.isArray(asset.slice) ||
        asset.slice.length !== 4 ||
        asset.slice.some(n => !Number.isFinite(n)))
    ) {
      fail(`${asset.id} slice must be null or four numbers`);
    }
  }

  if (asset.states && JSON.stringify(asset.states) !== JSON.stringify(["default", "pressed", "disabled"])) {
    fail(`${asset.id} states must be default/pressed/disabled`);
  }

  if (asset.type === "sprite-sheet") {
    if (asset.frameWidth * asset.frames !== asset.w) {
      fail(`${asset.file} frameWidth * frames does not match width`);
    }
    if (asset.frameHeight !== asset.h) {
      fail(`${asset.file} frameHeight does not match height`);
    }
  }

  if (!approvedStatuses.has(asset.status)) {
    continue;
  }

  for (const file of assetFiles(asset)) {
    const filePath = path.join(root, "assets", file);
    if (!fs.existsSync(filePath)) {
      fail(`${asset.id} is ${asset.status} but ${file} is missing`);
      continue;
    }

    if (!file.endsWith(".png")) {
      continue;
    }

    const size = readPngSize(filePath);
    if (Number.isFinite(asset.w) && size.width !== asset.w) {
      fail(`${file} width ${size.width} !== ${asset.w}`);
    }
    if (Number.isFinite(asset.h) && size.height !== asset.h) {
      fail(`${file} height ${size.height} !== ${asset.h}`);
    }
  }
}

const iconSpritePath = path.join(root, "assets", "ui-icons.svg");
if (fs.existsSync(iconSpritePath)) {
  const svg = fs.readFileSync(iconSpritePath, "utf8");
  for (const id of manifest.required_icons) {
    const symbolPattern = new RegExp(
      `<symbol\\b[^>]*\\bid="${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"`
    );
    if (!symbolPattern.test(svg)) {
      fail(`ui-icons.svg missing symbol '${id}'`);
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`asset validation: checked ${manifest.assets.length} manifest assets`);
