# Audit v50 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all P0–P2 findings from the 2026-07-10 UX audit of SHELL v50: Thai font stacks (F1), the two blue chips (F2), merge Daily Quests into the Street screen and drop the Quests nav tab (F3, per Jordan's decision), Streak Freeze description (F4), monthly reward line (F5), gloss content pass (F7, scope: all `+` glosses HSK1–3 + HSK4–6 rank≤1000), desktop ambient enhancement (F8). F6 (painted thumbnails) is **asset-gated → deferred to the next art drop** — do not attempt it.

**Architecture:** index.html holds all markup+CSS inline; `src/main.js` is the flat DOM-wiring module; `src/nav.js` is the pure tab model (tests in `test/nav.test.js`). Gloss data lives in the ROOT repo (`/root/work/HSK/product/by-level/*.csv`) and flows into the game via `game/build_game_data.py` → `data/words.js`.

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild.

## Global Constraints

- Game repo: `/root/work/HSK/game`, branch `fix/audit-v50` off `development`. Root repo (`/root/work/HSK`, branch `main`) is touched ONLY by Task 6 (product CSVs) — never stage `game/` from the root repo.
- Never pipe `npm test` through tail/grep — the real exit code gates every commit.
- Every new/changed i18n key exists in BOTH `en` and `th` blocks of `src/i18n.js`; TH lines suffixed `   // TH: needs native review`.
- Do NOT commit `dist/app.js` in Tasks 1–5 (final verify rebuilds it once). Task 6 commits `data/words.js`/`data/words.json`/`data/manifest.json` (its actual deliverable) but still not dist.
- Scout line numbers below were taken at `development` HEAD (= v50 release); earlier tasks in this plan shift later line numbers — locate by content.
- sw.js SHELL bump happens at release cut (v51), NOT in this branch.

---

### Task 1: Thai-capable font stacks (audit F1 — P0)

Eight selectors in `index.html` hardcode `font-family:'LC Latin',"Segoe UI",sans-serif` — no Thai-capable face, so Thai labels paint as blank (START button, pause controls). The body stack (index.html:49) is the reference: `'LC Latin','LC Thai',"Segoe UI",system-ui,-apple-system,"Noto Sans","Noto Sans Thai",sans-serif`.

**Files:**
- Modify: `game/index.html` — the 8 declarations at lines 227 (`.pause-title`), 229 (`.pause-resume`), 255 (`.pause-quit`), 291 (`.combo-strip-label`), 459 (`.bignum`), 586 (`.brand-sub`), 590 (`.brand-main`), 681 (`.start-btn`)

**Interfaces:** none (CSS only).

- [ ] **Step 1: Edit all 8 declarations**

Replace every occurrence of

```css
font-family:'LC Latin',"Segoe UI",sans-serif;
```

with

```css
font-family:'LC Latin','LC Thai',"Segoe UI","Noto Sans Thai",sans-serif;
```

Verify with `grep -n "LC Latin" index.html`: the only lines WITHOUT `'LC Thai'` after the edit should be the `@font-face` block (lines ~11–28) — the body stack at ~49 already has it.

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS, exit 0 (CSS is untested; this guards against accidental HTML breakage — `test/i18n-usage.test.js` parses index.html).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix(i18n): Thai-capable font stacks on start/pause/combo/brand text (audit F1)"
```

---

### Task 2: Retire the last two blue chips (audit F2 — P1)

The home Lv/XP chip (`.level-cap`, index.html:565) and battle round pill (`.hud-round-pill`, index.html:207–209) still use `--lc-sky`/blue. The round pill's comment says "blue per PRD §6.2" — this change intentionally amends that PRD line (note it in the commit body).

**Files:**
- Modify: `game/index.html` (two CSS rules; no markup changes)

**Interfaces:** none. `updateLevelChip()` (main.js:99–109) and `updateHud()` (main.js:989–1001) only set text/width — untouched.

- [ ] **Step 1: Recolor the level chip**

At index.html:565, replace

```css
.level-cap{background-color:var(--lc-sky); border:2px solid var(--lc-teal); color:var(--lc-teal);}
```

with

```css
.level-cap{background-color:var(--lc-teal); border:2px solid var(--lc-gold); color:#FFF8EC;}
```

Then find the `.xp-bar i` fill rule (search `xp-bar`); if its fill is a blue/sky token, set it to `var(--lc-gold)`. If it's already gold/green, leave it. Check `--lc-gold` exists in the token block at index.html:~30–40 (if the gold token has another name, e.g. `--lc-amber`, use that — do not invent a hex).

- [ ] **Step 2: Recolor the round pill**

At index.html:207–209, replace the `.hud-round-pill` overrides so the pill uses the same treatment as the default `.hud-pill` (the tan/cream capsule the coin counter uses), keeping `font-weight:800`:

```css
/* round-counter capsule — palette tan (amends PRD §6.2's blue) */
.hud-round-pill{font-weight:800;}
```

(If `.hud-pill`'s base doesn't already provide bg/border/color, copy the coin pill's values instead of leaving it transparent — inspect the neighbouring rules at index.html:204–206.)

- [ ] **Step 3: Visual spot-check**

Serve (`python3 -m http.server 8000` from the game dir) and screenshot home + battle at 390×844 with the playwright-cached chromium (copy the launch pattern from `scripts/responsive-sweep.mjs`). Confirm: no blue on either chip; Lv text legible on the new fill; round pill legible. Save screenshots to `/root/.claude/jobs/88920a9e/tmp/task2-chips/`.

- [ ] **Step 4: Run the full suite, then commit**

Run: `npm test` → PASS, exit 0.

```bash
git add index.html
git commit -m "fix(ui): retire the last two blue chips — level cap + round pill to palette (audit F2)

Amends PRD §6.2 (round capsule was specced blue)."
```

---

### Task 3: Merge Daily Quests into Street; 4-tab nav (audit F3 core — P1)

Jordan's decision: the Quests screen dissolves into the Street screen (scene on top, quests below); the bottom nav drops to Home / Street / Progress / More.

**Files:**
- Modify: `game/index.html` (#s-street ~923–928, #s-quests ~930–934, nav ~1181–1188)
- Modify: `game/src/nav.js` (TABS, line 7)
- Modify: `game/src/main.js` (show() dispatcher ~514–515)
- Modify: `game/src/i18n.js` (remove `nav.quests` EN+TH)
- Modify: `game/scripts/responsive-sweep.mjs` (new street gate)
- Test: `game/test/nav.test.js`

**Interfaces:**
- Consumes: `renderQuests()` (main.js:312–349) and `renderStreet()` (main.js:2394–2452) — both untouched internally.
- Produces: street screen markup containing `#quest-panel`; `TABS = ["home","street","progress","more"]`. Task 7's probes rely on `#s-street #quest-panel` being populated when the street tab opens.

- [ ] **Step 1: Update the failing test first**

In `test/nav.test.js` line 6, change the literal:

```js
expect(TABS).toEqual(["home", "street", "progress", "more"]);
```

Also scan the file for any other literal mention of `"quests"` (e.g. an `activeTabFor("quests")` identity case inside a loop uses TABS — loops need no edit; only literals do) and remove/adjust.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/nav.test.js`
Expected: FAIL (TABS still has "quests").

- [ ] **Step 3: nav.js**

In `src/nav.js:7`: `export const TABS = ["home", "street", "progress", "more"];`

- [ ] **Step 4: Run to verify nav tests pass**

Run: `npx vitest run test/nav.test.js` → PASS.

- [ ] **Step 5: Markup — dissolve #s-quests into #s-street**

In `index.html`, replace the two blocks (~lines 923–934):

```html
<!-- STREET -->
<div class="screen festive" id="s-street">
  <h2 data-i18n="street.title">Lucky Cat Street</h2>
  <canvas id="street-cv"></canvas>
  <div id="street-caption"></div>
</div>

<!-- QUESTS -->
<div class="screen festive" id="s-quests">
  <h2 data-i18n="quests.title">Daily Quests</h2>
  <div id="quest-panel"></div>
</div>
```

with:

```html
<!-- STREET (+ daily quests, merged per 2026-07-10 audit F3) -->
<div class="screen festive" id="s-street">
  <h2 data-i18n="street.title">Lucky Cat Street</h2>
  <canvas id="street-cv"></canvas>
  <div id="street-caption"></div>
  <div class="sect" data-i18n="quests.title">Daily Quests</div>
  <div id="quest-panel"></div>
</div>
```

(`.sect` is the shop's existing section-heading class — reuse it, don't invent one.)

Remove the quests nav button (index.html:1186) entirely — the nav keeps 4 buttons.

- [ ] **Step 6: main.js dispatcher**

At main.js ~514–515, the `show()` dispatcher currently has:

```js
  if(name==="street"){ renderStreet(); }
  if(name==="quests"){ renderQuests(); }
```

Replace with:

```js
  if(name==="street"){ renderStreet(); renderQuests(); }
```

Grep `src/main.js` for any other `"quests"` **screen** reference (`show("quests")`, `data-go` handling) — the scout found none besides the dispatcher, but verify. Quest LOGIC (`questEvent`, `renderQuests`, store keys) stays exactly as is; `renderQuests()` at boot (main.js:2879) stays.

- [ ] **Step 7: i18n**

Remove `nav.quests` from both EN (src/i18n.js:63) and TH (src/i18n.js:335). Keep `quests.title` (still used by the new street section heading).

- [ ] **Step 8: Sweep gate for the merged screen**

In `scripts/responsive-sweep.mjs`, add a probe run on every viewport after the existing home probe: navigate to street (click `[data-go="street"]`), assert (a) `#s-street` is the active screen, (b) `#quest-panel` has ≥1 child element, (c) `#bottom-nav` bounding rect fully in viewport (reuse `probeNavReachable`). Follow the structure of the existing shop probe (~lines 290–300). Name the gate `street-quests`.

- [ ] **Step 9: Full suite + sweep**

Run: `npm test` → PASS, exit 0.
Run: `node scripts/responsive-sweep.mjs` → all viewports pass including the new gate.

- [ ] **Step 10: Commit**

```bash
git add index.html src/nav.js src/main.js src/i18n.js scripts/responsive-sweep.mjs test/nav.test.js
git commit -m "feat(nav): merge Daily Quests into Street; 4-tab bottom nav (audit F3)"
```

---

### Task 4: Monthly reward line + Streak Freeze description (audit F5, F4)

**Files:**
- Modify: `game/src/main.js` (`renderQuests` mrow ~312–349; `makeShopRow` consumable branch)
- Modify: `game/src/i18n.js` (one new key)

**Interfaces:**
- Consumes: `monthlyStatus()` (`{done,target,reward,complete,claimed}`), existing i18n key `quest.reward` (used by daily rows as `t("quest.reward", { reward: q.reward })`), `tOr(key, fallback)` helper (already used in makeShopRow for `item.<id>` names).

- [ ] **Step 1: Monthly row shows its prize (F5)**

In `renderQuests`, the monthly row's `mq-top` div currently renders status + title. Add the reward, right-aligned like daily rows, visible while unclaimed. Change the `mrow.innerHTML` template: inside the `mq-top` div, after the `<span class="qd">…</span>`, append

```html
      <span class="qr">${ms.claimed ? "" : t("quest.reward", { reward: ms.reward })}</span>
```

(Match the exact current template when editing — it was touched by the retention round; the `qr` class is what daily rows use for their reward span.)

- [ ] **Step 2: Consumable description line (F4)**

(a) i18n — add next to the other `item.*` keys if such a block exists, otherwise near the shop keys:
- EN: `"item.streak-freeze.desc": "Covers a missed day — your streak survives",`
- TH: `"item.streak-freeze.desc": "ครอบคลุมวันที่ขาดหาย — สตรีคของคุณยังอยู่",   // TH: needs native review`

(b) In `makeShopRow`, the copy block currently builds `ownedCount` for consumables. Extend: for consumables, look up an optional description and insert it between the name and the price line:

```js
  const desc = item.type === "consumable" ? tOr("item." + item.id + ".desc", "") : "";
  const descHtml = desc ? `<small class="item-desc">${desc}</small>` : "";
```

and include `${descHtml}` in `copy.innerHTML` right after the `<b>…</b>` name element. Add a minimal CSS rule in index.html next to the other shop-row styles: `.shop-copy .item-desc{display:block;color:var(--lc-ink-soft, #736A5C);}` — check the token name actually used for muted text in index.html (search `muted` / `ink-soft`) and use that; don't invent one.

- [ ] **Step 3: Full suite**

Run: `npm test` → PASS, exit 0 (i18n-usage auto-discovers the new key in both locales).

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/i18n.js index.html
git commit -m "feat(retention): monthly quest shows its reward; Streak Freeze explains itself (audit F4, F5)"
```

---

### Task 5: Void polish + desktop ambient (audit F3 remainder, F8 — CSS only)

**Files:**
- Modify: `game/index.html` only.

- [ ] **Step 1: Anchor More and Tone Trainer content**

Give the two sparse screens a vertically-balanced layout instead of top-packed. Add (near the screen-layout rules):

```css
/* sparse screens read as composed, not unfinished (audit F3) */
#s-more, #s-tones{display:flex; flex-direction:column;}
#s-more::after, #s-tones::after{content:""; flex:1 1 auto;}
#s-more{justify-content:center;}
```

IMPORTANT: inspect the actual screen ids first (`grep -n 's-more\|s-tones' index.html`) and how `.screen` display works when toggled `.on` (if `.screen.on{display:block}` exists, scope the flex rule as `#s-more.on, #s-tones.on{display:flex;}` so the toggle isn't broken). Verify with a screenshot at 390×844 that More's content block sits visually centered and Tone Trainer's quiz stays in the upper-middle with breathing room, and that neither screen scrolls where it didn't before.

- [ ] **Step 2: Desktop ambient enhancement (F8)**

The ≥900px vignette shipped in 98d7265 (index.html:55–58). Enrich it: inside the same `@media (min-width:900px)` block, layer the existing home scene art faintly behind the vignette so the margins feel inhabited:

```css
  body{background:
    radial-gradient(1100px 780px at 50% 30%, rgba(255,251,241,.92) 0%, rgba(244,236,220,.94) 46%, rgba(236,222,192,.97) 100%),
    url("assets/bg-home.webp") center 30%/cover no-repeat fixed var(--lc-cream);}
```

Check `assets/bg-home.webp` exists (`ls assets/ | grep bg-`) — use the actual home-scene asset filename. Screenshot at 1280×800 to confirm: art is visible but faint (must not compete with the app column), no banding, `#app`'s shadow still reads.

- [ ] **Step 3: Full suite + commit**

Run: `npm test` → PASS, exit 0.

```bash
git add index.html
git commit -m "feat(ui): anchor sparse screens; desktop margins get faint scene art (audit F3/F8)"
```

---

### Task 6: Gloss content pass (audit F7 — data, TWO repos)

Rewrite the pipeline's mechanical `<gloss A> + <gloss B>` English glosses into natural phrases. **Scope (Jordan-approved, expanded from "top-500" to cover what players actually see — note this in the PR):** every `english`-column `+` gloss in HSK1–3 (0+7+177 = 184 rows) plus HSK4–6 rank≤1000 (1+1+2 = 4 rows) → **188 rows**. `english_raw` and `thai` columns are untouched (TH has no `+` glosses). The controller (not this task's implementer) handles the LLM rewrite + review; this task defines the mechanics around it.

**Files:**
- Modify: ROOT repo `product/by-level/HSK{2,3,4,5,6}_words-to-remember_bilingual.csv`
- Modify (generated): `game/data/words.js`, `game/data/words.json`, `game/data/manifest.json`
- Create: `game/test/gloss-quality.test.js`

**Interfaces:**
- Consumes: rewrite map produced by the controller's review round — a CSV at `/root/.claude/jobs/88920a9e/tmp/gloss-rewrites.csv` with columns `level,rank,hanzi,english_old,english_new`.
- Produces: regenerated `data/words.js` with no `+` glosses at HSK1–3.

- [ ] **Step 1: Write the failing data test**

`game/test/gloss-quality.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// data/words.json: { "1": [ { h, p, e, t, lv, f, ... }, ... ], ... }
const DATA = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));

describe("gloss quality (audit F7)", () => {
  it("HSK1-3 glosses contain no mechanical '+' joins", () => {
    for (const lv of ["1", "2", "3"]) {
      const bad = DATA[lv].filter(w => / \+ |\+ | \+/.test(w.e));
      expect(bad.map(w => `${lv}:${w.h}:${w.e}`)).toEqual([]);
    }
  });
});
```

FIRST verify the real shape of `data/words.json` (top-level keys, field name for english) by reading its first 500 bytes, and adapt the test to the actual structure. Run `npx vitest run test/gloss-quality.test.js` → must FAIL (HSK3 has 177 offenders).

- [ ] **Step 2: Apply the reviewed rewrite map to the product CSVs (ROOT repo)**

Script (run from `/root/work/HSK`):

```python
import csv
rew = {}
with open('/root/.claude/jobs/88920a9e/tmp/gloss-rewrites.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        rew[(r['level'], r['hanzi'], r['english_old'])] = r['english_new']
applied = 0
for n in '23456':
    path = f'product/by-level/HSK{n}_words-to-remember_bilingual.csv'
    rows = list(csv.reader(open(path, encoding='utf-8-sig')))
    hdr = rows[0]; ei = hdr.index('english'); hi = hdr.index('hanzi')
    for row in rows[1:]:
        k = (n, row[hi], row[ei])
        if k in rew:
            row[ei] = rew[k]; applied += 1
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        csv.writer(f).writerows(rows)
print('applied', applied)  # must equal the rewrite-map row count (188)
```

Sanity: `git -C /root/work/HSK diff --stat` shows only the 5 CSVs; spot-check 3 rows with `git diff`. The count printed MUST equal the map size — if lower, keys mismatched (stop and report).

- [ ] **Step 3: Commit the root repo**

```bash
cd /root/work/HSK
git add product/by-level/*.csv
git commit -m "content: rewrite mechanical '+' compound glosses — HSK1-3 all, HSK4-6 top-1000 (188 rows)"
git push
```

- [ ] **Step 4: Rebuild game data (game repo)**

```bash
cd /root/work/HSK/game
python3 build_game_data.py
git status --short   # expect data/words.js data/words.json data/manifest.json
```

- [ ] **Step 5: Run the data test + full suite**

`npx vitest run test/gloss-quality.test.js` → PASS.
`npm test` → PASS, exit 0 (watch for any test pinning gloss text — if one fails, adapt IT only if it pinned an old '+' gloss incidentally; report anything else).

- [ ] **Step 6: Commit the game repo**

```bash
git add data/words.js data/words.json data/manifest.json test/gloss-quality.test.js
git commit -m "content: natural glosses for '+' compounds; permanent gloss-quality gate (audit F7)"
```

---

### Task 7: Final verify — dist, probes, sweep, PR

- [ ] **Step 1: Rebuild dist, commit, rebuild-and-diff clean**

```bash
npm run build && git add dist/app.js && git commit -m "build: rebuild dist for audit-v50 round"
npm run build && git status --short   # must be clean
```

- [ ] **Step 2: Full suite** — `npm test` → PASS, exit 0.

- [ ] **Step 3: Probe matrix (playwright chromium, python3 -m http.server 8000, screenshots to `/root/.claude/jobs/88920a9e/tmp/audit-v50-verify/`):**

1. TH home: START button label "เริ่ม" VISIBLE (F1) — compare against blank-button bug.
2. TH battle pause: open pause mid-round → resume/quit buttons show Thai labels (F1).
3. Home: Lv chip no longer blue; battle: round pill no longer blue (F2).
4. Street tab: scene canvas + caption + "Daily Quests" section + populated quest rows on one screen; bottom nav has 4 tabs; monthly row shows "+1500"-style reward text (F3, F5).
5. Shop Supplies: Streak Freeze row shows the description line, EN and TH (F4).
6. More screen at 390×844: content vertically balanced (F3).
7. Desktop 1280×800: faint scene art in margins (F8).
8. Data spot-check (no browser): `node -e` load `data/words.json`, print the entry for 两万人 — gloss must be natural, no '+'.

- [ ] **Step 4: Sweep ×2** — `node scripts/responsive-sweep.mjs` twice → all gates green including `street-quests`.

- [ ] **Step 5: Push + PR against development**

```bash
git push -u origin fix/audit-v50
gh pr create --base development --title "fix: v50 audit round — Thai fonts, palette chips, Street+Quests merge, gloss pass" --body "..."
```

PR body: the 8 findings with disposition (F6 deferred/asset-gated), the nav restructure (5→4 tabs, PRD nav section amended), gloss scope note (expanded from top-500 to HSK1-3-all + HSK4-6-top-1000, 188 rows, root-repo commit <sha>), new TH strings for native review, SHELL v51 at release cut.
