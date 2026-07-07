# Codex Master Prompt — Lucky Cat HSK Education-First Visual Redesign

Work inside the active `game/` project.

Read first:
1. repository `CLAUDE.md`
2. repository `AGENTS.md`
3. `game/README.md`
4. `game/docs/ART-BRIEF.md`
5. `game/docs/PRD-education-visual-redesign-v1.md`
6. `game/assets/asset-manifest-education-v1.json`
7. `game/art-source/education-v1/reference/REFERENCE-education-first.png`

## Objective

Transform the current dark, gold-heavy, casino-like presentation into an education-first game called **Lucky Cat Learning Journey**.

Do not stop after planning. Complete every implementation phase not blocked by missing approved art.

## Preserve

- gameplay mechanics
- vocabulary pipeline
- HSK scope logic
- mastery and SRS behavior
- localStorage compatibility
- `file://` support
- PWA behavior
- Android compatibility
- image and canvas fallbacks

## Change

- visual hierarchy
- color system
- visible labels
- icon system
- cards, buttons, spacing, and typography
- Home, Flashcards, Word Quest, Results, Collection, and Progress presentation
- feedback language and visual effects

## Required visible label changes

- Battle → Word Quest
- Combo → Learning Streak
- Critical → Perfect
- Lives → Focus
- Shop → Collection
- Boss → Review Challenge
- Fight Misses → Practice Missed Words
- High Score → Best Session

Preserve internal keys where possible.

## Phase A — Audit

1. Audit every image, sprite, icon, emoji, background, visual effect, and fallback.
2. Create `game/docs/ASSET-INVENTORY.md`.
3. Create `game/art-source/education-v1/`.
4. Install and validate the provided manifest.
5. Identify gambling and casino cues in the UI.
6. Capture baseline screenshots at 360×640, 390×844, and 412×915.
7. Run `npm test` and `npm run build`.

## Phase B — Education-first UI system

1. Add the PRD CSS tokens.
2. Replace black/gold casino surfaces with warm paper, coral, jade, sky blue, ink navy, and soft neutral surfaces.
3. Make learning actions stronger than currency and customization.
4. Replace emoji UI with `ui-icons.svg`.
5. Update visible labels without changing stored data.
6. Improve Thai wrapping and spacing.
7. Add visible focus states and 44×44 minimum targets.
8. Add reduced-motion behavior.

## Phase C — Approved art integration

Integrate only assets marked `approved` in the manifest.

1. Register sprites and backgrounds through the current loader.
2. Preserve fallbacks.
3. Keep vocabulary text dynamic.
4. Never bake Hanzi, pinyin, Thai, English, scores, or progress into images.
5. Validate exact dimensions.
6. Optimize assets.
7. List missing art as blocked instead of inventing low-quality substitutes.

## Phase D — Screen polish

Update Home, Scope Selection, Flashcards, Word Quest, Results, Collection, and Progress. Home must communicate “learn Chinese” within two seconds.

## Phase E — Validation

Run:

```sh
npm ci
npm test
npm run build
npm run serve
npm run cap:sync
```

Validate 360×640, 360×800, 390×844, 412×915, desktop, fresh profile, existing save, HTTP, `file://`, offline PWA, no console errors, no missing assets, no clipped Thai, and no sprite drift.

## Release

1. Capture before/after screenshots.
2. Update manifest and inventory.
3. Bump the service-worker cache.
4. Rebuild and stage `www/`.
5. Leave a clean commit.
6. Report changed files, commands run, assets integrated, missing assets, and remaining issues.

Do not touch Android signing files or credentials.
