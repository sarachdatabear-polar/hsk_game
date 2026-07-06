# Codex Execution Prompt — Lucky Cat HSK Production Art Vertical Slice v1

Work in the `game/` project.

Read these first:

1. Repository root `CLAUDE.md`
2. `game/README.md`
3. `game/docs/ART-BRIEF.md`
4. `PRD-production-art-v1.md`
5. `asset-manifest-v1.json`

Your task is to implement the Production Art Vertical Slice v1 described in the PRD.

## Important boundary

Do not pretend generated placeholders are final production art. Separate the work into:

- Integration and architecture tasks Codex can complete
- Art files that must be supplied or approved
- Validation tasks

When approved image files are available, integrate them through the exact runtime filenames in the manifest.

## Required first pass

1. Audit all image/icon references.
2. Create `game/art-source/` structure and its README.
3. Add `game/assets/asset-manifest.json`.
4. Create a concise `game/docs/ASSET-INVENTORY.md`.
5. Create a visual-token section in `index.html` CSS without changing gameplay.
6. Replace emoji-based production UI with a consistent icon mechanism.
7. Preserve all current fallbacks and `file://` behavior.
8. Add validation for required asset registration.
9. Run `npm test` and `npm run build`.
10. Produce a change summary and a list of art files still required.

## After approved art is present

1. Integrate base cat walk/happy sheets.
2. Integrate home, battle, and Night Market backgrounds.
3. Integrate UI frames and core icons.
4. Integrate correct/wrong/critical effects.
5. Test target mobile sizes.
6. Optimize assets.
7. Bump the service-worker shell cache.
8. Run full validation and stage `www/`.

Follow the PRD acceptance criteria exactly. Keep changes small, tested, and reviewable.
