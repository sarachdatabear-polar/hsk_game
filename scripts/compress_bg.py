#!/usr/bin/env python3
"""Compress a background PNG to the A2 budget without changing dimensions.

Strategy: flatten to RGB (backgrounds carry no alpha contract), palette-quantize
with dithering, save optimized. Steps down the color count until the file fits
the budget. Dimensions never change (validate-assets enforces exact dims).

Usage: python3 scripts/compress_bg.py assets/bg-home.png [more ...]
"""
import sys
from pathlib import Path

from PIL import Image

BUDGET = 350 * 1024
COLOR_STEPS = [256, 192, 128, 96, 64]


def compress(path):
    p = Path(path)
    original = p.stat().st_size
    img = Image.open(p)
    img.load()
    rgb = img.convert("RGB")
    for colors in COLOR_STEPS:
        q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
        q.save(p, optimize=True)
        size = p.stat().st_size
        if size <= BUDGET:
            print(f"{p.name}: {original//1024}KB -> {size//1024}KB ({colors} colors)")
            return True
    print(f"{p.name}: still {size//1024}KB over budget at {COLOR_STEPS[-1]} colors — needs manual handling")
    return False


if __name__ == "__main__":
    ok = all([compress(a) for a in sys.argv[1:]])
    sys.exit(0 if ok else 1)
