# ART-PRODUCTION-ORDER — DETAILED
## Lucky Cat HSK — Education-First Visual Redesign v1

**Purpose:** Define every production asset in enough detail that Codex, an artist, or an image-generation workflow can create and integrate consistent runtime-ready files.

---

## 0. How to use this document

This is the source of truth for production artwork. For each asset, follow the exact filename, purpose, dimensions, required objects, composition, palette, lighting, restrictions, and export rules.

The reference board is for style direction only. Do not crop assets from it or treat it as runtime art.

---

## 1. Global visual direction

### Product feeling

The game should feel educational, warm, playful, calm, encouraging, progress-focused, and storybook-like. It must not feel like gambling, betting, jackpot rewards, a luxury casino, aggressive combat, or high-pressure monetization.

### Palette

| Role | Hex | Use |
|---|---:|---|
| Warm paper | `#FFF8E8` | Main learning cards |
| Coral red | `#E65A4F` | Primary action |
| Soft jade | `#4FAE8A` | Correct/positive states |
| Sky blue | `#6EB6E8` | Secondary navigation |
| Sun yellow | `#F5C85B` | Gentle highlights |
| Ink navy | `#243447` | Text and dark UI |
| Plum | `#7B5B8E` | Review/mastery |
| Soft gray | `#E7E2D9` | Dividers/disabled |
| Leaf green | `#78B86B` | Progress/growth |
| Warm brown | `#7A5A44` | Outlines/details |

Gold may appear only as a small accent.

### Shape language

Use rounded corners, friendly silhouettes, medium-weight outlines, soft cel shading, notebook and paper motifs, subtle depth, and low visual noise.

Avoid metallic bevels, heavy black-and-gold frames, casino gloss, neon glow, aggressive spikes, and jackpot-like effects.

### Lighting

Use soft daylight, warm study-room light, gentle lantern glow, and an upper-left key light. Keep contrast low behind dynamic text.

### Cultural motifs

Preferred motifs include books, flashcards, bookmarks, paper slips, tiled roofs, paper lanterns, ink-brush details, study desks, plants, and library shelves.

Avoid casino chips, money bags as the main hero object, oversized gold medallions, slot-machine symbols, and weapons.

---

## 2. Base character bible

The base Lucky Cat has white/cream fur, light orange patches on the ears, forehead, and tail, a rounded face, a small coral-pink nose, soft curved eyes in positive states, pink paw pads, and a simple red scarf or red study vest.

### Proportions

- Large head
- Compact rounded torso
- Short limbs
- Rounded paws
- Visible expressive tail
- Upright medium-large ears
- Stable silhouette across all poses

### Expression system

- Study: focused, calm, curious
- Guide: helpful and encouraging
- Happy: cheerful and proud
- Thinking: reflective, never sad
- Celebrate: joyful but controlled

### Forbidden cues

Do not use a giant money bag, casino chip, crown and aura as the default look, combat stance, weapons, aggressive expressions, or oversized wealth symbols.

---

## 3. Production order

1. `cat-study.png`
2. `cat-walk.png`
3. `cat-happy.png`
4. `cat-portrait.png`
5. `cat-guide.png`
6. `cat-thinking.png`
7. `cat-celebrate.png`
8. `maneki.png`
9. `bg-home.png`
10. `bg-quest.png`
11. `bg-flashcards.png`
12. `bg-results.png`
13. `bg-progress.png`
14. `bg-collection.png`
15. UI cards and buttons
16. Progress and mastery components
17. `ui-icons.svg`
18. Feedback effects
19. Secondary skins and expansion assets

Approve each dependent asset before moving to the next group.

---

# 4. Character assets

## 4.1 `cat-study.png`

**Purpose:** Primary education-first mascot for Home, Learn, and Flashcards.

**Canvas:** 512×512 transparent PNG.

**Subject:** A friendly white-and-orange Lucky Cat sitting with an open Chinese vocabulary book.

**Required details:**

- White/cream fur
- Orange patch on forehead, one ear, and tail
- Simple coral-red scarf
- Small jade bookmark visible in the book
- Open book held in the front paws or resting on the lap
- One or two subtle paper tabs
- Calm smile and upright ears
- Tail curling gently behind the body

**Book design:** Warm cream pages, soft jade or coral cover, abstract brush-like learning marks only, no readable text, no incorrect Chinese characters, and no treasure-like gold treatment.

**Pose:** Front-facing or slight three-quarter seated pose, head slightly tilted toward the viewer, paws naturally supporting the book, both feet visible.

**Composition:** Character occupies 72–78% of the canvas height, with at least 30 px transparent padding around ears, paws, and tail. The face must read clearly at 64 px.

**Lighting:** Soft upper-left daylight, warm chin/book shadow, subtle jade reflected accent, no metallic glow.

**Mood:** “Let’s learn together.” Safe, curious, trustworthy.

**Avoid:** Money bag, giant gold charm, casino glow, raised fortune paw as the dominant gesture, ornate costume, background scenery, baked-in text.

**Export:** True alpha, no checkerboard, no white fringe, sRGB, optimized PNG, clean silhouette.

---

## 4.2 `cat-walk.png`

**Purpose:** Main walk cycle for Word Quest and movement.

**Canvas:** 1536×256, six horizontal 256×256 cells, transparent PNG.

**Continuity:** Must match `cat-study.png` exactly in face, fur markings, scarf, proportions, colors, line style, and shading.

**Prop:** A small closed jade book or flashcard pouch. Keep it visually secondary.

**Frames:**

1. Left-foot contact
2. Passing pose
3. Up/neutral pose
4. Right-foot contact
5. Passing pose
6. Recovery/loop pose

**Motion rules:** Subtle body bob, stable head, slight scarf bounce, gentle tail swing, prop stays attached.

**Alignment:** Same foot baseline and center in all cells, no crop, no scale shift, no perspective drift.

**Avoid:** Running, marching, combat stance, inconsistent face, costume changes, labels, guides, checkerboard.

**Export:** Exact dimensions, no gap between cells, transparent PNG.

---

## 4.3 `cat-happy.png`

**Purpose:** Success, encouragement, idle, and Results animation.

**Canvas:** 1024×256, four horizontal 256×256 cells, transparent PNG.

**Frames:**

1. Calm happy pose
2. Slight upward bounce
3. Raised paw or proud book pose
4. Settle pose

**Required details:** Same base cat, red scarf, small book or flashcard, clear smile. Detached sparkles should be minimal because effects are separate assets.

**Mood:** “Great job.” Proud, supportive, warm.

**Avoid:** Jackpot pose, giant trophy, explosive effects, money rain, heavy gold confetti.

---

## 4.4 `cat-portrait.png`

**Purpose:** Profile, Home identity, HUD portrait, and Collection preview.

**Canvas:** 512×512 transparent PNG.

**Composition:** Head-and-upper-body portrait. Face occupies 55–65% of canvas. Ears and scarf visible. Optional small book edge in a lower corner.

**Mood:** Reassuring, bright, approachable.

**Avoid:** Full-body tiny figure, circular frame baked in, excessive props, dramatic lighting.

---

## 4.5 `cat-guide.png`

**Purpose:** Onboarding, hints, lesson guidance.

**Canvas:** 512×512 transparent PNG.

**Subject and objects:** Same cat holding one flashcard, small pointer, clipboard, or open book.

**Pose:** One paw pointing, body in slight three-quarter angle, face toward viewer.

**Mood:** Patient, helpful, encouraging.

**Avoid:** Stern teacher expression, commanding stance, battle-command energy.

---

## 4.6 `cat-thinking.png`

**Purpose:** Mistakes, difficult words, review prompts.

**Canvas:** 512×512 transparent PNG.

**Required object:** Flashcard or pencil.

**Pose:** Paw lightly touching chin; eyes looking at the card or upward; relaxed tail; optional subtle question-note sparkle.

**Mood:** Curious and supportive: “Let’s try again.”

**Avoid:** Sadness, crying, shame, punishment, failure symbolism.

---

## 4.7 `cat-celebrate.png`

**Purpose:** Daily goal, mastery, level-up, and Results celebration.

**Canvas:** 512×512 transparent PNG.

**Pose:** Both paws slightly raised or one paw holding a small mastery badge. Optional paper stars.

**Props:** Book, ribbon, mastery badge, bookmark, paper star.

**Avoid:** Casino jackpot, money rain, trophy pile, fireworks wall, oversized crown.

---

## 4.8 `maneki.png`

**Purpose:** Brand mascot, splash, icon support.

**Canvas:** 512×512 transparent PNG.

**Design:** Simplified iconic version of the same cat with one educational prop and a strong silhouette at 48 px.

**Avoid:** Inconsistent face, fortune-shop-only identity, giant gold coin as the sole concept.

---

# 5. Background assets

## 5.1 `bg-home.png`

**Purpose:** Main Home screen.

**Canvas:** 1080×1920 portrait PNG.

**Environment:** A cozy Chinese-learning room opening onto a sunny storybook neighborhood.

**Required objects:** Small bookshelf, low study desk, vocabulary cards, pencil cup, paper lantern, jade-green plant, soft window or doorway, subtle tiled roofs outside, lesson board with abstract marks only, reading cushion.

**Composition:** Calm center for mascot and CTA, open top area for status/title, lower third clear for large actions, detail concentrated at edges.

**Lighting:** Warm morning/daylight from upper-left with gentle room fill.

**Avoid:** Casino lounge, luxury black/gold interior, cash counter, coin wall, shop storefront, readable signs, baked-in UI.

---

## 5.2 `bg-quest.png`

**Purpose:** Word Quest challenge environment.

**Canvas:** 1024×512 landscape PNG.

**Environment:** Peaceful storybook learning path through a Chinese neighborhood.

**Required objects:** Stone or dirt path, trees/shrubs, tiled roofs, small library or study pavilion, paper lanterns, abstract signboards, distant mountains or layered village depth.

**Composition:** Lower-middle supports characters; center-upper stays calm behind vocabulary; details live near edges; no bright light behind Hanzi.

**Lighting:** Soft late afternoon or gentle dusk, blue-green ambience, warm lantern accents.

**Avoid:** Combat arena, threatening battlefield, casino-night street, neon signs, readable Chinese text.

---

## 5.3 `bg-flashcards.png`

**Purpose:** Flashcard mode.

**Canvas:** 1080×1920 portrait PNG.

**Environment:** Quiet library or study-desk corner.

**Required objects:** Book stack, pencil cup, card stack, bookmark, desk lamp, small plant, shelf edge, window or curtain.

**Composition:** Very quiet center; details stay near edges.

**Lighting:** Soft neutral daylight or warm lamp light.

**Mood:** Calm focus and low pressure.

---

## 5.4 `bg-results.png`

**Purpose:** Session Results.

**Canvas:** 1080×1920 portrait PNG.

**Environment:** Soft celebratory learning space.

**Required objects:** Paper stars, ribbons, open book, mastery badges, paper-slip confetti, plant or shelf detail.

**Composition:** Large open center; celebration near top corners and edges.

**Avoid:** Jackpot energy, explosions, money rain, giant trophy, black/gold winner screen.

---

## 5.5 `bg-progress.png`

**Purpose:** Progress and mastery screen.

**Canvas:** 1080×1920 portrait PNG.

**Environment:** Learning garden and journey path.

**Required objects:** Stepping stones, book-shaped markers, flowers/leaves, path posts, abstract HSK milestone plaques, tiny reading pavilion.

**Mood:** Growth, long-term progress, calm achievement.

---

## 5.6 `bg-collection.png`

**Purpose:** Collection/customization screen.

**Canvas:** 1080×1920 portrait PNG.

**Environment:** Friendly wardrobe and study-accessory room.

**Required objects:** Shelves, scarf hooks, badges, book covers, décor, folded fabrics, framed scene previews.

**Avoid:** Luxury boutique, casino shop, high-pressure purchase environment.

---

# 6. UI surfaces

## 6.1 `ui-card-paper.png`

Primary learning card. Warm cream paper, rounded rectangle, warm-brown outline, subtle corner motif, gentle shadow, clean center. Used for vocabulary, flashcards, results, and lesson cards. No text or metallic frame.

## 6.2 `ui-card-soft.png`

Secondary panel. Pale jade, pale blue, or soft beige; rounded corners; thin border; lower contrast than the primary card.

## 6.3 `ui-button-primary.png`

Main CTA. Coral red, rounded rectangle, soft warm shadow, subtle cream or sun-yellow edge, generous internal padding. No casino gloss or thick gold border.

## 6.4 `ui-button-secondary.png`

Secondary action. Jade or sky blue, same geometry as primary, soft shadow, clean interior.

## 6.5 `ui-button-neutral.png`

Less important action. Warm gray or paper neutral with ink-blue text area and light border.

## 6.6 `ui-tab.png`

Notebook-style tab with rounded top corners, paper or soft-color fill, optional tiny bookmark notch.

## 6.7 `ui-badge-mastery.png`

Small circular or rounded-shield badge using a leaf + star + book motif. Jade with sun-yellow accent. Must read around 20 px. Do not resemble a coin or military medal.

## 6.8 `ui-progress-track.png`

Rounded pill, soft neutral fill, warm outline, clean inner channel.

## 6.9 `ui-progress-fill.png`

Jade or leaf-green fill with subtle soft gradient and rounded end. No gloss.

## 6.10 `ui-stamp-correct.png`

Paw/check/bookmark stamp in jade and coral ink style, slightly imperfect paper-stamp edge, transparent background.

## 6.11 `ui-divider.png`

Subtle divider line with a small leaf, bookmark, or knot motif at center. Low contrast.

---

# 7. Icon family — `ui-icons.svg`

**Format:** One SVG symbol sprite preferred.

**Required icons:** home, learn, quest, review, flashcards, audio, muted, progress, collection, settings, streak, calendar, focus-heart, star, mastery, book, pencil, headphones, check, retry, back, close, pause, play, next, previous, coin-secondary.

**Style:** Rounded, friendly, medium stroke, consistent optical size, simple internal detail, readable at 18–24 px, `currentColor` compatible where practical.

**Avoid:** Emoji, casino chips, swords, weapons, harsh thin-line icons, inconsistent stroke weights.

---

# 8. Feedback effects

## 8.1 `fx-correct.png`

Jade paw or check with 4–8 soft stars, tiny paper sparkles, and optional stamp ring. Clear, encouraging, light. No explosion, jackpot burst, or fire.

## 8.2 `fx-perfect.png`

Sun-yellow and jade star burst with small bookmarks or paper rays. Balanced radial composition. No comic explosion, “BIG WIN,” or casino typography.

## 8.3 `fx-retry.png`

Soft coral ripple, curved retry arrow, small wobble ring, one or two paper fragments. Supportive, calm, non-punitive. No harsh red failure explosion.

## 8.4 `fx-mastery.png`

Blooming leaf/star/book badge in jade and sun-yellow, gentle upward motion, optional bookmark ribbon.

## 8.5 `fx-level-up.png`

Books, paper stars, bookmarks, and soft confetti moving upward. No money imagery.

## 8.6 `fx-daily-goal.png`

Calendar/check symbol, small leaves, soft stars, subtle circular glow. Communicates habit success.

---

# 9. Terminology mapping

| Old term | Education-first term |
|---|---|
| Battle | Word Quest |
| Combo | Learning Streak |
| Critical | Perfect |
| Lives | Focus Hearts |
| Shop | Collection |
| Boss | Review Challenge |
| Fight Misses | Practice Missed Words |
| High Score | Best Session |

All assets should reinforce the education-first language.

---

# 10. Technical integration requirements

## Runtime folder

```text
game/assets/
```

## Source art folder

```text
game/art-source/education-v1/
```

## Codex rules

- Integrate only approved assets
- Preserve existing fallbacks
- Keep dynamic text outside images
- Preserve direct `file://` behavior
- Preserve `nbhsk.*` saves
- Do not edit generated vocabulary outputs
- Run `npm test`
- Run `npm run build`
- Bump the service-worker cache for release
- Do not touch signing secrets

## Export rules

- sRGB
- Optimized PNG or SVG
- Transparent background where specified
- No painted checkerboard
- No baked-in dynamic labels
- Exact dimensions
- Clean alpha edges
- No unnecessary empty canvas

---

# 11. Review checklist

Before marking an asset approved:

- [ ] Matches the education-first reference
- [ ] Uses the correct palette
- [ ] Does not resemble gambling/casino art
- [ ] Reads clearly at the intended size
- [ ] Has clean edges and transparency
- [ ] Contains no incorrect Chinese text
- [ ] Contains no baked-in dynamic UI text
- [ ] Uses consistent character proportions
- [ ] Uses consistent lighting
- [ ] Meets exact dimensions
- [ ] Uses the correct filename
- [ ] Is listed in the asset manifest
