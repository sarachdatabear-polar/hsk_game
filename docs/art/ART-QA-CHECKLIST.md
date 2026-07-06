# Art QA Checklist — Education-First Assets

Every asset must pass before its manifest `status` may reach `approved`/`integrated`.

## Visual
- [ ] Education palette only (warm paper, coral, jade, sky, sun-yellow, ink-navy, plum, leaf); gold is a minor accent.
- [ ] Soft storybook / cel-painted style; no casino gloss, no black-and-gold framing, no neon reward bursts.
- [ ] Character proportions consistent across every pose; friendly expression; readable at 64 px.
- [ ] No money bag / wealth medallion as the focal object.

## Technical
- [ ] Clean transparency where required; exact declared dimensions (`w`/`h`).
- [ ] Sprite-sheet frame math matches (`frameWidth*frames==w`, `frameHeight==h`).
- [ ] No baked-in Hanzi / pinyin / Thai / English / score / progress text.
- [ ] Backgrounds: low-detail center for dynamic content; detail near edges.

## Integration
- [ ] Loads through `src/assets.js`; CSS/canvas fallback still renders if the PNG is absent.
- [ ] `node scripts/validate-assets.mjs` exits 0; `npm run assets:report` lists it.

## Mobile / a11y
- [ ] Legible at on-screen size at 360×640, 390×844, 412×915.
- [ ] Thai labels not clipped; core actions visible; reduced-motion respected.
