#!/usr/bin/env python3
"""One-off: repackage the v2 cat art drop (upright side-profile walk/happy,
non-standard canvas sizes) into the canonical 256px-frame sheet format the
game pipeline expects (like raccoon-walk = 1536x256).

The drop came as cat-walk.png (2172x724, 6 frames) and cat-happy.png
(1774x887, 4 frames) with uneven frame spacing. drawSpriteFrame() and
gen_sprite_metrics.py both hardcode 256px-wide frames, so we re-slice each
sheet by detecting transparent gutters, then uniform-scale each full-height
frame (preserving the walk bob / happy hop) into a 256x256 cell, bottom-
anchored and horizontally centered. Output: N*256 x 256.

Run mode:
  python3 scripts/repack_cat_sheets.py            # analyze only (prints frames)
  python3 scripts/repack_cat_sheets.py --write     # write art-source + assets
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SRC = ROOT / "art-source" / "education-v1"
CELL = 256
ALPHA_SOLID = 180         # pixel counts as solid character content above this alpha
MIN_SOLID_COL = 4         # a column is "content" if it has >= this many solid pixels
GUTTER_MIN = 10           # min consecutive empty columns to count as a frame gutter
MIN_FRAME_W = 60          # runs narrower than this are stray specks, not a frame
MIN_BLOB = 800            # opaque components smaller than this are dust, not a cat
RING_CLEAN = 24           # after resize, alpha below this is LANCZOS ringing -> clear

SHEETS = {
    "cat-walk": 6,
    "cat-happy": 4,
}


def remove_background(img):
    """The drop ships fully opaque on a near-white background. Flood-fill the
    exterior from the borders through near-white/neutral pixels (the cat's
    brown outline is a barrier, so interior cream fur is preserved), then also
    clear the thin light anti-alias fringe touching the removed area."""
    rgb = img.convert("RGB")
    W, H = rgb.size
    SENT = (255, 0, 255)
    seeds = [(x, 0) for x in range(0, W, 32)] + [(x, H - 1) for x in range(0, W, 32)]
    seeds += [(0, y) for y in range(0, H, 32)] + [(W - 1, y) for y in range(0, H, 32)]
    for s in seeds:
        r, g, b = rgb.getpixel(s)
        if r > 235 and g > 235 and b > 235:            # only seed on background-like pixels
            ImageDraw.floodfill(rgb, s, SENT, thresh=30)
    arr = np.asarray(rgb)
    bg = np.all(arr == np.array(SENT), axis=-1)         # (h,w) exterior mask
    # fringe: neutral near-white pixels adjacent to the removed exterior
    src = np.asarray(img.convert("RGBA")).copy()
    rgbf = src[..., :3].astype(np.int16)
    neutral_white = (rgbf.min(axis=-1) > 232) & ((rgbf.max(axis=-1) - rgbf.min(axis=-1)) < 16)
    adj = np.zeros_like(bg)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        adj |= np.roll(bg, (dy, dx), axis=(0, 1))
    fringe = neutral_white & adj & ~bg
    keep = ~(bg | fringe)
    keep = largest_components(keep, MIN_BLOB)     # drop isolated dust/bokeh specks
    src[..., 3] = np.where(keep, 255, 0).astype(np.uint8)
    return Image.fromarray(src, "RGBA")


def largest_components(mask, min_area):
    """Keep only connected opaque components with >= min_area pixels (the cats);
    zero out small isolated blobs (surviving background specks). 4-connected
    BFS over just the True pixels — no scipy."""
    from collections import deque
    h, w = mask.shape
    visited = np.zeros_like(mask)
    out = np.zeros_like(mask)
    for sy, sx in np.argwhere(mask):
        if visited[sy, sx]:
            continue
        q = deque([(sy, sx)])
        visited[sy, sx] = True
        comp = []
        while q:
            cy, cx = q.popleft()
            comp.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
        if len(comp) >= min_area:
            idx = np.array(comp)
            out[idx[:, 0], idx[:, 1]] = True
    return out


def detect_frames(img):
    """Return list of (x0, x1) content runs separated by transparent gutters.
    Thresholds on SOLID pixels so scattered low-alpha dust/bokeh specks don't
    fill the gutters."""
    a = np.asarray(img.getchannel("A"))          # (h, w)
    solid_per_col = (a >= ALPHA_SOLID).sum(axis=0)
    content = solid_per_col >= MIN_SOLID_COL
    w = len(content)
    runs = []
    x = 0
    while x < w:
        if content[x]:
            start = x
            while x < w and content[x]:
                x += 1
            runs.append([start, x])
        else:
            x += 1
    # merge runs separated by a gutter thinner than GUTTER_MIN (limbs/tail gaps within one cat)
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < GUTTER_MIN:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    # drop sub-frame slivers (stray edge specks / whisker tips that survived bg removal)
    merged = [r for r in merged if r[1] - r[0] >= MIN_FRAME_W]
    return [tuple(r) for r in merged]


def repack(name, expected, debug_dir=None):
    # prefer the preserved high-res opaque master so re-runs are idempotent
    master = SRC / f"{name}-v2-master.png"
    path = master if master.exists() else ASSETS / f"{name}.png"
    img = Image.open(path).convert("RGBA")
    img = remove_background(img)
    if debug_dir:
        img.save(Path(debug_dir) / f"{name}-nobg.png")
    w, h = img.size
    frames = detect_frames(img)
    print(f"{name}: {w}x{h} -> detected {len(frames)} frames (expected {expected})")
    for i, (x0, x1) in enumerate(frames):
        print(f"    frame {i}: x[{x0}:{x1}] w={x1-x0}")
    if len(frames) != expected:
        print(f"  !! frame count mismatch — NOT writing {name}")
        return None
    # cut boundaries = midpoints between adjacent runs; edges snap to run edges w/ small pad
    cuts = [0]
    for i in range(len(frames) - 1):
        cuts.append((frames[i][1] + frames[i + 1][0]) // 2)
    cuts.append(w)
    s = CELL / h  # uniform scale: full sheet height -> 256, preserves vertical motion
    out = Image.new("RGBA", (CELL * len(frames), CELL), (0, 0, 0, 0))
    for i in range(len(frames)):
        sx0, sx1 = cuts[i], cuts[i + 1]
        slice_img = img.crop((sx0, 0, sx1, h))          # full height slice (motion preserved)
        sw = max(1, round((sx1 - sx0) * s))
        scaled = slice_img.resize((sw, CELL), Image.LANCZOS)
        # LANCZOS can ring the 0/255 alpha into faint halo — clear sub-threshold alpha
        sa = np.asarray(scaled).copy()
        sa[..., 3] = np.where(sa[..., 3] < RING_CLEAN, 0, sa[..., 3])
        scaled = Image.fromarray(sa, "RGBA")
        # horizontally center the frame's CONTENT (not the slice) in the cell
        bb = scaled.getbbox()
        if bb:
            content_cx = (bb[0] + bb[2]) / 2
        else:
            content_cx = sw / 2
        dx = round(CELL / 2 - content_cx)
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.alpha_composite(scaled, (dx, 0))
        out.paste(cell, (i * CELL, 0))
    return out


def main():
    write = "--write" in sys.argv
    debug_dir = None
    for a in sys.argv:
        if a.startswith("--debug="):
            debug_dir = a.split("=", 1)[1]
            Path(debug_dir).mkdir(parents=True, exist_ok=True)
    results = {}
    for name, expected in SHEETS.items():
        res = repack(name, expected, debug_dir)
        if res is not None:
            results[name] = res
    if not write:
        print("\n(analyze only — pass --write to save)")
        return
    if len(results) != len(SHEETS):
        print("\nAborting write — not all sheets repacked cleanly.")
        sys.exit(1)
    SRC.mkdir(parents=True, exist_ok=True)
    for name in SHEETS:
        # preserve the raw high-res master
        raw = ASSETS / f"{name}.png"
        master = SRC / f"{name}-v2-master.png"
        if not master.exists():
            Image.open(raw).save(master)
        results[name].save(ASSETS / f"{name}.png")
        print(f"wrote {name}.png ({results[name].size[0]}x{results[name].size[1]}) + master {master.name}")


if __name__ == "__main__":
    main()
