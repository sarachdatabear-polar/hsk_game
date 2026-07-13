# Jordan's live-audit round — 2026-07-11

Jordan self-audited live (v57) and dropped 9 findings + a new game icon
(`art-drop/lucky-cat-hsk-icon-game-match-1024.png`). His decisions supersede the
v51 street+quests merge. Goal: solve all items.

## Disposition

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | Home: Flashcards/Smart Review tiles "not in the box" | No overflow repro at 390/1280/1366/1440/1920 on v57 (suspect stale shell on his device). His remedy stands as a design call: **move Smart Review out of the quick row** → row becomes 3 tiles; Smart Review button moves to the Progress screen (natural home for review), keeping the locked/toast behavior. |
| 2 | Street: don't combine quests with street; scene should be big; cat too small | **Revert quests out of the street screen** (supersedes v51 merge, Jordan's call). Street scene gets the reclaimed height; street cat draw scale up (~+40%, mascot-bump precedent). Coin grant for testing = console snippet (no code change). |
| 3 | Quests → clickable popup | Quest button on Street opens an overlay popup (reuse overlay pattern) hosting the existing daily-quest + monthly rendering. No badge in v1. |
| 4 | Battle "on top, huge white space" | Not reproducible on v57 at any height (void ≤10px; canvas fills). Believed stale-shell artifact (pre-v48 symptom). Verify with Jordan post-release on a fresh shell; revisit with his screenshot if it persists. |
| 5 | Thai on choices not centered | Battle buttons measure centered on v57. Normalize `text-align:center` across ALL option-button variants (cloze/listening included) as a cheap guard; suspect stale shell otherwise. |
| 6 | Speaker icon on hanzi card necessary? | Remove the icon; whole card becomes the tap-to-replay surface (keeps the affordance, loses the clutter). |
| 7 | Raccoon "ghost" on defeat | Diagnosis worker; if a death-state sprite is missing → asset ask to Jordan (art-gated). |
| 8 | Audio sometimes missing on next word | Diagnosis worker; likely mp3↔TTS chain race. Fix in wave 2. |
| 9 | Audio-only format screen exceeds page | Diagnosis worker locates format + overflow; fix in wave 2. |
| + | New icon | Intake: resized copy into `assets/`, used on the More footer (replaces pwa icon there); raw archived per art convention. PWA launcher icons unchanged (not asked). |

## Waves

- **Wave 1 (design, no diagnosis dependency):** street revert + quest popup + cat
  scale (T1); quick-row 3-up + Smart Review to Progress (T2); hanzi-card replay +
  icon removal (T3); More footer icon swap + precache (T4); option-text centering
  guard (part of T3). Sweep: the scoped street-quests gate must be rewritten for
  the popup design.
- **Wave 2 (after diagnosis):** raccoon death visual, audio chain fix, audio-only
  fit — scoped by the diagnosis report.

Release: single cut at round end (SHELL v58) on Jordan's go.
