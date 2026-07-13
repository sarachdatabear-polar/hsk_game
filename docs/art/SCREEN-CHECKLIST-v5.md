# Per-screen reference-match checklist (PRD v5 A0 deliverable 3 / Track A gate)

Judge each screen side-by-side against `assets/_plan/REFERENCE-production-target.png`
in BOTH languages (EN + TH). A screen passes when every row is checked.

Shared checks for every screen:
- [ ] Surfaces are cream/daylight (`--lc-cream` washes); zero dark-red/gold arcade chrome
- [ ] Buttons follow STYLE-TOKENS §5 roles (sun primary / green secondary / coral negative / gray disabled)
- [ ] Typography per STYLE-TOKENS §6; Thai strings fit without clipping
- [ ] All colors come from tokens (spot-check devtools: no `--edu-*`, no legacy hex)
- [ ] Shadows warm ink, light from top-left; no glows, no gambling visual language

Lantern Trail vibe-preservation gate:
- [ ] Existing warm-daylight palette, LC fonts, paper plaques, brown outlines, and top-left lighting remain unchanged
- [ ] Existing painted backdrops and owned cat skins remain the dominant visual identity
- [ ] Raccoon remains cute and friendly; Review Guide framing does not introduce aggressive combat art
- [ ] Lantern/orb effects use the current restrained storybook effect language, not neon arcade chrome
- [ ] No replacement asset is required for migration; any new pose or postcard is optional polish
- [ ] Side-by-side comparison still reads immediately as the same Lucky Cat HSK game

| Screen | `#s-` id | Pass A1 | Notes |
|---|---|---|---|
| Home | `s-home` | [x] | shipped by Visual Slice v1 — re-verify only |
| Battle + pause overlay | `s-battle` | [x] | shipped by Visual Slice v1 — re-verify + `#cv`/HUD polish |
| Flashcards | `s-learn` | [x] | card = paper plaque; Know/Still-learning per §5 |
| Results | `s-results` | [x] | green big number; calm perfect/level-up plaques |
| Scope picker | `s-scope` | [x] | chips sand/sky; Word Quest = sun plaque |
| Shop / Collection | `s-shop` | [x] | previews sand-bordered |
| Street | `s-street` | [x] | brown-framed canvas, brown caption |
| Progress | `s-progress` | [x] | |
| Quests | `s-quests` | [x] | |
| Scores | `s-scores` | [x] | |
| More | `s-more` | [x] | green secondary plaques |
| How to play | `s-howto` | [x] | green `b` accents |
| Bottom nav | `bottom-nav` | [x] | shipped by Visual Slice v1 — re-verify only |

## A1 walk notes (2026-07-07, screenshot pass)

- All 13 screens pass on the production-asset path (Chrome, 390×844) — warm cream surfaces, zero arcade chrome.
- With frame assets loaded, `.big` secondary buttons render the blue `ui-button-secondary` frame (matches the reference sheet's SECONDARY element); the green plaque CSS is the file:// / missing-asset fallback.
- `.know` / `.learn2` inherit the secondary frame via the `has-ui` override's specificity (pre-existing behavior). Dedicated success/coral frame variants are an A2 asset candidate.
- `.big.primary` under the green `ui-button-primary` frame needed `color:var(--lc-cream)` in the `has-ui` override (this round's one walk fix); its CSS fallback stays sun-yellow + brown text.
