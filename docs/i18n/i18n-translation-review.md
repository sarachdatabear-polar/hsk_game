# Thai UI translation review

## Status

**Owner action required before store launch:** no native-Thai approval is
recorded for `STRINGS.th` in `src/i18n.js`. Treat all 363 Thai values as draft,
even when they read naturally. A native reviewer should edit the source table,
then record the reviewer, date, and reviewed commit below.

Local engineering audit completed 2026-07-16:

- 363/363 English keys have Thai values.
- Every `{placeholder}` set matches its English source.
- Allowed inline HTML tag structure matches across languages.
- Every translatable value contains Thai script; the 12 exceptions are
  intentional codes, numbers, or input formats (`HSK`, `Lv`, `Top`, email,
  numeric ranges, star ratings, tone numbers, and progress fractions).
- The previously documented literal `{min}` Smart Review bug is fixed; the
  call site passes both `{have}` and `{min}`.
- Thai Profile layouts and the permanent 10-viewport responsive suite have
  passed locally. Layout checks do not replace linguistic review.

## Native-review order

Review by player risk rather than development date.

### P0 — money, account, and notifications

Review these prefixes/keys first because wording affects purchases, account
expectations, or notification tone:

- `iap.*`, `shop.getCoins`, `shop.supporter*`, `account.supporterChip`
- `item.supporter`, `item.coins_s`, `item.coins_m`, `item.coins_l`,
  `item.coins_xl`
- `account.*`
- `notify.streak.*`, `notify.comeback.*`, `toast.freeze-used`,
  `streak.restUsed`

Confirm especially that:

- purchase failure/processing copy never implies a completed charge;
- guest-account copy clearly explains the risk of losing access with the
  device;
- cloud-backup claims match actual behavior;
- notifications feel warm and never guilt the player;
- `supporter` remains hidden until its advertised ad-removal benefit exists.

### P1 — core learning and results

- `welcome.*`, `scope.*`, `learn.*`, `fc.*`
- `battle.*`, `tones.*`, `howto.*`
- `results.*`, `quest.*`, `quest.monthly.*`

Keep the learning terms consistent throughout: Word Quest, Smart Review,
Review Challenge, Review Pouch, Lucky Flow, mastery, pinyin, tone, and hanzi.
Read every interpolated sentence aloud with real values such as 1, 8, 20, and
100; Thai does not need English plural inflection, but classifiers and word
order must stay natural.

### P2 — Profile, collection, and world

- `profile.*`, `progress.*`, `album.*`, `sticker.*`, `milestone.*`
- `shop.*`, `item.*`, `season.*`
- `street.*`, `building.*`, `journey.*`, `nav.*`, `more.*`

Confirm the Thai brand terms (including `ถนนนำโชค`) and cosmetic item names.
Short labels must still make sense at 320 px without relying on truncation.

## Reviewer safety notes

- Edit plain text only. Do not add markup except the existing `<b>` pairs in
  `scope.readout` and `howto.*`.
- Preserve every placeholder exactly, including braces and spelling.
- `progress.levelRow` receives `{pct}` already wrapped in bold HTML; do not add
  a percent sign or another tag around it.
- Leave technical tokens such as HSK, XP, and `Lv` only when they are clearer
  to Thai players than a localized alternative.
- After edits run `npm test`, `npm run build`, and the EN+TH responsive sweep.

## Sign-off

- Native reviewer: _pending_
- Review date: _pending_
- Reviewed commit: _pending_
- Remaining exceptions approved by owner: _pending_
