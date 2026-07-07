# Thai UI translation review

The `th` strings in `src/i18n.js` are developer-provided and MUST be reviewed by a
native Thai speaker before store launch. Focus areas:
- Natural phrasing for buttons vs. sentences (e.g. เควสต์คำศัพท์, ทบทวนอัจฉริยะ).
- Consistency of "เหรียญ" (coins) and level/quest terminology.
- Interpolation reads correctly with real numbers ({n}, {score}, {acc}).
- No clipping in narrow buttons on small screens.
- Keep translations plain text — a few strings are injected as HTML; never add markup beyond the existing `<b>` tags in `scope.readout` / `shop.wallet`.

Update `STRINGS.th` in `src/i18n.js`; the `i18n.test.js` coverage test guarantees
no key is dropped. Run `npm run build` after edits.

## Pending review

New strings awaiting native-speaker review (v7 Shop Seasons — Task 7):

| Key | EN | TH |
| --- | --- | --- |
| `shop.daily` | Today's Stock | สินค้าวันนี้ |
| `shop.dailyNote` | New stock at midnight | ของใหม่มาตอนเที่ยงคืน |
| `shop.season` | Season Corner | มุมเทศกาล |
| `shop.seasonUntil` | Available until {date} | มีถึง {date} |
| `shop.seasonReturns` | 🏮 {name} set returns {date} | 🏮 เซ็ต {name} จะกลับมา {date} |
| `shop.upgrade` | Upgrade {stars} ({coins}) | อัปเกรด {stars} ({coins}) |
| `shop.maxed` | ★★★ | ★★★ |
| `season.summer` | Summer | ฤดูร้อน |
| `season.midautumn` | Mid-Autumn | ไหว้พระจันทร์ |
| `season.cny` | Lunar New Year | ตรุษจีน |
