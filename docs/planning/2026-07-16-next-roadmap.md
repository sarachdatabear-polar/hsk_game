# Next roadmap decision — 2026-07-16

## Recommendation

**Do not start another large player feature yet.** Finish one integrated,
store-ready Android candidate first, start the owner-controlled Play closed-test
clock, and use the parallel engineering lane for an **HSK 3.0 compatibility
audit** rather than immediately replacing the current HSK 1–6 catalog.

This is the best sequence because the app is already feature-rich and locally
stable, while distribution, billing operations, native Thai approval, and
measurement are the real bottlenecks. Social or widget work would add surface
area without resolving any of those gates.

The content recommendation is deliberately an audit first. The official 2021
standard defines three stages and nine levels, and the current Chinese Test
Service site presents a “New HSK”/HSK 3.0 syllabus. However, its official 2026
calendar still lists HSK Levels 1–6 separately from Levels 7–9. That evidence
does not support the repo's old, stronger claim that HSK 2.0 simply disappears
in July 2026. Preserve existing learner progress until an official syllabus
mapping is proven.

Official references:

- [Chinese Proficiency Grading Standards announcement](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html)
- [Chinese Test Service — About the New HSK](https://www.chinesetest.cn/HSK)
- [Chinese Test Service — 2026 test calendar](https://admin.chinesetest.cn/gonewcontent.do?id=50278976)

## Ranked choices

Scores combine learning mission, urgency/unblocking value, ability to proceed
without an account, and delivery risk. They are decision aids, not analytics.

| Rank | Candidate | Score | Why now / why not |
|---:|---|---:|---|
| 1 | Integrated Android/store readiness | 95 | Converts finished work into a testable release and starts the 14-day owner-controlled gate. |
| 2 | HSK 3.0 compatibility audit | 86 | Protects the core learning promise; can be researched locally without changing saved progress. |
| 3 | Privacy-safe analytics readiness | 72 | Needed before retention claims can be measured, but provider/consent choices and live services need owner setup. |
| 4 | Android home-screen widget | 51 | Useful retention surface, but needs physical-device QA and adds native maintenance before distribution is settled. |
| 5 | Weekly friend quest | 44 | Potentially valuable after accounts and active users exist; requires social graph, privacy rules, abuse handling, and backend operations. |
| 6 | Public leaderboard/leagues | 28 | Highest moderation and motivational risk; conflicts with the project's kind-retention guardrails unless opt-in cohorts and safety are designed first. |

Ads, iOS, and subscriptions are not separate “next feature” choices. They are
business-platform tracks gated by owner accounts, consent/legal work, hardware,
and live-store validation.

## Recommended execution sequence

### R0 — integrate and freeze a release candidate

Engineering can do:

1. Merge the player-avatar, monetization-readiness, Thai-audit, roadmap, and
   documentation branches into one integration branch.
2. Resolve the single service-worker version for the combined release.
3. Run the full tests, build, asset validation, EN+TH responsive gates, and
   Capacitor sync once on the combined tree.
4. Produce a final source commit and Windows build command/checklist.

Owner gates retained:

- native Thai speaker signs off the 362-string review queue;
- install/final acceptance of the newly integrated APK if no device bridge is
  available to the engineering environment;
- promotion/merge to release branches.

### R1 — start distribution and billing operations

Owner lane:

1. Create and verify the Google Play Console account and Android device.
2. Create `com.luckycat.hsk`, complete truthful developer/contact details, and
   open the required closed test when the account is eligible.
3. Create RevenueCat, register/link the four coin-pack products, and provide
   only the public Android SDK key to source configuration.
4. Apply/deploy the live Supabase purchase migration/function and store its
   bearer/HMAC secrets outside git.
5. Recruit and retain the required closed-test cohort for the full continuous
   test period shown by Play Console.

Engineering resumes automatically when those values/services exist:

- configure the public key;
- run grant/RLS/webhook replay smokes;
- test every pack, cancellation, pending payment, replay, kill/relaunch, and
  localized price on the closed track;
- keep Supporter dark until ads and its promised benefit exist.

### R2 — HSK 3.0 compatibility audit (parallel, no migration yet)

1. Archive the authoritative new syllabus/vocabulary source with provenance
   and license/usage notes.
2. Compare it with `product/by-level` and report, per level: overlap, additions,
   removals, level moves, character/grammar gaps, and current audio/Thai-gloss
   coverage.
3. Design a dual-taxonomy data model so existing HSK 1–6 scope keys, mastery,
   stickers, and saved sessions remain valid.
4. Build a small generated fixture and pure migration tests before touching the
   production word files.
5. Return to the owner with the measured size/copy implications and one of:
   dual catalog, staged new-HSK levels, or defer-until-exam rollout clarifies.

Do not relabel current exam-frequency rankings as HSK 3.0. They were derived
from the existing mock-exam corpus and must retain that provenance.

### R3 — measurement before the next retention feature

Define a minimal event contract for session start/completion, review recovery,
delayed recall, notification permission, D1/D7 return, and purchase funnel.
No event SDK or remote emission should activate until the owner selects the
service, approves the privacy/consent text, and the store Data Safety answers
match reality.

After real baseline data exists, choose between:

- **Widget** if return frequency is the main gap and Android users dominate.
- **Friend quest** if accounts are healthy and users explicitly ask to learn
  with friends.
- **More learning depth** (radicals/example sentences) if completion is healthy
  but mastery/recall is weak.

## Explicitly deferred

- Supporter/ad removal before ads exist.
- Public leaderboard or user search before moderation/report/block flows.
- A gem economy without a real learning-safe sink.
- iOS work before an Apple account, Mac/Xcode access, privacy labels, and a
  deliberate platform budget exist.
- Destructive HSK 1–6 → 3.0 save migration based only on marketing dates.

## Owner decision still required

The recommended default is **R0 → R1 while R2 runs in parallel**. The only
product decision needed is whether that remains the next roadmap, or whether
the owner intentionally prioritizes one of the lower-ranked alternatives.
