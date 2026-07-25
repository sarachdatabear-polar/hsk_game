# Street v2 art shot-list — the B/C batch (canvas, neighbours, construction)

_Companion to `docs/superpowers/specs/2026-07-23-street-ownership-design.md` (the
deferred new-art roadmap) and the 2026-07-25 street-polish spec. Code work on the
B/C layer starts only after this batch lands — **full batch in `art-drop/` first,
then say "go"** (house rule). P1 unblocks everything; P2 can follow later._

## Shared style header — paste at the top of every prompt

> Warm storybook illustration, storybook watercolor–flat hybrid with soft edges,
> polished mobile-game quality. Palette locked to: primary green #32775E, sky blue
> #5DAADD, sun yellow #F2BC57, coral #E69777, warm brown #846043, soft gray #B2AEA9,
> paper cream #FBF5E8, deep teal #1F4D4A, light sand #EAC796, ink #2E2A24 — warm,
> slightly muted, never neon.
> Strictly avoid: lettering or characters, photorealism, neon colors, drop shadow,
> watermark, people.

Sprites (neighbours, construction) are generated on **plain background for removal**
(intake handles it), like the shipped decos. Panoramas are full-bleed.

---

## P1a — Wide street panoramas ×2 (canvas expansion)

The Street becomes a side-scrollable stage twice the current width. Existing street
backdrops are 1024×512; the wide stage needs **2048×1024** (keep the horizon and
ground-line heights consistent with `bg-street.png` so plots stay valid).

1. **`bg-street-wide.png`** — the default day street, an *empty stage*: a warm dirt
   road running the full width, distant hills and low trees behind a modest fence,
   two small unpainted timber shopfronts at the far left and right edges framing the
   scene, generous open mid-ground left deliberately empty for player decorations.
   Nothing in the central 60% taller than a fence post.
2. **`bg-street-market-wide.png`** — the same stage at night, market mood: dark teal
   sky, two thin lantern strings high across the top edge only, warm window glow from
   the two edge shopfronts. **No stalls, lanterns-on-poles, or props in the central
   60%** — the player's decorations are the market.

**The key change from the current backdrops:** the painted art must stop competing
with placed items. Background = stage; player items = the show.

## P1b — Named neighbours ×3 (12 sprites, 512×512 transparent-ready)

Distinct silhouettes, same rendering style as the shipped lucky-cat art. Per
character four sprites: `walk-a`, `walk-b` (two-frame walk), `idle` (sitting/standing
rest pose), `portrait` (bust, for the greeting card). Files:
`neighbour-<id>-<pose>.png`, e.g. `neighbour-pang-walk-a.png`.

3–6. **`neighbour-pang-*`** — a round red panda shopkeeper, apron in deep teal,
   carrying a tiny parcel; cheerful, bustling energy.
7–10. **`neighbour-tiao-*`** — a lop-eared rabbit courier, coral satchel worn
   cross-body, one ear always flopped; quick and curious.
11–14. **`neighbour-wen-*`** — an elderly tortoise tea-master, light-sand shell,
   small round glasses, holding a steaming cream teacup; slow, content.

(Names are working ids — rename before generating if you prefer; the files just
need to stay consistent.)

## P1c — Landmark construction stages ×10 (512×512, transparent-ready)

Each of the five milestone landmarks gets two pre-completion stages so growth is
visible (`landmark-<id>-stage1.png` scaffold, `-stage2.png` half-built):

15–16. **lantern-post** — s1: a bare timber post with rope coils at its base;
   s2: post raised with an empty hanging arm, one unlit lantern resting below.
17–18. **tailor** — s1: staked-out timber frame with folded cloth bolts stacked;
   s2: walls up, no roof, a bare shop counter visible inside.
19–20. **kitten-cafe** — s1: pallet of bricks + sawhorses; s2: shell with door and
   window holes, paint pots by the entrance.
21–22. **coin-bank** — s1: stone foundation slabs pegged with string lines;
   s2: half-height stone walls, the round vault door leaning against them.
23–24. **emperor-gate** — s1: two bamboo scaffold towers where the pillars will be;
   s2: both red pillars raised, no crossbeam, scaffolds still attached.

## P2 — Remaining wide panoramas ×6 (later, optional)

Wide (2048×1024) "empty stage" versions of the other equipped-backdrop themes:
bamboo, dragon-gate, harbor-night, island-sunset, lantern-festival, snow-festival,
temple — same rule: central 60% stays clear for the player's layer. Generate after
the P1 layer is playable; the current 1024×512 versions keep working until then.

## Workflow reminder

Whole batch (P1 = 24 files) into `art-drop/`, raw, unresized, then say **go** —
intake QA, background removal, sprite registration, precache and the code layer are
Claude's job.
