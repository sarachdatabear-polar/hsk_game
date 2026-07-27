"use strict";
// Self-contained byte-mode QR encoder (model 2, versions 1-40, ECC L/M).
// Pure: no DOM, no deps, no TextEncoder (manual UTF-8 — identical under
// vitest, WebView, and file://). It encodes an opaque string; it knows
// nothing about friend cards, URLs, colors, or quiet zones (the UI owns
// those). Decoding is out of scope.
//
// Version/ECC policy (spec §3): try ECC M; if the smallest fitting version
// at M is <= 13, use it. Otherwise re-select at ECC L — for dense payloads,
// fewer modules beats stronger correction on a phone screen. Null past
// v40-L capacity (2,953 bytes).

// Per-version ECC codewords per block and block counts (index = version).
const ECC_CODEWORDS_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
      28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
      26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
};
const NUM_BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7,
      8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14,
      16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
};
const ECC_FORMAT_BITS = { L: 1, M: 0 };

// ---- capacity ------------------------------------------------------------

function rawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version, ecc) {
  return Math.floor(rawDataModules(version) / 8)
    - ECC_CODEWORDS_PER_BLOCK[ecc][version] * NUM_BLOCKS[ecc][version];
}

// Max payload bytes in byte mode: subtract the 4-bit mode indicator + the
// 8-bit (v1-9) / 16-bit (v10-40) char count from the data-bit budget.
export function qrByteCapacity(version, ecc) {
  return dataCodewords(version, ecc) - (version <= 9 ? 2 : 3);
}

function selectVersion(numBytes) {
  let mVer = null;
  for (let v = 1; v <= 40; v++) if (qrByteCapacity(v, "M") >= numBytes) { mVer = v; break; }
  if (mVer !== null && mVer <= 13) return { version: mVer, eccLevel: "M" };
  for (let v = 1; v <= 40; v++) if (qrByteCapacity(v, "L") >= numBytes) return { version: v, eccLevel: "L" };
  return null;
}

// ---- UTF-8 (manual, env-agnostic) ---------------------------------------

function utf8Bytes(str) {
  const out = [];
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

// ---- bit packing: mode + count + data + terminator + pads ---------------

function makeDataCodewords(bytes, version, ecc) {
  const capBits = dataCodewords(version, ecc) * 8;
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4);                                       // byte-mode indicator 0100
  push(bytes.length, version <= 9 ? 8 : 16);        // char count
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capBits - bits.length));      // terminator
  push(0, (8 - (bits.length % 8)) % 8);             // byte-align
  for (let pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) push(pad, 8);
  const out = new Uint8Array(capBits / 8);
  bits.forEach((b, i) => { out[i >>> 3] |= b << (7 - (i & 7)); });
  return out;
}

// ---- Reed-Solomon over GF(256), generator 0x11D -------------------------

function rsMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xFF;
}

function rsComputeDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= rsMultiply(divisor[i], factor);
  }
  return result;
}

// ---- block split + interleave (per the version/ECC block table) ---------

function addEccAndInterleave(data, version, ecc) {
  const numBlocks = NUM_BLOCKS[ecc][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsComputeDivisor(blockEccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const block = Array.from(dat);
    if (i < numShortBlocks) block.push(0);          // placeholder, skipped on read-out
    blocks.push(block.concat(Array.from(rsRemainder(dat, divisor))));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return new Uint8Array(result);
}

// ---- function patterns ---------------------------------------------------

function alignmentPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let i = 0, pos = size - 7; i < numAlign - 1; i++, pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFormatBits(modules, func, size, ecc, mask) {
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  const bit = i => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));           // first copy (around top-left finder)
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); // second copy (top-right + bottom-left)
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);                                   // dark module
}

function drawVersionInfo(modules, func, size, version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  const bits = (version << 12) | rem;
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3), b = Math.floor(i / 3);
    set(a, b, dark);
    set(b, a, dark);
  }
}

function buildFunctionPatterns(version, ecc) {
  const size = version * 4 + 17;
  const modules = new Uint8Array(size * size);
  const func = new Uint8Array(size * size);
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }   // timing
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, dist !== 2 && dist !== 4);            // 2 = light ring, 4 = separator
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = alignmentPositions(version);
  for (let i = 0; i < align.length; i++) for (let j = 0; j < align.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  drawFormatBits(modules, func, size, ecc, 0);        // reserve; redrawn with the real mask
  if (version >= 7) drawVersionInfo(modules, func, size, version);
  return { size, modules, func };
}

// ---- codeword placement (zigzag) ----------------------------------------

function drawCodewords(modules, func, size, data) {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!func[y * size + x] && i < data.length * 8) {
          modules[y * size + x] = (data[i >>> 3] >>> (7 - (i & 7))) & 1;
          i++;
        }
      }
    }
  }
}

// ---- masking + penalty (all 8 masks, standard N1-N4) --------------------

function applyMask(modules, func, size, mask) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (func[y * size + x]) continue;
    let invert;
    switch (mask) {
      case 0: invert = (x + y) % 2 === 0; break;
      case 1: invert = y % 2 === 0; break;
      case 2: invert = x % 3 === 0; break;
      case 3: invert = (x + y) % 3 === 0; break;
      case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
      case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
      case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
    }
    if (invert) modules[y * size + x] ^= 1;
  }
}

function finderPenaltyCountPatterns(h) {
  const n = h[1];
  const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
  return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0)
       + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
}

function finderPenaltyAddHistory(runLength, h, size) {
  if (h[0] === 0) runLength += size;   // treat the border as light
  h.pop();
  h.unshift(runLength);
}

function finderPenaltyTerminate(runColor, runLength, h, size) {
  if (runColor) { finderPenaltyAddHistory(runLength, h, size); runLength = 0; }
  finderPenaltyAddHistory(runLength + size, h, size);
  return finderPenaltyCountPatterns(h);
}

function penaltyScore(modules, size) {
  let result = 0;
  const at = (x, y) => modules[y * size + x] === 1;
  for (let y = 0; y < size; y++) {                       // N1 + N3, rows
    let runColor = false, runX = 0;
    const h = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (at(x, y) === runColor) {
        runX++;
        if (runX === 5) result += 3;
        else if (runX > 5) result++;
      } else {
        finderPenaltyAddHistory(runX, h, size);
        if (!runColor) result += finderPenaltyCountPatterns(h) * 40;
        runColor = at(x, y);
        runX = 1;
      }
    }
    result += finderPenaltyTerminate(runColor, runX, h, size) * 40;
  }
  for (let x = 0; x < size; x++) {                       // N1 + N3, columns
    let runColor = false, runY = 0;
    const h = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (at(x, y) === runColor) {
        runY++;
        if (runY === 5) result += 3;
        else if (runY > 5) result++;
      } else {
        finderPenaltyAddHistory(runY, h, size);
        if (!runColor) result += finderPenaltyCountPatterns(h) * 40;
        runColor = at(x, y);
        runY = 1;
      }
    }
    result += finderPenaltyTerminate(runColor, runY, h, size) * 40;
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {   // N2
    const c = at(x, y);
    if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) result += 3;
  }
  let dark = 0;                                           // N4
  for (const m of modules) dark += m;
  const total = size * size;
  result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return result;
}

// ---- public API ----------------------------------------------------------

export function qrEncode(text, opts = {}) {
  const bytes = utf8Bytes(text);
  const sel = selectVersion(bytes.length);
  if (!sel) return null;
  const { version, eccLevel } = sel;
  const data = addEccAndInterleave(makeDataCodewords(bytes, version, eccLevel), version, eccLevel);
  const { size, modules, func } = buildFunctionPatterns(version, eccLevel);
  drawCodewords(modules, func, size, data);
  let mask = opts.forceMask;
  if (!(Number.isInteger(mask) && mask >= 0 && mask <= 7)) {
    mask = 0;
    let minPenalty = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(modules, func, size, m);
      drawFormatBits(modules, func, size, eccLevel, m);
      const p = penaltyScore(modules, size);
      if (p < minPenalty) { minPenalty = p; mask = m; }
      applyMask(modules, func, size, m);                  // undo (XOR is its own inverse)
    }
  }
  applyMask(modules, func, size, mask);
  drawFormatBits(modules, func, size, eccLevel, mask);
  return { version, eccLevel, size, modules, mask };
}

// qrEncode + one SVG path string, one h/v rect per horizontal run of dark
// modules. No quiet zone — the UI's viewBox provides the mandatory 4 modules.
export function qrSvgPath(text) {
  const q = qrEncode(text);
  if (!q) return null;
  const { size, modules } = q;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      let run = 1;
      while (x + run < size && modules[y * size + x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return { size, d };
}
