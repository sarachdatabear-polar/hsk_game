# Your Checklist — v2 launch (things only you can do)

*Track your part here — tick boxes as you go. Claude's technical status lives in [V2-EXECUTION-PLAN.md](V2-EXECUTION-PLAN.md); the art spec is [ART-BRIEF.md](ART-BRIEF.md).*

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

Per [ART-BRIEF.md](ART-BRIEF.md): create or commission, then hand the PNGs to Claude to wire in.

- [ ] 4 cat skins (Midnight / Sakura / Jade / Gold) — priority HIGH
- [ ] 3 battle backdrops (Night Market / Temple Dawn / Bamboo) — priority HIGH
- [ ] Boss cat sprite — MEDIUM
- [ ] Shop + streak icons — LOW

## 5. Android release (after the web version is confirmed live & good)

- [ ] Ask Claude to run `cap:sync` + `apk:release` (needs your signing keystore available).
- [ ] Install the APK on your phone; repeat the section-1 playtest.
- [ ] Decide: Google Play update now, or wait for real artwork (section 4)?

## Decisions parked with you

- When to deploy (section 2) — nothing goes live until you say so.
- Whether v2 ships to Play Store with programmatic art or waits for real art.
- Thai translations for long-tail words (old open item from the vocab pipeline — unrelated to v2 but still shows "* no Thai yet" in deep scopes).
