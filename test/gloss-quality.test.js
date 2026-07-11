import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// data/words.json: { manifest: {...}, levels: { "1": [ { h, p, e, t, lv, f, ... }, ... ], ... } }
const DATA = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));

describe("gloss quality (audit F7)", () => {
  it("glosses contain no mechanical '+' joins at any level", () => {
    // HSK1-3 cleared in audit-v50; HSK4-6 deep tail cleared in the 2026-07-10
    // gloss round (3,115 rows) — the whole corpus is '+'-free from here on.
    for (const lv of Object.keys(DATA.levels)) {
      const bad = DATA.levels[lv].filter(w => / \+ |\+ | \+/.test(w.e));
      expect(bad.map(w => `${lv}:${w.h}:${w.e}`)).toEqual([]);
    }
  });

  it("thai glosses contain no mechanical '+' joins at any level", () => {
    // The thai column is user-facing too — 18 joined rows were fixed in the
    // 2026-07-10 gloss round (e.g. 城中 'เมืองกำแพง + จีน' → 'ในเมือง').
    for (const lv of Object.keys(DATA.levels)) {
      const bad = DATA.levels[lv].filter(w => / \+ |\+ | \+/.test(w.t));
      expect(bad.map(w => `${lv}:${w.h}:${w.t}`)).toEqual([]);
    }
  });

  it("no hanzi mixes '+' and non-'+' glosses across levels", () => {
    // A word's gloss should read the same everywhere it recurs — if one level's
    // '+' join was rewritten (audit-v50 gloss fixes), every level sharing that
    // exact (hanzi, english) pair must have been rewritten too. This pins the
    // cross-level propagation fix (Task 6 fix wave) against regressions.
    const PLUS = / \+ |\+ | \+/;
    const byHanzi = new Map();
    for (const lv of Object.keys(DATA.levels)) {
      for (const w of DATA.levels[lv]) {
        if (!byHanzi.has(w.h)) byHanzi.set(w.h, []);
        byHanzi.get(w.h).push({ lv, e: w.e });
      }
    }

    const offenders = [];
    for (const [hanzi, entries] of byHanzi) {
      const hasPlus = entries.some(en => PLUS.test(en.e));
      const hasNonPlus = entries.some(en => !PLUS.test(en.e));
      if (hasPlus && hasNonPlus) {
        offenders.push(`${hanzi}: ${entries.map(en => `${en.lv}="${en.e}"`).join(", ")}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("gloss metadata gate (content round 2, ROOT 4f52c9d)", () => {
  // Round 2 (2026-07-11, 1,112 rewrites) fixed rows where a raw CC-CEDICT
  // gloss had leaked into product data with its scaffolding still attached
  // (e.g. "surname Zuo" for 坐, "bound form" tags, "used in ..." fragments).
  // These patterns must never reappear in shipped gloss text.
  const BANNED_PATTERNS = [
    /\bTw\b/,
    /abbr\. for/,
    /bound form/,
    /used in/,
    /variant of/,
    /\bcoll\./,
    /\bfig\./,
    /\blit\./,
    /\bsl\./,
    /CL:/,
    /erhua/,
    /onom\./,
  ];

  // "surname X" is only a *correct, complete* gloss for words that are
  // genuinely surname-only in normal usage. Every other hanzi matching
  // /^surname [A-Z]/ is the round-2 defect family (CC-CEDICT metadata
  // leaking in verbatim instead of being folded into a real gloss) and
  // must not recur. Keep in sync with product data — do not add to this
  // list to silence a failure without confirming the word really is
  // surname-only.
  const SURNAME_ONLY_WHITELIST = new Set([
    "蔡", "廖", "赵", "郑", "晏", "李", "杨", "桓", "沈", "陈", "崔", "魏", "刘",
  ]);

  it("no gloss matches banned CC-CEDICT metadata patterns", () => {
    const offenders = [];
    for (const lv of Object.keys(DATA.levels)) {
      for (const w of DATA.levels[lv]) {
        for (const pat of BANNED_PATTERNS) {
          if (pat.test(w.e)) offenders.push(`${lv}:${w.h}:${w.e}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("'surname X' glosses are limited to the documented whitelist", () => {
    const offenders = [];
    for (const lv of Object.keys(DATA.levels)) {
      for (const w of DATA.levels[lv]) {
        if (/^surname [A-Z]/.test(w.e) && !SURNAME_ONLY_WHITELIST.has(w.h)) {
          offenders.push(`${lv}:${w.h}:${w.e}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gloss length is capped at 60 characters", () => {
    const offenders = [];
    for (const lv of Object.keys(DATA.levels)) {
      for (const w of DATA.levels[lv]) {
        if (w.e.length > 60) {
          offenders.push(`${lv}:${w.h}:${w.e} (${w.e.length} chars)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // Self-tests below never touch the real data — they only prove the gate's
  // own regex/whitelist logic actually discriminates good from bad, so a
  // typo'd pattern can't silently no-op and pass forever.

  it("self-test: every banned pattern actually fires on its designed trigger", () => {
    const fixtures = [
      "Tw dialect term",
      "abbr. for something",
      "bound form of X",
      "used in classical Chinese",
      "variant of 某",
      "coll. term for X",
      "fig. meaning of X",
      "lit. to do X",
      "sl. term",
      "CL:個|个[ge4]",
      "erhua form of X",
      "onom. sound",
    ];
    expect(fixtures.length).toBe(BANNED_PATTERNS.length);
    fixtures.forEach((fixture, i) => {
      expect(BANNED_PATTERNS[i].test(fixture)).toBe(true);
    });
  });

  it("self-test: an unwhitelisted 'surname X' fixture trips the whitelist gate", () => {
    const badFixture = { h: "囧", e: "surname Jiong" };
    const isBad =
      /^surname [A-Z]/.test(badFixture.e) &&
      !SURNAME_ONLY_WHITELIST.has(badFixture.h);
    expect(isBad).toBe(true);
  });

  it("self-test: a whitelisted 'surname X' fixture is correctly allowed", () => {
    const goodFixture = { h: "李", e: "surname Li" };
    const isBad =
      /^surname [A-Z]/.test(goodFixture.e) &&
      !SURNAME_ONLY_WHITELIST.has(goodFixture.h);
    expect(isBad).toBe(false);
  });

  it("self-test: a 61-char gloss fixture trips the length gate's own predicate", () => {
    const fixtureRow = { h: "囧", e: "x".repeat(61) };
    const offenders = [fixtureRow].filter(w => w.e.length > 60);
    expect(offenders).toEqual([fixtureRow]);
  });
});
