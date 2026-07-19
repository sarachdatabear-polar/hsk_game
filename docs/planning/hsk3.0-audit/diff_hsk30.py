#!/usr/bin/env python3
"""HSK 3.0 (GF0025-2021) vs current curated catalog (product/by-level) diff.

Reproducible audit tooling. Reads:
  - docs/planning/hsk3.0-audit/hsk30-source.csv  (verified authoritative HSK 3.0 word list)
  - product/by-level/HSK{1..6}_words-to-remember_bilingual.csv  (our curated catalog)

Emits a per-level compatibility report to stdout. Touches no production data.

Note on taxonomies:
  - Our catalog is HSK *2.0*-era, frequency-curated from real mock exams ("words to
    remember"), NOT the official wordlist. Words recur across level files when recycled;
    we assign each word to the LOWEST level file it appears in (its introduction level).
  - HSK 3.0 collapses advanced bands into a single "7-9". We keep that label.
"""
import csv, collections, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, "..", "..", ".."))          # .../game
ROOT = os.path.abspath(os.path.join(GAME, ".."))                      # repo root
PROD = os.path.join(ROOT, "product", "by-level")

HSK30 = os.path.join(HERE, "hsk30-source.csv")
OUR_LEVELS = ["1", "2", "3", "4", "5", "6"]
HSK30_ORDER = ["1", "2", "3", "4", "5", "6", "7-9"]


def load_hsk30():
    """Return {simplified_form: level}. First occurrence wins (lowest band).

    ivankra's Simplified field packs written variants of one term joined by '|'
    (e.g. '爸爸|爸', '哥哥|哥'). Each surface form is a valid match target, so we
    split on '|' and map every form to the term's band.
    """
    m = {}
    with open(HSK30, newline="") as f:
        for row in csv.DictReader(f):
            lvl = row["Level"].strip()
            for w in row["Simplified"].split("|"):
                w = w.strip()
                if w and w not in m:
                    m[w] = lvl
    return m


def load_ours():
    """Return (intro_level {hanzi: level}, thai {hanzi: bool}). Lowest file wins."""
    intro, thai = {}, {}
    for lv in OUR_LEVELS:
        path = os.path.join(PROD, f"HSK{lv}_words-to-remember_bilingual.csv")
        with open(path, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                w = (row.get("hanzi") or "").strip()
                if not w:
                    continue
                if w not in intro:
                    intro[w] = lv
                    thai[w] = bool((row.get("thai") or "").strip())
    return intro, thai


def main():
    h30 = load_hsk30()
    ours, thai = load_ours()

    ours_set, h30_set = set(ours), set(h30)
    both = ours_set & h30_set
    only_ours = ours_set - h30_set
    only_h30 = h30_set - ours_set

    print("=" * 70)
    print("HSK 3.0 (GF0025-2021)  vs  curated catalog (product/by-level)")
    print("=" * 70)
    print(f"Our catalog unique words (by intro level) : {len(ours_set):>6}")
    print(f"HSK 3.0 word list total                   : {len(h30_set):>6}")
    print(f"In BOTH                                    : {len(both):>6}")
    print(f"Only in our catalog (not in HSK 3.0)       : {len(only_ours):>6}")
    print(f"Only in HSK 3.0 (missing from our catalog) : {len(only_h30):>6}")
    print(f"Our catalog coverage of HSK 3.0            : {100*len(both)/len(h30_set):5.1f}%")
    print(f"Our catalog words validated by HSK 3.0     : {100*len(both)/len(ours_set):5.1f}%")

    # Per our-level: how our words map onto HSK 3.0
    print("\n" + "-" * 70)
    print("Per OUR level: overlap / level-moves / dropped, + Thai coverage")
    print("-" * 70)
    print(f"{'lvl':>3} {'words':>6} {'inH30':>6} {'same':>6} {'moved':>6} {'dropped':>7} {'thai%':>6}")
    by_level = collections.defaultdict(list)
    for w, lv in ours.items():
        by_level[lv].append(w)
    move_detail = collections.Counter()  # (our_lv, h30_lv)
    for lv in OUR_LEVELS:
        ws = by_level[lv]
        inh = [w for w in ws if w in h30]
        same = sum(1 for w in inh if h30[w] == lv)
        moved = len(inh) - same
        dropped = len(ws) - len(inh)
        thai_cov = 100 * sum(1 for w in ws if thai.get(w)) / max(1, len(ws))
        for w in inh:
            if h30[w] != lv:
                move_detail[(lv, h30[w])] += 1
        print(f"{lv:>3} {len(ws):>6} {len(inh):>6} {same:>6} {moved:>6} {dropped:>7} {thai_cov:5.0f}%")

    # HSK 3.0 additions (words we lack), per HSK 3.0 band
    print("\n" + "-" * 70)
    print("HSK 3.0 words MISSING from our catalog, per HSK 3.0 band")
    print("-" * 70)
    miss = collections.Counter(h30[w] for w in only_h30)
    tot = collections.Counter(h30.values())
    print(f"{'band':>4} {'h30_total':>9} {'missing':>8} {'have':>6} {'have%':>6}")
    for b in HSK30_ORDER:
        m = miss.get(b, 0); t = tot.get(b, 0); have = t - m
        print(f"{b:>4} {t:>9} {m:>8} {have:>6} {100*have/max(1,t):5.0f}%")

    # Level-move matrix (our level -> hsk3.0 level), most common moves
    print("\n" + "-" * 70)
    print("Top level MOVES  (our level -> HSK 3.0 band) : count")
    print("-" * 70)
    for (olv, nlv), c in move_detail.most_common(20):
        direction = "UP(harder)" if (nlv == "7-9" or (nlv.isdigit() and int(nlv) > int(olv))) else "DOWN(easier)"
        print(f"  HSK{olv} -> {nlv:>3}   {c:>5}   {direction}")

    # Sample of dropped words (in our catalog, absent from HSK 3.0) — top of HSK1/2
    print("\n" + "-" * 70)
    print("Sample: our HSK1-2 words ABSENT from HSK 3.0 (first 30)")
    print("-" * 70)
    dropped_low = [w for w in (by_level["1"] + by_level["2"]) if w not in h30]
    print(f"  count={len(dropped_low)}  ::  " + "  ".join(dropped_low[:30]))


if __name__ == "__main__":
    main()
