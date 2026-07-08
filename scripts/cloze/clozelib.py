#!/usr/bin/env python3
"""Shared helpers for the cloze sentence pipeline (mine_tatoeba.py,
build_cloze_data.py). Stdlib only. Run `python3 clozelib.py --selftest`.

A sentence row is valid when (spec 1a/1c):
  - target appears exactly once, as a whole segmented token
  - 4-14 hanzi total; every token is HSK vocab at-or-below the target level
  - en/th non-empty; 3 distinct distractors, level <= target's, not the
    target, not in the sentence
"""
import json
import re
import sys
from pathlib import Path

PUNCT = set("，。！？、：；「」『』（）…—·~""'' 0123456789")   # NOT 一二三… — Chinese numerals are HSK vocabulary
HANZI_RE = re.compile(r"[一-鿿]")


def load_levels(words_json_path):
    """hanzi -> min HSK level across the per-level lists.

    >>> lv = {"你": 1, "你好": 1}  # shape of the result
    """
    data = json.loads(Path(words_json_path).read_text(encoding="utf-8"))
    levels = {}
    for lv_str, words in data["levels"].items():
        lv = int(lv_str)
        for w in words:
            h = w["h"]
            if h not in levels or lv < levels[h]:
                levels[h] = lv
    return levels


def segment(text, vocab):
    """Greedy longest-match segmentation against vocab; punctuation and
    digits are skipped. Returns (tokens, unknown_chars).

    >>> segment("我想吃苹果。", {"我", "想", "吃", "苹果"})
    (['我', '想', '吃', '苹果'], [])
    >>> segment("我爱X。", {"我"})
    (['我'], ['爱', 'X'])
    """
    tokens, unknown, i = [], [], 0
    maxlen = max((len(w) for w in vocab), default=1)
    while i < len(text):
        ch = text[i]
        if ch in PUNCT or not HANZI_RE.match(ch):
            if HANZI_RE.match(ch) is None and ch not in PUNCT and not ch.isspace():
                unknown.append(ch)
            i += 1
            continue
        for size in range(min(maxlen, len(text) - i), 0, -1):
            cand = text[i:i + size]
            if cand in vocab:
                tokens.append(cand)
                i += size
                break
        else:
            unknown.append(ch)
            i += 1
    return tokens, unknown


def row_errors(row, levels):
    """Validate one CSV row dict (hanzi, sentence, en, th, d1, d2, d3,
    source). Returns [] when clean.

    >>> lv = {"我": 1, "想": 1, "吃": 1, "苹果": 1, "商店": 1, "学生": 1, "猫": 1}
    >>> row_errors({"hanzi": "苹果", "sentence": "我想吃苹果。", "en": "I want to eat an apple.",
    ...             "th": "ฉันอยากกินแอปเปิ้ล", "d1": "商店", "d2": "学生", "d3": "猫",
    ...             "source": "ai"}, lv)
    []
    """
    errs = []
    h, s = row["hanzi"].strip(), row["sentence"].strip()
    target_lv = levels.get(h)
    if target_lv is None:
        return [f"{h}: not an HSK word"]
    hanzi_count = len(HANZI_RE.findall(s))
    if not 4 <= hanzi_count <= 14:
        errs.append(f"{h}: {hanzi_count} hanzi (want 4-14)")
    if s.count(h) != 1:
        errs.append(f"{h}: appears {s.count(h)}x in sentence (want exactly 1)")
    tokens, unknown = segment(s, set(levels))
    if unknown:
        errs.append(f"{h}: non-HSK characters {unknown}")
    if h not in tokens:
        errs.append(f"{h}: not a whole token in sentence")
    over = sorted({t for t in tokens if levels[t] > target_lv})
    if over:
        errs.append(f"{h}: over-level vocab {over}")
    if not row["en"].strip():
        errs.append(f"{h}: empty en")
    if not row["th"].strip():
        errs.append(f"{h}: empty th")
    ds = [row["d1"].strip(), row["d2"].strip(), row["d3"].strip()]
    if len(set(ds)) != 3:
        errs.append(f"{h}: distractors not distinct")
    for d in ds:
        if d == h:
            errs.append(f"{h}: distractor equals target")
        elif d not in levels:
            errs.append(f"{h}: distractor {d} not an HSK word")
        elif levels[d] > target_lv:
            errs.append(f"{h}: distractor {d} above level {target_lv}")
        elif d in s:
            errs.append(f"{h}: distractor {d} appears in sentence")
    if row["source"].strip() not in ("tatoeba", "ai"):
        errs.append(f"{h}: bad source {row['source']!r}")
    return errs


if __name__ == "__main__" and "--selftest" in sys.argv:
    import doctest
    fails, _ = doctest.testmod(verbose=False)
    print("clozelib selftest:", "FAIL" if fails else "OK")
    sys.exit(1 if fails else 0)
