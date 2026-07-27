import { describe, it, expect } from "vitest";
import { qrEncode, qrByteCapacity } from "../src/qr.js";

// --- helpers -------------------------------------------------------------
const at = (q, x, y) => q.modules[y * q.size + x];

// Read the format info from its second copy (top-right + bottom-left),
// un-mask with 0x5412, verify BCH(15,5) over generator 0x537, and extract
// {ecc, mask}. ECC level bits: L=1, M=0.
function readFormatInfo(q) {
  let bits = 0;
  for (let i = 0; i < 8; i++) bits |= at(q, q.size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) bits |= at(q, 8, q.size - 15 + i) << i;
  bits ^= 0x5412;
  let rem = bits;
  for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  return { ok: rem === 0, ecc: (bits >>> 13) & 3, mask: (bits >>> 10) & 7 };
}

// Read the 18-bit version info block (bottom-left copy) and BCH-check it
// over generator 0x1F25; top 6 bits must equal the version.
function readVersionInfo(q) {
  let bits = 0;
  for (let i = 0; i < 18; i++) {
    const x = q.size - 11 + (i % 3), y = Math.floor(i / 3);
    bits |= at(q, x, y) << i;
  }
  let rem = bits;
  for (let i = 17; i >= 12; i--) if ((rem >>> i) & 1) rem ^= 0x1F25 << (i - 12);
  return { ok: rem === 0, version: bits >>> 12 };
}

// --- capacity table (spot-pinned against the published standard) ---------
describe("qrByteCapacity", () => {
  it("matches the published byte-mode capacities at the corners we rely on", () => {
    expect(qrByteCapacity(1, "L")).toBe(17);      // canonical minimum anchor
    expect(qrByteCapacity(1, "M")).toBe(14);
    expect(qrByteCapacity(2, "M")).toBe(26);
    // 122, not 121: verified against the published byte-mode capacity table
    // (thonky.com/ISO-IEC-18004 mirror) AND against qrcode@1.5.4 as an
    // independent implementation. Do not "helpfully" revert this to 121 to
    // match a spec-text example — that example is the thing that's wrong.
    expect(qrByteCapacity(7, "M")).toBe(122);
    expect(qrByteCapacity(13, "M")).toBe(331);
    expect(qrByteCapacity(12, "L")).toBe(367);
    expect(qrByteCapacity(13, "L")).toBe(425);
    expect(qrByteCapacity(14, "L")).toBe(458);
    expect(qrByteCapacity(40, "L")).toBe(2953);   // the spec's v40-L ceiling (canonical max anchor)
  });
});

// --- version/ECC selection policy ----------------------------------------
describe("version/ECC selection policy (M through v13, else L)", () => {
  it("short payloads pick M at the smallest version", () => {
    expect(qrEncode("HELLO")).toMatchObject({ version: 1, eccLevel: "M", size: 21 });
    expect(qrEncode("A".repeat(14))).toMatchObject({ version: 1, eccLevel: "M" });
    expect(qrEncode("A".repeat(15))).toMatchObject({ version: 2, eccLevel: "M" });
    expect(qrEncode("A".repeat(331))).toMatchObject({ version: 13, eccLevel: "M" });
  });
  it("crossing the v13-M threshold re-selects at L (can even shrink the version)", () => {
    expect(qrEncode("A".repeat(332))).toMatchObject({ version: 12, eccLevel: "L" });
    expect(qrEncode("A".repeat(367))).toMatchObject({ version: 12, eccLevel: "L" });
    expect(qrEncode("A".repeat(368))).toMatchObject({ version: 13, eccLevel: "L" });
    expect(qrEncode("A".repeat(425))).toMatchObject({ version: 13, eccLevel: "L" });
    expect(qrEncode("A".repeat(426))).toMatchObject({ version: 14, eccLevel: "L" });
  });
  it("counts UTF-8 bytes, not JS chars (Thai = 3 B/codepoint)", () => {
    // 17 codepoints x 3 B x 8 reps = 408 B -> (368, 425] -> v13-L, the spec's
    // "typical Thai" worst case.
    const thai = "ชวนเพื่อนเทียบกัน".repeat(8);
    expect(qrEncode(thai)).toMatchObject({ version: 13, eccLevel: "L", size: 69 });
  });
  it("returns null past v40-L capacity", () => {
    expect(qrEncode("A".repeat(2953))).toMatchObject({ version: 40, eccLevel: "L", size: 177 });
    expect(qrEncode("A".repeat(2954))).toBeNull();
  });
});

// --- structural invariants ------------------------------------------------
describe("structural invariants", () => {
  const CASES = ["HELLO", "A".repeat(100), "ชวนเพื่อนเทียบกัน".repeat(8), "A".repeat(500)];
  it("size = 17 + 4*version and modules length = size^2", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      expect(q.size).toBe(17 + 4 * q.version);
      expect(q.modules.length).toBe(q.size * q.size);
    }
  });
  it("finder patterns sit in three corners", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      for (const [cx, cy] of [[3, 3], [q.size - 4, 3], [3, q.size - 4]]) {
        expect(at(q, cx, cy)).toBe(1);            // center dark
        expect(at(q, cx - 2, cy - 2)).toBe(0);    // light ring
        expect(at(q, cx - 3, cy - 3)).toBe(1);    // outer dark ring
      }
    }
  });
  it("timing patterns alternate between the finders", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      for (let i = 8; i < q.size - 8; i++) {
        expect(at(q, i, 6)).toBe(i % 2 === 0 ? 1 : 0);
        expect(at(q, 6, i)).toBe(i % 2 === 0 ? 1 : 0);
      }
    }
  });
  it("format info BCH-decodes to the chosen ECC + mask", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      const f = readFormatInfo(q);
      expect(f.ok).toBe(true);
      expect(f.ecc).toBe(q.eccLevel === "L" ? 1 : 0);
      expect(f.mask).toBe(q.mask);
    }
  });
  it("version info block is present and correct for versions >= 7", () => {
    const q = qrEncode("A".repeat(200));   // v10-M territory
    expect(q.version).toBeGreaterThanOrEqual(7);
    const v = readVersionInfo(q);
    expect(v.ok).toBe(true);
    expect(v.version).toBe(q.version);
    // and absent below 7: v1 has no reserved version area, nothing to read.
    expect(qrEncode("HELLO").version).toBeLessThan(7);
  });
  it("dark module is set at (8, size-8)", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      expect(at(q, 8, q.size - 8)).toBe(1);
    }
  });
});

describe("determinism + mask hook", () => {
  it("same input -> identical matrix", () => {
    const a = qrEncode("determinism-check");
    const b = qrEncode("determinism-check");
    expect(a.mask).toBe(b.mask);
    expect(Array.from(a.modules)).toEqual(Array.from(b.modules));
  });
  it("forceMask pins the mask and the format info follows", () => {
    for (const m of [0, 3, 7]) {
      const q = qrEncode("HELLO", { forceMask: m });
      expect(q.mask).toBe(m);
      const f = readFormatInfo(q);
      expect(f.ok).toBe(true);
      expect(f.mask).toBe(m);
    }
  });
});
