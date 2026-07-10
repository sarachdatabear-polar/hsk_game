# Retention-Pack Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three follow-up tickets deferred from the retention pack (PR #70): auto-claim expiring monthly rewards, a dedicated Supplies shop shelf for consumables, and de-duplicating the monthly-badge double announcement — plus the "1 freeze(s)" pluralization minor.

**Architecture:** Same pattern as the retention pack: pure logic lives in `src/quests.js` / `src/stickers.js` with vitest coverage; `src/main.js` only wires state + DOM; `index.html` holds markup; every user-visible string goes through `src/i18n.js` with both EN and TH entries (TH tagged `// TH: needs native review`).

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild (`npm run build` → `dist/app.js`).

## Global Constraints

- Repo: the **game** repo at `/root/work/HSK/game` (nested, separate from the root repo). Branch: `fix/retention-followups` off `development`.
- Run all commands inside `/root/work/HSK/game`. Node via nvm (`. ~/.nvm/nvm.sh` if `node` missing).
- **Never** pipe `npm test` through `tail`/`grep` when gating a commit — the exit code must be real.
- Consumables are **counted, not owned** (task-2 carry-forward from PR #70): never route them through `shopState.owned` / `buy()` / `equipItem()`. Only `buyConsumable` + the `nbhsk.freezes` count.
- Every new i18n key must exist in BOTH `en` and `th` blocks of `src/i18n.js`; suffix TH lines with `   // TH: needs native review`. The `test/i18n-usage.test.js` suite auto-discovers keys used via `t("...")` and fails on missing entries.
- `localStorage` keys are namespaced `nbhsk.*`; main.js's `store` helper handles the prefix.
- After the last task, `dist/` must be rebuilt and committed (PR #70 post-mortem: a stale committed dist slipped through when a "pure module" task skipped the rebuild).

---

### Task 1: `settleMonthly` — auto-claim a completed-but-unclaimed month at rollover

A player who reaches 40/40 but never taps **Claim** currently forfeits the 1,500 coins the moment `noteMonthlyProgress` sees a new month (it resets `done`/`claimed`). Fix: a pure settlement step that runs *before* any monthly read/write; if the stored (old) month is complete and unclaimed, it pays out and resets.

**Files:**
- Modify: `game/src/quests.js` (append after `claimMonthly`, ~line 121)
- Modify: `game/src/main.js` (monthly section ~line 203–208, `questEvent` ~line 281, `renderQuests` ~line 294)
- Modify: `game/src/i18n.js` (new key `quest.monthly.autoClaimed` in both locales)
- Test: `game/test/quests.test.js` (inside the existing `describe("monthly quest layer")` block)

**Interfaces:**
- Consumes: `monthKey`, `MONTHLY_TARGET`, `MONTHLY_REWARD` (already exported from `quests.js`).
- Produces: `settleMonthly(m, dateStr) -> { state, earned }` — `state` is a NEW monthly object (`{ month, done, claimed }`), `earned` is `MONTHLY_REWARD` or `0`. Task 5's verify and main.js wiring rely on this exact name/shape.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("monthly quest layer", ...)` in `game/test/quests.test.js` (add `settleMonthly` to the import list at the top of the file):

```js
  it("settleMonthly auto-claims a complete unclaimed month at rollover", () => {
    const m = { month: "2026-06", done: 40, claimed: false };
    const r = settleMonthly(m, "2026-07-01");
    expect(r.earned).toBe(MONTHLY_REWARD);
    expect(r.state).toEqual({ month: "2026-07", done: 0, claimed: false });
    expect(m.done).toBe(40); // no input mutation
  });
  it("settleMonthly pays nothing for claimed or incomplete months", () => {
    expect(settleMonthly({ month: "2026-06", done: 40, claimed: true }, "2026-07-01").earned).toBe(0);
    expect(settleMonthly({ month: "2026-06", done: 39, claimed: false }, "2026-07-01").earned).toBe(0);
    // both still reset to the new month
    expect(settleMonthly({ month: "2026-06", done: 39, claimed: false }, "2026-07-01").state)
      .toEqual({ month: "2026-07", done: 0, claimed: false });
  });
  it("settleMonthly is a no-op within the same month and on the fresh default", () => {
    const same = { month: "2026-07", done: 12, claimed: false };
    expect(settleMonthly(same, "2026-07-20")).toEqual({ state: same, earned: 0 });
    const fresh = defaultMonthly();
    expect(settleMonthly(fresh, "2026-07-20")).toEqual({ state: fresh, earned: 0 });
  });
  it("settle then noteMonthlyProgress does not double-reset or double-pay", () => {
    const r = settleMonthly({ month: "2026-06", done: 40, claimed: false }, "2026-07-02");
    const m = noteMonthlyProgress(r.state, "2026-07-02", 1);
    expect(m).toEqual({ month: "2026-07", done: 1, claimed: false });
    expect(settleMonthly(m, "2026-07-02").earned).toBe(0);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/quests.test.js`
Expected: FAIL — `settleMonthly is not a function` (or import error).

- [ ] **Step 3: Implement `settleMonthly`**

Append to `game/src/quests.js` after `claimMonthly`:

```js
// Rollover settlement: a month that ended complete-but-unclaimed auto-claims
// its reward instead of forfeiting it. Pure; call BEFORE any other monthly
// read/write whenever "today" may have left the stored month (boot, quest
// render, quest event) — noteMonthlyProgress's own rollover would silently
// wipe the unclaimed state. Same-month and fresh-default states pass through.
export function settleMonthly(m, dateStr) {
  const month = monthKey(dateStr);
  if (m.month === month || m.month === "") return { state: m, earned: 0 };
  const earned = m.done >= MONTHLY_TARGET && !m.claimed ? MONTHLY_REWARD : 0;
  return { state: { month, done: 0, claimed: false }, earned };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/quests.test.js`
Expected: PASS (all existing + 4 new).

- [ ] **Step 5: Wire into main.js**

In `game/src/main.js`:

(a) Add `settleMonthly` to the quests import (~line 22).

(b) In the monthly section (~line 208, right after `let monthly = Object.assign(defaultMonthly(), store.get("monthly", {}));`), add the helper and a boot-time call:

```js
// Auto-claim a month that ended complete-but-unclaimed (follow-up ticket from
// PR #70). Runs at boot, before every monthly write (questEvent), and on
// quest render, so the payout lands at the first observation of the new month.
function settleMonthlyNow(){
  const r = settleMonthly(monthly, todayStr());
  if(r.state === monthly) return;
  monthly = r.state;
  store.set("monthly", monthly);
  if(r.earned > 0){
    wallet += r.earned; store.set("wallet", wallet); updateWalletChip();
    toast(t("quest.monthly.autoClaimed", { reward: r.earned }));
  }
}
settleMonthlyNow();
```

NOTE: `settleMonthlyNow()` must be placed *after* `toast()`/`updateWalletChip` are defined but the call itself must run at module init — main.js is one flat module; place the function + call where `monthly` is initialized (~line 208) and confirm `toast` (defined ~line 167) and `updateWalletChip` are lexically earlier. If `updateWalletChip` is defined later, replace the boot call with `settleMonthlyNow()` deferred to the existing init/boot sequence (search for where `renderQuests()`/`updateWalletChip()` are first invoked at startup) — the requirement is: it runs once at startup after the DOM helpers exist.

(c) In `questEvent` (~line 286), settle BEFORE `noteMonthlyProgress`:

```js
  if(r.completed.length){
    questToasts.push(...r.completed);
    // retention pack: every daily quest completion also feeds the monthly goal.
    // Settle first — on a month boundary noteMonthlyProgress would wipe an
    // unclaimed reward before settleMonthly could see it.
    settleMonthlyNow();
    monthly = noteMonthlyProgress(monthly, todayStr(), r.completed.length);
    store.set("monthly", monthly);
  }
```

(d) At the top of `renderQuests` (~line 295, after the `panel` null-guard), add `settleMonthlyNow();`.

(e) i18n — add to `src/i18n.js`:
- EN block, next to the other `quest.monthly.*` keys (~line 135): `"quest.monthly.autoClaimed": "Monthly reward claimed for you: +{reward} coins",`
- TH block (~line 404): `"quest.monthly.autoClaimed": "รับรางวัลรายเดือนให้คุณแล้ว: +{reward} เหรียญ",   // TH: needs native review`

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, exit 0 (suite was 1462 before this round; now +4).

- [ ] **Step 7: Commit**

```bash
git add src/quests.js src/main.js src/i18n.js test/quests.test.js
git commit -m "fix(quests): auto-claim a complete unclaimed monthly reward at rollover"
```

---

### Task 2: `dropFromQueue` — monthly badge announces exactly once

On the results path the badge fires the floating `toast()` (main.js ~line 2052) AND stays in the sticker toast queue, so `popToast` (~line 2054) can announce it again on the same screen — and on the quit path (~line 1941) the queued copy re-announces at the next results screen. Fix: whenever the floating monthly toast fires, drop `ev:monthly-40` from the queue (it stays earned / in the album).

**Files:**
- Modify: `game/src/stickers.js` (append after `popToast`)
- Modify: `game/src/main.js` (quit path ~line 1938–1941, results path ~line 2046–2052)
- Test: `game/test/stickers.test.js`

**Interfaces:**
- Consumes: sticker state shape `{ earned, queue }` from `stickers.js`.
- Produces: `dropFromQueue(state, id) -> state` — NEW state with `id` filtered from `queue`, `earned` untouched; returns the same object when `id` isn't queued.

- [ ] **Step 1: Write the failing tests**

Append to `game/test/stickers.test.js` (add `dropFromQueue` to the import at the top):

```js
describe("dropFromQueue", () => {
  it("removes only the given id and keeps earned intact", () => {
    const s = { earned: { "ev:monthly-40": "2026-07-10", "ev:welcome": "2026-07-01" },
                queue: ["ev:welcome", "ev:monthly-40"] };
    const r = dropFromQueue(s, "ev:monthly-40");
    expect(r.queue).toEqual(["ev:welcome"]);
    expect(r.earned).toEqual(s.earned);
    expect(s.queue).toHaveLength(2); // no input mutation
  });
  it("is a no-op when the id is not queued", () => {
    const s = { earned: {}, queue: ["ev:welcome"] };
    expect(dropFromQueue(s, "ev:monthly-40")).toBe(s);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/stickers.test.js`
Expected: FAIL — `dropFromQueue is not a function`.

- [ ] **Step 3: Implement**

Append to `game/src/stickers.js`:

```js
// Remove one id from the toast queue (earned stays). For awards already
// announced on another surface — e.g. the monthly badge's floating toast —
// so the results-screen sticker slot doesn't announce them a second time.
export function dropFromQueue(state, id) {
  if (!state.queue.includes(id)) return state;
  return { earned: state.earned, queue: state.queue.filter(q => q !== id) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/stickers.test.js`
Expected: PASS.

- [ ] **Step 5: Wire into main.js (both announce sites)**

(a) Add `dropFromQueue` to the stickers import (~line 35).

(b) Quit path (~line 1938–1941) — replace:

```js
    const hadMonthlyBadgeQuit = !!stickerState.earned["ev:monthly-40"];
    stickerState = evaluateAwards(stickerState, STICKER_DEFS, quitFacts, todayStr());
    store.set("stickers", stickerState);
    if(!hadMonthlyBadgeQuit && stickerState.earned["ev:monthly-40"]) toast(t("quest.monthly.badge"));
```

with:

```js
    const hadMonthlyBadgeQuit = !!stickerState.earned["ev:monthly-40"];
    stickerState = evaluateAwards(stickerState, STICKER_DEFS, quitFacts, todayStr());
    if(!hadMonthlyBadgeQuit && stickerState.earned["ev:monthly-40"]){
      // announced here once — drop the queued copy so the next results
      // screen's sticker slot doesn't announce it again
      toast(t("quest.monthly.badge"));
      stickerState = dropFromQueue(stickerState, "ev:monthly-40");
    }
    store.set("stickers", stickerState);
```

(c) Results path (~line 2046–2052) — replace:

```js
  const hadMonthlyBadge = !!stickerState.earned["ev:monthly-40"];
  stickerState = evaluateAwards(stickerState, STICKER_DEFS, stickerFacts, todayStr());
  store.set("stickers", stickerState);
  // retention pack: the monthly badge also gets the floating toast() (not
  // just the results-screen sticker slot below) since it's most likely to
  // land right as the player finishes the quest that crossed 40/40.
  if(!hadMonthlyBadge && stickerState.earned["ev:monthly-40"]) toast(t("quest.monthly.badge"));
```

with:

```js
  const hadMonthlyBadge = !!stickerState.earned["ev:monthly-40"];
  stickerState = evaluateAwards(stickerState, STICKER_DEFS, stickerFacts, todayStr());
  // retention pack: the monthly badge gets the floating toast() since it's
  // most likely to land right as the player finishes the quest that crossed
  // 40/40 — and ONLY the toast: the queued sticker copy is dropped so the
  // sticker slot below (and future results screens) won't repeat it.
  if(!hadMonthlyBadge && stickerState.earned["ev:monthly-40"]){
    toast(t("quest.monthly.badge"));
    stickerState = dropFromQueue(stickerState, "ev:monthly-40");
  }
  store.set("stickers", stickerState);
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/stickers.js src/main.js test/stickers.test.js
git commit -m "fix(stickers): monthly badge announces once — drop queued copy after floating toast"
```

---

### Task 3: Supplies shelf — consumables get their own shop section

The Streak Freeze currently falls through `renderShop`'s type routing into the "Street decorations" box (`main.js` ~line 2123: anything not skin/backdrop/effect/soundpack → `decoBox`). Give consumables a dedicated **Supplies** section, and stop `makeShopRow` reading the `freezes` global for *any* consumable (it must read a per-id count so a future second consumable — e.g. a rewarded-video item — can't render the freeze count).

**Files:**
- Modify: `game/index.html` (~line 1153, between the Sounds and Street sections)
- Modify: `game/src/main.js` (`renderShop` ~lines 2093–2125, `makeShopRow` ~lines 2151/2171–2175)
- Modify: `game/src/i18n.js` (new key `shop.supplies` in both locales)

No new unit test file: this is main.js/markup wiring (untested by design); `test/i18n-usage.test.js` auto-covers the new key, and Task 5's probe screenshots verify placement.

- [ ] **Step 1: Add the section markup**

In `game/index.html`, after the Sounds section (`<div class="scorelist" id="shop-sounds"></div>`, ~line 1153) and before the Street decorations `sect`, insert:

```html
    <div class="sect" data-i18n="shop.supplies">Supplies</div>
    <div class="scorelist" id="shop-supplies"></div>
```

- [ ] **Step 2: Route consumables to it in `renderShop`**

In `game/src/main.js` (~line 2093–2095), add the box and include it in the clearing loop:

```js
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), supBox = $("#shop-supplies"), decoBox = $("#shop-street");
  for(const b of [dailyBox, seasonBox, skinBox, bdBox, fxBox, sndBox, supBox, decoBox]) b.innerHTML = "";
```

and extend the routing ternary (~line 2123):

```js
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : item.type==="consumable" ? supBox : decoBox;
```

- [ ] **Step 3: Per-id consumable count**

In `game/src/main.js`, next to `makeShopRow`, add:

```js
// Counted consumables live outside shopState.owned; each id maps to its own
// counter so a future second consumable can never render the freeze count.
function consumableCount(item){ return item.id === "streak-freeze" ? freezes : 0; }
```

Then in `makeShopRow` replace the two reads of the `freezes` global:
- ~line 2151: `const ownedCount = item.type === "consumable" ? `<small>${t("shop.owned-count", { n: consumableCount(item), cap: item.cap })}</small>` : "";`
- consumable branch (~lines 2171–2175): compute `const have = consumableCount(item);` once, then `btn.disabled = have >= item.cap || wallet < item.price;` and `const r = buyConsumable(item, wallet, have);`. The write-back (`freezes = r.count; store.set("freezes", freezes);`) stays freeze-specific — guard it per id:

```js
    btn.onclick = () => {
      const r = buyConsumable(item, wallet, consumableCount(item));
      if(!r.ok) return;
      wallet = r.wallet;
      if(item.id === "streak-freeze"){ freezes = r.count; store.set("freezes", freezes); }
      store.set("wallet", wallet);
      justBought = { id: item.id, at: performance.now() };
      updateWalletChip(); updateStreakChip(); renderShop();
    };
```

- [ ] **Step 4: i18n keys**

- EN block, next to the other `shop.*` section labels: `"shop.supplies": "Supplies",`
- TH block: `"shop.supplies": "ของใช้",   // TH: needs native review`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, exit 0 (i18n-usage picks up `shop.supplies` from the `data-i18n` attribute / key tables in both locales).

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js src/i18n.js
git commit -m "feat(shop): dedicated Supplies shelf for consumables; per-id consumable counts"
```

---

### Task 4: Freeze chip pluralization — "1 freeze", not "1 freeze(s)"

**Files:**
- Modify: `game/src/main.js` (`updateStreakChip`, ~line 154–160)
- Modify: `game/src/i18n.js` (EN `home.freezes` ~line 29; new `home.freeze-one` in both locales)

- [ ] **Step 1: Split the key**

In `src/i18n.js`:
- EN: change `"home.freezes": "{n} freeze(s)",` → `"home.freezes": "{n} freezes",` and add `"home.freeze-one": "1 freeze",`
- TH (~line 300): Thai doesn't inflect for number — keep `"home.freezes": "น้ำแข็ง {n} ชิ้น",   // TH: needs native review` and add `"home.freeze-one": "น้ำแข็ง 1 ชิ้น",   // TH: needs native review`

- [ ] **Step 2: Pick the key by count in `updateStreakChip`**

Replace (~line 159) `if(label) label.textContent = t("home.freezes", { n: freezes });` with:

```js
    if(label) label.textContent = freezes === 1 ? t("home.freeze-one") : t("home.freezes", { n: freezes });
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/i18n.js
git commit -m "fix(i18n): freeze chip pluralization — '1 freeze' at n=1"
```

---

### Task 5: Final verify — build, probes, sweep, PR

**Files:**
- Modify: `game/dist/app.js` (rebuild), `game/www/` is NOT staged here (deploy workflow stages it).

- [ ] **Step 1: Rebuild dist and confirm it's fresh**

```bash
npm run build
git status --short   # dist/app.js should show modified
git diff --stat dist/app.js
```

Commit the rebuilt bundle:

```bash
git add dist/app.js
git commit -m "build: rebuild dist for retention follow-ups"
```

(If earlier tasks already rebuilt/committed dist, this is a rebuild-and-diff check: `npm run build && git status --short` must come back clean.)

- [ ] **Step 2: Full suite, real exit code**

Run: `npm test`
Expected: PASS, exit 0, ~1468 tests.

- [ ] **Step 3: Probe screenshots (playwright chromium, python http.server :8000)**

Probe matrix (seed localStorage before load; keys are `nbhsk.`-prefixed JSON):
1. **Auto-claim:** seed `nbhsk.monthly = {"month":"2026-06","done":40,"claimed":false}`, `nbhsk.wallet = 100` → load app → floating toast "Monthly reward claimed for you: +1500 coins" appears, wallet chip shows 1,600, quests screen shows monthly 0/40.
2. **Supplies shelf:** open Collection → Streak Freeze row renders under a "Supplies" heading (not under Street decorations); Owned 0/2 shown; buy still works (seed wallet 1300 → two buys → cap-disabled).
3. **Dedup:** seed `nbhsk.monthly = {"month":<current>,"done":39,...}` and quest state 1-away, finish a round crossing 40 → floating badge toast fires, results sticker slot does NOT show the monthly sticker (may show another queued sticker or stay hidden); album still shows the badge earned.
4. **Chip plural:** seed `nbhsk.freezes = 1` → home chip reads "1 freeze"; seed 2 → "2 freezes".

- [ ] **Step 4: Responsive sweep**

```bash
node scripts/responsive-sweep.mjs
```
Expected: 10/10 (run twice).

- [ ] **Step 5: Push and open PR against development**

```bash
git push -u origin fix/retention-followups
gh pr create --base development --title "fix: retention-pack follow-ups — monthly auto-claim, Supplies shelf, badge announce dedup" --body "..."
```

PR body must list the three tickets + pluralization minor, note the 2 new TH strings tagged for native review, and that SHELL bump happens at release time (not in this PR).
