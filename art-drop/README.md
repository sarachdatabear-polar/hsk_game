# art-drop — raw generated art intake (tracked in git)

Drop raw browser-generated PNGs here (AI Studio / ChatGPT output), named after
the target asset (`bg-market.png`; a browser suffix like `bg-market (2).png`
is fine). Don't resize, crop, or compress anything yourself. Then run:

```
python scripts/intake_art.py
```

The script prefers this folder when it exists (falls back to
`~/Desktop/hsk-art-drop` otherwise), so raw art and processed candidates
travel with the repo between machines. Results land in
`art-drop/processed/<target>/cand-NN/` with a QA verdict per candidate;
install a winner into `assets/` with:

```
python scripts/intake_art.py --install bg-market.png:cand-02
```

This folder is never deployed: `scripts/stage-www.js` stages only the runtime
items (`index.html, dist, data, audio, pwa, sw.js, assets`).
