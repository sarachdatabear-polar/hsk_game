import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { STRINGS } from "../src/i18n.js";

// The CSV in docs/i18n/ is the artifact a paid native reviewer actually works
// from. Nothing tested it until now, and it drifted three separate times: it
// went 349 rows stale, and three whole families (cat.*, quests.*, notify.cat.*)
// sat in the unclassified P3 bucket while the review doc claimed their tier was
// P0/P2. Each drift was found by hand, months late. These tests make the sheet
// fail the build instead.
const CSV = readFileSync(new URL("../docs/i18n/thai-review-sheet.csv", import.meta.url), "utf8");

// RFC-4180 parser: fields may contain commas, doubled quotes and newlines, all
// of which appear in real UI copy. A naive split(",") silently mangles rows.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") continue;
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [header, ...dataRows] = parseCsv(CSV);
const sheet = dataRows.map(([priority, key, english, thai_draft, corrected_thai, notes]) =>
  ({ priority, key, english, thai_draft, corrected_thai, notes }));
const byKey = new Map(sheet.map((r) => [r.key, r]));

describe("thai review sheet — shape", () => {
  it("has the six columns apply-thai-review-sheet.mjs joins on", () => {
    expect(header).toEqual(["priority", "key", "english", "thai_draft", "corrected_thai", "notes"]);
  });

  it("ships with the reviewer's two columns blank", () => {
    // A pre-filled corrected_thai would be an engineering guess wearing a
    // native reviewer's authority — the whole point of the sign-off.
    for (const r of sheet) {
      expect(r.corrected_thai, r.key).toBe("");
      expect(r.notes, r.key).toBe("");
    }
  });

  it("is sorted so the highest priority is reviewed first", () => {
    const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const ranks = sheet.map((r) => rank[r.priority]);
    expect(ranks.every((v) => v !== undefined)).toBe(true);
    expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe("thai review sheet — in sync with src/i18n.js", () => {
  // The regeneration command, for whoever this test fails on:
  //   node docs/i18n/scripts/extract-thai-review-sheet.mjs > docs/i18n/thai-review-sheet.csv
  it("covers every translatable key", () => {
    const missing = Object.keys(STRINGS.en).filter((k) => !byKey.has(k));
    expect(missing, "sheet is stale — regenerate it").toEqual([]);
  });

  it("contains no keys that no longer exist", () => {
    const dead = sheet.map((r) => r.key).filter((k) => !(k in STRINGS.en));
    expect(dead, "sheet lists dead keys — regenerate it").toEqual([]);
  });

  it("quotes the English and Thai that are actually shipping", () => {
    // A reviewer correcting a draft that has since changed wastes their time
    // and, worse, apply-thai-review-sheet.mjs would write the correction to a
    // string they never saw.
    for (const r of sheet) {
      expect(r.english, r.key).toBe(STRINGS.en[r.key]);
      expect(r.thai_draft, r.key).toBe(STRINGS.th[r.key] ?? "");
    }
  });
});

describe("thai review sheet — money and legal copy is reviewed first", () => {
  const at = (key) => byKey.get(key)?.priority;

  it("puts the whole Supporter purchase sheet at P0", () => {
    // supporter.* is the sheet a Thai buyer reads immediately before paying
    // ฿79 — price, "secure checkout", the benefits they are being sold, and
    // the restore-purchase promise. It had NO rule at all and sat at P3, below
    // 180 rows of minor copy, which is exactly the failure the extractor's own
    // comment warns about for shop.*/item.*.
    const keys = Object.keys(STRINGS.en).filter((k) => k.startsWith("supporter."));
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(at(k), k).toBe("P0");
  });

  it("puts the legal policy links at P0", () => {
    // These label the Terms, Refund and Privacy pages. Mistranslating the link
    // to a refund policy is a consumer-protection problem, not a polish item.
    for (const k of ["settings.privacy", "settings.terms", "settings.refund"]) {
      expect(at(k), k).toBe("P0");
    }
  });

  it("keeps the families that previously fell through", () => {
    // Regression pins for the three drifts already found by hand.
    for (const k of Object.keys(STRINGS.en)) {
      if (k.startsWith("notify.")) expect(at(k), k).toBe("P0");
      else if (k.startsWith("quests.") || k.startsWith("quest.")) expect(at(k), k).toBe("P1");
      else if (k.startsWith("cat.")) expect(at(k), k).toBe("P2");
    }
  });

  it("leaves no key unclassified by accident above P3", () => {
    // Every P3 row should be genuinely minor: if a key matches a money/account
    // word and still landed at P3, a rule is missing.
    const moneyish = /^(iap|account|supporter)\.|price|refund|purchase|checkout/i;
    const stragglers = sheet.filter((r) => r.priority === "P3" && moneyish.test(r.key));
    expect(stragglers.map((r) => r.key)).toEqual([]);
  });
});
