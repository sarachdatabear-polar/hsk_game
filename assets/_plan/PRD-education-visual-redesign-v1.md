# PRD — Lucky Cat HSK Education-First Visual Redesign v1

**Status:** Ready for Codex implementation
**Project:** Lucky Cat HSK
**Primary target:** `game/`
**Milestone:** Education-First Visual Vertical Slice
**Owner:** Northbear
**Implementation agent:** Codex

## 1. Problem

The current presentation feels closer to a gambling or reward-heavy website than an educational game. The strongest cues are dark luxury surfaces, excessive gold, coin-first status, “battle/critical/combo” language, glossy casino-like buttons, and reward effects stronger than learning feedback.

The underlying product is educational, but the art direction does not communicate that clearly enough.

## 2. Goal

Redesign Lucky Cat HSK as:

> **A joyful Chinese-learning adventure led by a friendly lucky-cat study companion.**

The product should communicate learning, practice, curiosity, confidence, daily habit, and progress—not betting, jackpots, luxury casino, or aggressive combat.

## 3. Design principles

### Learning is the hero
Hanzi, pinyin, meaning, mastery, and daily progress must be visually stronger than coins, cosmetics, and shop content.

### Calm and playful
Use warm paper, coral red, jade, sky blue, sunflower yellow, and ink navy. Gold becomes a small accent.

### Progress feels meaningful
Use learning metaphors: completed lessons, mastery badges, books, a learning garden, a journey map, weekly goals, and vocabulary collections.

### Friendly challenge, not combat
The arcade mechanics remain, but presentation changes:

| Current | Education-first |
|---|---|
| Battle | Word Quest |
| Combo | Learning Streak |
| Critical | Perfect |
| Lives | Focus |
| Shop | Collection |
| Boss | Review Challenge |
| Fight Misses | Practice Missed Words |
| High Score | Best Session |

Preserve internal keys where practical.

## 4. Visual direction

### Theme
**Lucky Cat Learning Journey**

### World
A warm storybook Chinese neighborhood combining a cozy study room, small library, learning street, vocabulary garden, notebook cards, stamps, books, pencils, bookmarks, and a cheerful lucky-cat mentor.

### Style
- soft storybook illustration
- clean cel-painted characters
- rounded educational UI
- subtle paper texture
- restrained Chinese decorative motifs
- simple icon family
- no casino gloss
- no heavy black-and-gold framing
- no neon reward effects

### Palette

| Token | Hex | Use |
|---|---:|---|
| Warm paper | `#FFF8E8` | cards and learning surfaces |
| Coral red | `#E65A4F` | primary actions |
| Soft jade | `#4FAE8A` | correct and positive states |
| Sky blue | `#6EB6E8` | secondary navigation |
| Sun yellow | `#F5C85B` | stars and small highlights |
| Ink navy | `#243447` | primary text |
| Plum | `#7B5B8E` | review and mastery |
| Soft gray | `#E7E2D9` | dividers and disabled states |
| Leaf green | `#78B86B` | progress and growth |
| Warm brown | `#7A5A44` | illustration outlines |

### Lighting
- soft daylight or warm classroom light
- gentle lantern glow at night
- quiet contrast behind text
- no intense gold bloom
- no dark casino mood

## 5. Information hierarchy

### Home
1. Continue Learning
2. Daily Goal
3. HSK level and mastery
4. Learning streak
5. Learn / Word Quest / Review
6. Learning garden or journey strip
7. Collection, Progress, Settings
8. Currency as secondary information

### Word Quest
1. Hanzi
2. Pinyin
3. Meaning choices
4. Round progress
5. Focus hearts
6. Learning streak
7. Score/reward

### Results
1. Accuracy
2. Words learned or reviewed
3. Missed words
4. Mastery gained
5. Daily-goal progress
6. Review mistakes
7. Secondary rewards

## 6. Screen requirements

### Home
- lucky-cat study companion
- large Continue Learning action
- daily-goal progress
- HSK level and mastery
- current streak
- Learn, Word Quest, Review paths
- learning garden or journey strip
- secondary Collection, Progress, Settings
- do not lead with coins or shop

### Scope selection
Present as a lesson planner using level cards, notebook tabs, estimated session length, frequency filters, and exam coverage. Avoid casino-style chips.

### Flashcards
Use a clean paper study card with dominant Hanzi, clear pinyin, Thai and English meanings, audio, mastery indicator, Still Learning, and Know It.

### Word Quest
Keep mechanics unchanged but use friendly challenge characters, learning-streak feedback, focus hearts, nonviolent completion, soft stars, stamps, leaves, or paper confetti.

### Results
Show accuracy, completion, mastery, words to review, daily-goal progress, and Review Mistakes as the recovery action.

### Collection
Rename Shop visually to Collection or Customize. Keep currency support but emphasize earned customization, not purchasing.

### Progress
Use books, mastery rings, journey milestones, weekly calendar, and a vocabulary garden.

## 7. Production runtime assets

A reference board is not a runtime asset. Every item below must be exported separately.

### Characters

| File | Size | Requirement |
|---|---:|---|
| `cat-walk.png` | 1536×256 | 6 horizontal 256×256 frames, transparent |
| `cat-happy.png` | 1024×256 | 4 horizontal 256×256 frames, transparent |
| `cat-study.png` | 512×512 | cat reading or holding flashcards |
| `cat-guide.png` | 512×512 | cat pointing or encouraging |
| `cat-celebrate.png` | 512×512 | calm celebration |
| `cat-thinking.png` | 512×512 | review or mistake state |
| `cat-portrait.png` | 512×512 | home/profile portrait |
| `maneki.png` | 512×512 | application mascot |

Character rules:
- consistent proportions across every pose
- friendly expression
- simple red scarf or study outfit
- books, pencil, flashcards, or bookmarks as props
- no money bag as the focal object
- no wealth medallion as the main symbol
- clean transparency
- readable at 64 px

### Backgrounds

| File | Size | Purpose |
|---|---:|---|
| `bg-home.png` | 1080×1920 | cozy study room / learning street |
| `bg-quest.png` | 1024×512 | Word Quest environment |
| `bg-flashcards.png` | 1080×1920 | quiet desk or library |
| `bg-results.png` | 1080×1920 | calm celebration with open center |
| `bg-progress.png` | 1080×1920 | learning garden / journey map |
| `bg-collection.png` | 1080×1920 | friendly customization room |

Background rules:
- no baked-in text
- no incorrect Chinese writing
- low-detail center for dynamic content
- details concentrated near edges
- no casino tables, chips, jackpot lights, counters, or luxury storefront cues

### UI surfaces

- `ui-card-paper.png`
- `ui-card-soft.png`
- `ui-button-primary.png`
- `ui-button-secondary.png`
- `ui-button-neutral.png`
- `ui-tab.png`
- `ui-badge-mastery.png`
- `ui-progress-track.png`
- `ui-progress-fill.png`
- `ui-stamp-correct.png`
- `ui-divider.png`

Rules:
- no baked-in text
- scalable corners
- restrained shadows
- support Thai labels
- minimal gold
- accessible contrast

### Icons

Preferred delivery: one `ui-icons.svg` sprite with:

home, learn, quest, review, flashcards, audio, muted, progress, collection, settings, streak, calendar, focus-heart, star, mastery, book, pencil, headphones, check, retry, back, close, pause, play, next, previous, and secondary coin.

Rules:
- rounded educational style
- consistent optical size and weight
- readable at 18 px
- no emoji
- currency visually secondary

### Feedback effects

- `fx-correct.png`
- `fx-perfect.png`
- `fx-retry.png`
- `fx-mastery.png`
- `fx-level-up.png`
- `fx-daily-goal.png`

Use stars, stamps, leaves, bookmarks, books, and soft paper confetti. Avoid explosions, fire, jackpot bursts, aggressive red flashes, and “critical” typography.

## 8. Source structure

```text
game/
  art-source/
    education-v1/
      reference/
      characters/
      backgrounds/
      ui/
      icons/
      effects/
      marketing/
  assets/
    optimized runtime assets only
  docs/
    PRD-education-visual-redesign-v1.md
    ASSET-INVENTORY.md
    ART-QA-CHECKLIST.md
```

## 9. Codex scope

Codex must:
1. Read `CLAUDE.md` and `AGENTS.md`.
2. Audit all visual assets and references.
3. Preserve game mechanics and data.
4. Create `ASSET-INVENTORY.md`.
5. Install and validate the new asset manifest.
6. Integrate only approved runtime assets.
7. Replace emoji UI with the new icon family.
8. Update CSS tokens and component styling.
9. Update visible labels to education-first language.
10. Keep vocabulary text dynamic.
11. Preserve `file://` support and current fallbacks.
12. Preserve existing `nbhsk.*` saves.
13. Add reduced-motion behavior.
14. Validate mobile layouts.
15. Run tests and build.
16. Bump the service-worker cache for release.

Codex must not:
- redesign vocabulary logic
- change scoring behavior without approval
- edit generated vocabulary files
- remove fallbacks
- touch Android signing material
- call placeholder art production-ready
- bake dynamic Chinese, Thai, or English text into images

## 10. Delivery phases

### Phase A — Audit and language cleanup
- inventory assets
- identify gambling/casino cues
- map labels to education-first copy
- create manifest
- capture baseline screenshots
- preserve functionality

### Phase B — UI system
- implement new color tokens
- replace surfaces and button styling
- replace emoji icons
- improve typography and spacing
- update visible language

### Phase C — Vertical-slice assets
- base cat
- home background
- quest background
- flashcard background
- core UI surfaces
- icon family
- correct/perfect/retry effects

### Phase D — Integration
- connect approved files
- responsive polish
- fallback checks
- asset optimization
- accessibility validation

### Phase E — Release
- before/after screenshots
- tests and build
- PWA cache bump
- Android sync
- known-issues report

## 11. Acceptance criteria

- [ ] Home looks educational within two seconds.
- [ ] Learning actions are more prominent than currency and collection.
- [ ] Hanzi is the strongest element during play.
- [ ] Thai and English remain readable.
- [ ] No primary screen resembles a casino or gambling interface.
- [ ] Gold is a minor accent.
- [ ] Education-first labels are visible.
- [ ] Emoji UI is replaced by one icon family.
- [ ] Character proportions are consistent.
- [ ] Feedback is calm, clear, and nonaggressive.
- [ ] Core actions remain visible at 360×640.
- [ ] Existing tests pass.
- [ ] `npm run build` succeeds.
- [ ] `file://` still works.
- [ ] Existing saves load.
- [ ] Offline PWA works.
- [ ] Android sync succeeds.
- [ ] Service-worker cache is bumped.

## 12. Validation

Run from `game/`:

```sh
npm ci
npm test
npm run build
npm run serve
npm run cap:sync
```

Validate:
- 360×640
- 360×800
- 390×844
- 412×915
- desktop
- fresh profile
- existing profile
- HTTP
- `file://`
- offline PWA
- no console errors
- no missing assets
- no clipped Thai
- no sprite drift

## 13. Definition of done

The complete vertical slice includes Home, Scope Selection, Flashcards, Word Quest, Results, Collection, and Progress, and looks like one cohesive educational game rather than a reskinned casino interface.
