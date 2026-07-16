// Extract a native-Thai review sheet (CSV) from src/i18n.js.
//
// Emits one row per translatable key: priority, key, english source, current
// Thai draft, and two BLANK columns the reviewer fills in (corrected_thai,
// notes). The `key` column is the join key used by apply-thai-review-sheet.mjs
// to write corrections back into STRINGS.th — do not edit `key` or `english`.
//
// Usage (from repo root or anywhere):
//   node docs/i18n/scripts/extract-thai-review-sheet.mjs > docs/i18n/thai-review-sheet.csv
//
// Priority order mirrors docs/i18n/i18n-translation-review.md: P0 money/account/
// notifications first, then P1 core learning, then P2 profile/world, else P3.

import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const i18nPath = path.resolve(here, "../../../src/i18n.js");
const { STRINGS } = await import(i18nPath);

// Ordered rules — FIRST match wins. Specific P0 keys must precede the broad
// P2 shop.*/item.* prefixes, or the money copy the doc says to review first
// gets buried under P2.
const RULES = [
  // ---- P0: money, account, notifications ----
  ["P0", (k) => k.startsWith("iap.")],
  ["P0", (k) => k.startsWith("account.")], // includes account.supporterChip
  ["P0", (k) => k.startsWith("notify.streak.")],
  ["P0", (k) => k.startsWith("notify.comeback.")],
  ["P0", (k) => k === "shop.getCoins"],
  ["P0", (k) => k.startsWith("shop.supporter")],
  ["P0", (k) => k === "item.supporter"],
  ["P0", (k) => ["item.coins_s", "item.coins_m", "item.coins_l", "item.coins_xl"].includes(k)],
  ["P0", (k) => k === "toast.freeze-used"],
  ["P0", (k) => k === "streak.restUsed"],
  // ---- P1: core learning and results ----
  ["P1", (k) => ["welcome.", "scope.", "learn.", "fc.", "battle.", "tones.", "howto.", "results.", "quest."].some((p) => k.startsWith(p))],
  // ---- P2: profile, collection, world ----
  ["P2", (k) => ["profile.", "progress.", "album.", "sticker.", "milestone.", "shop.", "item.", "season.", "street.", "building.", "journey.", "nav.", "more."].some((p) => k.startsWith(p))],
];

function priorityOf(key) {
  for (const [p, test] of RULES) if (test(key)) return p;
  return "P3";
}

const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

// --- parity guard: {placeholders} and <b> tags must match EN source ---
function placeholders(s) {
  return [...String(s).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
}
function boldTags(s) {
  return (String(s).match(/<\/?b>/g) || []).sort();
}
function sameSet(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

const en = STRINGS.en;
const th = STRINGS.th;
const keys = Object.keys(en);

const rows = [];
const problems = [];
for (const key of keys) {
  const eng = en[key];
  const thai = key in th ? th[key] : "";
  if (!(key in th)) problems.push(`MISSING th value: ${key}`);
  if (!sameSet(placeholders(eng), placeholders(thai)))
    problems.push(`placeholder mismatch: ${key}  en=${JSON.stringify(placeholders(eng))} th=${JSON.stringify(placeholders(thai))}`);
  if (!sameSet(boldTags(eng), boldTags(thai)))
    problems.push(`<b> tag mismatch: ${key}`);
  rows.push({ priority: priorityOf(key), key, english: eng, thai_draft: thai });
}

rows.sort((a, b) => RANK[a.priority] - RANK[b.priority] || keys.indexOf(a.key) - keys.indexOf(b.key));

// --- RFC-4180 CSV ---
function csvField(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}
function csvRow(cells) {
  return cells.map(csvField).join(",");
}

const out = [];
out.push(csvRow(["priority", "key", "english", "thai_draft", "corrected_thai", "notes"]));
for (const r of rows) out.push(csvRow([r.priority, r.key, r.english, r.thai_draft, "", ""]));

// Emit CSV to stdout; diagnostics to stderr so a `> file` redirect stays clean.
process.stdout.write(out.join("\r\n") + "\r\n");

const counts = rows.reduce((m, r) => ((m[r.priority] = (m[r.priority] || 0) + 1), m), {});
process.stderr.write(`\nrows: ${rows.length}  ${JSON.stringify(counts)}\n`);
if (problems.length) {
  process.stderr.write(`PARITY PROBLEMS (${problems.length}):\n` + problems.join("\n") + "\n");
  process.exit(1);
} else {
  process.stderr.write("parity: OK (placeholders + <b> tags match EN for every key)\n");
}
