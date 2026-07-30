# Lucky Cat HSK — Full Feature and Shop Audit

**Audit date:** 2026-07-30  
**Repository:** `/root/work/HSK/game`  
**Commit audited:** `1617e2c9` (`main`, release v133)  
**Audited product mode:** Cat Journey enabled by default, with the preserved Street rollback mode also tested

**Remediation update:** The user-journey improvements described by findings S1
and S2 were implemented after the audit in the current working tree. The
updated shell is staged as v134 and passes 9,825 tests plus the full English
and Thai browser gates.

## Executive summary

The game is broadly healthy. The production build, lint, asset validation, all
9,825 automated tests, and the complete English and Thai browser regression
matrices passed. No uncaught browser error was observed in the tested flows.

All 36 shop catalog entries were exercised:

- 20 reusable, currently player-facing items rendered and equipped successfully.
- Streak Freeze purchased twice and correctly stopped at its cap of two.
- All 15 Street decorations were confirmed hidden in the default Cat Journey
  product, then rendered and previewed successfully in the preserved Street
  rollback mode.

The main audit finding was product-state debt around those 15 legacy decorations. Their
implementation still works, but normal players cannot reach or obtain them while
Cat Journey is enabled. It originally created two player-visible inconsistencies:

1. Today's Stock rotated the hidden decorations before filtering them out.
2. Profile Collection counted 15 inaccessible decorations.

Both inconsistencies are now fixed: Cat Journey receives three valid daily
picks, and a fresh player's achievable Collection target is 20. Street and old
saves remain intact.

## Verification results

| Check | Result |
|---|---|
| `npm test` | PASS — 113 files, 9,825 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run assets:validate` | PASS — 134 manifest assets |
| English browser QA | PASS — 10/10 viewports |
| Thai browser QA | PASS — 10/10 viewports |
| Listen-format browser probes | PASS — 2/2 per language |
| Advanced formats | PASS — reverse, tone, cloze, typed at portrait and landscape sizes |
| Results screen | PASS — 3/3 sizes per language |
| First-run Welcome | PASS — 2/2 landscape sizes per language |
| Cards resume | PASS in English and Thai |
| Accessibility probe | PASS — current nav, modal focus trap/return, dynamic canvas label |
| Cat Journey | PASS — 3/3 sizes per language |
| Legacy Street Project | PASS in English and Thai |
| Focused shop audit | PASS — all 36 catalog entries exercised |
| Profile/social/detail smoke | PASS — rename, avatar ownership, QR invite/compare/recents, word detail |
| Working tree after tests | Clean before this report; builds produced no source drift |

The browser matrix covers 320×568, 344×882, 360×640, 360×800,
390×844, 412×915, 640×360, 844×390, 768×1024, and 1280×800.

## Feature inventory and status

### Learning and gameplay

| Feature | What the game provides | Audit result |
|---|---|---|
| First-run onboarding | English/Thai choice, HSK1–6 starting level, six-card warm-up followed by a short Word Quest | PASS — logic tests and Welcome browser probes |
| Vocabulary scope | HSK1–6, HSK1–3/4–6/1–6 presets, high-yield, new-only, top 100/300/500/all | PASS — pool/session tests and browser screen sweep |
| Meaning language | English, Thai, or both | PASS — i18n/pool tests and EN/TH browser runs |
| Session selection | 20, 40, 100, custom 5–500, and Endless | PASS — normalization and screen tests |
| Flashcards | Flip card, pronunciation, Still Learning, Know It, repeat weak cards | PASS |
| Resumable Cards | Bounded saved sessions with remaining-count CTA | PASS — browser resume probe in both languages |
| Card examples | Chinese example, translated example, example audio | PASS — data and example-selection tests |
| Word detail | Hanzi, pinyin, English, Thai, HSK level/tier, exam frequency, HSK 3.0 band, example | PASS — focused browser smoke and pure view-model tests |
| Word Quest | Continuous Lantern Trail battle loop with 4 choices, progress, pause/resume/quit | PASS — browser and quest-session tests |
| Meaning format | Choose the meaning | PASS |
| Listen format | Hear a word and choose its meaning | PASS — dedicated responsive probes |
| Reverse format | Meaning to Hanzi | PASS — portrait and landscape |
| Tone format | Choose correct pinyin/tone | PASS — portrait and landscape |
| Cloze format | Choose the word completing a sentence | PASS — data and browser probes |
| Typed-pinyin format | Type letters and choose syllable tones | PASS — pinyin and browser probes |
| Format mastery ladder | Advanced formats unlock according to mastery | PASS — format registry/selection tests |
| Distractors | Three nearby wrong choices; same-meaning overlap excluded | PASS — unit tests |
| Timer and interruption | Static per-format timer; pause, background, and audio-interruption guards | PASS in automated/browser coverage; real device interruption remains a manual boundary |
| Lucky Flow/combo | Combo multiplier, HUD fire states, visual feedback | PASS — scoring/HUD/FX tests and browser battle |
| Review Pouch/SRS | Missed and weak words return; smart review weights due/weak words | PASS — SRS and quest-session tests |
| Review Challenge | Single-stage checkpoint challenge | PASS — boss/quest-session tests and results flow |
| Results postcard | Accuracy, attempts, lanterns, rewards, missed words, retry/review/play again | PASS — 3 sizes in both languages |
| Tone Trainer | Ten-question listening minigame, replay, tone choices, light rewards | PASS — tone logic tests and screen sweep |
| Best Sessions | Per-scope best scores and empty-state play action | PASS — profile/scoring tests and screen sweep |

### Progression and retention

| Feature | What the game provides | Audit result |
|---|---|---|
| Mastery | Per-word answers and streak; three correct recalls marks mastered | PASS |
| XP and levels | XP curve, level-ups, milestones, kitten companion | PASS |
| Coins | Earned rewards and persistent wallet | PASS |
| Daily goal | Resolved-word goal progress | PASS |
| Study streak | Local-date streak tracking, travel/clock guards | PASS |
| Kind rest days | Weekly rest-day behavior and return acknowledgement | PASS |
| Streak Freeze | Purchasable consumable, max two, automatically protects eligible gaps | PASS — purchased to cap in browser; gap logic unit-tested |
| Re-engagement reminders | Same-day saver, day-three return, and Cat Journey return plans | PASS at pure/native bridge level; notification delivery needs a device |
| Daily quests | Three deterministic date-hashed quests and progress events | PASS |
| Monthly quest | Monthly progress and claim behavior | PASS |
| Quest reward policy | Coins/rewards protected from retry farming | PASS |
| Stickers | Earn-only awards from scope/progress facts | PASS |
| Sticker Album | Next, earned, HSK1–6, and event filters | PASS — rules and screen sweep |

### Cat Journey and legacy Street

| Feature | What the game provides | Audit result |
|---|---|---|
| Cat Journey home | Daily readiness status, Cat Bond, progress, CTA state | PASS |
| Exploration | Send the cat after completing the daily goal | PASS |
| Return and claim | Timed return, story/keepsake claim, permanent history | PASS |
| Memories | Word-linked memory cards, older-memory expansion, audio | PASS |
| Journey backgrounds | Selectable persistent backgrounds | PASS |
| Journey cloud merge | Additive claim/history/bond merge | PASS in unit/integration tests; real two-device acceptance remains external |
| Street rollback | `nbhsk.features.catJourney=false` safely restores Street | PASS |
| Street decorating | Place/store items, undo, auto-arrange, filters | PASS in rollback-mode browser and module tests |
| Saved layouts | Three layout slots and overwrite confirmation | PASS in module tests/screen coverage |
| Street Projects | Select target, reserve coins, build progress, buy/place | PASS — full browser project flow |
| Decoration tiers | Three tiers with upgrade pricing | PASS |
| Street Collection | Sets and completion state | PASS |
| Keepsakes | Welcome, daily, set, neighbour, and word-linked keepsakes | PASS |
| Neighbours/resident | Move-ins, routes, poses, daily street surprise | PASS |
| Street naming/charm | Editable name, charm score/rank, collection count | PASS |

Street is functioning compatibility code, not part of the default player path.
It should therefore be described as **legacy but operational**, not broken.

### Profile, social, settings, and platform

| Feature | What the game provides | Audit result |
|---|---|---|
| Profile dashboard | Name, avatar, level/XP, streak, coins, mastered/seen/sticker/best stats | PASS |
| Profile tabs | Overview, Progress, Collection | PASS |
| Profile editing | Unicode-safe display name and persistent avatar | PASS — focused browser smoke |
| Avatar picker | Monogram, default cat, owned skin avatars, locked skins, local gallery photo | PASS for monogram/skin ownership; real gallery intake remains device/browser dependent |
| Needs Work | Tappable weak words, Cards review, Word Quest practice | PASS |
| Smart Review | Due/weak deck CTA | PASS |
| Friend invite | LCH3 code, share link, QR, local comparison | PASS — focused browser smoke |
| Recent friends | Last-five local list, freshness, clear action | PASS |
| Account | Local/guest/signed-in views, email OTP upgrade, sign-out | PASS in mocked integration and screen tests; live email delivery not exercised |
| Cloud save | Profile/progress/wallet/shop/daily/quest/Journey reconciliation | PASS in integration tests; live cross-device session not exercised |
| Delete account | Authorized cloud deletion flow | PASS in mocked/server-function tests; no production account was deleted |
| English/Thai UI | Full key parity and placeholder integrity | PASS |
| Audio | Bundled MP3, Web Speech fallback, native TTS, unlock/retry, volume | PASS in module tests and browser UI; audible quality requires ears/device |
| Sound effects | Enable/disable and volume, selectable sound packs | PASS |
| Analytics consent | Off by default, queued anonymous events only after opt-in | PASS in module tests and screen coverage |
| Crash log | Throttled 30-entry local uncaught-error ring | PASS |
| Storage/migrations | Namespaced safe store and seven-version migration ladder | PASS |
| Accessibility | 44 px controls, ARIA dialogs, focus trap/return, dynamic canvas label | PASS in browser probe |
| Responsive UI | Phone, foldable, landscape, tablet, desktop | PASS in EN and TH |
| PWA/offline | Manifest, service worker v134, atomic shell, runtime/audio caches | PASS in build/static/service-worker tests |
| `file://` fallback | No-server data/audio degradation path | PASS in static/unit coverage; not re-driven manually in this audit |
| Android bridges | Back handling, haptics, keep-awake, TTS, notifications, branding | PASS in module/static tests; no APK was built because release signing is Windows/keystore-bound |

### Content currently bundled

| Content | Count/status |
|---|---|
| HSK level records | 21,869 total records across the six level bundles |
| HSK1 | 205 |
| HSK2 | 479 |
| HSK3 | 1,349 |
| HSK4 | 3,337 |
| HSK5 | 6,491 |
| HSK6 | 10,008 |
| Example mappings | 7,120 |
| Cloze mappings | 495 |
| Indexed MP3 pronunciations | 2,125 |

The six level bundles are cumulative/overlapping by design; gameplay pool
building de-duplicates the selected levels.

## Shop audit

### Catalog totals

| Type | Count | Default Cat Journey status |
|---|---:|---|
| Cat skins | 6 | Active |
| Quest backdrops | 8 | Active |
| Effects | 3 | Active |
| Sound packs | 3 | Active |
| Streak Freeze | 1 | Active |
| Street decorations | 15 | Hidden/legacy |
| **Total** | **36** | **21 active, 15 legacy** |

### Active items verified

**Cat skins:** Panda, Ninja, Astronaut, Beach Cat, Mooncake Rabbit, Dragon.

**Quest backdrops:** Night Market, Temple Dawn, Bamboo, Harbor Night, Snow
Festival, Island Sunset, Lantern Festival, Dragon Gate.

**Effects:** Sakura Petals, Firecrackers, Star Shower.

**Sound packs:** Temple Bells, Arcade, Lion Dance Drum.

**Consumable:** Streak Freeze.

Each of the 20 reusable items rendered in the default Shop, accepted the Equip
action, and persisted into the correct `shop` slot. Registry tests also verify
that every skin has walk/happy art, every backdrop has a registered scene,
every sound pack has an SFX pack, and every effect changes the reward burst.

Streak Freeze was bought from zero to one and then two; wallet/count persisted
and the button disabled at the cap.

### Legacy decoration items

These 15 items are not reachable in the normal Cat Journey product:

1. Red Lantern
2. Noodle Stall
3. Tea Sign
4. Foo Dog
5. Golden Arch
6. Mahjong Table
7. Koi Pond
8. Drum Tower
9. Bubble Tea Stand
10. Paper Umbrella
11. Goldfish Banner
12. Neon Cat Sign
13. Shaved-Ice Cart
14. Mooncake Stall
15. Firecracker Arch

They are explicitly filtered from Today's Stock, Season Corner, the permanent
catalog, and the Street shelf when Cat Journey is enabled. In rollback mode,
all 15 rendered and their Street preview opened and closed successfully.

This means the items are **not dead code**, but they are **inactive legacy
content for default players**.

### Finding S1 — Today's Stock was empty every other day

**Severity:** Medium  
**Status:** Resolved in the v134 working tree

The daily rotation chooses three IDs from a six-item pool containing four
legacy decorations, one sound pack, and one effect. The Cat Journey filter runs
after selection and does not backfill removed rows.

The deterministic pattern is:

| Date | Raw selection | Visible in default mode |
|---|---|---|
| 2026-07-30 | Bubble Tea, Paper Umbrella, Goldfish Banner | **Empty** |
| 2026-07-31 | Neon Cat Sign, Lion Dance Drum, Star Shower | Lion Dance Drum, Star Shower |
| 2026-08-01 | Bubble Tea, Paper Umbrella, Goldfish Banner | **Empty** |
| 2026-08-02 | Neon Cat Sign, Lion Dance Drum, Star Shower | Lion Dance Drum, Star Shower |

The two sets repeated, so the old shelf never contained three visible daily
items and was empty on alternating days.

**Implemented fix:** `catJourneyStock()` now rotates over currently obtainable,
unowned, non-Street cosmetics and backfills until three real choices are found.
The original Street rotation remains unchanged for rollback compatibility.

### Finding S2 — Profile Collection could not reach its displayed total

**Severity:** Medium  
**Status:** Resolved in the v134 working tree

`profileStats()` counts every non-consumable catalog item:

- 35 total cosmetics
- 15 are inaccessible legacy decorations
- 20 are obtainable in the default product

A new player who never enabled the rollback flag could therefore reach only
20/35, while Profile presented 35 as the completion target.

**Implemented fix:** default Cat Journey Profile now excludes unowned
decorations from both sides of the total. A returning player's already-owned
legacy decorations remain counted, so no saved progress is erased.

### Finding S3 — Legacy content still consumes maintenance and offline budget

**Severity:** Low  
**Status:** Technical/product debt

The 15 decoration PNGs occupy about 1.2 MiB. Most optional decoration art is
runtime-cached, but the service-worker shell still precaches the two legacy
Street backgrounds (about 559 KiB combined). `maneki.png` is also precached
(about 220 KiB) despite having no current runtime draw call.

Do not delete these assets independently: the rollback mode and old saved data
must first receive an explicit retirement/migration decision.

## Dark or externally gated capabilities

These implementations exist but are not currently normal live features:

- Coin packs and Supporter purchases are hidden until a real RevenueCat/web
  billing configuration is enabled.
- Interstitial frequency policy is implemented and tested but not wired to a
  live advertising provider.
- Analytics is off until the player explicitly opts in.
- Live OTP email delivery, production cloud reconciliation, real purchase
  settlement, notification delivery, haptics, TTS quality, and Android signing
  depend on external services or physical devices.

They should not be reported as fully end-to-end verified by this local audit.

## Remaining next actions

1. Decide whether Street is a permanent rollback surface or should eventually
   be retired.
2. If retiring Street, preserve old ownership/save migration first, then remove
   its catalog/UI/assets/tests in one controlled change.
3. Run the remaining physical-device checks before the next Android release:
   background/audio interruption, audible audio/SFX, notification delivery,
   haptics, gallery avatar intake, and real two-device cloud sync.

## Final verdict

Core learning, progression, Cat Journey, profile/social, content, PWA, and
default Shop functionality pass the available automated and browser gates.
The game is playable and stable in the audited environment.

Fifteen of 36 catalog entries remain legacy-only, but they no longer enter the
default daily shelf or make Collection completion impossible. The remaining
product decision is whether to retain or eventually retire the data-safe Street
rollback surface.
