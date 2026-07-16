# UX/UI launch-readiness audit — 2026-07-16

## Verdict

The game is a strong release candidate after the v76 repair round, but it is
not authorized for public production yet. Local engineering gates are green;
the remaining blockers require native-language, signed-build, physical-device,
legal, and store acceptance.

Release path: `fix/release-readiness-audit` → review/merge to `development` →
signed/device/store gates → release PR from `development` to `main`.

## Findings closed in v76

| Area | Audit concern | Resolution |
|---|---|---|
| Onboarding | Defaulted to HSK3 and exposed only HSK1–4 | Defaults to HSK1, exposes HSK1–6, and gives a beginner hint |
| Question clarity | Generic prompt on non-meaning formats | Meaning, listen, reverse, tone, cloze, and typed prompts are explicit in EN/TH |
| Touch UI | Typed tone targets fell below 44px | Typed/tone controls enforce the 44px floor in portrait and landscape |
| Landscape | Flashcard verdict controls could be below the fold | Two-column no-scroll landscape layout with 45px action targets |
| Learning integrity | Cards could run to 400, did not resume, and allowed unflipped grading | Uses selected session length, persists/resumes, and locks verdicts until flip |
| Scope hierarchy | Primary Word Quest label could truncate | Primary action spans the row; secondary modes sit below |
| Accessibility | Zoom disabled; weak canvas semantics; incomplete state/dialog behavior | Zoom restored, dynamic canvas labels, button/group semantics, ARIA state, modal focus trap, Escape and focus return |
| Startup | 92 requests / 17.47 MiB and 83 eager images | Lazy sprite/optional art loading; measured 27 requests / 5.33 MiB before three additional hidden images were marked lazy |
| Offline install | 108-file / 18.50 MiB all-art shell and partial-install risk | Atomic 69-file / 9.52 MiB core; optional cosmetics cache on first use |
| Asset budgets | 15 street decorations exceeded 120 KB | All 15 are 32–105 KB and the budget is test-enforced |
| Android identity | Generated/default or retired NorthBear launcher/splash could ship | Tracked resources derived from the Lucky Cat PWA icon are reapplied after every Capacitor sync |
| Regression coverage | Main-screen sweep missed secondary screens and advanced formats | Permanent EN/TH matrix covers every major screen, formats, Results, resume, and dialog focus |

## Verification evidence

- `npm test`: 68 files / 1,916 tests pass.
- `npm run build`: production bundle succeeds.
- `npm run assets:validate`: 95 assets pass.
- `npm run cap:sync`: web staging, Capacitor plugins, and deterministic branding pass.
- Browser matrix: 10/10 EN and 10/10 TH viewports pass.
- Format probes: listen, reverse, tone, cloze, and typed pass on constrained
  portrait/landscape tiers with 44px+ controls.
- Results, card resume, dynamic canvas labels, modal focus trap/Escape/return,
  and offline cold launch pass.

## Remaining concerns before go-live

1. Native Thai review is not signed off; all 377 Thai values remain draft.
2. No v76 signed APK/AAB has been produced or accepted on emulator/physical
   Android hardware.
3. Real Play/RevenueCat purchases and backend grants require closed-track
   license-tester acceptance before activation.
4. Privacy policy, Data Safety, store listing, target audience, and other legal
   attestations remain owner-controlled work.
5. No production analytics provider is selected. The mechanics support habit
   formation, but “addictive” retention cannot be honestly claimed without
   consent-aware D1/D7 and learning-outcome measurement.
6. The seven known development-toolchain advisories should be handled in a
   separate dependency-upgrade branch; production dependencies audited clean
   during this audit.

The authoritative human checklist is [OWNER-ACTIONS.md](../OWNER-ACTIONS.md).
