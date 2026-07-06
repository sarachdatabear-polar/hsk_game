# Lucky Cat HSK — Visual-Exact PRD and Generative Art Specification

**Version:** 1.0  
**Product:** Lucky Cat HSK  
**Primary use:** Build the game UI and generate production-art boards with Fable or GPT-5.5 while staying as close as possible to the three supplied reference images.  
**Reference priority:** Reference 01 (main art plan) → Reference 02 (assets and production plan) → Reference 03 (deliverables board).

> **Non-negotiable instruction to every agent:** Reproduce; do not redesign. Treat the supplied references as the visual source of truth. Preserve hierarchy, panel positions, relative proportions, copy, character styling, materials, lighting, and icon language. Do not introduce modern glassmorphism, neon cyberpunk styling, photorealism, flat corporate vectors, or unrelated Chinese motifs.

---

## 1. Product summary

Lucky Cat HSK is a friendly Chinese-vocabulary arcade game for English- and Thai-speaking learners. The visual identity combines a warm, cheerful educational product with a light action-battle loop. The player studies an HSK word, hears its pronunciation, chooses the correct meaning from four answers, builds a combo, and defeats a cute enemy.

The production milestone represented by the references is **Vertical Slice v1**:

- Home screen
- Battle screen
- Base lucky-cat character
- Core UI system
- Correct, wrong, and critical effects
- Initial forest and village backgrounds

The product must feel:

- **Educational:** Chinese word, pinyin, audio, and translation are always readable.
- **Friendly:** rounded characters, soft materials, warm daylight, no aggressive violence.
- **Focused:** one clear primary action on each screen.
- **Joyful:** expressive cat animation, tactile buttons, rewarding effects.
- **Culturally inspired, not stereotyped:** restrained East Asian village materials and decor; avoid cluttered or costume-heavy clichés.

---

## 2. Technical product context

The active product is a vanilla-JavaScript browser PWA that also ships as an Android app. ES modules are bundled with esbuild, the battle uses a canvas loop, and bundled vocabulary data is exposed through `window.HSK_DATA`. The implementation must preserve direct `file://` operation, local storage namespacing, and the existing build/test workflow.

### 2.1 Implementation constraints

- No framework migration for this milestone.
- Keep the existing HTML/CSS/JavaScript architecture.
- Build responsive portrait mobile screens first.
- Maintain PWA and Capacitor compatibility.
- Do not rely on remote assets or remote fonts for core operation.
- Any image-generation output used in production must be exported as optimized local files.
- After source changes, rebuild the bundled app and run tests.
- User-facing PWA shell changes require a service-worker cache-version bump.

### 2.2 Game data used by the UI

Each vocabulary record must support:

- Hanzi
- Pinyin
- English meaning
- Thai meaning
- HSK level
- Frequency or ranking metadata
- Core/new-word flags
- Test-appearance metadata

---

## 3. Target devices and artboards

### 3.1 Game screens

Design the playable UI on a **1080 × 1920 px portrait artboard** at 3× density, with a safe-area-aware responsive implementation. The visual reference may show slightly different proportions inside the production board; use 9:16 as the canonical runtime target.

Minimum supported CSS viewport: **360 × 640 px**.  
Primary design viewport: **390 × 844 px**.  
Touch target minimum: **44 × 44 CSS px**.

### 3.2 Production-board outputs

Create three presentation boards matching the supplied references:

1. **Main Production Art Plan:** 1920 × 1629 px
2. **Assets Preview and Production Plan:** 1920 × 1500 px
3. **Asset Deliverables Board:** 1920 × 900 px

Use an off-white background, dark-green rounded borders, and a consistent 16–24 px outer margin. All three boards must look like one document set.

---

## 4. Visual identity system

### 4.1 Canonical color palette

These values are sampled/approximated from the supplied reference and should be treated as production tokens:

| Token | Hex | Use |
|---|---:|---|
| Primary Green | `#32775E` | Brand, primary buttons, headers, borders |
| Sky Blue | `#5DAADD` | Secondary actions, sky, selected states |
| Sun Yellow | `#F2BC57` | Start CTA, coins, highlights |
| Coral | `#E69777` | Wrong answer family, warm accents |
| Warm Brown | `#846043` | Wood, outlines, grounded shadows |
| Soft Gray | `#B2AEA9` | Disabled controls, neutral labels |
| Paper Cream | `#FBF5E8` | Global board background, card surfaces |
| Deep Teal | `#1F4D4A` | Bottom navigation, dark UI bars |
| Success Green | `#28723B` | Correct answer button, success effects |
| Error Coral | `#C95A41` | Wrong answer button/effect |
| Light Sand | `#EAC796` | Plaques, neutral answer button |
| Ink | `#2E2A24` | Body copy and high-contrast labels |

**Color rule:** use warm, slightly muted colors. Avoid pure black, pure white, fluorescent saturation, or cold gray UI chrome.

### 4.2 Materials and lighting

- Soft warm daylight from the upper-left.
- Gentle painted texture; polished mobile-game illustration, not flat vector art.
- Materials: paper, carved wood, rope, ceramic, cloth, leafy plants.
- Soft contact shadows beneath characters and raised UI components.
- UI surfaces have subtle beveling and a light inner highlight.
- Gold trim is warm and restrained, never metallic chrome.

### 4.3 Typography

Use a rounded, friendly, highly legible family:

- **Latin display/headings:** Fredoka or Baloo 2, SemiBold/Bold.
- **Latin body/UI:** Nunito Sans or Noto Sans, Medium/SemiBold.
- **Simplified Chinese:** Noto Serif SC Black or a clean Kai-style display font for the large Hanzi; Noto Sans SC for compact UI.
- **Pinyin:** Noto Sans, regular/medium, clear tone marks.
- **Thai:** Noto Sans Thai, medium/semibold.

Typography principles:

- Large Hanzi is the visual focus of the vocabulary plaque.
- Pinyin is smaller and placed directly above Hanzi.
- Thai/English meaning is placed below Hanzi.
- No tiny text inside essential controls.
- All multilingual copy must be proofread after image generation.
- For exact production rendering, overlay text programmatically rather than trusting an image model to draw small multilingual text.

### 4.4 Shape language

- Rounded rectangles with clipped or ornamental corners.
- 12–24 px corner radius on large cards.
- Thick, friendly outlines with consistent weight.
- Buttons appear tactile: top highlight, dark lower edge, soft drop shadow.
- Icons use rounded silhouettes and consistent stroke/weight.
- Panels feel like cream paper mounted inside a green-edged presentation board.

---

## 5. Character art direction

### 5.1 Base lucky cat

The protagonist is a chibi calico cat:

- Cream-white fur
- Orange patch over the upper-right side of the head and one ear
- Orange tail accents
- Small black eyes that curve when smiling
- Pink nose and blush cheeks
- Round head, short limbs, large paws
- Red Chinese-style vest or tunic with warm-brown pants/boots
- Gold medallion or bell at the chest
- Friendly, confident, never aggressive

Proportions:

- Head approximately 45–50% of total character height.
- Body compact and pear-shaped.
- Paws oversized enough to read at mobile scale.
- Silhouette must remain recognizable at 64 px high.

### 5.2 Home-screen cat

- Seated on a small dark wooden platform.
- Holding an open green book.
- Eyes closed in a calm smile.
- Centered on the lower-middle of the home background.
- Occupies roughly 35–40% of the screen width.

### 5.3 Battle cat

- Wears a red headband and short red adventurer outfit.
- Holds a small green book in one paw and a short teaching pointer/staff in the other.
- Faces right toward the enemy.
- Expression is excited and determined, not angry.

### 5.4 Enemy

- Cute gray raccoon/ninja opponent.
- Dark charcoal outfit, blue-gray headband, short staff.
- Faces left.
- Readable as an opponent but still toy-like and non-threatening.
- Enemy health bar floats above the enemy.

### 5.5 Animation deliverables

- `cat-walk.png`: 6 horizontal frames, 256 × 256 px each, transparent background; full sheet 1536 × 256 px.
- `cat-happy.png`: 4 horizontal frames, 256 × 256 px each, transparent background; full sheet 1024 × 256 px.
- Keep a stable foot baseline and character center across frames.
- No frame-to-frame costume, color, or face drift.

---

## 6. Runtime screen specification

## 6.1 Home screen

### Purpose

Provide a welcoming overview and one dominant entry into play.

### Layout from top to bottom

1. **Top status strip, 8–10% height**
   - Left: small cat avatar, `Lv. 12`, compact progress bar.
   - Center/right: coin count `2,450`, blue-gem count `120`.
   - Far right: circular settings gear.
   - Status elements use blue/teal capsules with gold and cream accents.

2. **Brand title, 10–14% height**
   - `LUCKY CAT` in warm yellow.
   - `HSK` very large beneath it, cream/yellow with brown shadow.
   - Small paw-print accent after HSK.

3. **Hero character area, 34–38% height**
   - Reading cat centered on village path.
   - Bright blue sky and warm village houses frame the character.
   - Keep the face unobstructed.

4. **Study streak card, 7–9% height**
   - Cream paper plaque.
   - Fire icon and `Study Streak` on left.
   - `7 days` on right.
   - Green-to-gold progress bar below.

5. **Primary CTA, 8–10% height**
   - Large yellow button labeled `START`.
   - Strongest contrast and visual weight on the screen.

6. **Secondary actions, 7–9% height**
   - Two cream buttons: `Flashcards` and `Shop`.
   - Small matching icons.

7. **Bottom navigation, 8–10% height**
   - Deep-teal rounded bar.
   - Five destinations: `Home`, `Street`, `Progress`, `Quests`, `More`.
   - Home selected in warm yellow/cream.

### Background

- `bg-home.png`, 1080 × 1920 px.
- Cheerful daylight village, central path, low fences, small East Asian rooflines, foliage, mountains, and clouds.
- Keep the center clear behind the cat and title.

### Interactions

- START launches a battle session.
- Flashcards opens study mode.
- Shop opens cosmetic/shop screen.
- Bottom navigation changes top-level section.
- Resource values animate subtly when changed.

---

## 6.2 Battle screen

### Purpose

Present one vocabulary question at a time and combine learning feedback with a simple battle metaphor.

### Layout from top to bottom

1. **Battle HUD, 7–9% height**
   - Left: three red hearts.
   - Center: `Round 5/10` inside a blue header capsule.
   - Right: coin count `1,250` and circular pause button.

2. **Battlefield, 32–38% height**
   - Forest path background.
   - Player character on lower-left, enemy on lower-right.
   - Enemy health bar above enemy, showing `320`.
   - Characters must not overlap the word plaque.

3. **Vocabulary plaque, 20–23% height**
   - Large warm-cream paper plaque with ornamental gold/brown border.
   - Pinyin: `xué  xí`.
   - Hanzi: `学习` in large black calligraphic type.
   - Speaker icon on the right.
   - Thai meaning below: `เรียนรู้`.
   - Exact order: pinyin → Hanzi → translation.

4. **Answer grid, 19–22% height**
   - 2 × 2 buttons with equal dimensions and consistent gaps.
   - Top-left green: `เรียนรู้`.
   - Top-right coral: `ทำงาน`.
   - Bottom-left blue: `หนังสือ`.
   - Bottom-right cream: `อาหาร`.
   - Text centered, large, and readable.

5. **Combo strip, 5–7% height**
   - Left: `COMBO 12`.
   - Center: row of small fire indicators.
   - Far right: circular `x2` multiplier badge.

### Battle rules

- Session contains 10 rounds by default.
- Player starts with 3 hearts.
- Each round shows one target word and four answer choices.
- One correct answer and three distractors.
- Tapping the speaker plays prerecorded Mandarin audio; fall back to TTS when audio is unavailable.
- Correct answer:
  - Green paw effect.
  - Positive sound/haptic.
  - Combo increments.
  - Damage applied to enemy.
- Wrong answer:
  - Coral/red paw effect.
  - Lose one heart or apply configured penalty.
  - Combo resets or decreases.
- Critical answer:
  - Yellow/orange comic burst reading `CRITICAL!`.
  - Triggered by the scoring/combo rule, not randomly unless the existing logic specifies randomness.
- Word mastery is streak-based; three successful answers may mark a word as mastered in the existing model.
- Distractors should be plausible words near the target in the frequency-sorted pool and must not share the same meaning.

### Background

- `bg-battle.png`, 1024 × 512 px, or a larger 2× source with the same ratio.
- Forest clearing/path, bright daylight, layered trees, rocks, and a clear center lane.
- Painterly mobile-game style with depth but no excessive detail behind characters.

---

## 7. Core UI component specification

### 7.1 Plaques and panels

- Cream paper fill.
- Double border: outer warm-brown/gold, inner highlight.
- Decorative clipped corners.
- Soft shadow offset downward.
- Must stretch using 9-slice scaling without distorting corners.

### 7.2 Buttons

**Primary button**

- Green or yellow based on hierarchy.
- Gold/brown border.
- Bright top highlight and darker base edge.
- White or dark-brown bold text depending on fill.

**Secondary button**

- Sky-blue or cream.
- Same geometry as primary but reduced visual weight.

**Disabled button**

- Soft gray fill.
- Reduced saturation and contrast.
- No glow.

**Answer-state colors**

- Correct: success green.
- Incorrect: coral/red.
- Neutral alternatives: sky blue and warm cream.

### 7.3 Icons

Required icon family:

- Heart
- Coin
- Speaker
- Pause
- Play
- Controller/game
- Upload/download where needed
- Minus
- Checklist/document
- Home
- Book
- Group/community
- Gear
- Anchor/pin
- Gift
- Shop bag
- Paw badge

Icons must be simple, rounded, filled or semi-filled, with a consistent visual weight. Use dark charcoal for utility icons and warm brand colors for status icons.

### 7.4 Feedback effects

- **Correct:** green paw, cream/gold border, four-point sparkles.
- **Wrong:** coral/red paw, orange/red sparkles.
- **Critical:** yellow/orange starburst, bold brown/orange `CRITICAL!` lettering, comic impact lines.
- Effects must read instantly at 96–160 px.
- Export with transparent backgrounds.

---

## 8. Production-board layout specification

## 8.1 Board A — Main Production Art Plan, 1920 × 1629

### Global composition

- Background: paper cream.
- Outer rounded border: primary green, 3–4 px.
- Header occupies approximately top 18%.
- Main content occupies remaining 82%.

### Header regions

- **Left 25%:** Lucky Cat HSK logo with seated reading cat; tagline `Learn • Play • Grow`.
- **Center 55%:** title `Lucky Cat HSK – Production Art Plan`; subtitle `Educational • Friendly • Focused`; four-step roadmap with small icons:
  1. `Style Bible` / `Set direction & rules`
  2. `Vertical Slice` / `Build & validate`
  3. `Expand` / `Produce full set`
  4. `Polish & Ship` / `Optimize & release`
- **Right 20%:** dark-green milestone card:
  - `OUR FIRST MILESTONE`
  - `Vertical Slice v1`
  - `✓ Home + Battle`
  - `✓ Base Cat`
  - `✓ Core UI + Effects`

### Main content columns

- **Left column, 25% width:** `1. STYLE BIBLE (OVERVIEW)`.
- **Center column, 58% width:** `2. VERTICAL SLICE v1 – FIRST COMPLETE LOOK`.
- **Right column, 17% width:** `EFFECTS (NEW)`.

### Left-column order

1. Color palette circles and labels.
2. Light & material swatches: Soft Light, Wood, Paper, Plants, Rope.
3. Character style examples and the copy: `Round shapes, clean silhouette, expressive and friendly.`
4. Typography examples: Hanzi, pinyin, Thai.
5. UI style examples and the copy: `Rounded panels, soft shadows, clear hierarchy, high contrast.`
6. Icon style row and the copy: `Simple, friendly, consistent weight.`

### Center-column layout

- Label `HOME SCREEN` above the left phone mockup.
- Label `BATTLE SCREEN` above the right phone mockup.
- Home mockup uses about 40% of center-column width.
- Battle mockup uses about 60% of center-column width.
- Both align at the same top and bottom.

### Right-column effects

Three stacked rounded cream cards:

1. `CORRECT` with green paw.
2. `WRONG` with coral paw.
3. `CRITICAL` with yellow/orange burst.

---

## 8.2 Board B — Assets Preview and Production Plan, 1920 × 1500

### Row 1: `3. ASSETS PREVIEW (FIRST SET)`, about 35% height

- Left 29%: base cat walk sheet and happy animation.
- Middle 37%: large forest battle background.
- Right 34%: UI elements:
  - Primary, secondary, disabled buttons
  - Empty plaque
  - Word plaque with `xué  xí`, `学习`, speaker icon, `เรียนรู้`
  - `HSK 2` tag
  - Paw badge
  - Progress bar at `75%`

### Row 2: `4. EXPANSION PLAN (AFTER SLICE APPROVAL)`, about 31% height

Seven evenly spaced content groups:

1. Cat skins — four variants.
2. Boss cat — one armored boss.
3. Backgrounds — night market, bamboo forest, temple/village.
4. Effects — green, red, blue, and gold VFX orbs.
5. Street decor — gate, lantern, tree, bench, shrine, fountain.
6. Shop items — scroll, chest, cosmetic/background cards.
7. Marketing — app icon and mobile screenshot.

### Row 3: production controls, about 34% height

Four bordered columns:

1. `5. PRODUCTION PIPELINE`
   - Audit & Plan
   - Concept & Style
   - Produce
   - Integrate
   - Review & Polish
   - Ship

2. `6. TECHNICAL SPECS (KEEPING OUR CONTRACT)`
   - Walk sheet: 6 frames horizontal, 256 × 256 each
   - Happy sheet: 4 frames horizontal, 256 × 256 each
   - Background: 1024 × 512 or 1080 × 1920 for home
   - PNG with transparent background where applicable
   - Keep current filenames when possible
   - Update sprites only for new assets
   - Run build after replacement
   - Show source structure: `art-source/` → `assets/`

3. `7. QUALITY GATES (EVERY ASSET)`
   - Visual consistency
   - Technical correctness
   - Mobile readability
   - Performance

4. `8. ASSET TRACKER (EXAMPLE)`
   - Table columns: Asset, Status, Notes
   - Integrated rows in green
   - In Progress row in orange
   - Concept rows in blue

---

## 8.3 Board C — Asset Deliverables, 1920 × 900

### Top grid, about 78% height

Header: `9. ASSET DELIVERABLES (FIRST SET)`.

Each asset cell has a dark-green title strip, cream body, rounded border, and centered preview.

Required cells and labels:

- `cat-walk.png (6 frames)`
- `cat-happy.png (4 frames)`
- `maneki.png`
- `cat-portrait.png`
- `bg-home.png (1080×1920)`
- `bg-battle.png (1024×512)`
- `bg-market.png (1024×512)`
- `ui-panel.png`
- `ui-word-plaque.png`
- `ui-button-primary.png`
- `ui-button-secondary.png`
- `fx-button-correct.png`
- `ui-badge.png`
- `ui-icons.svg (sample)`

> The supplied reference appears to repeat a paw effect under a secondary-button label. For production, use a true secondary-button preview in that slot and keep the paw effect under its own effect filename.

### Bottom goal strip, about 22% height

- Left: reading cat illustration.
- Title: `OUR GOAL`.
- Body: `A beautiful, consistent and joyful world that makes learning Chinese addictive and makes players proud to play every day.`
- Right sequence:
  - Book icon + `LEARN`
  - Controller icon + `PLAY`
  - Plant icon + `GROW`
  - Waving cat icon + `LOVE`

---

## 9. Asset inventory and export contract

| Filename | Dimensions | Format | Alpha | Notes |
|---|---:|---|---|---|
| `cat-walk.png` | 1536 × 256 | PNG | Yes | 6 × 256 px frames |
| `cat-happy.png` | 1024 × 256 | PNG | Yes | 4 × 256 px frames |
| `maneki.png` | 512 × 512 min | PNG | Yes | Seated lucky cat with raised paw |
| `cat-portrait.png` | 512 × 512 min | PNG | Yes | Head/shoulders portrait |
| `bg-home.png` | 1080 × 1920 | PNG/WebP | No | Portrait village scene |
| `bg-battle.png` | 1024 × 512 | PNG/WebP | No | Forest battle scene |
| `bg-market.png` | 1024 × 512 | PNG/WebP | No | Night market scene |
| `ui-panel.png` | scalable source + PNG | PNG | Yes | 9-slice compatible |
| `ui-word-plaque.png` | scalable source + PNG | PNG | Yes | Empty plaque; text rendered in app |
| `ui-button-primary.png` | scalable source + PNG | PNG | Yes | 9-slice compatible |
| `ui-button-secondary.png` | scalable source + PNG | PNG | Yes | 9-slice compatible |
| `fx-correct.png` | 512 × 512 | PNG | Yes | Green paw and sparkles |
| `fx-wrong.png` | 512 × 512 | PNG | Yes | Coral paw and sparkles |
| `fx-critical.png` | 1024 × 1024 | PNG | Yes | Comic burst |
| `ui-badge.png` | 256 × 256 | PNG | Yes | Paw badge |
| `ui-icons.svg` | vector | SVG | Yes | Unified icon family |

Export rules:

- Trim transparent bounds only when runtime anchors remain stable.
- Use premultiplied-alpha-safe edges.
- No white matte around transparent assets.
- Keep sprite-frame dimensions identical.
- Use lossless PNG for sprites/UI; use optimized WebP/PNG for backgrounds as supported.
- Retain a layered master source for every asset.
- Filenames are lowercase kebab-case.

---

## 10. Responsive behavior

- Preserve the hierarchy rather than absolute pixel positions.
- Use safe-area insets for top and bottom controls.
- Keep the vocabulary plaque and answer grid fully visible without scrolling during battle.
- On short screens, reduce battlefield height before reducing answer-button height.
- Large Hanzi must never be smaller than approximately 56 CSS px at the 390 px design viewport.
- Answer text must remain at least 20 CSS px at the design viewport.
- Prevent background focal points from being hidden by aspect-ratio cropping.

---

## 11. Accessibility and localization

- Minimum 4.5:1 contrast for essential text where practical.
- Do not communicate correct/wrong state by color alone; combine color, icon, animation, sound, and text.
- Speaker button requires an accessible label.
- Respect reduced-motion preferences by shortening impact animations.
- All strings must support English and Thai UI modes while the studied word remains Chinese.
- Use Unicode-safe storage and rendering.
- Preserve pinyin tone marks.
- Avoid baked-in text in reusable panels/buttons; render copy in the application.

---

## 12. Acceptance criteria

### Visual acceptance

- Overall composition is recognizably the supplied Lucky Cat HSK reference at first glance.
- Character shape, calico markings, costume, and facial expression are consistent across all assets.
- Home and battle screens preserve the same information hierarchy and main controls.
- Colors stay within the warm green/blue/yellow/coral/cream palette.
- UI uses rounded paper/wood forms rather than generic flat rectangles.
- Multilingual copy is legible and correctly spelled.
- No unintended photorealism, anime-human proportions, 3D plastic rendering, or neon UI.

### Functional acceptance

- Home → Start → Battle flow works.
- Battle displays one word and four answers.
- Audio playback has a local-file-safe fallback.
- Correct, wrong, combo, and critical feedback can be triggered.
- Hearts, round counter, score/coin, enemy HP, and pause state update correctly.
- Mastery and distractor logic remain compatible with existing modules.
- App works under PWA hosting, Capacitor, and direct file opening.

### Technical acceptance

- `npm test` passes.
- `npm run build` succeeds.
- Generated production assets are optimized and referenced locally.
- Service-worker shell cache is bumped for user-facing shell changes.
- No new runtime dependency is introduced without explicit approval.

---

## 13. Negative prompt / forbidden drift

Do not generate:

- Photorealistic cats or realistic animal anatomy
- Thin minimalist line art
- Flat Material Design cards
- Glassmorphism or frosted translucent panels
- Purple/cyan neon, sci-fi, cyberpunk, or dark horror themes
- Hyper-detailed wuxia armor on the base cat
- Human characters replacing cats
- Random Japanese text, kanji substitutions, or incorrect Chinese characters
- Illegible pseudo-text in prominent labels
- Overcrowded backgrounds behind the word plaque
- Sharp square corners
- Metallic gradients, chrome, or excessive bloom
- Excessive red/gold festival decoration
- Weapons that make the game feel violent
- Different cat markings from frame to frame

---

## 14. Recommended generation workflow

For the closest result, use a controlled three-pass workflow:

1. **Composition pass**
   - Generate the full board using the references.
   - Prioritize panel geometry, character placement, color blocks, and screen hierarchy.

2. **Asset pass**
   - Generate each character, background, button, plaque, and effect separately at production resolution.
   - Lock the same seed/reference character sheet where the tool supports it.

3. **Deterministic typography pass**
   - Replace generated small text with HTML/CSS, Figma text layers, or another deterministic renderer.
   - Use the exact copy deck supplied with this PRD.

A single image-model pass can closely match the art direction, but exact multilingual text and pixel-accurate UI should be composited programmatically.

---

## 15. Copy deck

### Brand and plan

- `LUCKY CAT HSK`
- `Learn • Play • Grow`
- `Lucky Cat HSK – Production Art Plan`
- `Educational • Friendly • Focused`
- `OUR FIRST MILESTONE`
- `Vertical Slice v1`
- `Home + Battle`
- `Base Cat`
- `Core UI + Effects`

### Home

- `Lv. 12`
- `2,450`
- `120`
- `LUCKY CAT`
- `HSK`
- `Study Streak`
- `7 days`
- `START`
- `Flashcards`
- `Shop`
- `Home`
- `Street`
- `Progress`
- `Quests`
- `More`

### Battle

- `Round 5/10`
- `1,250`
- `320`
- `xué  xí`
- `学习`
- `เรียนรู้`
- `ทำงาน`
- `หนังสือ`
- `อาหาร`
- `COMBO 12`
- `x2`
- `CORRECT`
- `WRONG`
- `CRITICAL`
- `CRITICAL!`

### Goal strip

- `OUR GOAL`
- `A beautiful, consistent and joyful world that makes learning Chinese addictive and makes players proud to play every day.`
- `LEARN`
- `PLAY`
- `GROW`
- `LOVE`

---

## 16. Master instruction to an implementation agent

Build Lucky Cat HSK as an incremental visual replacement of the existing game, not as a greenfield rewrite. First inspect the current home, flashcard, scope, and canvas-battle code. Map each reference component to the existing DOM/canvas structure. Implement reusable CSS tokens and 9-slice-like components, then replace art assets one group at a time. Preserve existing game logic, vocabulary data, audio fallback, mastery, scoring, distractor behavior, local-storage keys, PWA operation, and Android compatibility. Add focused tests only where logic changes. Run the test suite and build after each integrated slice. Do not consider the work complete until the runtime home and battle screens match the supplied reference hierarchy and the generated asset boards pass the visual acceptance criteria above.
