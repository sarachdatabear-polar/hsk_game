#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "assets", "asset-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const allowedStatuses = new Set(manifest.status_values);
const approvedStatuses = new Set(["approved", "integrated"]);

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`asset validation: ${message}`);
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

  const filePath = path.join(root, "assets", asset.file);
  if (approvedStatuses.has(asset.status) && !fs.existsSync(filePath)) {
    fail(`${asset.id} is ${asset.status} but ${asset.file} is missing`);
    continue;
  }

  if (!fs.existsSync(filePath) || !asset.file.endsWith(".png")) {
    continue;
  }

  const size = readPngSize(filePath);
  if (asset.width && size.width !== asset.width) {
    fail(`${asset.file} width ${size.width} !== ${asset.width}`);
  }
  if (asset.height && size.height !== asset.height) {
    fail(`${asset.file} height ${size.height} !== ${asset.height}`);
  }

  if (asset.type === "sprite-sheet") {
    if (asset.frameWidth * asset.frames !== asset.width) {
      fail(`${asset.file} frameWidth * frames does not match width`);
    }
    if (asset.frameHeight !== asset.height) {
      fail(`${asset.file} frameHeight does not match height`);
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
