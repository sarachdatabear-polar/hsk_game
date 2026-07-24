#!/usr/bin/env python3
"""Emit Thai-rewrite work batches.

Glosses: unique catalog hanzi ∩ HSK3.0 list, ranked by max frequency, one row per
hanzi (first occurrence's pinyin/english/thai win — same rule build_game_data uses
for the merged word list). UI: i18n th-block keys filtered by prefix.

Usage:
  python3 scripts/thai_batches.py glosses --start 0 --count 200 --out docs/superpowers/thai/pilot-glosses.csv
  python3 scripts/thai_batches.py ui --prefixes home,common,nav,results --out docs/superpowers/thai/pilot-ui.csv
"""
import argparse, csv, json, re, sys
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
ROOT = GAME.parent
HSK3 = json.loads((GAME / "docs/planning/hsk3.0-audit/hsk3-mapping.json").read_text(encoding="utf-8"))

def load_words():
    best = {}
    for lv in range(1, 7):
        p = ROOT / "product" / "by-level" / f"HSK{lv}_words-to-remember_bilingual.csv"
        with open(p, encoding="utf-8-sig", newline="") as fh:
            for row in csv.DictReader(fh):
                h = row["hanzi"].strip()
                f = int(row["freq"] or 0)
                if h not in best:
                    best[h] = {"hanzi": h, "pinyin": row["pinyin"], "english": row["english"],
                               "thai_current": row["thai"], "freq": f, "level": lv}
                else:
                    best[h]["freq"] = max(best[h]["freq"], f)
    return [w for h, w in best.items() if h in HSK3]

def cmd_glosses(a):
    words = sorted(load_words(), key=lambda w: (-w["freq"], w["hanzi"]))
    batch = words[a.start:a.start + a.count]
    with open(a.out, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["hanzi", "pinyin", "english", "thai_current", "freq", "level"])
        w.writeheader(); w.writerows(batch)
    print(f"{len(batch)} gloss rows -> {a.out} (of {len(words)} real words)")

def cmd_ui(a):
    src = (GAME / "src/i18n.js").read_text(encoding="utf-8")
    en_block = src[src.index("en: {"):src.index("th: {")]
    th_block = src[src.index("th: {"):]
    def kv(block):
        return dict(re.findall(r'"([A-Za-z0-9._-]+)":\s*"((?:[^"\\]|\\.)*)"', block))
    en, th = kv(en_block), kv(th_block)
    prefixes = tuple(p.strip() + "." for p in a.prefixes.split(","))
    keys = [k for k in en if k.startswith(prefixes) and k in th]
    with open(a.out, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(["key", "english", "thai_current"])
        for k in keys: w.writerow([k, en[k], th[k]])
    print(f"{len(keys)} ui rows -> {a.out}")

p = argparse.ArgumentParser(); sub = p.add_subparsers(dest="cmd", required=True)
g = sub.add_parser("glosses"); g.add_argument("--start", type=int, default=0)
g.add_argument("--count", type=int, required=True); g.add_argument("--out", required=True); g.set_defaults(f=cmd_glosses)
u = sub.add_parser("ui"); u.add_argument("--prefixes", required=True)
u.add_argument("--out", required=True); u.set_defaults(f=cmd_ui)
a = p.parse_args(); a.f(a)
