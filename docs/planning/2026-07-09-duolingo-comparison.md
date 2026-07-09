# Duolingo vs Lucky Cat HSK — verified comparison & adoption list (2026-07-09)

Deep-research pass: 99 agents (search → fetch → 3-vote adversarial verification → synthesis).
Only claims that survived verification are used; refuted claims are listed explicitly because
they circulate widely and must NOT be cited.

## Headline

Duolingo's edge is almost entirely **engagement/retention/monetization infrastructure, not
pedagogy**. Nothing verified here requires content Lucky Cat HSK lacks. The adoption set
splits cleanly on one axis: **backend-free mechanics are buildable now**; the two
highest-measured-impact mechanics (leagues, friend streaks) are hard-gated on accounts and
belong behind the Supabase work.

## Verified findings (high confidence)

1. **Streak system is the retention workhorse.** Streak-saver notification (alert before a
   streak dies) + an *earnable* freeze economy (free users cap 2, up to 5 via loyalty tiers;
   freezes drop from chests/daily quests/milestones — not purchase-only) + silent
   no-confirmation freeze application + Friend Streaks (22% daily-completion lift; needs
   accounts). Result: DAU with a 7+day streak nearly **tripled to >half of all DAU**.
   *(Lenny's Newsletter — Head of Product, on the record; deconstructoroffun mechanics
   teardown; official Duolingo blog.)*
2. **Leagues/leaderboards are the single biggest measured lever**: weekly ~30-user leagues,
   Bronze→Diamond, matched by prior-week activity, promotion/demotion → **+17% total learning
   time, 3× highly-engaged users** (1h/day, 5d/wk). Requires accounts + backend. *(3-0
   verified, multiple independent sources.)*
3. **Monthly quest chaining**: the 3 daily quests chain into a monthly quest with a
   collectible badge — a mid-term goal loop above the daily streak. **No backend needed**;
   Lucky Cat has the daily layer (quests.js) but no monthly layer. *(3-0 verified.)*
4. **Monetization posture**: Duolingo deliberately moved paid features (Practice Hub, Explain
   My Answer) back to the free tier — taking a revenue hit to protect the free experience —
   and launched **opt-in rewarded video** (30s video → 30min unlimited Energy; Etsy/Universal
   as launch advertisers) as the ad growth format. *(3-0 verified, CPO interview + trade
   press.)* NOTE: the widely-repeated "Duolingo only shows ads after lessons" rule was
   **refuted 0-3** — don't design from it.

## Refuted / unsupported — do not cite

- **Both** claims that Duolingo's Chinese course is pedagogically weak for HSK (leaves
  learners ~A1; inadequate tone instruction) were **refuted on verification**. Our
  frequency-ranking + Tone Trainer story must be argued **on its own merits** (exam-prep
  utility), not against a "documented Duolingo gap".
- Viral retention stats (streak-freeze users' extra streak days; day-1 achievement retention
  lift; streak-wager D14 lift; "2.4× retention for 7+day streaks") — all refuted; they're
  blog-lore.
- Specific CURR figures (the "5× impact / +21%" numbers) did not survive the final
  verification pass — treat "retention >> acquisition" as directional only.
- Caveat on everything above: most surviving evidence is Duolingo self-reported (exec
  interviews/blogs) — fine for directional product bets, not ROI models.

## What Lucky Cat HSK already has at parity or better

SRS with weak/due decks, mastery streaks, multi-format recall (cloze, typed pinyin, tone
discrimination, listening), daily streak+goal, 3 daily quests, XP/levels, cosmetic economy
(shop/street/sticker album), offline-first. The gamified scaffolding is Duolingo-grade; the
gaps are the *social/notification/economy refinements* above it.

## Prioritized "good to have" (solo-dev scoped)

**Buildable now (no accounts, fits existing systems):**
1. **Streak-saver notification** — Capacitor local notification on Android (+ PWA where
   permitted): "your streak dies in N hours". The single highest-verified backend-free lever.
2. **Streak freeze economy** — earnable (quest rewards, milestones), capped at ~2, sold for
   coins in the shop, applied silently. Slots straight into wallet/shop/daily.js.
3. **Monthly quest layer** — chain the 3 dailies into a monthly meta-quest with a collectible
   badge (sticker-album page fits perfectly).
4. **Rewarded-video-first monetization** — reconsider the interstitial-first AdMob plan:
   Duolingo's own direction is opt-in rewarded video tied to a resource. Natural fits: coin
   doubler after battle, boss retry, streak freeze, temporary XP boost. The unwired
   `interstitial-policy.js` cap logic still applies (frequency-cap whatever format ships).
5. **Positioning copy** — pitch frequency-from-real-exams as an independent value prop.

**Queued behind Supabase accounts (do not attempt on localStorage):**
6. **Weekly leagues/leaderboards** — biggest measured effect; needs matched cohorts server-side.
7. **Friend streaks** — 22% completion lift; social graph needs accounts.

## Open questions (from the research pass)

- Any *verified* evidence of Duolingo Chinese/HSK weakness (would strengthen positioning)?
- Minimum viable leaderboard backend — is the lift worth the infra before monetization P0?
- Does monthly-quest-chaining move retention at indie scale (any small-app precedent)?
- What does rewarded-video-first look like inside the existing coin/shop economy?
