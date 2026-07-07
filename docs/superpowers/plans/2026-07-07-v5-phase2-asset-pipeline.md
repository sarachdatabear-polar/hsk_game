# PRD v5 Phase 2 — A2 Style-Locked Asset Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship everything A2 needs that is buildable without new art — the locked generation-prompt pack, the complete asset tracker, the automated QA gate, and size-budget enforcement (compressing the 7 over-budget backgrounds now) — so asset generation becomes a drop-file-run-gate loop for the owner.

**Architecture:** Art generation itself is external (owner + AI image model); this round builds the pipeline around it. Four deliverables: (1) `docs/art/GENERATION-PROMPTS-v5.md` — one master style prompt derived from STYLE-TOKENS.md plus per-asset clauses, exact filenames/dims so files are drop-in; (2) `assets/asset-manifest.json` expanded to cover every runtime asset (skins, boss, battle backdrops, street decos, planned raccoon sheets) so one tracker governs A2; (3) `scripts/qa_asset.py` (Pillow) — the mechanical half of the PRD's QA gate (dims, budget, transparency, frame math, palette advisory), leaving light/silhouette/line-weight as checklist judgment items; (4) a vitest budget gate + `scripts/compress_bg.py` that brings the currently 0.7–5.4 MB backgrounds under the 350 KB budget (≈23 MB → ≈2.5 MB precache win, and the same compress step regenerated art will use).

**Tech Stack:** Vanilla JS + vitest (gates), Python 3 + Pillow (image tooling — repo precedent: `make_assets.py` uses PIL, `build_fonts` docs use pip installs). No new npm dependencies.

**Source spec:** `docs/prd/PRD-v5-visual-retention.md` §4 A2. Style source: `docs/art/STYLE-TOKENS.md`, reference `assets/_plan/REFERENCE-production-target.png`.

## Global Constraints

- **No new npm dependencies**; Python tooling may use Pillow (install step included; build-time only, never a runtime dependency).
- **Keep existing filenames** — `sprites.js` / `assets.js` registries unchanged this round (PRD A2: "code changes stay minimal").
- Size budgets (PRD A2 / PRD-production-art-v1 §Budgets): backgrounds **< 350 KB**, cat sheets **< 500 KB**, small icons **< 20 KB**.
- Asset dims are contractual: `scripts/validate-assets.mjs` fails if a PNG's real size differs from its manifest `w`/`h` — compression must never change dimensions.
- Canvas/vector fallbacks remain (file:// / missing-asset safety).
- Art guardrails: warm daylight top-left, education-first, **never** gambling visual language.
- `sw.js` SHELL bump exactly once, final task (v24 → v25 — image bytes change).
- Branch `feat/v5-phase2-asset-pipeline` off `development`; commits `feat(art):` / `docs:` / `test:`.

## Verified pipeline facts (do not re-derive)

- Manifest: `assets/asset-manifest.json`, 44 assets, `status_values` = planned/concept/review/approved/integrated/rejected; `types` = sprite-sheet/character/background/ui-surface/icon-sprite/effect. `scripts/validate-assets.mjs` enforces statuses, types, sprite frame math (`frameWidth*frames==w`, `frameHeight==h`), and exact on-disk dims for approved/integrated PNGs; it validates `slice` only for `ui-surface`/`ui-frame` types.
- NOT yet in the manifest but shipped and registered in `src/sprites.js`: 10 skin/boss sheets, `bg-battle`/`bg-market`/`bg-temple`/`bg-bamboo`, `coin`; CSS-referenced decos `lantern`, `cloud`. Measured (file → dims → size): cat-midnight-walk 1536×256 331KB · cat-midnight-happy 1024×256 225KB · cat-sakura-walk 1536×256 331KB · cat-sakura-happy 1024×256 226KB · cat-jade-walk 1536×256 358KB · cat-jade-happy 1024×256 248KB · cat-gold-walk 1536×256 356KB · cat-gold-happy 1024×256 246KB · cat-boss-walk 1536×256 353KB · cat-boss-happy 1024×256 244KB · bg-battle 1024×512 706KB · bg-market 1024×512 10KB · bg-temple 1024×512 8KB · bg-bamboo 1024×512 13KB · lantern 256×384 102KB · cloud 512×256 104KB · coin 128×128 30KB.
- Over the 350 KB background budget today: bg-progress 5.4MB, bg-home 4.9MB, bg-collection 4.6MB, bg-flashcards 4.2MB, bg-results 3.6MB, bg-quest 1.35MB, bg-battle 0.71MB (7 files). All sprite sheets are already < 500 KB.
- `bg-market`/`bg-temple`/`bg-bamboo` are tiny vector placeholders (8–13 KB) — real painted art has never existed for them; they are the P0 generation targets, with the raccoon sheets (no files at all; canvas-drawn raccoon is the shipped fallback).
- Effect stamps / word plaque / buttons / orbs ship as **SVG extracted from the reference sheet** (pack v2, PR #13) — already style-locked by construction. `sprites.js` `SVG_SPRITES` hardcodes `.svg` for those names; a PNG replacement for an fx name requires removing it from that set (small code change, out of this round).
- `test/sw-precache.test.js` requires: every CSS `url(assets/...)` ref, every on-disk sprite for `SPRITE_NAMES`, and every `status:"integrated"` manifest file to be in sw.js `PRECACHE`. All files this plan touches already ship, so precache entries already exist — `npm test` confirms.
- `python3` on this machine currently lacks Pillow (`import PIL` fails). `make_assets.py` already depends on Pillow+numpy, so installing it is repo-sanctioned tooling: `python3 -m pip install --user pillow` (append `--break-system-packages` if macOS PEP-668 blocks it).
- Current SHELL: `nbhsk-shell-v24` (sw.js line 5). Suite: 473 tests / 28 files green.

---

### Task 1: `docs/art/GENERATION-PROMPTS-v5.md` — the locked prompt pack

**Files:**
- Create: `docs/art/GENERATION-PROMPTS-v5.md`

**Interfaces:**
- Consumes: token names/hexes from `docs/art/STYLE-TOKENS.md` §1 (verbatim).
- Produces: the master prompt + per-asset prompts the owner generates from; Task 3's checklist references this doc by name.

- [ ] **Step 1: Create the branch**

```bash
git checkout development && git pull --ff-only && git checkout -b feat/v5-phase2-asset-pipeline
```

- [ ] **Step 2: Write `docs/art/GENERATION-PROMPTS-v5.md`**

Full content:

````markdown
# Generation prompts v5 — style-locked to the reference (PRD v5 A2)

Every prompt below = **MASTER STYLE PROMPT + the asset clause**. Keep the exact
filename and dimensions and the file is drop-in (`assets/`, registries unchanged).
Workflow per asset: generate → `python3 scripts/compress_bg.py <file>` (backgrounds
only) → `python3 scripts/qa_asset.py assets/<file>` → manual checklist
(`docs/art/ART-QA-CHECKLIST.md`) → set manifest status → `npm test`.

## MASTER STYLE PROMPT (prepend to every asset clause)

> Warm daylight storybook illustration for a cozy mobile Chinese-learning game,
> polished mobile-game quality, storybook watercolor–flat hybrid with soft edges
> and gentle painted texture (no gradients harsher than soft daylight falloff).
> Palette locked to: primary green #32775E, sky blue #5DAADD, sun yellow #F2BC57,
> coral #E69777, warm brown #846043, soft gray #B2AEA9, paper cream #FBF5E8,
> deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm, slightly muted,
> never pure black, never pure white, never neon. Soft warm daylight from the
> UPPER LEFT, soft contact shadows down-right. Materials: paper, carved wood,
> rope, ceramic, cloth, leafy plants. Round friendly shapes, clean silhouettes,
> consistent medium line weight. No text or lettering of any kind.

**Global negative:** photorealism, neon, casino/jackpot glitter, black-and-gold
framing, cold gray UI chrome, glassmorphism, sharp corners, horror mood, human
characters, any lettering, watermark.

**Character anchor:** match the rendering, proportions and cheerfulness of
`assets/cat-study.png` (round head ≈45% of height, short limbs, big paws,
friendly expression) and the reference sheet
`assets/_plan/REFERENCE-production-target.png`.

---

## P0 — missing art (vector placeholders / no file today)

### `bg-market.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: night market)

> Cozy evening night-market lane for a cute side-view battle scene, landscape
> 1024×512. Warm paper lanterns strung overhead (soft amber glow, not neon),
> small wooden food stalls with cloth awnings on both sides, a clear flat lane
> along the bottom fifth where two small characters stand. Deep-teal dusk sky,
> lantern light stays warm sun-yellow/coral. Low detail in the center band (a
> word card overlays the middle). Even at night, keep the mood warm and safe —
> a festival evening, not darkness.

Negative (add): pitch-black night, red-only lighting, crowds, people.

### `bg-temple.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: temple dawn)

> Peaceful hillside temple courtyard at dawn for a cute side-view battle scene,
> landscape 1024×512. Small East Asian temple with gently curved rooflines to
> one side, stone lanterns, a leafy old tree, soft pink-gold dawn sky fading to
> sky blue, morning mist over distant green hills. Clear flat stone path along
> the bottom fifth for two small characters; low detail in the center band.

### `bg-bamboo.png` — 1024×512, no alpha, ≤350 KB (battle backdrop: bamboo grove)

> Sun-dappled bamboo grove for a cute side-view battle scene, landscape
> 1024×512. Tall friendly bamboo stalks framing both sides, warm light shafts
> from the upper left through the leaves, a few smooth stones and ferns, a
> clear flat earth path along the bottom fifth for two small characters; low
> detail in the center band. Fresh greens within the palette, cream sky glimpses.

### `raccoon-walk.png` — 1536×256 (6 frames of 256×256), alpha, ≤500 KB
### `raccoon-happy.png` — 1024×256 (4 frames of 256×256), alpha, ≤500 KB

> Chibi gray raccoon ninja, cute toy-like opponent, in the exact same rendering
> style and proportions as the calico cat anchor. Dark charcoal sleeveless
> outfit, blue-gray headband with short tails, small wooden staff on the back,
> black eye-mask markings, ringed tail, pink nose, friendly determined
> expression — never scary. Side view facing LEFT. Sheet 1: walking cycle,
> 6 frames of 256×256 laid out horizontally (total 1536×256). Sheet 2: happy
> defeat-bow, 4 frames of 256×256 (total 1024×256). Stable foot baseline,
> centered body, identical markings and colors on every frame, transparent
> background, no baked-in drop shadows.

Negative (add): realistic anatomy, teeth/claws bared, weapons in hand,
frame-to-frame color or costume drift.

## P1 — style-drift candidates (existing art predates the style lock)

### `cat-walk.png` — 1536×256 (6×256×256), alpha, ≤500 KB · `cat-happy.png` — 1024×256 (4×256×256), alpha, ≤500 KB

> The hero calico lucky cat (white body, orange and brown patches, red collar
> with small gold bell) exactly matching the character anchor. Sheet 1: side
> view facing RIGHT, cheerful walking cycle, 6 frames of 256×256 horizontally.
> Sheet 2: front-facing happy celebration (paws up, closed happy eyes), 4
> frames of 256×256. Stable foot baseline, identical markings every frame,
> transparent background.

### Shop skin sheets — same two-sheet contract as the hero cat (walk 1536×256 / happy 1024×256, alpha, ≤500 KB each)

Generate each skin as a re-colored variant of the hero cat prompt — SAME pose
timing, SAME frame layout, only fur/outfit palette changes:

- `cat-midnight-walk.png` / `cat-midnight-happy.png` — deep blue-charcoal fur, pale cream muzzle/paws, teal collar.
- `cat-sakura-walk.png` / `cat-sakura-happy.png` — soft pink-cream fur, white patches, coral collar, tiny blossom on ear.
- `cat-jade-walk.png` / `cat-jade-happy.png` — pale jade-green fur, cream muzzle, green collar with leaf tag.
- `cat-gold-walk.png` / `cat-gold-happy.png` — warm golden fur, cream muzzle, brown collar with small gold bell (warm and restrained — never metallic chrome).

### `cat-boss-walk.png` — 1536×256 · `cat-boss-happy.png` — 1024×256 (alpha, ≤500 KB each)

> A bigger, rounder boss cat: gray-and-white fur, small red general's sash and
> tiny fabric shoulder guards (cloth, not metal armor), bushy tail, confident
> grin — imposing but friendly, a rival not a monster. Same frame contract and
> facing as the raccoon (faces LEFT).

### Street decos — alpha, warm daylight, ≤120 KB each

- `lantern.png` — 256×384: single warm paper lantern on a short rope loop, sun-yellow/coral paper, wooden top and base, soft inner glow.
- `cloud.png` — 512×256: one soft cream cumulus cloud, gentle warm underlight, storybook painted edges.
- `coin.png` — 128×128, ≤20 KB: single friendly gold coin with a paw-print emboss, warm sun-yellow with brown outline — flat friendly token, no sparkle burst.

## P2 — regenerate ONLY on owner decision (current files are already style-locked)

The seven big backgrounds (`bg-home`, `bg-battle`, `bg-flashcards`, `bg-results`,
`bg-progress`, `bg-collection`, `bg-quest`) were generated with palette-locked
prompts in earlier rounds, and the UI plaque/buttons/tags/badges/fx stamps/orbs
are **SVGs extracted directly from the reference sheet** (pack v2) — regenerating
those risks drift, not fixes. If one fails the A2 QA gate at review time, reuse
its original prompt from `docs/art/GENERATION-PROMPTS-visual-slice.md` (bg-home,
bg-battle) with the master prompt above; fx/plaque/button PNG replacements also
need a `sprites.js` `SVG_SPRITES` edit (a dev-round change — file it, don't
improvise it).

---

Integration notes: same filename → `assets/` → no rebuild needed for images;
run `npm test`; set the manifest row's `status`; log the QA result in
`docs/art/ART-QA-CHECKLIST.md`; bump `sw.js` SHELL once per shipped round.
````

- [ ] **Step 3: Verify + commit**

Run: `npm test` (docs only — must stay green: 473 passing).

```bash
git add docs/art/GENERATION-PROMPTS-v5.md
git commit -m "docs: GENERATION-PROMPTS-v5 — master style prompt + per-asset clauses (A2)"
```

---

### Task 2: Manifest covers every runtime asset + budget columns in the report

**Files:**
- Modify: `assets/asset-manifest.json` (add 19 entries + one type + milestone note)
- Modify: `scripts/asset-report.mjs` (size + budget columns, report-only)

**Interfaces:**
- Consumes: measured dims from this plan's "Verified pipeline facts".
- Produces: manifest rows Task 3 (`qa_asset.py` reads manifest by `file`) and Task 4 (budget test iterates manifest) rely on; type string `"decor"`; budget map `{background: 358400, "sprite-sheet": 512000}` (bytes) with advisory-only budgets for other types.

- [ ] **Step 1: Add `"decor"` to the manifest `types` array**

In `assets/asset-manifest.json` change:

```json
  "types": ["sprite-sheet", "character", "background", "ui-surface", "icon-sprite", "effect"],
```

to:

```json
  "types": ["sprite-sheet", "character", "background", "ui-surface", "icon-sprite", "effect", "decor"],
```

- [ ] **Step 2: Append the 19 new asset entries**

Add to the END of the `"assets"` array (keep the existing 44 entries untouched):

```json
    { "id": "cat-midnight-walk", "file": "cat-midnight-walk.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-midnight-happy", "file": "cat-midnight-happy.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-sakura-walk", "file": "cat-sakura-walk.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-sakura-happy", "file": "cat-sakura-happy.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-jade-walk", "file": "cat-jade-walk.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-jade-happy", "file": "cat-jade-happy.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-gold-walk", "file": "cat-gold-walk.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-gold-happy", "file": "cat-gold-happy.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+SKIN_PALETTES" },
    { "id": "cat-boss-walk", "file": "cat-boss-walk.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+boss" },
    { "id": "cat-boss-happy", "file": "cat-boss-happy.png", "type": "sprite-sheet", "status": "integrated", "priority": "P1", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat+boss" },
    { "id": "bg-battle", "file": "bg-battle.png", "type": "background", "status": "integrated", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#cv gradient" },
    { "id": "bg-market", "file": "bg-market.png", "type": "background", "status": "integrated", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#cv gradient", "note": "vector placeholder — regenerate per GENERATION-PROMPTS-v5" },
    { "id": "bg-temple", "file": "bg-temple.png", "type": "background", "status": "integrated", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#cv gradient", "note": "vector placeholder — regenerate per GENERATION-PROMPTS-v5" },
    { "id": "bg-bamboo", "file": "bg-bamboo.png", "type": "background", "status": "integrated", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#cv gradient", "note": "vector placeholder — regenerate per GENERATION-PROMPTS-v5" },
    { "id": "lantern", "file": "lantern.png", "type": "decor", "status": "integrated", "priority": "P2", "w": 256, "h": 384, "fallback": "css:none (decor)" },
    { "id": "cloud", "file": "cloud.png", "type": "decor", "status": "integrated", "priority": "P2", "w": 512, "h": 256, "fallback": "css:none (decor)" },
    { "id": "coin", "file": "coin.png", "type": "decor", "status": "integrated", "priority": "P2", "w": 128, "h": 128, "fallback": "canvas:coin-vector" },
    { "id": "raccoon-walk", "file": "raccoon-walk.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawRaccoon" },
    { "id": "raccoon-happy", "file": "raccoon-happy.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawRaccoon" },
```

(Also update the top-level `"milestone"` field to `"PRD v5 A2 — style-locked regeneration"`.)

- [ ] **Step 3: Validate**

Run: `npm run assets:validate`
Expected: `asset validation: checked 63 manifest assets` (exit 0 — dims above are measured, frame math holds: 256*6=1536, 256*4=1024; `planned` rows skip the existence check).

Run: `npm test`
Expected: all green — the sw-precache "integrated manifest files" test passes because every added integrated file already ships in PRECACHE. If any precache failure appears, STOP and report (do not edit sw.js in this task).

- [ ] **Step 4: Add size/budget columns to `scripts/asset-report.mjs`**

Replace the `rows` construction:

```js
const rows = manifest.assets.map(asset => ({
  id: asset.id,
  file: asset.file,
  type: asset.type,
  status: asset.status,
  priority: asset.priority,
  present: fs.existsSync(path.join(root, "assets", asset.file)) ? "yes" : "-",
}));
```

with:

```js
// advisory budgets (bytes); hard enforcement for background/sprite-sheet
// lives in test/asset-budgets.test.js
const BUDGETS = {
  background: 350 * 1024,
  "sprite-sheet": 500 * 1024,
  character: 500 * 1024,
  decor: 120 * 1024,
  "ui-surface": 60 * 1024,
  effect: 60 * 1024,
};

const rows = manifest.assets.map(asset => {
  const filePath = path.join(root, "assets", asset.file);
  const present = fs.existsSync(filePath);
  const bytes = present ? fs.statSync(filePath).size : 0;
  const budget = BUDGETS[asset.type];
  return {
    id: asset.id,
    file: asset.file,
    type: asset.type,
    status: asset.status,
    priority: asset.priority,
    present: present ? "yes" : "-",
    kb: present ? Math.round(bytes / 1024) : "-",
    budget: budget ? `${Math.round(budget / 1024)}KB${present && bytes > budget ? " OVER" : ""}` : "-",
  };
});
```

and the `cols` line with:

```js
const cols = ["id", "file", "type", "status", "priority", "present", "kb", "budget"];
```

- [ ] **Step 5: Verify report + commit**

Run: `npm run assets:report`
Expected: table renders with KB + BUDGET columns; the 7 oversized backgrounds show `350KB OVER`.

```bash
git add assets/asset-manifest.json scripts/asset-report.mjs
git commit -m "feat(art): manifest covers all runtime assets; budget columns in assets:report (A2)"
```

---

### Task 3: `scripts/qa_asset.py` — the mechanical QA gate + checklist v5 refresh

**Files:**
- Create: `scripts/qa_asset.py`
- Modify: `docs/art/ART-QA-CHECKLIST.md` (rewrite for v5)

**Interfaces:**
- Consumes: manifest rows (looked up by filename) from Task 2; token hexes from STYLE-TOKENS.md §1 (hardcoded in the script, same 12 values).
- Produces: `python3 scripts/qa_asset.py assets/<file> [more files...]` → per-file `PASS`/`WARN`/`FAIL` lines, exit 1 if any FAIL. The checklist and prompts doc reference this exact invocation.

- [ ] **Step 1: Ensure Pillow is available**

```bash
python3 -c "import PIL" 2>/dev/null || python3 -m pip install --user pillow || python3 -m pip install --user --break-system-packages pillow
python3 -c "import PIL; print(PIL.__version__)"
```

Expected: a version prints. If installation fails entirely, STOP and report BLOCKED.

- [ ] **Step 2: Write `scripts/qa_asset.py`**

```python
#!/usr/bin/env python3
"""Mechanical half of the PRD v5 A2 asset QA gate.

Checks (hard FAIL): PNG readable, dims match the manifest row, size budget for
background/sprite-sheet, sprite-sheet frame math, alpha channel present when the
manifest type requires transparency, opaque-corner check for alpha assets.
Checks (advisory WARN): palette distance from the STYLE-TOKENS core palette.

Judgment items (light direction, silhouette, line weight) stay manual — see
docs/art/ART-QA-CHECKLIST.md.

Usage: python3 scripts/qa_asset.py assets/bg-market.png [assets/other.png ...]
Exit 1 if any file FAILs.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "assets" / "asset-manifest.json").read_text())
BY_FILE = {a["file"]: a for a in MANIFEST["assets"]}

# STYLE-TOKENS.md §1 core palette
PALETTE = [
    (0x32, 0x77, 0x5E), (0x5D, 0xAA, 0xDD), (0xF2, 0xBC, 0x57), (0xE6, 0x97, 0x77),
    (0x84, 0x60, 0x43), (0xB2, 0xAE, 0xA9), (0xFB, 0xF5, 0xE8), (0x1F, 0x4D, 0x4A),
    (0x28, 0x72, 0x3B), (0xC9, 0x5A, 0x41), (0xEA, 0xC7, 0x96), (0x2E, 0x2A, 0x24),
]
HARD_BUDGETS = {"background": 350 * 1024, "sprite-sheet": 500 * 1024}
ALPHA_TYPES = {"sprite-sheet", "character", "decor", "effect", "ui-surface"}
PALETTE_TOLERANCE = 72     # max RGB distance to count a pixel as "on palette"
PALETTE_MIN_FRACTION = 0.80


def palette_fraction(img):
    small = img.convert("RGBA").resize((64, 64))
    px = list(small.getdata())
    opaque = [(r, g, b) for r, g, b, a in px if a >= 128]
    if not opaque:
        return 1.0
    def near(p):
        return any(((p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2) ** 0.5 <= PALETTE_TOLERANCE
                   for c in PALETTE)
    return sum(1 for p in opaque if near(p)) / len(opaque)


def check(path):
    fails, warns = [], []
    name = Path(path).name
    row = BY_FILE.get(name)
    if row is None:
        fails.append("not in asset-manifest.json — add a row first")
        return fails, warns
    try:
        img = Image.open(path)
        img.load()
    except Exception as exc:
        fails.append(f"unreadable image: {exc}")
        return fails, warns

    if (img.width, img.height) != (row["w"], row["h"]):
        fails.append(f"dims {img.width}x{img.height} != manifest {row['w']}x{row['h']}")

    size = Path(path).stat().st_size
    budget = HARD_BUDGETS.get(row["type"])
    if budget and size > budget:
        fails.append(f"{size//1024}KB over the {budget//1024}KB {row['type']} budget "
                     f"(run scripts/compress_bg.py first)")

    if row["type"] == "sprite-sheet":
        if row["frameWidth"] * row["frames"] != row["w"] or row["frameHeight"] != row["h"]:
            fails.append("manifest frame math broken")

    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
    if row["type"] in ALPHA_TYPES:
        if not has_alpha:
            fails.append(f"type {row['type']} requires an alpha channel")
        else:
            rgba = img.convert("RGBA")
            corners = [rgba.getpixel(p)[3] for p in
                       [(0, 0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)]]
            if min(corners) > 32:
                warns.append("all four corners are opaque — matte/background may be baked in")
    elif row["type"] == "background" and has_alpha:
        warns.append("background has an alpha channel — export without alpha to save bytes")

    frac = palette_fraction(img)
    if frac < PALETTE_MIN_FRACTION:
        warns.append(f"only {frac:.0%} of pixels near the STYLE-TOKENS palette "
                     f"(advisory floor {PALETTE_MIN_FRACTION:.0%}) — eyeball against the reference")
    return fails, warns


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    any_fail = False
    for path in argv:
        fails, warns = check(path)
        status = "FAIL" if fails else ("WARN" if warns else "PASS")
        any_fail = any_fail or bool(fails)
        print(f"{status}  {path}")
        for msg in fails:
            print(f"      FAIL: {msg}")
        for msg in warns:
            print(f"      warn: {msg}")
    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 3: Verify against known assets (this is the test cycle for a Python tool with no vitest harness)**

```bash
python3 scripts/qa_asset.py assets/cat-walk.png; echo "exit=$?"
```
Expected: `PASS assets/cat-walk.png` (or PASS with a palette warn — the calico has out-of-palette fur oranges; a warn is acceptable, exit 0 either way).

```bash
python3 scripts/qa_asset.py assets/bg-home.png; echo "exit=$?"
```
Expected: `FAIL` with the over-budget message, `exit=1` (bg-home is 4.9 MB; Task 4 fixes this — the gate must catch it today).

```bash
python3 scripts/qa_asset.py assets/nonexistent.png; echo "exit=$?"
```
Expected: FAIL "not in asset-manifest.json", `exit=1`.

- [ ] **Step 4: Rewrite `docs/art/ART-QA-CHECKLIST.md`**

Full new content:

```markdown
# Art QA Checklist — PRD v5 A2 (style-locked assets)

Gate order per asset: `python3 scripts/qa_asset.py assets/<file>` (mechanical:
dims, budget, transparency, frame math, palette advisory) → the judgment items
below → set the manifest row's `status` → `npm test`.
An asset may reach `approved`/`integrated` only with qa_asset PASS/WARN (no
FAIL) and every judgment box checked.

## Judgment (manual, vs assets/_plan/REFERENCE-production-target.png)
- [ ] Palette reads as the STYLE-TOKENS.md six-color world; warm, slightly muted; no pure black/white, no neon, no casino gloss.
- [ ] Light comes from the UPPER LEFT; shadows soft, warm, down-right.
- [ ] Silhouette readable at 48–80 px on a phone; friendly round shapes.
- [ ] Line weight consistent with the reference (medium, soft edges).
- [ ] Character proportions match the anchor (round head ≈45% height) and stay identical across every frame.
- [ ] No baked-in Hanzi/pinyin/Thai/English/score text; no money-bag/wealth-medallion focal object.
- [ ] Backgrounds: low-detail center band (word card overlays it); battle lane flat along the bottom fifth.

## Mechanical (qa_asset.py enforces — listed for visibility)
- Dims exactly match the manifest `w`/`h`; sprite sheets: `frameWidth*frames == w`.
- Budgets: backgrounds <350 KB (compress with `scripts/compress_bg.py`), cat/raccoon sheets <500 KB, coin-class icons <20 KB.
- Alpha where the type requires it; clean transparency (no opaque matte corners).

## Integration
- [ ] Loads through `src/assets.js` / `src/sprites.js`; canvas/CSS fallback still renders with the PNG absent (file:// safety).
- [ ] `npm run assets:validate` exits 0; `npm run assets:report` shows the row with no OVER flag; `npm test` green.
- [ ] Legible at 360×640, 390×844, 412×915; Thai labels unclipped; reduced-motion respected.
- [ ] Log the result (PASS/FAIL + date) in the manifest row's `note` if anything was borderline.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/qa_asset.py docs/art/ART-QA-CHECKLIST.md
git commit -m "feat(art): qa_asset.py mechanical QA gate + checklist v5 (A2)"
```

---

### Task 4: Budget enforcement — failing vitest gate, then compress the 7 backgrounds

**Files:**
- Create: `test/asset-budgets.test.js`
- Create: `scripts/compress_bg.py`
- Modify: the 7 background PNGs in `assets/` (bytes only — dims unchanged)

**Interfaces:**
- Consumes: manifest rows (Task 2), Pillow (Task 3 step 1).
- Produces: a permanent suite gate: every approved/integrated `background` ≤ 358400 bytes and `sprite-sheet` ≤ 512000 bytes.

- [ ] **Step 1: Write the failing test**

Create `test/asset-budgets.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// PRD v5 A2 size budgets (PRD-production-art-v1 §Budgets): backgrounds <350KB,
// cat sheets <500KB. Hard-gated here for shipped (approved/integrated) assets;
// other types are advisory-only in scripts/asset-report.mjs.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "assets", "asset-manifest.json"), "utf8"));
const BUDGETS = { background: 350 * 1024, "sprite-sheet": 500 * 1024 };
const shipped = manifest.assets.filter(
  a => ["approved", "integrated"].includes(a.status) && BUDGETS[a.type]
    && existsSync(join(ROOT, "assets", a.file))
);

describe("asset size budgets (PRD v5 A2)", () => {
  it("covers a non-trivial asset set", () => {
    expect(shipped.length).toBeGreaterThan(15);
  });
  for (const a of shipped) {
    it(`${a.file} within the ${Math.round(BUDGETS[a.type] / 1024)}KB ${a.type} budget`, () => {
      const bytes = statSync(join(ROOT, "assets", a.file)).size;
      expect(bytes, `${a.file} is ${Math.round(bytes / 1024)}KB`).toBeLessThanOrEqual(BUDGETS[a.type]);
    });
  }
});
```

- [ ] **Step 2: Run it — must fail on exactly the 7 backgrounds**

Run: `npx vitest run test/asset-budgets.test.js`
Expected: 7 failures — bg-home, bg-quest, bg-flashcards, bg-results, bg-progress, bg-collection, bg-battle. All sprite-sheets pass.

- [ ] **Step 3: Write `scripts/compress_bg.py`**

```python
#!/usr/bin/env python3
"""Compress a background PNG to the A2 budget without changing dimensions.

Strategy: flatten to RGB (backgrounds carry no alpha contract), palette-quantize
with dithering, save optimized. Steps down the color count until the file fits
the budget. Dimensions never change (validate-assets enforces exact dims).

Usage: python3 scripts/compress_bg.py assets/bg-home.png [more ...]
"""
import sys
from pathlib import Path

from PIL import Image

BUDGET = 350 * 1024
COLOR_STEPS = [256, 192, 128, 96, 64]


def compress(path):
    p = Path(path)
    original = p.stat().st_size
    img = Image.open(p)
    img.load()
    rgb = img.convert("RGB")
    for colors in COLOR_STEPS:
        q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
        q.save(p, optimize=True)
        size = p.stat().st_size
        if size <= BUDGET:
            print(f"{p.name}: {original//1024}KB -> {size//1024}KB ({colors} colors)")
            return True
    print(f"{p.name}: still {size//1024}KB over budget at {COLOR_STEPS[-1]} colors — needs manual handling")
    return False


if __name__ == "__main__":
    ok = all([compress(a) for a in sys.argv[1:]])
    sys.exit(0 if ok else 1)
```

- [ ] **Step 4: Compress the 7 backgrounds**

```bash
python3 scripts/compress_bg.py assets/bg-home.png assets/bg-quest.png assets/bg-flashcards.png assets/bg-results.png assets/bg-progress.png assets/bg-collection.png assets/bg-battle.png
```

Expected: each line reports a post-size ≤ 350KB, exit 0. If any file cannot reach budget even at 64 colors, STOP and report DONE_WITH_CONCERNS naming it.

- [ ] **Step 5: Verify the gate and the whole suite**

Run: `npx vitest run test/asset-budgets.test.js` → all pass.
Run: `npm run assets:validate` → exit 0 (dims unchanged).
Run: `npm test` → all green.
Run: `python3 scripts/qa_asset.py assets/bg-home.png` → no longer FAILs on budget.

- [ ] **Step 6: Commit**

```bash
git add test/asset-budgets.test.js scripts/compress_bg.py assets/bg-home.png assets/bg-quest.png assets/bg-flashcards.png assets/bg-results.png assets/bg-progress.png assets/bg-collection.png assets/bg-battle.png
git commit -m "feat(art): hard size-budget gate + compress shipped backgrounds to A2 budget"
```

> **Controller checkpoint (not the implementer):** after this task, the controller re-runs the screenshot walk and eyeballs the compressed backgrounds for quantization banding (home, learn, results, progress, shop, battle). If banding is objectionable on any screen, re-run compress with a higher color floor for that file and re-check; if it cannot fit 350 KB acceptably, revert that file, mark its manifest row `"note": "over budget pending regeneration"`, and narrow the budget test to skip rows carrying that exact note (documenting the exception) — owner decides.

---

### Task 5: SHELL bump + wrap

**Files:**
- Modify: `sw.js` (SHELL v24 → v25)

- [ ] **Step 1: Bump SHELL**

In `sw.js` replace: `const SHELL = "nbhsk-shell-v24";`
with: `const SHELL = "nbhsk-shell-v25";`

- [ ] **Step 2: Final verification**

```bash
npm run build && npm test
```
Expected: build clean, full suite green (473 + ~20 new budget tests).

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "feat(art): SHELL v25 — compressed background precache refresh (A2)"
```

- [ ] **Step 4 (controller): PR**

Push and open a PR to `development` titled "PRD v5 Phase 2: A2 asset pipeline — prompts, QA gate, budget enforcement", noting that art *generation* is the owner's follow-up using GENERATION-PROMPTS-v5.md, and integration of delivered art is the next round.

---

## Self-review notes (already applied)

- **Spec coverage:** A2 master prompt doc → Task 1 (stored at `docs/art/GENERATION-PROMPTS-v5.md` per PRD deliverable, path adjusted for repo root). Asset list with kept filenames → Task 1 prompts + Task 2 manifest. QA gate incl. palette sampling, light, silhouette, line weight, budgets, transparency → Task 3 (mechanical script + judgment checklist) with budgets hard-gated in Task 4. "Log pass/fail in the asset tracker (ART-QA-CHECKLIST flow)" → Task 3 checklist + manifest `note` convention. Fallbacks remain → untouched (documented per row). Acceptance "all listed assets integrated and QA-logged" → **deliberately out of this plan's scope**: it requires owner-generated art; this plan ends at the handoff, and integration is a follow-up round per delivered batch.
- **Judgment call flagged for the owner:** the PRD lists plaque/buttons/tags/stamps/CRITICAL for regeneration, but those are reference-extracted SVGs (pack v2) — Task 1 files them under P2 "regenerate only on owner decision" instead of forcing regeneration. If the owner wants them regenerated regardless, that's a follow-up dev round (needs `SVG_SPRITES` changes).
- **Type consistency:** budget map `{background: 358400, "sprite-sheet": 512000}` appears identically in qa_asset.py (`HARD_BUDGETS`), asset-report.mjs (`BUDGETS`, superset with advisory rows), and test/asset-budgets.test.js. Manifest type `"decor"` added in Task 2 before qa_asset.py (Task 3) references it in `ALPHA_TYPES`.
- **Placeholder scan:** clean — all prompts, code, and manifest entries are written out with measured dims.
