#!/usr/bin/env python3
"""Apply a reviewed Thai gloss batch to the product CSVs.

Reads a reviewed batch CSV (columns include `hanzi,thai_proposed` — the shape
docs/superpowers/thai/*/shard-*-out.csv already produce) and, for every row whose
hanzi matches and whose thai_proposed differs from the current `thai` value,
updates:

  - the 6 per-level bilingual CSVs (product/by-level/HSK<n>_words-to-remember_bilingual.csv)
  - product/thai-supplement.csv, additionally stamping its `source` column on
    changed rows with SOURCE_STAMP.

Whole-file read/modify/write (stdlib csv only): preserves each file's own BOM
(utf-8-sig), quoting style (QUOTE_MINIMAL, matching the files' original writer)
and line terminator (by-level files use CRLF, thai-supplement.csv uses LF) so
that a no-op run (empty proposals) rewrites a file byte-for-byte identically.
Use --selftest-roundtrip to verify that property directly against a real file.

Usage:
  python3 scripts/thai_apply.py path/to/batch.csv --dry-run
  python3 scripts/thai_apply.py path/to/batch.csv
  python3 scripts/thai_apply.py --selftest-roundtrip ../product/thai-supplement.csv
"""
import argparse
import csv
import shutil
import sys
import tempfile
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
ROOT = GAME.parent

SOURCE_STAMP = "AI-humanized (pilot-calibrated, 2026-07-24)"

BY_LEVEL_LEVELS = range(1, 7)
SAMPLE_LIMIT = 5


def by_level_path(root, level):
    return root / "by-level" / f"HSK{level}_words-to-remember_bilingual.csv"


def supplement_path(root):
    return root / "thai-supplement.csv"


def load_proposals(batch_path):
    """hanzi -> proposed thai gloss, from a reviewed batch CSV."""
    with open(batch_path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        fields = reader.fieldnames or []
        if "hanzi" not in fields or "thai_proposed" not in fields:
            raise SystemExit(
                f"batch CSV must have hanzi,thai_proposed columns, got: {fields}"
            )
        proposals = {}
        for row in reader:
            hanzi = (row.get("hanzi") or "").strip()
            proposed = (row.get("thai_proposed") or "").strip()
            if hanzi and proposed:
                proposals[hanzi] = proposed
    return proposals


def sniff_newline(path):
    """Return the exact line terminator a CSV file already uses."""
    with open(path, "rb") as fh:
        data = fh.read()
    return "\r\n" if b"\r\n" in data else "\n"


def rewrite_csv(path, proposals, thai_col="thai", source_col=None, out_path=None):
    """Read path, apply proposals in-memory, write the result to out_path
    (defaults to path). Always writes (even with zero changes) — that's what
    makes the writer's losslessness testable via --selftest-roundtrip.

    Returns (changed_count, samples) where samples is a list of
    (hanzi, old_thai, new_thai) tuples, capped at SAMPLE_LIMIT.
    """
    newline = sniff_newline(path)
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames
        rows = list(reader)

    changed = 0
    samples = []
    for row in rows:
        hanzi = row.get("hanzi", "")
        proposed = proposals.get(hanzi)
        if proposed is None:
            continue
        current = row.get(thai_col, "")
        if proposed == current:
            continue
        changed += 1
        if len(samples) < SAMPLE_LIMIT:
            samples.append((hanzi, current, proposed))
        row[thai_col] = proposed
        if source_col:
            row[source_col] = SOURCE_STAMP

    dest = out_path or path
    with open(dest, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, lineterminator=newline)
        writer.writeheader()
        writer.writerows(rows)

    return changed, samples


def process_file(path, proposals, thai_col, source_col, dry_run):
    if dry_run:
        # Compute the same diff without touching disk: write to a throwaway temp
        # file instead of `path`.
        with tempfile.TemporaryDirectory() as tmp:
            scratch = Path(tmp) / path.name
            changed, samples = rewrite_csv(
                path, proposals, thai_col=thai_col, source_col=source_col, out_path=scratch
            )
        return changed, samples
    return rewrite_csv(path, proposals, thai_col=thai_col, source_col=source_col)


def report(path, changed, samples, root):
    rel = path.relative_to(root) if path.is_relative_to(root) else path
    print(f"{rel}: {changed} row(s) changed")
    for hanzi, old, new in samples:
        print(f"    {hanzi}: {old!r} -> {new!r}")


def selftest_roundtrip(path):
    """Prove the writer is lossless: rewrite `path` with zero proposals to a
    temp file and diff bytes against the original. Prints and returns the
    result; does not touch `path`."""
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp) / path.name
        changed, _ = rewrite_csv(path, {}, out_path=scratch)
        original = path.read_bytes()
        rewritten = scratch.read_bytes()
        identical = original == rewritten
        print(f"selftest-roundtrip {path}")
        print(f"  changed rows (should be 0): {changed}")
        print(f"  byte-identical: {identical}")
        if not identical:
            print(f"  original size: {len(original)}  rewritten size: {len(rewritten)}")
            for i in range(min(len(original), len(rewritten))):
                if original[i] != rewritten[i]:
                    lo = max(0, i - 20)
                    print(f"  first diff at byte {i}:")
                    print(f"    original : {original[lo:i+20]!r}")
                    print(f"    rewritten: {rewritten[lo:i+20]!r}")
                    break
        return identical


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("batch_csv", nargs="?", help="Reviewed batch CSV with hanzi,thai_proposed columns")
    ap.add_argument("--root", default=None, help=f"product/ directory (default: {ROOT / 'product'})")
    ap.add_argument("--dry-run", action="store_true", help="Print change counts + sample diffs; write nothing")
    ap.add_argument(
        "--selftest-roundtrip",
        metavar="PATH",
        help="Verify the writer reproduces PATH byte-identically with zero proposals, then exit",
    )
    args = ap.parse_args(argv)

    if args.selftest_roundtrip:
        ok = selftest_roundtrip(Path(args.selftest_roundtrip))
        return 0 if ok else 1

    if not args.batch_csv:
        ap.error("batch_csv is required unless --selftest-roundtrip is given")

    root = Path(args.root) if args.root else (ROOT / "product")
    proposals = load_proposals(Path(args.batch_csv))
    print(f"{len(proposals)} proposal(s) loaded from {args.batch_csv}")
    if args.dry_run:
        print("(dry run: no files will be written)\n")

    total = 0
    for level in BY_LEVEL_LEVELS:
        path = by_level_path(root, level)
        changed, samples = process_file(path, proposals, thai_col="thai", source_col=None, dry_run=args.dry_run)
        report(path, changed, samples, root)
        total += changed

    supp = supplement_path(root)
    changed, samples = process_file(supp, proposals, thai_col="thai", source_col="source", dry_run=args.dry_run)
    report(supp, changed, samples, root)
    total += changed

    print(f"\nTotal changed rows: {total}")
    if args.dry_run:
        print("(dry run: no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
