# PRD — Lucky Cat Street v2: A Place Worth Decorating

**Date:** 2026-07-22
**Status:** Approved and implemented — Release A rollout validation pending
**Target:** Lucky Cat HSK web PWA + Capacitor Android app
**Product decision:** Rebuild Street from a passive trophy shelf into a small,
player-authored place. Keep purchases cosmetic and keep learning free.

---

## 1. Executive summary

Lucky Cat Street has good art and a functioning coin sink, but it does not yet
create a reason to care about a decoration. Buying an item currently causes the
game to place it automatically in a permanent anchor. The player cannot choose
where it goes, hide it, move it, compare it in context, or do anything with it
after purchase. On the Street screen, the scene is either mostly empty or filled
with every owned object at once. In the Shop, street items are small previews at
the bottom of a long catalog.

The recommended solution is **not another art pass**. It is a new ownership loop:

> Learn → earn coins → preview an item in your street → buy it → choose its
> place → visit and interact with the result.

Street v2 should ship first as a constrained decorating feature rather than a
free-form builder:

1. Show the existing 1024×512 street background as a **panoramic two-section
   street** instead of cropping it into one portrait canvas.
2. Replace automatic permanent placement with **authored plots**. Players select
   an owned item, then tap a compatible plot. Dragging may be supported later,
   but is never required.
3. Add a **Decorate** mode with inventory, Store, Move, Undo, Done, and
   Auto-arrange. Unused purchases remain safely owned.
4. Give Street its own Shop entry path. Let players preview an unowned item in
   their actual street and use **Buy & Place**.
5. Give every decoration a lightweight reaction and clear tier differences so
   the result is visible after purchase, while granting no learning or combat
   advantage.

This is the smallest approach that adds the missing player agency, makes all 15
existing decoration assets useful, reduces visual crowding, and remains feasible
in the current vanilla-JS/canvas architecture.

## 2. Problem and current-state audit

### 2.1 What exists today

- The catalog has **15 street decorations**, including permanent, daily-stock,
  and seasonal items. Every decoration supports up to three tiers.
- [`src/street.js`](../../src/street.js) assigns each owned item a fixed anchor
  based on its size class and catalog order. Ownership automatically means
  display; there is no layout state.
- [`src/main.js`](../../src/main.js) renders one canvas, one progress caption,
  and a purchase reveal animation. The only other Street action is Quests.
- [`index.html`](../../index.html) gives the Street canvas up to 52vh/400px. The
  existing background is 1024×512, but `drawCoverImage` crops it into the much
  narrower portrait viewport.
- Shop rows use a 96×64 preview. Permanent street decorations appear after all
  other Shop sections, at the bottom of a long page.
- The owned set and tier map already cloud-sync through the `shop` cosmetics
  JSON. Layout is not persisted because no player layout exists.

### 2.2 Observed UX at 390×844 on 2026-07-22

The current app was reviewed with a clean profile and with level 50/all 15
decorations owned.

- **Empty state:** a large, attractive landscape is almost completely empty. A
  small mascot, a progress sentence, and Quests are the only active elements.
  There is no “decorate,” “preview,” or “shop for this street” action.
- **Full state:** all five buildings and all 15 decorations occupy one view.
  Individual art is appealing, but the composition is crowded and items compete
  for attention.
- **Shop:** the item art is legible, but a 96×64 isolated tile does not show
  scale, placement, animation, tier change, or how the purchase will improve the
  player's own scene. Street items are also hard to discover from Street itself.

### 2.3 Root causes

1. **No authorship:** the system displays ownership but does not let the player
   create anything.
2. **Weak pre-purchase value:** buyers cannot see an item in context or understand
   its tier/interaction value.
3. **Weak post-purchase value:** after the reveal animation, an item is static and
   has no interaction.
4. **No curation:** displaying everything makes collection growth reduce scene
   quality.
5. **Poor loop connection:** learning earns the coins, but the Street does not
   visibly respond to the learning activity that funded it.

## 3. Research findings and product implications

The evidence supports giving players meaningful, low-risk control rather than
adding artificial utility or more scarcity.

| Finding | Evidence | Implication for Lucky Cat Street |
|---|---|---|
| Control is central to customization enjoyment. | Kim et al. found autonomy and control to be more consistent predictors of enjoyment than attachment across two game-customization studies. | Manual placement is the primary feature, not a secondary polish item. |
| Personalization can support motivation and invested effort. | Birk et al.'s CHI study linked stronger avatar identification with autonomy, immersion, enjoyment, positive affect, and time spent. Applying this to an environment is an inference to validate, not a guaranteed effect. | Make the Street recognizably “mine,” then measure whether players use and revisit it. |
| Successful cozy spaces combine arrange + collect + life. | Nintendo describes Pocket Camp's loop as choosing and arranging furniture, then inviting animals; it also supports one-tap saved layouts. | Purchases need placement and visible reactions. Saved layouts belong in a later phase. |
| The core activity should fund self-expression. | Finch awards currency for completed goals and uses it for furniture and customization. Study Bunny awards coins for study time, previews items before purchase, and lets owned items be added, removed, and moved without loss. | Preserve Lucky Cat's learn→coins economy; add in-context preview, Buy & Place, and safe inventory. |
| Inspiration and sharing extend decorating after the editor works. | Palia introduced a Dream Home/Home Tour surface explicitly to provide decorating ideas and reactions. | Sharing is Phase 3, after the private creation loop proves valuable. |
| Dragging cannot be the only placement method. | WCAG 2.2 requires a single-pointer alternative for drag operations, and recommends adequately sized targets. | MVP uses tap-select → tap-plot. Any future drag behavior is optional; controls target 44×44 CSS px. |

### Product synthesis

The strongest common pattern is:

> **choice + safe experimentation + a visible living result**

Lucky Cat already has collection and currency. Street v2 should invest in the
other three parts before adding more catalog items.

## 4. Goals, non-goals, and principles

### 4.1 Goals

1. A player can make a street that looks intentionally theirs in under two
   minutes.
2. A player can preview the real impact of a decoration before spending coins.
3. A decoration remains valuable after purchase through placement, curation,
   clear tiers, and lightweight interaction.
4. All currently owned items survive migration and remain usable.
5. Street remains responsive, offline-first, bilingual, accessible, and
   deterministic enough to test.

### 4.2 Non-goals for the first release

- No 3D scene, physics, pixel-perfect free placement, pinch resize, or rotation.
- No gameplay bonuses, SRS multipliers, battle power, or paid learning advantage.
- No new currency and no randomized/gacha rewards.
- No selling or destroying owned items.
- No public gallery, friend visits, likes, rankings, or moderation system.
- No city-management simulation, resource production, timers, or NPC schedules.
- No requirement for new background art; the current background and 15
  decoration PNGs are the launch asset set.

### 4.3 Design principles

- **Authorship over accumulation:** owning more should create more choices, not
  force more clutter.
- **Preview the truth:** preview the item at its actual size, tier, plot, and
  effect. Do not use a more impressive purchase-only rendering.
- **Cosmetic means cosmetic:** the Street may celebrate learning, but buying an
  item never improves learning rewards or competitive power.
- **Kind scarcity:** daily/seasonal stock may remain, but the return timing stays
  visible and there is no random loot.
- **Safe editing:** Store, Undo, Cancel, Auto-arrange, and Reset never delete
  ownership.
- **Tap-first:** the complete feature works without drag, fine motor precision,
  sound, or motion.

## 5. Target users and jobs

### New learner

“Show me quickly why coins and Street matter, without making me learn a building
tool before I can study.”

### Returning learner with a few items

“Let me put my favorite purchase somewhere meaningful and see it react.”

### Collector with many items

“Let me curate the scene, keep unused items safely, understand my sets, and avoid
the current crowded shelf.”

### Accessibility user

“Let me arrange the same street using large tap targets, keyboard focus, and
reduced motion; do not make dragging mandatory.”

## 6. Proposed experience

### 6.1 Browse mode: Street is a place

Replace the single cropped scene with a continuous panoramic world that uses the
full 2:1 composition of `bg-street.png`.

- On portrait phones, the world is approximately two viewport widths and has two
  snap positions. The user can swipe horizontally or use visible Previous/Next
  section buttons.
- On landscape/wide screens, show as much of the world as fits; hide paging when
  the full world is visible.
- Keep all five level buildings in fixed, non-editable landmark plots.
- Provide approximately 18 authored decoration plots across three depth lanes.
  The current 15-item collection can therefore be displayed without reproducing
  today's density, while leaving a little room for a starter and future rewards.
- Browse-mode item hit targets open a compact card with localized name, set,
  tier, and reaction hint. An owned item never requires a precise hit on its
  visible pixels; its plot owns an expanded invisible target.

Street header/action model:

- Header: **Lucky Cat Street** + wallet chip.
- Primary action: **Decorate**.
- Secondary actions: **Street Shop** and the existing **Quests** popup.
- Compact status: `8 placed · 7 in storage · 5/5 landmarks` rather than the
  current long caption.

### 6.2 Decorate mode: tap-select, tap-place

Entering Decorate mode changes the screen into an editor without navigating away.

#### Required controls

- **Inventory:** owned decorations, grouped as Not placed / Placed / All.
- **Move:** select a placed item, then tap a compatible empty plot or another
  compatible item to swap.
- **Store:** remove the item from the scene while retaining ownership and tier.
- **Place:** select an inventory item, then tap a compatible plot.
- **Undo:** at least the current edit session's last 10 operations.
- **Auto-arrange:** deterministic, attractive placement for every owned item that
  fits. This is the successor to today's automatic anchor assignment.
- **Done:** commits the edit session.
- **Cancel:** returns to the pre-edit layout.

#### Plot rules

Reuse the current `gateway / large / medium / small` classes, but make them player
constraints rather than permanent item destinations.

- Gateway → gateway plots only.
- Large → large plots only.
- Medium → medium or large plots.
- Small → small, medium, or large plots.
- Compatible empty plots pulse while an item is selected.
- Incompatible plots remain visible but are disabled and have an accessible
  reason such as “Noodle Stall needs a large plot.”
- The same owned item may appear at most once. Every other owned item remains in
  inventory.

Dragging may be added as a convenience, but tap-select → tap-plot and the item
action menu remain complete alternatives.

### 6.3 First useful Street moment

The feature must not introduce itself with the current empty field.

- After the player's first completed learning session, award one earn-only
  **Welcome Lantern** decoration and point to Street once, without blocking the
  next learning action.
- On first Street entry, open a three-step placement coach:
  1. “This is your street.”
  2. Select the Welcome Lantern.
  3. Tap one of two highlighted small plots, then Done.
- The item reuses the existing red-lantern sprite with a distinct welcome ribbon
  overlay, so MVP does not require a new raster asset.
- Existing players receive the Welcome Lantern on first v2 entry regardless of
  whether they own the shop's Red Lantern. No existing purchase is devalued or
  refunded because this is a visibly distinct earn-only item.
- “Skip and auto-place” is available. The tutorial never blocks Quests or back
  navigation.

### 6.4 Street Shop: show the outcome before the price

Street Shop is a focused entry into the existing Shop, not a second catalog.

- Opening Shop from Street filters to Street Decorations first. Opening Shop
  from Home retains the full collection view.
- Decoration cards get a larger art area, price, tier state, availability, set
  tag, behavior tag, and placement state.
- Selecting a card opens an item detail sheet containing:
  - the item placed as a clearly marked preview in the player's current street;
  - section/plot switching;
  - localized one-line flavor description;
  - size/plot requirement;
  - the actual ★, ★★, and ★★★ visual/behavior differences;
  - availability/return date where applicable;
  - **Buy & Place** and **Buy to Inventory** actions.
- Preview is free, untimed, and clearly labelled. Closing it restores the street
  exactly.
- Buy remains atomic: wallet and ownership update together through the existing
  purchase path.
- After Buy & Place, return to Street with the item selected and compatible
  plots highlighted. If the player backs out, the item remains owned in
  inventory.
- If no compatible plot is free, replace Buy & Place with **Buy to Inventory**
  and explain “Move or store an item to place this.”

### 6.5 Make every owned item respond

Every decoration gets a `behavior` family in metadata. This supplies visible
post-purchase value using shared canvas effects rather than 15 bespoke systems.

Recommended families:

| Family | Example items | Browse/tap reaction |
|---|---|---|
| `light` | Red Lantern, Tea Sign, Neon Cat Sign | warm pulse, small firefly sparkles |
| `food` | Noodle Stall, Bubble Tea, Shaved-Ice Cart, Mooncake Stall | steam/aroma curl or serving sparkle |
| `water` | Koi Pond | ripple and two fish-glint arcs |
| `flutter` | Paper Umbrella, Goldfish Banner | gentle sway with cloth/paper particles |
| `celebrate` | Drum Tower, Mahjong Table, Foo Dog, Golden/Firecracker arches | bounce, confetti/spark, or lucky chime visual |

Rules:

- Tap reactions last 0.6–1.2 seconds and can be replayed.
- Reduced-motion mode uses opacity/color changes only.
- Sound is optional, respects the current SFX state, and is never needed to
  understand the reaction.
- Browse mode labels the item while it reacts, so a canvas object is not a
  mystery control.
- No reaction grants currency or affects learning.

### 6.6 Tiers that are understandable

Current tier differences are too difficult to evaluate before purchase. Define a
consistent contract and show it in preview:

- **★:** base item + tap reaction.
- **★★:** persistent subtle ambient treatment from the item's behavior family
  (glow, steam, ripple, flutter, or sparkle). Do not rely on size inflation.
- **★★★:** stronger signature moment plus the existing gold maker/pennant accent.

Tier overlays are procedural and deterministic. A later art round may replace an
overlay, but the fallback remains feature-complete.

### 6.7 Collection clarity, not a new reward economy

Add `set` metadata and show collection progress in Street Shop:

- **Market Night** — signs, stalls, lanterns, mahjong.
- **Garden Luck** — koi, umbrella, Foo Dog, banner.
- **Festival Gate** — towers, arches, seasonal stalls.

The initial release shows counts and suggested combinations only. Set completion
does not grant bonuses or require a separate currency. A cosmetic set-completion
banner can be tested in Phase 2 after the core placement loop is measured.

## 7. Primary flows

### Flow A — first placement

`Complete first session → Welcome Lantern awarded → Street callout → select item
→ tap highlighted plot → Done → short construction reveal`

Target: under 45 seconds; Skip and auto-place always available.

### Flow B — preview and buy

`Street → Street Shop → item → Preview on my street → choose plot → Buy & Place
→ Street editor → Done`

Target: no more than three taps after purchase confirmation to commit placement.

### Flow C — curate a crowded collection

`Street → Decorate → select placed item → Store → select inventory item → place
→ Undo if desired → Done`

### Flow D — one-tap safety net

`Street → Decorate → Auto-arrange → preview full result → Done or Cancel`

## 8. Functional requirements

### P0 — required for Street v2 launch

| ID | Requirement |
|---|---|
| ST-01 | Panoramic scene uses the complete 2:1 background with swipe and button paging on narrow screens. |
| ST-02 | Authored plot table supports current buildings, all 15 catalog decorations, and the Welcome Lantern without overlap at supported viewports. |
| ST-03 | Complete tap-based Place, Move, Swap, Store, Undo, Done, Cancel, and Auto-arrange flows. |
| ST-04 | Owned items are never deleted by an edit, migration, preview, failed purchase, or cloud merge. |
| ST-05 | Street Shop opens focused decoration browsing and provides truthful in-scene preview. |
| ST-06 | Buy & Place uses the existing wallet/catalog rules and gracefully falls back to inventory. |
| ST-07 | Every decoration has localized description, set, plot size, and behavior metadata. |
| ST-08 | Every decoration has a reduced-motion-safe tap response; actual tier differences are previewable. |
| ST-09 | Welcome Lantern onboarding works for fresh and existing profiles and is skippable. |
| ST-10 | Existing Quests popup remains reachable from Street. |
| ST-11 | Layout persists offline and reconciles across signed-in devices without weakening additive ownership/tier merging. |
| ST-12 | All visible controls and canvas equivalents are keyboard and screen-reader operable. |

### P1 — next release after validation

- Up to three named saved layouts with preview thumbnails.
- A wishlist item and “N coins to go” goal; never a nag or debt mechanic.
- One lightweight visitor/cat reaction after the day's first completed quest.
- Cosmetic set-completion banner.
- “New” and “Not placed” filters plus recently purchased sorting.

### P2 — only after the private loop succeeds

- Export a Street postcard with `canvas.toBlob()` and existing share/fallback
  patterns.
- Optional friend visits or inspiration gallery, gated on privacy, moderation,
  reporting, account, and backend design.
- Additional panoramic districts/backgrounds when the catalog outgrows the first
  street.

## 9. Data model, migration, and sync

### 9.1 Recommended storage shape

Keep layout inside the existing `shop` cosmetics JSON so cloud storage requires
no new database column:

```js
{
  owned: [...],
  tiers: {...},
  skin: "",
  backdrop: "",
  effect: "",
  soundpack: "",
  streetLayout: {
    v: 2,
    placements: { "plot-small-01": "red-lantern" },
    welcomeOwned: true
  }
}
```

`placements` is plot→item rather than item→plot so collision checks are simple.
Render order remains derived from the plot's lane/y value.

### 9.2 Pure layout API

Add pure/tested functions to `street.js` or a focused `street-layout.js`:

```js
worldMetrics(viewportW, viewportH)
normalizeLayout(layout, ownedIds, plotTable)
compatiblePlots(itemId, layout)
placeItem(layout, itemId, plotId)
storeItem(layout, itemId)
swapItems(layout, aPlotId, bPlotId)
autoArrange(ownedIds, plotTable, previousLayout?)
migrateLegacyLayout(ownedIds, legacyAnchors, plotTable)
streetPieces(level, ownedIds, tiers, layout)
```

Required invariants:

- one item occupies zero or one plot;
- one plot contains zero or one item;
- every placed item is owned or is the Welcome Lantern;
- every placement is class-compatible;
- invalid/unknown ids are ignored, never thrown;
- normalization is idempotent and deterministic;
- auto-arrange preserves valid existing placements before filling gaps;
- no layout operation mutates its input.

### 9.3 Legacy migration

On first v2 load:

1. If `streetLayout.v === 2`, normalize and use it.
2. Otherwise, map the current deterministic `assignDecoAnchors` result to the
   nearest compatible panoramic plots.
3. Auto-place remaining owned items into compatible plots.
4. Put anything that cannot fit into inventory; never omit it from ownership.
5. Add the Welcome Lantern and leave it unplaced until onboarding, unless Skip
   and auto-place is chosen.

Acceptance: a seeded profile with all 15 decorations migrates with 15 unique
placed/inventory entries and unchanged tiers/wallet.

### 9.4 Cloud merge

Ownership and tiers remain additive/max-folded exactly as today. Layout is a
preference and uses the same baseline-dirty principle as equipped cosmetic slots:

- Extend the sync baseline from `shopSlots` to a normalized shop-preferences
  baseline containing equipped slots plus a stable layout hash.
- If layout changed locally since the last settled sync, local layout wins.
- Otherwise adopt cloud layout.
- After choosing a layout, normalize it against the **merged ownership union**.
  Newly merged items that were not in the winning layout remain safely in
  inventory.
- Concurrent arrangement on two offline devices is last-local-edit wins for
  layout only; ownership and tiers never lose progress.

This preference-LWW tradeoff is acceptable for cosmetic arrangement and avoids
inventing a complex per-plot CRDT.

## 10. Rendering and implementation approach

### 10.1 DOM/canvas split

- Canvas continues to render the background, buildings, items, shadows, and
  effects.
- A positioned DOM interaction layer supplies plot/item buttons, focus rings,
  labels, and assistive-technology semantics.
- Plot DOM coordinates derive from the same pure world metrics as canvas draws,
  preventing hit-target drift.
- Inventory/detail UI is ordinary DOM, not painted into canvas.

### 10.2 Panoramic world

- Put the logical world in a horizontally scrollable/snap viewport.
- Render at a logical maximum close to the source art's 1024×512 dimensions.
- Cap Street DPR at 2 where needed to bound memory on high-density Android
  devices; the source art does not benefit from a larger buffer.
- Stop all Street animation frames when another screen is active or the document
  is hidden.
- Previous/Next buttons scroll to exact section anchors and work without swipe.

### 10.3 Shared preview renderer

Extract a scene renderer that accepts `{layout, previewItem, previewPlot, now}`.
Street and the Shop detail preview use the same renderer and metadata, ensuring
the purchase preview matches the owned result.

### 10.4 Existing constraints

- Vanilla JS ES modules and existing esbuild pipeline; no new runtime dependency.
- Keep `file://` support. All metadata and assets are bundled; no required fetch.
- Keep vector/procedural fallbacks for missing images.
- Put pure rules in small tested modules; `main.js` only wires DOM/canvas/storage.
- Rebuild `dist/app.js` after source changes.
- Bump the service-worker shell cache for every user-facing release.

## 11. Accessibility and localization

- Every actionable item/plot has at least a 44×44 CSS px hit area where layout
  permits; never below WCAG's 24×24 minimum/spacing rule.
- Drag is optional. Tap-select/tap-place, menus, and keyboard controls expose all
  functions.
- Keyboard order follows header → scene sections → selected item controls →
  inventory → Done.
- Arrow keys may move between plots; Enter/Space selects/places; Escape cancels
  selection before it exits the editor.
- Visible focus is not clipped by the scroll viewport or bottom navigation.
- Screen-reader announcements cover selected item, compatible plot count,
  placement result, stored result, undo, purchase, and insufficient space.
- Reduced motion removes panning animation, bounce, particle movement, sway, and
  pulses; state changes remain visible through outline/opacity/color.
- English and Thai strings ship together. Thai descriptions require native
  review and must be checked at 360×640 and 200% text zoom.

## 12. Analytics and success measurement

The production analytics transport is consent-gated and may still be dark. The
feature must first pass usability tests and must not block release on unavailable
telemetry. When analytics is live, add only allowlisted, content-free events.

### 12.1 Event additions

```text
street_open              { source, owned_bucket, placed_bucket }
street_decorate_start     { owned_bucket, placed_bucket }
street_decorate_complete  { actions_bucket, used_auto_arrange }
street_preview            { item_id, source }
street_purchase           { item_id, source, placed_immediately }
street_item_interact      { behavior, tier }
```

No layout coordinates, user text, learned words, or screenshot data are sent.

### 12.2 Primary measures

1. **Street activation:** percentage of eligible players who complete at least
   one manual placement within seven active days.
2. **Decoration intent:** preview→coin-purchase conversion among players who can
   afford the item.
3. **Street purchase share:** decoration purchases as a share of non-consumable
   coin purchases.
4. **Repeat value:** percentage of activated players who reopen Street on a later
   day.

### 12.3 Initial decision thresholds

Because the current feature has no reliable baseline telemetry, thresholds are
directional until at least 200 consented eligible players or four weeks of data:

- ≥35% Street activation;
- ≥25% relative lift in decoration purchase rate among eligible Street/Shop
  viewers versus the pre-v2 baseline;
- ≥20% of activated players revisit Street on another day;
- no >3% relative decline in learning-session starts or completions;
- no increase in crash/error rate and no persistent Street animation while
  hidden.

### 12.4 Usability gate before rollout

With at least five target users, four of five should complete each task without
coaching:

1. Find an item from Street and preview it.
2. Place the Welcome Lantern.
3. Move an existing item without dragging.
4. Store an item and find it again.
5. Auto-arrange, then undo or cancel safely.

## 13. Test and acceptance matrix

### Pure/unit tests

- Every catalog decoration has size, set, behavior, and EN/TH description keys.
- Plot ids and positions are unique and within world bounds.
- All 15 decorations + Welcome Lantern auto-arrange without duplicate ids or
  same-lane overlap beyond the visual budget.
- Place/store/swap/undo are immutable, deterministic, and enforce compatibility.
- Normalize is idempotent and drops only invalid placements, never ownership.
- Legacy empty/sparse/full profiles migrate correctly.
- Shop merge unions ownership, maxes tiers, and preference-folds layout correctly.
- Unknown old ids and missing `streetLayout` degrade safely.

### Browser/responsive tests

- 360×640, 390×844, 412×915, 844×390, desktop narrow/wide.
- English and Thai; 200% text zoom.
- Empty, starter, sparse, all-owned, mixed-tier, daily, and seasonal states.
- Keyboard-only editor and screen-reader-name smoke.
- Reduced motion and sound off.
- Direct `file://`, served PWA, offline reload, and Android WebView.
- Street Shop deep entry, preview restoration, Buy & Place, no-space fallback,
  insufficient coins, and fast double-tap purchase guard.
- Quests popup and bottom navigation remain reachable at every viewport.

### Performance targets

- First Street input available within 500ms after navigation on the current
  responsive-test environment.
- Browse interaction stays visually smooth on a mid-range Android device.
- No canvas buffer larger than the defined DPR/memory budget.
- No requestAnimationFrame loop after leaving Street or hiding the app.

## 14. Phased delivery

### Release A — Make it mine (recommended MVP)

1. Pure world/plot/layout model and migration.
2. Panoramic browse scene and accessible interaction overlay.
3. Decorate mode, inventory, undo/cancel, and auto-arrange.
4. Welcome Lantern onboarding.
5. Focused Street Shop, truthful preview, Buy & Place.
6. Behavior metadata, tap responses, and clear tier previews.
7. Sync merge changes, analytics contract, responsive/offline/accessibility gates.

### Release B — Make it alive

1. Saved layouts (up to three).
2. Wishlist/coin goal.
3. First-daily-quest visitor moment.
4. Cosmetic set-completion banner.
5. Measure and tune plot distribution, prices, and descriptions; do not add
   catalog volume until activation and repeat value are understood.

### Release C — Make it shareable

1. Street postcard export using the existing share/fallback architecture.
2. Optional inspiration/friend layer only after privacy and moderation design.
3. New districts/backgrounds when item volume justifies expansion.

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The feature becomes a full building game. | Typed plots, no resize/rotation, and phased scope. |
| Players dislike losing today's automatic display. | Deterministic migration places all current items when possible; Auto-arrange remains one tap; inventory clearly reports every unplaced owned item. |
| Pan/swipe conflicts with page scrolling. | Native horizontal snap inside a bounded viewport, explicit paging buttons, vertical page scroll outside it, device testing. |
| Canvas remains inaccessible. | DOM interaction layer with large plot targets, names, focus, and tap/keyboard alternatives. |
| Cloud sync overwrites arrangement. | Separate preference-dirty baseline; ownership/tier additive fold remains unchanged; normalize after merge. |
| Larger canvas causes memory/jank. | Reuse 1024×512 source dimensions, cap DPR, animate only visible effects, stop hidden loops. |
| More attractive items become manipulative monetization. | No power, gacha, debt, mystery odds, or exclusive learning access; preview is free and truthful; return dates remain visible. |
| Tier differences still feel generic. | Preview actual behavior at every tier; use family-specific ambient overlays instead of scale alone; art variants are optional polish. |

## 16. Approved owner decisions

The owner approved the recommended Release A defaults on 2026-07-22:

1. **Welcome item:** approve the earn-only Welcome Lantern using the current
   sprite + ribbon overlay: **approved.**
2. **Panoramic scope:** use the current 1024×512 art as two portrait sections?
   **approved; no new background art for MVP.**
3. **Placement complexity:** typed plots with tap placement, no resize/rotation?
   **approved.**
4. **Existing layouts:** migrate and auto-place all owned items where possible,
   with overflow in inventory: **approved.**
5. **Set completion:** progress only in Release A, cosmetic reward in Release B:
   **approved.**

## 17. Implementation record

Release A now includes the versioned 18-plot layout model, deterministic legacy
migration, independent cloud preference merge, two-section panoramic renderer,
tap-first editor, storage/undo/auto-arrange, Welcome Lantern coach, focused
Street Shop, in-scene tier preview, Buy & Place, interaction metadata and
effects, English/Thai copy, DOM accessibility overlay, reduced-motion behavior,
and consent-gated Street funnel events.

Automated validation covers layout normalization and migration, all-item
auto-arrange, place/move/store/swap rules, sync conflict behavior, localization
coverage, analytics allowlisting, the full application test suite, lint, asset
validation, and production bundle generation. Physical-device usability and
the user study in §12.4 remain rollout gates rather than code-completion gates.

## 18. Research sources

Research reviewed 2026-07-22. Product examples describe patterns, not proof that
the same outcome will occur in Lucky Cat HSK.

- Kim et al., “Is it a sense of autonomy, control, or attachment? Exploring the
  effects of in-game customization on game enjoyment,” *Computers in Human
  Behavior* (2015): <https://doi.org/10.1016/j.chb.2015.02.011>
- Birk et al., “Fostering Intrinsic Motivation through Avatar Identification in
  Digital Games,” CHI 2016: <https://doi.org/10.1145/2858036.2858062>
- Nintendo, *Animal Crossing: Pocket Camp Complete* — arrange furniture, invite
  visitors, and save layouts:
  <https://www.nintendo.com/en-gb/Games/Smart-device-games/Animal-Crossing-Pocket-Camp-Complete-2711347.html>
- Finch Help Center, completing goals earns Energy or Rainbow Stones:
  <https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals>
- Finch Help Center, furniture shop and activity-earned currency:
  <https://help.finchcare.com/hc/en-us/articles/37935977276813-Shops-in-Finch-Outfits-Travel-and-More>
- Study Bunny official tutorial — study-earned coins, pre-purchase preview,
  add/remove, placement, and safe ownership:
  <https://superbyte.site/tutorial>
- Palia, Patch 0.181 — Dream Home inspiration and growable decoration rewards:
  <https://palia.com/news/patch-181>
- W3C, WCAG 2.2 Understanding 2.5.7 Dragging Movements:
  <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html>
- W3C, WCAG 2.2 Understanding 2.5.8 Target Size (Minimum):
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- Apple Developer, UI Design Dos and Don'ts — 44×44 point touch targets:
  <https://developer.apple.com/design/tips/>
