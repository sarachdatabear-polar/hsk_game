# PRD v5 Phase 1 — A0 Style Tokens + A1 Full Theme Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the reference sheet into an enforceable style bible (STYLE-TOKENS.md + CSS custom properties + per-screen checklist) and migrate every remaining screen in `index.html` off the legacy dark-red/gold arcade theme and the interim `--edu-*` palette onto the PRD v5 reference palette.

**Architecture:** All UI CSS lives inline in `index.html` (lines 10–492). Three palettes currently coexist in `:root`: legacy arcade (`--lc-lacquer/--lc-gold/...`), interim education (`--edu-*`), and the v5 reference palette (`--lc-green/--lc-sun/...`, added by Visual Slice v1, already used by Home + Battle). This plan (1) documents the v5 palette + derived shades as the single style bible, (2) re-points the semantic aliases (`--bg/--ink/--muted/--panel*/--chip*`) at v5 tokens, (3) rewrites every rule that still references legacy/edu tokens or raw legacy hex, screen group by screen group, and (4) deletes the two dead palettes and locks it all in with a vitest lint that fails if any forbidden token/hex ever reappears.

**Tech Stack:** Vanilla JS + inline CSS, vitest, esbuild. No new npm dependencies.

**Source spec:** `docs/prd/PRD-v5-visual-retention.md` §4 A0 + A1. (Note: the PRD writes paths as `game/docs/...`; this repo root IS the game, so real paths are `docs/...`, `assets/...`, `src/...`.)

## Global Constraints

- Vanilla JS + esbuild; **no new npm dependencies**; no framework.
- `file://` must keep working — no new `fetch()` of bundled data.
- `localStorage` keys namespaced `nbhsk.*`; this plan touches none.
- All CSS references tokens, never raw hex (PRD A0 deliverable 2). Exception documented in STYLE-TOKENS.md: `rgba()` shadow/wash values derived from ink `46,42,36` or cream `251,245,232`.
- Art guardrails: warm, education-first; never gambling visual language (no glows/jackpot framing — relevant to `#r-perfect` restyle).
- Keep all `--f-ui-*` border-image frame vars and `:root.has-ui-*` override rules exactly as they are (extracted-SVG frame system).
- Keep every DOM id and class name unchanged (tests + main.js wiring depend on them).
- `sw.js` `SHELL` bump exactly once, in the final task (v23 → v24).
- Commit format: `feat(theme): ...` / `docs: ...`; branch `feat/v5-phase1-theme` off `development`.

## Verified code facts (do not re-derive)

- `index.html` is 755 lines; CSS block is lines 10–492. All legacy/edu usages are in this file only, **except** `src/main.js:1279` which uses `var(--gold)` inline (and 6 uses of `var(--muted)`, which stays).
- `.big.gold` CSS rule exists but nothing in markup or JS uses it → delete.
- `'LuckyTitle'` font: `@font-face` at index.html lines 11–15, used only by `.bignum`; `assets/fonts/title.woff2` is precached at sw.js line 74. Drop the face, the `.bignum` usage, and the sw.js precache line (file stays on disk; A2 can delete it).
- `test/sw-precache.test.js` parses `PRECACHE` out of sw.js and cross-checks `url(assets/...)` refs in index.html — our changes keep all asset URLs identical, so it stays green.
- `src/shop.js:32` uses `#fff4e0` as gold-cat fur color — character art, NOT UI. That's why the hex lint scans **index.html only**; src/*.js is scanned for forbidden *token names* only.
- Current test suite is green on `development`. Run `npm test` for the full suite, `npx vitest run test/style-tokens.test.js` for the new file.

---

### Task 1: A0 style bible — STYLE-TOKENS.md, screen checklist, sync test, derived tokens

**Files:**
- Create: `docs/art/STYLE-TOKENS.md`
- Create: `docs/art/SCREEN-CHECKLIST-v5.md`
- Create: `test/style-tokens.test.js`
- Modify: `index.html` (`:root`, lines 65–68 area — append derived-shade tokens)

**Interfaces:**
- Produces: the token names every later task uses. Core 12: `--lc-green #32775E`, `--lc-sky #5DAADD`, `--lc-sun #F2BC57`, `--lc-coral #E69777`, `--lc-brown #846043`, `--lc-gray #B2AEA9`, `--lc-cream #FBF5E8`, `--lc-teal #1F4D4A`, `--lc-success #28723B`, `--lc-error #C95A41`, `--lc-sand #EAC796`, `--lc-ink #2E2A24`. Derived 16: `--lc-sun-hi #FFE59B`, `--lc-sun-deep #D99A2E`, `--lc-sun-shadow #B97A1E`, `--lc-green-hi #3E8B6F`, `--lc-green-deep #245A47`, `--lc-success-hi #2F8347`, `--lc-success-deep #173F22`, `--lc-coral-hi #F0AB8F`, `--lc-coral-deep #B04A33`, `--lc-error-deep #8A2F20`, `--lc-error-border #6E2A18`, `--lc-cream-deep #FDEFD2`, `--lc-wood-ink #3A2E1A`, `--lc-day-hi #EAF2FB`, `--lc-day-mid #DCE8F5`, `--lc-day-ground #F1E7D6`.

- [ ] **Step 1: Create the branch**

```bash
git checkout development && git pull && git checkout -b feat/v5-phase1-theme
```

- [ ] **Step 2: Write the failing sync test**

Create `test/style-tokens.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// A0 enforcement (PRD v5 §4): docs/art/STYLE-TOKENS.md is the style bible;
// index.html :root must define exactly the hex the bible documents. Task 7
// extends this file with the forbidden legacy-palette lint.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const doc = readFileSync(join(ROOT, "docs", "art", "STYLE-TOKENS.md"), "utf8");

// table rows look like: | `--lc-green` | `#32775E` | brand, headers |
const rows = [...doc.matchAll(/\|\s*`(--lc-[a-z-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/g)]
  .map(m => ({ name: m[1], hex: m[2] }));

describe("STYLE-TOKENS.md <-> index.html sync", () => {
  it("documents the full token set (12 core + 16 derived)", () => {
    expect(rows.length).toBeGreaterThanOrEqual(28);
  });

  it("has no duplicate token names", () => {
    const names = rows.map(r => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const { name, hex } of rows) {
    it(`${name} is defined in index.html as ${hex}`, () => {
      const re = new RegExp(`${name}\\s*:\\s*${hex}\\b`, "i");
      expect(re.test(html), `${name}:${hex} not found in index.html :root`).toBe(true);
    });
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run test/style-tokens.test.js`
Expected: FAIL — `ENOENT ... docs/art/STYLE-TOKENS.md`

- [ ] **Step 4: Write `docs/art/STYLE-TOKENS.md`**

Full content:

````markdown
# STYLE-TOKENS — Lucky Cat HSK style bible (PRD v5 A0)

**Source of truth:** `assets/_plan/REFERENCE-production-target.png` (values sampled per
`docs/art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md` §4.1).
**Enforcement:** every token below exists as a CSS custom property in `index.html` `:root`
with the exact hex listed — `test/style-tokens.test.js` fails otherwise, and also fails
if any legacy arcade / `--edu-*` token or hex reappears anywhere in `index.html` or `src/`.
**Rule:** all UI CSS references tokens, never raw hex. Only exception: `rgba()`
shadows/washes built from ink `rgba(46,42,36,α)` or cream `rgba(251,245,232,α)`.

## 1. Core palette

| Token | Hex | Use |
|---|---|---|
| `--lc-green` | `#32775E` | Brand, headings, secondary "green plaque" buttons, progress fills, positive accents |
| `--lc-sky` | `#5DAADD` | Selected states, round capsule, focus outlines, sky |
| `--lc-sun` | `#F2BC57` | START / primary CTA plaque, coins, highlights |
| `--lc-coral` | `#E69777` | Warm accents, "still learning", gentle wrong-family |
| `--lc-brown` | `#846043` | Wood, outlines, muted/accent text on cream |
| `--lc-gray` | `#B2AEA9` | Disabled controls, empty states (never body text) |
| `--lc-cream` | `#FBF5E8` | Global background, paper cards, plaque surfaces, text on dark fills |
| `--lc-teal` | `#1F4D4A` | Bottom nav, dark UI bars, icon accents, links |
| `--lc-success` | `#28723B` | Correct answer, success plaques |
| `--lc-error` | `#C95A41` | Wrong answer, hearts |
| `--lc-sand` | `#EAC796` | Neutral answer buttons, chips, soft panel borders |
| `--lc-ink` | `#2E2A24` | Body copy, high-contrast labels (never pure black) |

## 2. Derived shades (gradients, borders, 3D press shadows)

| Token | Hex | Use |
|---|---|---|
| `--lc-sun-hi` | `#FFE59B` | Sun plaque gradient top |
| `--lc-sun-deep` | `#D99A2E` | Sun plaque gradient bottom / big gold numerals |
| `--lc-sun-shadow` | `#B97A1E` | Sun plaque 3D press shadow |
| `--lc-green-hi` | `#3E8B6F` | Green plaque gradient top |
| `--lc-green-deep` | `#245A47` | Green plaque gradient bottom + border |
| `--lc-success-hi` | `#2F8347` | Success plaque gradient top |
| `--lc-success-deep` | `#173F22` | Success border / gradient bottom |
| `--lc-coral-hi` | `#F0AB8F` | Coral plaque gradient top |
| `--lc-coral-deep` | `#B04A33` | Coral border / destructive button fill |
| `--lc-error-deep` | `#8A2F20` | Destructive button border |
| `--lc-error-border` | `#6E2A18` | Wrong-answer reveal border |
| `--lc-cream-deep` | `#FDEFD2` | Cream gradient bottoms (screen wash fallbacks) |
| `--lc-wood-ink` | `#3A2E1A` | Text on gold/wood frame assets |
| `--lc-day-hi` | `#EAF2FB` | Battle canvas fallback sky top |
| `--lc-day-mid` | `#DCE8F5` | Battle canvas fallback sky mid |
| `--lc-day-ground` | `#F1E7D6` | Battle canvas fallback ground |

## 3. Semantic aliases (kept for shared rules + JS inline styles)

`--bg`, `--ink`, `--muted`, `--panel-wash`, `--panel-border`, `--chip`, `--chip-on`,
`--chip-ink-on` — each maps onto a core token in `:root` (cream / ink / brown / cream /
sand / sand / sky / teal). JS may use `var(--muted)`. Everything else uses `--lc-*` directly.

## 4. Surfaces & materials

- **Page:** `--lc-cream`; painted scene backgrounds sit under cream washes
  `rgba(251,245,232,α)` so content stays readable.
- **Cards/panels ("paper"):** `--lc-cream` fill, 1px `--lc-sand` border, soft ink shadow
  `0 2px 8px rgba(46,42,36,.10)`, radius 10–20px.
- **Plaques ("wood/paint"):** chunky 2–3px borders, subtle vertical gradient
  (`*-hi` → base → `*-deep`), 3D press shadow `0 3-4px 0 <shadow-token>`, radius 14–18px,
  `:active` translates down 2px.
- **Dark bars:** `--lc-teal` (bottom nav, wallet capsule).
- **Light rule:** warm daylight from the **top-left**; shadows fall down-right, always
  warm ink `rgba(46,42,36,α)` — never cold gray/blue, never pure black.

## 5. Buttons (PRD v5 A1)

| Role | Recipe |
|---|---|
| Primary (START, Play again, Word Quest) | sun plaque: `--lc-sun` gradient, `--lc-brown` border+text, `--lc-sun-shadow` press |
| Secondary (menus, Endless, Review…) | green plaque: `--lc-green` gradient, `--lc-green-deep` border, `--lc-cream` text |
| Positive (Know it) | success plaque: `--lc-success` gradient, `--lc-success-deep` border, cream text |
| Gentle-negative (Still learning) | coral plaque: `--lc-coral` gradient, `--lc-coral-deep` border, ink text |
| Destructive (Quit) | `--lc-coral-deep` fill, `--lc-error-deep` border, cream text |
| Disabled | `--lc-gray` fill, no gradient/shadow, ink text at reduced opacity |
| Home tertiary (Flashcards/Smart/Shop) | cream card (`.sec-btn` as shipped in Visual Slice v1) |

## 6. Typography

- **Hanzi:** `LC Hanzi` (Noto Serif SC subset), weight 900, the largest element on any
  word plaque/card.
- **Pinyin:** `LC Latin`/system, regular–500, smaller, directly **above** hanzi, `--lc-brown`.
- **Thai:** `LC Thai` (Noto Sans Thai), 600; check line-height ≥1.3 — TH strings run taller
  than EN (test both locales on every restyled screen).
- **Latin display (titles, START, big numbers):** `LC Latin` (Fredoka), 700–800.
- Meaning line sits **below** hanzi. No text below 11px. Body text is `--lc-ink` on cream.

## 7. Icons

`assets/ui-icons.svg` symbols only; consistent stroke weight; colored via
`currentColor` (`--lc-teal` on cream surfaces, `--lc-cream` on dark fills, `--lc-sun`
for coins/streak accents).
````

- [ ] **Step 5: Write `docs/art/SCREEN-CHECKLIST-v5.md`**

Full content:

````markdown
# Per-screen reference-match checklist (PRD v5 A0 deliverable 3 / Track A gate)

Judge each screen side-by-side against `assets/_plan/REFERENCE-production-target.png`
in BOTH languages (EN + TH). A screen passes when every row is checked.

Shared checks for every screen:
- [ ] Surfaces are cream/daylight (`--lc-cream` washes); zero dark-red/gold arcade chrome
- [ ] Buttons follow STYLE-TOKENS §5 roles (sun primary / green secondary / coral negative / gray disabled)
- [ ] Typography per STYLE-TOKENS §6; Thai strings fit without clipping
- [ ] All colors come from tokens (spot-check devtools: no `--edu-*`, no legacy hex)
- [ ] Shadows warm ink, light from top-left; no glows, no gambling visual language

| Screen | `#s-` id | Pass A1 | Notes |
|---|---|---|---|
| Home | `s-home` | [ ] | shipped by Visual Slice v1 — re-verify only |
| Battle + pause overlay | `s-battle` | [ ] | shipped by Visual Slice v1 — re-verify + `#cv`/HUD polish |
| Flashcards | `s-learn` | [ ] | card = paper plaque; Know/Still-learning per §5 |
| Results | `s-results` | [ ] | green big number; calm perfect/level-up plaques |
| Scope picker | `s-scope` | [ ] | chips sand/sky; Word Quest = sun plaque |
| Shop / Collection | `s-shop` | [ ] | previews sand-bordered |
| Street | `s-street` | [ ] | brown-framed canvas, brown caption |
| Progress | `s-progress` | [ ] | |
| Quests | `s-quests` | [ ] | |
| Scores | `s-scores` | [ ] | |
| More | `s-more` | [ ] | green secondary plaques |
| How to play | `s-howto` | [ ] | green `b` accents |
| Bottom nav | `bottom-nav` | [ ] | shipped by Visual Slice v1 — re-verify only |
````

- [ ] **Step 6: Append the derived-shade tokens to `:root` in `index.html`**

Replace:

```css
    /* Visual Slice v1 palette (PRD §4.1) — additive tokens, not yet wired into screens */
    --lc-green:#32775E; --lc-sky:#5DAADD; --lc-sun:#F2BC57; --lc-coral:#E69777;
    --lc-brown:#846043; --lc-gray:#B2AEA9; --lc-cream:#FBF5E8; --lc-teal:#1F4D4A;
    --lc-success:#28723B; --lc-error:#C95A41; --lc-sand:#EAC796; --lc-ink:#2E2A24;
```

with:

```css
    /* PRD v5 core palette (docs/art/STYLE-TOKENS.md §1 — enforced by test/style-tokens.test.js) */
    --lc-green:#32775E; --lc-sky:#5DAADD; --lc-sun:#F2BC57; --lc-coral:#E69777;
    --lc-brown:#846043; --lc-gray:#B2AEA9; --lc-cream:#FBF5E8; --lc-teal:#1F4D4A;
    --lc-success:#28723B; --lc-error:#C95A41; --lc-sand:#EAC796; --lc-ink:#2E2A24;
    /* derived shades (STYLE-TOKENS.md §2): gradients, borders, 3D press shadows */
    --lc-sun-hi:#FFE59B; --lc-sun-deep:#D99A2E; --lc-sun-shadow:#B97A1E;
    --lc-green-hi:#3E8B6F; --lc-green-deep:#245A47;
    --lc-success-hi:#2F8347; --lc-success-deep:#173F22;
    --lc-coral-hi:#F0AB8F; --lc-coral-deep:#B04A33;
    --lc-error-deep:#8A2F20; --lc-error-border:#6E2A18;
    --lc-cream-deep:#FDEFD2; --lc-wood-ink:#3A2E1A;
    --lc-day-hi:#EAF2FB; --lc-day-mid:#DCE8F5; --lc-day-ground:#F1E7D6;
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run test/style-tokens.test.js`
Expected: PASS (30 tests: 28 token rows + 2 shape checks)

- [ ] **Step 8: Full suite + commit**

```bash
npm test
git add docs/art/STYLE-TOKENS.md docs/art/SCREEN-CHECKLIST-v5.md test/style-tokens.test.js index.html
git commit -m "feat(theme): A0 style bible — STYLE-TOKENS.md, screen checklist, token sync test, derived tokens"
```

---

### Task 2: Re-point the semantic aliases at the v5 palette

**Files:**
- Modify: `index.html` (`:root` alias block + `<meta name="theme-color">` line 6)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `--bg/--ink/--muted/--panel/--panel-wash/--panel-border/--chip/--chip-on/--chip-ink-on` now resolve to v5 values; deprecated aliases (`--gold/--crimson/--jade/--amber/--green/--red/--card`) temporarily re-pointed so nothing regresses before Tasks 3–6 replace their usages (Task 7 deletes them).

- [ ] **Step 1: Replace the alias block in `:root`**

Replace:

```css
    --bg:#FBF3E0; --panel:var(--edu-paper); --card:var(--edu-paper);
    --ink:var(--edu-ink); --muted:#6B7A88;
    --gold:var(--edu-sun); --crimson:var(--edu-coral); --jade:var(--edu-jade);
    --amber:var(--gold); --green:var(--jade);
    --red:var(--edu-coral); --chip:#EFE7D4; --chip-on:var(--edu-sky); --chip-ink-on:#08324a;
    --panel-border:var(--edu-gray); --panel-wash:#FFFDF6;
```

with:

```css
    /* semantic aliases (STYLE-TOKENS.md §3). --gold/--crimson/--jade/--amber/--green/
       --red/--card are deprecated: re-pointed here so nothing regresses mid-migration,
       usages removed in Tasks 3–6, definitions deleted in Task 7. */
    --bg:var(--lc-cream); --panel:var(--lc-cream); --card:var(--lc-cream);
    --ink:var(--lc-ink); --muted:var(--lc-brown);
    --gold:var(--lc-brown); --crimson:var(--lc-coral); --jade:var(--lc-green);
    --amber:var(--lc-sun); --green:var(--lc-success);
    --red:var(--lc-error); --chip:var(--lc-sand); --chip-on:var(--lc-sky); --chip-ink-on:var(--lc-teal);
    --panel-border:var(--lc-sand); --panel-wash:var(--lc-cream);
```

- [ ] **Step 2: Update the theme-color meta**

Replace: `<meta name="theme-color" content="#FBF3E0">`
with: `<meta name="theme-color" content="#FBF5E8">`

- [ ] **Step 3: Verify**

Run: `npm test` → all green.
Run: `npm run serve` and eyeball `http://localhost:8000` — panels/chips/HUD pills now cream+sand, muted text warm brown. No screen unreadable.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(theme): re-point semantic aliases at v5 palette (A1)"
```

---

### Task 3: Shared chrome — buttons, headings, chips, progress bars, focus

**Files:**
- Modify: `index.html` CSS block only

**Interfaces:**
- Consumes: Task 1 tokens. Produces: the button recipes documented in STYLE-TOKENS §5 (`.big` = green plaque, `.big.primary` = sun plaque, `.know`/`.learn2` recipes) that Tasks 4–6 rely on visually.

Each step below is one exact replacement in `index.html`.

- [ ] **Step 1: `.big` → green secondary plaque** (keep the `border-image` line — frame system)

Replace:

```css
  .big{padding:16px; font-size:18px; font-weight:600; border-radius:999px;
    background-color:var(--panel-wash);
    color:var(--ink);
    border:2px solid var(--edu-sky);
    border-image:var(--f-ui-button-secondary, none);
    box-shadow:0 3px 8px rgba(36,52,71,.12);}
```

with:

```css
  .big{padding:16px; font-size:18px; font-weight:700; border-radius:16px;
    background-color:var(--lc-green);
    background-image:linear-gradient(180deg,var(--lc-green-hi),var(--lc-green) 55%,var(--lc-green-deep));
    color:var(--lc-cream);
    border:2px solid var(--lc-green-deep);
    border-image:var(--f-ui-button-secondary, none);
    box-shadow:0 3px 0 var(--lc-green-deep), 0 6px 12px rgba(46,42,36,.22);}
```

- [ ] **Step 2: `.big.primary` → sun primary plaque**

Replace:

```css
  .big.primary{
    background-color:var(--edu-coral);
    background-image:linear-gradient(180deg,#EE6D62,var(--edu-coral));
    border-image:var(--f-ui-button-primary, none);
    color:#FFFFFF; border-color:#C64A40;
    box-shadow:0 4px 10px rgba(230,90,79,.25);}
```

with:

```css
  .big.primary{
    background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun) 55%,var(--lc-sun-deep));
    border-image:var(--f-ui-button-primary, none);
    color:var(--lc-brown); border-color:var(--lc-brown);
    box-shadow:0 3px 0 var(--lc-sun-shadow), 0 6px 12px rgba(46,42,36,.24);}
```

- [ ] **Step 3: Delete the unused `.big.gold` rule**

Delete entirely (verified unused in markup and JS):

```css
  .big.gold{
    background:var(--panel-wash);
    color:var(--edu-ink); border-color:var(--edu-gray);
    box-shadow:0 3px 8px rgba(36,52,71,.10);}
```

- [ ] **Step 4: `.back` link → teal**

Replace:

```css
  .back{align-self:flex-start; background:none; color:var(--edu-sky); font-size:15px; padding:6px 2px; margin-bottom:6px;
```

with:

```css
  .back{align-self:flex-start; background:none; color:var(--lc-teal); font-weight:700; font-size:15px; padding:6px 2px; margin-bottom:6px;
```

- [ ] **Step 5: headings → brand green**

Replace: `  h2{font-size:20px; margin:4px 0 14px; color:var(--gold);}`
with: `  h2{font-size:20px; margin:4px 0 14px; color:var(--lc-green);}`

- [ ] **Step 6: chips — ink text, teal selected border, cream text on frame tags**

Replace:

```css
  .chip{padding:9px 14px; border-radius:999px; background:var(--chip); color:var(--edu-ink);
```

with:

```css
  .chip{padding:9px 14px; border-radius:999px; background:var(--chip); color:var(--ink);
```

Replace:

```css
  .chip.on{background-color:var(--chip-on); color:var(--chip-ink-on); border-color:var(--chip-on);
```

with:

```css
  .chip.on{background-color:var(--chip-on); color:var(--chip-ink-on); border-color:var(--lc-teal);
```

Replace:

```css
  :root.has-ui-tag .chip.on{background:none; border-color:transparent; border-radius:14px; color:#FFF8E8;}
```

with:

```css
  :root.has-ui-tag .chip.on{background:none; border-color:transparent; border-radius:14px; color:var(--lc-cream);}
```

- [ ] **Step 7: `#len-custom` focus → sky selected state**

Replace: `  #len-custom:focus{outline:none; border-color:var(--gold);}`
with: `  #len-custom:focus{outline:none; border-color:var(--lc-sky);}`

- [ ] **Step 8: shared card group shadow → warm ink**

Replace (inside the `.screen-card, .panel, ... .spk` group rule):

```css
    box-shadow:0 2px 8px rgba(36,52,71,.08);
```

with:

```css
    box-shadow:0 2px 8px rgba(46,42,36,.10);
```

- [ ] **Step 9: readout accent → green**

Replace: `  .readout b{color:var(--gold);}`
with: `  .readout b{color:var(--lc-green);}`

- [ ] **Step 10: progress bars — brown-tinted track, green fill (reference §3 UI elements)**

Replace:

```css
  .mbar{height:6px; border-radius:999px; background:rgba(201,160,138,.2); border-image:var(--f-ui-progress-track, none); overflow:hidden;}
  .mbar i{display:block; height:100%; background-color:var(--gold); background-image:linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 50%,var(--lc-dark-gold)); border-image:var(--f-ui-progress-fill, none); border-radius:999px;}
```

with:

```css
  .mbar{height:6px; border-radius:999px; background:rgba(132,96,67,.22); border-image:var(--f-ui-progress-track, none); overflow:hidden;}
  .mbar i{display:block; height:100%; background-color:var(--lc-green); background-image:linear-gradient(180deg,var(--lc-green-hi),var(--lc-green) 60%,var(--lc-green-deep)); border-image:var(--f-ui-progress-fill, none); border-radius:999px;}
```

(Home's `.xp-bar i` and `.streak-bar i` keep their own sun/success gradients — they override this.)

- [ ] **Step 11: flashcard verdict buttons (they sit on the new `.big` base, so they need their own full fills now)**

Replace:

```css
  .know{background-color:var(--jade); color:#0d2200; border-color:var(--lc-jade);}
  .learn2{background-color:var(--crimson); color:var(--lc-cream-legacy); border-color:var(--lc-lacquer);}
```

with:

```css
  .know{background-color:var(--lc-success);
    background-image:linear-gradient(180deg,var(--lc-success-hi),var(--lc-success) 55%,var(--lc-success-deep));
    color:var(--lc-cream); border-color:var(--lc-success-deep);
    box-shadow:0 3px 0 var(--lc-success-deep), 0 6px 12px rgba(46,42,36,.22);}
  .learn2{background-color:var(--lc-coral);
    background-image:linear-gradient(180deg,var(--lc-coral-hi),var(--lc-coral) 55%,var(--lc-coral-deep));
    color:var(--lc-ink); border-color:var(--lc-coral-deep);
    box-shadow:0 3px 0 var(--lc-coral-deep), 0 6px 12px rgba(46,42,36,.22);}
```

- [ ] **Step 12: speaker button → teal icon**

Replace:

```css
  .spk{color:var(--edu-sky); font-size:22px; padding:10px 16px; border-radius:12px; border:1px solid var(--panel-border);
```

with:

```css
  .spk{color:var(--lc-teal); font-size:22px; padding:10px 16px; border-radius:12px; border:1px solid var(--panel-border);
```

- [ ] **Step 13: focus outline + howto accents**

Replace: `  :focus-visible{outline:3px solid var(--edu-sky); outline-offset:2px; border-radius:4px;}`
with: `  :focus-visible{outline:3px solid var(--lc-sky); outline-offset:2px; border-radius:4px;}`

Replace: `  .howto b{color:var(--gold);}`
with: `  .howto b{color:var(--lc-green);}`

- [ ] **Step 14: Verify + commit**

Run: `npm test` → green. `npm run serve` → check Scope, More, Results buttons: secondary buttons are green plaques, Word Quest is a sun plaque, chips readable, both EN and TH (More → ไทย).

```bash
git add index.html
git commit -m "feat(theme): shared chrome — green/sun plaque buttons, chips, headings, progress bars (A1)"
```

---

### Task 4: Flashcards + Results + Scores screens

**Files:**
- Modify: `index.html` (CSS + one inline style in Results markup + LuckyTitle `@font-face`)
- Modify: `sw.js` (remove `title.woff2` precache entry — SHELL bump waits for Task 7)

**Interfaces:**
- Consumes: Tasks 1–3.

- [ ] **Step 1: card surfaces → cream paper**

Replace:

```css
  .word-card,
  .flash-card,
  .card{
    background-color:var(--edu-paper);
    border-image:var(--f-ui-card-paper, none);
  }
```

with:

```css
  .word-card,
  .flash-card,
  .card{
    background-color:var(--lc-cream);
    border-image:var(--f-ui-card-paper, none);
  }
```

- [ ] **Step 2: the big flashcard**

Replace:

```css
  .card{flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;
    color:var(--edu-ink); border:2px solid var(--edu-gray); border-radius:20px; margin:14px 0;
    border-image:var(--f-ui-card-paper, none);
    padding:24px; text-align:center; min-height:280px; cursor:pointer; user-select:none;
    box-shadow:0 4px 14px rgba(36,52,71,.10);}
```

with:

```css
  .card{flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;
    color:var(--ink); border:2px solid var(--lc-sand); border-radius:20px; margin:14px 0;
    border-image:var(--f-ui-card-paper, none);
    padding:24px; text-align:center; min-height:280px; cursor:pointer; user-select:none;
    box-shadow:0 4px 14px rgba(46,42,36,.12);}
```

- [ ] **Step 3: card text — pinyin brown, Thai green, hint brown**

Replace: `  .card .py{font-size:24px; color:var(--gold); margin-top:8px;}`
with: `  .card .py{font-size:24px; font-weight:500; color:var(--lc-brown); margin-top:8px;}`

Replace: `  .card .mean .th{color:var(--jade); font-size:24px; margin-top:8px;}`
with: `  .card .mean .th{color:var(--lc-green); font-size:24px; margin-top:8px;}`

Replace: `  .card .hint{color:#6a4f42; font-size:13px; margin-top:26px;}`
with: `  .card .hint{color:var(--lc-brown); font-size:13px; margin-top:26px;}`

- [ ] **Step 4: screen washes → cream (learn + results here; progress + shop in Task 5)**

Replace:

```css
  #s-learn{
    background-image:linear-gradient(rgba(255,248,232,.76),rgba(255,248,232,.90)), url("assets/bg-flashcards.png"), linear-gradient(#FFF8E8,#FDEFD2);
  }
```

with:

```css
  #s-learn{
    background-image:linear-gradient(rgba(251,245,232,.76),rgba(251,245,232,.90)), url("assets/bg-flashcards.png"), linear-gradient(var(--lc-cream),var(--lc-cream-deep));
  }
```

Replace:

```css
  #s-results{
    background-image:linear-gradient(rgba(255,248,232,.78),rgba(255,248,232,.92)), url("assets/bg-results.png"), linear-gradient(#FFF8E8,#FDEFD2);
  }
```

with:

```css
  #s-results{
    background-image:linear-gradient(rgba(251,245,232,.78),rgba(251,245,232,.92)), url("assets/bg-results.png"), linear-gradient(var(--lc-cream),var(--lc-cream-deep));
  }
```

- [ ] **Step 5: retire the LuckyTitle arcade font**

Delete from `index.html`:

```css
  @font-face{
    font-family:'LuckyTitle';
    src:url('assets/fonts/title.woff2') format('woff2');
    font-display:swap;
  }
```

Replace:

```css
  .bignum{font-size:52px; text-align:center; color:var(--gold); font-weight:800; margin:6px 0;
    font-family:'LuckyTitle',"Segoe UI",sans-serif;}
```

with:

```css
  .bignum{font-size:52px; text-align:center; color:var(--lc-green); font-weight:800; margin:6px 0;
    font-family:'LC Latin',"Segoe UI",sans-serif;}
```

In `sw.js`, delete the line: `  "assets/fonts/title.woff2",`
(`assets/fonts/title.woff2` stays on disk — nothing references it; A2 may delete it.)

- [ ] **Step 6: miss list / score list accents**

Replace:

```css
  .misslist{flex:1; overflow-y:auto; background-color:var(--panel); border-radius:12px;
    background-color:var(--panel-wash);
    border:1px solid var(--panel-border); padding:6px 12px; margin:10px 0; max-height:38vh;}
```

with:

```css
  .misslist{flex:1; overflow-y:auto; background-color:var(--panel-wash); border-radius:12px;
    border:1px solid var(--panel-border); padding:6px 12px; margin:10px 0; max-height:38vh;}
```

Replace: `  .missrow{display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(201,165,138,.2);}`
with: `  .missrow{display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(132,96,67,.22);}`

Replace: `  .missrow .det .py{color:var(--gold);}`
with: `  .missrow .det .py{color:var(--lc-brown);}`

Replace: `  .scorerow{display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(201,165,138,.2); font-size:15px;}`
with: `  .scorerow{display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(132,96,67,.22); font-size:15px;}`

Replace: `  .scorerow b{color:var(--gold);}`
with: `  .scorerow b{color:var(--lc-green);}`

- [ ] **Step 7: results banners — calm plaques, no glow (art guardrail)**

Replace: `  #r-quests{color:var(--gold); font-size:14px; text-align:center; margin:0 0 8px;}`
with: `  #r-quests{color:var(--lc-brown); font-size:14px; text-align:center; margin:0 0 8px;}`

Replace:

```css
  #r-perfect{color:var(--lc-ink-legacy); background:linear-gradient(var(--lc-cream-legacy),var(--lc-gold)); border:1px solid var(--lc-dark-gold);
    border-radius:10px; font-weight:800; font-size:15px; text-align:center; padding:7px 10px; margin:0 0 10px;
    box-shadow:0 0 10px rgba(245,197,24,.5);}
```

with:

```css
  #r-perfect{color:var(--lc-brown); background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun)); border:2px solid var(--lc-brown);
    border-radius:12px; font-weight:800; font-size:15px; text-align:center; padding:7px 10px; margin:0 0 10px;
    box-shadow:0 2px 6px rgba(46,42,36,.18);}
```

Replace:

```css
  #r-levelup{color:#0d2200; background:linear-gradient(#c8f5a0,var(--lc-jade)); border:1px solid var(--lc-jade);
    border-radius:10px; font-weight:800; font-size:15px; text-align:center; padding:7px 10px; margin:0 0 10px;
    box-shadow:0 0 10px rgba(127,201,74,.5);}
```

with:

```css
  #r-levelup{color:var(--lc-cream); background-color:var(--lc-success);
    background-image:linear-gradient(180deg,var(--lc-success-hi),var(--lc-success)); border:2px solid var(--lc-success-deep);
    border-radius:12px; font-weight:800; font-size:15px; text-align:center; padding:7px 10px; margin:0 0 10px;
    box-shadow:0 2px 6px rgba(46,42,36,.18);}
```

- [ ] **Step 8: Results markup — wallet line inline style**

Replace (in the `#s-results` markup): `      <p class="sub" id="r-wallet" style="color:var(--gold)"></p>`
with: `      <p class="sub" id="r-wallet" style="color:var(--lc-brown)"></p>`

- [ ] **Step 9: Verify + commit**

Run: `npm test` → green (sw-precache test must still pass after the title.woff2 removal).
`npm run serve`: play a 20-round battle → Results; open Flashcards; More → Best Sessions. Check EN + TH.

```bash
git add index.html sw.js
git commit -m "feat(theme): flashcards, results, scores off legacy palette (A1)"
```

---

### Task 5: Shop + Street + Progress + Quests screens

**Files:**
- Modify: `index.html` CSS block only

**Interfaces:**
- Consumes: Tasks 1–3.

- [ ] **Step 1: remaining screen washes → cream**

Replace:

```css
  #s-progress{
    background-image:linear-gradient(rgba(255,248,232,.76),rgba(255,248,232,.91)), url("assets/bg-progress.png"), linear-gradient(#FFF8E8,#FDEFD2);
  }
```

with:

```css
  #s-progress{
    background-image:linear-gradient(rgba(251,245,232,.76),rgba(251,245,232,.91)), url("assets/bg-progress.png"), linear-gradient(var(--lc-cream),var(--lc-cream-deep));
  }
```

Replace:

```css
  #s-shop{
    background-image:linear-gradient(rgba(255,248,232,.78),rgba(255,248,232,.92)), url("assets/bg-collection.png"), linear-gradient(#FFF8E8,#FDEFD2);
  }
```

with:

```css
  #s-shop{
    background-image:linear-gradient(rgba(251,245,232,.78),rgba(251,245,232,.92)), url("assets/bg-collection.png"), linear-gradient(var(--lc-cream),var(--lc-cream-deep));
  }
```

- [ ] **Step 2: shop preview tiles — drop the gold-glow arcade frame**

Replace:

```css
  .shop-preview{flex:0 0 96px; width:96px; height:64px; border-radius:8px;
    border:1px solid rgba(245,195,75,.28);
    box-shadow:0 4px 12px rgba(0,0,0,.35), inset 0 0 12px rgba(245,197,24,.08);}
```

with:

```css
  .shop-preview{flex:0 0 96px; width:96px; height:64px; border-radius:8px;
    border:1px solid var(--lc-sand);
    box-shadow:0 3px 8px rgba(46,42,36,.18);}
```

- [ ] **Step 3: street canvas — warm wood frame, brown caption**

Replace:

```css
  #street-cv{width:100%; height:min(40vh,320px); display:block; border-radius:12px;
    border:1px solid rgba(245,197,24,.4);
    box-shadow:inset 0 0 18px rgba(245,197,24,.12), 0 3px 10px rgba(0,0,0,.28);}
  #street-caption{color:#f0cda4; font-size:12px; text-align:center; margin:4px 0 0;
    text-shadow:0 1px 2px rgba(0,0,0,.75);}
```

with:

```css
  #street-cv{width:100%; height:min(40vh,320px); display:block; border-radius:12px;
    border:2px solid var(--lc-brown);
    box-shadow:0 3px 10px rgba(46,42,36,.22);}
  #street-caption{color:var(--lc-brown); font-size:12px; text-align:center; margin:4px 0 0;}
```

- [ ] **Step 4: quest reward accent → green**

Replace: `  .quest-row .qr{color:var(--gold); font-weight:700; white-space:nowrap;}`
with: `  .quest-row .qr{color:var(--lc-green); font-weight:700; white-space:nowrap;}`

- [ ] **Step 5: Verify + commit**

Run: `npm test` → green. `npm run serve`: check Shop, Street, Progress, Quests tabs in EN + TH.

```bash
git add index.html
git commit -m "feat(theme): shop, street, progress, quests off legacy palette (A1)"
```

---

### Task 6: Battle + Home polish — HUD, canvas frame, raw-hex tokenization, JS accent

**Files:**
- Modify: `index.html` CSS block
- Modify: `src/main.js:1279` (one inline `var(--gold)`)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `index.html` contains no raw legacy hex; `src/` contains no deprecated alias — the state Task 7's lint asserts.

- [ ] **Step 1: HUD pills → warm ink/sand**

Replace:

```css
  .hud-pill{display:inline-flex; align-items:center; gap:4px; background:var(--panel-wash); min-width:0;
    color:var(--edu-ink); border-radius:999px; padding:4px 10px; border:1px solid var(--edu-gray); font-weight:700; font-size:14px;
    box-shadow:0 2px 6px rgba(36,52,71,.08); white-space:nowrap;}
```

with:

```css
  .hud-pill{display:inline-flex; align-items:center; gap:4px; background:var(--panel-wash); min-width:0;
    color:var(--ink); border-radius:999px; padding:4px 10px; border:1px solid var(--panel-border); font-weight:700; font-size:14px;
    box-shadow:0 2px 6px rgba(46,42,36,.10); white-space:nowrap;}
```

Replace:

```css
  .hud-round{width:44px; height:44px; min-width:44px; border-radius:50%; background:var(--panel-wash);
    color:var(--edu-ink); border:1px solid var(--edu-gray); border-image:var(--f-ui-badge-mastery, none); font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; flex:0 0 auto;
    box-shadow:0 2px 6px rgba(36,52,71,.08);}
```

with:

```css
  .hud-round{width:44px; height:44px; min-width:44px; border-radius:50%; background:var(--panel-wash);
    color:var(--ink); border:1px solid var(--panel-border); border-image:var(--f-ui-badge-mastery, none); font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; flex:0 0 auto;
    box-shadow:0 2px 6px rgba(46,42,36,.10);}
```

- [ ] **Step 2: hearts**

Replace:

```css
  .life-icon{width:18px; height:18px; color:var(--edu-coral); filter:drop-shadow(0 1px 1px rgba(0,0,0,.2));}
  .life-icon.empty{color:#6a3a3a; opacity:.65;}
```

with:

```css
  .life-icon{width:18px; height:18px; color:var(--lc-error); filter:drop-shadow(0 1px 1px rgba(46,42,36,.25));}
  .life-icon.empty{color:var(--lc-gray); opacity:.65;}
```

- [ ] **Step 3: battle canvas frame — wood border, warm shadow, tokenized daylight fallback**

Replace:

```css
  #cv{width:100%; height:100%; border-radius:14px;
    background-image:linear-gradient(#EAF2FB,#DCE8F5 60%,#F1E7D6);
    background-size:cover; background-position:bottom; background-repeat:no-repeat;
    border:1px solid var(--panel-border); display:block; touch-action:none;
    box-shadow:0 10px 22px rgba(0,0,0,.25), inset 0 0 18px rgba(245,197,24,.08);}
```

with:

```css
  #cv{width:100%; height:100%; border-radius:14px;
    background-image:linear-gradient(var(--lc-day-hi),var(--lc-day-mid) 60%,var(--lc-day-ground));
    background-size:cover; background-position:bottom; background-repeat:no-repeat;
    border:2px solid var(--lc-brown); display:block; touch-action:none;
    box-shadow:0 8px 18px rgba(46,42,36,.25);}
```

- [ ] **Step 4: answer reveal borders → tokens**

Replace: `  #opts button.good{background-color:var(--lc-success); color:var(--lc-cream); border-color:#173F22;`
with: `  #opts button.good{background-color:var(--lc-success); color:var(--lc-cream); border-color:var(--lc-success-deep);`

Replace: `  #opts button.bad{background-color:var(--lc-error); color:var(--lc-cream); border-color:#6E2A18;`
with: `  #opts button.bad{background-color:var(--lc-error); color:var(--lc-cream); border-color:var(--lc-error-border);`

- [ ] **Step 5: pause overlay — tokenize the sun/destructive hexes**

Replace:

```css
  .pause-resume{font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:800; font-size:19px;
    color:var(--lc-brown); background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,#FFE59B,var(--lc-sun) 55%,#D99A2E);
    border:3px solid var(--lc-brown); border-radius:16px; padding:12px 8px; min-height:52px;
    box-shadow:0 4px 0 #B97A1E, 0 8px 14px rgba(46,42,36,.32);}
  .pause-resume:active{transform:translateY(2px); box-shadow:0 2px 0 #B97A1E, 0 4px 8px rgba(46,42,36,.32);}
```

with:

```css
  .pause-resume{font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:800; font-size:19px;
    color:var(--lc-brown); background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun) 55%,var(--lc-sun-deep));
    border:3px solid var(--lc-brown); border-radius:16px; padding:12px 8px; min-height:52px;
    box-shadow:0 4px 0 var(--lc-sun-shadow), 0 8px 14px rgba(46,42,36,.32);}
  .pause-resume:active{transform:translateY(2px); box-shadow:0 2px 0 var(--lc-sun-shadow), 0 4px 8px rgba(46,42,36,.32);}
```

Replace: `    padding:3px 9px; border-radius:999px; background-color:var(--lc-gray); color:#3d3a35; flex:0 0 auto;}`
with: `    padding:3px 9px; border-radius:999px; background-color:var(--lc-gray); color:var(--lc-ink); flex:0 0 auto;}`

Replace:

```css
  .pause-quit{font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:700; font-size:14px; color:var(--lc-cream);
    background-color:#B04A33; border:2px solid #8A2F20; border-radius:14px;
    padding:10px 8px; min-height:46px;}
```

with:

```css
  .pause-quit{font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:700; font-size:14px; color:var(--lc-cream);
    background-color:var(--lc-coral-deep); border:2px solid var(--lc-error-deep); border-radius:14px;
    padding:10px 8px; min-height:46px;}
```

(The comment above `.pause-quit` about the darker `--lc-error` shade stays accurate — keep it.)

- [ ] **Step 6: home START + gold-frame text — tokenize**

Replace: `  :root.has-ui-button-start #go-battle{background:none; border-color:transparent; border-radius:22px;`
    `    color:#3A2E1A; box-shadow:0 4px 9px rgba(60,42,22,.25); text-shadow:none;}`
with: `  :root.has-ui-button-start #go-battle{background:none; border-color:transparent; border-radius:22px;`
    `    color:var(--lc-wood-ink); box-shadow:0 4px 9px rgba(46,42,36,.25); text-shadow:none;}`

Replace:

```css
  .start-btn{flex:1 1 62%; font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:800;
    font-size:21px; letter-spacing:.05em; color:var(--lc-brown);
    background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,#FFE59B,var(--lc-sun) 55%,#D99A2E);
    border:3px solid var(--lc-brown); border-radius:18px; padding:12px 8px; min-height:56px;
    box-shadow:0 4px 0 #B97A1E, 0 8px 14px rgba(46,42,36,.32);}
  .start-btn:active{transform:translateY(2px); box-shadow:0 2px 0 #B97A1E, 0 4px 8px rgba(46,42,36,.32);}
  .start-btn:disabled{background:var(--lc-gray); background-image:none; color:#6d6862;
    border-color:#8b8681; box-shadow:none; opacity:.75;}
```

with:

```css
  .start-btn{flex:1 1 62%; font-family:'LC Latin',"Segoe UI",sans-serif; font-weight:800;
    font-size:21px; letter-spacing:.05em; color:var(--lc-brown);
    background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun) 55%,var(--lc-sun-deep));
    border:3px solid var(--lc-brown); border-radius:18px; padding:12px 8px; min-height:56px;
    box-shadow:0 4px 0 var(--lc-sun-shadow), 0 8px 14px rgba(46,42,36,.32);}
  .start-btn:active{transform:translateY(2px); box-shadow:0 2px 0 var(--lc-sun-shadow), 0 4px 8px rgba(46,42,36,.32);}
  .start-btn:disabled{background:var(--lc-gray); background-image:none; color:var(--lc-ink);
    border-color:var(--lc-gray); box-shadow:none; opacity:.75;}
```

Replace: `  .xp-bar i{background-image:linear-gradient(180deg,#FFE9B0,var(--lc-sun) 60%,var(--lc-brown));}`
with: `  .xp-bar i{background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun) 60%,var(--lc-brown));}`

- [ ] **Step 7: `src/main.js` — drop the deprecated `--gold` alias usage**

At `src/main.js:1279`, replace `var(--gold)` with `var(--lc-brown)`:

```js
      + (isBest ? ` · <b style="color:var(--lc-brown)">${t("results.bestTag")}</b>` : ` · ${t("results.bestPrev", { prev })}`);
```

- [ ] **Step 8: Rebuild, verify, commit**

```bash
npm run build
npm test
```

`npm run serve`: play a battle — check HUD, canvas frame, pause overlay, wrong/correct reveals; check home START (and its disabled state via a tiny scope if reachable).

```bash
git add index.html src/main.js dist/app.js
git commit -m "feat(theme): battle + home raw-hex tokenization, warm shadows (A1)"
```

---

### Task 7: Delete the legacy palettes, enforce the lint, bump SHELL, run the checklist

**Files:**
- Modify: `test/style-tokens.test.js` (append forbidden-palette lint)
- Modify: `index.html` (`:root` — delete legacy + edu + deprecated alias definitions)
- Modify: `sw.js` (SHELL v23 → v24)
- Modify: `docs/art/SCREEN-CHECKLIST-v5.md` (tick the A1 pass column)

**Interfaces:**
- Consumes: Tasks 1–6 (all usages already migrated).

- [ ] **Step 1: Confirm zero remaining usages before deleting definitions**

```bash
grep -nE "var\(--(edu-|gold|crimson|jade|amber|green|red|card|panel)\)" index.html src/*.js
grep -nE "var\(--lc-(lacquer|crimson|gold|dark-gold|jade|night|paper|ink-legacy|cream-legacy|tan|shadow)\)" index.html src/*.js
```

Expected: **no output** from either. (`var(--panel-wash)`/`var(--panel-border)` don't match the first pattern — it requires the closing paren.) If anything prints, fix that usage first using the recipes from Tasks 3–6.

- [ ] **Step 2: Write the failing lint extension**

Append to `test/style-tokens.test.js`:

```js
// ---- forbidden legacy palettes (PRD v5 A1 acceptance: "no element uses a legacy color") ----
import { readdirSync } from "node:fs";

const srcFiles = readdirSync(join(ROOT, "src")).filter(f => f.endsWith(".js"));
const srcText = srcFiles.map(f => readFileSync(join(ROOT, "src", f), "utf8")).join("\n");

// token names: banned in index.html AND src/*.js. Boundary (?![\w-]) keeps
// --panel from matching --panel-wash, --green from matching nothing (no
// substring), etc.
const FORBIDDEN_NAMES = [
  "--edu-", "--lc-lacquer", "--lc-crimson", "--lc-gold", "--lc-dark-gold",
  "--lc-jade", "--lc-night", "--lc-paper", "--lc-ink-legacy", "--lc-cream-legacy",
  "--lc-tan", "--lc-shadow",
  "--gold", "--crimson", "--jade", "--amber", "--green", "--red", "--card", "--panel",
];

// hex values: banned in index.html only (src canvas art may legitimately reuse
// a hex — e.g. shop.js gold-cat fur is #fff4e0 — character art, not UI chrome).
const FORBIDDEN_HEX = [
  "A51F24", "4A1015", "F5C34B", "9C6900", "2F9B72", "101B2B", "F4E2BE", "24150E",
  "FFF4E0", "C9A58A", "FBF3E0", "FFF8E8", "E65A4F", "4FAE8A", "6EB6E8", "F5C85B",
  "243447", "7B5B8E", "E7E2D9", "78B86B", "7A5A44", "EFE7D4", "FFFDF6", "6B7A88",
  "08324A", "EE6D62", "C64A40", "F0CDA4", "6A3A3A", "6A4F42", "0D2200", "3D3A35",
  "6D6862", "8B8681", "FFE9B0", "173F22", "6E2A18", "B04A33", "8A2F20", "3A2E1A",
  "B97A1E", "D99A2E", "FFE59B", "EAF2FB", "DCE8F5", "F1E7D6",
];

// rgb triples from the dead palettes (washes/glows written as rgba(...))
const FORBIDDEN_RGB = ["255,248,232", "36,52,71", "18,8,6", "245,197,24", "245,195,75", "201,165,138", "201,160,138"];

describe("forbidden legacy palette lint", () => {
  for (const name of FORBIDDEN_NAMES) {
    const re = new RegExp(`${name}(?![\\w-])`);
    it(`token ${name} is gone from index.html`, () => {
      expect(re.test(html), `${name} still referenced in index.html`).toBe(false);
    });
    it(`token ${name} is gone from src/`, () => {
      expect(re.test(srcText), `${name} still referenced in src/*.js`).toBe(false);
    });
  }
  for (const hex of FORBIDDEN_HEX) {
    it(`raw hex #${hex} is gone from index.html`, () => {
      expect(html.toLowerCase().includes(`#${hex.toLowerCase()}`), `#${hex} still in index.html`).toBe(false);
    });
  }
  for (const rgb of FORBIDDEN_RGB) {
    it(`rgb(${rgb}) is gone from index.html`, () => {
      expect(html.replace(/\s/g, "").includes(rgb), `rgba(${rgb},...) still in index.html`).toBe(false);
    });
  }
});
```

Note: `FORBIDDEN_HEX` includes the derived-shade hexes (`173F22`, `B97A1E`, `FFE59B`, …) on purpose — after Tasks 3–6 they must only ever appear as **token definitions** in `:root`. That's why the hex check must exempt the `:root` block: wrap the hex/rgb `it()` bodies to test against `htmlSansRoot` instead, computed as:

```js
const htmlSansRoot = html.replace(/:root\{[\s\S]*?\}/, "");
```

(Put this line right after the `srcText` declaration, and use `htmlSansRoot` in the hex + rgb loops. The name-loop still uses full `html` — deprecated *names* may not even be defined.)

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run test/style-tokens.test.js`
Expected: FAIL — legacy/edu/deprecated-alias *definitions* still exist in `:root` (name lint hits `--edu-`, `--lc-lacquer`, `--gold`, etc.).

- [ ] **Step 4: Delete the dead palettes from `:root`**

In `index.html` `:root`, delete these definition lines entirely:

```css
    --lc-lacquer:#A51F24;
    --lc-crimson:#4A1015;
    --lc-gold:#F5C34B;
    --lc-dark-gold:#9C6900;
    --lc-jade:#2F9B72;
    --lc-night:#101B2B;
    --lc-paper:#F4E2BE;
    /* renamed from --lc-ink/--lc-cream: those names are claimed by the Visual
       Slice v1 palette below (different values) — kept for existing usages */
    --lc-ink-legacy:#24150E;
    --lc-cream-legacy:#FFF4E0;
    --lc-tan:#C9A58A;
    --lc-shadow:rgba(18,8,6,.42);
    /* Education-first palette: Lucky Cat Learning Journey */
    --edu-paper:#FFF8E8;
    --edu-coral:#E65A4F;
    --edu-jade:#4FAE8A;
    --edu-sky:#6EB6E8;
    --edu-sun:#F5C85B;
    --edu-ink:#243447;
    --edu-plum:#7B5B8E;
    --edu-gray:#E7E2D9;
    --edu-leaf:#78B86B;
    --edu-brown:#7A5A44;
```

And replace the alias block from Task 2 with the final form (deprecated aliases removed):

```css
    /* semantic aliases (STYLE-TOKENS.md §3) */
    --bg:var(--lc-cream); --ink:var(--lc-ink); --muted:var(--lc-brown);
    --panel-wash:var(--lc-cream); --panel-border:var(--lc-sand);
    --chip:var(--lc-sand); --chip-on:var(--lc-sky); --chip-ink-on:var(--lc-teal);
```

- [ ] **Step 5: Run the lint to verify it passes**

Run: `npx vitest run test/style-tokens.test.js`
Expected: PASS (all sync + lint tests).

- [ ] **Step 6: SHELL bump + build + full suite**

In `sw.js`, replace: `const SHELL = "nbhsk-shell-v23";`
with: `const SHELL = "nbhsk-shell-v24";`

```bash
npm run build
npm test
```

Expected: full suite green.

- [ ] **Step 7: Walk the A0 screen checklist**

`npm run serve` → visit every screen in `docs/art/SCREEN-CHECKLIST-v5.md` in EN, switch to TH (More → ไทย), re-check. Tick each `Pass A1` box in the doc that passes; anything failing gets fixed before commit (using Task 3–6 recipes). Also verify `file://index.html` still boots (open directly in a browser).

- [ ] **Step 8: Commit + PR**

```bash
git add index.html sw.js test/style-tokens.test.js docs/art/SCREEN-CHECKLIST-v5.md
git commit -m "feat(theme): remove legacy palettes, enforce token lint, SHELL v24 (A1 complete)"
git push -u origin feat/v5-phase1-theme
gh pr create --base development --title "PRD v5 Phase 1: A0 style tokens + A1 full theme migration" --body "$(cat <<'EOF'
## Summary
- A0: STYLE-TOKENS.md style bible + per-screen checklist + doc<->CSS sync test
- A1: every screen migrated off the legacy dark-red/gold arcade theme and interim edu palette onto the v5 reference palette
- Legacy + edu palettes deleted; vitest lint forbids any legacy token/hex from reappearing
- LuckyTitle arcade font retired; SHELL v23 -> v24

Per docs/prd/PRD-v5-visual-retention.md §4 A0+A1, phase 1 of 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes (already applied)

- **Spec coverage:** A0 deliverable 1 → Task 1 STYLE-TOKENS.md; deliverable 2 → Tasks 1–2 tokens/aliases (+ lint Task 7); deliverable 3 → Task 1 checklist + Task 7 walk. A1 backgrounds → Tasks 4–5 washes; buttons → Task 3; HUD → Task 6; typography check → EN/TH verify steps in every task; acceptance "no legacy color + npm test green" → Task 7 lint + suite.
- **Battle plaque/pinyin-above-hanzi:** already shipped by Visual Slice v1 (canvas-drawn `drawWordPlate`); out of scope here, re-verified via the checklist.
- **`--f-ui-*` frame vars:** untouched everywhere; `:root.has-ui-*` overrides use `background:none` shorthand which correctly clears the new gradients.
- **Type consistency:** token names in Tasks 3–6 all appear in Task 1's Interfaces list; the Task 7 lint's forbidden list matches exactly the names/hexes removed.
