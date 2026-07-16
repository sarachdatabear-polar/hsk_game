// Apply a returned native-Thai review sheet back into src/i18n.js.
//
// Reads the reviewed CSV (same columns the extractor emits) and, for every row
// whose `corrected_thai` cell is non-empty and differs from the current draft,
// rewrites STRINGS.th[key] in src/i18n.js — touching the `th` table only, never
// `en`. Before writing anything it re-checks the doc's certified invariants:
// each correction's {placeholders} and <b> tags must still match the English
// source. Any mismatch aborts the whole run with no file change.
//
// Usage:
//   node docs/i18n/scripts/apply-thai-review-sheet.mjs docs/i18n/thai-review-sheet.csv
//   node docs/i18n/scripts/apply-thai-review-sheet.mjs <sheet.csv> --dry-run
//
// After applying: npm test && npm run build && the EN+TH responsive sweep.

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const i18nPath = path.resolve(here, "../../../src/i18n.js");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((a) => !a.startsWith("--"));
if (!csvPath) {
  console.error("usage: node apply-thai-review-sheet.mjs <reviewed.csv> [--dry-run]");
  process.exit(2);
}

const { STRINGS } = await import(i18nPath);
const en = STRINGS.en;
const th = STRINGS.th;

// --- minimal RFC-4180 CSV parser (handles quoted fields, "" escapes, CRLF) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const parsed = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = parsed.shift();
const col = (name) => header.indexOf(name);
for (const name of ["key", "corrected_thai"]) {
  if (col(name) < 0) { console.error(`missing column: ${name}`); process.exit(2); }
}

const placeholders = (s) => [...String(s).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
const boldTags = (s) => (String(s).match(/<\/?b>/g) || []).sort();
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const edits = [];
const errors = [];
for (const r of parsed) {
  if (!r.length) continue;
  const key = r[col("key")];
  const corrected = (r[col("corrected_thai")] || "").trim();
  if (!key || !corrected) continue;
  if (!(key in en)) { errors.push(`unknown key (not in STRINGS.en): ${key}`); continue; }
  if (corrected === th[key]) continue; // no change
  if (!sameSet(placeholders(en[key]), placeholders(corrected)))
    errors.push(`placeholder mismatch for ${key}: en=${JSON.stringify(placeholders(en[key]))} corrected=${JSON.stringify(placeholders(corrected))}`);
  if (!sameSet(boldTags(en[key]), boldTags(corrected)))
    errors.push(`<b> tag mismatch for ${key}`);
  edits.push({ key, corrected });
}

if (errors.length) {
  console.error(`ABORT — ${errors.length} parity/validity error(s), no file written:\n` + errors.join("\n"));
  process.exit(1);
}
if (!edits.length) {
  console.error("No corrections to apply (corrected_thai empty or identical to current draft).");
  process.exit(0);
}

// --- rewrite the th table only ---
let src = fs.readFileSync(i18nPath, "utf8");
const thStart = src.indexOf("\n  th: {");
if (thStart < 0) { console.error("could not locate `th: {` block in src/i18n.js"); process.exit(1); }
let head = src.slice(0, thStart);
let thRegion = src.slice(thStart);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const applied = [];
for (const { key, corrected } of edits) {
  // match  "key": "<any escaped string literal>"  (first/only occurrence in th)
  const re = new RegExp(`("${escapeRe(key)}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(thRegion)) { errors.push(`could not find th entry to replace for ${key}`); continue; }
  thRegion = thRegion.replace(re, `$1${JSON.stringify(corrected)}`);
  applied.push(key);
}

if (errors.length) {
  console.error(`ABORT — ${errors.length} entries not found, no file written:\n` + errors.join("\n"));
  process.exit(1);
}

if (dryRun) {
  console.error(`[dry-run] would apply ${applied.length} correction(s):\n  ` + applied.join("\n  "));
  process.exit(0);
}

fs.writeFileSync(i18nPath, head + thRegion);
console.error(`Applied ${applied.length} Thai correction(s) to src/i18n.js:\n  ` + applied.join("\n  "));
console.error("\nNext: npm test && npm run build && EN+TH responsive sweep, then fill the sign-off block.");
