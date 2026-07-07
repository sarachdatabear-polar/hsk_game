#!/usr/bin/env python3
"""Intake raw browser-generated art into spec-conformant asset candidates.

Browser tools (AI Studio / ChatGPT) can't hit the exact asset dimensions, so
this script bridges the gap:

  backdrops   scale + crop to 1024x512 (biased to keep the bottom lane),
              then scripts/compress_bg.py
  sheets      flood-fill the solid background to alpha, split into frames,
              re-grid onto the exact 256px frame layout with a common
              foot baseline

Usage:
  python3 scripts/intake_art.py                  # everything in ~/Desktop/hsk-art-drop
  python3 scripts/intake_art.py path/to/img.png  # specific file(s)
  python3 scripts/intake_art.py --install bg-market.png:cand-02

Raw files must start with the target asset name (`bg-market (2).png` is fine).
Each raw file becomes drop/processed/<target>/cand-NN/<target>.png and is run
through scripts/qa_asset.py. `--install target:cand-NN` copies a winner into
assets/.
"""
import json
import re
import shutil
import subprocess
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DROP = Path.home() / "Desktop" / "hsk-art-drop"
MANIFEST = json.loads((ROOT / "assets" / "asset-manifest.json").read_text())
BY_FILE = {a["file"]: a for a in MANIFEST["assets"]}
BG_CROP_TOP_BIAS = 0.7  # crop mostly from the top; the lane lives at the bottom


def find_target(path):
    stem = Path(path).stem.lower()
    best = None
    for name in BY_FILE:
        base = Path(name).stem.lower()
        if stem == base or re.match(rf"{re.escape(base)}[^a-z0-9]", stem):
            if best is None or len(base) > len(Path(best).stem):
                best = name
    return best


def to_backdrop(img, w, h):
    img = img.convert("RGB")
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)),
                     Image.LANCZOS)
    x0 = (img.width - w) // 2
    y0 = min(int((img.height - h) * BG_CROP_TOP_BIAS), img.height - h)
    return img.crop((x0, y0, x0 + w, y0 + h))


def strip_background(img, tol=42):
    """Flood-fill the border-connected solid background to transparency."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    # background reference: average of the four 8x8 corner patches
    samples = [px[x, y][:3] for cx, cy in [(0, 0), (w - 8, 0), (0, h - 8), (w - 8, h - 8)]
               for x in range(cx, cx + 8) for y in range(cy, cy + 8)]
    if any(px[x, y][3] < 8 for x, y in [(0, 0), (w - 1, h - 1)]):
        return img  # already transparent
    bg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))

    def is_bg(p):
        return (sum((p[i] - bg[i]) ** 2 for i in range(3)) ** 0.5) <= tol

    mask = bytearray(w * h)  # 1 = background
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not mask[y * w + x]:
                mask[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not mask[y * w + x]:
                mask[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not mask[ny * w + nx] \
                    and is_bg(px[nx, ny]):
                mask[ny * w + nx] = 1
                q.append((nx, ny))
    alpha = Image.frombytes("L", (w, h),
                            bytes(0 if m else 255 for m in mask))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))  # soften the cut edge
    img.putalpha(alpha)
    return img


def split_frames(img, n):
    """Split a horizontal strip into n frames on transparent-column gaps,
    falling back to an even split."""
    w, h = img.size
    a = img.getchannel("A")
    cols = [0] * w
    ap = a.load()
    for x in range(w):
        cols[x] = sum(1 for y in range(0, h, 2) if ap[x, y] > 24)
    blank = [c <= 1 for c in cols]
    # runs of blank columns strictly inside the strip = separators
    seps, x = [], 1
    while x < w - 1:
        if blank[x]:
            x0 = x
            while x < w - 1 and blank[x]:
                x += 1
            seps.append((x0 + x) // 2)
        x += 1
    cuts = [0] + seps + [w]
    if len(cuts) - 1 != n:
        cuts = [round(i * w / n) for i in range(n + 1)]  # even fallback
        print(f"      note: no clean {n}-frame gaps found, splitting evenly")
    return [img.crop((cuts[i], 0, cuts[i + 1], h)) for i in range(n)]


def to_sheet(img, row):
    n, fw, fh = row["frames"], row["frameWidth"], row["frameHeight"]
    img = strip_background(img)
    bbox = img.getbbox()
    if bbox is None:
        raise ValueError("image is empty after background removal")
    frames = [f.crop(f.getbbox()) for f in split_frames(img.crop(bbox), n)
              if f.getbbox()]
    if len(frames) != n:
        raise ValueError(f"found {len(frames)} non-empty frames, expected {n}")
    # one common scale so the character size stays identical across frames
    scale = min((fh - 24) / max(f.height for f in frames),
                (fw - 16) / max(f.width for f in frames))
    sheet = Image.new("RGBA", (fw * n, fh), (0, 0, 0, 0))
    baseline = fh - 12  # common foot line
    for i, f in enumerate(frames):
        f = f.resize((max(1, round(f.width * scale)),
                      max(1, round(f.height * scale))), Image.LANCZOS)
        sheet.alpha_composite(
            f, (i * fw + (fw - f.width) // 2, baseline - f.height))
    return sheet


def process(path):
    target = find_target(path)
    if target is None:
        print(f"skip  {path} — name doesn't match any manifest asset")
        return None
    row = BY_FILE[target]
    outdir_base = DROP / "processed" / target
    outdir_base.mkdir(parents=True, exist_ok=True)
    cand = f"cand-{len(list(outdir_base.glob('cand-*'))) + 1:02d}"
    outdir = outdir_base / cand
    outdir.mkdir()
    out = outdir / target
    img = Image.open(path)
    if row["type"] == "sprite-sheet":
        to_sheet(img, row).save(out, optimize=True)
    else:
        to_backdrop(img, row["w"], row["h"]).save(out, optimize=True)
        subprocess.run([sys.executable, ROOT / "scripts" / "compress_bg.py", out],
                       check=True, capture_output=True)
    print(f"{target} <- {Path(path).name}  [{cand}]")
    subprocess.run([sys.executable, ROOT / "scripts" / "qa_asset.py", out])
    return out


def install(spec):
    target, cand = spec.split(":")
    src = DROP / "processed" / target / cand / target
    if not src.exists():
        sys.exit(f"no such candidate: {src}")
    shutil.copy(src, ROOT / "assets" / target)
    print(f"installed {target} from {cand} -> assets/{target}")
    subprocess.run([sys.executable, ROOT / "scripts" / "qa_asset.py",
                    ROOT / "assets" / target])


def main(argv):
    if argv[:1] == ["--install"]:
        for spec in argv[1:]:
            install(spec)
        return
    files = [Path(p) for p in argv] if argv else sorted(
        p for p in DROP.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    if not files:
        sys.exit(f"nothing to intake — drop raw generations into {DROP}")
    for p in files:
        try:
            process(p)
        except Exception as exc:
            print(f"FAIL  {p.name}: {exc}")


if __name__ == "__main__":
    main(sys.argv[1:])
