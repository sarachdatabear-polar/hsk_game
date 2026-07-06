#!/usr/bin/env python3
"""Build subsetted, self-hosted webfonts for the Visual Slice v1 UI.

Downloads three variable TTFs from the google/fonts GitHub repo (cached
under scripts/.fontcache/ so re-runs don't re-fetch), instances each to a
single fixed weight, subsets to only the glyphs the game actually needs, and
writes woff2 outputs into assets/fonts/:

  - lc-hanzi.woff2  <- Noto Serif SC, weight 900, glyphs = every hanzi in
                       data/words.json's `h` fields + ASCII + CJK punctuation.
  - lc-thai.woff2   <- Noto Sans Thai, weight 600, whole Thai block + Latin.
  - lc-latin.woff2  <- Fredoka, weight 600, Latin + punctuation + digits.

Re-runnable: skips all work if the three outputs already exist (like
build_audio.py). Requires `fonttools` + `brotli` (pip install fonttools
brotli) for variable-font instancing and woff2 subsetting.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".fontcache"
OUT = ROOT / "assets" / "fonts"
WORDS_JSON = ROOT / "data" / "words.json"

# (cache filename, raw GitHub URL) for each source variable font.
SOURCES = {
    "notoserifsc": (
        "NotoSerifSC[wght].ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
    ),
    "notosansthai": (
        "NotoSansThai[wdth,wght].ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansthai/NotoSansThai%5Bwdth%2Cwght%5D.ttf",
    ),
    "fredoka": (
        "Fredoka[wdth,wght].ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/Fredoka%5Bwdth%2Cwght%5D.ttf",
    ),
}

OUTPUTS = {
    "hanzi": OUT / "lc-hanzi.woff2",
    "thai": OUT / "lc-thai.woff2",
    "latin": OUT / "lc-latin.woff2",
}

ASCII_BASIC = "".join(chr(c) for c in range(0x20, 0x7F))
# CJK punctuation used in the plaque/UI, plus the boss "？？" placeholder and
# the "·" separator used elsewhere in the UI (both already present here).
CJK_PUNCT = "，。！？、：；“”‘’（）·—…"


def log(msg):
    print(msg, flush=True)


def download(name):
    """Fetch a source font into the cache dir, skipping if already cached."""
    fname, url = SOURCES[name]
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / fname
    if dest.exists():
        return dest
    log(f"  downloading {name}: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "lucky-cat-hsk-build-fonts"})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    dest.write_bytes(data)
    log(f"    saved {dest.name} ({len(data)/1024:.0f} KB)")
    return dest


def collect_hanzi_unicodes():
    """Every unique hanzi character across all `h` fields in words.json."""
    data = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    chars = set()
    for level_words in data["levels"].values():
        for w in level_words:
            chars.update(w["h"])
    chars.update(ASCII_BASIC)
    chars.update(CJK_PUNCT)
    return chars


def instance(src, dest, axes):
    """Pin a variable font's axes to fixed values (varLib.instancer)."""
    args = [sys.executable, "-m", "fontTools.varLib.instancer",
            "-o", str(dest), str(src)]
    args += [f"{axis}={value}" for axis, value in axes.items()]
    subprocess.run(args, check=True)


def subset(src, dest_woff2, unicodes=None, whole_thai=False):
    args = [sys.executable, "-m", "fontTools.subset", str(src),
            f"--output-file={dest_woff2}", "--flavor=woff2",
            "--layout-features=*"]
    if whole_thai:
        # Thai block (U+0E00-0E7F) + basic Latin, kept whole per spec.
        args.append("--unicodes=U+0020-007E,U+0E00-0E7F")
    elif unicodes is not None:
        args.append("--unicodes=" + ",".join(f"U+{ord(c):04X}" for c in sorted(unicodes)))
    subprocess.run(args, check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if all(p.exists() for p in OUTPUTS.values()):
        log("All font outputs already exist, skipping build:")
        for name, path in OUTPUTS.items():
            log(f"  {path.name}: {path.stat().st_size/1024:.1f} KB")
        return 0

    log("Downloading source fonts (cached under scripts/.fontcache/)...")
    serif_src = download("notoserifsc")
    thai_src = download("notosansthai")
    fredoka_src = download("fredoka")

    log("Instancing variable fonts to fixed weights...")
    serif_static = CACHE / "NotoSerifSC-900.ttf"
    instance(serif_src, serif_static, {"wght": 900})
    thai_static = CACHE / "NotoSansThai-600.ttf"
    instance(thai_src, thai_static, {"wght": 600, "wdth": 100})
    fredoka_static = CACHE / "Fredoka-600.ttf"
    instance(fredoka_src, fredoka_static, {"wght": 600, "wdth": 100})

    log("Subsetting...")
    hanzi_unicodes = collect_hanzi_unicodes()
    log(f"  hanzi subset: {len(hanzi_unicodes)} unique codepoints from data/words.json + ASCII + CJK punct")
    subset(serif_static, OUTPUTS["hanzi"], unicodes=hanzi_unicodes)
    subset(thai_static, OUTPUTS["thai"], whole_thai=True)
    subset(fredoka_static, OUTPUTS["latin"], unicodes=set(ASCII_BASIC))

    log("Done. Output sizes:")
    for name, path in OUTPUTS.items():
        log(f"  {path.name}: {path.stat().st_size/1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
