# 2026-07-23 Street Visual Recovery Plan

**Status:** implemented and release-verified; deployment target `v104`  
**Production audited:** `58722879` / PWA cache `v103`  
**Goal:** remove the red-box rendering defects and rebuild Lucky Cat Street as a
coherent, mobile-first diorama with one art language, clear hierarchy, and no
responsive occlusion.

## Implementation result

The recovery shipped as one coherent fix rather than the temporary two-phase
fallback described below:

- Removed all primitive milestone wearables from both Street and Battle; the
  kitten remains a separate authored companion.
- Replaced the five procedural landmark drawings with transparent painted
  assets matching the Street art language.
- Added a true portrait 3:4 background and matching portrait canvas, with a
  square short-phone crop, compact 4:3 desktop crop, and 2:1 short-landscape
  crop.
- Promoted Decorate as the primary action and replaced the mechanical empty
  caption with a useful invitation.
- Added permanent release probes for all five landmark draws and Street/nav
  intersection.
- Bumped the unified PWA cache to `v104`.

Post-fix evidence is stored beside the production captures:

| Capture | Verified result |
|---|---|
| [Street · Lv50 · 390×844](../audits/2026-07-23-street/after-portrait-lv50.png) | Native 3:4 scene, five coherent landmarks, clean mascot, balanced vertical composition. |
| [Street · Lv50 · 320×568](../audits/2026-07-23-street/after-se-lv50.png) | Square short-phone fallback keeps the whole scene, caption, actions, and nav visible. |
| [Street · Lv50 · 844×390](../audits/2026-07-23-street/after-landscape-lv50.png) | Compact landscape canvas and caption clear the sticky navigation. |
| [Battle · Lv50 · 390×844](../audits/2026-07-23-street/after-battle-lv50.png) | Shared cat renderer is clean at the highest milestone; no red torso box or primitive crown. |

Release verification:

- `npm run build`
- `npm test` — 95 files / 9,350 tests passed
- `npm run lint`
- `npm run assets:validate` — 102 assets checked
- Street browser matrix — 20/20 English/Thai viewport cases passed after
  correcting the one Thai desktop wrap found by the first pass
- Accessibility recheck — pause Escape/focus return and dynamic canvas label
  passed

## Production evidence

The captures below came from the live GitHub Pages build with a clean browser
profile and deterministic XP values.

| Capture | What it proves |
|---|---|
| [Level 1 · 390×844](../audits/2026-07-23-street/prod-level-1-390x844.png) | The authored base cat PNG is clean. The defect is introduced by progression rendering, not baked into the sprite. |
| [Level 20 · 390×844](../audits/2026-07-23-street/prod-level-20-390x844.png) | A red rectangle covers the cat's torso, a second scarf duplicates the painted scarf, and the Tailor landmark reads as a floating red bar. |
| [Level 50 · 390×844](../audits/2026-07-23-street/prod-level-50-390x844.png) | Cumulative primitive accessories and five undersized procedural landmarks make the scene progressively less coherent. |
| [Level 20 · 844×390](../audits/2026-07-23-street/prod-level-20-844x390.png) | The fixed bottom navigation covers the bottom 24px of the canvas; the caption is below the fold/behind the navigation. |

## Audit verdict

The current screen should not be polished in place with more rectangles,
offsets, or scale tweaks. It mixes three incompatible rendering systems:

1. a painted 1024×512 background;
2. authored, outlined PNG character/decor sprites;
3. tiny flat-color canvas primitives for wearables and landmarks.

The third system is the visible failure. It must be removed from the production
path, not cosmetically adjusted.

## Findings

### P0 — the red box on the cat is literal geometry

`src/cat.js:174-179` draws the level-20 outfit with:

```js
ctx.fillRect(x - 11, y - 40 + bob, 22, 16);
```

The same renderer adds a second red scarf at level 5, even though every base
cat sheet already contains a painted red scarf and green book. Level 10 adds a
flat coin over the torso, and level 50 adds three triangular crown spikes.

`src/main.js:4096-4100` passes every cumulative milestone into `drawCat`, so the
problem appears at the exact progression levels:

- Lv 1: clean authored sprite;
- Lv 5: duplicate rectangular scarf;
- Lv 10: scarf plus flat coin;
- Lv 20: scarf, coin, and the large red torso box;
- Lv 50: all of the above plus primitive crown and halo.

This renderer is shared with Battle, so fixing only Street would leave the same
defect elsewhere.

### P0 — the other red boxes are procedural landmarks

The five progression landmarks in `src/street.js:6-12` have no art assets.
`src/main.js:4560-4604` approximates them with small rectangles, ellipses, and
lines. The compact scene then scales them with
`m.unit * m.backScale` (`src/main.js:4160-4161`), approximately 21px at
390×844.

Consequences visible in the captures:

- the Tailor Shop becomes a floating red roof bar;
- the Coin Bank becomes a tiny brown square;
- the Emperor Gate becomes an isolated red outline;
- none read as buildings or as part of the painted village.

### P0 — landscape content is obscured

At 844×390 production measures:

- Street canvas: `y=124..366`;
- bottom navigation: `y=342..390`;
- caption: `y=373..391`.

The nav therefore covers 24px of the scene, and the caption is not usable at
the initial scroll position. The current responsive sweep checks canvas size
but does not test intersection with the sticky nav.

### P1 — the canvas correction created a weak screen composition

Matching the existing background's native 2:1 ratio eliminated side cropping,
but on a 390px phone the scene is now only 354×177. The result is:

- the title and three equal-weight action buttons occupy almost as much height
  as the world;
- the detailed art is reduced to a strip;
- the caption is tiny and mechanical;
- most of the lower viewport is empty;
- there is no clear next action or progression story in that empty space.

The background asset and the desired portrait UI need separate compositions.
Forcing the entire screen to inherit the source asset's ratio is not a durable
layout system.

### P1 — hierarchy and meaning are weak

- `Decorate`, `Street Shop`, and `Quests` have identical visual priority.
- “0 decorations · 0 stored · 3 landmarks” reports inventory but does not tell
  the player what to do.
- An empty Street has no authored empty-state message or visible next unlock.
- Landmark count increases while the “landmarks” themselves are unrecognizable.
- The resident competes with broken milestone overlays instead of being the
  emotional focus.

## Chosen design direction

Lucky Cat Street will become an **authored mobile diorama**, not a canvas demo.

1. The equipped cat sprite is the complete character presentation. No
   procedural clothing is drawn on top of a raster character.
2. Growth rewards remain in progression/Profile. The kitten may remain in the
   scene because it is a separate authored character. Future wearable rewards
   require authored sprite sheets and cannot ship as geometry.
3. Every visible landmark uses a transparent painted asset matching the
   background and decoration set.
4. Portrait and landscape use art/layouts composed for their available aspect
   ratios instead of stretching one ratio across both.
5. The world is the primary visual. Controls and progression copy support it
   rather than dominating it.

## Implementation plan

### Phase 1 — production artifact hotfix

Purpose: remove visibly broken rendering before waiting for new art.

#### Task 1.1 — remove primitive wearables globally

Files:

- `src/cat.js`
- `src/main.js`
- `test/cat-accessories.test.js` (new)
- affected existing cat/growth tests

Work:

- Remove `drawAccessories` from all authored sprite paths.
- Do not flash primitive accessories while a PNG is loading; the vector
  fallback must not present a different costume from the loaded sprite.
- Keep growth milestone data intact for Profile/progression and cloud
  compatibility.
- Keep the kitten follower as a separate `drawCat` call.
- Leave equipped skin selection untouched.
- Add a fake-canvas test that calls the Lv 5/10/20/50 presentations and proves
  no red `fillRect`, torso coin, or primitive crown is drawn.
- Audit Battle and Street call sites together.

Acceptance:

- Base and purchased skins are visually unchanged between Lv 1 and Lv 50,
  except for the separate kitten follower.
- No flat red rectangle appears on any cat pose in Street or Battle.
- No loading-time flash of the old overlays.

#### Task 1.2 — stop drawing broken landmark primitives

Files:

- `src/main.js`
- `src/street.js`
- `src/i18n.js`
- `test/street.test.js`

Work:

- Remove `drawStreetBuilding` from the live render path.
- Until authored landmark art lands, represent unlocked landmarks in the
  below-scene progression card only; do not draw fake buildings.
- Change the temporary caption so it never claims visible landmarks that the
  player cannot recognize.
- Preserve `BUILDINGS`, unlock levels, saved layouts, ownership, and all
  progression data.

Acceptance:

- Lv 5/10/20/30/50 captures contain no floating brown/red primitive fragments.
- The player still sees current level and next landmark unlock in text.

#### Task 1.3 — fix landscape occlusion

Files:

- `index.html`
- `scripts/responsive-sweep.mjs`

Work:

- Give short landscape a bounded 2:1 stage that fits above the bottom nav
  (target approximately 360×180 inside the 520px app column).
- Reserve bottom-nav/safe-area space in the Street layout.
- Add an intersection probe: canvas, caption, editor actions, and project card
  must not overlap the nav rectangle.

Acceptance:

- At 640×360 and 844×390, the complete canvas border and caption are visible.
- No initial document scroll is required to understand or operate Street.
- All action targets remain at least 44×44px.

#### Task 1.4 — hotfix verification and release

- Run `npm run build`, bare `npm test`, `npm run lint`, and
  `npm run qa:responsive`.
- Capture deterministic Street and Battle images at Lv 1, 5, 10, 20, 30, 50.
- Capture base skin plus one purchased skin, walk plus happy state.
- Obtain screenshot approval before deployment.
- Bump the service-worker cache only at release and verify the live files after
  GitHub Pages completes.

### Phase 2 — coherent Street art system

Purpose: restore progression landmarks and give portrait Street a composition
designed for its actual canvas.

#### Task 2.1 — create the portrait diorama background

New asset:

- `assets/bg-street-portrait.png`, 1024×768, opaque

Art brief:

- match `bg-street.png` exactly in palette, light, brush texture, and building
  architecture;
- 4:3 portrait-safe composition, not a crop of the 2:1 art;
- quiet upper-middle region;
- readable road/ground in the lower 38%;
- left/right edge structures frame the scene;
- open authored homes for the resident, five landmarks, and placed decos;
- no baked labels, characters, UI, landmarks, or shop items.

Keep `bg-street.png` for short landscape. Select the background by the stage's
layout mode, not by arbitrary `drawCoverImage` cropping.

#### Task 2.2 — create five landmark assets

New transparent PNGs, 512×512, bottom-center anchored:

- `landmark-lantern-post.png`
- `landmark-coin-bank.png`
- `landmark-tailor.png`
- `landmark-kitten-cafe.png`
- `landmark-emperor-gate.png`

Art requirements:

- same watercolor-flat storybook rendering as the Street background/decos;
- strong silhouette at 48–96px;
- consistent ground baseline and lighting;
- no text, currency symbols, rectangles standing in for architecture, glow,
  or baked shadow;
- landmark size hierarchy authored in the silhouette rather than simulated
  with extreme renderer scaling.

Integration:

- add to `assets/asset-manifest.json`, sprite registry, validation, and offline
  policy;
- add measured alpha bounds or use the existing content-aware static sprite
  draw contract;
- remove the old procedural building renderer completely;
- retain a quiet neutral milestone marker only as the missing/loading fallback,
  never a pseudo-building.

#### Task 2.3 — extract a tested scene layout contract

Files:

- `src/street-scene.js` (new pure module)
- `src/street.js`
- `src/main.js`
- `test/street-scene.test.js` (new)

The helper returns:

- stage mode (`portrait` / `landscape`);
- background id;
- canvas size;
- ground and lane positions;
- resident route safe area;
- landmark and decoration placements/scales;
- reserved UI/nav clearance.

Rules:

- portrait target: 4:3, approximately 284×213 at 320px and 354×266 at 390px;
- landscape target: 2:1 and height-capped to remain above nav;
- landmarks have five stable authored homes;
- resident route never crosses the visual center of a landmark/deco;
- painter order is background → back landmarks → back/mid/front decos →
  resident/kitten → transient effects;
- no renderer formula lives separately in CSS, `street.js`, and `main.js`.

Acceptance:

- every supported size has positive, in-bounds placements;
- foreground assets never clip at the canvas edge;
- no same-lane overlap exceeds the approved threshold;
- touch targets correspond to visible pieces after scaling.

### Phase 3 — rebuild screen hierarchy

Files:

- `index.html`
- `src/main.js`
- `src/i18n.js`
- responsive/accessibility tests

#### Task 3.1 — make the world primary

- Keep the compact title/wallet row.
- Change the action row from three equal buttons to:
  - primary: **Decorate Street**;
  - secondary: **Shop**;
  - tertiary: **Quests**.
- Use a 2:1:1 grid or equivalent hierarchy; the primary action receives the
  gold treatment.
- Increase the portrait world's visual share with the authored 4:3 scene.
- Keep controls outside the canvas and preserve 44px targets.

#### Task 3.2 — replace the mechanical caption with a useful status card

Normal state:

- compact chips for placed decorations and stored items;
- one sentence for current Street level / next landmark;
- active project progress when a project exists.

Empty state:

- “Your street is ready for its first decoration.”
- a single clear Decorate/Place Welcome Lantern action;
- no “0 · 0 · N” line as the only explanation.

Full state:

- status remains compact;
- no extra controls cover the art;
- item information opens below the scene without shifting nav over content.

Use semantic DOM for the status; do not paint copy into canvas.

#### Task 3.3 — tune motion after static composition is approved

- Resident motion remains secondary to the authored scene.
- Use one calm route with pauses at visible items.
- Keep activity props at ground level and in the same art language.
- Stop all RAF work when Street is hidden, editing, previewing, or reduced
  motion is active.
- Do not add speech bubbles, floating labels, or face-level rectangles.

### Phase 4 — release-quality validation

#### Automated matrix

Viewports:

- 320×568
- 344×882
- 360×640
- 390×844
- 412×915
- 640×360
- 844×390
- 768×1024
- 1280×800

States:

- empty Street;
- Welcome Lantern placement;
- sparse owned set;
- all 15 decos;
- active project;
- edit mode;
- preview mode;
- Lv 1/5/10/20/30/50;
- base and purchased skin;
- English and Thai;
- normal and reduced motion.

Assertions:

- no canvas/nav or card/nav intersection;
- no horizontal overflow;
- no clipped scene content or caption;
- all actionable DOM targets at least 44×44px;
- correct 1×/2× DPR canvas backing size;
- no old procedural landmark/wearable operations;
- lazy asset redraw works online and `file://` fallback stays usable.

#### Visual sign-off

Before production:

1. capture the exact matrix subset at 320×568, 390×844, and 844×390;
2. include Lv 1, 20, and 50 comparisons;
3. compare empty, sparse, and full streets;
4. review the images at actual CSS size, not only zoomed;
5. do not deploy until the owner approves the screenshots.

## Definition of done

- No red box, duplicate scarf, flat torso coin, or primitive crown appears on
  any cat.
- All five landmarks are recognizable painted assets with stable placement.
- Portrait Street uses an authored portrait composition; landscape uses a
  bounded matching composition.
- The scene is never covered by bottom navigation or safe-area UI.
- Street has one obvious primary action and a useful empty/progression state.
- The lower viewport no longer reads as accidental empty space.
- Full tests, lint, asset validation, responsive matrix, and screenshot
  approval pass before the production cache is bumped and deployed.
