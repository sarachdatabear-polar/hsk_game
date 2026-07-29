# Supporter Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the Supporter offer as a quiet, once-per-day line at peak moments on the results screen, and show a Supporter ♥ badge on friend cards and the profile — all dark until billing goes live.

**Architecture:** A pure policy module (`src/monetization/supporter-moment.js`, mirrors `interstitial-policy.js`) decides show/deny; a small `src/ui/supporter-moment-row.js` factory renders one line + button into a new `#r-supporter` element at the bottom of results; the friend codec gains an `LCH3` version carrying a `supporter` flag rendered as a CSS-only ♥ on avatar chips and a profile chip. Spec: `docs/superpowers/specs/2026-07-29-supporter-placement-design.md`.

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild, headless-chromium probes (playwright-core).

## Global Constraints

- Work on branch `feat/supporter-placement` cut from up-to-date `origin/development`.
- **Never mask the test exit code** — run `npm test` bare, no pipes to tail/grep.
- `main.js` is frozen: only the touches listed in Task 4/5 (mount a factory, one-line
  `noteDaily` return, `endBattle` call, `getMyCard` field, `renderProfileDashboard`
  chip toggle). All new logic lives in new modules.
- New storage key `nbhsk.supporterMoment` is **local-only** — do NOT add it to
  `SYNC_KEYS` in `src/merge.js`. No migration ladder entry (new key, absence-safe).
- No new image assets (precache headroom is ~36 KB). Badge is text/CSS only.
- New Thai strings get a trailing `// TH-REVIEW` comment.
- Persistence only via the injected `store` (`src/storage.js` createStore), never raw
  `localStorage`.
- Run `npm run lint` before every push; rebuild `dist/` (`npm run build`) before the
  final push (deployed app uses `dist/app.js`).
- Commit after each green task.

---

### Task 1: Policy module `supporter-moment.js`

**Files:**
- Create: `src/monetization/supporter-moment.js`
- Test: `test/supporter-moment.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (Tasks 3–4 rely on these exact names):
  - `defaultSupporterMoment()` → `{ lastShownDay: "" }`
  - `shouldShowSupporterMoment(state, facts, todayDay)` → `{ show: boolean, reason: string }`
    - `state`: `{ lastShownDay: string }`
    - `facts`: `{ streakSaved, bossDefeated, leveledUp, isSupporter, supporterOn }` (booleans)
    - `todayDay`: local `"YYYY-MM-DD"` string (same convention as `daily.js`)
  - `recordSupporterMomentShown(state, todayDay)` → new state with `lastShownDay: todayDay`

- [ ] **Step 1: Write the failing tests**

```js
// test/supporter-moment.test.js
import { describe, it, expect } from "vitest";
import {
  defaultSupporterMoment,
  shouldShowSupporterMoment,
  recordSupporterMomentShown,
} from "../src/monetization/supporter-moment.js";

const DAY = "2026-07-29";
const NEXT = "2026-07-30";
// A fully-qualifying baseline; each test flips ONE thing off it.
const OK = { streakSaved: false, bossDefeated: true, leveledUp: false, isSupporter: false, supporterOn: true };

describe("defaultSupporterMoment", () => {
  it("starts with no last-shown day", () => {
    expect(defaultSupporterMoment()).toEqual({ lastShownDay: "" });
  });
});

describe("shouldShowSupporterMoment", () => {
  it("shows when billing is on, not a supporter, a moment happened, not shown today", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), OK, DAY))
      .toEqual({ show: true, reason: "ok" });
  });
  it("each moment qualifies alone", () => {
    for (const key of ["streakSaved", "bossDefeated", "leveledUp"]) {
      const facts = { ...OK, streakSaved: false, bossDefeated: false, leveledUp: false, [key]: true };
      expect(shouldShowSupporterMoment(defaultSupporterMoment(), facts, DAY).show).toBe(true);
    }
  });
  it("denies when no moment happened", () => {
    const facts = { ...OK, streakSaved: false, bossDefeated: false, leveledUp: false };
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), facts, DAY))
      .toEqual({ show: false, reason: "no-moment" });
  });
  it("denies a supporter even on a qualifying moment", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), { ...OK, isSupporter: true }, DAY))
      .toEqual({ show: false, reason: "supporter" });
  });
  it("denies when billing is dark (supporterOn false)", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), { ...OK, supporterOn: false }, DAY))
      .toEqual({ show: false, reason: "dark" });
  });
  it("denies a second show the same day, allows the next day", () => {
    const shown = recordSupporterMomentShown(defaultSupporterMoment(), DAY);
    expect(shouldShowSupporterMoment(shown, OK, DAY)).toEqual({ show: false, reason: "shown-today" });
    expect(shouldShowSupporterMoment(shown, OK, NEXT).show).toBe(true);
  });
  it("fails safe on missing state/facts/day", () => {
    expect(shouldShowSupporterMoment(null, OK, "").show).toBe(false);
    expect(shouldShowSupporterMoment(null, null, DAY).show).toBe(false);
    expect(shouldShowSupporterMoment(undefined, OK, DAY).show).toBe(true); // state absent = never shown
  });
});

describe("recordSupporterMomentShown", () => {
  it("returns a NEW state stamped with the day (no mutation)", () => {
    const s = defaultSupporterMoment();
    const r = recordSupporterMomentShown(s, DAY);
    expect(r).toEqual({ lastShownDay: DAY });
    expect(s).toEqual({ lastShownDay: "" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/supporter-moment.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```js
// src/monetization/supporter-moment.js
"use strict";
// Supporter-offer placement policy — pure, DOM/storage-free decision logic
// (same shape as interstitial-policy.js). Go-live plan step 7: show a quiet
// supporter line on the results screen ONLY at a peak moment (streak saved,
// review challenge won, level up), at most once per local day, never to an
// existing supporter, and never while billing is dark (supporterOn=false).
// `todayDay` is the local "YYYY-MM-DD" string callers already use for
// daily.js — never call Date here. `reason` is for tests/debug, not copy.

export function defaultSupporterMoment() {
  return { lastShownDay: "" };
}

export function shouldShowSupporterMoment(state, facts, todayDay) {
  const s = state || {};
  const f = facts || {};
  if (!f.supporterOn) return { show: false, reason: "dark" };
  if (f.isSupporter) return { show: false, reason: "supporter" };
  if (!(f.streakSaved || f.bossDefeated || f.leveledUp)) {
    return { show: false, reason: "no-moment" };
  }
  if (!todayDay) return { show: false, reason: "no-day" };
  if (s.lastShownDay === todayDay) return { show: false, reason: "shown-today" };
  return { show: true, reason: "ok" };
}

export function recordSupporterMomentShown(state, todayDay) {
  return { ...(state || {}), lastShownDay: todayDay };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/supporter-moment.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/supporter-moment.js test/supporter-moment.test.js
git commit -m "feat(monetization): supporter-moment placement policy (pure)"
```

---

### Task 2: Friend codec `LCH2` → `LCH3` (supporter flag)

**Files:**
- Modify: `src/friend-compare.js`
- Test: `test/friend-compare.test.js` (extend; some existing assertions pin LCH2 and must be updated — that is expected red)

**Interfaces:**
- Consumes: nothing new.
- Produces (Task 5 relies on):
  - `normalizeFriendCard(card)` now returns a `supporter: boolean` field (default `false`).
  - `encodeFriendCard` emits `LCH3` (9 pipe-parts, 9th = `"1"`/`"0"`).
  - `decodeFriendCard` accepts LCH1 (6 parts), LCH2 (8), LCH3 (9); non-LCH3 decode → `supporter: false`.
  - `buildFriendCompare(...)` return gains `theirSupporter: boolean`. `METRICS`/`rows` UNCHANGED — supporter is display, not a compared metric.

- [ ] **Step 1: Write the failing tests (append to `test/friend-compare.test.js`)**

```js
describe("LCH3 supporter flag", () => {
  it("encode emits LCH3 with 9 parts and a 0/1 supporter tail", () => {
    const code = encodeFriendCard({ ...CARD_V2, supporter: true });
    const parts = code.split("|");
    expect(parts[0]).toBe("LCH3");
    expect(parts.length).toBe(9);
    expect(parts[8]).toBe("1");
    expect(encodeFriendCard(CARD_V2).split("|")[8]).toBe("0");
  });
  it("round-trips supporter through encode/decode", () => {
    expect(decodeFriendCard(encodeFriendCard({ ...CARD_V2, supporter: true })).supporter).toBe(true);
    expect(decodeFriendCard(encodeFriendCard(CARD_V2)).supporter).toBe(false);
  });
  it("legacy LCH1/LCH2 codes still decode, with supporter false", () => {
    const lch2 = ["LCH2", "Jo", 3, 1, 10, 2, "", 20000].join("|");
    const lch1 = ["LCH1", "Jo", 3, 1, 10, 2].join("|");
    expect(decodeFriendCard(lch2)).toMatchObject({ level: 3, supporter: false });
    expect(decodeFriendCard(lch1)).toMatchObject({ level: 3, supporter: false });
  });
  it("hostile supporter field values clamp to false, never throw", () => {
    for (const v of ["banana", "", "2", "true", "01"]) {
      const code = ["LCH3", "Jo", 3, 1, 10, 2, "", 20000, v].join("|");
      expect(decodeFriendCard(code).supporter).toBe(false);
    }
  });
  it("normalizeFriendCard defaults supporter to false and is lenient on truthy forms", () => {
    expect(normalizeFriendCard({}).supporter).toBe(false);
    expect(normalizeFriendCard({ supporter: true }).supporter).toBe(true);
    expect(normalizeFriendCard({ supporter: "1" }).supporter).toBe(true);
    expect(normalizeFriendCard({ supporter: "yes" }).supporter).toBe(false);
  });
  it("buildFriendCompare exposes theirSupporter and keeps exactly 4 compare rows", () => {
    const cmp = buildFriendCompare(CARD_V2, { ...CARD_V2, supporter: true }, 20001);
    expect(cmp.theirSupporter).toBe(true);
    expect(cmp.rows.map(r => r.key)).toEqual(["level", "streak", "mastered", "stickers"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/friend-compare.test.js`
Expected: the new describe FAILS; additionally any existing assertions that pin "always emits LCH2 / 8 parts" now conflict with the coming change — note them for Step 3.

- [ ] **Step 3: Implement in `src/friend-compare.js`**

Add beside the existing prefixes (line ~24):

```js
const PREFIX_V3 = "LCH3";
```

Replace `encodeFriendCard`'s array with (9th element added, prefix bumped):

```js
export function encodeFriendCard(card = {}) {
  const c = normalizeFriendCard(card);
  return [
    PREFIX_V3,
    encodeURIComponent(c.name),
    c.level,
    c.streak,
    c.mastered,
    c.stickers,
    c.avatar,
    c.day,
    c.supporter ? 1 : 0,
  ].join(SEP);
}
```

In `decodeFriendCard`, replace the version sniff and the return object:

```js
  const parts = payload.trim().split(SEP);
  const v3 = parts.length === 9 && parts[0] === PREFIX_V3;
  const v2 = parts.length === 8 && parts[0] === PREFIX_V2;
  const v1 = parts.length === 6 && parts[0] === PREFIX_V1;
  if (!v1 && !v2 && !v3) return null;
```

```js
  return normalizeFriendCard({
    name,
    level: nums[0], streak: nums[1], mastered: nums[2], stickers: nums[3],
    avatar: v1 ? "" : parts[6],
    day: v1 ? 0 : Number(parts[7]),
    supporter: v3 ? parts[8] === "1" : false,   // LENIENT: anything but "1" -> false
  });
```

In `normalizeFriendCard`, add after `day`:

```js
    supporter: c.supporter === true || c.supporter === 1 || c.supporter === "1",
```

In `buildFriendCompare`, add to the returned object (after `theirAvatar`):

```js
    theirSupporter: t.supporter,        // display attribute, NOT a compared metric
```

Update the header comment block (lines 7–11) to document the three accepted
versions and that encode now always emits LCH3:

```js
//   LCH1|<name>|<level>|<streak>|<mastered>|<stickers>                          (legacy, 6 parts)
//   LCH2|<name>|<level>|<streak>|<mastered>|<stickers>|<avatar>|<day>           (legacy, 8 parts)
//   LCH3|<name>|<level>|<streak>|<mastered>|<stickers>|<avatar>|<day>|<supporter> (current, 9 parts)
// encodeFriendCard always emits LCH3; decodeFriendCard accepts all three, so
// codes minted before each version shipped keep working (missing fields
// default: avatar "", day 0, supporter false). <supporter> is "1"/"0";
// decode is lenient (anything but "1" -> false).
```

Then update the **existing** assertions that pinned LCH2 emission (they are in
`test/friend-compare.test.js`, and possibly `test/friend-recent.test.js` /
`test/friend-screen`-adjacent tests — find them with
`grep -rn "LCH2\|parts.length\|8 parts" test/`): wherever a test asserts the
*emitted* prefix/part-count, update to LCH3/9. Do NOT touch tests asserting
LCH2 *decode* — those must stay passing as-is.

- [ ] **Step 4: Run the full suite to verify green (codec is widely consumed)**

Run: `npx vitest run test/friend-compare.test.js` then `npm test`
Expected: PASS everywhere. If a non-friend test fails, the codec change leaked — fix before committing.

- [ ] **Step 5: Commit**

```bash
git add src/friend-compare.js test/friend-compare.test.js test/friend-recent.test.js
git commit -m "feat(friend): LCH3 codec carries supporter flag (lenient decode, legacy accepted)"
```

---

### Task 3: i18n strings, results markup + CSS, row factory

**Files:**
- Modify: `src/i18n.js` (2 new keys × EN/TH)
- Modify: `index.html` (new `#r-supporter` element + CSS)
- Create: `src/ui/supporter-moment-row.js`

**Interfaces:**
- Consumes: Task 1's `defaultSupporterMoment` / `shouldShowSupporterMoment` / `recordSupporterMomentShown`.
- Produces (Task 4 relies on): `createSupporterMomentRow({ $, store, isSupporter, supporterOn, goShopSupporter, getToday })` → `{ render(facts) }` where `facts` = `{ streakSaved, bossDefeated, leveledUp }` and the deps are zero-arg functions (`isSupporter()`, `supporterOn()`, `getToday()` → `"YYYY-MM-DD"`).

- [ ] **Step 1: Add i18n keys**

In `src/i18n.js`, EN block, after `"results.nextReviewTomorrow"` (line ~429):

```js
    "results.supporterLine": "Lucky Cat is free thanks to supporters — join them 🐾",
    "results.supporterCta": "Become a Supporter",
```

TH block, after `"results.nextReviewTomorrow"` (line ~1216):

```js
    "results.supporterLine": "Lucky Cat ฟรีได้เพราะผู้สนับสนุน — มาร่วมเป็นหนึ่งในนั้นนะ 🐾", // TH-REVIEW: machine-drafted, queued for native spot-check
    "results.supporterCta": "ร่วมเป็นผู้สนับสนุน", // TH-REVIEW: machine-drafted, queued for native spot-check
```

- [ ] **Step 2: Add results markup + CSS in `index.html`**

In the results screen (`#s-results`), insert **after**
`<p class="results-next-review" id="r-next-review"></p>` and **before** the
Home button:

```html
    <div class="results-supporter" id="r-supporter" hidden></div>
```

In the inline CSS (near the other results styles), add:

```css
  .results-supporter{display:flex; align-items:center; justify-content:space-between; gap:10px;
    margin-top:12px; padding:10px 12px; border-radius:12px; background:rgba(179,71,77,.08);}
  .results-supporter[hidden]{display:none;}
  .results-supporter .supporter-line{font-size:14px; color:var(--ink); min-width:0;}
```

(The `[hidden]` override is mandatory — `display:flex` beats the `hidden`
attribute otherwise; this is the third-time-around `.profile-name-row` lesson,
and `test/accessibility-markup` will catch it if forgotten.)

- [ ] **Step 3: Write the factory**

```js
// src/ui/supporter-moment-row.js
// Quiet supporter line on the results screen (go-live step 7 "placement").
// DOM wiring only — all show/deny decisions live in the pure policy module
// src/monetization/supporter-moment.js; untested by design like the other
// src/ui/ factories. Rendering the row is what consumes the daily budget
// (recordSupporterMomentShown), so a denied render leaves the budget intact.
import { t } from "../i18n.js";
import {
  defaultSupporterMoment,
  shouldShowSupporterMoment,
  recordSupporterMomentShown,
} from "../monetization/supporter-moment.js";

export function createSupporterMomentRow({ $, store, isSupporter, supporterOn, goShopSupporter, getToday }) {
  // facts = { streakSaved, bossDefeated, leveledUp } for the round just ended.
  function render(facts) {
    const host = $("#r-supporter");
    if (!host) return;
    const state = Object.assign(defaultSupporterMoment(), store.get("supporterMoment", {}));
    const d = shouldShowSupporterMoment(state, {
      ...facts,
      isSupporter: isSupporter(),
      supporterOn: supporterOn(),
    }, getToday());
    if (!d.show) { host.hidden = true; return; }
    host.innerHTML = "";
    const line = document.createElement("span");
    line.className = "supporter-line";
    line.textContent = t("results.supporterLine");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip buy-chip";
    btn.textContent = t("results.supporterCta");
    btn.onclick = goShopSupporter;
    host.appendChild(line);
    host.appendChild(btn);
    host.hidden = false;
    store.set("supporterMoment", recordSupporterMomentShown(state, getToday()));
  }
  return { render };
}
```

- [ ] **Step 4: Verify — lint + the i18n/asset guards**

Run: `npm run lint` then `npm test`
Expected: both clean. The `i18n-usage` test auto-verifies the two new keys
resolve (factory references them and it scans `src/` recursively); the
accessibility-markup test verifies the `[hidden]` override.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js index.html src/ui/supporter-moment-row.js
git commit -m "feat(placement): supporter results row — strings, markup, factory"
```

---

### Task 4: Wire into `main.js` + headless round probe

**Files:**
- Modify: `src/main.js` (four scoped touches, listed exactly below)
- Verify: throwaway probe script in the session scratchpad (NOT committed — house pattern)

**Interfaces:**
- Consumes: Task 3's `createSupporterMomentRow`; existing `isSupporter(ent)`, `iapOn`, `provider()`, `REVENUECAT_WEB_PUBLIC_KEY`, `isNative()`, `todayStr`, `noteActivity` result.
- Produces: the live feature. No new exports.

- [ ] **Step 1: `noteDaily` returns the freeze fact**

`src/main.js:502` — `function noteDaily(count){` currently returns nothing.
Add as its **last line** (after the notification-permission block):

```js
  return { freezesUsed: r.freezesUsed };
```

- [ ] **Step 2: Mount the factory (after the `avatarPicker` mount, ~line 497)**

Add the import at the top of `main.js` beside the other `./ui/` imports:

```js
import { createSupporterMomentRow } from "./ui/supporter-moment-row.js";
```

Mount (place directly after the `createAvatarPicker` block):

```js
// Supporter placement (go-live step 7): quiet line at peak moments on results.
// supporterOn mirrors the shop's gate, plus the configured-but-chunk-not-yet-
// loaded web case (ensureWebBilling only runs on shop-open; the CTA routes
// through the shop, which loads it). Blank key + no provider => always hidden.
const webSupporterConfigured = () =>
  !!REVENUECAT_WEB_PUBLIC_KEY.trim() && !isNative()
  && (typeof location === "undefined" || location.protocol !== "file:");
const supporterRow = createSupporterMomentRow({
  $, store,
  isSupporter: () => isSupporter(ent),
  supporterOn: () => (iapOn && provider().supports("supporter")) || webSupporterConfigured(),
  getToday: todayStr,
  goShopSupporter: () => {
    const go = document.querySelector('[data-go="shop"]');
    if (!go) return;
    go.click();   // reuse the full shop-tab handler (analytics, ensureWebBilling, back-target)
    requestAnimationFrame(() => $("#shop-supporter")?.scrollIntoView({ block: "center" }));
  },
});
```

(`REVENUECAT_WEB_PUBLIC_KEY` and `isNative` are already imported in `main.js` —
verify with grep, do not re-import.)

- [ ] **Step 3: Call it from `endBattle`'s results path**

`src/main.js:3382` — change:

```js
  noteDaily(results.learned);
```

to:

```js
  const dailyNote = noteDaily(results.learned) || {};
```

Then, directly **before** `show("results");` (line ~3543, after the sticker
slot block), add:

```js
  supporterRow.render({
    streakSaved: dailyNote.freezesUsed > 0,
    bossDefeated: !!B.bossDefeated,
    leveledUp: (B.levelUps || []).length > 0,
  });
```

(The quit path deliberately does NOT render the row — no results screen there.)

- [ ] **Step 4: Build and run the suite**

Run: `npm test` then `npm run build`
Expected: suite green (main.js wiring is untested by design — this catches
import/syntax breakage), build clean.

- [ ] **Step 5: Headless probe on the BUILT app**

Write the probe to the session scratchpad and run it **from inside `game/`**
(playwright-core resolves from the file's own dir; `npm run serve` must be
running). Probe recipe — every `browser.newPage()` is a fresh context and
needs the bootstrap seed:

1. Seed `localStorage`: `nbhsk.introDone="true"`, `nbhsk.dev.iap="true"` (forces
   the mock provider visible so `supporterOn` is true without a key), reload.
2. Drive a full round to the results screen — click a battle start, then
   repeatedly click the correct option by reading `#opts button._correct`
   (the v117 playtest recipe) until results shows.
3. To guarantee a qualifying moment regardless of round outcome, pre-seed a
   low XP so the round levels up (e.g. `nbhsk.xp="0"` — early levels need
   little XP), or assert on whichever fact fired; check
   `#r-supporter:not([hidden])` contains the CTA button.
4. Assert `JSON.parse(localStorage["nbhsk.supporterMoment"]).lastShownDay` is
   today.
5. Play a second qualifying round same session: assert `#r-supporter` is
   `hidden` (daily cap).
6. Click the CTA on a fresh profile's first show: assert the shop screen is
   visible and `#shop-supporter` is un-hidden (mock provider supports
   supporter under the dev flag).
7. Dark check: fresh context WITHOUT `nbhsk.dev.iap`, play a qualifying round:
   assert `#r-supporter` stays hidden and `nbhsk.supporterMoment` is absent.
8. Zero console errors throughout.

Expected: all assertions pass. If the battle can't be driven (option buttons
never enable), STOP and report — do not fake the verification.

- [ ] **Step 6: Commit**

```bash
git add src/main.js dist/app.js
git commit -m "feat(placement): wire supporter moment row into results (dark-gated)"
```

---

### Task 5: Badge — friend cards + profile

**Files:**
- Modify: `src/ui/friend-screen.js` (avatarChip + 3 call sites)
- Modify: `src/main.js` (`getMyCard` field; `renderProfileDashboard` chip toggle — 2 lines)
- Modify: `index.html` (profile chip element + CSS; friend heart CSS)

**Interfaces:**
- Consumes: Task 2's `supporter` card field + `theirSupporter`; existing `isSupporter(ent)`.
- Produces: visible ♥ badge. No new exports.

- [ ] **Step 1: `getMyCard` carries the flag**

`src/main.js` `getMyCard` (line ~472): add after `day:`:

```js
      supporter: isSupporter(ent),
```

- [ ] **Step 2: avatarChip renders the heart**

`src/ui/friend-screen.js` — change the signature (line 39) to
`function avatarChip(wireId, name, sizeClass, supporter)` and add before
`return el;`:

```js
    if (supporter) {
      const heart = document.createElement("span");
      heart.className = "fr-avatar-heart";
      heart.textContent = "♥";
      heart.setAttribute("aria-hidden", "true");
      el.appendChild(heart);
      el.title = t("account.supporterChip");
    }
```

Update the three call sites:
- `renderRecent` (line ~111): `avatarChip(item.card.avatar, item.card.name, "fr-avatar-row", item.card.supporter)`
- `wireInviteView` (line ~168): `avatarChip(myCard.avatar, myCard.name, "fr-avatar-me", myCard.supporter)`
- `showCompare` (line ~226): `avatarChip(cmp.theirAvatar, cmp.theirName, "fr-avatar-me", cmp.theirSupporter)`

- [ ] **Step 3: CSS + profile chip markup**

`index.html`, inside the `#friend-panel` style block (near `.fr-avatar-mono`,
line ~1326):

```css
  #friend-panel .fr-avatar-heart{position:absolute; right:-3px; bottom:-3px; font-size:13px;
    line-height:1; color:#b3474d; text-shadow:0 0 2px #fff, 0 0 2px #fff; pointer-events:none;}
```

Profile: inside `.profile-name-row` (line ~2493), after the `<h3 id="profile-name">`:

```html
          <span class="profile-supporter-chip" id="profile-supporter-chip" data-i18n="account.supporterChip" hidden>Supporter ♥</span>
```

CSS near the `.profile-name-row` rules (line ~304):

```css
  .profile-supporter-chip{flex:none; font-size:12px; font-weight:700; color:#b3474d;
    background:rgba(179,71,77,.12); border-radius:999px; padding:2px 8px;}
  .profile-supporter-chip[hidden]{display:none;}
```

(`data-i18n` fills the text on locale apply — no render-time i18n code needed.)

- [ ] **Step 4: Toggle the profile chip**

`src/main.js` `renderProfileDashboard` (line ~4150), after the
`$("#profile-name").textContent = displayName;` line:

```js
  const supChip = $("#profile-supporter-chip");
  if (supChip) supChip.hidden = !isSupporter(ent);
```

- [ ] **Step 5: Suite + build + visual probe**

Run: `npm test` then `npm run lint` then `npm run build`
Expected: green/clean.

Probe (scratchpad, same recipe as Task 4): seed `nbhsk.introDone="true"` and
`nbhsk.ent='{"supporter":true,"orders":[]}'`, reload, then assert:
- Profile screen shows `#profile-supporter-chip` un-hidden with the ♥ text.
- Friend overlay (`#go-friend` on the progress screen; remember
  `#bottom-nav [data-go="progress"]` scoping): my-card chip contains
  `.fr-avatar-heart`; the generated code starts `LCH3|` and its 9th field is `1`.
- Paste a hand-built LCH3 code with supporter=1 (e.g.
  `LCH3|Mei|9|4|120|3||20290|1`) into `#fr-in`, compare: the compare head chip
  carries `.fr-avatar-heart`; rows show exactly 4 metrics.
- Counter-check with `nbhsk.ent` absent: no heart, no chip, code 9th field `0`.
- Zero console errors; screenshot both states at 390×844 for the record.

- [ ] **Step 6: Commit**

```bash
git add src/ui/friend-screen.js src/main.js index.html dist/app.js
git commit -m "feat(placement): supporter ♥ badge on friend cards and profile"
```

---

### Task 6: Full gate + branch finish

**Files:**
- Modify: none new (dist already rebuilt per task)

- [ ] **Step 1: Full unmasked gate, in order**

```bash
npm test          # bare — never piped
npm run lint
npm run build     # confirm zero dist drift after; if dist changed, commit it
```

Expected: 112+ files green (count grows with the two new test files), lint 0,
build clean.

- [ ] **Step 2: Responsive sweep (server must be running: `npm run serve`)**

```bash
npm run qa:responsive
npm run qa:responsive:th
```

Expected: 10/10 both. The new row/chip are hidden by default so the sweep's
existing probes should be unaffected — a failure here is a real regression.

- [ ] **Step 3: Merge to development**

Use superpowers:finishing-a-development-branch. House rules: merge
`feat/supporter-placement` into `development` (`--no-ff`), push `development`
only, delete the feature branch (2026-07-25 ledger: no extra branches on
origin). **No SHELL bump, no main merge** — release cut is a separate
owner-gated step; this ships dark.

---

## Self-review notes (already applied)

- Spec coverage: quiet line (T3/T4), moments incl. the freezesUsed carry (T4 S1/S3),
  daily cap + local-only key (T1/T3), dark gating incl. the web
  configured-but-unloaded case (T4 S2), LCH3 badge (T2/T5), profile chip (T5),
  no compare-metric change (T2), tests (T1/T2), probes (T4/T5), release-dark (T6).
- Type consistency: `facts` keys `streakSaved/bossDefeated/leveledUp` identical in
  T1 tests, T3 factory, T4 wiring; `supporter` field name identical in T2/T5;
  `createSupporterMomentRow` dep names identical in T3 definition and T4 mount.
- The one open judgment call for the implementer: exact CSS colors may be tuned to
  match neighbours, but the `[hidden]` overrides are NOT optional.
