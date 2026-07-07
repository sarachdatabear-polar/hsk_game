#!/usr/bin/env python3
"""Mechanical half of the PRD v5 A2 asset QA gate.

Checks (hard FAIL): PNG readable, dims match the manifest row, size budget for
background/sprite-sheet, sprite-sheet frame math, alpha channel present when the
manifest type requires transparency.
Checks (advisory WARN): palette distance from the STYLE-TOKENS core palette,
opaque-corner check for alpha assets.

Judgment items (light direction, silhouette, line weight) stay manual — see
docs/art/ART-QA-CHECKLIST.md.

Usage: python3 scripts/qa_asset.py assets/bg-market.png [assets/other.png ...]
Exit 1 if any file FAILs.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "assets" / "asset-manifest.json").read_text())
BY_FILE = {a["file"]: a for a in MANIFEST["assets"]}

# STYLE-TOKENS.md §1 core palette
PALETTE = [
    (0x32, 0x77, 0x5E), (0x5D, 0xAA, 0xDD), (0xF2, 0xBC, 0x57), (0xE6, 0x97, 0x77),
    (0x84, 0x60, 0x43), (0xB2, 0xAE, 0xA9), (0xFB, 0xF5, 0xE8), (0x1F, 0x4D, 0x4A),
    (0x28, 0x72, 0x3B), (0xC9, 0x5A, 0x41), (0xEA, 0xC7, 0x96), (0x2E, 0x2A, 0x24),
]
HARD_BUDGETS = {"background": 350 * 1024, "sprite-sheet": 500 * 1024}
ALPHA_TYPES = {"sprite-sheet", "character", "decor", "effect", "ui-surface"}
PALETTE_TOLERANCE = 72     # max RGB distance to count a pixel as "on palette"
PALETTE_MIN_FRACTION = 0.80


def palette_fraction(img):
    small = img.convert("RGBA").resize((64, 64))
    px = list(small.getdata())
    opaque = [(r, g, b) for r, g, b, a in px if a >= 128]
    if not opaque:
        return 1.0
    def near(p):
        return any(((p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2) ** 0.5 <= PALETTE_TOLERANCE
                   for c in PALETTE)
    return sum(1 for p in opaque if near(p)) / len(opaque)


def check(path):
    fails, warns = [], []
    name = Path(path).name
    row = BY_FILE.get(name)
    if row is None:
        fails.append("not in asset-manifest.json — add a row first")
        return fails, warns
    try:
        img = Image.open(path)
        img.load()
    except Exception as exc:
        fails.append(f"unreadable image: {exc}")
        return fails, warns

    if (img.width, img.height) != (row["w"], row["h"]):
        fails.append(f"dims {img.width}x{img.height} != manifest {row['w']}x{row['h']}")

    size = Path(path).stat().st_size
    budget = HARD_BUDGETS.get(row["type"])
    if budget and size > budget:
        fails.append(f"{size//1024}KB over the {budget//1024}KB {row['type']} budget "
                     f"(1024x512 PNGs: scripts/compress_bg.py; full-screen bgs: scripts/to_webp.py)")

    if row["type"] == "sprite-sheet":
        if row["frameWidth"] * row["frames"] != row["w"] or row["frameHeight"] != row["h"]:
            fails.append("manifest frame math broken")

    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
    if row["type"] in ALPHA_TYPES:
        if not has_alpha:
            fails.append(f"type {row['type']} requires an alpha channel")
        else:
            rgba = img.convert("RGBA")
            corners = [rgba.getpixel(p)[3] for p in
                       [(0, 0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)]]
            if min(corners) > 32:
                warns.append("all four corners are opaque — matte/background may be baked in")
    elif row["type"] == "background" and has_alpha:
        warns.append("background has an alpha channel — export without alpha to save bytes")

    frac = palette_fraction(img)
    if frac < PALETTE_MIN_FRACTION:
        warns.append(f"only {frac:.0%} of pixels near the STYLE-TOKENS palette "
                     f"(advisory floor {PALETTE_MIN_FRACTION:.0%}) — eyeball against the reference")
    return fails, warns


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    any_fail = False
    for path in argv:
        fails, warns = check(path)
        status = "FAIL" if fails else ("WARN" if warns else "PASS")
        any_fail = any_fail or bool(fails)
        print(f"{status}  {path}")
        for msg in fails:
            print(f"      FAIL: {msg}")
        for msg in warns:
            print(f"      warn: {msg}")
    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
