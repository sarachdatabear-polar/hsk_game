#!/usr/bin/env python3
"""Emit hsk3-mapping.json: {hanzi: hsk3_band} for every catalog word that maps
onto the verified HSK 3.0 list. This is the READY-TO-WIRE input for roadmap
option 2 (dual-label). It is DATA ONLY — nothing consumes it until Jordan
approves wiring `h3` into build_game_data.py. Reproducible; touches no prod data.
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ROOT = os.path.abspath(os.path.join(GAME, ".."))
PROD = os.path.join(ROOT, "product", "by-level")
HSK30 = os.path.join(HERE, "hsk30-source.csv")


def load_hsk30():
    m = {}
    for row in csv.DictReader(open(HSK30, newline="")):
        lvl = row["Level"].strip()
        for w in row["Simplified"].split("|"):
            w = w.strip()
            if w and w not in m:
                m[w] = lvl
    return m


def catalog_hanzi():
    seen = set()
    for lv in "123456":
        path = os.path.join(PROD, f"HSK{lv}_words-to-remember_bilingual.csv")
        for row in csv.DictReader(open(path, newline="", encoding="utf-8-sig")):
            w = (row.get("hanzi") or "").strip()
            if w:
                seen.add(w)
    return seen


def main():
    h30 = load_hsk30()
    ours = catalog_hanzi()
    mapping = {w: h30[w] for w in sorted(ours) if w in h30}
    out = os.path.join(HERE, "hsk3-mapping.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=0, sort_keys=True)
    bands = {}
    for b in mapping.values():
        bands[b] = bands.get(b, 0) + 1
    print(f"wrote {out}: {len(mapping)} words")
    print("band distribution:", {k: bands[k] for k in sorted(bands)})


if __name__ == "__main__":
    main()
