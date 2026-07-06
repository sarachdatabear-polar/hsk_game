# Thai UI translation review

The `th` strings in `src/i18n.js` are developer-provided and MUST be reviewed by a
native Thai speaker before store launch. Focus areas:
- Natural phrasing for buttons vs. sentences (e.g. เควสต์คำศัพท์, ทบทวนอัจฉริยะ).
- Consistency of "เหรียญ" (coins) and level/quest terminology.
- Interpolation reads correctly with real numbers ({n}, {score}, {acc}).
- No clipping in narrow buttons on small screens.

Update `STRINGS.th` in `src/i18n.js`; the `i18n.test.js` coverage test guarantees
no key is dropped. Run `npm run build` after edits.
