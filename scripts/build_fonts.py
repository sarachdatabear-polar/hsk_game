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

Re-runnable and content-aware: for each output, a sha256 hash of its
required character set is stored in assets/fonts/subset-manifest.json.
A font is only skipped when its output file exists AND its stored hash
matches the currently required character set - so a vocabulary refresh
that introduces new hanzi glyphs forces a rebuild instead of silently
shipping a stale subset missing those glyphs.

Requires `fonttools` + `brotli` (pip install fonttools brotli) for
variable-font instancing and woff2 subsetting.
"""
import hashlib
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".fontcache"
OUT = ROOT / "assets" / "fonts"
WORDS_JSON = ROOT / "data" / "words.json"
SUBSET_MANIFEST = OUT / "subset-manifest.json"

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

# Per-output pipeline: which source font to use, which axes to pin when
# instancing the variable font, and where to cache the instanced static.
FONT_PIPELINE = {
    "hanzi": {"source": "notoserifsc", "axes": {"wght": 900}, "static_name": "NotoSerifSC-900.ttf"},
    "thai": {"source": "notosansthai", "axes": {"wght": 600, "wdth": 100}, "static_name": "NotoSansThai-600.ttf"},
    "latin": {"source": "fredoka", "axes": {"wght": 600, "wdth": 100}, "static_name": "Fredoka-600.ttf"},
}

ASCII_BASIC = "".join(chr(c) for c in range(0x20, 0x7F))
# CJK punctuation used in the plaque/UI, plus the boss "？？" placeholder and
# the "·" separator used elsewhere in the UI (both already present here).
CJK_PUNCT = "，。！？、：；“”‘’（）·—…"
# Thai block (U+0E00-0E7F) + basic Latin, kept whole per spec.
THAI_UNICODES = "U+0020-007E,U+0E00-0E7F"


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


def collect_hanzi_unicodes() -> set:
    """Every unique hanzi character across all `h` fields in words.json."""
    data = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    chars = set()
    for level_words in data["levels"].values():
        for w in level_words:
            chars.update(w["h"])
    chars.update(ASCII_BASIC)
    chars.update(CJK_PUNCT)
    return chars


def required_charsets() -> dict:
    """The character set each output font subset must cover, keyed by
    output name. Used both to build the subset and to hash it for the
    skip-if-unchanged check."""
    return {
        "hanzi": collect_hanzi_unicodes(),
        # Fixed ranges, but hashed too so a future change to these
        # constants is also picked up by the freshness check.
        "thai": set(chr(c) for c in range(0x20, 0x7F)) | set(chr(c) for c in range(0x0E00, 0x0E80)),
        "latin": set(ASCII_BASIC),
    }


def charset_hash(chars) -> str:
    """Stable sha256 over the sorted unique characters in a set."""
    ordered = "".join(sorted(set(chars)))
    return hashlib.sha256(ordered.encode("utf-8")).hexdigest()


def load_subset_manifest() -> dict:
    if not SUBSET_MANIFEST.exists():
        return {}
    try:
        return json.loads(SUBSET_MANIFEST.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_subset_manifest(manifest: dict) -> None:
    SUBSET_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


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
        args.append(f"--unicodes={THAI_UNICODES}")
    elif unicodes is not None:
        args.append("--unicodes=" + ",".join(f"U+{ord(c):04X}" for c in sorted(unicodes)))
    subprocess.run(args, check=True)


def build_one(name: str, chars: set) -> None:
    """Run the download -> instance -> subset pipeline for a single output."""
    spec = FONT_PIPELINE[name]
    src = download(spec["source"])
    static_path = CACHE / spec["static_name"]
    if not static_path.exists():
        instance(src, static_path, spec["axes"])
    dest = OUTPUTS[name]
    if name == "thai":
        subset(static_path, dest, whole_thai=True)
    else:
        subset(static_path, dest, unicodes=chars)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    required = required_charsets()
    hashes = {name: charset_hash(chars) for name, chars in required.items()}
    stored = load_subset_manifest()

    def up_to_date(name: str) -> bool:
        return (OUTPUTS[name].exists()
                and stored.get(name, {}).get("hash") == hashes[name])

    stale = [name for name in OUTPUTS if not up_to_date(name)]

    if not stale:
        log("All font outputs exist and glyph subsets match current requirements, skipping build:")
        for name, path in OUTPUTS.items():
            log(f"  {path.name}: {path.stat().st_size/1024:.1f} KB")
        return 0

    for name in stale:
        reason = "missing output" if not OUTPUTS[name].exists() else "glyph requirements changed"
        log(f"Rebuilding {OUTPUTS[name].name}: {reason}")

    for name in stale:
        build_one(name, required[name])
        stored[name] = {"hash": hashes[name], "chars": len(required[name])}

    save_subset_manifest(stored)

    log("Done. Output sizes:")
    for name, path in OUTPUTS.items():
        log(f"  {path.name}: {path.stat().st_size/1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
