# HSK 3.0 source — provenance, license, and verification

**Task:** roadmap R2 step 1 — "archive the authoritative new syllabus/vocabulary
source with provenance and license/usage notes." (`docs/planning/2026-07-16-next-roadmap.md`)

**Status: verified authoritative.** Every published checksum matches. Safe to diff against.

## What the official standard is

- **《国际中文教育中文水平等级标准》(GF0025-2021)** — "Chinese Proficiency Grading
  Standards for International Chinese Language Education," issued by the PRC Ministry of
  Education / 国家语委, effective 2021-07-01. This is the "New HSK" / "HSK 3.0" basis.
- Structure: **三等九级** — 3 stages (elementary 1–3, intermediate 4–6, advanced 7–9),
  9 levels. Four-dimensional: syllables, characters, **vocabulary**, grammar.
- Official vocabulary totals: **11,092 words**, 3,000 characters, 1,110 grammar points.
- The official vocabulary table ships as a **scanned PDF with no text layer**
  (`W020210329527301787356.pdf` on moe.gov.cn), so every machine-readable copy is a
  digitization/OCR of that PDF. There is no official CSV/JSON. Provenance therefore
  traces *through* a digitizer back to the scanned government PDF.

Official references:
- Standard announcement: http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html
- Full-text mirror (GF0025-2021): https://www.waizi.org.cn/bz/106097.html

## Archived source

- **File:** `hsk30-source.csv` (in this directory)
- **Upstream:** [`ivankra/hsk30`](https://github.com/ivankra/hsk30) — `hsk30.csv`, `master`
  branch. Raw URL:
  `https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv`
- **SHA-256:** `8c2b73f74776240bcf154624730fc6fb2c42c254d5c5d0f88943878b8e575b9b`
- **License:** MIT (data files MIT, derived from upstream sources with compatible
  licensing). Attribution retained here.
- **Digitization chain (per upstream README):** OCR of the official MoE scanned PDF,
  cross-referenced against `elkmovie/hsk30`, the HSK official website database, and
  `shawkynasr/HSK-official-Query-System`.
- **Schema:** `ID, Simplified, Traditional, Pinyin, POS, Level, WebNo, WebPinyin, OCR,
  Variants, CEDICT`. `Level` ∈ {1,2,3,4,5,6,7-9} (the standard does not split 7–9).
- **Known caveat (upstream):** traditional-variant filtering is heuristic, so some
  traditional forms may be wrong at advanced levels. **Not load-bearing for us** — we
  compare on simplified/level only. The `Simplified` field packs written variants of one
  term joined by `|` (e.g. `爸爸|爸`); the diff tooling splits on `|`.

## Verification (checksums against the published standard)

`diff_hsk30.py` counts rows per `Level`. All bands match the official GF0025-2021
per-band vocabulary breakdown exactly:

| Band | Rows (archived) | Official | |
|---|---:|---:|---|
| 1 | 500 | 500 | ✅ |
| 2 | 772 | 772 | ✅ |
| 3 | 973 | 973 | ✅ |
| 4 | 1,000 | 1,000 | ✅ |
| 5 | 1,071 | 1,071 | ✅ |
| 6 | 1,140 | 1,140 | ✅ |
| 7–9 | 5,636 | 5,636 | ✅ |
| **Total** | **11,092** | **11,092** | ✅ |

(Bands 1–6 sum to 5,456; + 5,636 advanced = 11,092.) After splitting `|` variants and
deduping surface forms, 10,969 unique simplified word-forms are usable as match targets.

## Scope limits of this source

- **Word list only.** The standard's separate **3,000-character list** and **grammar
  syllabus** are not in this CSV. Character- and grammar-gap analysis (roadmap step 2)
  needs those tables separately and is **not** covered by this archive — flagged as an
  open sub-item in the audit report.
- **Do not relabel.** Our `product/by-level` rankings are empirical exam-frequency lists
  (HSK 2.0-era corpus). They must retain that provenance and must **not** be relabeled as
  HSK 3.0. This source exists only to *compare*, per the roadmap.
