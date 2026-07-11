#!/usr/bin/env python3
"""Measure content bounding boxes for character sprite sheets and emit
src/sprite-metrics.js.

Why: cat.js/raccoon.js draw sprite frames into a fixed 256px source box, but
each sheet's painted content (non-transparent pixels) fills that box very
differently — the stock cat art floats mid-frame and is much shorter than
the raccoon art, which is why the player cat used to render far smaller than
the enemy in battle. Measuring the actual content box per sheet lets the
draw code scale/anchor sprites consistently regardless of how much of the
256px frame the art happens to fill.

Frames are 256px wide each (frameCount = sheet width / 256); this script
computes the UNION of each frame's alpha bounding box across the whole
sheet (not per-frame) so the measured box doesn't jitter across the walk/
happy animation cycle.

Usage: python3 scripts/gen_sprite_metrics.py
Regenerate after any character-sheet PNG changes.
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ROOT / "src" / "sprite-metrics.js"

FRAME_W = 256

# character sheets only — cat*-walk.png, cat*-happy.png, raccoon-walk.png,
# raccoon-happy.png (excludes portrait/guide/study/thinking/celebrate stills,
# which aren't frame sheets).
SHEET_RE = re.compile(r"^(cat.*-(walk|happy)|raccoon-(walk|happy))\.png$")


def union_bbox(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    frames = max(1, w // FRAME_W)
    alpha = img.getchannel("A")
    l, t, r, b = None, None, None, None
    for f in range(frames):
        box = (f * FRAME_W, 0, f * FRAME_W + FRAME_W, h)
        frame_alpha = alpha.crop(box)
        bbox = frame_alpha.getbbox()
        if bbox is None:
            continue
        fl, ft, fr, fb = bbox
        l = fl if l is None else min(l, fl)
        t = ft if t is None else min(t, ft)
        r = fr if r is None else max(r, fr)
        b = fb if b is None else max(b, fb)
    if l is None:
        # fully transparent sheet — shouldn't happen, but don't crash the build
        return {"l": 0, "t": 0, "r": FRAME_W, "b": h}
    return {"l": l, "t": t, "r": r, "b": b}


def main():
    sheets = sorted(p for p in ASSETS.glob("*.png") if SHEET_RE.match(p.name))
    metrics = {}
    for path in sheets:
        name = path.stem  # e.g. "cat-walk"
        metrics[name] = union_bbox(path)

    lines = [
        "// GENERATED FILE — do not hand-edit.",
        "// Regenerate with: python3 scripts/gen_sprite_metrics.py",
        "// (after any character-sheet PNG change in assets/).",
        "//",
        "// Union alpha bounding box per sheet, computed across all frames (not",
        "// per-frame, so the walk/happy animation doesn't jitter). Frames are",
        "// 256px wide; l/t/r/b are pixel coordinates within a single frame.",
        '"use strict";',
        "",
        "export const SPRITE_METRICS = {",
    ]
    for name in sorted(metrics):
        m = metrics[name]
        lines.append(f'  "{name}": {{ l: {m["l"]}, t: {m["t"]}, r: {m["r"]}, b: {m["b"]} }},')
    lines.append("};")
    lines.append("")

    OUT.write_text("\n".join(lines))
    print(f"wrote {OUT.relative_to(ROOT)} — {len(metrics)} sheets:")
    for name in sorted(metrics):
        m = metrics[name]
        print(f"  {name}: l={m['l']} t={m['t']} r={m['r']} b={m['b']}")


if __name__ == "__main__":
    main()
