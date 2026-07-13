# Cloud-Save (P3) — Pre-Design Scout Notes

_Read-only scout findings from 2026-07-10, gathered after the client-auth round (PR #74)
so the cloud-save design conversation starts from facts. No design decisions in here._

## The seam

- `store.get`/`store.set` (`src/main.js:58-61`) is the **sole write chokepoint** for every
  `nbhsk.*` key (grep-verified — no other write sites). Dirty-tracking/debounce hooks here.
- There is **no foreground reconcile point today**: the `visibilitychange` handler
  (`src/main.js:1267`) only has `document.hidden` branches (pause + streak reminder).
  Schema §6.3 assumes reconcile on foreground/sign-in/post-purchase — the "became visible"
  (or `online`/`focus`) edge is net-new work.
- The **cross-device merge moment** is the guest→email upgrade: post-`verifyCode` success
  (`src/main.js:518-524`, `accountUI.session` flip). An anonymous local row must reconcile
  with an existing cloud row exactly there. `cloud.js` today writes ONLY `profiles`.

## Key inventory (what would sync)

| Key | Shape | Writes | Merge rule needed |
|---|---|---|---|
| `nbhsk.mastery` | `{[hanzi]:{s,k,r,ls}}` | per answer | per-hanzi fold; r=streak, s/k=counts — nontrivial |
| `nbhsk.xp` | int | per answer | `max(local,cloud)` |
| `nbhsk.daily` | `{last,streak,today:{date,resolved},restWeek,restDay}` | per round | streak-chain rule — NOT blob LWW |
| `nbhsk.quests` | `{date,progress:{},done:[]}` | per answer | same-day map/list merge |
| `nbhsk.monthly` | `{month,done,claimed}` | per quest | counter accumulates — LWW undercounts |
| `nbhsk.wallet` | int | hottest (8 sites) | server-side `max`+daily cap (PRD §3.3 — NOT client) |
| `nbhsk.shop` | `{owned:[],skin,backdrop,effect,soundpack,tiers:{}}` | per purchase | `owned` set-union, `tiers` per-id max, slots LWW |
| `nbhsk.freezes` | int (cap 2) | per buy/consume | paid consumable — LWW can destroy paid inventory |
| `nbhsk.stickers` | `{earned:{id:date},queue:[]}` | per award | union, earliest date wins |
| `nbhsk.best` | `{[scopeKey·mode]:{score,date}}` | per new best | per-key `max(score)` |
| `nbhsk.locale` | string | per change | LWW-safe; already synced via `profiles.locale` |

Local-only by design (schema header, still accurate for what it names): `settings, sfx,
scope, scopeView, formatIntros, introDone`.

**No pure two-state merge functions exist anywhere** — the domain modules
(`mastery.js`, `daily.js`, `quests.js`, `shop.js`, `stickers.js`) are single-event
recorders. The reconcile layer is all-new code (a natural pure module + tests).

## Schema deltas required BEFORE the round (found by this scout)

1. **`nbhsk.monthly` has no schema home** — retention pack post-dates schema.sql. Add a
   column (or fold into `progress.quests` — design decision).
2. **`nbhsk.freezes` has no schema home** — ditto, and it's PAID inventory (must sync;
   arguably wallet-adjacent, service-role considerations if freezes ever become purchasable
   with real money — today they're coin-bought, so client-writable is fine).
3. **`progress.best` default is `'[]'::jsonb` but the code writes a keyed OBJECT**
   (`src/main.js:2187-2195`). Change default to `'{}'::jsonb`.

All three are idempotent ALTERs — bundle them into one schema.sql revision applied with
Jordan's named approval (the permission gate requires it for live DDL).

## Open design questions for Jordan (the brainstorm agenda)

1. Sync cadence: on foreground+sign-in+post-purchase only (schema's claim), or also
   debounced during play? (Write frequencies above size the debounce.)
2. Guest sync: do cloud guests (anonymous, pre-email) get progress sync, or only
   signed-in users? (Guests already have a uid + profiles row since PR #74.)
3. Restore UX: silent reconcile vs explicit "restore from cloud?" prompt on fresh installs.
4. Wallet: this round ships the server-side clamp (Edge Function/trigger — new surface),
   or defers wallet sync entirely and syncs progress-only first?
5. monthly/freezes schema shape (deltas above).
