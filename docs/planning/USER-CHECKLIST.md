# Your Checklist — v2 launch (things only you can do)

*Track your part here — tick boxes as you go. Claude's technical status lives in [V2-EXECUTION-PLAN.md](V2-EXECUTION-PLAN.md); the art spec is [ART-BRIEF.md](../art/ART-BRIEF.md).*

> **Why local ≠ GitHub right now:** the v2 upgrade (wallet/shop, smart review, bosses, daily streak) exists only in your local working folder — it was never committed or pushed. GitHub Pages still serves the last push from 2026-07-03 (v1 + session-length picker). They will match again after step 2 below.

## 1. Playtest v2 locally — before anything ships

Open `game/index.html` directly (or `npm run serve` → http://localhost:8000).

- [ ] Play a 20-word battle → results show "+N 🪙 banked"; home screen wallet chip goes up.
- [ ] Shop: buy the cheapest skin (Midnight, 500 🪙), equip it → battle cats visibly change color.
- [ ] Equip a backdrop → battle background changes; word banner still readable.
- [ ] Reach the 10th word of a round → bigger gold-aura boss appears, banner shows "？？" on its second (pick-the-hanzi) question, kill pays big.
- [ ] Answer some words wrong on purpose → "🎯 Smart Review" button lights up with a count; playing it serves those words.
- [ ] Home streak chip counts up ("🔥 0 · 12/20 today") and flips to "✅ today" after 20 words.
- [ ] Progress screen: mastery bars per level + "Needs work" list with working 🔊 / Review / Fight buttons.
- [ ] Note anything that feels wrong here: ______________________

## 2. Tell Claude to commit & push (this is the deploy)

- [ ] Say "commit and push v2" → push to `main` auto-runs tests and deploys to GitHub Pages.
- [ ] After ~2 min, hard-refresh the GitHub Pages site (Ctrl+F5). Installed PWA / phone: close and reopen twice — the v5 cache bump makes it self-update on the second open.
- [ ] Confirm the live site now matches local.

## 3. Next-day check (needs a real calendar day — can't be automated)

- [ ] Tomorrow: play to 20 words → streak chip should show "🔥 2". Skip a day later and confirm it resets.
- [ ] Also tomorrow: mastered words from today should start reappearing in Smart Review after their due interval (1 day for newly mastered).

## 4. Artwork (optional, whenever you want — game works without it)

Per [ART-BRIEF.md](../art/ART-BRIEF.md): create or commission, then hand the PNGs to Claude to wire in.

## 5. Playtest — pinyin toggle + one-shot audio (2026-07-06)

- [ ] In a battle, tap the new **pinyin** button in the top bar (next to the sound buttons) → the pinyin line under the word disappears and the word card re-centers with no clipping. Tap again → it returns.
- [ ] Quit to home, start a new battle → your pinyin on/off choice stuck.
- [ ] Flashcards still show pinyin on both faces (the toggle is battle-only, on purpose).
- [ ] Each word is spoken **once**, when it walks in — no second playback when you tap the correct answer.

- [ ] 4 cat skins (Midnight / Sakura / Jade / Gold) — priority HIGH
- [ ] 3 battle backdrops (Night Market / Temple Dawn / Bamboo) — priority HIGH
- [ ] Boss cat sprite — MEDIUM
- [ ] Shop + streak icons — LOW

## 5. Android release (after the web version is confirmed live & good)

- [ ] Ask Claude to run `cap:sync` + `apk:release` (needs your signing keystore available).
- [ ] Install the APK on your phone; repeat the section-1 playtest.
- [ ] Decide: Google Play update now, or wait for real artwork (section 4)?

## 6. Playtest v3 "Lucky Cat Grows" (local, before its deploy)

v2 is already live (deployed 2026-07-04). v3 (quests, effects, cat growth) is built locally and waits for your test:

- [ ] Home shows a quest panel with 3 daily quests; completing one pays coins instantly and shows "🎯 Quest complete" on results.
- [ ] Correct answers: coins spray from the kill, "×N 🔥" floats up at combo ≥3, firework ring at ×10, mascot hops.
- [ ] Finish a round with zero misses → "🌟 Perfect!" banner + bonus coins.
- [ ] Home shows "🐱 Lv N"; Progress screen has the XP bar + next milestone.
- [ ] Milestone check without grinding: open `index.html#debug`, in the browser console run `__grantXp(250)` (→Lv5 scarf), `__grantXp(11000)` (→Lv30 kitten follows in battle), `__grantXp(20000)` (→Lv50 crown). Accessories should show on any equipped skin too.
- [ ] Tomorrow: quests are 3 (usually different) new ones and progress reset.
- [ ] Happy? Say "ship v3" → commit + push + deploy.

## 7. Playtest v4 "Lucky Cat Street" (local, before its deploy)

v3 is live. v4 (street + effect/sound packs + decorations) is built locally and waits for your test. Open `game/index.html` directly or `npm run serve` → http://localhost:8000.

- [ ] Home shows the street strip under the pills: fresh profile = cat alone + "grows as you learn · Next: Lv 5 — Lantern Post".
- [ ] Grind-free street check: open `index.html#debug`, console `__grantXp(250)` → Lantern Post appears instantly; `__grantXp(1000)` → Coin Bank; caption counts "2/5 buildings".
- [ ] Shop has three new sections (Effects / Sounds / Street decorations). Buy Red Lantern (800 🪙) → it's on the street the moment you return home.
- [ ] Buy + equip Sakura Petals → kills burst into slow-falling pink petals; unequip (buy nothing) → gold coins are back. Firecrackers → louder red/spark pop.
- [ ] Buy + equip Temple Bells → kill/wrong/bite/combo all sound softer and bell-like; Arcade → chippy retro bleeps. Default stays free.
- [ ] Old save sanity: your existing wallet/skins/streak/level all still there after the update.
- [ ] file:// open still works (no blank screen).
- [ ] Happy? Say "ship v4" → commit + push + deploy.

## 9. Playtest — Visual Slice v1 (PRD home + battle rebuild, 2026-07-06)

Branch `feat/prd-visual-slice-v1` (PR to `development`). Test on `npm run serve` → http://localhost:8000 (canonical dev check — file:// works too).

- [ ] Home: new layout — avatar + Lv/XP capsule and coin capsule up top, LUCKY CAT · HSK title, reading cat hero, Study Streak card, big yellow **START**.
- [ ] **START starts a battle immediately** with your last scope; the chip beside it (e.g. "HSK3 · 20 words") opens the old scope screen; changes there are reflected on the chip when you come back.
- [ ] Bottom nav: Home / Street / Progress / Quests / More all switch screens; nav disappears during battle and flashcards. Sound toggle + language now live in **More**.
- [ ] Battle: HUD is hearts · blue "Round 1/20" capsule · coins · **pause**. Pause freezes everything (raccoon stops mid-step), toggles for sound/word-audio/pinyin are in the overlay, Resume continues the SAME word with no time lost, Quit exits.
- [ ] Backgrounding the app/tab auto-pauses the battle.
- [ ] Enemy is now a **gray raccoon ninja** with a small HP bar; your cat (with any equipped skin + unlocked accessories + kitten) stands on the left and hops when you score. Boss raccoon at word 10: HP drops to half after its first question.
- [ ] Word plaque: pinyin sits ABOVE the hanzi; the meaning line under the hanzi is dashes until you answer, then fills in. Tap the plaque (speaker icon) → the word replays aloud.
- [ ] Answers are a 2×2 grid of cream buttons; correct flashes green with ✓, wrong flashes coral with ✕ and highlights the right one.
- [ ] Combo strip appears under the battlefield at combo ≥2 (COMBO n · fires · xN); at combo 10 a "CRITICAL!" burst fires.
- [ ] Fonts: the big hanzi should look like a serif/kai display face (not your system font) — also on a phone with no Chinese fonts installed.
- [ ] Old save sanity: wallet/skins/streak/level/mastery all intact.
- [ ] Grind-free checks: `index.html#debug` + console `__grantXp(11000)` → kitten beside your cat in battle.
- [ ] Replacement art (optional, whenever): generate per [GENERATION-PROMPTS-visual-slice.md](../art/GENERATION-PROMPTS-visual-slice.md) and drop the PNGs into `assets/` — same filenames, no code change.
- [ ] Happy? Merge the PR into `development`; the deploy to `main` (with SHELL bump) is a separate release step you trigger.

## Decisions parked with you

- When to deploy (section 2) — nothing goes live until you say so.
- Whether v2 ships to Play Store with programmatic art or waits for real art.
- Thai translations for long-tail words (old open item from the vocab pipeline — unrelated to v2 but still shows "* no Thai yet" in deep scopes).
