# Design: 2026-07-20 audit fixes — street scene composer, ghost raccoon, listen-mode layout, audio voice + unlock

Source: Jordan's phone audit (screenshots in root repo `audit/`), 2026-07-20.
Directions confirmed by Jordan: street = scene composer (A); raccoon = new art + interim
stopgap; audio = full mp3 set + lazy fetch.

## Problem statements

1. **Street reads as a shelf.** Every owned deco renders on one ground line at one shared
   scale, evenly spaced (`street.js decoLayout`, `main.js renderStreet`). Buying an item
   just inserts it into the row and reshuffles everything — no composition, no moment.
2. **Ghost raccoon on wrong answers.** The `"wrong"` state has no sprite sheet
   (`raccoon.js:90-94` falls through to the grey/charcoal vector fallback), so next to the
   painted art style the raccoon looks like a dark ghost. The orange glow at its feet is
   the `vfx-orb-red.svg` feedback orb (burnt-orange gradient) drawn behind it.
3. **Listen mode crushes the stage.** `#s-battle.listen-fmt .cv-wrap{min-height:116px}`
   (`index.html:505`) applies at **all** viewport heights (unlike cloze's gated rule), while
   the word plate (56px hanzi floor) and mascots (mascotS ≥ ~1.02) have floors that don't
   shrink with the canvas — so the plate covers the cat and the raccoon leaves the frame.
4. **Audio voice is inconsistent + first play is silent.** Only 2,297 / 13,921 words have
   bundled Xiaoxiao mp3s; the rest use the device TTS voice. Separately, first playback on
   iOS is often silent until a second tap: battle audio auto-plays at question spawn (not
   in a gesture), `audio/index.json` loads async (first word can wrongly take the TTS path),
   and a rejected `el.play()` falls straight to TTS with no retry.

## WS1 — Street scene composer

Goal: purchases compose into a curated village scene; buying feels like building. No new
art; no player placement (that is a possible phase 2, and this design must not block it).

### Layout model (in `street.js`, pure + tested)

- **Per-item size classes.** New `DECO_SIZE` table mapping each of the 15 deco ids to a
  size factor, e.g. gateway 1.6 (`golden-arch`, `firecracker-arch`), large 1.25
  (`drum-tower`, `noodle-stall`, `mooncake-stall`, `shaved-ice-cart`), medium 1.0
  (`koi-pond`, `mahjong-table`, `bubble-tea`, `tea-sign`, `neon-cat-sign`), small 0.8
  (`red-lantern`, `paper-umbrella`, `goldfish-banner`, `foo-dog`). Exact values tuned
  during implementation against screenshots.
- **Curated anchor slots instead of an even band.** Replace `decoLayout(count)` with a
  hand-authored anchor table: ~18 anchors, each `{x, depth, allowed-class}` composed
  around the background art (road runs up the middle; fences left/right). Three depth
  lanes: `back` (y≈.80, scale ×.72), `mid` (y≈.90, scale ×.86), `front` (y=1.0, ×1.0).
  Gateways get dedicated road-center anchors so an arch spans the path like an entrance.
- **Stable, deterministic assignment.** `assignDecoAnchors(ownedIds)` walks `DECO_IDS`
  order and gives each owned deco the first free anchor of its class — so an item keeps
  its spot as the collection grows (no more full reshuffle on every purchase), and the
  same owned set always renders identically on every machine (no persisted state, no
  sync-schema change).
- **Painter's order.** Draw buildings, then decos sorted by lane (back→front) then x.
  Overlap between lanes is intended — that is what makes it read as a scene.
- **Mascot stays** pinned bottom-left, drawn last.

### The construction moment (in `main.js` + small pure helper)

- On deco purchase, record `street.pendingReveal = id` (in-memory; falls back to nothing
  if the app closes — no persistence).
- Next time the street renders with a pending reveal: the new item pops in with a scale
  bounce + dust puff + sparkle (reuse `fx.js` sprites), and the caption line announces it
  (`street.captionNew` i18n key: "New on your street: {name}!"). One-shot, ~900ms.
- Tier upgrades reuse the same moment (sparkle only, no dust).

### Tests

- `street.test.js` additions: every deco id has a size class; every owned subset gets
  distinct anchors; assignment is stable under superset growth (owned ⊂ owned′ ⇒ same
  anchors for the common items); gateways only land on road anchors; all-15 case fits
  with no two same-lane anchors closer than the wider item's half-width.

### Out of scope (unchanged from PRD deferrals)

Tap-to-place / drag placement (phase 2 candidate — the anchor table is the plot grid it
would reuse), background stage evolution, new art.

## WS2 — Raccoon wrong-state art

- **Interim (code-only, ships first):** `"wrong"` state draws the `raccoon-walk` sheet
  (slow 2-frame cycle) instead of the vector fallback, keeping the existing
  `raccoonBob` retreat hop + lean transform. The vector path remains only as the
  no-sprite-loaded fallback, as with walk/happy.
- **Art request for Jordan (asset-gated, full-batch ritual per art-drop process):**
  `raccoon-wrong.png` — horizontal sprite sheet, 4 frames, 1024×256 (each frame 256×256,
  bottom-anchored, transparent bg), same painted style/palette as `raccoon-walk.png` /
  `raccoon-happy.png`: the raccoon doing a smug little retreat hop (half-lidded eyes,
  slight backward lean). When the batch lands, wire it exactly like `happy` in
  `raccoon.js` + add to `SPRITE_NAMES`, asset manifest, precache list.
- The feedback orb (`vfx-orb-red`) stays — it reads fine once the raccoon itself is painted.

## WS3 — Listen-mode stage layout

- Gate the shrink: `#s-battle.listen-fmt .cv-wrap{min-height:116px}` moves inside
  `@media (max-height:620px) and (orientation:portrait)` (mirroring cloze's rule) and the
  floor rises to ~170px to match the short-portrait floor. On taller viewports listen mode
  keeps the standard floors — flexbox already absorbs the extra "Play it again" row.
- Graceful degradation for genuinely short stages: in `drawWordPlate`/layout, when
  `B.h` is below a threshold (~200px), scale the plate down (relax the 56px hanzi floor
  toward ~40px, move plate center up from 0.31·h) so plate bottom stays above the mascot
  head line. Threshold + values tuned against screenshots.
- Verify with the VPS chromium responsive sweep at ~5 viewport heights × formats
  (meaning / listen / cloze), before-and-after screenshots.

## WS4 — Audio

### 4a. One voice everywhere: full mp3 set + lazy fetch

- **Generation:** drop `WORDS_CAP` gating in `build_audio.py` (or set cap = ∞): generate
  all 13,921 words with `zh-CN-XiaoxiaoNeural`. Script is already incremental and
  rebuilds `index.json` from disk. Long overnight run on the VPS; ~118 MB total.
- **Hosting:** same game repo / GitHub Pages origin (`audio/*.mp3`), same as today. This
  keeps everything same-origin (no CORS work) and zero new infrastructure. Accepted cost:
  repo grows ~100 MB (well under GitHub limits; solo project, rare clones). If weight
  becomes a problem later, moving mp3s to Supabase storage is the designated escape hatch.
- **App/PWA/APK footprint unchanged:** `stage-www.js` and the APK continue to bundle only
  the current 2,297-word set + its `index.json` (rename concept: bundled = "core" set).
  A second `audio/index-full.json` lists the complete set for the app to consult.
- **Playback ladder in `audio.js`:** bundled mp3 → Cache API hit for remote mp3 → network
  fetch of remote mp3 (cache-on-success, play when ready) → TTS fallback (offline/fetch
  failure only). The service worker adds a cache-first runtime route for `audio/*.mp3`
  (capped LRU, e.g. 500 entries) — never precached.
- **Deck prefetch:** at quest/battle start (inside the start-tap gesture), fire-and-forget
  prefetch of the session deck's uncovered mp3s so mid-battle playback is instant and
  never depends on autoplay-in-rAF timing.

### 4b. Silent first play (iOS)

- **Index race:** expose `audioReady` (index fetch settled) from `main.js` boot; the
  battle's auto-speak-on-spawn awaits `audioReady` (with a ~1.5s timeout so `file://` and
  slow networks still degrade to TTS rather than hang).
- **Unlock sequencing:** `speak()` awaits any in-flight `unlockAudio()` promise before
  its first `el.play()`, instead of racing the silent-WAV priming on the same element.
- **Retry before surrender:** if `el.play()` rejects, wait for the next unlock/gesture and
  retry the mp3 once before falling back to TTS (today it falls back instantly, which on
  iOS means a silently-dropped first utterance).
- Tests: pure chooser tests (bundled/cached/remote/TTS ladder, timeout path); unlock
  sequencing covered by unit tests around the promise gating (DOM audio mocked).

## Rollout (each release bumps `SHELL` in `sw.js` per process)

1. **PR 1 — quick fixes:** WS3 (CSS gate + plate degradation) + WS2 interim (walk-sheet
   stopgap). Small, screenshot-verified.
2. **PR 2 — audio unlock fixes:** WS4b (index race, unlock sequencing, retry, deck
   prefetch of the bundled set).
3. **PR 3 — street scene composer:** WS1.
4. **Overnight generation run**, then **PR 4 — full-audio lazy fetch:** WS4a (SW route,
   playback ladder, index-full).
5. **Art round (Jordan-gated):** `raccoon-wrong.png` lands in `art-drop/` → wire + swap.

Risks: iOS Safari autoplay behavior can only be truly verified on Jordan's device —
PR 2 ships with a debug breadcrumb (existing `errlog.js`) around the unlock/speak path so
a still-broken case is diagnosable from the device. Street anchor tuning is visual;
expect one screenshot-feedback iteration with Jordan.
