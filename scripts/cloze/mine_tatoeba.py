#!/usr/bin/env python3
"""Mine Tatoeba (CC-BY 2.0 FR) for HSK1-2 cloze candidates.

Downloads (once, cached in scripts/cloze/.cache/):
  https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2
  https://downloads.tatoeba.org/exports/per_language/cmn/cmn-eng_links.tsv.bz2
  https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2

Keeps sentences that: contain exactly one HSK1-2 target word as a whole
token, are 4-14 hanzi, use only vocabulary at-or-below the target's level,
and have an English translation. Emits candidates.csv (hanzi,sentence,en,
source) sorted by target then sentence length — the intake (plan Task 4)
picks the best row per word and adds th + vetted distractors.
"""
import bz2
import csv
import re
import sys
import urllib.request
from pathlib import Path

from clozelib import load_levels, segment, HANZI_RE

HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache"
ROOT = HERE.parent.parent
BASE = "https://downloads.tatoeba.org/exports/per_language"
FILES = {
    "cmn_sentences.tsv.bz2": f"{BASE}/cmn/cmn_sentences.tsv.bz2",
    "cmn-eng_links.tsv.bz2": f"{BASE}/cmn/cmn-eng_links.tsv.bz2",
    "eng_sentences.tsv.bz2": f"{BASE}/eng/eng_sentences.tsv.bz2",
}


def fetch(name):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if not path.exists():
        print(f"downloading {name} ...", file=sys.stderr)
        urllib.request.urlretrieve(FILES[name], path)
    return path


def rows(path):
    with bz2.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            yield line.rstrip("\n").split("\t")


def main():
    levels = load_levels(ROOT / "data" / "words.json")
    vocab = set(levels)
    targets = {h for h, lv in levels.items() if lv <= 2}

    cmn = {}          # id -> sentence text
    for r in rows(fetch("cmn_sentences.tsv.bz2")):
        if len(r) >= 3:
            cmn[r[0]] = r[2]

    links = {}        # cmn id -> first eng id
    for r in rows(fetch("cmn-eng_links.tsv.bz2")):
        if len(r) >= 2 and r[0] in cmn:
            links.setdefault(r[0], r[1])

    needed_eng = set(links.values())
    eng = {}          # eng id -> text (streamed; only keep the ids we need)
    for r in rows(fetch("eng_sentences.tsv.bz2")):
        if len(r) >= 3 and r[0] in needed_eng:
            eng[r[0]] = r[2]

    out, seen = [], set()
    for sid, text in cmn.items():
        text = text.strip()
        if sid not in links or links[sid] not in eng:
            continue
        n_hanzi = len(HANZI_RE.findall(text))
        if not 4 <= n_hanzi <= 14:
            continue
        tokens, unknown = segment(text, vocab)
        if unknown:
            continue
        tok_set = set(tokens)
        for h in tok_set & targets:
            if text.count(h) != 1:
                continue
            if any(levels[t] > levels[h] for t in tok_set):
                continue
            key = (h, text)
            if key not in seen:
                seen.add(key)
                out.append({"hanzi": h, "sentence": text,
                            "en": eng[links[sid]], "source": "tatoeba"})

    out.sort(key=lambda r: (r["hanzi"], len(r["sentence"])))
    dest = HERE / "candidates.csv"
    with open(dest, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["hanzi", "sentence", "en", "source"])
        w.writeheader()
        w.writerows(out)
    covered = {r["hanzi"] for r in out}
    print(f"{len(out)} candidates covering {len(covered)}/{len(targets)} "
          f"HSK1-2 words -> {dest}")


if __name__ == "__main__":
    main()
