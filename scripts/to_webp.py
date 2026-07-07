#!/usr/bin/env python3
"""Convert a full-screen background to WebP at original resolution.

Full-screen 1080x1920 painted scenes cannot reach the 350 KB budget as PNG
without visible quality loss; WebP q80 lands at ~100-250 KB with none.
Prints the resulting size. Does not delete the source file.

Usage: python3 scripts/to_webp.py assets/bg-home.png [more ...]
"""
import sys
from pathlib import Path

from PIL import Image

def convert(path):
    p = Path(path)
    out = p.with_suffix(".webp")
    img = Image.open(p)
    img.load()
    img.convert("RGB").save(out, quality=80, method=6)
    print(f"{out.name}: {out.stat().st_size // 1024}KB (from {p.stat().st_size // 1024}KB png)")

if __name__ == "__main__":
    for a in sys.argv[1:]:
        convert(a)
