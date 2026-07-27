# Profile Avatar + Friend Invite — Code-Level Design Spec

Date: 2026-07-27 · Status: DESIGN (no code yet) · Targets: `development` branch
Product design: APPROVED (owner). This document designs the code only.

Scope recap (approved):

1. Local avatar on the Profile screen — one of the 7 bundled cat portraits, or a
   device-gallery photo downscaled on-canvas and stored device-local. Never uploaded.
2. Friend screen reframed from "compare" to "invite" — share-first, plain-language
   no-personal-data note, real empty state.
3. QR code of the share link.
4. Remembered friends — last 5 compared cards, local-only, dedup, clearable.
5. Card freshness — cards carry the day they were made; UI shows "as of N days ago".
6. Avatar travels on the friend card (art avatars only; photo degrades to monogram).

---

## 0. Verified codebase facts this design rests on

- `nbhsk.profile` today is `{ displayName }` (main.js:185, `src/profile.js` defaultProfile).
- `profile` is **not** in `SYNC_KEYS` (`src/merge.js:15` — BASE_SYNC_KEYS). displayName
  reaches the cloud only via `saveDisplayName` (`src/cloud.js:107`). Nothing changes there.
- The 6 skin ids live in `src/shop.js` CATALOG; `SKIN_PALETTES` (shop.js:52) maps skin
  id → sprite base (`"mooncake-rabbit"` → `sprite: "cat-mooncake"`). The default cat has
  **no** palette entry.
- **The portrait art is sprite SHEETS, not portraits**: every `assets/cat-*-happy.png`
  is 1024×256 = four 256px frames. Content bounding boxes per sheet are in the generated
  `src/sprite-metrics.js` (`SPRITE_METRICS`, frame-relative l/t/r/b; e.g. `cat-happy`
  content is only 99×127 inside its 256px frame while skins fill ~230px). Any avatar
  renderer must crop frame 0 to its content box or the default cat renders tiny and
  every tile shows 4 cats. This is solved below with a pure CSS-crop helper — **no new
  art assets, zero precache growth from art**.
- `assets/cat-happy.png` (18,264 B) is in the sw.js PRECACHE; the 6 skin sheets
  (~200–270 KB each) are runtime-cached on first use. The picker will lazy-load them.
- Precache budget: 10,946,106 bytes used of 11,010,048 (10.5 MiB, enforced by
  `test/sw-precache.test.js`) → **63,942 bytes free**. This feature adds only bundle
  (`dist/app.js`) and `index.html` bytes; see §12.
- `createStore` (`src/storage.js`) has `get`/`set` only; **`set` swallows
  QuotaExceededError silently** — quota failure is undetectable via try/catch at the
  call site. The photo-save recovery in §8 is therefore read-back verification, and
  storage.js gains a `remove(k)` (small approved-plan extension, flagged in §14).
- Dialog pattern: `.pause-overlay`/`.pause-panel` + main.js `openDialog/closeDialog`
  (focus trap, Escape, aria). Top-level overlays get `position:fixed` via the
  `#word-overlay,#friend-overlay,#quest-overlay` rule (index.html:826). `show()`
  rewrites `"street"` → `"cat-journey"` (main.js:1306) — a v128 regression orphaned an
  overlay nested inside a screen; the new avatar overlay is top-level.
- i18n: `STRINGS.en` / `STRINGS.th` in `src/i18n.js`; `test/i18n-usage.test.js`
  statically requires every `data-i18n*` key and every literal `t("…")` key (recursive
  over `src/`, including `src/ui/`) to exist in **both** locales. New TH strings need
  the `// TH-REVIEW` line marker or they never enter the Thai review queue.
- Prod origin used in share links: `location.origin + location.pathname` =
  `https://sarachdatabear-polar.github.io/hsk_game/` (48 chars).
- Epoch-day convention already exists: `dayIndex` in shop.js —
  `Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000)`. Reused for card `day`.

---

## 1. Data model & storage keys

All three keys are **local-only** (never added to `SYNC_KEYS`; the createStore dirty-flag
machinery never sees them).

| Key | Shape | Notes |
| --- | --- | --- |
| `nbhsk.profile` | `{ displayName: string, avatar: Avatar }` | Existing key, gains `avatar`. Migrated v6→v7 (§7). |
| `nbhsk.profilePhoto` | `string` (JPEG data URL, ≤ 98,304 chars) | Own key so a quota failure on the photo can never corrupt `profile`. Removed (not blanked) when the avatar stops being a photo. |
| `nbhsk.friends` | `{ v: 1, items: [{ card: FriendCard, seenDay: number }] }` | New. ≤ 5 items, newest first. |

```
Avatar     = { kind: "monogram" }
           | { kind: "cat", id: CatId }        // CatId ∈ AVATAR_CAT_IDS (§2)
           | { kind: "photo" }                 // pixels live in nbhsk.profilePhoto
FriendCard = { name, level, streak, mastered, stickers,   // existing, ints ≥ 0
               avatar: string,   // wire id: "" | CatId  ("" = monogram/photo/unknown)
               day: number }     // epoch day the card was minted; 0 = unknown (LCH1)
```

Invariant: `profile.avatar.kind === "photo"` ⇒ `nbhsk.profilePhoto` holds a valid data
URL. Enforced by write order (photo first, verified, then profile — §8) and by a
read-time degrade in main.js (photo kind + missing/empty photo key → render monogram;
do NOT rewrite the stored profile, so a transient read glitch can't destroy the choice).

Wire codec v2 (§5): `LCH2|name|level|streak|mastered|stickers|avatar|day`.

---

## 2. `src/avatar.js` — NEW, pure

The single authority on what an avatar value *is*, which ids exist, who owns what, and
how an id becomes pixels. No DOM, storage, Date, network.

Depends on: `SKIN_PALETTES` (`./shop.js`), `SPRITE_METRICS` (`./sprite-metrics.js`).
Imported by: `profile.js`, `friend-compare.js`, `migrations.js`, `ui/avatar-picker.js`,
`ui/friend-screen.js`, `main.js`. (No cycles: avatar.js imports neither profile.js nor
friend-compare.js.)

```js
export const AVATAR_DEFAULT_CAT_ID = "lucky";
// ["lucky", "panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]
// Derived at module load: [AVATAR_DEFAULT_CAT_ID, ...Object.keys(SKIN_PALETTES)].
// "lucky" is a reserved id for the default cat (which has no SKIN_PALETTES entry);
// it resolves to the "cat-happy" sheet explicitly, never through the palette table.
export const AVATAR_CAT_IDS = [...];

// Shape-only normalization. Any input → a valid Avatar:
//   {kind:"cat", id ∈ AVATAR_CAT_IDS} kept; {kind:"photo"} kept (pixels not checked
//   here — that's storage's business); EVERYTHING else (null, garbage, unknown or
//   removed cat id, extra fields) → {kind:"monogram"}. Returns a fresh object.
export function normalizeAvatar(raw)              // -> Avatar

// Ownership: "lucky" is always owned; a skin id is owned iff ownedIds includes it.
// ownedIds is shop.owned (string[]); tolerant of null/garbage.
export function ownsCatAvatar(id, ownedIds)       // -> boolean

// Picker model: all 7 ids in display order with a lock flag.
export function catAvatarChoices(ownedIds)        // -> [{ id, locked: boolean }]

// Sheet resolution — THE id→asset path. "lucky" → "cat-happy"; a skin id →
// SKIN_PALETTES[id].sprite + "-happy" (e.g. "mooncake-rabbit" → "cat-mooncake-happy").
// Never string-munges the id itself. null for monogram/photo/unknown.
export function avatarSheetFor(avatar)            // -> string | null

// Pure CSS crop of frame 0's content box, element-size independent.
// Computes a square crop around SPRITE_METRICS[sheet]'s bbox (side =
// max(bw, bh), centered, clamped to the 256px frame) and converts it to
// percentage background geometry:
//   sizePct  = [102400 / side, 25600 / side]           (1024 & 256 × 100 / side)
//   posPct   = [100·cl / (1024 − side), 100·ct / (256 − side)]   (guard side ≥ 256 → 0)
// where (cl, ct) is the clamped square origin. Both axes divide by the same
// `side`, so sizePct stays 4:1 — the image is scaled uniformly, no distortion.
// Percent background-position is container-size independent, so the same style
// works on a 112px hero circle, a 64px picker tile, and a 36px friend row.
// Returns null for monogram/photo avatars (caller renders initial / data URL).
export function avatarPortraitStyle(avatar)
  // -> { image: "assets/<sheet>.png", sizePct: [x, y], posPct: [x, y] } | null

// Wire encoding for the friend card's avatar field. Owned cat → its id;
// photo/monogram/unowned/unknown → "" (the approved photo→monogram degrade).
export function wireAvatarId(avatar, ownedIds)    // -> "" | CatId

// Wire decoding (UNTRUSTED input). Allowlisted id → {kind:"cat", id}; anything
// else ("", garbage, "javascript:alert(1)", "../x") → {kind:"monogram"}.
// This is the only path a foreign avatar field may take toward pixels.
export function avatarFromWireId(field)           // -> Avatar (never "photo")
```

Deliberately does NOT: touch localStorage, know about data URLs or the photo pipeline,
read `Date`, build DOM, or import profile/friend modules. Ownership is enforced at pick
time and wire-encode time only — a *stored* `{kind:"cat"}` avatar is displayed even if
`shop.owned` were somehow missing the id (ownership is additive and never lapses; the
avatar must not flicker to monogram on a transiently unloaded shop state). A *removed*
id (future catalog change) falls out via the allowlist → monogram.

---

## 3. `src/qr.js` — NEW, pure

Self-contained byte-mode QR encoder → SVG path. No DOM, no deps, no `TextEncoder`
(manual UTF-8, ~10 lines, env-agnostic per repo convention — identical under vitest,
WebView, file://).

```js
// Encode `text` (JS string → UTF-8 bytes → byte-mode segment). Version/ECC per
// the policy below. Returns null when the payload exceeds version 40 capacity.
// modules: Uint8Array(size*size), row-major, 1 = dark. Exported for tests.
export function qrEncode(text)     // -> { version, eccLevel: "L"|"M", size, modules } | null

// qrEncode + one SVG path string ("M3 0h1v1h-1z…", one h/v rect per dark module,
// merged per horizontal run). size = module count (no quiet zone — the UI owns
// the quiet zone, §10). null propagates.
export function qrSvgPath(text)    // -> { size, d } | null
```

**Version/ECC selection policy (decisive):** try ECC **M**; if the smallest fitting
version at M is ≤ 13, use it. Otherwise re-select at ECC **L** (denser payloads trade
correction for scannability — fewer modules beats stronger ECC on a phone screen).
Above version-40-L capacity (2,953 bytes) return null; the UI shows a "share the link
instead" hint (§9). Versions 1–40 supported; the L/M capacity table is 80 small ints.

**Internals** (implementation guidance, all standard): mode indicator 0100 + 8/16-bit
char count, terminator/pad (0xEC/0x11); Reed–Solomon over GF(256) (generator 0x11D),
block interleave per the version/ECC block table (L/M rows only); function patterns
(finder+separators, timing, alignment from the per-version coordinate seed, dark
module); format info BCH(15,5) masked with 0x5412 — **no version-info skip**: versions
≥ 7 need the 18-bit version block, include it; all 8 masks evaluated with the standard
N1–N4 penalties.

**Worst-case payload analysis** (the QR encodes `friendShareLink(origin, card)`):

The link is `origin#f=` + `encodeURIComponent(code)`. The code already percent-encodes
the name, so at the link level each `%` re-escapes to `%25`: **each UTF-8 name byte
costs 5 link chars** (`%25XX`). A Thai codepoint is 3 UTF-8 bytes → **15 link chars**.
Fixed framing: origin 48 + `#f=` 3 + `LCH2` 4 + 7×`%7C` 21 + stat digits ≤ 17 +
avatar id ≤ 15 + day 5 ≈ **113 chars**.

| Case | Name | Link length | QR (policy) |
| --- | --- | --- | --- |
| Typical Latin | 12 ASCII | ~125 B | **v7-M** (45×45) |
| Typical Thai | 10 graphemes ≈ 17 cp | ~368 B | **v13-L** (69×69) |
| Worst realistic Thai | 24 graphemes, ~2.5 cp each (every syllable carrying vowel+tone marks) = 60 cp = 180 UTF-8 B → 900 link chars | **~1,013 B** | **v23-L** (109×109) — dense but decodable at the 220px render in §10 |
| Pathological (24 ZWJ-emoji-family graphemes, ~28 B each — `normalizeDisplayName` counts graphemes, not bytes) | ~672 UTF-8 B → 3,360 link chars | > 2,953 B | **null** → UI fallback hint, share/copy still work |

**Unit testing** (`test/qr.test.js`): (a) *known vectors* — full module matrices for
two payloads (one short ASCII → v1/v2, one Thai string crossing into v13-L), generated
once offline with a trusted reference (nayuki `qrcodegen`) and embedded as ASCII-art
strings; compare cell-by-cell. (b) *structural invariants* for a spread of payload
sizes: `size === 17 + 4·version`, finder/timing patterns in place, format info decodes
(BCH check) to the chosen ECC+mask, version info present ≥ v7. (c) *capacity
boundaries*: a payload of exactly capacity(v, ecc) selects v, +1 byte selects v+1; the
M→L switch at the v13 threshold; null past v40-L. (d) determinism (same input → same
matrix). (e) `qrSvgPath` path rect count equals dark-module run count for a tiny known
matrix. On-device scan check (iOS camera + Android Lens) is a QA gate, not a unit test.

**Size estimate:** byte-mode-only, L/M-only encoder ≈ 450 source lines ≈ **5–6 KB
minified** inside `dist/app.js` (nayuki's full JS encoder minifies to ~5 KB; ours drops
alphanumeric/kanji/ECI and H/Q tables but adds path emission). Within the approved
6–8 KB budget; bundle accounting in §12.

Deliberately does NOT: render SVG elements, choose colors/quiet zones, know about
friend cards or URLs (it encodes an opaque string), or implement decoding.

---

## 4. `src/friend-recent.js` — NEW, pure

Remembered-friends list state machine. No DOM/storage/Date.

Depends on: `normalizeFriendCard` (from `./friend-compare.js`, newly exported §5).

```js
export const RECENT_FRIENDS_LIMIT = 5;

export function defaultRecentFriends()            // -> { v: 1, items: [] }

// Tolerant read-normalizer for the stored value (localStorage is attacker-
// writable on a shared device: every card is re-run through normalizeFriendCard,
// seenDay clamped to int ≥ 0, non-array/garbage → default, length capped at 5).
export function normalizeRecentFriends(raw)       // -> { v: 1, items: [...] }

// Insert card at the FRONT. Dedup key: card.name when non-empty (exact match
// after normalizeFriendCard's grapheme clamp), else the full encoded card —
// re-comparing the same friend updates their stored numbers and bumps them to
// the top instead of duplicating. Cap 5 (oldest drops). Pure: returns new state.
export function rememberFriend(state, card, seenDay)  // -> { v: 1, items: [...] }

export function clearRecentFriends()              // -> defaultRecentFriends()
```

Deliberately does NOT: persist (friend-screen.js does `store.set("friends", …)`),
decide *when* a compare counts as "remembered" (screen policy: every successful
compare), or render.

Tests (`test/friend-recent.test.js`): dedup-by-name updates + moves to front; empty-name
cards dedup by code; cap at 5 drops oldest; normalize survives null / `{}` / arrays of
garbage / oversized stored lists / XSS-bearing names (clamped, not thrown); seenDay
clamping; purity (inputs not mutated).

---

## 5. `src/friend-compare.js` — CHANGED

Codec v2 + freshness. Stays pure. New import: `avatarFromWireId`, `AVATAR_CAT_IDS`
(from `./avatar.js` — used for wire-field validation only).

```js
// card gains avatar ("" | CatId wire string) and day (epoch day int, 0 = unknown).
// ALWAYS emits LCH2 (8 parts): LCH2|name|level|streak|mastered|stickers|avatar|day
export function encodeFriendCard(card)            // -> string

// Dual-decode. Accepts:
//   6 parts + parts[0]==="LCH1"  -> card with avatar: "", day: 0
//   8 parts + parts[0]==="LCH2"  -> full card
// Any other count/prefix combination (incl. LCH1 with 8 parts or LCH2 with 6)
// -> null. Stat fields stay STRICT (non-finite number -> null, unchanged).
// avatar/day are presentational and decode LENIENTLY: avatar not in
// AVATAR_CAT_IDS -> "", day non-numeric/negative -> 0 — a mangled trailing
// field must not throw away an otherwise-valid card.
export function decodeFriendCard(payload)         // -> FriendCard | null

// NEWLY EXPORTED (was private normalizeCard) — friend-recent.js re-normalizes
// stored cards through the exact same rules the codec uses.
export function normalizeFriendCard(card)         // -> FriendCard

// "YYYY-MM-DD" -> days since epoch (same UTC-parse trick as shop.js dayIndex).
// NaN/garbage -> 0. main.js calls epochDay(todayStr()).
export function epochDay(dateStr)                 // -> int ≥ 0

// Freshness with clamping: card.day 0/absent -> null ("unknown", LCH1 cards);
// todayDay falsy -> null; future card (day > todayDay: clock skew between the
// two phones) -> 0, i.e. clamped to "today", never negative; else the age.
export function cardAgeDays(card, todayDay)       // -> null | int ≥ 0

export function friendShareLink(origin, card)     // unchanged (now carries LCH2)
export function friendCardFromHash(hash)          // unchanged

// Signature gains todayDay; result surfaces freshness + their avatar.
export function buildFriendCompare(mine, theirs, todayDay = 0)
// -> { theirName, theirAvatar,   // wire string, ALREADY allowlist-validated by
//                                // normalizeFriendCard ("" when unknown)
//      ageDays,                  // cardAgeDays(theirs, todayDay)
//      rows, lead }              // unchanged shape
```

`normalizeFriendCard` internals: existing name/stat clamps unchanged; `avatar` kept iff
`AVATAR_CAT_IDS.includes(v)` else `""`; `day` = `clampInt`. Encoding writes the avatar
field through the same allowlist check (defense in depth — a hand-built card object
with a bogus avatar encodes as `""`).

Deliberately does NOT: read `Date` (callers pass `todayDay`), resolve avatars to assets
(UI does, via `avatarFromWireId` → `avatarPortraitStyle`), localize, or persist.

Back-compat contract (test-pinned): every LCH1 string valid today decodes to the same
stats with `avatar: ""`, `day: 0`; a v129 peer **cannot** decode LCH2 (its decoder
hard-requires exactly 6 parts) — bounded regression, see §13 R1.

---

## 6. `src/profile.js` — CHANGED

```js
export function defaultProfile()      // -> { displayName: "", avatar: { kind: "monogram" } }

// NEW — one call replaces the Object.assign+normalizeDisplayName dance at
// main.js:185: { displayName: normalizeDisplayName(raw?.displayName),
//                avatar: normalizeAvatar(raw?.avatar) }. Tolerant of any input.
export function normalizeProfile(raw) // -> { displayName, avatar }
```

New import: `normalizeAvatar` from `./avatar.js`. Everything else
(`normalizeDisplayName`, `profileInitial`, `profileStats`, `bestSessionScore`,
`equippedSummary`) is untouched.

Deliberately stays OUT of profile.js: the photo data URL (separate key, never passes
through profile), asset resolution, ownership, wire encoding — all avatar.js. The
profile remains "the player's chosen name + chosen avatar value", nothing derived.

⚠️ **Wiring trap (must fix in main.js):** the name form submit at main.js:4219 rebuilds
the profile as `{ displayName: … }` — with an avatar field present this now **wipes the
avatar on every rename**. It must become
`playerProfile = { ...playerProfile, displayName: normalizeDisplayName(input.value) }`.
Called out again in §11 and §13 R8.

---

## 7. `src/migrations.js` — CHANGED (v6 → v7)

`CURRENT_SCHEMA_VERSION` 6 → 7. New import: `normalizeAvatar` from `./avatar.js`
(precedent: the v6 entry imports `normalizeCatJourney` as its single migration
contract). Appended ladder entry:

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

`nbhsk.profilePhoto` / `nbhsk.friends` need no ladder entries (new keys, read-side
normalized). `assertSortedLadder` passes (7 > 6). Per the v1→v2 lesson the entry pins
no live constants beyond `normalizeAvatar`, whose unknown→monogram rule is
forward-safe if `AVATAR_CAT_IDS` ever grows.

Tests (extend `test/migrations.test.js`): absent profile → untouched + stamped 7;
name-only profile → gains monogram avatar, name byte-identical; corrupt JSON → no-op,
version still advances; re-run idempotence; a profile already carrying
`{kind:"cat",id:"panda"}` survives; garbage avatar → monogram.

---

## 8. `src/ui/avatar-picker.js` — NEW, DOM controller (untested by design)

Owns the `#avatar-overlay` dialog: cat grid, photo intake pipeline, persistence
hand-off. Logic-free where possible — every decision it makes is a call into avatar.js.

```js
import { t } from "../i18n.js";
export function createAvatarPicker({
  $, openDialog, closeDialog,     // main.js dialog kit (focus trap, Escape, aria)
  store,                          // createStore instance (profilePhoto key I/O)
  toast,                          // main.js toast()
  getProfile,                     // () => playerProfile (normalized)
  setProfile,                     // (profile) => persists nbhsk.profile + updates main.js's playerProfile
  getOwned,                       // () => shopState.owned
  onChanged,                      // () => renderProfileDashboard()
}) // -> { open() }
```

**Render (each `open()`):** panel = current-choice preview + grid from
`catAvatarChoices(getOwned())`: 1 monogram tile (shows `profileInitial` styling), 7 cat
tiles (background via `avatarPortraitStyle`; `locked` tiles disabled with a lock glyph
+ `avatar.locked` label), 1 photo tile wrapping
`<input type="file" accept="image/*">` — **gallery-only: no `capture` attribute**, so
no Android camera permission and no Play Data Safety delta — plus, when the current
avatar is a photo, a "Remove photo" row. `avatar.photoHint` ("stays on this device")
sits under the photo tile. Selecting monogram/cat: `store.remove("profilePhoto")`,
`setProfile({ ...getProfile(), avatar })`, `onChanged()`, close.

**Photo pipeline — precise steps:**

1. `change` fires with `input.files[0]`. Guard: no file → return; `file.type` not
   `image/*` → `toast(t("avatar.photoError"))`, return. Reset `input.value` so
   re-picking the same file re-fires.
2. **Decode**: `createImageBitmap(file, { imageOrientation: "from-image" })` (EXIF
   rotation applied). Fallback when unavailable/rejecting (old WebView):
   `URL.createObjectURL(file)` + `Image` + load event (modern engines default
   `image-orientation: from-image`, so EXIF still lands; pre-2020 WebViews may show a
   rotated crop — accepted, §13 R6). Decode failure → `toast(avatar.photoError)`.
3. **Center-crop**: `side = min(naturalWidth, naturalHeight)`,
   `sx = (w − side)/2`, `sy = (h − side)/2`.
4. **Canvas**: draw the crop into a 256×256 canvas
   (`imageSmoothingEnabled = true`, `imageSmoothingQuality = "high"`). 256px fills the
   112px hero circle at 2× DPR — retina-sharp; 512 would quadruple the bytes for
   nothing this UI ever shows.
5. **Encode ladder**: `canvas.toDataURL("image/jpeg", q)` for `q` of
   **0.82 → 0.66 → 0.5**, accepting the first result with
   `length ≤ PHOTO_DATA_URL_MAX = 98,304` (96 K chars ≈ 72 KB of JPEG). JPEG (not
   PNG/WebP): photos, universal encoder, predictable size. A typical 256² photo at
   q0.82 is 12–25 KB base64; the ladder exists for confetti-noise worst cases.
6. **Give-up path**: all three qualities over the cap (physically requires >12
   bits/pixel at q0.5 — near-impossible, but the guard is cheap) →
   `toast(t("avatar.photoTooBig"))`; previous avatar untouched; close nothing.
7. **Persist + QuotaExceededError recovery** — write order is the invariant from §1:
   a. `prevPhoto = store.get("profilePhoto", null)`.
   b. `store.set("profilePhoto", dataUrl)`.
   c. **Read-back verify**: `store.get("profilePhoto", "") === dataUrl`. This is the
      only reliable quota signal — `createStore.set` swallows the QuotaExceededError.
   d. Verify fails → restore (`prevPhoto != null ? store.set("profilePhoto", prevPhoto)
      : store.remove("profilePhoto")`), `toast(t("avatar.saveFailed"))`, stop. The
      profile was not yet touched, so the previous avatar (photo or otherwise) is
      fully intact — nothing dangles.
   e. Verify passes → `setProfile({ ...getProfile(), avatar: { kind: "photo" } })`,
      `onChanged()`, close overlay.
8. Cleanup: `bitmap.close?.()` / `URL.revokeObjectURL` in a `finally`.

**Size-cap justification (96 K chars):** realistic localStorage pressure — mastery for
~6,347 words at ~55 B/entry ≈ 350–400 KB, plus shop/street/journey/quests/errlog
≈ 150 KB, plus this photo ≤ 96 KB → total < 700 KB against the 5 MB (typically 10 MB on
Android WebView) origin quota: ~7× headroom even on a conservative 5 MB browser, while
96 KB comfortably fits any real q0.5 256² JPEG. A single-key write of 96 KB is also
safely under per-item limits everywhere the app ships.

Deliberately does NOT: normalize/validate avatar values (avatar.js), write
`nbhsk.profile` directly (goes through `setProfile` so main.js's in-memory
`playerProfile` and the cloud-name path stay coherent), upload anything, request camera.

---

## 9. `src/ui/friend-screen.js` — CHANGED, DOM controller

Same file, same mount, same escapeHtml discipline. Reframed around inviting.

```js
export function createFriendCompare({
  $, openDialog, closeDialog, getMyCard, getOrigin, share,   // existing
  store,                        // NEW — nbhsk.friends I/O
  getTodayDay,                  // NEW — () => epochDay(todayStr()), passed by main.js
}) // -> { open(incomingCard?) }   (unchanged external contract)
```

**Invite view** (replaces the share view; the default `open()` target):

1. Lead: `friend.inviteLead` + my-card preview — my avatar (main.js's `getMyCard()` now
   carries my wire avatar id; render via `avatarFromWireId` → `avatarPortraitStyle`;
   photo avatars arrive as `""` → monogram initial), my name, my level.
2. Primary action: share button (`friend.share`, existing `share()` fallback chain:
   navigator.share → clipboard+toast → select).
3. **QR**: `qrSvgPath(friendShareLink(getOrigin(), getMyCard()))` rendered inline as
   `<svg viewBox="-4 -4 ${size+8} ${size+8}" shape-rendering="crispEdges">` — white
   `<rect>` + one `<path>`; the −4/+8 viewBox IS the mandatory 4-module quiet zone.
   Built with `document.createElementNS` from the two returned numbers/strings — no
   innerHTML on this branch at all. `null` result (§3 pathological names) → swap in
   `friend.qrTooLong` hint; share/copy unaffected.
4. **Privacy note** `friend.privacyNote` — plain language, always visible.
5. Readonly code input + paste-a-code section (existing behavior, unchanged ids).
6. **Remembered friends**: `normalizeRecentFriends(store.get("friends"))`. Empty →
   `friend.recentEmpty` (the real empty state). Rows (min-height 44px, whole row is the
   button): friend avatar (validated as below), name (escapeHtml), freshness via
   `cardAgeDays(item.card, getTodayDay())` → `friend.asOfToday` / `friend.asOfDays`.
   Tap → `showCompare(item.card)` (cards are re-normalized by `normalizeRecentFriends`;
   compare re-derives everything). "Clear list" button →
   `store.set("friends", clearRecentFriends())`, re-render, `toast(friend.recentCleared)`.

**Compare view** (`showCompare(theirs)`):

- Table/lead rows unchanged; header gains their avatar chip; a freshness line under
  the name: `ageDays === null` → nothing (LCH1 card), `0` → `friend.asOfToday`,
  `n` → `friend.asOfDays {n}`.
- On every successful decode-and-show:
  `store.set("friends", rememberFriend(normalizeRecentFriends(store.get("friends")), theirs, getTodayDay()))`.
- Invalid pasted code → existing `friend.invalidCode` message (this exact string is
  what a stale v129 client shows for an LCH2 code — §13 R1).

**Security invariants (preserved + extended, test-pinned where pure):**

- `theirName` remains untrusted → every innerHTML sink goes through `escapeHtml`
  (existing pattern, incl. recent rows and the compare header).
- **The avatar id never reaches an image source unvalidated**: the only pixel path is
  `card.avatar` (already allowlisted by `normalizeFriendCard`) → `avatarFromWireId`
  (allowlist again) → `avatarPortraitStyle` (returns only
  `"assets/" + SKIN_PALETTES-derived sheet + ".png"` literals). A raw wire string is
  never concatenated into `url()`, `src`, or markup. Unknown → monogram element (text
  node, escaped initial / neutral icon), no image at all.
- `nbhsk.friends` is treated as untrusted at read (normalize clamps every field) —
  a tampered localStorage row cannot inject markup or a non-allowlisted asset path.
- Numbers render via `toLocaleString()` on normalized ints, as today.

Deliberately does NOT: dedup/cap logic (friend-recent.js), codec/freshness math
(friend-compare.js), QR bit-twiddling (qr.js), or any Date math (`getTodayDay` dep).

---

## 10. `index.html` — markup + CSS

**Profile hero** (inside `#s-progress`): the avatar becomes a real button —

```html
<button type="button" class="profile-avatar" id="profile-avatar">
  <span class="profile-avatar-art" id="profile-avatar-art" aria-hidden="true"></span>
  <span class="profile-avatar-initial" id="profile-avatar-initial" aria-hidden="true"></span>
  <svg class="profile-avatar-fallback" aria-hidden="true">…existing person icon…</svg>
  <span class="profile-avatar-edit" aria-hidden="true">✎</span>
</button>
```

`#profile-avatar-art` carries `background-image` (photo data URL or sprite sheet with
`background-size: X% Y%; background-position: X% Y%` from `avatarPortraitStyle`) and
`background-repeat: no-repeat`. Layering = built-in degrade: if the sheet isn't cached
offline, the background silently doesn't paint and the initial/person icon behind it
shows. main.js sets `aria-label = t("avatar.change")` and toggles `has-initial` /
`has-art` classes. The circle is 112px (88px @380px) — far over the 44px tap minimum;
button gets an explicit `cursor:pointer` + focus ring consistent with `.profile-edit`.

**Avatar overlay** — TOP-LEVEL sibling of `#friend-overlay` (NOT inside `#s-progress`;
the v128 `show()`-rewrite orphaning is exactly what nesting risks), same dialog markup
family so `accessibility-markup.test.js`'s modal contract holds:

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

**CSS changes:**

- Line 826 rule becomes
  `#word-overlay,#friend-overlay,#quest-overlay,#avatar-overlay{position:fixed; inset:0;}`.
- `.profile-avatar-art{position:absolute; inset:0; border-radius:50%; background-repeat:no-repeat;}`
  (`.profile-avatar` gains `position:relative`); `.profile-avatar-edit` — 22px badge,
  bottom-right, `background:var(--panel-wash); border:1px solid var(--panel-border)`.
- Avatar grid: `#avatar-panel .av-grid{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px;}`;
  `.av-tile{min-width:44px; min-height:64px; …}` — 64px circles + 11px label below,
  every tile a `<button>`; `.av-tile[disabled]` dims + lock glyph;
  `.av-tile.selected` gets the `--lc-sun-deep` ring. Photo tile hosts the visually-
  hidden file input (`.av-file{position:absolute; opacity:0; inset:0;}` inside a
  `<label>` sized like a tile). All JS-toggled bits use `hidden` + the repo's required
  `[hidden]{display:none}` override where a class sets display.
- Friend panel additions: `.fr-note{font-size:12px; color:var(--muted); line-height:1.4;}`;
  `.fr-qr{display:flex; justify-content:center;} .fr-qr svg{width:min(220px,70vw); height:auto; background:#fff; border-radius:8px;}`
  (white always — QR contrast is non-negotiable in any theme); `.fr-mycard` chip row;
  `.fr-recent-row{display:flex; gap:10px; align-items:center; min-height:44px; width:100%;}`
  as buttons; `.fr-recent-avatar{width:36px; height:36px; border-radius:50%; position:relative;}`
  (row, not the 36px art, is the tap target); `.fr-fresh{font-size:12px; color:var(--muted);}`;
  `.fr-clear` reuses `.fr-btn` (44px).
- Estimated additions: ~55 lines CSS + ~20 lines markup ≈ **3.5–4 KB** on index.html
  (precached — counted in §12).

The profile "Compare with a friend" button (index.html:2472) re-labels via key change
to `friend.inviteCta` (§11); id `#go-friend` and wiring unchanged.

---

## 11. `src/i18n.js` — new key families (EN + TH, `// TH-REVIEW` markers)

New family `avatar.*`; additions + retitles under `friend.*`. Retired keys
(`friend.compareCta`, `friend.title`) are **removed** in the same commit that swaps the
markup (i18n-usage runs both directions off actual references, so dead keys are just
noise). All TH lines below (and the two *changed* TH values) carry `// TH-REVIEW` —
this is the machine-readable marker that feeds the Thai review queue (v127 lesson).

```js
// EN
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
"avatar.cat.lucky": "Lucky Cat",        // skins reuse existing t("item."+id) names

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
```

```js
// TH — every line marked, per the Thai style guide (v1)
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
```

Markup swaps: `#friend-dialog-title` → `data-i18n="friend.inviteTitle"`; the `#go-friend`
span → `data-i18n="friend.inviteCta"`. `friend.shareText`, `friend.invalidCode`, the
metric labels, etc. stay as-is.

## main.js touch list (existing-feature wiring only — no new feature logic)

1. `:185` — `playerProfile = normalizeProfile(store.get("profile", {}))` (drop the
   manual assign+normalize pair).
2. `:462 getMyCard()` — add `avatar: wireAvatarId(playerProfile.avatar, shopState.owned)`
   and `day: epochDay(todayStr())`.
3. `:459 createFriendCompare({...})` — pass `store` and
   `getTodayDay: () => epochDay(todayStr())`.
4. Mount `createAvatarPicker({...})` once beside the other UI mounts; in
   `renderProfileDashboard()` render the art span (photo data URL from
   `store.get("profilePhoto","")` when kind==="photo" — empty/missing → monogram
   degrade without rewriting the profile; else `avatarPortraitStyle`), set
   `has-art`/`has-initial`, `aria-label = t("avatar.change")`, and
   `$("#profile-avatar").onclick = () => avatarPicker.open()`.
5. `:4219` — **fix the rename-wipes-avatar trap**: spread the existing profile
   (`{ ...playerProfile, displayName: … }`) before `store.set`/`saveDisplayName`.

---

## 12. Bundle / precache budget

Free headroom today: **63,942 bytes** (10,946,106 used / 11,010,048 cap; both re-verified
against sw.js + `test/sw-precache.test.js` on 2026-07-27). Only two precached files
change; **no assets are added to PRECACHE** (skin sheets stay runtime-cached).

| Item | Est. minified bytes |
| --- | --- |
| `src/qr.js` | 5,800 |
| `src/avatar.js` | 1,500 |
| `src/friend-recent.js` | 800 |
| `src/friend-compare.js` delta | 700 |
| `src/ui/avatar-picker.js` | 3,500 |
| `src/ui/friend-screen.js` delta | 3,000 |
| i18n strings (≈23 keys × 2 locales, Thai is 3 B/char) | 4,500 |
| profile/migrations/storage/main deltas | 1,000 |
| **dist/app.js growth** | **≈ 20,800** |
| index.html markup + CSS | ≈ 4,000 |
| **Total precache growth** | **≈ 24,800 (~39 KB headroom remains)** |

Gate: after `npm run build`, the existing budget test fails loudly if the estimate is
wrong. If qr.js lands fat (> 8 KB), trim mask-penalty duplication before touching the
budget constant — the 10.5 MiB cap is not to be bumped for this feature. Ship bump:
`CACHE_VERSION` v129 → v130 in sw.js (both changed files are precached).

---

## 13. Test plan

New/extended files, headline cases:

- **`test/avatar.test.js`** (new): AVATAR_CAT_IDS = lucky + exactly the 6 SKIN_PALETTES
  keys (derivation-pinned so a new shop skin auto-appears); normalizeAvatar — valid
  cat/photo/monogram round-trip, unknown id → monogram, `"cat-boss"`/casing/garbage/
  null/arrays → monogram, fresh object (no aliasing); ownsCatAvatar — lucky always,
  skins by owned list, garbage owned; catAvatarChoices lock flags; avatarSheetFor —
  `mooncake-rabbit → cat-mooncake-happy` via SKIN_PALETTES (the id is never munged),
  lucky → cat-happy, monogram/photo → null; avatarPortraitStyle — square-crop math for
  the extreme sheets (`cat-happy` 99×127 box; `beach` 237-wide box), sizePct always
  4:1 ratio, side≥256 guard, null for monogram/photo; wireAvatarId — photo → ""
  (approved degrade), unowned cat → "", owned cat → id; avatarFromWireId — allowlist,
  `"javascript:x"`/`"../../x"`/`"%2e%2e"` → monogram, never returns kind "photo".
- **`test/qr.test.js`** (new): as specified in §3 (known vectors, structural
  invariants, capacity boundaries incl. the v13 M→L switch, v40 null, determinism,
  SVG path/rect agreement).
- **`test/friend-recent.test.js`** (new): §4 list.
- **`test/friend-compare.test.js`** (extend): **LCH1 back-compat block** — every
  pre-existing LCH1 fixture still decodes byte-identically in stats with
  `avatar: ""`/`day: 0`; an LCH1-prefixed 8-part string → null; LCH2-prefixed 6-part →
  null; LCH2 round-trip incl. Thai/emoji names + avatar + day; **security** — avatar
  field `"<img src=x onerror=x>"`, `"panda; DROP"`, `"cat-happy"` (an asset name, not
  an id) all decode to `""` while the card stays valid; day `"-5"`/`"1e99"`/`"NaN"` → 0
  with card valid; stat garbage still rejects the whole card (unchanged strictness);
  epochDay UTC math + garbage → 0; cardAgeDays — unknown day → null, future → 0,
  normal ages; buildFriendCompare surfaces theirAvatar/ageDays and old 2-arg calls
  still work (`todayDay` defaults).
- **`test/profile.test.js`** (extend): defaultProfile carries monogram;
  normalizeProfile on legacy `{displayName}` rows, garbage, and avatar-carrying rows.
- **`test/migrations.test.js`** (extend): §7 list + ladder-sorted assert still passes
  with `to: 7`.
- **`test/storage.test.js`** (extend): `remove(k)` deletes namespaced key, swallows
  storage throw, never touches sync meta.
- **Existing guards that pick the feature up for free**: `i18n.test.js` (EN/TH parity),
  `i18n-usage.test.js` (every new `data-i18n`/`t("…")` key resolves in both locales —
  including from `src/ui/avatar-picker.js` via its recursive walk),
  `accessibility-markup.test.js` (new overlay's role/aria/hidden-override/focus-trap
  contract), `sw-precache.test.js` (budget + index.html asset refs).
- DOM controllers (`ui/avatar-picker.js`, `ui/friend-screen.js`) stay untested by
  design, like main.js — which is exactly why §8's pipeline keeps every decision
  (ids, crops, caps, codec) inside the pure, tested modules.

---

## 14. Risk register

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | **Bounded regression: a v129 client rejects LCH2.** Its `decodeFriendCard` hard-requires exactly 6 parts, so a new code/link pasted into an un-updated install fails into the existing localized `friend.invalidCode` ("That code doesn't look right. Ask for a fresh one.") — graceful, but confusing across mixed versions. | Accepted and bounded: failure mode is a friendly message, not a crash; PWA clients self-update on next online launch (SHELL bump forces it); the deep-link path fails the same soft way. Dual-emitting LCH1 would forfeit avatar+day entirely — rejected. Release note tells Jordan to expect ~days of mixed-version window. Test-pinned both directions (§13). |
| R2 | **localStorage quota** — a 96 KB photo write fails silently (createStore swallows the exception), corrupting the avatar state. | Photo isolated in its own key (approved); write order photo→verify→profile so `profile` can never point at a missing photo; read-back verification is the quota detector (§8.7); failure restores the previous photo byte-for-byte and toasts; display path additionally degrades photo-without-pixels to monogram without rewriting state. Cap (96 K chars) justified against ~700 KB total app footprint vs 5 MB quota. |
| R3 | **Precache budget** (63,942 B free, hard-gated by test). | Zero new precached assets; growth is bundle+html only, estimated 24.8 KB (§12) with a ~39 KB margin; the existing test fails the build if wrong; qr.js has an explicit trim-first, never-bump-the-cap rule. |
| R4 | **QR unscannable** for long Thai names (v23-L worst realistic) or unencodable for pathological emoji names (> v40). | Version/ECC policy tuned for density (§3); 220px white-on-white render with proper quiet zone (§10); encoder returns null past v40 and the UI degrades to `friend.qrTooLong` with share/copy intact; on-device scan QA gate on both a v7-M and a v23-L card. |
| R5 | **Offline/uncached skin sheets** — picker tiles and friend avatars may have no pixels on a fresh offline launch (skins are runtime-cached). | Layered rendering: art is a background span over the monogram/initial, so a missing sheet silently shows the fallback (no broken-image icon); tiles keep their text labels; `cat-happy` (default cat) is already precached so the most common portrait always renders. |
| R6 | **EXIF rotation** on the photo path in old WebViews (no `createImageBitmap` orientation support). | Primary path uses `imageOrientation:"from-image"`; fallback relies on default `image-orientation` CSS behavior (Chrome 81+/WebView 81+, i.e. every Capacitor target we ship); residual risk is a rotated crop on pre-2020 browsers — cosmetic, user retries or picks a cat. |
| R7 | **Untrusted input reaching DOM/asset paths** (pasted codes, deep links, tampered `nbhsk.friends`). | Double allowlisting (codec + avatarFromWireId) before any pixel path; asset names only ever come from SKIN_PALETTES-derived literals; escapeHtml on every name sink incl. recent rows; stored friends re-normalized at read; all pure layers security-tested (§13). |
| R8 | **Rename wipes avatar** — the existing name-form submit rebuilds the profile object from scratch (main.js:4219). | Explicit touch-list item (§11.5) + migration/normalize keep the field; add a manual QA step: rename after picking an avatar. |
| R9 | **Overlay orphaned by `show()`'s street→cat-journey rewrite** (v128 lesson). | `#avatar-overlay` is a top-level sibling in the `position:fixed` rule (§10); nothing new nests inside a screen section. |
| R10 | **Thai strings skip review** (v127 failure) / key drift. | Every new/changed TH line carries `// TH-REVIEW` (§11); i18n parity + usage tests hard-fail on missing keys; retired keys removed, not stranded. |
| R11 | **Play Data Safety / permissions drift.** | File input is `accept="image/*"` with **no `capture`** — gallery picker only, no camera permission, no new data collection (photo never leaves the device; privacy note says so in-product). No manifest change ⇒ no Data Safety form change. |

---

## 15. Deferrals & deviations from the approved decisions

- **Deferral — cross-device avatar:** would need a `profiles.avatar` column (prod DB
  gate). Out of scope, per approval. The local design is forward-compatible: the wire
  id ("lucky"/skin id) is exactly what a future `profiles.avatar` text column would
  store, and `avatarFromWireId` is the shared validator.
- **Deferral — photo on the shared card:** photos degrade to monogram on the wire by
  design (`wireAvatarId`); revisit only if a server-side card ever exists.
- **Deviation (small, flagged): `storage.js` gains `remove(k)`.** The approved list
  didn't mention it, but "stop being a photo" must actually free the ~96 KB key, and
  feature code may not touch localStorage directly (AGENTS.md). Three lines + tests.
- **Addition (small, flagged): reserved id `"lucky"`.** The approved codec says
  "avatar carries an allowlisted skin id", but the default cat is one of the 7 approved
  portraits and has no skin id — without a reserved id, default-cat players could never
  send their avatar. `"lucky"` is allowlisted alongside the 6 SKIN_PALETTES keys and
  resolves to the already-precached `cat-happy` sheet.
- **Finding (design consequence, not a change): the "portraits" are 4-frame sprite
  sheets** (1024×256) with wildly different content boxes. Rendering uses the pure
  `avatarPortraitStyle` CSS crop (§2) instead of `<img>` tags or new portrait assets —
  zero art-budget cost; the helper is fully unit-tested against `SPRITE_METRICS`.
- **Nothing in the approved design was found unbuildable.** The only approved wording
  that needed interpretation is the QuotaExceededError recovery: `createStore.set`
  swallows the exception, so recovery is specified as read-back verification (§8.7)
  rather than a catch block.
