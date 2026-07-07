# PRD — Lucky Cat HSK Production Art Upgrade v1

**Status:** Approved for implementation  
**Owner:** Northbear  
**Implementation agent:** Codex  
**Primary target:** `game/`  
**Milestone:** Production Art Vertical Slice v1  
**Priority:** High

---

## 1. Purpose

Upgrade Lucky Cat HSK from functional/generated artwork to a cohesive, production-grade visual experience while preserving the current gameplay, data pipeline, offline behavior, PWA deployment, and Android packaging.

This milestone must produce one complete, polished vertical slice covering:

- Home screen
- Default/base cat
- Battle screen
- Core HUD and controls
- Correct/wrong/critical feedback
- Night Market environment
- Shop preview presentation

The slice establishes the final visual language that later skin, backdrop, street, boss, marketing, and store assets must follow.

---

## 2. Product Context

Lucky Cat HSK is a mobile-first HSK vocabulary arcade game delivered as:

- Browser application
- Installable PWA
- Capacitor Android application

Current implementation constraints:

- Vanilla JavaScript ES modules
- `index.html` contains the main markup and CSS
- `src/main.js` is bundled by esbuild to `dist/app.js`
- Canvas is used for battle rendering and Lucky Cat Street
- Game data is loaded from bundled JavaScript and must continue to work under `file://`
- Existing vector/canvas fallbacks must remain available until production assets are loaded
- Local storage keys use the `nbhsk.*` namespace

This project is an art and presentation upgrade, not a gameplay rewrite.

---

## 3. Goals

### 3.1 Primary goals

1. Establish one production-ready visual system.
2. Improve perceived quality on first launch.
3. Make Hanzi, pinyin, Thai, and English content more readable.
4. Give the mascot a memorable, consistent identity.
5. Make home, battle, shop, progress, and results feel like parts of the same game.
6. Preserve performance on average Android phones.
7. Make production assets replaceable through stable filenames and manifests.

### 3.2 Success indicators

- The game looks intentionally art-directed rather than assembled from mixed placeholders.
- Base cat remains recognizable at 48–80 px display size.
- Hanzi is visually dominant during battle.
- Thai text is readable without clipping.
- The home screen communicates the brand within two seconds.
- Backgrounds add atmosphere without competing with learning content.
- Correct/wrong feedback is understandable without relying only on color.
- All existing tests remain green.
- Build, PWA, `file://`, and Android workflows remain functional.

---

## 4. Non-goals

The following are outside this milestone:

- New gameplay modes
- New vocabulary data
- Backend, accounts, cloud saves, or online leaderboard
- Replacing the build system or adding a UI framework
- Reworking scoring, mastery, SRS, quests, or shop economy
- Full animation rigging
- Full App Store / Play Store marketing package
- Producing every premium skin before the first visual slice is approved
- Removing existing canvas or vector fallbacks

---

## 5. Art Direction

### 5.1 Visual statement

**A joyful Chinese festival world at night, led by a charming lucky cat, using lacquer red, polished gold, jade accents, dark tiled roofs, warm lantern light, and crisp educational typography.**

### 5.2 Style

- Environments: softly painted, atmospheric, low-frequency detail
- Characters: clean cel-painted forms with bold silhouette
- UI: crisp ornamental frames with restrained Chinese decorative motifs
- Icons: solid readable silhouettes, shared stroke weight
- Effects: energetic, luminous, short-lived, not visually noisy
- Tone: all-ages, welcoming, premium, playful, culturally respectful
- Avoid: gore, horror, emoji mixing, excessive realism, noisy textures, tiny decorative detail

### 5.3 Palette

| Token | Value | Use |
|---|---:|---|
| Lacquer red | `#A51F24` | Primary buttons, banners |
| Deep crimson | `#4A1015` | Panels, shadows |
| Festival gold | `#F5C34B` | Borders, rewards, highlights |
| Dark gold | `#9C6900` | Gold outlines and depth |
| Jade | `#2F9B72` | Positive state, secondary accent |
| Night navy | `#101B2B` | Sky and deep background |
| Warm paper | `#F4E2BE` | Word plaques |
| Ink | `#24150E` | Hanzi and paper text |
| Soft cream | `#FFF4E0` | Main light text |
| Muted tan | `#C9A58A` | Secondary labels |

### 5.4 Lighting

- Main warm light direction: upper-left
- Lantern light: orange-gold and localized
- Moon/night fill: cool blue
- Gold surfaces: bright highlight with dark amber edge
- Characters must remain readable against every background

### 5.5 Character construction

- Large head, compact body, short limbs
- Clear ears, cheek shape, bell/charm silhouette
- Friendly expression
- Medium line weight at source resolution
- Limited soft cel shading
- Identical body geometry across skin variants
- Accessories anchored consistently across frames

### 5.6 Typography

Do not bake vocabulary text into raster assets.

- Hanzi: largest and highest contrast
- Pinyin: rounded, medium weight, clearly separated
- Thai/English: readable UI font, sufficient line height
- Decorative title font allowed only for branding and headings
- Use HTML/canvas text for localization and dynamic content

---

## 6. Vertical Slice Scope

### 6.1 Screens included

1. Home
2. Scope selection
3. Flashcard
4. Battle
5. Results
6. Shop preview
7. Progress summary

The deepest polish is required on Home and Battle. Other included screens should receive the same tokens, icons, frame system, and typography hierarchy.

### 6.2 Runtime asset deliverables

The following production files are required.

#### A. Base mascot

| File | Exact specification |
|---|---|
| `assets/cat-walk.png` | Transparent PNG sprite sheet, 6 horizontal frames, each 256×256, total 1536×256 |
| `assets/cat-happy.png` | Transparent PNG sprite sheet, 4 horizontal frames, each 256×256, total 1024×256 |
| `assets/maneki.png` | Transparent PNG, square, minimum 512×512 source, optimized runtime export |
| `assets/cat-portrait.png` | Transparent PNG, 512×512, home/profile/shop portrait |

Frame contract:

- Every frame uses the same 256×256 cell.
- Feet baseline must be consistent.
- Character center must not drift.
- Transparent margin must be consistent.
- No cropped ears, paws, tail, accessories, or effect glow.
- Walk cycle must loop cleanly.
- Happy sequence must read clearly when sampled as a still image.

#### B. Environments

| File | Exact specification |
|---|---|
| `assets/bg-home.png` | 1080×1920 portrait master, runtime optimized; safe center composition |
| `assets/bg-battle.png` | 1024×512 landscape runtime image; default battle scene |
| `assets/bg-market.png` | 1024×512 landscape; premium Night Market scene |
| `assets/bg-results.png` | 1080×1920 or reusable layered treatment; quiet center for score content |

Environment rules:

- Upper/middle area behind vocabulary must stay dark and low contrast.
- No legible signs containing incorrect Chinese characters.
- No focal object may sit directly behind Hanzi.
- Background must tolerate crop and scaling on multiple phone ratios.
- Edges may hold more detail than the text-safe center.
- Avoid baked-in UI, scores, words, or buttons.

#### C. UI frames

Preferred source: transparent PNG or SVG where suitable.

| File | Use |
|---|---|
| `assets/ui-panel.png` | Main lacquer/dark panel, scalable/9-slice friendly |
| `assets/ui-word-plaque.png` | Warm paper or dark lacquer vocabulary plaque |
| `assets/ui-button-primary.png` | Red/gold primary button frame |
| `assets/ui-button-secondary.png` | Jade/dark secondary button frame |
| `assets/ui-button-neutral.png` | Neutral button frame |
| `assets/ui-badge.png` | Small badge/chip frame |
| `assets/ui-progress-track.png` | Progress track |
| `assets/ui-progress-fill.png` | Progress fill |
| `assets/ui-divider.png` | Ornamental divider |

Rules:

- No baked-in text.
- Corners must survive resizing.
- Use CSS/HTML text above the image.
- Provide sufficient inner padding for Thai labels.
- Disabled state may be produced through CSS opacity/grayscale unless a dedicated asset is necessary.

#### D. Core icons

Transparent SVG preferred; transparent PNG accepted.

Required icons:

- `icon-heart`
- `icon-heart-empty`
- `icon-coin`
- `icon-diamond`
- `icon-audio`
- `icon-muted`
- `icon-pause`
- `icon-close`
- `icon-back`
- `icon-home`
- `icon-shop`
- `icon-street`
- `icon-progress`
- `icon-quests`
- `icon-flashcards`
- `icon-battle`
- `icon-check`
- `icon-wrong`
- `icon-paw`
- `icon-streak`

Icon rules:

- Shared optical size
- Shared stroke or silhouette system
- Readable at 18 px
- No emoji glyphs in production UI
- CurrentColor-compatible SVG where practical

#### E. Effects

| File | Specification |
|---|---|
| `assets/fx-correct.png` | Transparent effect sheet or atlas; gold/jade paw burst |
| `assets/fx-wrong.png` | Transparent effect sheet or atlas; crimson broken paw/ripple |
| `assets/fx-critical.png` | Transparent effect sheet or atlas; stronger gold starburst |
| `assets/fx-level-up.png` | Transparent celebration burst |
| `assets/fx-new-best.png` | Transparent celebration treatment |

Effects must:

- Finish quickly
- Keep the word and answers readable
- Communicate state with shape and motion, not color alone
- Avoid large opaque flashes
- Remain compatible with canvas rendering

#### F. Shop preview assets

For the vertical slice:

- One production Midnight skin preview
- One production Sakura skin preview
- One Night Market background thumbnail
- One effect-pack thumbnail
- One sound-pack visual badge

These previews must be derived from or visually identical to actual equipped content.

---

## 7. Expansion Asset List

After the vertical slice is approved, produce:

### Cat skins

- `cat-midnight-walk.png`
- `cat-midnight-happy.png`
- `cat-sakura-walk.png`
- `cat-sakura-happy.png`
- `cat-jade-walk.png`
- `cat-jade-happy.png`
- `cat-gold-walk.png`
- `cat-gold-happy.png`

### Boss

- `cat-boss-walk.png`
- `cat-boss-happy.png`

### Backdrops

- `bg-temple.png`
- `bg-bamboo.png`

### Growth accessories

- Red scarf
- Gold coin charm
- Red/gold vest
- Kitten follower
- Emperor crown
- Gold halo

### Street

- Landmark buildings
- Red lantern
- Noodle stall
- Tea sign
- Foo dog
- Golden arch
- Additional decoration set

### Marketing

- App icon
- Adaptive Android foreground/background icon
- PWA icons
- Feature graphic
- Store screenshots
- Social preview
- Website hero image

---

## 8. Source and Runtime Folder Structure

Create:

```text
game/
  art-source/
    style-guide/
    characters/
      base/
      skins/
      boss/
      accessories/
    environments/
      home/
      battle/
      results/
      street/
    ui/
      frames/
      icons/
      effects/
    marketing/
    review/
  assets/
    optimized runtime files only
```

Rules:

- `art-source/` contains high-resolution masters and working files.
- `assets/` contains only optimized runtime exports.
- Do not commit temporary model outputs, duplicates, or rejected concepts into `assets/`.
- Do not overwrite approved assets without preserving the approved source master.
- Add a short `art-source/README.md` explaining source ownership, export settings, and asset status.

---

## 9. Asset Manifest

Add `game/assets/asset-manifest.json`.

Each item must include:

```json
{
  "id": "cat-base-walk",
  "file": "cat-walk.png",
  "type": "sprite-sheet",
  "status": "approved",
  "version": 1,
  "source": "../art-source/characters/base/cat-walk-master.png",
  "width": 1536,
  "height": 256,
  "frames": 6,
  "frameWidth": 256,
  "frameHeight": 256,
  "license": "project-owned",
  "notes": "Six-frame horizontal loop"
}
```

Allowed status values:

- `planned`
- `concept`
- `review`
- `approved`
- `integrated`
- `rejected`

---

## 10. Implementation Requirements for Codex

### 10.1 Preserve architecture

Codex must:

- Keep vanilla JavaScript and current esbuild setup.
- Preserve `file://` compatibility.
- Preserve image-loading fallbacks.
- Avoid new runtime dependencies unless absolutely necessary.
- Keep dynamic text in HTML/canvas, not raster images.
- Keep localStorage compatibility.
- Avoid editing generated vocabulary outputs.
- Treat `dist/`, `www/`, and staged Android web output as generated.

### 10.2 Integration work

Codex must:

1. Audit every current image reference in:
   - `index.html`
   - `src/sprites.js`
   - `src/cat.js`
   - `src/main.js`
   - `src/street.js`
   - `src/shop.js`
   - PWA and Android icon configuration
2. Create an asset inventory with:
   - file
   - usage
   - current dimensions
   - replacement status
   - fallback behavior
3. Add `art-source/` and the manifest.
4. Integrate approved production assets using existing filenames where possible.
5. Add preload registration only where needed.
6. Ensure missing assets fail gracefully.
7. Replace emoji UI with the approved icon system.
8. Implement reusable visual tokens in CSS custom properties.
9. Improve hierarchy and spacing without changing game rules.
10. Add reduced-motion support for nonessential effects.
11. Optimize PNG/SVG files without visible quality loss.
12. Update service-worker cache version for the release.
13. Rebuild `dist/app.js`.
14. Stage and verify `www/`.

### 10.3 UI requirements

- Minimum interactive target: 44×44 CSS px
- Strong focus-visible state
- Do not rely on color alone
- Text contrast suitable for mobile use
- Thai labels must not clip
- Word plaque must support long pinyin and bilingual meanings
- Keep the primary play action visible on a 360×640 screen
- Battle options remain clearly separated from the background
- Avoid excessive shadows and glow behind text

---

## 11. Performance Budget

Targets for the vertical slice:

- Initial critical art payload: preferably under 1.5 MB compressed
- Individual standard background: preferably under 350 KB
- Individual cat sheet: preferably under 500 KB
- Small icon: preferably under 20 KB
- Avoid loading all shop art before it is needed
- Reuse shared assets
- Do not create large transparent canvases with mostly empty pixels
- Decode images before first animated use where practical

Use PNG for transparent sprite art and WebP/AVIF only where browser/Capacitor support and fallback behavior are confirmed. Preserve safe fallback formats.

---

## 12. QA Matrix

Test at minimum:

| Target | Size |
|---|---|
| Small Android | 360×640 |
| Common Android | 360×800 |
| Modern Android | 412×915 |
| iPhone-like browser | 390×844 |
| Desktop | 1280×800 |

Verify:

- Home screen above the fold
- Safe-area insets
- Portrait scaling
- Landscape does not break catastrophically
- Hanzi and pinyin readability
- Thai line wrapping
- Asset loading under HTTP
- Asset loading under `file://`
- Offline PWA after cache refresh
- Fresh profile
- Existing saved profile
- Low-powered/mobile rendering
- No console errors
- No white transparency halos
- No sprite-frame drift
- No missing icon glyphs

---

## 13. Automated and Manual Validation

Run from `game/`:

```sh
npm ci
npm test
npm run build
npm run serve
npm run cap:sync
```

Codex should also add or update:

- Asset-manifest schema validation test
- Test confirming required production files are registered
- Test confirming sprite-sheet dimensions and frame counts where feasible
- DOM check for required icon references
- Screenshot-based manual checklist stored in `docs/`

Do not create brittle pixel-perfect snapshot tests for painted artwork.

---

## 14. Delivery Phases

### Phase 0 — Audit

Deliver:

- Asset inventory
- Visual debt list
- Screenshot baseline
- Proposed token map
- Folder and manifest scaffolding

### Phase 1 — Style system

Deliver:

- Style guide
- Palette
- Character turnaround/reference
- UI frame kit
- Icon family
- Typography hierarchy
- Approved Night Market look

### Phase 2 — Vertical slice production

Deliver:

- Base cat walk/happy sheets
- Home mascot/portrait
- Home background
- Battle/default or Night Market background
- Core UI frames
- Core icons
- Correct/wrong/critical effects
- Shop preview set

### Phase 3 — Integration

Deliver:

- Runtime wiring
- CSS hierarchy and spacing upgrade
- Fallback verification
- Responsive checks
- Performance optimization
- Tests green

### Phase 4 — Review and release

Deliver:

- Before/after screenshots
- QA checklist
- Service-worker cache bump
- Staged `www/`
- Android sync verification
- Known issues list

---

## 15. Definition of Done

The vertical slice is complete only when:

- [ ] Base cat walk and happy assets are production quality.
- [ ] Home and battle use the approved environment language.
- [ ] Core icons no longer depend on emoji.
- [ ] Hanzi, pinyin, Thai, and English remain readable at target sizes.
- [ ] UI frames support dynamic labels.
- [ ] Correct/wrong/critical feedback is visually distinct.
- [ ] All required filenames are represented in the manifest.
- [ ] Missing images still fall back gracefully.
- [ ] Existing tests pass.
- [ ] Build succeeds.
- [ ] `file://` behavior is preserved.
- [ ] PWA offline behavior is verified after cache bump.
- [ ] Android sync succeeds.
- [ ] Screenshots are captured at all QA sizes.
- [ ] No secrets or signing files are touched.
- [ ] User approves the vertical slice before expansion begins.

---

## 16. Codex Operating Rules

1. Read `CLAUDE.md` before editing.
2. Work inside `game/`.
3. Do not modify vocabulary source data.
4. Do not edit generated deployment folders directly.
5. Keep changes small and reviewable.
6. Prefer stable filenames and replacement over invasive renderer rewrites.
7. Preserve fallbacks until replacement assets are verified.
8. Run tests and build after each integration milestone.
9. Do not fabricate finished art through placeholder gradients and call it production.
10. When an approved image asset is missing, create the integration contract and clearly mark the task blocked by art rather than silently substituting a low-quality asset.
