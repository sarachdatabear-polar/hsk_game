# Bundled fonts

All fonts here are SIL Open Font License 1.1 (OFL.txt in this directory covers
`title.woff2` / ZCOOL KuaiLe specifically; the OFL text is identical across
the fonts below, only the copyright holder differs — see each upstream
`OFL.txt` linked below for the exact notice).

| File              | Source (google/fonts)                          | Notes |
|-------------------|--------------------------------------------------|-------|
| `title.woff2`     | ZCOOL KuaiLe                                      | pre-existing, used for the `LuckyTitle` heading face |
| `lc-hanzi.woff2`  | [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc) | Copyright Google Inc. Variable font instanced to weight 900 (Black), then subset to the hanzi actually used in `data/words.json` + ASCII + CJK punctuation, via `scripts/build_fonts.py`. |
| `lc-thai.woff2`   | [Noto Sans Thai](https://github.com/google/fonts/tree/main/ofl/notosansthai) | Copyright Google Inc. Variable font instanced to weight 600, width 100 (normal), subset to the Thai block + basic Latin. |
| `lc-latin.woff2`  | [Fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka) | Copyright The Fredoka Project Authors. Variable font instanced to weight 600, width 100 (normal), subset to basic Latin/punctuation/digits. |

Regenerate with:

```sh
pip install fonttools brotli   # if not already available
python scripts/build_fonts.py
```

The script downloads the three source variable TTFs from the `google/fonts`
GitHub repo into `scripts/.fontcache/` (gitignored, not committed), instances
each to a fixed weight with `fontTools.varLib.instancer`, and subsets with
`fontTools.subset` to `.woff2`. It's idempotent — it skips all work if
`lc-hanzi.woff2`, `lc-thai.woff2`, and `lc-latin.woff2` already exist in this
directory, so re-run it only after deleting an output (e.g. when
`data/words.json` gains new hanzi and the hanzi subset needs to grow).
