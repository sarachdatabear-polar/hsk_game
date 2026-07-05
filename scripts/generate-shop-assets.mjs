import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ASSETS = path.join(ROOT, "assets");

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return out;
}

function readPng(file) {
  const buf = fs.readFileSync(file);
  let off = 8;
  let w = 0, h = 0, colorType = 6;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.toString("ascii", off, off + 4); off += 4;
    const data = buf.subarray(off, off + len); off += len + 4;
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`Unsupported PNG color type ${colorType}: ${file}`);
  const bpp = channels;
  const stride = w * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const decoded = Buffer.alloc(w * h * channels);
  let src = 0, dst = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[src++];
    const row = Buffer.from(raw.subarray(src, src + stride));
    src += stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        row[x] = (row[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
    }
    row.copy(decoded, dst);
    dst += stride;
    prev = row;
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < decoded.length; i += channels, j += 4) {
    rgba[j] = decoded[i];
    rgba[j + 1] = decoded[i + 1];
    rgba[j + 2] = decoded[i + 2];
    rgba[j + 3] = channels === 4 ? decoded[i + 3] : 255;
  }
  return { w, h, data: rgba };
}

function writePng(file, img) {
  const scan = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    const row = y * (img.w * 4 + 1);
    scan[row] = 0;
    img.data.copy(scan, row + 1, y * img.w * 4, (y + 1) * img.w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(scan, { level: 9 })),
    chunk("IEND")
  ]));
}

function image(w, h, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
  }
  return { w, h, data };
}

function blend(img, x, y, rgba) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  const a = rgba[3] / 255, ia = 1 - a;
  img.data[i] = Math.round(rgba[0] * a + img.data[i] * ia);
  img.data[i + 1] = Math.round(rgba[1] * a + img.data[i + 1] * ia);
  img.data[i + 2] = Math.round(rgba[2] * a + img.data[i + 2] * ia);
  img.data[i + 3] = Math.min(255, Math.round(rgba[3] + img.data[i + 3] * ia));
}

function fillRect(img, x, y, w, h, rgba) {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(img.h, Math.ceil(y + h)); yy++) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(img.w, Math.ceil(x + w)); xx++) blend(img, xx, yy, rgba);
  }
}

function ellipse(img, cx, cy, rx, ry, rgba) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) blend(img, x, y, rgba);
  }
}

function line(img, x0, y0, x1, y1, rgba, width = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    ellipse(img, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, width / 2, rgba);
  }
}

function poly(img, points, rgba) {
  const minY = Math.floor(Math.min(...points.map(p => p[1])));
  const maxY = Math.ceil(Math.max(...points.map(p => p[1])));
  for (let y = minY; y <= maxY; y++) {
    const nodes = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] < y && b[1] >= y) || (b[1] < y && a[1] >= y)) {
        nodes.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) fillRect(img, nodes[i], y, nodes[i + 1] - nodes[i], 1, rgba);
  }
}

function gradient(img, stops) {
  for (let y = 0; y < img.h; y++) {
    const t = y / (img.h - 1);
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      a = stops[i]; b = stops[i + 1]; break;
    }
    const u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0] || 1)));
    const c = [0, 1, 2].map(i => Math.round(a[1][i] + (b[1][i] - a[1][i]) * u));
    fillRect(img, 0, y, img.w, 1, [c[0], c[1], c[2], 255]);
  }
}

function isCatPixel(r, g, b, a) {
  return a > 20 && r > 115 && g > 55 && g < 190 && b < 125 && r - g > 25;
}

function isCreamCatPixel(r, g, b, a) {
  return a > 20 && r > 210 && g > 185 && b > 150 && Math.abs(r - g) < 65;
}

function recolorSheet(src, skin, out) {
  const palettes = {
    midnight: { dark:[23,24,30], mid:[44,45,55], light:[84,85,98] },
    sakura: { dark:[216,142,165], mid:[248,214,226], light:[255,240,247] },
    jade: { dark:[38,112,74], mid:[80,188,118], light:[184,238,198] },
    gold: { dark:[156,107,0], mid:[227,168,14], light:[255,231,120] },
    boss: { dark:[138,76,20], mid:[232,154,44], light:[255,222,118] }
  };
  const p = palettes[skin];
  const img = { w: src.w, h: src.h, data: Buffer.from(src.data) };
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], a = img.data[i + 3];
    const cream = isCreamCatPixel(r, g, b, a);
    if (!isCatPixel(r, g, b, a) && !cream) continue;
    const l = cream
      ? Math.max(0.58, Math.min(1, (r * 0.42 + g * 0.45 + b * 0.13 - 155) / 95))
      : Math.max(0, Math.min(1, (r * 0.42 + g * 0.45 + b * 0.13 - 70) / 165));
    const lo = l < 0.55 ? p.dark : p.mid;
    const hi = l < 0.55 ? p.mid : p.light;
    const u = l < 0.55 ? l / 0.55 : (l - 0.55) / 0.45;
    img.data[i] = Math.round(lo[0] + (hi[0] - lo[0]) * u);
    img.data[i + 1] = Math.round(lo[1] + (hi[1] - lo[1]) * u);
    img.data[i + 2] = Math.round(lo[2] + (hi[2] - lo[2]) * u);
  }
  const frames = src.w / 256;
  for (let f = 0; f < frames; f++) decorateSkin(img, f * 256, skin);
  writePng(path.join(ASSETS, out), img);
}

function decorateSkin(img, ox, skin) {
  if (skin === "sakura") {
    for (const [x, y] of [[92,151], [100,149], [108,152]]) ellipse(img, ox + x, y, 4, 3, [255,128,176,230]);
  } else if (skin === "jade") {
    ellipse(img, ox + 99, 151, 5, 5, [245,197,24,245]);
    line(img, ox + 91, 147, ox + 107, 147, [245,197,24,210], 2);
  } else if (skin === "gold" || skin === "boss") {
    for (const [x, y] of [[78,108], [142,118], [120,84]]) {
      line(img, ox + x - 4, y, ox + x + 4, y, [255,250,190,230], 1.4);
      line(img, ox + x, y - 4, ox + x, y + 4, [255,250,190,230], 1.4);
    }
  }
  if (skin === "boss") {
    poly(img, [[ox+61,96], [ox+66,82], [ox+72,96]], [245,197,24,245]);
    poly(img, [[ox+70,96], [ox+76,78], [ox+83,96]], [255,231,120,245]);
    poly(img, [[ox+81,96], [ox+88,82], [ox+94,96]], [245,197,24,245]);
    fillRect(img, ox+60, 95, 36, 5, [156,107,0,245]);
  }
}

function stars(img, n, seed) {
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < n; i++) ellipse(img, rnd()*img.w, rnd()*img.h*.6, 1+rnd()*1.4, 1+rnd()*1.4, [255,244,224,90+rnd()*120]);
}

function lantern(img, x, y, scale = 1) {
  line(img, x, 0, x, y - 18*scale, [20,10,10,255], 2*scale);
  ellipse(img, x, y, 16*scale, 22*scale, [193,39,45,235]);
  fillRect(img, x-12*scale, y-24*scale, 24*scale, 5*scale, [245,197,24,235]);
  fillRect(img, x-11*scale, y+20*scale, 22*scale, 5*scale, [245,197,24,235]);
  ellipse(img, x-5*scale, y-6*scale, 5*scale, 13*scale, [255,105,88,80]);
}

function pagoda(img, x, base, scale, color = [24,12,18,230]) {
  for (let i = 0; i < 4; i++) {
    const y = base - i * 48 * scale, w = (110 - i * 18) * scale, h = 28 * scale;
    fillRect(img, x - w*.32, y - h, w*.64, h, color);
    poly(img, [[x-w*.58,y-h], [x+w*.58,y-h], [x,y-h-24*scale]], color);
  }
  fillRect(img, x - 18*scale, base - 4*48*scale, 36*scale, 190*scale, color);
}

function bgMarket() {
  const img = image(1024, 512);
  gradient(img, [[0,[34,18,60]], [.58,[61,20,50]], [1,[92,29,34]]]);
  stars(img, 80, 8);
  for (const x of [130, 330, 565, 810]) fillRect(img, x-90, 330, 180, 110, [22,10,18,190]);
  line(img, 0, 115, 512, 54, [193,39,45,200], 4);
  line(img, 512, 54, 1024, 112, [193,39,45,200], 4);
  for (const [x,y,s] of [[120,125,1.1],[260,86,.9],[430,76,.8],[600,93,1],[780,125,.9],[930,100,.8]]) lantern(img,x,y,1.7*s);
  fillRect(img, 0, 430, 1024, 82, [55,25,20,255]);
  return img;
}

function bgTemple() {
  const img = image(1024, 512);
  gradient(img, [[0,[39,20,22]], [.55,[95,37,18]], [1,[139,61,24]]]);
  ellipse(img, 230, 210, 170, 170, [255,214,95,75]);
  ellipse(img, 230, 210, 115, 115, [255,214,95,115]);
  pagoda(img, 760, 440, 1.05, [20,10,10,225]);
  pagoda(img, 545, 450, .62, [27,12,15,190]);
  for (let y=210; y<420; y+=38) fillRect(img, 0, y, 1024, 3, [255,244,224,22]);
  fillRect(img, 0, 430, 1024, 82, [68,34,22,255]);
  return img;
}

function bgBamboo() {
  const img = image(1024, 512);
  gradient(img, [[0,[13,41,40]], [.62,[20,54,47]], [1,[32,58,40]]]);
  fillRect(img, 0, 230, 1024, 80, [210,240,220,18]);
  for (const [x,w,a] of [[90,14,190],[205,11,150],[330,17,180],[515,13,155],[665,20,170],[820,12,145],[930,18,175]]) {
    fillRect(img, x-w/2, 0, w, 455, [20,80,52,a]);
    for (let y=75;y<430;y+=76) line(img, x-w/2, y, x+w/2, y, [245,197,24,44], 2);
    line(img, x, 170, x-55, 120, [47,112,74,100], 5);
    line(img, x, 240, x+60, 190, [47,112,74,90], 5);
  }
  for (let y=170; y<390; y+=55) fillRect(img, 0, y, 1024, 10, [210,240,220,16]);
  fillRect(img, 0, 430, 1024, 82, [30,52,34,255]);
  return img;
}

const walk = readPng(path.join(ASSETS, "cat-walk.png"));
const happy = readPng(path.join(ASSETS, "cat-happy.png"));
for (const skin of ["midnight", "sakura", "jade", "gold", "boss"]) {
  recolorSheet(walk, skin, skin === "boss" ? "cat-boss-walk.png" : `cat-${skin}-walk.png`);
  recolorSheet(happy, skin, skin === "boss" ? "cat-boss-happy.png" : `cat-${skin}-happy.png`);
}
writePng(path.join(ASSETS, "bg-market.png"), bgMarket());
writePng(path.join(ASSETS, "bg-temple.png"), bgTemple());
writePng(path.join(ASSETS, "bg-bamboo.png"), bgBamboo());

console.log("Generated premium shop assets in assets/");
