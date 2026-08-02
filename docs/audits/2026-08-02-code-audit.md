# 2026-08-02 full code audit — findings and dispositions

Nine parallel review passes over the whole codebase (core rules, meta-game,
sync/cloud, monetization, platform/SW, main.js ×2, rendering/UI/i18n, plus an
architecture pass), every candidate finding re-verified against the source
before acting. Baseline: 114 files / 9,698 tests green on `development`.

17 real findings. 11 fixed on `fix/audit-2026-08-02` (regression-tested where
the module is pure). 6 deferred — each needs a product decision, a backend
migration, or infrastructure Jordan owns. The rendering/UI/i18n slice came
back clean (locale key parity, sprite frame math vs actual PNG widths, layout
clamps, onboarding transitions all verified).

## Fixed (11)

| # | Where | Bug |
|---|-------|-----|
| 1 | `distractors.js` | Two picked distractors could render identical glosses (但/却 both "but; yet"; ≈1/1,240 questions on an HSK1 scope). Candidates now also checked against each other, with the widening ladder preserved. |
| 2 | `main.js` `noteDaily` | Persisted `daily` shape dropped `restNoteDay`, so the "🍵 rest day used" acknowledgment could never fire — the free-rest streak save was silent. |
| 3 | `merge.js` `mergeShop` | Union-merge resurrected the 15 retired Street decoration ids from pre-migration cloud rows, re-cementing them forever. Now pruned post-union (list inlined on purpose, like the migration). |
| 4 | `analytics/index.js` `flush` | A send failing after `setConsent(false)` re-enqueued the drained batch, resurrecting pre-revocation events (with the old anon id) that would transmit if consent was re-enabled. |
| 5 | `main.js` `openDialog` | Not re-entrant: double-open of the same dialog (double-tap Supporter CTA during the web-billing chunk fetch) corrupted sibling `aria-hidden` bookkeeping, leaving the whole app `aria-hidden="true"` for assistive tech after close. |
| 6 | `main.js` resume recovery | Backgrounding during the onboarding first-word guide → resume popped a blank `#format-intro` (`showFormatIntro(null)`) and the guide's remaining cards were lost. Recovery now re-shows the guide; the format path requires a truthy intro key. |
| 7 | `main.js` `drawWordPlate` | A resolved word's pinyin stayed hidden when Show Pinyin was off — a typed-format timeout never revealed the correct reading anywhere, contradicting `bite()`'s own unmask contract. Revealed ⇒ pinyin shows. |
| 8 | `main.js` visibilitychange | `analyticsSessionStart` never reset on foreground, so every `session_complete` after the first measured from boot — over-reported durations. |
| 9 | `main.js` `ensureWebBilling` | Fallback `getProvider` call omitted the `stripe:` deps block; if both web-billing keys were ever set it would rebuild a Stripe provider on stub deps (`isAnonymous` always true → every purchase "needs-account"). Both call sites now share one opts builder. |
| 10 | `main.js` `iapBuy` | `prov.restore()` ran in the purchase's outer try; a restore fault reclassified an already-delivered purchase as failed (toast + contradictory `purchase_fail` after `purchase_success`). Now isolated, matching `checkout-return.js`. |
| 11 | `sw.js` | RUNTIME cache had no eviction bound (AUDIO has one); long-lived installs grew it until the next CACHE_VERSION bump. FIFO trim added; SHELL bumped. |

## Deferred (6) — need Jordan / backend / infra

1. **Sync push has no optimistic concurrency (the audit's headline).**
   `pushSyncRows` is a blind upsert; two devices reconciling in the same
   fetch→push window last-write-win each other. Verified real, but
   *self-healing for every union-merged field* — the losing device's local
   copy re-folds on its next reconcile. Permanent loss needs the losing device
   to never sync again, or hits only LWW preference fields. Proper fix is a
   `version` (or `updated_at` compare-and-swap) column on `progress`/`wallet`
   + retry-on-conflict in `reconcile` — a Supabase migration, deliberately not
   bolted on the day after live billing went up. Recommend scheduling with the
   next schema migration.
2. **Ledger cursor has no tiebreaker.** `created_at > cursor` with the cursor
   set to max-seen; two rows sharing a timestamp where only one was visible at
   fetch time can skip a credit (mostly re-covered later by the max-fold, and
   probability is tiny). Fix belongs with #1: compound cursor
   `(created_at, id)` — touches THE FOLD invariants, so it needs its own
   review, not a drive-by.
3. **`restoreFrom` can never un-set `supporter`.** Deliberate and pinned by
   test today, and blast radius is zero while ads aren't shipped — but it
   doubles as a permanent local ad-free bypass (and blocks refund revocation)
   the day interstitials gate on `isSupporter`. Decide before ads land:
   server-authoritative restore vs OR-merge.
4. **Mastery merge trusts client clocks.** `mergeMastery` follows the larger
   client `ls`; a device with a fast clock can revert a genuinely-mastered
   word (tested, deliberate LWW). Any defense (server-stamped times, r-max
   when either side ≥ 3) changes tested semantics — Jordan's call.
5. **Cat Journey background preference: same clock-trust issue** on
   `selectedBackgroundAt` (pure LWW on client `Date.now()`).
6. **Native remote audio never becomes offline-cacheable.** Capacitor origin
   ≠ `luckycathsk.com`, media fetches are no-cors → opaque → the SW's
   `status===200` gate rejects them (correctly: opaque entries also carry a
   ~7 MB quota padding each, so caching them is the wrong move). Real fix is
   CORS headers on the audio host (Cloudflare rule:
   `Access-Control-Allow-Origin` on `/audio/*`) + `crossorigin` on the media
   fetch; until then "offline after first play" holds for web/PWA only.

## Architecture verdict (separate pass)

Sound for a solo dev shipping weekly; no rewrite warranted. 94 modules, zero
circular imports; the pure-logic/DOM split is real and enforced; merge/sync
and the provider seam are unusually well-documented. The debt is bounded and
known: `main.js` (4,618 LOC) carries the three pre-convention surfaces —
battle loop (~2075–3788), shop/IAP wiring, account screen — which is exactly
where the fix-commit history clusters (stale in-memory-cache rehydration and
pause/resume timing are the two repeated regression classes). Standing
recommendations, in order of value:

1. When next touching the battle loop, extract the pause/resume/timing state
   transitions into a pure `battle-clock.js` with tests — the second-biggest
   regression source, currently untestable.
2. Keep applying the `ui/<feature>-screen.js` convention retroactively when a
   legacy surface is touched (shop wiring first; its pure half already lives
   in `src/monetization/`).
3. Consider a CI guard that flags asset-affecting changes without a SHELL
   bump — sw.js is the top fix-commit source per line of code.
