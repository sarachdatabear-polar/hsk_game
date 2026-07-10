# Cloud-Save Reconcile (P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any cloud session (guest or email) gets its `nbhsk.*` progress mirrored to Supabase and additively reconciled across devices at the edges (sign-in / foreground / online / hide / purchase), with the PRD §3.3 anti-cheat clamp as a Postgres trigger. (Design: `docs/planning/2026-07-10-cloud-save-design.md`.)

**Architecture:** Pure fold module `src/merge.js` (one merge function per synced key + `mergeAll`) + impure orchestrator `src/sync.js` (`reconcile`/`pushDirty`, never throws) + two row helpers added to `src/cloud.js` (the only file that touches supabase-js) + `main.js` wiring (dirty hook at the `store.set` chokepoint, five edges, re-hydration, Account "Last synced" line).

**Tech Stack:** Vanilla JS ES modules, `@supabase/supabase-js` (already bundled), vitest (node env), Supabase mgmt-API SQL for DDL, playwright-core probes.

## Global Constraints

- Game repo `/root/work/HSK/game`, branch `feat/cloud-save` off `development`. Never stage `game/` from the root repo.
- Never pipe `npm test` through tail/grep/head — the raw exit code gates every commit.
- Every new i18n key exists in BOTH `en` and `th` blocks of `src/i18n.js`; new TH lines get the trailing comment `   // TH: needs native review` (exact convention — see commit 90145c5).
- Boot/`file://` purity: no network calls, no console errors at module eval. Nothing in the new code runs at eval; the cloud client stays lazy.
- Cloud calls NEVER throw or reject — they resolve `{ok:false, reason}` (`src/cloud.js` house rule). `src/sync.js` inherits this contract.
- Do NOT commit `dist/app.js` in Tasks 1–5 (Task 6 rebuilds once). Do not bump `SHELL` (release cut does).
- Tests: vitest DEFAULT node environment (no vitest config; do not add one). Mock with hand-rolled fakes + `__setClientForTests` / `globalThis` stubs reset in `beforeEach` (see `test/cloud.test.js:1-36`), NOT `vi.mock`.
- The Supabase management token lives at `/root/.supabase-token`. NEVER print/echo/log its contents; pass it via `$(cat ...)` into an Authorization header only. Project ref: `eqsodiufgjecoqgxdisn`.
- Anti-cheat constants (design §1): daily earn cap **25000**, first-sync (INSERT) coins ceiling **100000**, freezes clamp **0–2**.
- Merge convention: first arg = local, second = cloud. Every merge function tolerates `null`/`undefined` on either side and returns a normalized value.

---

### Task 1: Schema revision — file edit + live apply + trigger verification

**Files:**
- Modify: `docs/supabase/schema.sql`

**Interfaces:**
- Produces (server-side, relied on by Tasks 4–5 and 7): `progress.monthly jsonb default '{}'`, `wallet.freezes integer default 0`, `progress.best` default `'{}'::jsonb`, trigger `wallet_guard` (BEFORE INSERT OR UPDATE on `public.wallet`).
- No JS interfaces.

- [ ] **Step 1: Edit `docs/supabase/schema.sql`**

(a) In the `create table if not exists public.progress` block, change the `best` line and add `monthly` after `quests`:

```sql
  quests     jsonb   not null default '{}'::jsonb,   -- nbhsk.quests   (daily quest progress)
  monthly    jsonb   not null default '{}'::jsonb,   -- nbhsk.monthly  (monthly quest counter, retention pack)
  best       jsonb   not null default '{}'::jsonb,   -- nbhsk.best     (best-session scores, keyed object)
```

(b) In the `create table if not exists public.wallet` block, add after `coins`:

```sql
  freezes           integer not null default 0,     -- nbhsk.freezes (paid consumable, cap 2)
```

(c) Append at the end of the file:

```sql
-- ---------------------------------------------------------------------------
-- Revision 2026-07-10 (cloud-save round, design doc §1). Idempotent ALTERs
-- for projects created from the original file, plus the anti-cheat guard.
-- ---------------------------------------------------------------------------
alter table public.progress add column if not exists monthly jsonb not null default '{}'::jsonb;
alter table public.wallet   add column if not exists freezes integer not null default 0;
alter table public.progress alter column best set default '{}'::jsonb;
update public.progress set best = '{}'::jsonb where best = '[]'::jsonb;

-- wallet_guard — PRD §3.3 server-side anti-cheat clamp.
--  * Only positive coin deltas count as earnings; spending is never penalized.
--  * UPDATE allowance = 25000/day × days since the row was last written
--    (edge-based sync legitimately delivers several offline days at once).
--  * INSERT (first-ever sync: account age proves nothing about a long-time
--    offline player) clamps coins to a lifetime-plausible 100000.
--  * freezes clamped 0–2 on both paths.
create or replace function public.wallet_guard()
returns trigger language plpgsql as $$
declare
  earn_cap       constant integer := 25000;
  first_sync_cap constant integer := 100000;
  allowance integer;
  delta     integer;
  days      integer;
begin
  new.freezes := least(greatest(coalesce(new.freezes, 0), 0), 2);
  new.coins   := greatest(coalesce(new.coins, 0), 0);
  if tg_op = 'INSERT' then
    new.coins := least(new.coins, first_sync_cap);
    new.earned_today := 0;
    new.earned_today_date := current_date;
    return new;
  end if;
  if old.earned_today_date < current_date then
    new.earned_today := 0;
  else
    new.earned_today := old.earned_today;
  end if;
  new.earned_today_date := current_date;
  delta := new.coins - old.coins;
  if delta > 0 then
    days := greatest(1, current_date - old.updated_at::date);
    allowance := greatest(earn_cap * days - new.earned_today, 0);
    if delta > allowance then
      delta := allowance;
      new.coins := old.coins + delta;
    end if;
    new.earned_today := new.earned_today + delta;
  end if;
  return new;
end;
$$;

drop trigger if exists wallet_guard on public.wallet;
create trigger wallet_guard before insert or update on public.wallet
  for each row execute function public.wallet_guard();
```

- [ ] **Step 2: Apply the revision live** (Jordan's approval given 2026-07-10, design §1)

Write the revision-section SQL (everything appended in Step 1c) to `$CLAUDE_JOB_DIR/tmp/schema-rev.sql`, then:

```bash
cd $CLAUDE_JOB_DIR/tmp
python3 - <<'EOF'
import json, pathlib
sql = pathlib.Path("schema-rev.sql").read_text()
pathlib.Path("payload.json").write_text(json.dumps({"query": sql}))
EOF
curl -sS -X POST "https://api.supabase.com/v1/projects/eqsodiufgjecoqgxdisn/database/query" \
  -H "Authorization: Bearer $(cat /root/.supabase-token)" \
  -H "Content-Type: application/json" --data @payload.json
```

Expected: `[]` (or empty result set), no `"error"` in the response.

- [ ] **Step 3: Verify columns + trigger exist**

Same curl pattern with payload query:

```sql
select column_name, column_default from information_schema.columns
 where table_schema='public' and table_name in ('progress','wallet')
   and column_name in ('monthly','freezes','best');
```

Expected: 3 rows — `monthly` default `'{}'::jsonb`, `freezes` default `0`, `best` default `'{}'::jsonb`. Then query `select tgname from pg_trigger where tgname='wallet_guard';` → 1 row.

- [ ] **Step 4: Trigger scenario tests** (same curl pattern, one query payload per scenario; use a real auth uid)

```sql
-- pick an existing test-orphan uid (FK requires auth.users)
select id from auth.users limit 1;
```

Call it `:uid` below (substitute literally into each payload).

| # | Scenario SQL | Expected |
|---|---|---|
| 1 | `delete from public.wallet where user_id=':uid'; insert into public.wallet (user_id, coins, freezes) values (':uid', 999999999, 9) returning coins, freezes, earned_today;` | `coins=100000, freezes=2, earned_today=0` |
| 2 | `update public.wallet set coins=coins+500 where user_id=':uid' returning coins, earned_today;` | `coins=100500, earned_today=500` |
| 3 | `update public.wallet set coins=coins+30000 where user_id=':uid' returning coins, earned_today;` | clamped: `earned_today=25000`, `coins=100000+25000=125000` |
| 4 | `update public.wallet set coins=coins-5000, freezes=1 where user_id=':uid' returning coins, earned_today, freezes;` | spend unpenalized: `coins=120000, earned_today=25000, freezes=1` |
| 5 | rollover: `alter table public.wallet disable trigger wallet_guard; alter table public.wallet disable trigger wallet_touch; update public.wallet set earned_today_date=current_date-1, updated_at=now()-interval '3 days' where user_id=':uid'; alter table public.wallet enable trigger wallet_guard; alter table public.wallet enable trigger wallet_touch; update public.wallet set coins=coins+60000 where user_id=':uid' returning coins, earned_today, earned_today_date;` | multi-day allowance 75000 admits it all: `coins=180000, earned_today=60000, earned_today_date=current_date` |
| 6 | cleanup: `delete from public.wallet where user_id=':uid';` | row gone |

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add docs/supabase/schema.sql
git commit -m "feat(schema): cloud-save revision — progress.monthly, wallet.freezes, best default fix, wallet_guard anti-cheat trigger (applied live 2026-07-10)"
```

---

### Task 2: `src/merge.js` — simple folds (everything except daily)

**Files:**
- Create: `src/merge.js`
- Test: `test/merge.test.js`

**Interfaces:**
- Consumes: `defaultShop` from `src/shop.js`, `defaultStickers` from `src/stickers.js`, `defaultQuestState`/`defaultMonthly` from `src/quests.js`.
- Produces (Tasks 3, 5, 6 rely on these exact signatures):
  - `SYNC_KEYS` = `["mastery","xp","daily","quests","monthly","wallet","freezes","shop","stickers","best"]`
  - `defaultSyncMeta() -> {dirty:{}, lastSyncAt:0}`
  - `mergeXp(a,b) -> number` · `mergeWallet(a,b) -> number` · `mergeFreezes(a,b) -> number (0–2)`
  - `mergeBest(a,b) -> {[key]:{score,date}}` · `mergeStickers(a,b) -> {earned,queue}`
  - `mergeShop(a,b,localSlotsDirty) -> shop` · `mergeMastery(a,b) -> masteryStore`
  - `mergeQuests(a,b) -> questState` · `mergeMonthly(a,b) -> monthly`

- [ ] **Step 1: Write the failing test** — create `test/merge.test.js`:

```js
import { describe, it, expect } from "vitest";
import { SYNC_KEYS, defaultSyncMeta, mergeXp, mergeWallet, mergeFreezes,
         mergeBest, mergeStickers, mergeShop, mergeMastery, mergeQuests,
         mergeMonthly } from "../src/merge.js";

describe("merge: scalars", () => {
  it("SYNC_KEYS lists the 10 synced keys", () =>
    expect(SYNC_KEYS).toEqual(["mastery","xp","daily","quests","monthly","wallet","freezes","shop","stickers","best"]));
  it("defaultSyncMeta shape", () =>
    expect(defaultSyncMeta()).toEqual({ dirty: {}, lastSyncAt: 0 }));
  it("xp/wallet take max; nullish sides are 0", () => {
    expect(mergeXp(120, 80)).toBe(120);
    expect(mergeXp(undefined, 80)).toBe(80);
    expect(mergeWallet(500, 900)).toBe(900);
    expect(mergeWallet(null, null)).toBe(0);
  });
  it("freezes take max clamped 0–2", () => {
    expect(mergeFreezes(1, 2)).toBe(2);
    expect(mergeFreezes(9, 0)).toBe(2);
    expect(mergeFreezes(undefined, -3)).toBe(0);
  });
});

describe("mergeBest", () => {
  it("per-key max score keeps the winner's date", () => {
    const a = { "k1": { score: 100, date: "2026-07-01" } };
    const b = { "k1": { score: 250, date: "2026-06-01" }, "k2": { score: 40, date: "2026-07-02" } };
    expect(mergeBest(a, b)).toEqual({
      "k1": { score: 250, date: "2026-06-01" },
      "k2": { score: 40, date: "2026-07-02" },
    });
  });
  it("idempotent and empty-side identity", () => {
    const a = { "k": { score: 5, date: "2026-01-01" } };
    expect(mergeBest(a, a)).toEqual(a);
    expect(mergeBest(a, null)).toEqual(a);
    expect(mergeBest(undefined, a)).toEqual(a);
  });
});

describe("mergeStickers", () => {
  it("earned unions with earliest date; queue stays local-only", () => {
    const a = { earned: { s1: "2026-07-05" }, queue: ["s1"] };
    const b = { earned: { s1: "2026-07-01", s2: "2026-07-02" }, queue: ["s2"] };
    expect(mergeStickers(a, b)).toEqual({
      earned: { s1: "2026-07-01", s2: "2026-07-02" },
      queue: ["s1"],
    });
  });
  it("cloud side without queue is fine", () =>
    expect(mergeStickers({ earned: {}, queue: [] }, { earned: { x: "2026-01-01" } }))
      .toEqual({ earned: { x: "2026-01-01" }, queue: [] }));
});

describe("mergeShop", () => {
  const local = { owned: ["skin-a", "deco-1"], skin: "skin-a", backdrop: "", effect: "", soundpack: "", tiers: { "deco-1": 2 } };
  const cloud = { owned: ["skin-b", "deco-1"], skin: "skin-b", backdrop: "bd-1", effect: "", soundpack: "", tiers: { "deco-1": 3 } };
  it("owned unions, tiers per-id max", () => {
    const m = mergeShop(local, cloud, false);
    expect(m.owned.sort()).toEqual(["deco-1", "skin-a", "skin-b"]);
    expect(m.tiers).toEqual({ "deco-1": 3 });
  });
  it("slots: cloud wins when local not dirty", () => {
    const m = mergeShop(local, cloud, false);
    expect(m.skin).toBe("skin-b");
    expect(m.backdrop).toBe("bd-1");
  });
  it("slots: local wins when dirty", () =>
    expect(mergeShop(local, cloud, true).skin).toBe("skin-a"));
  it("missing cloud row returns normalized local", () =>
    expect(mergeShop(local, null, false)).toEqual(local));
});

describe("mergeMastery", () => {
  it("counts max with k clamped to s; r follows newer ls; ls max", () => {
    const a = { "你": { s: 10, k: 8, r: 0, ls: 2000 } };
    const b = { "你": { s: 7, k: 9, r: 4, ls: 1000 }, "好": { s: 1, k: 1, r: 1, ls: 500 } };
    expect(mergeMastery(a, b)).toEqual({
      "你": { s: 10, k: 9, r: 0, ls: 2000 },   // r=0 from local (newer ls); k min(9,10)=9
      "好": { s: 1, k: 1, r: 1, ls: 500 },
    });
  });
  it("k never exceeds s after cross-side max", () => {
    const a = { "词": { s: 3, k: 3, r: 3, ls: 10 } };
    const b = { "词": { s: 9, k: 2, r: 0, ls: 20 } };
    expect(mergeMastery(a, b)["词"]).toEqual({ s: 9, k: 3, r: 0, ls: 20 });
  });
  it("empty sides", () => {
    expect(mergeMastery(null, null)).toEqual({});
    const a = { "词": { s: 1, k: 0, r: 0, ls: 1 } };
    expect(mergeMastery(a, undefined)).toEqual(a);
  });
});

describe("mergeQuests", () => {
  it("same date: per-quest progress max + done union", () => {
    const a = { date: "2026-07-10", progress: { correct30: 12 }, done: ["boss1"] };
    const b = { date: "2026-07-10", progress: { correct30: 20, combo5: 5 }, done: ["combo5"] };
    const m = mergeQuests(a, b);
    expect(m.progress).toEqual({ correct30: 20, combo5: 5 });
    expect(m.done.sort()).toEqual(["boss1", "combo5"]);
  });
  it("different dates: newer wins wholesale", () => {
    const older = { date: "2026-07-09", progress: { correct30: 30 }, done: ["correct30"] };
    const newer = { date: "2026-07-10", progress: {}, done: [] };
    expect(mergeQuests(older, newer)).toEqual(newer);
    expect(mergeQuests(newer, older)).toEqual(newer);
  });
});

describe("mergeMonthly", () => {
  it("same month: done max, claimed OR", () => {
    expect(mergeMonthly({ month: "2026-07", done: 12, claimed: false },
                        { month: "2026-07", done: 9, claimed: true }))
      .toEqual({ month: "2026-07", done: 12, claimed: true });
  });
  it("different months: newer wins", () =>
    expect(mergeMonthly({ month: "2026-06", done: 40, claimed: false },
                        { month: "2026-07", done: 3, claimed: false }))
      .toEqual({ month: "2026-07", done: 3, claimed: false }));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/merge.test.js`
Expected: FAIL — `Cannot find module '../src/merge.js'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation** — create `src/merge.js`:

```js
"use strict";
// Pure two-state merge folds for cloud-save reconcile (design doc 2026-07-10 §2).
// Convention: first arg = local, second = cloud. Every fold tolerates
// null/undefined on either side and returns a normalized value. All rules are
// additive-safe: no fold can lose progress in either direction.
import { defaultShop } from "./shop.js";
import { defaultStickers } from "./stickers.js";
import { defaultQuestState, defaultMonthly, MONTHLY_TARGET } from "./quests.js";

export const SYNC_KEYS = ["mastery", "xp", "daily", "quests", "monthly",
  "wallet", "freezes", "shop", "stickers", "best"];

export function defaultSyncMeta() { return { dirty: {}, lastSyncAt: 0 }; }

const num = v => Number(v) || 0;

export function mergeXp(a, b) { return Math.max(num(a), num(b), 0); }
export function mergeWallet(a, b) { return Math.max(num(a), num(b), 0); }
export function mergeFreezes(a, b) {
  return Math.min(2, Math.max(num(a), num(b), 0));
}

export function mergeBest(a, b) {
  const A = a || {}, B = b || {};
  const out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[k], y = B[k];
    if (!x || !y) { out[k] = { ...(x || y) }; continue; }
    out[k] = num(y.score) > num(x.score) ? { ...y } : { ...x };
  }
  return out;
}

// queue is transient display state: cloud-merged stickers land in the album
// silently and must never re-announce, so the queue is never taken from cloud.
export function mergeStickers(a, b) {
  const A = Object.assign(defaultStickers(), a || {});
  const Bearned = (b && b.earned) || {};
  const earned = {};
  for (const id of new Set([...Object.keys(A.earned), ...Object.keys(Bearned)])) {
    const x = A.earned[id], y = Bearned[id];
    earned[id] = x && y ? (x < y ? x : y) : (x || y);
  }
  return { earned, queue: Array.isArray(A.queue) ? A.queue.slice() : [] };
}

// Equipped slots resolve by dirty-bit LWW: local wins iff the shop key changed
// locally since the last successful sync — so a fresh install adopts the
// cloud outfit, but an unsynced re-dress isn't undone by an old cloud row.
export function mergeShop(a, b, localSlotsDirty) {
  const A = Object.assign(defaultShop(), a || {});
  if (!b) return A;
  const B = Object.assign(defaultShop(), b);
  const owned = [...new Set([...(A.owned || []), ...(B.owned || [])])];
  const tiers = {};
  for (const id of new Set([...Object.keys(A.tiers || {}), ...Object.keys(B.tiers || {})])) {
    tiers[id] = Math.max(num((A.tiers || {})[id]), num((B.tiers || {})[id]));
  }
  const slots = localSlotsDirty ? A : B;
  return { owned, skin: slots.skin, backdrop: slots.backdrop,
           effect: slots.effect, soundpack: slots.soundpack, tiers };
}

// s/k are cumulative counters: max is the safe fold (sum would double-count
// the shared pre-sync history). r is the transient current run — it follows
// whichever side saw the word more recently (ls), never a max of both.
export function mergeMastery(a, b) {
  const A = a || {}, B = b || {};
  const out = {};
  for (const h of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[h], y = B[h];
    if (!x || !y) { out[h] = { ...(x || y) }; continue; }
    const s = Math.max(num(x.s), num(y.s));
    const k = Math.min(Math.max(num(x.k), num(y.k)), s);
    const newer = num(x.ls) >= num(y.ls) ? x : y;
    out[h] = { s, k, r: num(newer.r), ls: Math.max(num(x.ls), num(y.ls)) };
  }
  return out;
}

// Daily-quest state is per-day scratch (progress/done roll over on date
// change), so cross-date comparison is meaningless: newer date wins wholesale.
export function mergeQuests(a, b) {
  const A = Object.assign(defaultQuestState(), a || {});
  const B = Object.assign(defaultQuestState(), b || {});
  if (A.date !== B.date) return A.date > B.date ? A : B;
  const progress = {};
  for (const id of new Set([...Object.keys(A.progress || {}), ...Object.keys(B.progress || {})])) {
    progress[id] = Math.max(num((A.progress || {})[id]), num((B.progress || {})[id]));
  }
  return { date: A.date, progress, done: [...new Set([...(A.done || []), ...(B.done || [])])] };
}

export function mergeMonthly(a, b) {
  const A = Object.assign(defaultMonthly(), a || {});
  const B = Object.assign(defaultMonthly(), b || {});
  if (A.month !== B.month) return A.month > B.month ? A : B;
  return { month: A.month,
           done: Math.min(MONTHLY_TARGET, Math.max(num(A.done), num(B.done))),
           claimed: !!(A.claimed || B.claimed) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/merge.test.js`
Expected: PASS (all describes green). Then `npm test` — full suite exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/merge.js test/merge.test.js
git commit -m "feat(sync): merge.js — additive folds for xp/wallet/freezes/best/stickers/shop/mastery/quests/monthly"
```

---

### Task 3: `src/merge.js` — `mergeDaily` chain merge + `mergeAll`

**Files:**
- Modify: `src/merge.js`
- Test: `test/merge-daily.test.js`

**Interfaces:**
- Consumes: `defaultDaily`, `addDays` from `src/daily.js` (pure date helpers, format `"YYYY-MM-DD"`).
- Produces (Task 5 relies on these exact signatures):
  - `mergeDaily(a,b) -> {last,streak,today:{date,resolved},restWeek,restDay}`
  - `mergeAll(local, cloud, {shopDirty}) -> {mastery,xp,daily,quests,monthly,wallet,freezes,shop,stickers,best}` — `local`/`cloud` are plain objects keyed by those 10 names; `cloud` may be `null`.

**The chain-merge rule** (design §2, made exact): let N = the side with the newer `last`, O = the other. N's streak covers the `N.streak` calendar days ending at `N.last` (rest-day covers make this an upper bound, which only makes the connect test more forgiving, never resurrects a dead chain from a live one — acceptable per design's "additive-safe" bar). If `gap = daysBetween(O.last, N.last)` satisfies `1 ≤ gap ≤ N.streak`, the chains touch or overlap, and the combined streak is `max(N.streak, O.streak + min(N.streak, gap))`. Otherwise O's chain is stale and N's blob wins outright (taking a plain max would resurrect long-dead streaks). Same-`last` sides take the larger streak. `today` merges independently: same date → max `resolved` (never sum — post-sync bases would double-count), else newer date wins.

- [ ] **Step 1: Write the failing test** — create `test/merge-daily.test.js`:

```js
import { describe, it, expect } from "vitest";
import { mergeDaily, mergeAll } from "../src/merge.js";

const d = (last, streak, today = { date: "", resolved: 0 }, restWeek = "", restDay = "") =>
  ({ last, streak, today, restWeek, restDay });

describe("mergeDaily", () => {
  it("fresh device joining a live chain extends it", () => {
    // cloud: 10-day streak ending yesterday; local: crossed goal today, streak 1
    const local = d("2026-07-10", 1, { date: "2026-07-10", resolved: 25 });
    const cloud = d("2026-07-09", 10);
    const m = mergeDaily(local, cloud);
    expect(m.streak).toBe(11);
    expect(m.last).toBe("2026-07-10");
  });
  it("two-day-newer chain connects when within N's span", () => {
    const local = d("2026-07-10", 2);          // covers 07-09..07-10
    const cloud = d("2026-07-08", 10);         // abuts
    expect(mergeDaily(local, cloud).streak).toBe(12);
  });
  it("disconnected old chain does NOT resurrect", () => {
    const local = d("2026-07-10", 1);
    const cloud = d("2026-06-01", 50);
    expect(mergeDaily(local, cloud)).toMatchObject({ last: "2026-07-10", streak: 1 });
  });
  it("same last: larger streak wins, no double count", () => {
    const a = d("2026-07-10", 6), b = d("2026-07-10", 5);
    expect(mergeDaily(a, b).streak).toBe(6);
    expect(mergeDaily(b, a).streak).toBe(6);
  });
  it("overlapping divergence never exceeds true chain", () => {
    // shared chain of 5 synced earlier; A played 07-10 (6), B stopped at 07-09 (5)
    const a = d("2026-07-10", 6), b = d("2026-07-09", 5);
    expect(mergeDaily(a, b).streak).toBe(6);
  });
  it("today: same date takes max resolved, never sums", () => {
    const a = d("2026-07-10", 1, { date: "2026-07-10", resolved: 12 });
    const b = d("2026-07-10", 1, { date: "2026-07-10", resolved: 19 });
    expect(mergeDaily(a, b).today).toEqual({ date: "2026-07-10", resolved: 19 });
  });
  it("today: newer date wins across dates", () => {
    const a = d("2026-07-09", 3, { date: "2026-07-09", resolved: 30 });
    const b = d("2026-07-10", 4, { date: "2026-07-10", resolved: 2 });
    expect(mergeDaily(a, b).today).toEqual({ date: "2026-07-10", resolved: 2 });
  });
  it("empty sides normalize", () => {
    expect(mergeDaily(null, null)).toEqual(
      { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" });
    const only = d("2026-07-10", 3, { date: "2026-07-10", resolved: 21 }, "2026-07-06", "2026-07-07");
    expect(mergeDaily(only, undefined)).toEqual(only);
    expect(mergeDaily(undefined, only)).toEqual(only);
  });
});

describe("mergeAll", () => {
  const local = {
    mastery: { "你": { s: 2, k: 2, r: 2, ls: 100 } }, xp: 50,
    daily: d("2026-07-10", 1, { date: "2026-07-10", resolved: 20 }),
    quests: { date: "2026-07-10", progress: {}, done: [] },
    monthly: { month: "2026-07", done: 2, claimed: false },
    wallet: 700, freezes: 1,
    shop: { owned: ["a"], skin: "a", backdrop: "", effect: "", soundpack: "", tiers: {} },
    stickers: { earned: {}, queue: [] },
    best: { k1: { score: 10, date: "2026-07-10" } },
  };
  it("null cloud returns normalized local (baseline identity)", () => {
    const m = mergeAll(local, null, { shopDirty: false });
    expect(m.xp).toBe(50);
    expect(m.wallet).toBe(700);
    expect(m.daily.streak).toBe(1);
    expect(Object.keys(m).sort()).toEqual(
      ["best","daily","freezes","mastery","monthly","quests","shop","stickers","wallet","xp"]);
  });
  it("cloud contributions fold in", () => {
    const cloud = { ...local, xp: 900, wallet: 100,
      daily: d("2026-07-09", 7), best: {}, mastery: {}, stickers: { earned: { s9: "2026-07-01" } } };
    const m = mergeAll(local, cloud, { shopDirty: false });
    expect(m.xp).toBe(900);
    expect(m.wallet).toBe(700);
    expect(m.daily.streak).toBe(8);
    expect(m.stickers.earned).toEqual({ s9: "2026-07-01" });
    expect(m.stickers.queue).toEqual([]);   // never announced from cloud
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/merge-daily.test.js`
Expected: FAIL — `mergeDaily is not a function` / not exported.

- [ ] **Step 3: Implement** — append to `src/merge.js` (and add `defaultDaily` to the imports from `./daily.js` — a new import line `import { defaultDaily } from "./daily.js";` under the existing imports):

```js
function daysBetween(a, b) {   // whole days b - a; 0 when either is invalid/empty
  if (!a || !b) return 0;
  const da = new Date(a + "T00:00:00Z"), db = new Date(b + "T00:00:00Z");
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.round((db - da) / 86400000);
}

function normDaily(v) {
  const d = Object.assign(defaultDaily(), v || {});
  d.today = Object.assign({ date: "", resolved: 0 }, d.today);
  return d;
}

function mergeToday(x, y) {
  if (x.date === y.date) return { date: x.date, resolved: Math.max(num(x.resolved), num(y.resolved)) };
  return x.date > y.date ? { ...x } : { ...y };
}

// Chain merge (design §2): the newer-`last` side is the live chain; the older
// side extends it only when their calendars touch or overlap. Taking a bare
// max would resurrect long-dead streaks, so a disconnected old chain loses.
export function mergeDaily(a, b) {
  const A = normDaily(a), B = normDaily(b);
  const today = mergeToday(A.today, B.today);
  if (A.last === B.last) {
    const base = A.streak >= B.streak ? A : B;
    return { last: base.last, streak: Math.max(A.streak, B.streak),
             today, restWeek: base.restWeek, restDay: base.restDay };
  }
  const N = A.last > B.last ? A : B;
  const O = N === A ? B : A;
  let streak = N.streak;
  const gap = daysBetween(O.last, N.last);
  if (O.last && gap >= 1 && gap <= N.streak) {
    streak = Math.max(N.streak, num(O.streak) + Math.min(N.streak, gap));
  }
  return { last: N.last, streak, today, restWeek: N.restWeek, restDay: N.restDay };
}

export function mergeAll(local, cloud, { shopDirty = false } = {}) {
  const l = local || {}, c = cloud || {};
  return {
    mastery: mergeMastery(l.mastery, c.mastery),
    xp: mergeXp(l.xp, c.xp),
    daily: mergeDaily(l.daily, c.daily),
    quests: mergeQuests(l.quests, c.quests),
    monthly: mergeMonthly(l.monthly, c.monthly),
    wallet: mergeWallet(l.wallet, c.wallet),
    freezes: mergeFreezes(l.freezes, c.freezes),
    shop: mergeShop(l.shop, c.shop, shopDirty),
    stickers: mergeStickers(l.stickers, c.stickers),
    best: mergeBest(l.best, c.best),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/merge-daily.test.js test/merge.test.js`
Expected: PASS. Then `npm test` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/merge.js test/merge-daily.test.js
git commit -m "feat(sync): mergeDaily chain merge + mergeAll composition"
```

---

### Task 4: `src/cloud.js` — sync-row fetch/push

**Files:**
- Modify: `src/cloud.js`
- Test: `test/cloud.test.js` (append new describes; do not alter existing ones)

**Interfaces:**
- Consumes: existing `getClient`/`offline` internals of `cloud.js`.
- Produces (Task 5 relies on these exact signatures):
  - `fetchSyncRows(userId) -> {ok:true, progress:row|null, wallet:row|null} | {ok:false, reason:"offline"|"network"}`
  - `pushSyncRows(progressRow, walletRow) -> {ok:boolean}` (upserts `progress` then `wallet`)

- [ ] **Step 1: Write the failing test** — append to `test/cloud.test.js`:

```js
import { fetchSyncRows, pushSyncRows } from "../src/cloud.js";   // merge into the existing import from ../src/cloud.js

// Fake with select support for the sync-row reads.
function fakeSyncClient({ progressRow = null, walletRow = null, failSelect = false, failUpsert = false } = {}) {
  const calls = { selects: [], upserts: [] };
  const client = {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => {
            calls.selects.push({ table, col, val });
            if (failSelect) return { data: null, error: { message: "boom" } };
            return { data: table === "progress" ? progressRow : walletRow, error: null };
          },
        }),
      }),
      upsert: async (row) => {
        calls.upserts.push({ table, row });
        return { error: failUpsert ? { message: "boom" } : null };
      },
    }),
  };
  return { client, calls };
}

describe("fetchSyncRows", () => {
  it("offline resolves {ok:false, reason:'offline'}", async () => {
    globalThis.navigator = { onLine: false };
    expect(await fetchSyncRows("u1")).toEqual({ ok: false, reason: "offline" });
  });
  it("returns both rows (null when absent)", async () => {
    const p = { user_id: "u1", xp: 5 };
    const { client, calls } = fakeSyncClient({ progressRow: p, walletRow: null });
    __setClientForTests(client);
    expect(await fetchSyncRows("u1")).toEqual({ ok: true, progress: p, wallet: null });
    expect(calls.selects).toEqual([
      { table: "progress", col: "user_id", val: "u1" },
      { table: "wallet", col: "user_id", val: "u1" },
    ]);
  });
  it("select failure resolves {ok:false, reason:'network'} — never throws", async () => {
    const { client } = fakeSyncClient({ failSelect: true });
    __setClientForTests(client);
    expect(await fetchSyncRows("u1")).toEqual({ ok: false, reason: "network" });
  });
});

describe("pushSyncRows", () => {
  it("upserts progress then wallet", async () => {
    const { client, calls } = fakeSyncClient();
    __setClientForTests(client);
    const r = await pushSyncRows({ user_id: "u1", xp: 9 }, { user_id: "u1", coins: 4, freezes: 1 });
    expect(r).toEqual({ ok: true });
    expect(calls.upserts.map(u => u.table)).toEqual(["progress", "wallet"]);
  });
  it("any upsert failure resolves {ok:false}", async () => {
    const { client } = fakeSyncClient({ failUpsert: true });
    __setClientForTests(client);
    expect(await pushSyncRows({ user_id: "u1" }, { user_id: "u1" })).toEqual({ ok: false });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/cloud.test.js`
Expected: new describes FAIL (`fetchSyncRows` not exported); existing describes still PASS.

- [ ] **Step 3: Implement** — append to `src/cloud.js`:

```js
// --- cloud-save round: sync-row data access (the only supabase touchpoints
// for sync; src/sync.js orchestrates, this file talks to the network). ---
export async function fetchSyncRows(userId) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const { data: progress, error: e1 } = await getClient()
      .from("progress").select("*").eq("user_id", userId).maybeSingle();
    if (e1) return { ok: false, reason: "network" };
    const { data: wallet, error: e2 } = await getClient()
      .from("wallet").select("*").eq("user_id", userId).maybeSingle();
    if (e2) return { ok: false, reason: "network" };
    return { ok: true, progress: progress || null, wallet: wallet || null };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function pushSyncRows(progressRow, walletRow) {
  if (offline()) return { ok: false };
  try {
    const { error: e1 } = await getClient().from("progress").upsert(progressRow);
    if (e1) return { ok: false };
    const { error: e2 } = await getClient().from("wallet").upsert(walletRow);
    return { ok: !e2 };
  } catch (e) { return { ok: false }; }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/cloud.test.js`
Expected: PASS. Then `npm test` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/cloud.js test/cloud.test.js
git commit -m "feat(sync): cloud.js fetchSyncRows/pushSyncRows — offline-guarded row access"
```

---

### Task 5: `src/sync.js` — reconcile + pushDirty orchestration

**Files:**
- Create: `src/sync.js`
- Test: `test/sync.test.js`

**Interfaces:**
- Consumes: `getSession`, `fetchSyncRows`, `pushSyncRows`, `__setClientForTests` from `src/cloud.js`; `mergeAll`, `defaultSyncMeta` from `src/merge.js`.
- Produces (Task 6 relies on these exact signatures):
  - `MIN_SYNC_GAP_MS` = 30000
  - `localSnapshot(store) -> {mastery,xp,daily,quests,monthly,wallet,freezes,shop,stickers,best}` — `store` is any `{get(k,d), set(k,v)}` pair (main.js's `store`, or a plain-object shim in tests/probes)
  - `rowsFromLocal(userId, local) -> {progress: progressRow, wallet: walletRow}`
  - `localFromRows(progressRow, walletRow) -> local-shaped object`
  - `reconcile(store, reason, now?) -> Promise<{ok:true, changed:boolean} | {ok:false, reason}>` — `reason: "sign-in"|"foreground"|"online"`; `"sign-in"` bypasses the 30s cooldown
  - `pushDirty(store, reason) -> Promise<{ok:boolean, skipped?:true}>`
  - `__resetForTests()`

**Column mapping** (schema ⇄ local): `progress.mastery⇄mastery`, `xp⇄xp`, `streak` = `daily.streak` (derived, write-only), `daily⇄daily`, `quests⇄quests`, `monthly⇄monthly`, `best⇄best`, `cosmetics⇄shop`, `stickers` stores `{earned}` only (queue is local-only); `wallet.coins⇄wallet`, `wallet.freezes⇄freezes`.

**Dirty-flag correctness:** writing merged values via the (Task 6) dirty-marking `store.set` re-flags those keys; `reconcile` therefore clears flags LAST, and only for keys whose stored value still JSON-equals what was pushed — a gameplay write that lands during the push `await` keeps its flag and syncs at the next edge.

- [ ] **Step 1: Write the failing test** — create `test/sync.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import { MIN_SYNC_GAP_MS, localSnapshot, rowsFromLocal, localFromRows,
         reconcile, pushDirty, __resetForTests } from "../src/sync.js";
import { __setClientForTests } from "../src/cloud.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d),
    set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); },
    _raw: m,
  };
}

function fakeClient({ session, progressRow = null, walletRow = null, failPush = false } = {}) {
  const calls = { upserts: [] };
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    from: (table) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () =>
        ({ data: table === "progress" ? progressRow : walletRow, error: null }) }) }),
      upsert: async (row) => { calls.upserts.push({ table, row }); return { error: failPush ? { message: "x" } : null }; },
    }),
  };
  return { client, calls };
}

const SESSION = { user: { id: "u1", is_anonymous: true } };

beforeEach(() => { __resetForTests(); __setClientForTests(null); delete globalThis.navigator; });

describe("row mapping", () => {
  it("rowsFromLocal shapes both rows; stickers strips queue; streak derived", () => {
    const local = { mastery: {}, xp: 10, daily: { last: "2026-07-10", streak: 4, today: { date: "2026-07-10", resolved: 20 }, restWeek: "", restDay: "" },
      quests: { date: "2026-07-10", progress: {}, done: [] }, monthly: { month: "2026-07", done: 1, claimed: false },
      wallet: 300, freezes: 2, shop: { owned: [], skin: "", backdrop: "", effect: "", soundpack: "", tiers: {} },
      stickers: { earned: { s1: "2026-07-01" }, queue: ["s1"] }, best: {} };
    const r = rowsFromLocal("u1", local);
    expect(r.progress.user_id).toBe("u1");
    expect(r.progress.streak).toBe(4);
    expect(r.progress.cosmetics).toEqual(local.shop);
    expect(r.progress.stickers).toEqual({ earned: { s1: "2026-07-01" } });
    expect(r.wallet).toEqual({ user_id: "u1", coins: 300, freezes: 2 });
  });
  it("localFromRows inverts (nulls when rows absent)", () => {
    const l = localFromRows(null, null);
    expect(l.wallet).toBeUndefined();
    const l2 = localFromRows({ xp: 7, cosmetics: { owned: ["a"] } }, { coins: 9, freezes: 1 });
    expect(l2.xp).toBe(7);
    expect(l2.shop).toEqual({ owned: ["a"] });
    expect(l2.wallet).toBe(9);
    expect(l2.freezes).toBe(1);
  });
});

describe("reconcile", () => {
  it("no session -> {ok:false}", async () => {
    const { client } = fakeClient({ session: null });
    __setClientForTests(client);
    const r = await reconcile(memStore(), "foreground");
    expect(r.ok).toBe(false);
  });
  it("merges cloud into local, pushes, stamps lastSyncAt, clears dirty", async () => {
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 900, mastery: {}, daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 50, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ xp: 100, wallet: 700, sync: { dirty: { xp: true, wallet: true }, lastSyncAt: 0 } });
    const r = await reconcile(store, "sign-in", 1000000);
    expect(r).toEqual({ ok: true, changed: true });
    expect(store.get("xp", 0)).toBe(900);          // cloud won xp
    expect(store.get("wallet", 0)).toBe(700);      // local won wallet
    const pushedProgress = calls.upserts.find(u => u.table === "progress").row;
    expect(pushedProgress.xp).toBe(900);
    const meta = store.get("sync", {});
    expect(meta.lastSyncAt).toBe(1000000);
    expect(meta.dirty).toEqual({});
  });
  it("changed:false when cloud contributes nothing", async () => {
    const { client } = fakeClient({ session: SESSION, progressRow: null, walletRow: null });
    __setClientForTests(client);
    const r = await reconcile(memStore({ xp: 5 }), "sign-in", 5000);
    expect(r).toEqual({ ok: true, changed: false });
  });
  it("cooldown skips non-sign-in reasons but never sign-in", async () => {
    const { client } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ sync: { dirty: {}, lastSyncAt: 100000 } });
    const r1 = await reconcile(store, "foreground", 100000 + MIN_SYNC_GAP_MS - 1);
    expect(r1).toEqual({ ok: false, reason: "cooldown" });
    const r2 = await reconcile(store, "sign-in", 100000 + 1);
    expect(r2.ok).toBe(true);
  });
  it("push failure keeps dirty flags", async () => {
    const { client } = fakeClient({ session: SESSION, failPush: true });
    __setClientForTests(client);
    const store = memStore({ xp: 5, sync: { dirty: { xp: true }, lastSyncAt: 0 } });
    const r = await reconcile(store, "sign-in", 1);
    expect(r.ok).toBe(false);
    expect(store.get("sync", {}).dirty).toEqual({ xp: true });
  });
});

describe("pushDirty", () => {
  it("skips with no dirty flags", async () => {
    const r = await pushDirty(memStore(), "hide");
    expect(r).toEqual({ ok: true, skipped: true });
  });
  it("pushes local rows and clears settled flags without touching lastSyncAt", async () => {
    const { client, calls } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ xp: 42, sync: { dirty: { xp: true }, lastSyncAt: 777 } });
    const r = await pushDirty(store, "hide");
    expect(r.ok).toBe(true);
    expect(calls.upserts.length).toBe(2);
    const meta = store.get("sync", {});
    expect(meta.dirty).toEqual({});
    expect(meta.lastSyncAt).toBe(777);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/sync.test.js`
Expected: FAIL — cannot resolve `../src/sync.js`.

- [ ] **Step 3: Implement** — create `src/sync.js`:

```js
"use strict";
// Sync orchestrator (cloud-save round). Same contract as cloud.js: never
// throws/rejects, offline/failure resolves {ok:false} and gameplay never
// notices. Pure data flow: cloud rows -> mergeAll -> store -> cloud rows.
// `store` is injected ({get,set}) so node probes/tests can shim localStorage.
import { getSession, fetchSyncRows, pushSyncRows } from "./cloud.js";
import { mergeAll, defaultSyncMeta } from "./merge.js";

export const MIN_SYNC_GAP_MS = 30000;

let inFlight = false;
export function __resetForTests() { inFlight = false; }

export function localSnapshot(store) {
  return {
    mastery: store.get("mastery", {}),
    xp: store.get("xp", 0),
    daily: store.get("daily", null),
    quests: store.get("quests", null),
    monthly: store.get("monthly", null),
    wallet: store.get("wallet", 0),
    freezes: store.get("freezes", 0),
    shop: store.get("shop", null),
    stickers: store.get("stickers", null),
    best: store.get("best", {}),
  };
}

export function rowsFromLocal(userId, l) {
  return {
    progress: {
      user_id: userId,
      mastery: l.mastery || {},
      xp: Number(l.xp) || 0,
      streak: (l.daily && Number(l.daily.streak)) || 0,
      daily: l.daily || {},
      quests: l.quests || {},
      monthly: l.monthly || {},
      best: l.best || {},
      cosmetics: l.shop || {},
      stickers: { earned: (l.stickers && l.stickers.earned) || {} },
    },
    wallet: { user_id: userId, coins: Number(l.wallet) || 0, freezes: Number(l.freezes) || 0 },
  };
}

export function localFromRows(progressRow, walletRow) {
  const p = progressRow || {}, w = walletRow || {};
  return { mastery: p.mastery, xp: p.xp, daily: p.daily, quests: p.quests,
           monthly: p.monthly, best: p.best, shop: p.cosmetics,
           stickers: p.stickers, wallet: w.coins, freezes: w.freezes };
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Clear dirty flags for keys whose stored value still equals what we pushed —
// a gameplay write that raced the push keeps its flag for the next edge.
function settleDirty(store, expected, lastSyncAt) {
  const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
  meta.dirty = meta.dirty || {};
  for (const k of Object.keys(expected)) {
    if (eq(store.get(k, null), expected[k])) delete meta.dirty[k];
  }
  if (lastSyncAt) meta.lastSyncAt = lastSyncAt;
  store.set("sync", meta);
}

export async function reconcile(store, reason, now = Date.now()) {
  if (inFlight) return { ok: false, reason: "busy" };
  inFlight = true;
  try {
    const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
    if (reason !== "sign-in" && now - meta.lastSyncAt < MIN_SYNC_GAP_MS) {
      return { ok: false, reason: "cooldown" };
    }
    const s = await getSession();
    if (!s.ok) return { ok: false, reason: s.reason };
    if (!s.session) return { ok: false, reason: "no-session" };
    const uid = s.session.user.id;
    const rows = await fetchSyncRows(uid);
    if (!rows.ok) return { ok: false, reason: rows.reason };
    const local = localSnapshot(store);
    const shopDirty = !!(meta.dirty && meta.dirty.shop);
    const merged = mergeAll(local, localFromRows(rows.progress, rows.wallet), { shopDirty });
    const baseline = mergeAll(local, null, { shopDirty });
    const changed = !eq(merged, baseline);
    for (const k of Object.keys(merged)) store.set(k, merged[k]);
    const built = rowsFromLocal(uid, merged);
    const push = await pushSyncRows(built.progress, built.wallet);
    if (!push.ok) return { ok: false, reason: "network" };
    settleDirty(store, merged, now);
    return { ok: true, changed };
  } catch (e) {
    return { ok: false, reason: "network" };
  } finally {
    inFlight = false;
  }
}

export async function pushDirty(store, reason) {
  const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
  if (!Object.keys(meta.dirty || {}).length) return { ok: true, skipped: true };
  if (inFlight) return { ok: false, reason: "busy" };
  inFlight = true;
  try {
    const s = await getSession();
    if (!s.ok || !s.session) return { ok: false };
    const local = localSnapshot(store);
    const built = rowsFromLocal(s.session.user.id, local);
    const r = await pushSyncRows(built.progress, built.wallet);
    if (r.ok) settleDirty(store, local, 0);
    return { ok: r.ok };
  } catch (e) {
    return { ok: false };
  } finally {
    inFlight = false;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/sync.test.js`
Expected: PASS. Then `npm test` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/sync.js test/sync.test.js
git commit -m "feat(sync): sync.js — reconcile/pushDirty orchestration, race-safe dirty settling"
```

---

### Task 6: `main.js` wiring + i18n + build

**Files:**
- Modify: `src/main.js` (store hook ~line 58; boot region; visibilitychange ~line 1265; account handlers ~lines 489-527; renderAccount ~lines 393-423; shop buy handlers ~lines 2363, 2382)
- Modify: `src/i18n.js` (3 new keys × en/th)
- Modify (generated): `dist/app.js` via `npm run build`

**Interfaces:**
- Consumes: `SYNC_KEYS` from `src/merge.js`; `reconcile`, `pushDirty` from `src/sync.js`; existing `store`, `toast`, `t`, `renderAccount`, `accountUI`, `B`, `updateWalletChip`, boot patterns at `src/main.js:80-247`.
- Produces: no exports (main.js is the wiring layer, untested by design).

- [ ] **Step 1: Add imports + dirty hook at the `store.set` chokepoint** (`src/main.js:58-61`)

Add to the module imports: `import { SYNC_KEYS } from "./merge.js";` and `import { reconcile, pushDirty } from "./sync.js";`

Replace the `store` const with:

```js
const store = {
  get(k, d){ try{ const v = localStorage.getItem("nbhsk."+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){
    try{ localStorage.setItem("nbhsk."+k, JSON.stringify(v)); }catch(e){}
    // cloud-save: persist a dirty flag per synced key so a mid-session kill
    // doesn't forget unpushed changes. Writes only on false->true flips.
    if(SYNC_KEYS.includes(k)){
      try{
        const raw = localStorage.getItem("nbhsk.sync");
        const meta = raw ? JSON.parse(raw) : { dirty:{}, lastSyncAt:0 };
        if(!meta.dirty) meta.dirty = {};
        if(!meta.dirty[k]){ meta.dirty[k] = true; localStorage.setItem("nbhsk.sync", JSON.stringify(meta)); }
      }catch(e){}
    }
  }
};
```

- [ ] **Step 2: Add `rehydrateFromStore()` + `syncEdge()`** near the account handlers (`src/main.js` ~line 489, before `onAccountConnect`). The re-reads mirror the boot lines exactly (`src/main.js:80,85,86,95,98,135-136,213,221,243-247`); `nbhsk.best` and `nbhsk.introDone` have no in-memory cache and need nothing. The sticker announcement queue stays the in-memory one (local-only by design):

```js
// cloud-save: module-scope caches don't see localStorage writes — after a
// merge, re-read every synced key the same way boot does.
function rehydrateFromStore(){
  masteryStore = store.get("mastery", {});
  wallet = store.get("wallet", 0);
  shopState = Object.assign(defaultShop(), store.get("shop", {}));
  freezes = Math.min(2, Number(store.get("freezes")) || 0);
  xp = store.get("xp", 0);
  daily = Object.assign(defaultDaily(), store.get("daily", {}));
  daily.today = Object.assign({date:"", resolved:0}, daily.today);
  questState = Object.assign(defaultQuestState(), store.get("quests", {}));
  monthly = Object.assign(defaultMonthly(), store.get("monthly", {}));
  const st = Object.assign(defaultStickers(), store.get("stickers", {}) || {});
  stickerState = { earned: Object.assign({}, st.earned), queue: stickerState.queue };
  updateWalletChip();
}

// Reconcile edge: never during an active round (design §3 — merged state must
// not change mid-battle); the next edge catches up.
async function syncEdge(reason){
  if(B.on) return;
  const r = await reconcile(store, reason);
  if(r.ok){
    rehydrateFromStore();
    renderAccount();
    if(reason === "sign-in" && r.changed) toast(t("account.restored"));
  }
}
```

(If any `default*` import above is missing from main.js's import lines, add it — `defaultShop`, `defaultDaily`, `defaultQuestState`, `defaultMonthly`, `defaultStickers` are all existing exports already used at boot; match the exact boot expressions.)

- [ ] **Step 3: Wire the five edges**

(a) Sign-in edges — in `onAccountConnect` (`src/main.js:489-493`) after `accountUI.session = r.session; renderAccount();` add `syncEdge("sign-in");`. In `onAccountVerify` (`src/main.js:516-527`) after `renderAccount();` add `syncEdge("sign-in");`.

(b) Visibility edges — in the `visibilitychange` handler (`src/main.js:1265-1278`), inside the existing `if(document.hidden){...}` block append `pushDirty(store, "hide");`, and add after that block:

```js
  if(!document.hidden) syncEdge("foreground");
```

(c) Online edge — next to the handler add:

```js
window.addEventListener("online", ()=> syncEdge("online"));
```

(d) Purchase edges — after the deco/cosmetic buy persist (`src/main.js:2363` region, after `store.set("shop", shopState);`) add `pushDirty(store, "purchase");`; after the consumable buy persist (`src/main.js:2382` region, after `store.set("freezes", freezes);`) add `pushDirty(store, "purchase");`.

- [ ] **Step 4: Account screen "Last synced" line** — in `renderAccount()` (`src/main.js:393-423`), after the explain paragraph is appended, add (adapting `p` to the panel variable name used in the function):

```js
  if(accountState(accountUI.session) !== "local"){
    const sy = document.createElement("p");
    sy.className = "account-explain";
    const meta = store.get("sync", null);
    sy.textContent = meta && meta.lastSyncAt
      ? t("account.lastSynced", { when: new Date(meta.lastSyncAt).toLocaleString() })
      : t("account.neverSynced");
    p.appendChild(sy);
  }
```

- [ ] **Step 5: i18n strings** — in `src/i18n.js`, add to the `account.*` cluster of `STRINGS.en`:

```js
    "account.lastSynced": "Last synced {when}",
    "account.neverSynced": "Not synced yet",
    "account.restored": "Progress restored ✓",
```

and to the same cluster of `STRINGS.th`:

```js
    "account.lastSynced": "ซิงค์ล่าสุด {when}",   // TH: needs native review
    "account.neverSynced": "ยังไม่ได้ซิงค์",   // TH: needs native review
    "account.restored": "กู้คืนความคืบหน้าแล้ว ✓",   // TH: needs native review
```

- [ ] **Step 6: Build + full suite**

Run: `npm test`
Expected: exit 0 (i18n symmetry test covers the new keys).
Run: `npm run build`
Expected: clean esbuild output, `dist/app.js` regenerated (minified, same flags as the existing build script).

- [ ] **Step 7: Boot-purity smoke** — open the built app once with no interaction and confirm zero network requests and zero console errors:

```bash
node - <<'EOF'
const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ executablePath: require("child_process")
    .execSync("ls ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome | head -1").toString().trim() });
  const page = await browser.newPage();
  const reqs = [], errs = [];
  page.on("request", r => { if (!r.url().startsWith("file://")) reqs.push(r.url()); });
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto("file:///root/work/HSK/game/index.html");
  await page.waitForTimeout(3000);
  console.log(JSON.stringify({ networkRequests: reqs, consoleErrors: errs }));
  await browser.close();
})();
EOF
```

Expected: `{"networkRequests":[],"consoleErrors":[]}`.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/i18n.js dist/app.js
git commit -m "feat(sync): wire cloud-save edges — dirty hook, reconcile on sign-in/foreground/online, push on hide/purchase, Last-synced line"
```

---

### Task 7: Live E2E probes + sweep + release readiness

**Files:**
- Create: `$CLAUDE_JOB_DIR/tmp/cloudsave-probe.mjs` (throwaway, not committed)
- No source changes expected (fix-wave only if probes fail).

**Interfaces:**
- Consumes: everything shipped in Tasks 1–6; live Supabase project `eqsodiufgjecoqgxdisn`.

- [ ] **Step 1: Node live merge probe** — `sync.js` takes an injected store, so the full reconcile loop runs headlessly against the LIVE project. Write `$CLAUDE_JOB_DIR/tmp/cloudsave-probe.mjs`:

```js
// Live two-device merge probe (creates one anon user; cleaned up in Step 4).
// Run from /root/work/HSK/game so bare imports resolve.
import { createClient } from "@supabase/supabase-js";
import { __setClientForTests } from "./src/cloud.js";
import { reconcile } from "./src/sync.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./src/cloud-config.js";

const mem = {};
const store = { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
__setClientForTests(client);
const { data, error } = await client.auth.signInAnonymously();
if (error) { console.error("anon sign-in failed", error); process.exit(1); }
console.log("uid:", data.session.user.id);

// Device A: xp 500, wallet 300, one mastered word — reconcile pushes it up.
mem.xp = 500; mem.wallet = 300;
mem.mastery = { "你": { s: 5, k: 5, r: 5, ls: 1000 } };
const r1 = await reconcile(store, "sign-in");
console.log("push A:", JSON.stringify(r1));

// Device B: wipe local, diverge (higher wallet, different word), reconcile.
for (const k of Object.keys(mem)) delete mem[k];
mem.xp = 200; mem.wallet = 900;
mem.mastery = { "好": { s: 3, k: 3, r: 3, ls: 2000 } };
const r2 = await reconcile(store, "sign-in");
console.log("merge B:", JSON.stringify(r2));
console.log("merged xp:", mem.xp, "wallet:", mem.wallet, "mastery keys:", Object.keys(mem.mastery).sort().join(","));
// EXPECT: r1 ok, r2 {ok:true,changed:true}; xp 500, wallet 900, mastery 你,好
```

Run: `cd /root/work/HSK/game && node $CLAUDE_JOB_DIR/tmp/cloudsave-probe.mjs`
Expected output ends with: `merged xp: 500 wallet: 900 mastery keys: 你,好` (and record the printed uid for Step 4 cleanup).

- [ ] **Step 2: Browser probe** — serve (`python3 -m http.server 8000` in `game/`) and drive with playwright chromium: open app → More → Account → Connect (live anon) → confirm the Account panel shows the "Last synced" line within ~5s; toggle TH locale and confirm the Thai string renders (Thai-capable font stack, no blank). Screenshot both for the round ledger.

- [ ] **Step 3: Responsive sweep ×2**

Run: `node scripts/responsive-sweep.mjs` twice.
Expected: 10/10 both runs (no layout changes shipped, so any failure is a regression — fix before proceeding).

- [ ] **Step 4: Cleanup live test users** — delete the probe users created by Steps 1–2 via mgmt API (curl pattern from Task 1, never print the token):

```sql
delete from auth.users where id in ('<uid-step1>', '<uid-step2>');
```

(cascades wipe their `profiles`/`progress`/`wallet` rows). Verify with `select count(*) from public.progress;` matching expectations.

- [ ] **Step 5: Full suite + push branch**

Run: `npm test` (exit 0), then:

```bash
git push -u origin feat/cloud-save
```

Then per house SDD process: whole-branch review, PR to `development` with probe evidence in the body. At merge: SHELL v54→v55 on `development`, PRD §6.3 one-line amendment (per-key fold rules supersede "LWW per field"), 3 new TH strings join the native-review queue, release per `resume-hsk-session` ritual.

---

## Self-review notes (already applied)

- Spec coverage: design §1→Task 1, §2→Tasks 2–3, §3→Tasks 4–6, §4 UX→Task 6, §5 testing→per-task TDD + Task 7, §6 rollout→Task 7 Step 5. Non-goals honored (no realtime, no server merge).
- `mergeMastery` uses max-not-sum for `s`/`k` with `k≤s` clamp — scout confirmed they're cumulative counters; sum would double-count shared pre-sync history (deviation from the scout's "additive" suggestion is deliberate and documented in the module comment).
- Disconnected `mergeDaily` chains take the newer blob, never a bare max — resurrecting dead streaks would violate the design's intent even though "max" appears in the design table's shorthand.
- Dirty flags are settled by value-compare AFTER the push, so writes racing the `await` survive to the next edge.
- The wallet trigger covers INSERT (first-sync 100k ceiling) as well as UPDATE — design §1 as amended in spec self-review.
