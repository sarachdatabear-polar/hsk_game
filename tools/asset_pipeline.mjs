import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname.slice(1));
const SOURCE = path.join(ROOT, "art-source", "REFERENCE-production-target.png");
const OUT = path.join(ROOT, "assets");

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export const ASSETS = [
  seq("cat-walk", "characters", [
    [21, 1462, 58, 70],
    [89, 1461, 56, 70],
    [151, 1462, 56, 69],
    [208, 1462, 55, 69],
    [263, 1462, 54, 69],
  ]),
  seq("cat-happy", "characters", [
    [340, 1463, 53, 69],
    [396, 1462, 47, 70],
    [444, 1462, 45, 70],
    [492, 1463, 44, 69],
  ]),
  item("maneki", "Maneki Cat", "characters", [579, 1460, 83, 69], { reviewStatus: "uncertain", reviewNote: "Top ears sit close to the deliverables label; crop preserves extra padding without including the green header or lower panel line." }),
  item("cat-portrait", "Cat Portrait", "characters", [710, 1461, 114, 68]),

  item("bg-home", "Home Background Preview", "backgrounds", [14, 1560, 181, 54], { resolutionClass: "preview-resolution", reviewStatus: "uncertain", reviewNote: "The deliverables preview is small and rounded; crop excludes the filename label and keeps the visible artwork area." }),
  item("bg-battle", "Battle Background Forest Preview", "backgrounds", [267, 795, 294, 174], { resolutionClass: "preview-resolution" }),
  item("bg-market", "Market Background Preview", "backgrounds", [431, 1560, 229, 54], { resolutionClass: "preview-resolution", reviewStatus: "uncertain", reviewNote: "The deliverables preview is small and rounded; crop excludes the filename label and keeps the visible artwork area." }),
  item("bg-night-market-small", "Night Market Background Small Preview", "backgrounds", [238, 1053, 51, 114], { resolutionClass: "preview-resolution" }),
  item("bg-bamboo-small", "Bamboo Background Small Preview", "backgrounds", [292, 1053, 53, 114], { resolutionClass: "preview-resolution" }),
  item("bg-temple-small", "Temple Background Small Preview", "backgrounds", [349, 1053, 51, 114], { resolutionClass: "preview-resolution" }),

  item("ui-panel", "UI Panel", "ui", [696, 1560, 122, 56], { vector: "panel" }),
  item("ui-word-plaque", "Word Plaque", "ui", [687, 829, 153, 93], { vector: "panel" }),
  item("ui-button-primary", "Primary Button", "ui", [157, 1655, 108, 52], { vector: "button-green" }),
  item("ui-button-secondary", "Secondary Button", "ui", [665, 784, 88, 35], { vector: "button-blue" }),
  item("ui-button-disabled", "Disabled Button", "ui", [762, 784, 82, 35], { vector: "button-gray" }),
  item("ui-tag-hsk2", "HSK 2 Tag", "ui", [573, 935, 60, 31], { vector: "tag" }),
  item("ui-badge-paw", "Paw Badge", "ui", [652, 933, 32, 34], { vector: "badge" }),
  item("ui-progress-bar", "Progress Bar", "ui", [702, 943, 139, 24], { reviewStatus: "uncertain", reviewNote: "Source preview combines the bar and 75% text; crop keeps both because the source does not clearly separate them." }),

  item("fx-correct", "Correct Paw Effect", "effects", [306, 1649, 62, 64]),
  item("fx-wrong", "Wrong Paw Effect", "effects", [417, 1649, 62, 64]),
  item("fx-critical", "Critical Effect", "effects", [512, 1648, 88, 72], { reviewStatus: "uncertain", reviewNote: "Outer rays fade into the sheet background; crop uses extra padding to avoid clipping faint tips." }),
  item("fx-orb-green", "Green Orb Effect", "effects", [413, 1059, 38, 38]),
  item("fx-orb-red", "Red Orb Effect", "effects", [453, 1059, 38, 38]),
  item("fx-orb-blue", "Blue Orb Effect", "effects", [413, 1109, 38, 38]),
  item("fx-orb-gold", "Gold Orb Effect", "effects", [453, 1109, 38, 38]),

  item("cat-skin-midnight", "Midnight Cat Skin Preview", "characters", [15, 1051, 51, 64]),
  item("cat-skin-sakura", "Sakura Cat Skin Preview", "characters", [71, 1051, 51, 64]),
  item("cat-skin-jade", "Jade Cat Skin Preview", "characters", [15, 1114, 51, 64]),
  item("cat-skin-gold", "Gold Cat Skin Preview", "characters", [71, 1114, 51, 64]),
  item("boss-cat", "Boss Cat Preview", "characters", [134, 1042, 96, 127], { reviewStatus: "uncertain", reviewNote: "Crown and weapon sit near section label text; crop keeps extra top padding while avoiding the label." }),

  item("prop-torii-lanterns", "Torii Lanterns", "props", [504, 1053, 78, 62]),
  item("prop-tree", "Street Tree", "props", [584, 1039, 50, 71]),
  item("prop-bench", "Street Bench", "props", [502, 1121, 76, 38]),
  item("prop-planter", "Planter", "props", [573, 1110, 54, 61], { reviewStatus: "uncertain", reviewNote: "Planter is close to the fountain; crop preserves padding without crossing into the fountain bowl." }),
  item("prop-fountain", "Fountain", "props", [612, 1110, 60, 68], { reviewStatus: "uncertain", reviewNote: "Rightmost ornament approaches the shop-card divider; crop keeps extra padding and avoids the divider." }),
  item("shop-scroll", "Shop Scroll", "props", [642, 1059, 48, 47]),
  item("shop-chest", "Shop Chest", "props", [690, 1058, 43, 43]),
  item("shop-card-market", "Shop Market Card", "props", [644, 1108, 42, 45]),
  item("shop-card-temple", "Shop Temple Card", "props", [691, 1108, 45, 58]),

  item("icon-heart", "Heart Icon", "icons", [623, 1653, 27, 25]),
  item("icon-coin", "Coin Icon", "icons", [657, 1653, 24, 25]),
  item("icon-volume", "Volume Icon", "icons", [689, 1653, 24, 24]),
  item("icon-pause", "Pause Icon", "icons", [727, 1653, 19, 24]),
  item("icon-play", "Play Icon", "icons", [759, 1654, 19, 23]),
  item("icon-gamepad", "Gamepad Icon", "icons", [789, 1653, 24, 25]),
  item("icon-upload", "Upload Icon", "icons", [822, 1652, 18, 26]),
  item("icon-back", "Back Icon", "icons", [625, 1689, 23, 23]),
  item("icon-card", "Card Icon", "icons", [658, 1688, 22, 25]),
  item("icon-home", "Home Icon", "icons", [690, 1690, 22, 21]),
  item("icon-book", "Book Icon", "icons", [725, 1691, 21, 20]),
  item("icon-players", "Players Icon", "icons", [758, 1690, 22, 22]),
  item("icon-settings", "Settings Icon", "icons", [790, 1690, 22, 23]),
  item("icon-download", "Download Icon", "icons", [822, 1690, 20, 23]),
].flat();

function seq(sequence, category, rects) {
  return rects.map((rect, i) =>
    item(`${sequence}-${String(i + 1).padStart(2, "0")}`, `${title(sequence)} Frame ${i + 1}`, category, rect, {
      sequence,
      frameIndex: i + 1,
      durationMs: sequence === "cat-walk" ? 120 : 180,
    }),
  );
}

function item(id, name, category, rect, options = {}) {
  return { id, name, category, rect: toRect(rect), ...options };
}

function toRect([x, y, width, height]) {
  return { x, y, width, height };
}

function title(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function readPng(file) {
  const buf = fs.readFileSync(file);
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error(`Not a PNG: ${file}`);
  let pos = 8;
  let ihdr;
  const idats = [];
  const ancillary = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type !== "IEND") {
      ancillary.push({ type, data: Buffer.from(data) });
    }
    pos += 12 + length;
  }
  if (!ihdr || ihdr.bitDepth !== 8 || ihdr.interlace !== 0) {
    throw new Error(`Unsupported PNG format in ${file}`);
  }
  if (![2, 6].includes(ihdr.colorType)) {
    throw new Error(`Unsupported PNG color type ${ihdr.colorType} in ${file}`);
  }
  const channels = ihdr.colorType === 6 ? 4 : 3;
  const stride = ihdr.width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const pixels = Buffer.alloc(ihdr.width * ihdr.height * 4);
  let inPos = 0;
  const prev = Buffer.alloc(stride);
  let row = Buffer.alloc(stride);
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[inPos++];
    const scan = Buffer.from(raw.subarray(inPos, inPos + stride));
    inPos += stride;
    unfilter(scan, prev, channels, filter);
    row = scan;
    for (let x = 0; x < ihdr.width; x++) {
      const src = x * channels;
      const dst = (y * ihdr.width + x) * 4;
      pixels[dst] = row[src];
      pixels[dst + 1] = row[src + 1];
      pixels[dst + 2] = row[src + 2];
      pixels[dst + 3] = channels === 4 ? row[src + 3] : 255;
    }
    row.copy(prev);
  }
  return { width: ihdr.width, height: ihdr.height, pixels, ancillary };
}

function unfilter(scan, prev, bpp, filter) {
  for (let i = 0; i < scan.length; i++) {
    const left = i >= bpp ? scan[i - bpp] : 0;
    const up = prev[i] ?? 0;
    const upLeft = i >= bpp ? prev[i - bpp] : 0;
    if (filter === 1) scan[i] = (scan[i] + left) & 255;
    else if (filter === 2) scan[i] = (scan[i] + up) & 255;
    else if (filter === 3) scan[i] = (scan[i] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) scan[i] = (scan[i] + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function writePng(file, image, ancillary = []) {
  mkdir(path.dirname(file));
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  for (let y = 0; y < image.height; y++) {
    const outRow = y * (rowBytes + 1);
    raw[outRow] = 0;
    image.pixels.copy(raw, outRow + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunks = [PNG_SIG, chunk("IHDR", ihdr)];
  for (const c of ancillary) chunks.push(chunk(c.type, c.data));
  chunks.push(chunk("IDAT", zlib.deflateSync(raw, { level: 9 })));
  chunks.push(chunk("IEND", Buffer.alloc(0)));
  fs.writeFileSync(file, Buffer.concat(chunks));
}

function chunk(type, data) {
  const name = Buffer.from(type, "latin1");
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  name.copy(head, 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([head, data, crc]);
}

let CRC_TABLE;
function crc32(buf) {
  CRC_TABLE ??= Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function crop(source, rect) {
  const pixels = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const src = ((rect.y + y) * source.width + rect.x) * 4;
    const dst = y * rect.width * 4;
    source.pixels.copy(pixels, dst, src, src + rect.width * 4);
  }
  return { width: rect.width, height: rect.height, pixels };
}

function transparentCandidate(image) {
  const out = { width: image.width, height: image.height, pixels: Buffer.from(image.pixels) };
  const seen = new Uint8Array(image.width * image.height);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const idx = y * image.width + x;
    if (!seen[idx]) {
      seen[idx] = 1;
      q.push([x, y]);
    }
  };
  for (let x = 0; x < image.width; x++) {
    push(x, 0);
    push(x, image.height - 1);
  }
  for (let y = 0; y < image.height; y++) {
    push(0, y);
    push(image.width - 1, y);
  }
  while (q.length) {
    const [x, y] = q.shift();
    const p = (y * image.width + x) * 4;
    const r = out.pixels[p];
    const g = out.pixels[p + 1];
    const b = out.pixels[p + 2];
    if (!isSheetBackground(r, g, b)) continue;
    out.pixels[p + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return out;
}

function isSheetBackground(r, g, b) {
  const bright = r >= 238 && g >= 232 && b >= 210;
  const neutral = Math.abs(r - g) < 16 && Math.abs(g - b) < 20 && r >= 235;
  return bright || neutral;
}

function paste(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sp = (y * src.width + x) * 4;
      if (src.pixels[sp + 3] === 0) continue;
      const dp = ((dy + y) * dst.width + dx + x) * 4;
      src.pixels.copy(dst.pixels, dp, sp, sp + 4);
    }
  }
}

function drawRect(img, rect, rgba) {
  const set = (x, y) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
    const p = (y * img.width + x) * 4;
    img.pixels[p] = rgba[0];
    img.pixels[p + 1] = rgba[1];
    img.pixels[p + 2] = rgba[2];
    img.pixels[p + 3] = rgba[3];
  };
  for (let i = 0; i < 2; i++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      set(x, rect.y + i);
      set(x, rect.y + rect.height - 1 - i);
    }
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      set(rect.x + i, y);
      set(rect.x + rect.width - 1 - i, y);
    }
  }
}

function checker(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? 220 : 255;
      const p = (y * width + x) * 4;
      pixels[p] = pixels[p + 1] = pixels[p + 2] = v;
      pixels[p + 3] = 255;
    }
  }
  return { width, height, pixels };
}

function embeddedSvg(pngPath, width, height) {
  const b64 = fs.readFileSync(pngPath).toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
  <metadata>{"svgType":"embedded-raster","isTrueVector":false,"pixelExact":true}</metadata>
  <image width="${width}" height="${height}" href="data:image/png;base64,${b64}"/>
</svg>
`;
}

function vectorSvg(asset) {
  const { width, height } = asset.rect;
  const meta = `{"svgType":"true-vector","isTrueVector":true,"pixelExact":false,"vectorizationStatus":"approximate"}`;
  if (asset.vector?.startsWith("button")) {
    const fill = asset.vector === "button-blue" ? "#2f79a9" : asset.vector === "button-gray" ? "#8c8c8c" : "#2e8a3f";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <metadata>${meta}</metadata>
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="7" fill="${fill}" stroke="#8a5a24" stroke-width="2"/>
  <rect x="6" y="5" width="${width - 12}" height="3" rx="1.5" fill="#ffffff" opacity=".22"/>
</svg>
`;
  }
  if (asset.vector === "panel") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <metadata>${meta}</metadata>
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="8" fill="#fff0cf" stroke="#b8782f" stroke-width="2"/>
  <rect x="9" y="9" width="${width - 18}" height="${height - 18}" rx="5" fill="none" stroke="#edc98e" stroke-width="2"/>
</svg>
`;
  }
  if (asset.vector === "tag" || asset.vector === "badge") {
    const rx = asset.vector === "badge" ? Math.floor(Math.min(width, height) / 2) : 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <metadata>${meta}</metadata>
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="${rx}" fill="#2b8c61" stroke="#996b27" stroke-width="2"/>
</svg>
`;
  }
  return null;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeCsv(file, entries) {
  const cols = ["id", "name", "category", "x", "y", "width", "height", "exactPng", "embeddedSvg", "sha256", "status", "reviewStatus", "reviewNote", "transparencyStatus"];
  const rows = [cols.join(",")];
  for (const e of entries) {
    rows.push(cols.map((c) => csv(e[c] ?? e.sourceRect?.[c] ?? "")).join(","));
  }
  fs.writeFileSync(file, rows.join("\n") + "\n");
}

function csv(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function copySource() {
  const dest = path.join(OUT, "source", "reference", "REFERENCE-production-target.png");
  mkdir(path.dirname(dest));
  fs.copyFileSync(SOURCE, dest);
}

export function runPipeline() {
  copySource();
  const source = readPng(SOURCE);
  const manifest = [];
  const cropCache = new Map();
  for (const asset of ASSETS) {
    const exactDir = path.join(OUT, "png", "exact", asset.category);
    const exact = path.join(exactDir, `${asset.id}.png`);
    const image = crop(source, asset.rect);
    writePng(exact, image, source.ancillary);
    cropCache.set(asset.id, image);

    const embedded = path.join(OUT, "svg", "embedded", asset.category, `${asset.id}.svg`);
    mkdir(path.dirname(embedded));
    fs.writeFileSync(embedded, embeddedSvg(exact, image.width, image.height));

    let trueVectorSvg = null;
    const vector = vectorSvg(asset);
    if (vector) {
      trueVectorSvg = path.join(OUT, "svg", "vector", vectorCategory(asset.category), `${asset.id}.svg`);
      mkdir(path.dirname(trueVectorSvg));
      fs.writeFileSync(trueVectorSvg, vector);
    }

    manifest.push({
      id: asset.id,
      name: asset.name,
      category: singular(asset.category),
      sourceFile: "REFERENCE-production-target.png",
      sourceRect: asset.rect,
      exactPng: rel(exact),
      transparentPng: null,
      embeddedSvg: rel(embedded),
      trueVectorSvg: trueVectorSvg ? rel(trueVectorSvg) : null,
      canvasSize: { width: image.width, height: image.height },
      pivot: asset.sequence ? { x: 0.5, y: 1.0 } : null,
      sequence: asset.sequence ?? null,
      frameIndex: asset.frameIndex ?? null,
      durationMs: asset.durationMs ?? null,
      baseline: asset.sequence ? image.height - 1 : null,
      offset: asset.sequence ? { x: 0, y: 0 } : null,
      status: "extracted",
      reviewStatus: asset.reviewStatus ?? "approved",
      reviewNote: asset.reviewNote ?? "",
      transparencyStatus: "not-started",
      pixelExact: true,
      resolutionClass: asset.resolutionClass ?? "sheet-resolution",
      sha256: sha256(exact),
      svgType: "embedded-raster",
      isTrueVector: false,
      vectorizationStatus: vector ? "approximate" : null,
    });
  }
  writeMetadata(manifest);
  generateReports(source, manifest, cropCache);
  return manifest;
}

function vectorCategory(category) {
  return ["ui", "icons", "effects"].includes(category) ? category : "ui";
}

function singular(category) {
  return category.endsWith("s") ? category.slice(0, -1) : category;
}

function buildAtlases(manifest) {
  for (const sequence of ["cat-walk", "cat-happy"]) {
    const frames = manifest.filter((e) => e.sequence === sequence).sort((a, b) => a.frameIndex - b.frameIndex);
    const images = frames.map((e) => readPng(path.join(ROOT, e.transparentPng)));
    const cellW = Math.max(...images.map((i) => i.width));
    const cellH = Math.max(...images.map((i) => i.height));
    const atlas = { width: cellW * images.length, height: cellH, pixels: Buffer.alloc(cellW * images.length * cellH * 4) };
    const atlasFrames = [];
    images.forEach((img, i) => {
      const dx = i * cellW + Math.floor((cellW - img.width) / 2);
      const dy = cellH - img.height;
      paste(atlas, img, dx, dy);
      frames[i].canvasSize = { width: cellW, height: cellH };
      frames[i].offset = { x: dx - i * cellW, y: dy };
      frames[i].baseline = cellH - 1;
      atlasFrames.push({
        id: frames[i].id,
        frame: { x: i * cellW, y: 0, width: cellW, height: cellH },
        sourceRect: frames[i].sourceRect,
        offset: frames[i].offset,
        pivot: frames[i].pivot,
        durationMs: frames[i].durationMs,
      });
    });
    const atlasPng = path.join(OUT, "atlases", "characters", `${sequence}.png`);
    writePng(atlasPng, atlas);
    const atlasJson = path.join(OUT, "atlases", "characters", `${sequence}.json`);
    mkdir(path.dirname(atlasJson));
    fs.writeFileSync(atlasJson, JSON.stringify({ sequence, image: rel(atlasPng), frameCount: frames.length, cellSize: { width: cellW, height: cellH }, frames: atlasFrames }, null, 2) + "\n");
  }
}

function writeMetadata(manifest) {
  const meta = path.join(OUT, "metadata");
  mkdir(meta);
  fs.writeFileSync(
    path.join(meta, "assets.json"),
    JSON.stringify(
      {
        source: "assets/source/reference/REFERENCE-production-target.png",
        sourceSha256: sha256(SOURCE),
        pipelineVersion: 1,
        assets: manifest,
      },
      null,
      2,
    ) + "\n",
  );
  writeCsv(path.join(meta, "assets.csv"), manifest.map((e) => ({ ...e, ...e.sourceRect })));
  fs.writeFileSync(path.join(meta, "extraction-regions.json"), JSON.stringify(Object.fromEntries(manifest.map((e) => [e.id, e.sourceRect])), null, 2) + "\n");
}

function generateReports(source, manifest) {
  const reports = path.join(OUT, "reports");
  mkdir(reports);
  const map = { width: source.width, height: source.height, pixels: Buffer.from(source.pixels) };
  const colors = [
    [237, 85, 59, 255],
    [46, 139, 87, 255],
    [34, 113, 177, 255],
    [238, 174, 54, 255],
    [142, 68, 173, 255],
  ];
  manifest.forEach((e, i) => drawRect(map, e.sourceRect, colors[i % colors.length]));
  writePng(path.join(reports, "extraction-map.png"), map, source.ancillary);

  const exacts = manifest.map((e) => readPng(path.join(ROOT, e.exactPng)));
  const thumbW = 120;
  const thumbH = 100;
  const cols = 6;
  const contact = checker(cols * thumbW, Math.ceil(exacts.length / cols) * thumbH);
  exacts.forEach((img, i) => {
    const scale = Math.min((thumbW - 12) / img.width, (thumbH - 12) / img.height, 1);
    const scaled = scaleImageNearest(img, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
    const x = (i % cols) * thumbW + Math.floor((thumbW - scaled.width) / 2);
    const y = Math.floor(i / cols) * thumbH + Math.floor((thumbH - scaled.height) / 2);
    paste(contact, scaled, x, y);
  });
  writePng(path.join(reports, "contact-sheet.png"), contact);

  fs.writeFileSync(path.join(reports, "comparison-report.html"), comparisonHtml(manifest));
  fs.writeFileSync(path.join(reports, "unresolved-assets.md"), unresolved(manifest));
}

function scaleImageNearest(img, width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x / width) * img.width));
      const sy = Math.min(img.height - 1, Math.floor((y / height) * img.height));
      const sp = (sy * img.width + sx) * 4;
      const dp = (y * width + x) * 4;
      img.pixels.copy(pixels, dp, sp, sp + 4);
    }
  }
  return { width, height, pixels };
}

function comparisonHtml(manifest) {
  const rows = manifest
    .map(
      (e) => `<tr>
  <td>${e.id}</td>
  <td>${e.category}</td>
  <td><img src="../${e.exactPng.replaceAll("\\", "/")}" /></td>
  <td><code>${JSON.stringify(e.sourceRect)}</code></td>
  <td class="${e.reviewStatus}">${e.reviewStatus}</td>
  <td>${escapeHtml(e.reviewNote)}</td>
</tr>`,
    )
    .join("\n");
  return `<!doctype html>
<meta charset="utf-8">
<title>Lucky Cat HSK Asset Extraction QA</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;background:#faf7ef;color:#173f2e}
table{border-collapse:collapse;width:100%;background:white}
td,th{border:1px solid #d8cbb3;padding:8px;vertical-align:middle}
img{max-width:160px;max-height:120px}
.uncertain{color:#9a5a00;font-weight:700}
.approved{color:#126b3f;font-weight:700}
code{font-size:12px}
</style>
<h1>Lucky Cat HSK Asset Extraction QA</h1>
<p>All exact PNGs are direct crops from <code>REFERENCE-production-target.png</code>. Transparency was not regenerated in this recrop pass.</p>
<table><thead><tr><th>Asset</th><th>Category</th><th>Exact Crop</th><th>Source Rect</th><th>Review</th><th>Note</th></tr></thead><tbody>
${rows}
</tbody></table>
`;
}

function unresolved(manifest) {
  const uncertain = manifest.filter((e) => e.reviewStatus === "uncertain");
  const lines = [
    "# Unresolved / Uncertain Crops",
    "",
    "- This recrop pass did not create or update transparent assets.",
    "- The source is a flattened reference sheet, so hidden pixels behind labels, card borders, neighboring art, or antialiased backgrounds were not reconstructed.",
    "- The `cat-walk` sheet visibly contains five separate walking poses in the deliverables strip although the label says six frames. No sixth frame was invented.",
    "",
    "## Uncertain Assets",
    "",
    ...(uncertain.length
      ? uncertain.map((e) => `- ${e.id}: ${e.reviewNote}`)
      : ["- None."]),
  ];
  return lines.join("\n") + "\n";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

export function validateAssets() {
  const metaFile = path.join(OUT, "metadata", "assets.json");
  if (!fs.existsSync(metaFile)) throw new Error("Missing assets/metadata/assets.json. Run the pipeline first.");
  const data = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  const source = readPng(SOURCE);
  for (const e of data.assets) {
    for (const key of ["exactPng", "embeddedSvg"]) {
      if (e[key] && !fs.existsSync(path.join(ROOT, e[key]))) throw new Error(`Missing ${key} for ${e.id}: ${e[key]}`);
    }
    const exact = readPng(path.join(ROOT, e.exactPng));
    if (exact.width !== e.sourceRect.width || exact.height !== e.sourceRect.height) {
      throw new Error(`Dimension mismatch for ${e.id}`);
    }
    for (let y = 0; y < exact.height; y++) {
      for (let x = 0; x < exact.width; x++) {
        const sp = ((e.sourceRect.y + y) * source.width + e.sourceRect.x + x) * 4;
        const dp = (y * exact.width + x) * 4;
        if (source.pixels[sp] !== exact.pixels[dp] || source.pixels[sp + 1] !== exact.pixels[dp + 1] || source.pixels[sp + 2] !== exact.pixels[dp + 2]) {
          throw new Error(`Pixel mismatch for ${e.id} at ${x},${y}`);
        }
      }
    }
    if (e.sha256 !== sha256(path.join(ROOT, e.exactPng))) throw new Error(`SHA mismatch for ${e.id}`);
  }
  return data.assets.length;
}

const command = process.argv[2] ?? "all";
const invokedPath = process.argv[1] ? `file:///${process.argv[1].replaceAll("\\", "/")}` : null;
if (invokedPath && import.meta.url === invokedPath) {
  if (command === "validate") {
    const count = validateAssets();
    console.log(`Validated ${count} extracted assets.`);
  } else {
    const manifest = runPipeline();
    console.log(`Extracted ${manifest.length} assets.`);
    console.log(`Wrote ${path.relative(process.cwd(), path.join(OUT, "metadata", "assets.json"))}`);
  }
}
