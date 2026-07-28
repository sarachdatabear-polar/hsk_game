# Profile Avatar + Friend Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Profile-avatar + Friend-invite feature: a local avatar (7 cat portraits or an on-device photo), the Friend screen reframed around inviting (QR code, privacy note, remembered friends, card freshness), and the LCH2 wire codec that carries avatar + day.

**Architecture:** All decisions live in pure, unit-tested ES modules (`avatar.js`, `qr.js`, `friend-recent.js`, extended `friend-compare.js`/`profile.js`/`migrations.js`/`storage.js`); two untested DOM controllers (`src/ui/avatar-picker.js` new, `src/ui/friend-screen.js` reworked) wire them to the overlay markup in `index.html`; `main.js` only mounts them per the spec §11 touch list. Persistence is three local-only keys (`nbhsk.profile` gains `avatar` via a v6→v7 migration; `nbhsk.profilePhoto` and `nbhsk.friends` are new, read-side normalized).

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest, inline HTML/CSS in `index.html`, self-written byte-mode QR encoder (no deps).

**Authoritative spec:** `docs/superpowers/specs/2026-07-27-profile-avatar-friend-invite-design.md`. Where this plan and the spec disagree, the plan's "Spec deviations locked by this plan" list below is deliberate; everything else defers to the spec.

## Global Constraints

- Vanilla JS ES modules, no framework, no new npm dependencies (a one-off `npm install --no-save qrcode@1.5.4` for generating QR *test fixtures* in Task 7 is permitted; it must not touch `package.json`/`package-lock.json`).
- Persistence goes through `src/storage.js` `createStore` — never `localStorage` directly from feature code.
- `main.js` is frozen for new features; new screens/features get their own `src/ui/<feature>-screen.js` that main.js only mounts. The main.js touch list in the spec (§11), as amended by Task 11 of this plan (three flagged extensions: the `t("friend.title")` swap at main.js:453, the `toast` + `setMyName` deps to `createFriendCompare`), is the ONLY permitted main.js editing.
- Every new/changed Thai string in `src/i18n.js` carries the machine-readable `// TH-REVIEW` comment marker.
- Precache budget is a hard gate: 63,942 bytes free (10,946,106 used of an 11,010,048 cap asserted in `test/sw-precache.test.js`). Never raise the cap for this feature; trim code instead (qr.js first, per spec §12).
- Never mask the test exit code — do not pipe `npm test` to `tail`/`grep` when gating a commit.
- Run `npm run lint` and `npm run build` before any commit that changes `src/`; include the rebuilt `dist/app.js` in that commit (it is tracked and `test/sw-precache.test.js` measures it from disk).
- Do NOT bump `CACHE_VERSION` in `sw.js` and do NOT merge to `main` — this feature lands on the feature branch `feat/profile-avatar-friend-invite` and then `development` only. The prod cut (including the sw.js bump) is owner-gated and explicitly out of scope for this plan.
- New `nbhsk.*` keys (`profilePhoto`, `friends`) are **local-only**: never add them to `SYNC_KEYS` in `src/merge.js`.
- All work happens in `/root/work/HSK/game` (its own git repo, separate from the parent `/root/work/HSK` repo). Use absolute paths; never stage files from the parent repo.

### Spec deviations locked by this plan (each flagged where it lands)

1. **main.js:453** uses `t("friend.title")`; the spec retires that key but its §11 touch list misses this usage. Task 11 swaps it to `t("friend.inviteTitle")` in the same commit that removes the key (otherwise `i18n-usage.test.js` fails).
2. **`toast` dep for `createFriendCompare`**: spec §9 behavior calls `toast(friend.recentCleared)` but its dep list omits `toast`. Tasks 11/12 add it.
3. **`setMyName` dep + empty-name share prompt**: a verified UX finding (a fresh profile shares `LCH1||1|0|0|0` — empty name). Task 12 adds an inline name prompt to the invite view; Task 11 passes `setMyName` from main.js. Two extra i18n keys (`friend.namePrompt`, `friend.namePromptSave`) in Task 8.
4. **`#go-friend` moves to the Overview pane** (Task 9): the invite entry point is currently buried two taps deep (`#go-friend` → `#profile-collection-pane` → `#s-progress`, hidden behind the Collection sub-tab). Verified finding; id and wiring unchanged.
5. **Card `day` gets an upper clamp** (`MAX_CARD_DAY = 100000`): spec §5 says `day = clampInt` but §13 requires `"1e99"` → 0. The bound resolves the contradiction (epoch day 100000 ≈ year 2243; anything larger is garbage → "unknown").
6. **qr.js test hooks**: `qrEncode` also returns `mask` and accepts a test-only `{ forceMask }` option; `qrByteCapacity(version, eccLevel)` is exported for capacity-boundary tests. Known vectors are generated with node-qrcode pinned to our (version, ecc, mask) — the environment-practical version of the spec's "nayuki offline reference".
7. **friend-compare.js imports only `AVATAR_CAT_IDS`** from avatar.js (spec §5 also lists `avatarFromWireId`, which friend-compare never calls — an unused import would fail lint).
8. Spec §3's illustrative table says a ~125 B link → v7-M; by the spec's own policy and capacity table it is v8-M (cap(7,M)=121). Tests pin the policy math, not that table row. No code change.

---

### Task 1: Feature branch + `storage.js` `remove()`

**Files:**
- Modify: `/root/work/HSK/game/src/storage.js` (the object literal returned by `createStore`, after `set(k, v) {...}` ~line 31)
- Test: `/root/work/HSK/game/test/storage.test.js` (append inside the existing `describe("createStore", ...)`)

**Interfaces:**
- Consumes: existing `createStore({ storage, syncKeys })` → `{ get(k, d), set(k, v) }`; `NS = "nbhsk."`; `fakeStorage(init)` from `test/fixtures.js` (already implements `removeItem`).
- Produces: `store.remove(k)` — deletes `localStorage["nbhsk." + k]`, swallows any storage throw, never touches `nbhsk.sync`. Returns undefined. Used by Task 10 (`avatar-picker.js` photo removal/restore).

- [ ] **Step 1: Create the feature branch off development**

```bash
cd /root/work/HSK/game
git fetch origin
git checkout development
git pull --ff-only origin development || true   # local development may be ahead (spec commit) — that's fine
git checkout -b feat/profile-avatar-friend-invite
git status -sb   # expect: ## feat/profile-avatar-friend-invite, clean tree
```

- [ ] **Step 2: Write the failing tests** — append inside `describe("createStore", ...)` in `/root/work/HSK/game/test/storage.test.js`:

```js
  it("remove deletes the namespaced key", () => {
    const backing = fakeStorage({ "nbhsk.profilePhoto": JSON.stringify("data:image/jpeg;base64,xx") });
    const s = createStore({ storage: backing, syncKeys: [] });
    s.remove("profilePhoto");
    expect(backing.dump()["nbhsk.profilePhoto"]).toBeUndefined();
  });

  it("remove swallows a throwing storage", () => {
    const throwing = {
      getItem() { throw new Error("boom"); },
      setItem() { throw new Error("boom"); },
      removeItem() { throw new Error("boom"); },
    };
    const s = createStore({ storage: throwing, syncKeys: [] });
    expect(() => s.remove("profilePhoto")).not.toThrow();
  });

  it("remove never touches sync meta, even on a sync key", () => {
    const backing = fakeStorage();
    const s = createStore({ storage: backing, syncKeys: ["xp"] });
    s.remove("xp");
    expect(backing.dump()["nbhsk.sync"]).toBeUndefined();
  });
```

- [ ] **Step 3: Run and watch them FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/storage.test.js`
Expected: 3 failures, each `TypeError: s.remove is not a function`.

- [ ] **Step 4: Minimal implementation** — in `/root/work/HSK/game/src/storage.js`, add after the closing `},` of `set(k, v)`:

```js
    // Delete a namespaced key outright (vs set(k, "") which stores an empty
    // string). Local-only concern — never flips sync dirty flags; the only
    // caller today is the avatar photo path (nbhsk.profilePhoto, ~96 KB, which
    // must actually be freed when the avatar stops being a photo).
    remove(k) {
      try { storage.removeItem(NS + k); } catch (e) {}
    },
```

- [ ] **Step 5: Run and watch them PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/storage.test.js`
Expected: all pass. Then gate: `npm test` (full suite, no piping), `npm run lint`, `npm run build`.

- [ ] **Step 6: Commit**

```bash
cd /root/work/HSK/game
git add src/storage.js test/storage.test.js dist/app.js
git commit -m "feat(storage): createStore gains remove(k) for the avatar photo key"
```

---

### Task 2: `src/avatar.js` — pure avatar authority

**Files:**
- Create: `/root/work/HSK/game/src/avatar.js`
- Test: `/root/work/HSK/game/test/avatar.test.js` (new)

**Interfaces:**
- Consumes: `SKIN_PALETTES` from `./shop.js` (object keyed `panda|ninja|astronaut|beach|mooncake-rabbit|dragon`, each with `.sprite` e.g. `"cat-mooncake"`); `SPRITE_METRICS` from `./sprite-metrics.js` (per-sheet `{ l, t, r, b }` frame-relative pixel bbox; sheets are 1024×256, 4 frames of 256px).
- Produces (used by Tasks 3, 4, 10, 11, 12):
  - `AVATAR_DEFAULT_CAT_ID` — the string `"lucky"`.
  - `AVATAR_CAT_IDS` — `["lucky", "panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]` (derived, not hardcoded).
  - `normalizeAvatar(raw) -> {kind:"monogram"} | {kind:"cat", id} | {kind:"photo"}` (fresh object; anything invalid → monogram).
  - `ownsCatAvatar(id, ownedIds) -> boolean` (`ownedIds`: `string[]` or garbage).
  - `catAvatarChoices(ownedIds) -> [{ id: string, locked: boolean }]` (all 7, display order = `AVATAR_CAT_IDS`).
  - `avatarSheetFor(avatar) -> string | null` (e.g. `"cat-happy"`, `"cat-mooncake-happy"`; null for monogram/photo).
  - `avatarPortraitStyle(avatar) -> { image: string, sizePct: [number, number], posPct: [number, number] } | null` (`image` is `"assets/<sheet>.png"`).
  - `wireAvatarId(avatar, ownedIds) -> "" | CatId`.
  - `avatarFromWireId(field) -> Avatar` (never `{kind:"photo"}`).

- [ ] **Step 1: Write the failing tests** — create `/root/work/HSK/game/test/avatar.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  AVATAR_DEFAULT_CAT_ID, AVATAR_CAT_IDS, normalizeAvatar, ownsCatAvatar,
  catAvatarChoices, avatarSheetFor, avatarPortraitStyle, wireAvatarId, avatarFromWireId,
} from "../src/avatar.js";
import { SKIN_PALETTES } from "../src/shop.js";

describe("AVATAR_CAT_IDS", () => {
  it("is lucky + exactly the SKIN_PALETTES keys, in order (derivation-pinned)", () => {
    expect(AVATAR_DEFAULT_CAT_ID).toBe("lucky");
    expect(AVATAR_CAT_IDS).toEqual(["lucky", ...Object.keys(SKIN_PALETTES)]);
    expect(AVATAR_CAT_IDS).toEqual(
      ["lucky", "panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]);
  });
});

describe("normalizeAvatar", () => {
  it("keeps valid cat / photo / monogram values as fresh objects", () => {
    const cat = { kind: "cat", id: "panda" };
    expect(normalizeAvatar(cat)).toEqual({ kind: "cat", id: "panda" });
    expect(normalizeAvatar(cat)).not.toBe(cat);            // no aliasing
    expect(normalizeAvatar({ kind: "photo" })).toEqual({ kind: "photo" });
    expect(normalizeAvatar({ kind: "monogram" })).toEqual({ kind: "monogram" });
  });
  it("drops extra fields", () => {
    expect(normalizeAvatar({ kind: "cat", id: "dragon", hax: 1 })).toEqual({ kind: "cat", id: "dragon" });
    expect(normalizeAvatar({ kind: "photo", url: "http://evil" })).toEqual({ kind: "photo" });
  });
  it("maps unknown/removed ids and garbage to monogram", () => {
    for (const bad of [
      { kind: "cat", id: "cat-boss" }, { kind: "cat", id: "PANDA" }, { kind: "cat", id: "" },
      { kind: "cat" }, { kind: "nope" }, null, undefined, 42, "panda", [], ["cat"],
      { kind: "cat", id: "javascript:alert(1)" },
    ]) {
      expect(normalizeAvatar(bad)).toEqual({ kind: "monogram" });
    }
  });
});

describe("ownsCatAvatar / catAvatarChoices", () => {
  it("lucky is always owned; skins follow the owned list", () => {
    expect(ownsCatAvatar("lucky", [])).toBe(true);
    expect(ownsCatAvatar("lucky", null)).toBe(true);
    expect(ownsCatAvatar("panda", ["panda"])).toBe(true);
    expect(ownsCatAvatar("panda", ["ninja"])).toBe(false);
    expect(ownsCatAvatar("panda", null)).toBe(false);
    expect(ownsCatAvatar("not-a-cat", ["not-a-cat"])).toBe(false);
  });
  it("choices carry lock flags for all 7 ids in display order", () => {
    const choices = catAvatarChoices(["panda", "dragon"]);
    expect(choices.map(c => c.id)).toEqual(AVATAR_CAT_IDS);
    expect(choices.find(c => c.id === "lucky").locked).toBe(false);
    expect(choices.find(c => c.id === "panda").locked).toBe(false);
    expect(choices.find(c => c.id === "dragon").locked).toBe(false);
    expect(choices.find(c => c.id === "ninja").locked).toBe(true);
  });
});

describe("avatarSheetFor", () => {
  it("resolves lucky to cat-happy and skins through SKIN_PALETTES (id never munged)", () => {
    expect(avatarSheetFor({ kind: "cat", id: "lucky" })).toBe("cat-happy");
    expect(avatarSheetFor({ kind: "cat", id: "mooncake-rabbit" })).toBe("cat-mooncake-happy");
    expect(avatarSheetFor({ kind: "cat", id: "panda" })).toBe("cat-panda-happy");
  });
  it("returns null for monogram / photo / garbage", () => {
    expect(avatarSheetFor({ kind: "monogram" })).toBeNull();
    expect(avatarSheetFor({ kind: "photo" })).toBeNull();
    expect(avatarSheetFor({ kind: "cat", id: "cat-boss" })).toBeNull();
    expect(avatarSheetFor(null)).toBeNull();
  });
});

describe("avatarPortraitStyle", () => {
  // cat-happy bbox: l78 t62 r177 b189 -> bw 99, bh 127, side 127,
  // square origin cl=64, ct=62 (clamped to [0, 129]).
  it("computes the square content crop for the small default cat", () => {
    const s = avatarPortraitStyle({ kind: "cat", id: "lucky" });
    expect(s.image).toBe("assets/cat-happy.png");
    expect(s.sizePct[0]).toBeCloseTo(102400 / 127, 6);
    expect(s.sizePct[1]).toBeCloseTo(25600 / 127, 6);
    expect(s.posPct[0]).toBeCloseTo((100 * 64) / (1024 - 127), 6);
    expect(s.posPct[1]).toBeCloseTo((100 * 62) / (256 - 127), 6);
  });
  // beach bbox: l9 t12 r246 b244 -> bw 237, bh 232, side 237, cl=9, ct=9.5.
  it("computes the crop for a near-full-frame skin", () => {
    const s = avatarPortraitStyle({ kind: "cat", id: "beach" });
    expect(s.image).toBe("assets/cat-beach-happy.png");
    expect(s.sizePct[0]).toBeCloseTo(102400 / 237, 6);
    expect(s.posPct[0]).toBeCloseTo((100 * 9) / (1024 - 237), 6);
    expect(s.posPct[1]).toBeCloseTo((100 * 9.5) / (256 - 237), 6);
  });
  it("keeps sizePct at an exact 4:1 ratio for every cat id (uniform scale)", () => {
    for (const id of AVATAR_CAT_IDS) {
      const s = avatarPortraitStyle({ kind: "cat", id });
      expect(s.sizePct[0] / s.sizePct[1]).toBeCloseTo(4, 9);
      expect(s.posPct[0]).toBeGreaterThanOrEqual(0);
      expect(s.posPct[0]).toBeLessThanOrEqual(100);
      expect(s.posPct[1]).toBeGreaterThanOrEqual(0);
      expect(s.posPct[1]).toBeLessThanOrEqual(100);
    }
  });
  it("returns null for monogram and photo", () => {
    expect(avatarPortraitStyle({ kind: "monogram" })).toBeNull();
    expect(avatarPortraitStyle({ kind: "photo" })).toBeNull();
  });
});

describe("wire codec", () => {
  it("wireAvatarId: owned cat -> id; photo/monogram/unowned/unknown -> ''", () => {
    expect(wireAvatarId({ kind: "cat", id: "lucky" }, [])).toBe("lucky");
    expect(wireAvatarId({ kind: "cat", id: "panda" }, ["panda"])).toBe("panda");
    expect(wireAvatarId({ kind: "cat", id: "panda" }, [])).toBe("");
    expect(wireAvatarId({ kind: "photo" }, ["panda"])).toBe("");     // approved degrade
    expect(wireAvatarId({ kind: "monogram" }, [])).toBe("");
    expect(wireAvatarId(null, null)).toBe("");
  });
  it("avatarFromWireId: allowlisted -> cat; everything else -> monogram; never photo", () => {
    expect(avatarFromWireId("dragon")).toEqual({ kind: "cat", id: "dragon" });
    expect(avatarFromWireId("lucky")).toEqual({ kind: "cat", id: "lucky" });
    for (const bad of ["", "javascript:alert(1)", "../../x", "%2e%2e", "cat-happy", "photo", null, 7, {}]) {
      expect(avatarFromWireId(bad)).toEqual({ kind: "monogram" });
    }
  });
});
```

- [ ] **Step 2: Run and watch it FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/avatar.test.js`
Expected: FAIL — `Failed to resolve import "../src/avatar.js"`.

- [ ] **Step 3: Implementation** — create `/root/work/HSK/game/src/avatar.js`:

```js
"use strict";
// Single authority on what an avatar value IS: which ids exist, who owns
// what, the wire encoding, and how an id becomes pixels (a pure CSS crop of
// frame 0's content box on the 1024x256 sprite sheets). Pure: no DOM,
// storage, Date, or network. Imports neither profile.js nor
// friend-compare.js (they import us), so there are no cycles.
//
// Ownership is enforced at pick time (catAvatarChoices) and wire-encode time
// (wireAvatarId) ONLY — a *stored* {kind:"cat"} avatar is displayed even if
// shop.owned were transiently missing the id (ownership never lapses; the
// avatar must not flicker to monogram on an unloaded shop state). A *removed*
// id falls out via the allowlist in normalizeAvatar -> monogram.
import { SKIN_PALETTES } from "./shop.js";
import { SPRITE_METRICS } from "./sprite-metrics.js";

export const AVATAR_DEFAULT_CAT_ID = "lucky";
// "lucky" is a reserved id for the default cat (no SKIN_PALETTES entry); it
// resolves to the already-precached "cat-happy" sheet, never via the palette.
export const AVATAR_CAT_IDS = [AVATAR_DEFAULT_CAT_ID, ...Object.keys(SKIN_PALETTES)];

const SHEET_W = 1024;   // 4 frames of FRAME px
const FRAME = 256;

// Shape-only normalization: any input -> a valid Avatar (fresh object).
// Pixels for {kind:"photo"} are storage's business (nbhsk.profilePhoto).
export function normalizeAvatar(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.kind === "photo") return { kind: "photo" };
    if (raw.kind === "cat" && AVATAR_CAT_IDS.includes(raw.id)) return { kind: "cat", id: raw.id };
  }
  return { kind: "monogram" };
}

export function ownsCatAvatar(id, ownedIds) {
  if (id === AVATAR_DEFAULT_CAT_ID) return true;
  if (!AVATAR_CAT_IDS.includes(id)) return false;
  return Array.isArray(ownedIds) && ownedIds.includes(id);
}

export function catAvatarChoices(ownedIds) {
  return AVATAR_CAT_IDS.map(id => ({ id, locked: !ownsCatAvatar(id, ownedIds) }));
}

// THE id -> asset-sheet resolution. Never string-munges the id itself.
export function avatarSheetFor(avatar) {
  const a = normalizeAvatar(avatar);
  if (a.kind !== "cat") return null;
  if (a.id === AVATAR_DEFAULT_CAT_ID) return "cat-happy";
  return SKIN_PALETTES[a.id].sprite + "-happy";
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Pure CSS crop of frame 0's content box, element-size independent: a square
// (side = max(bw, bh), centered on the bbox, clamped into the 256px frame)
// expressed as percentage background geometry. Both axes divide by the same
// `side`, so sizePct stays 4:1 (uniform scale, no distortion); percent
// background-position is container-size independent, so one style serves the
// 112px hero circle, 64px picker tiles, and 36px friend rows.
export function avatarPortraitStyle(avatar) {
  const sheet = avatarSheetFor(avatar);
  if (!sheet) return null;
  const m = SPRITE_METRICS[sheet];
  const bw = m.r - m.l, bh = m.b - m.t;
  const side = Math.min(FRAME, Math.max(bw, bh));
  const cl = clamp((m.l + m.r) / 2 - side / 2, 0, FRAME - side);
  const ct = clamp((m.t + m.b) / 2 - side / 2, 0, FRAME - side);
  return {
    image: "assets/" + sheet + ".png",
    sizePct: [(SHEET_W * 100) / side, (FRAME * 100) / side],
    posPct: [
      side >= SHEET_W ? 0 : (cl * 100) / (SHEET_W - side),
      side >= FRAME ? 0 : (ct * 100) / (FRAME - side),
    ],
  };
}

// Wire encoding for the friend card: owned cat -> its id; photo/monogram/
// unowned/unknown -> "" (the approved photo -> monogram degrade).
export function wireAvatarId(avatar, ownedIds) {
  const a = normalizeAvatar(avatar);
  if (a.kind !== "cat") return "";
  return ownsCatAvatar(a.id, ownedIds) ? a.id : "";
}

// Wire decoding (UNTRUSTED input) — the only path a foreign avatar field may
// take toward pixels. Allowlisted id -> cat; anything else -> monogram.
export function avatarFromWireId(field) {
  return typeof field === "string" && AVATAR_CAT_IDS.includes(field)
    ? { kind: "cat", id: field }
    : { kind: "monogram" };
}
```

- [ ] **Step 4: Run and watch it PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/avatar.test.js`
Expected: all pass. Then `npm test`, `npm run lint`, `npm run build` (bundle unchanged — avatar.js is not yet imported from main.js; that's expected).

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add src/avatar.js test/avatar.test.js
git commit -m "feat(avatar): pure avatar module — ids, ownership, portrait crop, wire codec"
```

---

### Task 3: `profile.js` `normalizeProfile` + migrations v6→v7

**Files:**
- Modify: `/root/work/HSK/game/src/profile.js` (`defaultProfile` at lines 7–9; add `normalizeProfile` after `normalizeDisplayName`)
- Modify: `/root/work/HSK/game/src/migrations.js` (`CURRENT_SCHEMA_VERSION` line 20: 6 → 7; append one ladder entry; add import)
- Test: `/root/work/HSK/game/test/profile.test.js` (update 1 assertion + append a describe), `/root/work/HSK/game/test/migrations.test.js` (append a describe)

**Interfaces:**
- Consumes: `normalizeAvatar(raw)` from Task 2.
- Produces (used by Tasks 10, 11):
  - `defaultProfile() -> { displayName: "", avatar: { kind: "monogram" } }`
  - `normalizeProfile(raw) -> { displayName: string, avatar: Avatar }` — tolerant of any input.
  - `CURRENT_SCHEMA_VERSION === 7`; migration entry `{ to: 7, up(storage) }` upgrading `nbhsk.profile` in place.

- [ ] **Step 1: Write the failing tests.** In `/root/work/HSK/game/test/profile.test.js`, first update the import line and the existing fresh-profile assertion:

Import line (line 2) becomes:

```js
import { defaultProfile, normalizeProfile, normalizeDisplayName, profileInitial, profileStats, bestSessionScore, equippedSummary } from "../src/profile.js";
```

Existing assertion `expect(a).toEqual({ displayName: "" });` (in `it("returns a fresh empty profile")`) becomes:

```js
    expect(a).toEqual({ displayName: "", avatar: { kind: "monogram" } });
```

Then append a new describe at the end of the file:

```js
describe("normalizeProfile", () => {
  it("upgrades a legacy name-only row", () => {
    expect(normalizeProfile({ displayName: "  Jordan  " }))
      .toEqual({ displayName: "Jordan", avatar: { kind: "monogram" } });
  });
  it("keeps a valid avatar", () => {
    expect(normalizeProfile({ displayName: "J", avatar: { kind: "cat", id: "panda" } }))
      .toEqual({ displayName: "J", avatar: { kind: "cat", id: "panda" } });
    expect(normalizeProfile({ displayName: "J", avatar: { kind: "photo" } }).avatar)
      .toEqual({ kind: "photo" });
  });
  it("clamps garbage in either field", () => {
    expect(normalizeProfile(null)).toEqual({ displayName: "", avatar: { kind: "monogram" } });
    expect(normalizeProfile({ avatar: { kind: "cat", id: "nope" } }))
      .toEqual({ displayName: "", avatar: { kind: "monogram" } });
    expect(normalizeProfile({ displayName: 42, avatar: "hax" }).avatar).toEqual({ kind: "monogram" });
  });
});
```

In `/root/work/HSK/game/test/migrations.test.js`, append:

```js
describe("v6->v7 migration (profile avatar)", () => {
  it("CURRENT_SCHEMA_VERSION is 7 and the ladder stays sorted", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(7);
    expect(() => assertSortedLadder(MIGRATIONS)).not.toThrow();
  });

  it("absent profile: untouched (defaults supply the field at read time), still stamps 7", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "6", "nbhsk.xp": "100" });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(s.dump()["nbhsk.profile"]).toBeUndefined();
    expect(JSON.parse(s.dump()["nbhsk.schemaVersion"])).toBe(7);
  });

  it("name-only profile gains a monogram avatar, name byte-identical", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "น้องแมว 🐱" }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.profile"]))
      .toEqual({ displayName: "น้องแมว 🐱", avatar: { kind: "monogram" } });
  });

  it("corrupt profile JSON: no-op on the key, version still advances", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "6", "nbhsk.profile": "{not json" });
    expect(() => runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(s.dump()["nbhsk.profile"]).toBe("{not json");
    expect(JSON.parse(s.dump()["nbhsk.schemaVersion"])).toBe(7);
  });

  it("a profile already carrying a cat avatar survives; garbage avatar -> monogram", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J", avatar: { kind: "cat", id: "panda" } }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(s.dump()["nbhsk.profile"]).avatar).toEqual({ kind: "cat", id: "panda" });

    const g = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J", avatar: "hax" }),
    });
    runMigrations(g, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    expect(JSON.parse(g.dump()["nbhsk.profile"]).avatar).toEqual({ kind: "monogram" });
  });

  it("re-running the v7 entry is idempotent", () => {
    const s = fakeStorage({
      "nbhsk.schemaVersion": "6",
      "nbhsk.profile": JSON.stringify({ displayName: "J" }),
    });
    runMigrations(s, MIGRATIONS, CURRENT_SCHEMA_VERSION);
    const once = s.dump()["nbhsk.profile"];
    MIGRATIONS.find(m => m.to === 7).up(s);   // simulate a mid-ladder crash retry
    expect(s.dump()["nbhsk.profile"]).toBe(once);
  });
});
```

- [ ] **Step 2: Run and watch them FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/profile.test.js test/migrations.test.js`
Expected: profile tests fail with `does not provide an export named 'normalizeProfile'`; migrations fail with `expected 6 to be 7` (and the profile-shape cases fail).

- [ ] **Step 3: Implement `profile.js`.** Add to the imports at the top of `/root/work/HSK/game/src/profile.js`:

```js
import { normalizeAvatar } from "./avatar.js";
```

Replace `defaultProfile` (lines 7–9) with:

```js
export function defaultProfile() {
  return { displayName: "", avatar: { kind: "monogram" } };
}
```

Add after `normalizeDisplayName`:

```js
// One call replaces the Object.assign + normalizeDisplayName dance main.js
// used at boot. Tolerant of any input. The profile stays "the player's
// chosen name + chosen avatar VALUE" — the photo data URL never passes
// through here (own key, nbhsk.profilePhoto), and asset/ownership/wire
// concerns live in avatar.js.
export function normalizeProfile(raw) {
  return {
    displayName: normalizeDisplayName(raw && raw.displayName),
    avatar: normalizeAvatar(raw && raw.avatar),
  };
}
```

- [ ] **Step 4: Implement the migration.** In `/root/work/HSK/game/src/migrations.js`, add to the imports:

```js
import { normalizeAvatar } from "./avatar.js";
```

Change line 20 to:

```js
export const CURRENT_SCHEMA_VERSION = 7;
```

Append to `MIGRATIONS` (after the `to: 6` entry, before the closing `];`):

```js
  {
    to: 7,
    up(storage) {
      // v6->v7: nbhsk.profile gains `avatar` (Profile avatar feature). Absent
      // profile = fresh install or player never opened Profile: early-return —
      // defaultProfile()/normalizeProfile() supply the field at read time.
      // Idempotent: re-running normalizes an already-v7 profile to itself, and
      // normalizeAvatar maps any unknown/future id to monogram, so a partially
      // newer profile is never corrupted. Guarded: corrupt JSON is a no-op.
      let profile;
      try {
        const raw = storage.getItem("nbhsk.profile");
        if (raw === null) return;
        profile = JSON.parse(raw);
      } catch (e) { return; }
      if (!profile || typeof profile !== "object") return;
      const next = {
        displayName: typeof profile.displayName === "string" ? profile.displayName : "",
        avatar: normalizeAvatar(profile.avatar),
      };
      try { storage.setItem("nbhsk.profile", JSON.stringify(next)); } catch (e) {}
    },
  },
```

- [ ] **Step 5: Run and watch them PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/profile.test.js test/migrations.test.js`
Expected: all pass. Then `npm test` (full, unmasked — main.js still compiles because `defaultProfile()` keeps its call shape), `npm run lint`, `npm run build`.

- [ ] **Step 6: Commit**

```bash
cd /root/work/HSK/game
git add src/profile.js src/migrations.js test/profile.test.js test/migrations.test.js dist/app.js
git commit -m "feat(profile): avatar field — normalizeProfile + v6->v7 migration"
```

---

### Task 4: `friend-compare.js` — LCH2 codec, freshness, security

**Files:**
- Modify: `/root/work/HSK/game/src/friend-compare.js` (whole codec section)
- Test: `/root/work/HSK/game/test/friend-compare.test.js` (update existing expectations + append)

**Interfaces:**
- Consumes: `AVATAR_CAT_IDS` from Task 2; existing `normalizeDisplayName` from `./profile.js`.
- Produces (used by Tasks 5, 11, 12):
  - `encodeFriendCard(card) -> string` — ALWAYS emits `LCH2|name|level|streak|mastered|stickers|avatar|day` (8 parts).
  - `decodeFriendCard(payload) -> FriendCard | null` — dual-decode: `LCH1` with exactly 6 parts, `LCH2` with exactly 8; stats strict (non-finite → null), `avatar`/`day` lenient (bad avatar → `""`, bad day → 0).
  - `normalizeFriendCard(card) -> { name, level, streak, mastered, stickers, avatar, day }` (newly exported; `avatar` `""`-or-allowlisted, `day` int in `[0, MAX_CARD_DAY]`).
  - `epochDay(dateStr) -> int >= 0` (`"YYYY-MM-DD"` UTC-parse; garbage → 0).
  - `cardAgeDays(card, todayDay) -> null | int >= 0` (day 0 or falsy todayDay → null; future → 0).
  - `buildFriendCompare(mine, theirs, todayDay = 0) -> { theirName, theirAvatar, ageDays, rows, lead }` (rows/lead shape unchanged).
  - `friendShareLink(origin, card)`, `friendCardFromHash(hash)` — signatures unchanged.

- [ ] **Step 1: Update the existing tests for the v2 wire.** In `/root/work/HSK/game/test/friend-compare.test.js`, add under the `CARD` constant (line ~6):

```js
const CARD_V2 = { ...CARD, avatar: "", day: 0 };
```

Then change these three existing assertions (encode/decode now round-trips through LCH2, which carries the two new fields):

- `expect(decodeFriendCard(encodeFriendCard(CARD))).toEqual(CARD);` → `expect(decodeFriendCard(encodeFriendCard(CARD))).toEqual(CARD_V2);`
- in `"builds a link that parses back to the same card"`: `expect(friendCardFromHash(new URL(link).hash)).toEqual(CARD);` → `...toEqual(CARD_V2);`
- in `"finds f= even when it is not the first hash param"`: `expect(friendCardFromHash(`#x=1&f=${payload}`)).toEqual(CARD);` → `...toEqual(CARD_V2);`

- [ ] **Step 2: Append the new test blocks** at the end of `/root/work/HSK/game/test/friend-compare.test.js`. Also extend the import line to:

```js
import {
  encodeFriendCard, decodeFriendCard, friendShareLink, friendCardFromHash, buildFriendCompare,
  normalizeFriendCard, epochDay, cardAgeDays,
} from "../src/friend-compare.js";
```

```js
describe("LCH1 back-compat (test-pinned wire contract)", () => {
  it("every legacy LCH1 payload decodes to the same stats with avatar '' and day 0", () => {
    expect(decodeFriendCard("LCH1|Jordan|12|7|340|9"))
      .toEqual({ name: "Jordan", level: 12, streak: 7, mastered: 340, stickers: 9, avatar: "", day: 0 });
    expect(decodeFriendCard("LCH1|%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B9%81%E0%B8%A1%E0%B8%A7|3|1|20|2"))
      .toEqual({ name: "น้องแมว", level: 3, streak: 1, mastered: 20, stickers: 2, avatar: "", day: 0 });
  });
  it("prefix/part-count mismatches are rejected both ways", () => {
    expect(decodeFriendCard("LCH1|x|1|1|1|1|panda|20000")).toBeNull(); // LCH1 with 8 parts
    expect(decodeFriendCard("LCH2|x|1|1|1|1")).toBeNull();             // LCH2 with 6 parts
    expect(decodeFriendCard("LCH3|x|1|1|1|1|panda|20000")).toBeNull();
  });
});

describe("LCH2 codec", () => {
  it("emits exactly 8 pipe-delimited parts with the LCH2 prefix", () => {
    const enc = encodeFriendCard({ ...CARD, avatar: "panda", day: 20000 });
    expect(enc.split("|").length).toBe(8);
    expect(enc.startsWith("LCH2|")).toBe(true);
  });
  it("round-trips avatar + day, incl. Thai/emoji names", () => {
    const card = { name: "น้องแมว 🐱", level: 9, streak: 30, mastered: 500, stickers: 12,
      avatar: "mooncake-rabbit", day: 20661 };
    expect(decodeFriendCard(encodeFriendCard(card))).toEqual(card);
  });
  it("stat garbage still rejects the whole card (strictness unchanged)", () => {
    expect(decodeFriendCard("LCH2|x|a|1|1|1|panda|20000")).toBeNull();
    expect(decodeFriendCard("LCH2|x|1|x|1|1|panda|20000")).toBeNull();
    // NOTE: an EMPTY stat part is Number("") === 0 — finite, so it clamps to
    // 0 rather than rejecting. That matches LCH1's existing strictness rule
    // exactly (Number-finiteness, not non-emptiness); do not "fix" it here.
  });
  it("avatar/day are presentational and decode leniently", () => {
    const base = "LCH2|x|1|2|3|4";
    expect(decodeFriendCard(`${base}|<img src=x onerror=x>|5`).avatar).toBe("");
    expect(decodeFriendCard(`${base}|panda; DROP|5`).avatar).toBe("");
    expect(decodeFriendCard(`${base}|cat-happy|5`).avatar).toBe("");   // asset name, not an id
    expect(decodeFriendCard(`${base}|panda|5`).avatar).toBe("panda");
    for (const day of ["-5", "1e99", "NaN", "x"]) {
      const c = decodeFriendCard(`${base}|panda|${day}`);
      expect(c).not.toBeNull();
      expect(c.day).toBe(0);
    }
  });
  it("encoding a hand-built card with a bogus avatar writes '' (defense in depth)", () => {
    expect(encodeFriendCard({ ...CARD, avatar: "javascript:x", day: 5 }).split("|")[6]).toBe("");
  });
});

describe("normalizeFriendCard (exported)", () => {
  it("applies the codec's exact clamps to a raw object", () => {
    expect(normalizeFriendCard({ name: "  a  b  ", level: "7", streak: -1, avatar: "dragon", day: 3.9 }))
      .toEqual({ name: "a b", level: 7, streak: 0, mastered: 0, stickers: 0, avatar: "dragon", day: 3 });
    expect(normalizeFriendCard(null).avatar).toBe("");
  });
});

describe("epochDay / cardAgeDays", () => {
  it("epochDay does UTC math and returns 0 on garbage", () => {
    expect(epochDay("1970-01-02")).toBe(1);
    expect(epochDay("2026-07-27")).toBe(Math.floor(Date.parse("2026-07-27T00:00:00Z") / 86400000));
    expect(epochDay("not-a-date")).toBe(0);
    expect(epochDay("")).toBe(0);
    expect(epochDay(null)).toBe(0);
  });
  it("cardAgeDays: unknown day -> null, future -> 0 (clock skew), else the age", () => {
    expect(cardAgeDays({ day: 0 }, 20000)).toBeNull();     // LCH1 cards
    expect(cardAgeDays({ day: 19990 }, 0)).toBeNull();      // no today reference
    expect(cardAgeDays({ day: 20005 }, 20000)).toBe(0);     // future -> clamped to today
    expect(cardAgeDays({ day: 19990 }, 20000)).toBe(10);
    expect(cardAgeDays({ day: 20000 }, 20000)).toBe(0);
    expect(cardAgeDays(null, 20000)).toBeNull();
  });
});

describe("buildFriendCompare v2 surface", () => {
  it("surfaces theirAvatar (allowlist-validated) and ageDays", () => {
    const cmp = buildFriendCompare(CARD,
      { ...CARD, name: "P", avatar: "panda", day: 19995 }, 20000);
    expect(cmp.theirAvatar).toBe("panda");
    expect(cmp.ageDays).toBe(5);
    const dirty = buildFriendCompare(CARD, { ...CARD, avatar: "<script>" }, 20000);
    expect(dirty.theirAvatar).toBe("");
  });
  it("old 2-arg calls still work (todayDay defaults -> ageDays null)", () => {
    const cmp = buildFriendCompare(CARD, { ...CARD, day: 19995 });
    expect(cmp.ageDays).toBeNull();
    expect(cmp.rows.length).toBe(4);
  });
});
```

- [ ] **Step 3: Run and watch them FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/friend-compare.test.js`
Expected: the updated round-trip tests fail (`expected ... to deeply equal ... avatar: ""`), the new blocks fail with `does not provide an export named 'normalizeFriendCard'`.

- [ ] **Step 4: Implement.** Rewrite the codec section of `/root/work/HSK/game/src/friend-compare.js`. Keep the module header comment, `normalizeDisplayName` import, `SEP`, `MAX_NAME`, `clampInt`, `clampName`, `METRICS` as-is; the changed/new code is:

```js
import { normalizeDisplayName } from "./profile.js";
import { AVATAR_CAT_IDS } from "./avatar.js";   // wire-field allowlist only

const PREFIX_V1 = "LCH1";
const PREFIX_V2 = "LCH2";
const SEP = "|";
const MAX_NAME = 24;
// Sanity ceiling for the card's mint day (epoch day 100000 ≈ year 2243).
// Resolves §5 vs §13 of the spec: "1e99" is garbage -> 0 ("unknown"), not a
// finite-but-absurd freshness. Exported for the friend-recent tests.
export const MAX_CARD_DAY = 100000;

// card: { name, level, streak, mastered, stickers, avatar, day }
// ALWAYS emits LCH2 (8 parts). normalizeFriendCard re-applies the avatar
// allowlist, so a hand-built card with a bogus avatar encodes as "".
export function encodeFriendCard(card = {}) {
  const c = normalizeFriendCard(card);
  return [
    PREFIX_V2,
    encodeURIComponent(c.name),
    c.level,
    c.streak,
    c.mastered,
    c.stickers,
    c.avatar,
    c.day,
  ].join(SEP);
}

// Dual-decode: LCH1 with exactly 6 parts (avatar "", day 0) or LCH2 with
// exactly 8. Any other count/prefix combination -> null. Stat fields stay
// STRICT (non-finite -> null); avatar/day are presentational and decode
// LENIENTLY — a mangled trailing field must not throw away a valid card.
export function decodeFriendCard(payload) {
  if (typeof payload !== "string") return null;
  const parts = payload.trim().split(SEP);
  const v2 = parts.length === 8 && parts[0] === PREFIX_V2;
  const v1 = parts.length === 6 && parts[0] === PREFIX_V1;
  if (!v1 && !v2) return null;
  let name;
  try { name = decodeURIComponent(parts[1]); } catch { return null; }
  const nums = parts.slice(2, 6).map(n => Number(n));
  if (nums.some(n => !Number.isFinite(n))) return null;
  return normalizeFriendCard({
    name,
    level: nums[0], streak: nums[1], mastered: nums[2], stickers: nums[3],
    avatar: v2 ? parts[6] : "",
    day: v2 ? Number(parts[7]) : 0,
  });
}

// Exported (was the private normalizeCard): friend-recent.js re-normalizes
// stored cards through the exact same rules the codec uses.
export function normalizeFriendCard(card = {}) {
  return {
    name: clampName(card.name),
    level: clampInt(card.level),
    streak: clampInt(card.streak),
    mastered: clampInt(card.mastered),
    stickers: clampInt(card.stickers),
    avatar: AVATAR_CAT_IDS.includes(card.avatar) ? card.avatar : "",
    day: clampDay(card.day),
  };
}

function clampDay(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 && n <= MAX_CARD_DAY ? n : 0;
}

// "YYYY-MM-DD" -> days since epoch (same UTC-parse trick as shop.js
// dayIndex, so device timezone never shifts the day). Garbage -> 0.
export function epochDay(dateStr) {
  const n = Math.floor(Date.parse(String(dateStr || "") + "T00:00:00Z") / 86400000);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Freshness with clamping: unknown mint day (LCH1) or no today reference ->
// null; a future card (clock skew between the two phones) -> 0 ("today"),
// never negative.
export function cardAgeDays(card, todayDay) {
  const day = clampDay(card && card.day);
  if (!day || !todayDay) return null;
  return Math.max(0, todayDay - day);
}
```

`buildFriendCompare` (replace the existing function; internal calls switch to `normalizeFriendCard`):

```js
const METRICS = ["level", "streak", "mastered", "stickers"];
export function buildFriendCompare(mine, theirs, todayDay = 0) {
  const m = normalizeFriendCard(mine);
  const t = normalizeFriendCard(theirs);
  const rows = METRICS.map(key => {
    const a = m[key], b = t[key];
    return { key, mine: a, theirs: b, winner: a === b ? "tie" : (a > b ? "mine" : "theirs") };
  });
  const wins = rows.filter(r => r.winner === "mine").length;
  const losses = rows.filter(r => r.winner === "theirs").length;
  return {
    theirName: t.name,
    theirAvatar: t.avatar,          // "" | CatId — already allowlist-validated
    ageDays: cardAgeDays(t, todayDay),
    rows,
    lead: wins === losses ? "tie" : (wins > losses ? "mine" : "theirs"),
  };
}
```

`friendShareLink` / `friendCardFromHash` / `clampInt` / `clampName` stay byte-identical. Delete the old private `normalizeCard` and the old `PREFIX` constant.

- [ ] **Step 5: Run and watch them PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/friend-compare.test.js`
Expected: all pass. Then `npm test` (full, unmasked), `npm run lint`, `npm run build` (bundle grows — friend-compare is reachable from main.js).

- [ ] **Step 6: Commit**

```bash
cd /root/work/HSK/game
git add src/friend-compare.js test/friend-compare.test.js dist/app.js
git commit -m "feat(friend): LCH2 codec — avatar + mint-day on the wire, freshness math, LCH1 back-compat pinned"
```

---

### Task 5: `src/friend-recent.js` — remembered-friends state machine

**Files:**
- Create: `/root/work/HSK/game/src/friend-recent.js`
- Test: `/root/work/HSK/game/test/friend-recent.test.js` (new)

**Interfaces:**
- Consumes: `normalizeFriendCard(card)`, `encodeFriendCard(card)` from Task 4.
- Produces (used by Task 12):
  - `RECENT_FRIENDS_LIMIT === 5`
  - `defaultRecentFriends() -> { v: 1, items: [] }`
  - `normalizeRecentFriends(raw) -> { v: 1, items: [{ card: FriendCard, seenDay: int >= 0 }] }` (tolerant read-normalizer; caps at 5)
  - `rememberFriend(state, card, seenDay) -> { v: 1, items: [...] }` (pure; insert front, dedup, cap 5)
  - `clearRecentFriends() -> { v: 1, items: [] }`

- [ ] **Step 1: Write the failing tests** — create `/root/work/HSK/game/test/friend-recent.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  RECENT_FRIENDS_LIMIT, defaultRecentFriends, normalizeRecentFriends,
  rememberFriend, clearRecentFriends,
} from "../src/friend-recent.js";

const card = (name, over = {}) => ({
  name, level: 1, streak: 2, mastered: 3, stickers: 4, avatar: "", day: 0, ...over,
});

describe("defaults", () => {
  it("defaultRecentFriends / clearRecentFriends return the empty v1 shape", () => {
    expect(defaultRecentFriends()).toEqual({ v: 1, items: [] });
    expect(clearRecentFriends()).toEqual({ v: 1, items: [] });
    expect(RECENT_FRIENDS_LIMIT).toBe(5);
  });
});

describe("rememberFriend", () => {
  it("inserts at the front, newest first", () => {
    let s = rememberFriend(defaultRecentFriends(), card("A"), 100);
    s = rememberFriend(s, card("B"), 101);
    expect(s.items.map(i => i.card.name)).toEqual(["B", "A"]);
    expect(s.items[0].seenDay).toBe(101);
  });
  it("dedups by name: updates stored numbers and bumps to front", () => {
    let s = rememberFriend(defaultRecentFriends(), card("A", { level: 1 }), 100);
    s = rememberFriend(s, card("B"), 101);
    s = rememberFriend(s, card("A", { level: 9 }), 102);
    expect(s.items.map(i => i.card.name)).toEqual(["A", "B"]);
    expect(s.items[0].card.level).toBe(9);
    expect(s.items[0].seenDay).toBe(102);
  });
  it("empty-name cards dedup by the full encoded card", () => {
    let s = rememberFriend(defaultRecentFriends(), card(""), 100);
    s = rememberFriend(s, card(""), 101);                    // identical card -> dedup
    expect(s.items.length).toBe(1);
    s = rememberFriend(s, card("", { level: 9 }), 102);      // different card -> new row
    expect(s.items.length).toBe(2);
  });
  it("caps at 5, dropping the oldest", () => {
    let s = defaultRecentFriends();
    for (const n of ["A", "B", "C", "D", "E", "F"]) s = rememberFriend(s, card(n), 100);
    expect(s.items.length).toBe(5);
    expect(s.items.map(i => i.card.name)).toEqual(["F", "E", "D", "C", "B"]);
  });
  it("clamps seenDay and is pure (inputs not mutated)", () => {
    const before = rememberFriend(defaultRecentFriends(), card("A"), 100);
    const frozen = JSON.stringify(before);
    const after = rememberFriend(before, card("B"), -5);
    expect(after.items[0].seenDay).toBe(0);
    expect(JSON.stringify(before)).toBe(frozen);
    expect(after).not.toBe(before);
  });
});

describe("normalizeRecentFriends (untrusted stored value)", () => {
  it("garbage -> default", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { v: 1 }, { items: "x" }]) {
      expect(normalizeRecentFriends(bad)).toEqual({ v: 1, items: [] });
    }
  });
  it("re-runs every card through normalizeFriendCard and clamps seenDay", () => {
    const s = normalizeRecentFriends({ v: 1, items: [
      { card: { name: "<img src=x onerror=x>", level: "7", avatar: "javascript:x", day: -1 }, seenDay: "9" },
      { card: null, seenDay: -3 },
      "garbage",
    ] });
    expect(s.items.length).toBe(2);
    expect(s.items[0].card.level).toBe(7);
    expect(s.items[0].card.avatar).toBe("");
    expect(s.items[0].card.day).toBe(0);
    expect(s.items[0].card.name).toBe("<img src=x onerror=x>");  // clamped, not thrown — UI escapes
    expect(s.items[0].seenDay).toBe(9);
    expect(s.items[1].seenDay).toBe(0);
  });
  it("caps an oversized stored list at 5", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ card: card("N" + i), seenDay: i }));
    expect(normalizeRecentFriends({ v: 1, items }).items.length).toBe(5);
  });
});
```

- [ ] **Step 2: Run and watch it FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/friend-recent.test.js`
Expected: FAIL — `Failed to resolve import "../src/friend-recent.js"`.

- [ ] **Step 3: Implementation** — create `/root/work/HSK/game/src/friend-recent.js`:

```js
"use strict";
// Remembered-friends list state machine (last 5 compared cards). Pure: no
// DOM, storage, or Date — friend-screen.js persists the returned state under
// nbhsk.friends and decides WHEN a compare counts (policy: every successful
// compare). localStorage is attacker-writable on a shared device, so the
// read-normalizer re-runs every card through the codec's own clamps.
import { normalizeFriendCard, encodeFriendCard } from "./friend-compare.js";

export const RECENT_FRIENDS_LIMIT = 5;

export function defaultRecentFriends() {
  return { v: 1, items: [] };
}

export function normalizeRecentFriends(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.items)) {
    return defaultRecentFriends();
  }
  const items = [];
  for (const it of raw.items) {
    if (!it || typeof it !== "object") continue;
    items.push({ card: normalizeFriendCard(it.card), seenDay: clampDay(it.seenDay) });
    if (items.length >= RECENT_FRIENDS_LIMIT) break;
  }
  return { v: 1, items };
}

// Insert card at the FRONT. Dedup key: card.name when non-empty (exact match
// after the codec's grapheme clamp), else the full encoded card — so
// re-comparing the same friend updates their numbers and bumps them to the
// top instead of duplicating. Cap 5 (oldest drops). Pure: returns new state.
export function rememberFriend(state, card, seenDay) {
  const s = normalizeRecentFriends(state);
  const entry = { card: normalizeFriendCard(card), seenDay: clampDay(seenDay) };
  const keyOf = item => (item.card.name !== "" ? "n:" + item.card.name : "c:" + encodeFriendCard(item.card));
  const key = keyOf(entry);
  const items = [entry, ...s.items.filter(it => keyOf(it) !== key)].slice(0, RECENT_FRIENDS_LIMIT);
  return { v: 1, items };
}

export function clearRecentFriends() {
  return defaultRecentFriends();
}

function clampDay(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
```

- [ ] **Step 4: Run and watch it PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/friend-recent.test.js`
Expected: all pass. Then `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add src/friend-recent.js test/friend-recent.test.js
git commit -m "feat(friend): remembered-friends state machine — dedup, cap 5, untrusted-read normalizer"
```

---

### Task 6: `src/qr.js` — byte-mode QR encoder core

**Files:**
- Create: `/root/work/HSK/game/src/qr.js`
- Test: `/root/work/HSK/game/test/qr.test.js` (new; structural/capacity/determinism — the reference vectors land in Task 7)

**Interfaces:**
- Consumes: nothing (self-contained; manual UTF-8, no `TextEncoder`).
- Produces (used by Tasks 7, 12):
  - `qrEncode(text, opts = {}) -> { version: 1..40, eccLevel: "L"|"M", size: 17+4*version, modules: Uint8Array(size*size) row-major (1 = dark), mask: 0..7 } | null` (null when the UTF-8 payload exceeds v40-L capacity, 2,953 bytes). `opts.forceMask` (0–7) is a test-only hook that skips penalty-based mask selection.
  - `qrByteCapacity(version, eccLevel) -> int` — max payload bytes (test/table hook).
  - Version/ECC policy: smallest version fitting at M; if that version ≤ 13 use it, else re-select smallest at L.

- [ ] **Step 1: Write the failing tests** — create `/root/work/HSK/game/test/qr.test.js`:

```js
import { describe, it, expect } from "vitest";
import { qrEncode, qrByteCapacity } from "../src/qr.js";

// --- helpers -------------------------------------------------------------
const at = (q, x, y) => q.modules[y * q.size + x];

// Read the format info from its second copy (top-right + bottom-left),
// un-mask with 0x5412, verify BCH(15,5) over generator 0x537, and extract
// {ecc, mask}. ECC level bits: L=1, M=0.
function readFormatInfo(q) {
  let bits = 0;
  for (let i = 0; i < 8; i++) bits |= at(q, q.size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) bits |= at(q, 8, q.size - 15 + i) << i;
  bits ^= 0x5412;
  let rem = bits;
  for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  return { ok: rem === 0, ecc: (bits >>> 13) & 3, mask: (bits >>> 10) & 7 };
}

// Read the 18-bit version info block (bottom-left copy) and BCH-check it
// over generator 0x1F25; top 6 bits must equal the version.
function readVersionInfo(q) {
  let bits = 0;
  for (let i = 0; i < 18; i++) {
    const x = q.size - 11 + (i % 3), y = Math.floor(i / 3);
    bits |= at(q, x, y) << i;
  }
  let rem = bits;
  for (let i = 17; i >= 12; i--) if ((rem >>> i) & 1) rem ^= 0x1F25 << (i - 12);
  return { ok: rem === 0, version: bits >>> 12 };
}

// --- capacity table (spot-pinned against the published standard) ---------
describe("qrByteCapacity", () => {
  it("matches the published byte-mode capacities at the corners we rely on", () => {
    expect(qrByteCapacity(1, "M")).toBe(14);
    expect(qrByteCapacity(2, "M")).toBe(26);
    expect(qrByteCapacity(7, "M")).toBe(121);
    expect(qrByteCapacity(13, "M")).toBe(331);
    expect(qrByteCapacity(12, "L")).toBe(367);
    expect(qrByteCapacity(13, "L")).toBe(425);
    expect(qrByteCapacity(14, "L")).toBe(458);
    expect(qrByteCapacity(40, "L")).toBe(2953);   // the spec's v40-L ceiling
  });
});

// --- version/ECC selection policy ----------------------------------------
describe("version/ECC selection policy (M through v13, else L)", () => {
  it("short payloads pick M at the smallest version", () => {
    expect(qrEncode("HELLO")).toMatchObject({ version: 1, eccLevel: "M", size: 21 });
    expect(qrEncode("A".repeat(14))).toMatchObject({ version: 1, eccLevel: "M" });
    expect(qrEncode("A".repeat(15))).toMatchObject({ version: 2, eccLevel: "M" });
    expect(qrEncode("A".repeat(331))).toMatchObject({ version: 13, eccLevel: "M" });
  });
  it("crossing the v13-M threshold re-selects at L (can even shrink the version)", () => {
    expect(qrEncode("A".repeat(332))).toMatchObject({ version: 12, eccLevel: "L" });
    expect(qrEncode("A".repeat(367))).toMatchObject({ version: 12, eccLevel: "L" });
    expect(qrEncode("A".repeat(368))).toMatchObject({ version: 13, eccLevel: "L" });
    expect(qrEncode("A".repeat(425))).toMatchObject({ version: 13, eccLevel: "L" });
    expect(qrEncode("A".repeat(426))).toMatchObject({ version: 14, eccLevel: "L" });
  });
  it("counts UTF-8 bytes, not JS chars (Thai = 3 B/codepoint)", () => {
    // 17 codepoints x 3 B x 8 reps = 408 B -> (368, 425] -> v13-L, the spec's
    // "typical Thai" worst case.
    const thai = "ชวนเพื่อนเทียบกัน".repeat(8);
    expect(qrEncode(thai)).toMatchObject({ version: 13, eccLevel: "L", size: 69 });
  });
  it("returns null past v40-L capacity", () => {
    expect(qrEncode("A".repeat(2953))).toMatchObject({ version: 40, eccLevel: "L", size: 177 });
    expect(qrEncode("A".repeat(2954))).toBeNull();
  });
});

// --- structural invariants ------------------------------------------------
describe("structural invariants", () => {
  const CASES = ["HELLO", "A".repeat(100), "ชวนเพื่อนเทียบกัน".repeat(8), "A".repeat(500)];
  it("size = 17 + 4*version and modules length = size^2", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      expect(q.size).toBe(17 + 4 * q.version);
      expect(q.modules.length).toBe(q.size * q.size);
    }
  });
  it("finder patterns sit in three corners", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      for (const [cx, cy] of [[3, 3], [q.size - 4, 3], [3, q.size - 4]]) {
        expect(at(q, cx, cy)).toBe(1);            // center dark
        expect(at(q, cx - 2, cy - 2)).toBe(0);    // light ring
        expect(at(q, cx - 3, cy - 3)).toBe(1);    // outer dark ring
      }
    }
  });
  it("timing patterns alternate between the finders", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      for (let i = 8; i < q.size - 8; i++) {
        expect(at(q, i, 6)).toBe(i % 2 === 0 ? 1 : 0);
        expect(at(q, 6, i)).toBe(i % 2 === 0 ? 1 : 0);
      }
    }
  });
  it("format info BCH-decodes to the chosen ECC + mask", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      const f = readFormatInfo(q);
      expect(f.ok).toBe(true);
      expect(f.ecc).toBe(q.eccLevel === "L" ? 1 : 0);
      expect(f.mask).toBe(q.mask);
    }
  });
  it("version info block is present and correct for versions >= 7", () => {
    const q = qrEncode("A".repeat(200));   // v10-M territory
    expect(q.version).toBeGreaterThanOrEqual(7);
    const v = readVersionInfo(q);
    expect(v.ok).toBe(true);
    expect(v.version).toBe(q.version);
    // and absent below 7: v1 has no reserved version area, nothing to read.
    expect(qrEncode("HELLO").version).toBeLessThan(7);
  });
  it("dark module is set at (8, size-8)", () => {
    for (const text of CASES) {
      const q = qrEncode(text);
      expect(at(q, 8, q.size - 8)).toBe(1);
    }
  });
});

describe("determinism + mask hook", () => {
  it("same input -> identical matrix", () => {
    const a = qrEncode("determinism-check");
    const b = qrEncode("determinism-check");
    expect(a.mask).toBe(b.mask);
    expect(Array.from(a.modules)).toEqual(Array.from(b.modules));
  });
  it("forceMask pins the mask and the format info follows", () => {
    for (const m of [0, 3, 7]) {
      const q = qrEncode("HELLO", { forceMask: m });
      expect(q.mask).toBe(m);
      const f = readFormatInfo(q);
      expect(f.ok).toBe(true);
      expect(f.mask).toBe(m);
    }
  });
});
```

- [ ] **Step 2: Run and watch it FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/qr.test.js`
Expected: FAIL — `Failed to resolve import "../src/qr.js"`.

- [ ] **Step 3: Implementation** — create `/root/work/HSK/game/src/qr.js`. This is the complete encoder (byte-mode only, ECC L/M only, versions 1–40; algorithm structure follows nayuki's public-domain qrcodegen):

```js
"use strict";
// Self-contained byte-mode QR encoder (model 2, versions 1-40, ECC L/M).
// Pure: no DOM, no deps, no TextEncoder (manual UTF-8 — identical under
// vitest, WebView, and file://). It encodes an opaque string; it knows
// nothing about friend cards, URLs, colors, or quiet zones (the UI owns
// those). Decoding is out of scope.
//
// Version/ECC policy (spec §3): try ECC M; if the smallest fitting version
// at M is <= 13, use it. Otherwise re-select at ECC L — for dense payloads,
// fewer modules beats stronger correction on a phone screen. Null past
// v40-L capacity (2,953 bytes).

// Per-version ECC codewords per block and block counts (index = version).
const ECC_CODEWORDS_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
      28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
      26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
};
const NUM_BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7,
      8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14,
      16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
};
const ECC_FORMAT_BITS = { L: 1, M: 0 };

// ---- capacity ------------------------------------------------------------

function rawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version, ecc) {
  return Math.floor(rawDataModules(version) / 8)
    - ECC_CODEWORDS_PER_BLOCK[ecc][version] * NUM_BLOCKS[ecc][version];
}

// Max payload bytes in byte mode: subtract the 4-bit mode indicator + the
// 8-bit (v1-9) / 16-bit (v10-40) char count from the data-bit budget.
export function qrByteCapacity(version, ecc) {
  return dataCodewords(version, ecc) - (version <= 9 ? 2 : 3);
}

function selectVersion(numBytes) {
  let mVer = null;
  for (let v = 1; v <= 40; v++) if (qrByteCapacity(v, "M") >= numBytes) { mVer = v; break; }
  if (mVer !== null && mVer <= 13) return { version: mVer, eccLevel: "M" };
  for (let v = 1; v <= 40; v++) if (qrByteCapacity(v, "L") >= numBytes) return { version: v, eccLevel: "L" };
  return null;
}

// ---- UTF-8 (manual, env-agnostic) ---------------------------------------

function utf8Bytes(str) {
  const out = [];
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

// ---- bit packing: mode + count + data + terminator + pads ---------------

function makeDataCodewords(bytes, version, ecc) {
  const capBits = dataCodewords(version, ecc) * 8;
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4);                                       // byte-mode indicator 0100
  push(bytes.length, version <= 9 ? 8 : 16);        // char count
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capBits - bits.length));      // terminator
  push(0, (8 - (bits.length % 8)) % 8);             // byte-align
  for (let pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) push(pad, 8);
  const out = new Uint8Array(capBits / 8);
  bits.forEach((b, i) => { out[i >>> 3] |= b << (7 - (i & 7)); });
  return out;
}

// ---- Reed-Solomon over GF(256), generator 0x11D -------------------------

function rsMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xFF;
}

function rsComputeDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= rsMultiply(divisor[i], factor);
  }
  return result;
}

// ---- block split + interleave (per the version/ECC block table) ---------

function addEccAndInterleave(data, version, ecc) {
  const numBlocks = NUM_BLOCKS[ecc][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsComputeDivisor(blockEccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const block = Array.from(dat);
    if (i < numShortBlocks) block.push(0);          // placeholder, skipped on read-out
    blocks.push(block.concat(Array.from(rsRemainder(dat, divisor))));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return new Uint8Array(result);
}

// ---- function patterns ---------------------------------------------------

function alignmentPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let i = 0, pos = size - 7; i < numAlign - 1; i++, pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFormatBits(modules, func, size, ecc, mask) {
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  const bit = i => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));           // first copy (around top-left finder)
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); // second copy (top-right + bottom-left)
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);                                   // dark module
}

function drawVersionInfo(modules, func, size, version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  const bits = (version << 12) | rem;
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3), b = Math.floor(i / 3);
    set(a, b, dark);
    set(b, a, dark);
  }
}

function buildFunctionPatterns(version, ecc) {
  const size = version * 4 + 17;
  const modules = new Uint8Array(size * size);
  const func = new Uint8Array(size * size);
  const set = (x, y, dark) => { modules[y * size + x] = dark ? 1 : 0; func[y * size + x] = 1; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }   // timing
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, dist !== 2 && dist !== 4);            // 2 = light ring, 4 = separator
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = alignmentPositions(version);
  for (let i = 0; i < align.length; i++) for (let j = 0; j < align.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  drawFormatBits(modules, func, size, ecc, 0);        // reserve; redrawn with the real mask
  if (version >= 7) drawVersionInfo(modules, func, size, version);
  return { size, modules, func };
}

// ---- codeword placement (zigzag) ----------------------------------------

function drawCodewords(modules, func, size, data) {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!func[y * size + x] && i < data.length * 8) {
          modules[y * size + x] = (data[i >>> 3] >>> (7 - (i & 7))) & 1;
          i++;
        }
      }
    }
  }
}

// ---- masking + penalty (all 8 masks, standard N1-N4) --------------------

function applyMask(modules, func, size, mask) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (func[y * size + x]) continue;
    let invert;
    switch (mask) {
      case 0: invert = (x + y) % 2 === 0; break;
      case 1: invert = y % 2 === 0; break;
      case 2: invert = x % 3 === 0; break;
      case 3: invert = (x + y) % 3 === 0; break;
      case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
      case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
      case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
    }
    if (invert) modules[y * size + x] ^= 1;
  }
}

function finderPenaltyCountPatterns(h) {
  const n = h[1];
  const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
  return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0)
       + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
}

function finderPenaltyAddHistory(runLength, h, size) {
  if (h[0] === 0) runLength += size;   // treat the border as light
  h.pop();
  h.unshift(runLength);
}

function finderPenaltyTerminate(runColor, runLength, h, size) {
  if (runColor) { finderPenaltyAddHistory(runLength, h, size); runLength = 0; }
  finderPenaltyAddHistory(runLength + size, h, size);
  return finderPenaltyCountPatterns(h);
}

function penaltyScore(modules, size) {
  let result = 0;
  const at = (x, y) => modules[y * size + x] === 1;
  for (let y = 0; y < size; y++) {                       // N1 + N3, rows
    let runColor = false, runX = 0;
    const h = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (at(x, y) === runColor) {
        runX++;
        if (runX === 5) result += 3;
        else if (runX > 5) result++;
      } else {
        finderPenaltyAddHistory(runX, h, size);
        if (!runColor) result += finderPenaltyCountPatterns(h) * 40;
        runColor = at(x, y);
        runX = 1;
      }
    }
    result += finderPenaltyTerminate(runColor, runX, h, size) * 40;
  }
  for (let x = 0; x < size; x++) {                       // N1 + N3, columns
    let runColor = false, runY = 0;
    const h = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (at(x, y) === runColor) {
        runY++;
        if (runY === 5) result += 3;
        else if (runY > 5) result++;
      } else {
        finderPenaltyAddHistory(runY, h, size);
        if (!runColor) result += finderPenaltyCountPatterns(h) * 40;
        runColor = at(x, y);
        runY = 1;
      }
    }
    result += finderPenaltyTerminate(runColor, runY, h, size) * 40;
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {   // N2
    const c = at(x, y);
    if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) result += 3;
  }
  let dark = 0;                                           // N4
  for (const m of modules) dark += m;
  const total = size * size;
  result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return result;
}

// ---- public API ----------------------------------------------------------

export function qrEncode(text, opts = {}) {
  const bytes = utf8Bytes(text);
  const sel = selectVersion(bytes.length);
  if (!sel) return null;
  const { version, eccLevel } = sel;
  const data = addEccAndInterleave(makeDataCodewords(bytes, version, eccLevel), version, eccLevel);
  const { size, modules, func } = buildFunctionPatterns(version, eccLevel);
  drawCodewords(modules, func, size, data);
  let mask = opts.forceMask;
  if (!(Number.isInteger(mask) && mask >= 0 && mask <= 7)) {
    mask = 0;
    let minPenalty = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(modules, func, size, m);
      drawFormatBits(modules, func, size, eccLevel, m);
      const p = penaltyScore(modules, size);
      if (p < minPenalty) { minPenalty = p; mask = m; }
      applyMask(modules, func, size, m);                  // undo (XOR is its own inverse)
    }
  }
  applyMask(modules, func, size, mask);
  drawFormatBits(modules, func, size, eccLevel, mask);
  return { version, eccLevel, size, modules, mask };
}
```

- [ ] **Step 4: Run and watch it PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/qr.test.js`
Expected: all pass. If a capacity assertion fails, the block tables have a typo — fix the table against the published byte-mode capacity table (the test values ARE the published values); do not adjust the test. Then `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add src/qr.js test/qr.test.js
git commit -m "feat(qr): self-contained byte-mode QR encoder (v1-40, ECC L/M, policy M<=13 else L)"
```

---

### Task 7: `qrSvgPath` + trusted reference vectors

**Files:**
- Modify: `/root/work/HSK/game/src/qr.js` (append one export)
- Test: `/root/work/HSK/game/test/qr.test.js` (append two describes)
- Scratch (NOT committed): `/tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/gen-qr-vectors.mjs`

**Interfaces:**
- Consumes: `qrEncode(text, opts)` from Task 6.
- Produces (used by Task 12): `qrSvgPath(text) -> { size: int, d: string } | null` — `d` is one SVG path (`M<x> <y>h<run>v1h-<run>z` per horizontal dark run, no quiet zone — the UI owns the quiet zone).

- [ ] **Step 1: Write the failing svg test** — append to `/root/work/HSK/game/test/qr.test.js` (extend the import to `import { qrEncode, qrByteCapacity, qrSvgPath } from "../src/qr.js";`):

```js
describe("qrSvgPath", () => {
  it("emits one h-run rect per horizontal dark run and propagates size", () => {
    const q = qrEncode("HELLO");
    const svg = qrSvgPath("HELLO");
    expect(svg.size).toBe(q.size);
    let runs = 0;
    for (let y = 0; y < q.size; y++) {
      for (let x = 0; x < q.size; x++) {
        if (q.modules[y * q.size + x] && (x === 0 || !q.modules[y * q.size + x - 1])) runs++;
      }
    }
    expect((svg.d.match(/M/g) || []).length).toBe(runs);
    expect(svg.d).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });
  it("null propagates past capacity", () => {
    expect(qrSvgPath("A".repeat(2954))).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch it FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/qr.test.js`
Expected: FAIL — `does not provide an export named 'qrSvgPath'`.

- [ ] **Step 3: Implement** — append to `/root/work/HSK/game/src/qr.js`:

```js
// qrEncode + one SVG path string, one h/v rect per horizontal run of dark
// modules. No quiet zone — the UI's viewBox provides the mandatory 4 modules.
export function qrSvgPath(text) {
  const q = qrEncode(text);
  if (!q) return null;
  const { size, modules } = q;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      let run = 1;
      while (x + run < size && modules[y * size + x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return { size, d };
}
```

Run: `cd /root/work/HSK/game && npx vitest run test/qr.test.js` — expect PASS.

- [ ] **Step 4: Generate trusted reference vectors.** Write `/tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/gen-qr-vectors.mjs`:

```js
// One-off fixture generator. Compares nothing itself — it prints ASCII-art
// matrices from the independent node-qrcode implementation, pinned to the
// version/ecc/mask OUR encoder chose, for embedding in test/qr.test.js.
import QRCode from "qrcode";
import { qrEncode } from "/root/work/HSK/game/src/qr.js";

const CASES = [
  { label: "VEC_ASCII_V1M", text: "HELLO" },
  { label: "VEC_THAI_V13L", text: "ชวนเพื่อนเทียบกัน".repeat(8) },
];
for (const c of CASES) {
  const mine = qrEncode(c.text);
  const ref = QRCode.create([{ data: Buffer.from(c.text, "utf8"), mode: "byte" }], {
    version: mine.version,
    errorCorrectionLevel: mine.eccLevel,
    maskPattern: mine.mask,
  });
  const size = ref.modules.size;
  if (size !== mine.size) throw new Error(`size mismatch: ref ${size} vs mine ${mine.size}`);
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) row += ref.modules.data[y * size + x] ? "#" : ".";
    rows.push(row);
  }
  console.log(`// ${c.label}: "${c.label === "VEC_ASCII_V1M" ? c.text : "(thai x8)"}" -> v${mine.version}-${mine.eccLevel}, mask ${mine.mask}`);
  console.log(`const ${c.label} = ${JSON.stringify(rows)};`);
  console.log("");
}
```

Run it (the `--no-save` install must NOT touch `package.json`/`package-lock.json` — verify with `git status` after):

```bash
cd /root/work/HSK/game
npm install --no-save qrcode@1.5.4
node /tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/gen-qr-vectors.mjs
git status --short   # must show ONLY the intended test/src files, no package*.json
```

- [ ] **Step 5: Embed the vectors.** Paste the two printed `const VEC_...` arrays into `/root/work/HSK/game/test/qr.test.js` (top level, above the describes) and append:

```js
describe("known vectors (independent reference: node-qrcode, pinned version/ecc/mask)", () => {
  function toAscii(q) {
    const rows = [];
    for (let y = 0; y < q.size; y++) {
      let row = "";
      for (let x = 0; x < q.size; x++) row += q.modules[y * q.size + x] ? "#" : ".";
      rows.push(row);
    }
    return rows;
  }
  it("short ASCII matrix matches cell-for-cell", () => {
    const q = qrEncode("HELLO", { forceMask: VEC_ASCII_V1M_MASK });
    expect(toAscii(q)).toEqual(VEC_ASCII_V1M);
  });
  it("Thai v13-L matrix matches cell-for-cell", () => {
    const q = qrEncode("ชวนเพื่อนเทียบกัน".repeat(8), { forceMask: VEC_THAI_V13L_MASK });
    expect(toAscii(q)).toEqual(VEC_THAI_V13L);
  });
});
```

Also add, next to each pasted vector, the mask constant the generator printed in its comment line, e.g.:

```js
const VEC_ASCII_V1M_MASK = 0;   // <- the mask number from the generator's comment
const VEC_THAI_V13L_MASK = 0;   // <- ditto
```

(Using `forceMask` here pins the comparison to identical masking; free-choice masking is already covered by the determinism + format-info tests in Task 6. If a vector test fails cell-for-cell, our encoder has a real data/ECC/placement bug — fix the encoder, never the vector.)

- [ ] **Step 6: Run and watch it PASS, restore node_modules**

```bash
cd /root/work/HSK/game
npx vitest run test/qr.test.js     # all pass, incl. both vectors
npm ci                              # restore pristine node_modules (drops the --no-save qrcode)
npm test                            # full suite, exit code unmasked
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
cd /root/work/HSK/game
git add src/qr.js test/qr.test.js
git commit -m "feat(qr): qrSvgPath + independent-reference known-vector tests"
```

---

### Task 8: `src/i18n.js` — new key families (EN + TH, TH-REVIEW markers)

**Files:**
- Modify: `/root/work/HSK/game/src/i18n.js` — EN insertions after `"friend.metric.stickers"` (line ~526), TH insertions after the TH `"friend.metric.stickers"` (line ~1292). Retired keys (`friend.compareCta` line 507/1273, `friend.title` line 508/1274) are NOT removed here — Task 11 removes them together with their last reference (main.js:453).

**Interfaces:**
- Consumes: nothing.
- Produces: keys used by Tasks 9–12: `avatar.title`, `avatar.change`, `avatar.monogram`, `avatar.photo`, `avatar.photoHint`, `avatar.removePhoto`, `avatar.locked`, `avatar.photoError`, `avatar.photoTooBig`, `avatar.saveFailed`, `avatar.cat.lucky`, `friend.inviteCta`, `friend.inviteTitle`, `friend.inviteLead`, `friend.privacyNote`, `friend.qrLabel`, `friend.qrTooLong`, `friend.recentTitle`, `friend.recentEmpty`, `friend.recentClear`, `friend.recentCleared`, `friend.asOfToday`, `friend.asOfDays` (param `{n}`), `friend.namePrompt`, `friend.namePromptSave`. Existing `test/i18n.test.js` (EN/TH parity) is the failing test here.

- [ ] **Step 1: Add the EN keys** — insert into the `en` table of `/root/work/HSK/game/src/i18n.js` directly after `"friend.metric.stickers": "Stickers earned",`:

```js
    "friend.inviteCta": "Invite a friend",
    "friend.inviteTitle": "Invite a friend",
    "friend.inviteLead": "Learning is better together — send your card!",
    "friend.privacyNote": "Your code and QR carry only your chosen name, level, and progress numbers — no account, no email, nothing personal.",
    "friend.qrLabel": "Or have them scan this:",
    "friend.qrTooLong": "Your name is too long for a QR code — share the link instead.",
    "friend.recentTitle": "Friends you've compared",
    "friend.recentEmpty": "No friends here yet — share your card to start!",
    "friend.recentClear": "Clear list",
    "friend.recentCleared": "Friend list cleared",
    "friend.asOfToday": "as of today",
    "friend.asOfDays": "as of {n} days ago",
    "friend.namePrompt": "Add your name so friends know it's you:",
    "friend.namePromptSave": "Save name",
    "avatar.title": "Profile picture",
    "avatar.change": "Change profile picture",
    "avatar.monogram": "Your initial",
    "avatar.photo": "Use a photo",
    "avatar.photoHint": "Your photo stays on this device — it is never uploaded.",
    "avatar.removePhoto": "Remove photo",
    "avatar.locked": "Unlock in the Shop",
    "avatar.photoError": "Couldn't read that photo — try another one.",
    "avatar.photoTooBig": "That photo is too detailed to save — try another one.",
    "avatar.saveFailed": "Not enough space to save the photo. Your old picture is kept.",
    "avatar.cat.lucky": "Lucky Cat",
```

(Cat-skin tile names reuse the existing `t("item." + id)` keys — `item.panda` etc. already exist in both locales.)

- [ ] **Step 2: Run the parity test and watch it FAIL**

Run: `cd /root/work/HSK/game && npx vitest run test/i18n.test.js`
Expected: FAIL — the EN/TH parity check reports the 25 new keys missing from `th`.

- [ ] **Step 3: Add the TH keys** — insert into the `th` table directly after `"friend.metric.stickers": "สติกเกอร์ที่ได้รับ",`. Every line carries the `// TH-REVIEW` marker (v127 lesson — this is what feeds the Thai review queue):

```js
    "friend.inviteCta": "ชวนเพื่อน", // TH-REVIEW
    "friend.inviteTitle": "ชวนเพื่อน", // TH-REVIEW
    "friend.inviteLead": "เรียนด้วยกันสนุกกว่า — ส่งการ์ดของคุณเลย!", // TH-REVIEW
    "friend.privacyNote": "รหัสและ QR ของคุณมีแค่ชื่อที่คุณตั้ง เลเวล และตัวเลขความคืบหน้า — ไม่มีบัญชี ไม่มีอีเมล ไม่มีข้อมูลส่วนตัว", // TH-REVIEW
    "friend.qrLabel": "หรือให้เพื่อนสแกนอันนี้:", // TH-REVIEW
    "friend.qrTooLong": "ชื่อของคุณยาวเกินไปสำหรับ QR — แชร์เป็นลิงก์แทนนะ", // TH-REVIEW
    "friend.recentTitle": "เพื่อนที่เคยเทียบกัน", // TH-REVIEW
    "friend.recentEmpty": "ยังไม่มีเพื่อนเลย — แชร์การ์ดของคุณเพื่อเริ่มกันเลย!", // TH-REVIEW
    "friend.recentClear": "ล้างรายชื่อ", // TH-REVIEW
    "friend.recentCleared": "ล้างรายชื่อเพื่อนแล้ว", // TH-REVIEW
    "friend.asOfToday": "ข้อมูลของวันนี้", // TH-REVIEW
    "friend.asOfDays": "ข้อมูลเมื่อ {n} วันก่อน", // TH-REVIEW
    "friend.namePrompt": "ใส่ชื่อของคุณให้เพื่อนรู้ว่าเป็นคุณ:", // TH-REVIEW
    "friend.namePromptSave": "บันทึกชื่อ", // TH-REVIEW
    "avatar.title": "รูปโปรไฟล์", // TH-REVIEW
    "avatar.change": "เปลี่ยนรูปโปรไฟล์", // TH-REVIEW
    "avatar.monogram": "ตัวอักษรย่อของคุณ", // TH-REVIEW
    "avatar.photo": "ใช้รูปถ่าย", // TH-REVIEW
    "avatar.photoHint": "รูปของคุณอยู่ในเครื่องนี้เท่านั้น — ไม่มีการอัปโหลดเด็ดขาด", // TH-REVIEW
    "avatar.removePhoto": "ลบรูปถ่าย", // TH-REVIEW
    "avatar.locked": "ปลดล็อกได้ในร้านค้า", // TH-REVIEW
    "avatar.photoError": "อ่านรูปนี้ไม่ได้ — ลองรูปอื่นดูนะ", // TH-REVIEW
    "avatar.photoTooBig": "รูปนี้มีรายละเอียดมากเกินไปจนบันทึกไม่ได้ — ลองรูปอื่นดูนะ", // TH-REVIEW
    "avatar.saveFailed": "พื้นที่ไม่พอสำหรับบันทึกรูป รูปเดิมของคุณยังอยู่", // TH-REVIEW
    "avatar.cat.lucky": "แมวนำโชค", // TH-REVIEW
```

- [ ] **Step 4: Run and watch it PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/i18n.test.js test/i18n-usage.test.js`
Expected: both pass (new keys exist in both locales; nothing references them yet, which the usage test does not penalize). Then `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
cd /root/work/HSK/game
git add src/i18n.js dist/app.js
git commit -m "feat(i18n): avatar.* + friend invite key families, EN+TH with TH-REVIEW markers"
```

---

### Task 9: `index.html` — hero button, avatar overlay, friend-panel CSS, `#go-friend` surfacing

**Files:**
- Modify: `/root/work/HSK/game/index.html`:
  - line 826 (`position:fixed` overlay rule)
  - lines 2428–2435 (profile hero avatar div → button)
  - after line 2659 (`</div>` closing `#friend-overlay`) — new `#avatar-overlay`
  - line 2472 (`#go-friend` button — MOVE to the overview pane after line 2457, relabel)
  - CSS additions after line 265 (avatar) and after line 1280 (friend panel)
- Test: `/root/work/HSK/game/test/accessibility-markup.test.js` (add one overlay assertion)

**Interfaces:**
- Consumes: i18n keys from Task 8 (`avatar.title`, `friend.inviteCta`, `friend.inviteTitle`).
- Produces (used by Tasks 10–12): DOM ids `#avatar-overlay`, `#avatar-panel`, `#avatar-popup-close`, `#avatar-dialog-title`, `#profile-avatar` (now a `<button>`), `#profile-avatar-art`, `#profile-avatar-initial`; CSS classes `.av-grid`, `.av-tile`, `.av-art`, `.av-initial`, `.av-cap`, `.av-lock`, `.av-file`, `.av-hint`, `.av-remove`, `.fr-note`, `.fr-qr`, `.fr-mycard`, `.fr-mycard-meta`, `.fr-recent-row`, `.fr-recent-name`, `.fr-avatar`, `.fr-avatar-art`, `.fr-avatar-mono`, `.fr-avatar-me`, `.fr-avatar-row`, `.fr-fresh`, `.fr-clear`, `.fr-compare-head`, `.fr-their-name`. `#go-friend` keeps its id (wiring untouched) but lives in `#profile-overview-pane`.

- [ ] **Step 1: Write the failing test** — in `/root/work/HSK/game/test/accessibility-markup.test.js`, inside `it("labels answer choices and modal overlays", ...)` add alongside the existing overlay expectations:

```js
    expect(html).toContain('id="avatar-overlay" role="dialog" aria-modal="true"');
```

Run: `cd /root/work/HSK/game && npx vitest run test/accessibility-markup.test.js`
Expected: FAIL — the string is absent.

- [ ] **Step 2: Overlay viewport rule.** Change line 826 from

```css
  #word-overlay,#friend-overlay,#quest-overlay{position:fixed; inset:0;}
```

to

```css
  #word-overlay,#friend-overlay,#quest-overlay,#avatar-overlay{position:fixed; inset:0;}
```

- [ ] **Step 3: Hero avatar becomes a button.** Replace lines 2429–2435 (the `#profile-avatar` div) with:

```html
      <button type="button" class="profile-avatar" id="profile-avatar" aria-label="Change profile picture">
        <span class="profile-avatar-art" id="profile-avatar-art" aria-hidden="true"></span>
        <span class="profile-avatar-initial" id="profile-avatar-initial" aria-hidden="true"></span>
        <svg class="profile-avatar-fallback" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="22" r="12" fill="currentColor"></circle>
          <path d="M10 56c1-14 9-22 22-22s21 8 22 22" fill="currentColor"></path>
        </svg>
        <span class="profile-avatar-edit" aria-hidden="true">✎</span>
      </button>
```

Ordering matters for the offline degrade: `-art` (background layer) FIRST in source, but painted ABOVE via `position:absolute` — if a skin sheet isn't cached, its background silently doesn't paint and the initial/person icon shows through. (`aria-label` is re-set localized by main.js in Task 11.)

- [ ] **Step 4: Avatar CSS.** Insert after line 265 (`.profile-avatar-fallback{...}`):

```css
  /* Avatar-picker feature (2026-07-27): the hero circle is now a button. */
  button.profile-avatar{position:relative; padding:0; font:inherit; cursor:pointer;}
  .profile-avatar-art{position:absolute; inset:0; border-radius:50%; background-repeat:no-repeat; z-index:1;}
  .profile-avatar-edit{position:absolute; right:-2px; bottom:2px; z-index:2; width:22px; height:22px;
    display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:12px;
    background:var(--panel-wash); border:1px solid var(--panel-border); color:var(--lc-green);}
  .profile-avatar-initial{position:relative;}
  /* Avatar picker grid (body of #avatar-overlay, built by avatar-picker.js) */
  #avatar-panel{display:flex; flex-direction:column; gap:10px;}
  #avatar-panel .av-grid{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px;}
  .av-tile{position:relative; min-width:44px; min-height:64px; display:flex; flex-direction:column;
    align-items:center; gap:4px; padding:6px 2px; border-radius:12px; border:2px solid transparent;
    background:var(--panel-wash); font:inherit; cursor:pointer;}
  .av-tile.selected{border-color:var(--lc-sun-deep);}
  .av-tile[disabled]{opacity:.55; cursor:default;}
  .av-art{position:relative; width:44px; height:44px; border-radius:50%; overflow:hidden;
    background:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-cream)); background-repeat:no-repeat;
    display:flex; align-items:center; justify-content:center;}
  .av-initial{font-size:20px; font-weight:900; color:var(--lc-green);}
  .av-cap{font-size:11px; line-height:1.2; color:var(--ink); text-align:center; overflow-wrap:anywhere;}
  .av-lock{position:absolute; right:-2px; bottom:-2px; font-size:12px;}
  .av-photo{overflow:hidden;}
  .av-file{position:absolute; inset:0; opacity:0; cursor:pointer;}
  .av-hint{font-size:12px; color:var(--muted); line-height:1.4;}
  .av-remove{min-height:44px; border-radius:10px; font:inherit; background:var(--panel-wash);
    border:1px solid var(--panel-border); cursor:pointer;}
```

- [ ] **Step 5: Friend-panel CSS.** Insert after line 1280 (`#friend-panel .fr-row.fr-theirs .fr-theirs{...}`):

```css
  /* Friend invite rework (2026-07-27) */
  #friend-panel .fr-note{font-size:12px; color:var(--muted); line-height:1.4;}
  #friend-panel .fr-qr{display:flex; justify-content:center;}
  /* White always — QR contrast is non-negotiable in any theme. */
  #friend-panel .fr-qr svg{width:min(220px,70vw); height:auto; background:#fff; border-radius:8px;}
  #friend-panel .fr-mycard{display:flex; gap:10px; align-items:center;}
  #friend-panel .fr-mycard-meta{font-weight:700; color:var(--ink); overflow-wrap:anywhere;}
  #friend-panel .fr-avatar{position:relative; flex:none; width:36px; height:36px; border-radius:50%;
    overflow:hidden; background:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-cream));
    display:flex; align-items:center; justify-content:center;}
  #friend-panel .fr-avatar-me{width:44px; height:44px;}
  #friend-panel .fr-avatar-art{position:absolute; inset:0; background-repeat:no-repeat;}
  #friend-panel .fr-avatar-mono{font-weight:900; color:var(--lc-green);}
  #friend-panel .fr-recent-row{display:flex; gap:10px; align-items:center; min-height:44px; width:100%;
    padding:4px 6px; border-radius:10px; border:0; background:none; font:inherit; text-align:left; cursor:pointer;}
  #friend-panel .fr-recent-row:active{background:var(--panel-wash);}
  #friend-panel .fr-recent-name{flex:1; min-width:0; overflow-wrap:anywhere; color:var(--ink); font-weight:700;}
  #friend-panel .fr-fresh{font-size:12px; color:var(--muted);}
  #friend-panel .fr-clear{min-height:44px; border-radius:10px;}
  #friend-panel .fr-compare-head{display:flex; gap:10px; align-items:center;}
  #friend-panel .fr-their-name{font-weight:800; color:var(--ink); overflow-wrap:anywhere;}
```

- [ ] **Step 6: Avatar overlay markup.** Insert after line 2659 (the `</div>` that closes `#friend-overlay`), as a TOP-LEVEL sibling — NOT inside any `.screen` section (the v128 `show()` street→cat-journey rewrite orphaned a nested overlay; that must not recur):

```html
  <!-- Avatar picker: same dialog pattern as #friend-overlay. Body filled by
       createAvatarPicker() in src/ui/avatar-picker.js. Photo stays on-device. -->
  <div class="pause-overlay" id="avatar-overlay" role="dialog" aria-modal="true"
       aria-labelledby="avatar-dialog-title">
    <div class="pause-panel">
      <div class="quest-popup-head">
        <h3 class="pause-title" id="avatar-dialog-title" data-i18n="avatar.title">Profile picture</h3>
        <button class="overlay-close" id="avatar-popup-close" data-i18n-title="common.close" aria-label="Close">×</button>
      </div>
      <div id="avatar-panel"></div>
    </div>
  </div>
```

- [ ] **Step 7: Surface `#go-friend` + retitle the dialog.** (a) Delete the `#go-friend` button line from the collection pane (line 2472). (b) Insert it in the Overview pane, directly after the `.profile-stats` closing `</div>` (line 2457), relabeled:

```html
    <button class="big" id="go-friend" type="button"><span class="icon-text"><svg class="asset-icon"><use href="assets/ui-icons.svg#star"></use></svg><span data-i18n="friend.inviteCta">Invite a friend</span></span></button>
```

(Rationale, evidence-backed: the old location's hidden-ancestor chain was `#go-friend` → `#profile-collection-pane` → `#s-progress` — the invite entry point was invisible until the player found the Collection sub-tab. Overview is the default pane.) (c) Change line 2654:

```html
        <h3 class="pause-title" id="friend-dialog-title" data-i18n="friend.inviteTitle">Invite a friend</h3>
```

- [ ] **Step 8: Run and watch it PASS**

Run: `cd /root/work/HSK/game && npx vitest run test/accessibility-markup.test.js test/i18n-usage.test.js test/sw-precache.test.js`
Expected: all pass (`friend.inviteCta`/`friend.inviteTitle`/`avatar.title` exist since Task 8; index.html growth ~4 KB is inside the budget). Then `npm test` (full, unmasked).

- [ ] **Step 9: Commit** (no `src/` change → no build needed)

```bash
cd /root/work/HSK/game
git add index.html test/accessibility-markup.test.js
git commit -m "feat(ui): avatar overlay + hero button markup/CSS, friend panel styles, surface #go-friend on Overview"
```

---

### Task 10: `src/ui/avatar-picker.js` — DOM controller (untested by design)

**Files:**
- Create: `/root/work/HSK/game/src/ui/avatar-picker.js`

**Interfaces:**
- Consumes: Task 2 (`catAvatarChoices`, `avatarPortraitStyle`, `normalizeAvatar`, `AVATAR_DEFAULT_CAT_ID`), Task 3 (`profileInitial` — existing export), Task 8 i18n keys, Task 9 DOM (`#avatar-overlay`, `#avatar-panel`, `#avatar-popup-close`, `.av-*` classes), Task 1 (`store.remove`).
- Produces (mounted by Task 11):

```js
createAvatarPicker({
  $,              // selector helper from main.js
  openDialog,     // (dialog, initialFocus, onEscape) — main.js focus-trap kit
  closeDialog,    // (dialog) => void
  store,          // createStore instance — profilePhoto key I/O
  toast,          // (msg) => void
  getProfile,     // () => playerProfile ({ displayName, avatar }, normalized)
  setProfile,     // (profile) => void — persists nbhsk.profile + updates main.js playerProfile
  getOwned,       // () => shopState.owned (string[])
  onChanged,      // () => void — main.js renderProfileDashboard()
}) -> { open() }
```

- also exports `PHOTO_DATA_URL_MAX = 98304` (the ≤ 96 K-chars JPEG data-URL cap).

No unit test (DOM controller, untested by design like main.js — every decision it makes is a call into the pure, tested modules). `test/i18n-usage.test.js` picks up its `t("…")` keys automatically via the recursive `src/` walk; that is this task's automated gate.

- [ ] **Step 1: Implementation** — create `/root/work/HSK/game/src/ui/avatar-picker.js`:

```js
// src/ui/avatar-picker.js
// DOM controller for the #avatar-overlay picker: cat grid, photo intake
// pipeline, persistence hand-off. Untested by design (DOM wiring, like
// main.js) — ids/ownership/crops/caps/codecs all live in the pure, tested
// modules (avatar.js, profile.js, storage.js).
//
// Photo privacy: gallery-only file input (NO `capture` attribute -> no
// Android camera permission, no Play Data Safety delta); pixels never leave
// the device (nbhsk.profilePhoto, local-only key).
import { t } from "../i18n.js";
import { catAvatarChoices, avatarPortraitStyle, normalizeAvatar, AVATAR_DEFAULT_CAT_ID } from "../avatar.js";
import { profileInitial } from "../profile.js";
import { CATALOG } from "../shop.js";

// 96 K chars ≈ 72 KB of JPEG. Justification (spec §8): total app footprint
// stays < 700 KB against a 5 MB (10 MB Android WebView) origin quota.
export const PHOTO_DATA_URL_MAX = 98304;

const JPEG_QUALITY_LADDER = [0.82, 0.66, 0.5];

export function createAvatarPicker({
  $, openDialog, closeDialog, store, toast, getProfile, setProfile, getOwned, onChanged,
}) {
  const overlay = $("#avatar-overlay");
  const panel = $("#avatar-panel");
  const closeBtn = $("#avatar-popup-close");

  function close() { closeDialog(overlay); }

  function catLabel(id) {
    if (id === AVATAR_DEFAULT_CAT_ID) return t("avatar.cat.lucky");
    const key = "item." + id;              // skins reuse the shop item names
    const label = t(key);
    if (label !== key) return label;
    const item = CATALOG.find(it => it.id === id);
    return item ? item.name : id;
  }

  function paintArt(art, style) {
    art.style.backgroundImage = `url("${style.image}")`;
    art.style.backgroundSize = `${style.sizePct[0]}% ${style.sizePct[1]}%`;
    art.style.backgroundPosition = `${style.posPct[0]}% ${style.posPct[1]}%`;
  }

  function makeTile({ label, selected, disabled, onPick, fill }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "av-tile" + (selected ? " selected" : "");
    if (disabled) btn.disabled = true;
    const art = document.createElement("span");
    art.className = "av-art";
    fill(art);
    const cap = document.createElement("span");
    cap.className = "av-cap";
    cap.textContent = label;
    btn.appendChild(art);
    btn.appendChild(cap);
    if (onPick && !disabled) btn.onclick = onPick;
    return btn;
  }

  // Selecting monogram/cat frees the photo key (must actually reclaim the
  // ~96 KB — spec §1) and persists via setProfile so main.js's in-memory
  // playerProfile stays coherent.
  function pick(avatar) {
    store.remove("profilePhoto");
    setProfile({ ...getProfile(), avatar: normalizeAvatar(avatar) });
    onChanged();
    close();
  }

  function render() {
    const current = getProfile().avatar;
    panel.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "av-grid";
    grid.appendChild(makeTile({
      label: t("avatar.monogram"),
      selected: current.kind === "monogram",
      fill: art => {
        art.classList.add("av-initial");
        art.textContent = profileInitial(getProfile().displayName) || "•";
      },
      onPick: () => pick({ kind: "monogram" }),
    }));
    for (const { id, locked } of catAvatarChoices(getOwned())) {
      const style = avatarPortraitStyle({ kind: "cat", id });
      grid.appendChild(makeTile({
        label: locked ? t("avatar.locked") : catLabel(id),
        selected: current.kind === "cat" && current.id === id,
        disabled: locked,
        fill: art => {
          paintArt(art, style);
          if (locked) {
            const lock = document.createElement("span");
            lock.className = "av-lock";
            lock.textContent = "🔒";
            art.appendChild(lock);
          }
        },
        onPick: () => pick({ kind: "cat", id }),
      }));
    }
    // Photo tile: a <label> styled like a tile, hosting the hidden file input.
    const photoTile = document.createElement("label");
    photoTile.className = "av-tile av-photo" + (current.kind === "photo" ? " selected" : "");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";              // gallery-only: NO capture attribute (risk R11)
    input.className = "av-file";
    input.setAttribute("aria-label", t("avatar.photo"));
    input.addEventListener("change", onPhotoPicked);
    const photoArt = document.createElement("span");
    photoArt.className = "av-art av-initial";
    photoArt.textContent = "📷";
    const photoCap = document.createElement("span");
    photoCap.className = "av-cap";
    photoCap.textContent = t("avatar.photo");
    photoTile.appendChild(input);
    photoTile.appendChild(photoArt);
    photoTile.appendChild(photoCap);
    grid.appendChild(photoTile);
    panel.appendChild(grid);
    const hint = document.createElement("div");
    hint.className = "av-hint";
    hint.textContent = t("avatar.photoHint");
    panel.appendChild(hint);
    if (current.kind === "photo") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "av-remove";
      removeBtn.textContent = t("avatar.removePhoto");
      removeBtn.onclick = () => pick({ kind: "monogram" });
      panel.appendChild(removeBtn);
    }
  }

  // Decode with EXIF rotation. Primary: createImageBitmap({imageOrientation:
  // "from-image"}); fallback for old WebViews: object-URL + <img> (modern
  // engines default image-orientation: from-image, so EXIF still lands;
  // pre-2020 WebViews may show a rotated crop — accepted, risk R6).
  async function decodePicked(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return { bitmap: await createImageBitmap(file, { imageOrientation: "from-image" }) };
      } catch (e) { /* fall through */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      return { bitmap: img, url };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  async function onPhotoPicked(e) {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = "";                      // re-picking the same file re-fires change
    if (!file) return;
    if (!/^image\//.test(file.type || "")) { toast(t("avatar.photoError")); return; }
    let decoded;
    try { decoded = await decodePicked(file); }
    catch (err) { toast(t("avatar.photoError")); return; }
    const { bitmap, url } = decoded;
    try {
      const w = bitmap.naturalWidth || bitmap.width;
      const h = bitmap.naturalHeight || bitmap.height;
      if (!w || !h) { toast(t("avatar.photoError")); return; }
      // Center-crop to a square, downscale onto a 256x256 canvas (fills the
      // 112px hero circle at 2x DPR; 512 would quadruple bytes for nothing).
      const side = Math.min(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 256, 256);
      // JPEG quality ladder — first result under the cap wins.
      let dataUrl = null;
      for (const q of JPEG_QUALITY_LADDER) {
        const candidate = canvas.toDataURL("image/jpeg", q);
        if (candidate.length <= PHOTO_DATA_URL_MAX) { dataUrl = candidate; break; }
      }
      if (!dataUrl) { toast(t("avatar.photoTooBig")); return; }   // previous avatar untouched
      // Persist photo FIRST with read-back verification — createStore.set
      // swallows QuotaExceededError, so reading back is the only reliable
      // quota signal (spec §8.7). Only then point the profile at it, so
      // profile can never reference a missing photo.
      const prevPhoto = store.get("profilePhoto", null);
      store.set("profilePhoto", dataUrl);
      if (store.get("profilePhoto", "") !== dataUrl) {
        if (prevPhoto != null) store.set("profilePhoto", prevPhoto);
        else store.remove("profilePhoto");
        toast(t("avatar.saveFailed"));
        return;
      }
      setProfile({ ...getProfile(), avatar: { kind: "photo" } });
      onChanged();
      close();
    } finally {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
      if (url) URL.revokeObjectURL(url);
    }
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", ev => { if (ev.target.id === "avatar-overlay") close(); });

  function open() {
    render();
    openDialog(overlay, closeBtn, close);
  }

  return { open };
}
```

- [ ] **Step 2: Gate**

Run: `cd /root/work/HSK/game && npx vitest run test/i18n-usage.test.js` — expect PASS (all `t("avatar.*")` literals resolve in both locales). Then `npm test` (full, unmasked), `npm run lint`, `npm run build` (bundle unchanged — not yet imported; expected).

- [ ] **Step 3: Commit**

```bash
cd /root/work/HSK/game
git add src/ui/avatar-picker.js
git commit -m "feat(ui): avatar-picker DOM controller — cat grid + 8-step photo pipeline"
```

---

### Task 11: main.js touch list (spec §11 + three flagged extensions) + retire old keys

**Files:**
- Modify: `/root/work/HSK/game/src/main.js` (lines 48, ~72 imports; 185–186; 453; 459–475; new mount after 476; 4169–4172; 4219)
- Modify: `/root/work/HSK/game/src/i18n.js` (remove `friend.compareCta` + `friend.title` from BOTH locales — EN lines 507–508, TH lines 1273–1274)

**Interfaces:**
- Consumes: `normalizeProfile` (Task 3), `wireAvatarId`/`avatarPortraitStyle` (Task 2), `epochDay` (Task 4), `createAvatarPicker` (Task 10), i18n keys (Task 8), markup (Task 9).
- Produces (consumed by Task 12's `createFriendCompare`): the dep object now passes `store` (the createStore instance), `getTodayDay: () => epochDay(todayStr())`, `toast` (main.js's toast fn), `setMyName: (name) => void`; `getMyCard()` now returns `{ name, level, streak, mastered, stickers, avatar, day }`.

The failing "test" for this task is behavioral (main.js is untested by design); the automated gates are `i18n-usage.test.js` (key removal + new references) and the full suite. TDD applies at the i18n step below.

- [ ] **Step 1: Imports.** In `/root/work/HSK/game/src/main.js` line 48, add `normalizeProfile` to the profile.js import:

```js
import { defaultProfile, normalizeProfile, normalizeDisplayName, profileInitial, profileStats, bestSessionScore, equippedSummary } from "./profile.js";
```

Find the existing `from "./friend-compare.js"` import (search `friendCardFromHash`) and add `epochDay` to it. Add two new imports next to the other `./ui/` imports (line ~72):

```js
import { wireAvatarId, avatarPortraitStyle } from "./avatar.js";
import { createAvatarPicker } from "./ui/avatar-picker.js";
```

- [ ] **Step 2: Boot normalization (spec §11.1).** Replace lines 185–186

```js
let playerProfile = Object.assign(defaultProfile(), store.get("profile", {}));
playerProfile.displayName = normalizeDisplayName(playerProfile.displayName);
```

with:

```js
let playerProfile = normalizeProfile(store.get("profile", {}));
```

(`defaultProfile` stays imported — it is still used elsewhere; if `npm run lint` reports it unused, remove it from the import list.)

- [ ] **Step 3: Share-sheet title (flagged deviation #1).** Line 453: change `t("friend.title")` → `t("friend.inviteTitle")`:

```js
  try { if(navigator.share){ await navigator.share({ title: t("friend.inviteTitle"), text, url: link }); return; } }
```

- [ ] **Step 4: getMyCard + friendCompare deps (spec §11.2–3 + deviations #2/#3).** Replace the `createFriendCompare({...})` block (lines 459–475) with:

```js
const friendCompare = createFriendCompare({
  $, openDialog, closeDialog, share: shareFriendCard, store, toast,
  getOrigin: () => location.origin + location.pathname,
  getTodayDay: () => epochDay(todayStr()),
  setMyName: (name) => {
    // Same persistence trio as the profile rename form (renderProfileDashboard):
    // spread-update so the avatar survives, store, cloud name, re-render.
    playerProfile = { ...playerProfile, displayName: normalizeDisplayName(name) };
    store.set("profile", playerProfile);
    saveDisplayName(accountUI.session, getLocale(), playerProfile.displayName);
    renderProfileDashboard();
  },
  getMyCard: () => {
    const stats = profileStats({
      levels: D.levels, mastery: masteryStore, stickerState, stickerDefs: STICKER_DEFS,
      shop: shopState, catalog: CATALOG,
    });
    return {
      name: playerProfile.displayName,
      level: levelForXp(xp),
      streak: streakInfo(daily, todayStr(), freezes).streak,
      mastered: stats.masteredWords,
      stickers: stats.earnedStickers,
      avatar: wireAvatarId(playerProfile.avatar, shopState.owned),
      day: epochDay(todayStr()),
    };
  },
});
```

- [ ] **Step 5: Mount the avatar picker (spec §11.4).** Directly after `$("#go-friend").onclick = () => friendCompare.open();` (line 476), add:

```js
// Avatar picker — mounts the #avatar-overlay dialog; all decisions live in
// src/avatar.js, persistence in the store (photo key isolated from profile).
const avatarPicker = createAvatarPicker({
  $, openDialog, closeDialog, store, toast,
  getProfile: () => playerProfile,
  setProfile: (profile) => { playerProfile = profile; store.set("profile", playerProfile); },
  getOwned: () => shopState.owned,
  onChanged: () => renderProfileDashboard(),
});
```

- [ ] **Step 6: Render the hero avatar (spec §11.4).** In `renderProfileDashboard()`, replace lines 4169–4172

```js
  const avatar = $("#profile-avatar");
  const initial = profileInitial(playerProfile.displayName);
  $("#profile-avatar-initial").textContent = initial;
  avatar.classList.toggle("has-initial", !!initial);
```

with:

```js
  const avatar = $("#profile-avatar");
  const initial = profileInitial(playerProfile.displayName);
  $("#profile-avatar-initial").textContent = initial;
  const art = $("#profile-avatar-art");
  let hasArt = false;
  if (playerProfile.avatar.kind === "photo") {
    // Photo kind + missing/empty pixels -> monogram degrade WITHOUT rewriting
    // the stored profile (a transient read glitch must not destroy the choice).
    const dataUrl = store.get("profilePhoto", "");
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
      art.style.backgroundImage = `url("${dataUrl}")`;
      art.style.backgroundSize = "cover";
      art.style.backgroundPosition = "center";
      hasArt = true;
    }
  } else {
    const style = avatarPortraitStyle(playerProfile.avatar);
    if (style) {
      art.style.backgroundImage = `url("${style.image}")`;
      art.style.backgroundSize = `${style.sizePct[0]}% ${style.sizePct[1]}%`;
      art.style.backgroundPosition = `${style.posPct[0]}% ${style.posPct[1]}%`;
      hasArt = true;
    }
  }
  if (!hasArt) art.style.backgroundImage = "";
  avatar.classList.toggle("has-art", hasArt);
  avatar.classList.toggle("has-initial", !!initial);
  avatar.setAttribute("aria-label", t("avatar.change"));
  avatar.onclick = () => avatarPicker.open();
```

- [ ] **Step 7: Fix the rename-wipes-avatar trap (spec §11.5, risk R8).** Line 4219: change

```js
    playerProfile = { displayName: normalizeDisplayName(input.value) };
```

to:

```js
    playerProfile = { ...playerProfile, displayName: normalizeDisplayName(input.value) };
```

- [ ] **Step 8: Retire the dead keys (test-first).** Delete these four lines from `/root/work/HSK/game/src/i18n.js`: EN `"friend.compareCta"` (507) and `"friend.title"` (508); TH `"friend.compareCta"` (1273) and `"friend.title"` (1274). Then:

Run: `cd /root/work/HSK/game && npx vitest run test/i18n.test.js test/i18n-usage.test.js`
Expected: PASS — no reference to either key survives (index.html swapped in Task 9, main.js:453 in Step 3). If this FAILS with a missing-key error, a reference was missed — fix the reference, don't restore the key.

- [ ] **Step 9: Gate + smoke**

```bash
cd /root/work/HSK/game
npm test            # full suite, exit code unmasked
npm run lint
npm run build
```

Quick DOM smoke (old friend-screen still works with the extra deps — it ignores them):

```bash
cd /root/work/HSK/game && npm run serve &   # http://localhost:8000
# open in a browser if available; the scripted probe happens in Task 13
```

- [ ] **Step 10: Commit**

```bash
cd /root/work/HSK/game
git add src/main.js src/i18n.js dist/app.js
git commit -m "feat(main): mount avatar picker, avatar-aware profile boot/render/card, rename keeps avatar (R8)"
```

---

### Task 12: `src/ui/friend-screen.js` rework — invite-first, QR, remembered friends

**Files:**
- Modify: `/root/work/HSK/game/src/ui/friend-screen.js` (full rework; same file, same mount, same escapeHtml discipline)

**Interfaces:**
- Consumes: Task 4 (`encodeFriendCard`, `decodeFriendCard`, `friendShareLink`, `buildFriendCompare(mine, theirs, todayDay)`, `cardAgeDays`), Task 5 (`normalizeRecentFriends`, `rememberFriend`, `clearRecentFriends`), Task 2 (`avatarFromWireId`, `avatarPortraitStyle`), Task 7 (`qrSvgPath`), `profileInitial` from `../profile.js`, `t` from `../i18n.js`, Task 9 CSS classes, and the Task 11 dep object:

```js
createFriendCompare({
  $, openDialog, closeDialog, getMyCard, getOrigin, share,   // existing
  store,          // createStore — nbhsk.friends I/O
  getTodayDay,    // () => epochDay(todayStr())
  toast,          // (msg) => void
  setMyName,      // (name) => void — persists + cloud-saves the display name
}) -> { open(incomingCard?) }    // unchanged external contract
```

- Produces: nothing further (leaf controller). Untested by design; `i18n-usage.test.js` is the automated gate.

- [ ] **Step 1: Rework** — replace the body of `/root/work/HSK/game/src/ui/friend-screen.js` with:

```js
// src/ui/friend-screen.js
// DOM controller for the friend overlay, reframed from "compare" to
// "invite": share-first with QR + plain-language privacy note, paste-a-code,
// remembered friends (last 5, local-only), card freshness. Untested by
// design (DOM wiring) — codec/freshness in friend-compare.js, list rules in
// friend-recent.js, QR in qr.js, avatar resolution in avatar.js.
//
// SECURITY INVARIANTS (spec §9): `theirName` and every stored friend row are
// UNTRUSTED — names reach innerHTML only through escapeHtml (or textContent);
// an avatar id reaches pixels only via avatarFromWireId -> avatarPortraitStyle
// (double allowlist; asset paths are SKIN_PALETTES-derived literals). A raw
// wire string is never concatenated into url(), src, or markup.
import { encodeFriendCard, decodeFriendCard, friendShareLink, buildFriendCompare, cardAgeDays } from "../friend-compare.js";
import { normalizeRecentFriends, rememberFriend, clearRecentFriends } from "../friend-recent.js";
import { avatarFromWireId, avatarPortraitStyle } from "../avatar.js";
import { qrSvgPath } from "../qr.js";
import { profileInitial } from "../profile.js";
import { t } from "../i18n.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

export function createFriendCompare({
  $, openDialog, closeDialog, getMyCard, getOrigin, share, store, getTodayDay, toast, setMyName,
}) {
  const overlay = $("#friend-overlay");
  const panel = $("#friend-panel");
  const closeBtn = $("#friend-popup-close");

  function close() { closeDialog(overlay); }

  // wireId is "" | allowlisted CatId; unknown/photo -> monogram initial as a
  // TEXT NODE (never markup, never an image).
  function avatarChip(wireId, name, sizeClass) {
    const el = document.createElement("span");
    el.className = "fr-avatar" + (sizeClass ? " " + sizeClass : "");
    const style = avatarPortraitStyle(avatarFromWireId(wireId));
    if (style) {
      const art = document.createElement("span");
      art.className = "fr-avatar-art";
      art.style.backgroundImage = `url("${style.image}")`;
      art.style.backgroundSize = `${style.sizePct[0]}% ${style.sizePct[1]}%`;
      art.style.backgroundPosition = `${style.posPct[0]}% ${style.posPct[1]}%`;
      el.appendChild(art);
    } else {
      const mono = document.createElement("span");
      mono.className = "fr-avatar-mono";
      mono.textContent = profileInitial(name) || "🐱";
      el.appendChild(mono);
    }
    return el;
  }

  function freshnessText(card) {
    const age = cardAgeDays(card, getTodayDay());
    if (age === null) return "";
    return age === 0 ? t("friend.asOfToday") : t("friend.asOfDays", { n: age });
  }

  function renderQr(host, link) {
    host.innerHTML = "";
    const qr = qrSvgPath(link);
    if (!qr) {
      // Pathological name pushed the payload past v40-L — share/copy still work.
      const hint = document.createElement("div");
      hint.className = "fr-note";
      hint.textContent = t("friend.qrTooLong");
      host.appendChild(hint);
      return;
    }
    // Built with createElementNS from the two returned values — no innerHTML
    // on this branch. The -4/+8 viewBox IS the mandatory 4-module quiet zone.
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `-4 -4 ${qr.size + 8} ${qr.size + 8}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("friend.qrLabel"));
    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("x", "-4");
    bg.setAttribute("y", "-4");
    bg.setAttribute("width", String(qr.size + 8));
    bg.setAttribute("height", String(qr.size + 8));
    bg.setAttribute("fill", "#fff");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", qr.d);
    path.setAttribute("fill", "#000");
    svg.appendChild(bg);
    svg.appendChild(path);
    host.appendChild(svg);
  }

  function renderRecent(host) {
    const state = normalizeRecentFriends(store.get("friends"));
    host.innerHTML = `<div class="fr-label">${t("friend.recentTitle")}</div>`;
    if (state.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "fr-note";
      empty.textContent = t("friend.recentEmpty");
      host.appendChild(empty);
      return;
    }
    for (const item of state.items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "fr-recent-row";           // whole 44px row is the tap target
      row.appendChild(avatarChip(item.card.avatar, item.card.name, "fr-avatar-row"));
      const name = document.createElement("span");
      name.className = "fr-recent-name";
      name.textContent = item.card.name || t("friend.them");
      const fresh = document.createElement("span");
      fresh.className = "fr-fresh";
      fresh.textContent = freshnessText(item.card);
      row.appendChild(name);
      row.appendChild(fresh);
      row.onclick = () => showCompare(item.card);
      host.appendChild(row);
    }
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "fr-btn fr-clear";
    clear.textContent = t("friend.recentClear");
    clear.onclick = () => {
      store.set("friends", clearRecentFriends());
      renderRecent(host);
      toast(t("friend.recentCleared"));
    };
    host.appendChild(clear);
  }

  // Invite view — the default open() target.
  function wireInviteView() {
    const myCard = getMyCard();
    const code = encodeFriendCard(myCard);
    const needName = !myCard.name;
    panel.innerHTML = `<div class="fr-section">
        <div class="fr-lead">${t("friend.inviteLead")}</div>
        <div class="fr-mycard" id="fr-mycard"></div>
      </div>
      ${needName ? `<div class="fr-section" id="fr-name-section">
        <div class="fr-label">${t("friend.namePrompt")}</div>
        <input id="fr-name-in" class="fr-code" type="text" maxlength="48" autocomplete="nickname"
          aria-label="${t("friend.namePrompt")}">
        <button id="fr-name-save" class="btn-primary fr-btn" type="button">${t("friend.namePromptSave")}</button>
      </div>` : ""}
      <div class="fr-section">
        <div class="fr-label">${t("friend.yourCode")}</div>
        <input id="fr-code" class="fr-code" type="text" readonly value="${escapeHtml(code)}" aria-label="${t("friend.yourCode")}">
        <button id="fr-share" class="btn-primary fr-btn" type="button">${t("friend.share")}</button>
        <div class="fr-label">${t("friend.qrLabel")}</div>
        <div class="fr-qr" id="fr-qr"></div>
        <div class="fr-note">${t("friend.privacyNote")}</div>
      </div>
      <div class="fr-section">
        <div class="fr-label">${t("friend.pasteLabel")}</div>
        <input id="fr-in" class="fr-code" type="text" inputmode="text" autocomplete="off"
          placeholder="${t("friend.pastePlaceholder")}" aria-label="${t("friend.pasteLabel")}">
        <button id="fr-go" class="btn-primary fr-btn" type="button">${t("friend.compareBtn")}</button>
        <div id="fr-result" class="fr-result" role="status" aria-live="polite"></div>
      </div>
      <div class="fr-section" id="fr-recent"></div>`;
    // My-card preview: my avatar arrives as a wire id (photo -> "" -> monogram).
    const mycard = $("#fr-mycard");
    mycard.appendChild(avatarChip(myCard.avatar, myCard.name, "fr-avatar-me"));
    const meta = document.createElement("span");
    meta.className = "fr-mycard-meta";
    meta.textContent = (myCard.name || t("friend.you")) + " · " + t("friend.metric.level") + " " + myCard.level;
    mycard.appendChild(meta);
    renderQr($("#fr-qr"), friendShareLink(getOrigin(), myCard));
    renderRecent($("#fr-recent"));
    if (needName) {
      $("#fr-name-save").onclick = () => {
        const v = ($("#fr-name-in").value || "").trim();
        if (!v) return;
        setMyName(v);
        wireInviteView();      // re-render: card + code + QR now carry the name
      };
      $("#fr-name-in").addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); $("#fr-name-save").click(); }
      });
    }
    const result = $("#fr-result");
    $("#fr-share").onclick = () => {
      const card = getMyCard();
      share(t("friend.shareText"), friendShareLink(getOrigin(), card), encodeFriendCard(card));
    };
    $("#fr-code").onclick = e => e.target.select();
    $("#fr-go").onclick = () => {
      const theirs = decodeFriendCard(($("#fr-in").value || "").trim());
      if (!theirs) { result.textContent = t("friend.invalidCode"); return; }
      showCompare(theirs);
    };
    $("#fr-in").addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); $("#fr-go").click(); }
    });
  }

  function showCompare(theirs) {
    // Remember on every successful decode-and-show (screen policy, spec §9).
    store.set("friends",
      rememberFriend(normalizeRecentFriends(store.get("friends")), theirs, getTodayDay()));
    const cmp = buildFriendCompare(getMyCard(), theirs, getTodayDay());
    const name = escapeHtml(cmp.theirName) || t("friend.them");
    const lead = cmp.lead === "mine" ? t("friend.leadMine")
      : cmp.lead === "theirs" ? t("friend.leadTheirs")
      : t("friend.leadTie");
    const rows = cmp.rows.map(r => `<div class="fr-row fr-${r.winner}">
        <span class="fr-metric">${t("friend.metric." + r.key)}</span>
        <span class="fr-mine">${r.mine.toLocaleString()}</span>
        <span class="fr-theirs">${r.theirs.toLocaleString()}</span>
      </div>`).join("");
    const fresh = cmp.ageDays === null ? ""     // LCH1 card: freshness unknown, show nothing
      : `<div class="fr-fresh">${cmp.ageDays === 0 ? t("friend.asOfToday") : t("friend.asOfDays", { n: cmp.ageDays })}</div>`;
    panel.innerHTML = `<div class="fr-compare-head" id="fr-their-head"></div>
      ${fresh}
      <div class="fr-lead">${lead}</div>
      <div class="fr-row fr-head"><span class="fr-metric"></span>
        <span class="fr-mine">${t("friend.you")}</span><span class="fr-theirs">${name}</span></div>
      ${rows}
      <button id="fr-back" class="fr-btn" type="button">${t("friend.compareAnother")}</button>`;
    const head = $("#fr-their-head");
    head.appendChild(avatarChip(cmp.theirAvatar, cmp.theirName, "fr-avatar-me"));
    const headName = document.createElement("span");
    headName.className = "fr-their-name";
    headName.textContent = cmp.theirName || t("friend.them");
    head.appendChild(headName);
    $("#fr-back").onclick = wireInviteView;
  }

  // open() with no arg -> invite view; open(card) -> straight to compare (deep link).
  function open(incoming) {
    if (incoming) showCompare(incoming); else wireInviteView();
    openDialog(overlay, closeBtn, close);
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", e => { if (e.target.id === "friend-overlay") close(); });

  return { open };
}
```

- [ ] **Step 2: Gate**

```bash
cd /root/work/HSK/game
npx vitest run test/i18n-usage.test.js   # every t("friend.*") literal resolves in both locales
npm test                                  # full suite, exit code unmasked
npm run lint
npm run build                             # bundle now includes qr.js/avatar.js/friend-recent.js
```

- [ ] **Step 3: Commit**

```bash
cd /root/work/HSK/game
git add src/ui/friend-screen.js dist/app.js
git commit -m "feat(friend): invite-first screen — QR, privacy note, name prompt, remembered friends, freshness"
```

---

### Task 13: Final verification (measured gates + real-flow probe)

**Files:**
- Scratch (NOT committed): `/tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/probe-avatar-friend.mjs`, `.../precache-measure.mjs`

**Interfaces:** consumes everything; produces a written verification record in the final commit message / handoff.

- [ ] **Step 1: Full gates, exit codes unmasked**

```bash
cd /root/work/HSK/game
npm test          # expect: 0 failures. Baseline before this feature: 109 files / 9,718 tests — expect ~115 files and a higher count, never lower.
npm run lint
npm run build
```

- [ ] **Step 2: Measured precache check.** Write `/tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/precache-measure.mjs`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const GAME = "/root/work/HSK/game";
const sw = readFileSync(join(GAME, "sw.js"), "utf8");
const arr = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
const files = [...arr[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const total = files.reduce((s, f) => s + readFileSync(join(GAME, f)).byteLength, 0);
const CAP = 11010048, BASELINE = 10946106;
console.log(`precache total: ${total} B of ${CAP} B cap (${CAP - total} B free)`);
console.log(`delta vs pre-feature baseline ${BASELINE}: ${total - BASELINE} B (spec estimate ~24,800)`);
if (total > CAP) { console.error("OVER BUDGET"); process.exit(1); }
```

Run: `node /tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/precache-measure.mjs`
Expected: under cap. **Record the actual delta.** If the delta exceeds ~40 KB (headroom gone), trim `src/qr.js` (mask-penalty duplication first, per spec §12) — never touch the cap constant in `test/sw-precache.test.js`.

- [ ] **Step 3: Responsive sweeps**

```bash
cd /root/work/HSK/game
npm run qa:responsive
npm run qa:responsive:th
```

Expected: both exit 0. Inspect the emitted screenshots for the Profile hero (button + edit badge) and note anomalies.

- [ ] **Step 4: Headless real-flow probe.** Write `/tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/probe-avatar-friend.mjs` (launch pattern copied from `scripts/responsive-sweep.mjs` — playwright-core + cached chromium):

```js
import { chromium } from "playwright-core";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

function launchOpts() {
  const explicit = process.env.PW_CHROMIUM;
  if (explicit) return { executablePath: explicit, headless: true };
  const cached = join(homedir(), ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
  if (existsSync(cached)) return { executablePath: cached, headless: true };
  return { headless: true };
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64");

const server = spawn("node", ["scripts/serve.mjs"], { cwd: "/root/work/HSK/game", stdio: "ignore" });
await new Promise(r => setTimeout(r, 1500));
const failures = [];
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}: ${label}`); if (!ok) failures.push(label); };

try {
  const browser = await chromium.launch(launchOpts());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));

  await page.goto("http://localhost:8000/", { waitUntil: "load" });
  await page.waitForTimeout(1200);

  // -- structural: #avatar-overlay is a top-level position:fixed sibling (v128 lesson)
  const overlayInfo = await page.evaluate(() => {
    const el = document.getElementById("avatar-overlay");
    return {
      parent: el.parentElement.id || el.parentElement.tagName,
      position: getComputedStyle(el).position,
      inScreen: !!el.closest(".screen"),
    };
  });
  check(overlayInfo.position === "fixed", "#avatar-overlay position:fixed");
  check(!overlayInfo.inScreen, "#avatar-overlay NOT nested inside a .screen section");
  console.log("  parent:", overlayInfo.parent);

  // -- Profile: #go-friend visible on the default Overview pane (UX finding)
  await page.click('[data-go="progress"]');
  await page.waitForTimeout(400);
  check(await page.isVisible("#go-friend"), "#go-friend visible on Overview without sub-tab digging");

  // -- pick a cat avatar
  await page.click("#profile-avatar");
  await page.waitForTimeout(300);
  check(await page.isVisible("#avatar-overlay"), "avatar overlay opens");
  await page.click('#avatar-panel .av-tile:nth-child(2)');   // tile 1 = monogram, tile 2 = lucky
  await page.waitForTimeout(300);
  const heroArt = await page.evaluate(() =>
    document.getElementById("profile-avatar-art").style.backgroundImage);
  check(heroArt.includes("cat-happy.png"), "hero shows lucky-cat portrait after pick");
  const storedAvatar = await page.evaluate(() => JSON.parse(localStorage["nbhsk.profile"]).avatar);
  check(storedAvatar.kind === "cat" && storedAvatar.id === "lucky", "profile stores {kind:cat,id:lucky}");

  // -- pick a photo (1x1 PNG -> canvas -> jpeg data URL)
  await page.click("#profile-avatar");
  await page.waitForTimeout(300);
  await page.setInputFiles("#avatar-panel .av-file", {
    name: "probe.png", mimeType: "image/png", buffer: PNG_1x1,
  });
  await page.waitForTimeout(800);
  const photoState = await page.evaluate(() => ({
    kind: JSON.parse(localStorage["nbhsk.profile"]).avatar.kind,
    photo: (JSON.parse(localStorage["nbhsk.profilePhoto"] || '""') || "").slice(0, 22),
  }));
  check(photoState.kind === "photo", "profile switches to photo avatar");
  check(photoState.photo.startsWith("data:image/jpeg"), "nbhsk.profilePhoto holds a jpeg data URL");

  // -- rename AFTER picking an avatar (risk R8: rename must not wipe it)
  await page.click("#profile-edit-name");
  await page.fill("#profile-name-input", "Probe");
  await page.click('#profile-name-form button[type="submit"]');
  await page.waitForTimeout(300);
  const afterRename = await page.evaluate(() => JSON.parse(localStorage["nbhsk.profile"]));
  check(afterRename.displayName === "Probe", "rename saved");
  check(afterRename.avatar && afterRename.avatar.kind === "photo", "R8: rename did NOT wipe the avatar");

  // -- friend invite: QR renders; LCH1 decodes; LCH2 shows avatar + freshness
  await page.click("#go-friend");
  await page.waitForTimeout(400);
  check(await page.isVisible("#fr-qr svg"), "QR svg renders in invite view");
  check(!(await page.isVisible("#fr-name-section")), "no name prompt once a name is set");
  await page.fill("#fr-in", "LCH1|Legacy|5|3|100|4");
  await page.click("#fr-go");
  await page.waitForTimeout(300);
  check(await page.isVisible("#fr-their-head"), "LCH1 code still decodes into a compare");
  check(!(await page.locator(".fr-fresh").count()), "LCH1 card shows no freshness line");
  await page.click("#fr-back");
  await page.waitForTimeout(300);
  const today = await page.evaluate(() =>
    Math.floor(Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z") / 86400000));
  await page.fill("#fr-in", `LCH2|Panda%20Pal|9|30|500|12|panda|${today - 3}`);
  await page.click("#fr-go");
  await page.waitForTimeout(300);
  const theirArt = await page.evaluate(() => {
    const el = document.querySelector("#fr-their-head .fr-avatar-art");
    return el ? el.style.backgroundImage : "";
  });
  check(theirArt.includes("cat-panda-happy.png"), "LCH2 friend avatar renders (allowlisted sheet)");
  const freshText = await page.textContent(".fr-fresh");
  check(/3/.test(freshText), "freshness shows 'as of 3 days ago'");

  // -- remembered friend re-opens
  await page.click("#fr-back");
  await page.waitForTimeout(300);
  const rows = await page.locator(".fr-recent-row").count();
  check(rows >= 2, `remembered friends listed (${rows})`);
  await page.locator(".fr-recent-row").first().click();
  await page.waitForTimeout(300);
  check(await page.isVisible("#fr-their-head"), "tapping a remembered friend re-opens the compare");

  // -- empty-name share prompt. Do NOT localStorage.clear() — a fully fresh
  // install triggers the first-run intro, which owns the home screen and
  // breaks nav clicks. Blank only the profile name instead.
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page2.on("pageerror", e => errors.push("page2: " + e));
  await page2.goto("http://localhost:8000/", { waitUntil: "load" });
  await page2.waitForTimeout(1200);
  await page2.evaluate(() => {
    localStorage.setItem("nbhsk.profile",
      JSON.stringify({ displayName: "", avatar: { kind: "monogram" } }));
  });
  await page2.reload({ waitUntil: "load" });
  await page2.waitForTimeout(1200);
  await page2.click('[data-go="progress"]');
  await page2.click("#go-friend");
  await page2.waitForTimeout(400);
  check(await page2.isVisible("#fr-name-section"), "empty-name profile gets the name prompt at share time");
  await page2.fill("#fr-name-in", "Newbie");
  await page2.click("#fr-name-save");
  await page2.waitForTimeout(300);
  const code = await page2.inputValue("#fr-code");
  check(code.startsWith("LCH2|Newbie|"), "saving the prompt name regenerates the code with the name");

  // -- file:// load (the app must run opened directly from disk)
  const page3 = await browser.newPage();
  const fileErrors = [];
  page3.on("pageerror", e => fileErrors.push(String(e)));
  await page3.goto("file:///root/work/HSK/game/index.html", { waitUntil: "load" });
  await page3.waitForTimeout(1500);
  check(await page3.isVisible("#app"), "file:// load renders the app shell");
  check(fileErrors.length === 0, `file:// zero page errors (${fileErrors.join(" | ")})`);

  check(errors.length === 0, `zero console errors overall (${errors.join(" | ")})`);
  await browser.close();
} finally {
  server.kill();
}
console.log(failures.length ? `\n${failures.length} FAILURES` : "\nALL PROBES PASSED");
process.exit(failures.length ? 1 : 0);
```

Run: `node /tmp/claude-0/-root-work-HSK/3477c698-78ce-4f65-a5e2-8143ea5c1ddd/scratchpad/probe-avatar-friend.mjs`
Expected: `ALL PROBES PASSED`, exit 0. Any FAIL line is a real defect — use superpowers:systematic-debugging before touching code, then re-run the failing task's gates AND this probe.

- [ ] **Step 5: Push the branch (feature branch only — NOT main)**

```bash
cd /root/work/HSK/game
git push -u origin feat/profile-avatar-friend-invite
```

- [ ] **Step 6: Record the verification.** Note in the handoff (parent repo `../HANDOFF.md`, per AGENTS.md): actual precache delta vs the ~24,800 estimate, actual bundle growth, probe results, and the two remaining OWNER-GATED items explicitly out of scope here: (a) on-device QR scan check (iOS Camera + Android Lens, one v7/v8-M card and one v13-L Thai card — spec §3 QA gate), (b) the prod cut (merge to development → main, `CACHE_VERSION` v129→v130 bump in sw.js, R1 mixed-version release note).

---

## Self-review record (spec coverage)

- §0/§1 data model → Tasks 3 (profile/migration), 10 (photo key write-order invariant), 12 (friends key). Local-only: no `SYNC_KEYS` change anywhere (Global Constraints).
- §2 avatar.js → Task 2 (all 8 exports, exact math pinned to `SPRITE_METRICS`).
- §3 qr.js → Tasks 6–7 (policy, capacity table incl. the 2,953 ceiling, structural + vector tests; on-device scan = owner QA gate, Task 13 Step 6).
- §4 friend-recent.js → Task 5.
- §5 codec v2 → Task 4 (incl. LCH1 pinning both directions; `MAX_CARD_DAY` deviation #5).
- §6 profile.js → Task 3.
- §7 migration v6→v7 → Task 3 (entry copied verbatim from the spec).
- §8 avatar-picker → Task 10 (8-step pipeline verbatim, incl. read-back quota recovery and give-up path).
- §9 friend-screen → Task 12 (+ deviations #2/#3); security invariants preserved (escapeHtml/textContent on all name sinks, double-allowlisted avatar pixel path, normalized reads).
- §10 index.html → Task 9 (hero button, top-level overlay, CSS families, QR white always).
- §11 i18n + touch list → Tasks 8 and 11 (retired keys removed with their last reference; every TH line carries `// TH-REVIEW`).
- §12 budget → Task 13 Step 2 (measured, cap untouched).
- §13 test plan → Tasks 1–7 + free-rider guards exercised in Tasks 8–12 gates.
- §14 risks → R1 (Task 4 pins + Task 13 handoff note), R2 (Task 10 + Task 1), R3 (Task 13), R4 (Tasks 6/7/12), R5 (layered art spans, Tasks 9–12), R6 (Task 10 fallback), R7 (Tasks 2/4/5/12), R8 (Task 11 Step 7 + Task 13 probe), R9 (Task 9 Step 6 + Task 13 probe), R10 (Task 8), R11 (Task 10 — no `capture`).
- §15 deferrals honored: no cloud avatar column, no photo on the wire, `remove()` + `"lucky"` implemented as approved extensions.
