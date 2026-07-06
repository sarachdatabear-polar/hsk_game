# Lucky Cat HSK — Codex Art Handoff Checklist

Use this package to instruct Codex to reproduce the approved production-art direction inside the existing `game/` project.

## Important distinction

`REFERENCE-production-target.png` is a visual target and style reference. It is **not** a runtime sprite sheet or background file.

Codex can:
- audit the codebase
- create the asset pipeline and manifest
- wire filenames into the game
- update CSS and canvas integration
- validate dimensions and loading
- optimize approved assets
- run tests and builds

Codex should not be told to invent missing production art and call it final. Final art must be supplied as separate image files matching the asset manifest.

---

## Step 1 — Give Codex repository access

Open the `game/` project as the working directory.

Codex must read:
1. repository `CLAUDE.md`
2. repository `AGENTS.md`
3. `game/README.md`
4. `game/docs/ART-BRIEF.md`
5. this handoff package

Do not start from the HSK repository root as if it were the deployable app. The active app is `game/`.

---

## Step 2 — Place these files in the project

Recommended locations:

```text
game/
  docs/
    PRD-production-art-v1.md
    CODEX-EXECUTION-PROMPT.md
    CODEX-ART-HANDOFF-CHECKLIST.md
  art-source/
    style-guide/
      REFERENCE-production-target.png
  assets/
    asset-manifest.json
```

Use:
- `PRD-production-art-v1.md` as the requirements source
- `asset-manifest-v1.json` as the filename and dimension contract
- `REFERENCE-production-target.png` as the visual direction
- `CODEX-EXECUTION-PROMPT.md` as the first execution prompt

---

## Step 3 — Ask Codex to complete Phase A first

Send Codex the execution prompt and require this first deliverable:

### Phase A — Audit and scaffolding

Codex must:
1. Audit every current image and icon reference.
2. Create `game/art-source/`.
3. Create `game/assets/asset-manifest.json`.
4. Create `game/docs/ASSET-INVENTORY.md`.
5. Mark every required asset as:
   - existing
   - replace
   - missing
   - approved
   - integrated
6. Preserve all current fallbacks.
7. Add tests for required filenames and sprite-sheet metadata.
8. Run:
   - `npm test`
   - `npm run build`
9. Stop and report which production image files are still needed.

Do not let Codex redesign gameplay during this phase.

---

## Step 4 — Provide the actual production image files

To match the reference, Codex needs real exported image files, not only the moodboard.

### First production batch

Provide these exact files:

```text
cat-walk.png
cat-happy.png
maneki.png
cat-portrait.png
bg-home.png
bg-battle.png
bg-market.png
ui-panel.png
ui-word-plaque.png
ui-button-primary.png
ui-button-secondary.png
ui-button-neutral.png
ui-badge.png
ui-progress-track.png
ui-progress-fill.png
fx-correct.png
fx-wrong.png
fx-critical.png
ui-icons.svg
```

### Critical dimensions

```text
cat-walk.png
- 1536 × 256
- 6 horizontal frames
- each frame 256 × 256
- transparent PNG

cat-happy.png
- 1024 × 256
- 4 horizontal frames
- each frame 256 × 256
- transparent PNG

bg-home.png
- 1080 × 1920 portrait master
- no text or buttons baked in

bg-battle.png
- 1024 × 512
- dark, low-detail center for Hanzi

bg-market.png
- 1024 × 512
- same visual language as the reference

ui-icons.svg
- shared icon system
- no emoji
- readable around 18–24 px
```

Place approved runtime images in:

```text
game/assets/
```

Place high-resolution source masters in:

```text
game/art-source/
```

---

## Step 5 — Approve assets before integration

For each asset, check:

- Same cat proportions as the reference
- Same upper-left warm lighting
- Lacquer red, gold, jade, and night-blue palette
- Transparent edges are clean
- No white halo
- No baked-in dynamic text
- No incorrect Chinese characters in backgrounds
- Readable at actual phone size
- Sprite frame alignment is consistent

Only approved images should be marked `approved` in the manifest.

---

## Step 6 — Ask Codex to complete Phase B

After placing approved images in `game/assets/`, tell Codex:

> Integrate only the approved assets in `game/assets/asset-manifest.json`. Preserve current fallback rendering. Do not change gameplay. Replace emoji UI with `ui-icons.svg`, apply the new visual tokens, and validate Home and Battle at 360×640, 390×844, and 412×915.

Codex must:
1. Register assets in `src/sprites.js`.
2. Update image usage in `src/cat.js`, `src/main.js`, and related modules.
3. Update CSS in `index.html`.
4. Keep vocabulary text dynamic.
5. Preserve `file://`.
6. Keep fallbacks for missing images.
7. Run tests and build.

---

## Step 7 — Review the vertical slice

Review these screens:

1. Home
2. Scope selection
3. Flashcard
4. Battle
5. Results
6. Shop preview
7. Progress

Approval questions:

- Does the game look like the reference?
- Is the cat consistent everywhere?
- Is Hanzi the strongest element?
- Is Thai readable?
- Are the backgrounds atmospheric but quiet?
- Are buttons and icons from one visual family?
- Does the game still fit 360×640?
- Is the Play/Battle action visible without excessive scrolling?

Reject individual assets rather than asking Codex to compensate with CSS filters.

---

## Step 8 — Final Codex validation

Require Codex to run:

```sh
npm ci
npm test
npm run build
npm run serve
npm run cap:sync
```

Also require:

- no console errors
- no missing asset requests
- offline PWA check
- direct `file://` check
- fresh profile check
- existing saved profile check
- before/after screenshots
- asset sizes report
- service-worker cache version bump
- no edits to Android signing files

---

## Step 9 — Expand only after approval

After the vertical slice is approved, repeat the same process for:

- Midnight skin
- Sakura skin
- Jade skin
- Gold skin
- Boss cat
- Temple background
- Bamboo background
- Growth accessories
- Lucky Cat Street decorations
- Marketing screenshots and app-store assets

Do not generate and integrate the full catalog before the base visual system is approved.

---

## What you provide vs. what Codex provides

### You provide

- Visual approval
- The reference board
- Final exported production images
- Decisions when multiple concepts are presented
- Permission to move from vertical slice to expansion

### Codex provides

- Repository audit
- Folder structure
- Asset manifest
- Runtime integration
- UI/CSS implementation
- Fallback behavior
- Responsive validation
- Tests, builds, and release checks
- A precise list of any missing or invalid art files

---

## First message to send Codex

Copy the contents of `CODEX-EXECUTION-PROMPT.md`.

Attach or place beside it:

- `PRD-production-art-v1.md`
- `asset-manifest-v1.json`
- `REFERENCE-production-target.png`
- this checklist

Then tell Codex:

> Complete Phase A only. Do not redesign gameplay and do not create fake final art. Audit and scaffold the production asset pipeline, preserve all fallbacks, run tests/build, and report the exact approved image files needed for Phase B.
