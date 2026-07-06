# Art Direction — Warmth Pass v2 (Education-First + Reference Charm)

**Status:** Active direction (decided 2026-07-06)
**Builds on:** `ART-PRODUCTION-ORDER-DETAILED.md` + `PROMPTS-education-v1.md` (still the source of truth for filenames, dimensions, composition, export rules).
**Supersedes:** only the *rendering feel* — not the guardrails, not the asset list.

---

## 1. Why this pass exists

The education-first v1 art is faithful to spec but reads a little **flat/clean**, and it drifted from the charm of the original Lucky-Cat reference board. The reference board's appeal is its **warmth, coziness, and storybook character charm** — *not* its gold-coin/fortune symbolism.

**Decision:** keep 100% of the education-first *guardrails*, and add the reference's *warmth and charm*. We are buying the feeling, not the casino.

## 2. Guardrails that DO NOT change (reaffirmed)

These stay exactly as in `ART-PRODUCTION-ORDER-DETAILED.md` and the prompt pack's **Shared negative block**:

- ❌ No gold coin as a hero/primary object; ❌ no money bag, casino chip, jackpot, slot-machine, oversized gold medallion, fortune-shop identity. **Gold only as a tiny accent.**
- ✅ Education motifs stay: books, flashcards, bookmarks, paper, study desks, lanterns, plants.
- ✅ Base palette stays (warm paper `#FFF8E8`, coral `#E65A4F`, jade `#4FAE8A`, sky `#6EB6E8`, sun `#F5C85B`, ink navy `#243447`, leaf `#78B86B`, warm brown outline `#7A5A44`).
- ✅ Cat continuity stays: cream fur, orange patches (forehead + one ear + tail), coral scarf, book prop, same face across all assets.

> **Why the guardrails are non-negotiable:** they protect the monetization-PRD positioning — declared **13+ / learning-first**, store listing framed as *exam prep, not a game or a gambling app*. A coin/jackpot/fortune vibe is exactly what store reviewers and parents flag on a learning app. Warmth is safe; gold-coin symbolism is not.

## 3. What the Warmth Pass ADDS (the deltas)

Concrete, so a generator or artist can act on it. Move **from** flat clean cel **toward** cozy painterly storybook.

**Rendering**
- Richer **soft cel + gentle painterly texture** and subtle gradient depth — not flat vector fills.
- **Warm golden-hour study-room light**: soft upper-left key, gentle warm rim/backlight, cozy ambient bounce.
- Faint atmosphere: soft dust motes, warm bokeh, gentle vignette — just enough to feel lived-in. Keep it subtle behind dynamic text.

**Palette (same colors, warmer handling)**
- Push warmth: warmer paper tone, slightly richer saturation, a touch more contrast than v1.
- Cozy **amber/lantern ambient accents** are welcome (this is the "warmth" the reference has) — still *not* metallic gold hero objects.

**Character charm** (the biggest lever — this is what you're missing)
- Maximize **lucky-cat cuteness**: rounder cheeks, big soft expressive eyes, inviting cozy poses, lively tail curl and scarf bounce. A beloved storybook mascot you'd want on a plush.
- Stronger, rounder **readable silhouette** at small sizes.
- Keep face/markings/scarf/book continuity exactly.

**Backgrounds** (make them cozier, not busier)
- Lived-in layered depth: soft foreground props (open books, a teacup, a potted plant, a paper lantern), warm interior glow, gentle background bokeh.
- Inviting "come study here" feeling. **Low contrast in the center third** where word text sits.

## 4. Drop-in: Shared style block v2

Replace the "Shared style block" at the top of `PROMPTS-education-v1.md` with this (already applied — see that file). Keep the **Shared negative block unchanged** — it enforces the guardrails.

> Cozy painterly storybook children's-education illustration: soft cel shading with gentle
> brushy texture and subtle gradient depth, medium-weight warm-brown (#7A5A44) outlines,
> rounded friendly shapes, low visual noise. Warm golden-hour study-room light — soft
> upper-left key, gentle warm rim light, cozy amber ambient glow, faint dust motes/bokeh.
> Palette (warm, slightly richer saturation): warm paper #FFF8E8, coral red #E65A4F, soft
> jade #4FAE8A, sky blue #6EB6E8, sun yellow #F5C85B, ink navy #243447, leaf green #78B86B,
> warm-brown outlines #7A5A44; amber/lantern glow as ambient warmth only; gold strictly a
> tiny accent. Charming, huggable lucky-cat character appeal; inviting, lived-in feel.

## 5. Regeneration priority (what to redo, in order)

Regenerate against the v2 style block. **cat-study is the master — redo it first and approve before the others** (every cat attaches it as the continuity reference).

| Order | Asset | Why first | Notes |
|---|---|---|---|
| 1 | `cat-study.png` | Character master — all cats derive from it | Approve before generating any other cat |
| 2 | `maneki.png` | Brand mascot, most-seen | Book/flashcard prop, **not** a coin |
| 3 | `cat-portrait.png` | Home/most-visible face | Match cat-study face exactly |
| 4 | `bg-home.png` | First screen users see | Cozy study-room warmth |
| 5 | `bg-quest.png` | Battle backdrop, on-screen longest | Low center contrast behind the word plaque |
| 6 | `cat-happy.png`, `cat-walk.png` | Battle animation frames | Keep frame count/size in the manifest |
| 7 | remaining bg-* + cat-guide/celebrate/thinking | Fill out the set | Lower priority |

**Leave as-is (already vector, likely fine):** all `ui-*.svg` (13) and `fx-*.svg` (8). If you want warmer UI, I can edit those SVGs directly — no regeneration needed.

**Skins** (`cat-midnight/sakura/jade/gold`) are recolors of the master — redo after the base cat is locked.

## 6. Process (per asset)

1. Prepend **Shared style block v2** + keep the **Shared negative block**; use the per-asset body from `PROMPTS-education-v1.md`.
2. Generate at the exact canvas size in `asset-manifest-education-v1.json` (larger + downscale if needed — never upscale).
3. Save into `art-source/education-v1/…`, review against the §11 checklist.
4. Promote to `assets/` (same filename).
5. Run the load/render proof (`node .render-check.mjs` pattern) — every asset must decode to real pixels, zero 404s.
6. Update the asset's `status` in `asset-manifest-education-v1.json`.

## 7. Reference crops = design reference only

The tiny pipeline crops in `assets/png|svg|source/**` are **design/style reference**, not runtime art (they're 50–180 px). Keep them as reference (they'll be relocated to `art-source/` in the pending cleanup), but never ship or upscale them. The reference board is for *direction*, per the existing rule.
