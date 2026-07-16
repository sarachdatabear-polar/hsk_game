# Lucky Cat HSK

HSK vocabulary arcade game, playable in the browser as an installable PWA.

## Play

Live URL (goes live after the first deploy):
**https://sarachdatabear-polar.github.io/hsk_game/**

## Develop

```sh
npm ci            # install dependencies
npm test          # run the full Vitest regression suite
npm run build     # bundle src/ → dist/app.js via esbuild
npm run serve     # serve repo root at http://localhost:8000
```

## Deploy (web)

Every push to `main` triggers `.github/workflows/deploy-pages.yml`:

1. `npm ci` → `npm test` → `npm run build` → `node scripts/stage-www.js`
2. Stages the deployable site into `www/` (index.html + dist + data + audio + pwa + sw.js + assets).
3. Uploads the `www/` folder as a GitHub Pages artifact and deploys it.

**Important — PWA cache busting:** when shipping user-facing changes, bump the `SHELL`
cache version constant in `sw.js` (e.g. `nbhsk-shell-v2` → `nbhsk-shell-v3`) so
installed PWAs fetch the updated shell on next visit.

## Android

Android support is unchanged. After a web build:

```sh
npm run cap:sync     # sync www/ into the Capacitor Android project
npm run apk:release  # build a signed release APK
```

See `docs/build/ANDROID_BUILD.md` for full signing and release instructions.

## Data credits

- Some example sentences from [Tatoeba](https://tatoeba.org) (CC-BY 2.0 FR),
  filtered and adapted; the rest AI-generated and curated in
  `data/cloze-sentences.csv`.
