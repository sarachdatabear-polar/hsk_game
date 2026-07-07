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
sand / sand / sky / ink). JS may use `var(--muted)`. Everything else uses `--lc-*` directly.

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
