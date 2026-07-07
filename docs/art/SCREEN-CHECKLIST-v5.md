# Per-screen reference-match checklist (PRD v5 A0 deliverable 3 / Track A gate)

Judge each screen side-by-side against `assets/_plan/REFERENCE-production-target.png`
in BOTH languages (EN + TH). A screen passes when every row is checked.

Shared checks for every screen:
- [ ] Surfaces are cream/daylight (`--lc-cream` washes); zero dark-red/gold arcade chrome
- [ ] Buttons follow STYLE-TOKENS §5 roles (sun primary / green secondary / coral negative / gray disabled)
- [ ] Typography per STYLE-TOKENS §6; Thai strings fit without clipping
- [ ] All colors come from tokens (spot-check devtools: no `--edu-*`, no legacy hex)
- [ ] Shadows warm ink, light from top-left; no glows, no gambling visual language

| Screen | `#s-` id | Pass A1 | Notes |
|---|---|---|---|
| Home | `s-home` | [ ] | shipped by Visual Slice v1 — re-verify only |
| Battle + pause overlay | `s-battle` | [ ] | shipped by Visual Slice v1 — re-verify + `#cv`/HUD polish |
| Flashcards | `s-learn` | [ ] | card = paper plaque; Know/Still-learning per §5 |
| Results | `s-results` | [ ] | green big number; calm perfect/level-up plaques |
| Scope picker | `s-scope` | [ ] | chips sand/sky; Word Quest = sun plaque |
| Shop / Collection | `s-shop` | [ ] | previews sand-bordered |
| Street | `s-street` | [ ] | brown-framed canvas, brown caption |
| Progress | `s-progress` | [ ] | |
| Quests | `s-quests` | [ ] | |
| Scores | `s-scores` | [ ] | |
| More | `s-more` | [ ] | green secondary plaques |
| How to play | `s-howto` | [ ] | green `b` accents |
| Bottom nav | `bottom-nav` | [ ] | shipped by Visual Slice v1 — re-verify only |
