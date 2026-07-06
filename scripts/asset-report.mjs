#!/usr/bin/env node
// Reporting only. Asset validation gates correctness.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "asset-manifest.json"), "utf8")
);

const rows = manifest.assets.map(asset => ({
  id: asset.id,
  file: asset.file,
  type: asset.type,
  status: asset.status,
  priority: asset.priority,
  present: fs.existsSync(path.join(root, "assets", asset.file)) ? "yes" : "-",
}));

const cols = ["id", "file", "type", "status", "priority", "present"];
const widths = Object.fromEntries(
  cols.map(col => [col, Math.max(col.length, ...rows.map(row => String(row[col]).length))])
);
const line = row => cols.map(col => String(row[col]).padEnd(widths[col])).join("  ");

console.log(line(Object.fromEntries(cols.map(col => [col, col.toUpperCase()]))));
console.log(cols.map(col => "-".repeat(widths[col])).join("  "));
for (const row of rows) console.log(line(row));

const byStatus = {};
for (const asset of manifest.assets) byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
const p0 = manifest.assets.filter(asset => asset.priority === "P0");

console.log(
  "\nstatus:",
  Object.entries(byStatus)
    .map(([status, count]) => `${status}=${count}`)
    .join("  "),
  `| total=${manifest.assets.length} | P0=${p0.length}`
);

if ((manifest.planned_icons || []).length) {
  console.log("planned icons (not yet required):", manifest.planned_icons.join(", "));
}
