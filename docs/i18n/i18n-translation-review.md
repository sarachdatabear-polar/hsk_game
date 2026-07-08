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

New strings awaiting native-speaker review (i18n pass 2 — Task 1: howto body, flashcard
Thai-missing fallback, street caption formats, shop item names, street building names;
wiring for these lands in Task 2):

| Key | EN | TH |
| --- | --- | --- |
| `scope.smartReviewProgress` | Smart Review · {have}/{min} | ทบทวนอัจฉริยะ · {have}/{min} |
| `fc.noThai` | no Thai yet | ยังไม่มีภาษาไทย |
| `street.captionEmpty` | Lucky Cat Street — grows as you learn · {next} | ถนนนำโชค — เติบโตไปพร้อมการเรียนรู้ของคุณ · {next} |
| `street.captionProgress` | {unlocked}/{total} buildings · {next} | {unlocked}/{total} อาคาร · {next} |
| `street.next` | Next: Lv {lv} — {name} | ถัดไป: Lv {lv} — {name} |
| `street.allUnlocked` | All buildings unlocked! | ปลดล็อกอาคารครบทุกหลังแล้ว! |
| `howto.intro` | A lucky cat strolls in from the right carrying a `<b>`Chinese word`</b>` (with pinyin) on a flag. | แมวนำโชคเดินเข้ามาจากด้านขวา พร้อมธงที่มี`<b>`คำศัพท์จีน`</b>` (พร้อมพินอิน) |
| `howto.tapMeaning` | Tap the `<b>`correct meaning`</b>` and the cat celebrates your answer. The farther away the cat still is, the bigger the practice bonus — and learning streaks build your score. | แตะ`<b>`ความหมายที่ถูกต้อง`</b>` แล้วแมวจะฉลองคำตอบของคุณ ยิ่งแมวอยู่ไกลเท่าไร โบนัสก็ยิ่งมากขึ้น — และสตรีคการเรียนรู้ช่วยเพิ่มคะแนน |
| `howto.oneShotDetail` | A wrong tap costs a heart — no second guesses. The correct answer flashes green so you learn it for next time. | แตะผิดเสียหัวใจไปหนึ่งดวง — ไม่มีโอกาสแก้ตัว คำตอบที่ถูกต้องจะกะพริบสีเขียวให้คุณจำไว้ใช้ครั้งต่อไป |
| `howto.tooSlow` | Too slow counts too: if the cat wanders all the way across without an answer, that costs a heart. Three hearts and the round is over. | ช้าเกินไปก็เสียหัวใจเหมือนกัน หากแมวเดินข้ามจอไปโดยไม่มีคำตอบ จะเสียหัวใจหนึ่งดวง ครบสามดวงจบรอบทันที |
| `howto.everyWord` | Every word shows `<b>`pinyin`</b>` and can be `<b>`heard aloud`</b>` — during the game, in flashcards, and in the missed-words review. | ทุกคำแสดง`<b>`พินอิน`</b>`และสามารถ`<b>`ฟังเสียงได้`</b>` — ทั้งระหว่างเล่นเกม ในบัตรคำ และตอนทบทวนคำที่ตอบผิด |
| `howto.learnMode` | `<b>`Learn mode`</b>` drills the same word pool as flashcards first, so you can study, then play. | `<b>`โหมดเรียนรู้`</b>`ฝึกคลังคำเดียวกับบัตรคำก่อน เพื่อให้คุณได้ทบทวนก่อนเริ่มเล่น |
| `item.midnight` | Midnight | เที่ยงคืน |
| `item.sakura` | Sakura | ซากุระ |
| `item.jade` | Jade | หยก |
| `item.gold` | Gold | ทองคำ |
| `item.market` | Night Market | ตลาดกลางคืน |
| `item.temple` | Temple Dawn | รุ่งอรุณที่วัด |
| `item.bamboo` | Bamboo | ไผ่ |
| `item.sakura-fx` | Sakura Petals | กลีบซากุระ |
| `item.firecracker-fx` | Firecrackers | ประทัด |
| `item.bells` | Temple Bells | ระฆังวัด |
| `item.arcade` | Arcade | อาร์เคด |
| `item.red-lantern` | Red Lantern | โคมแดง |
| `item.noodle-stall` | Noodle Stall | แผงก๋วยเตี๋ยว |
| `item.tea-sign` | Tea Sign | ป้ายชา |
| `item.foo-dog` | Foo Dog | สิงโตหิน |
| `item.golden-arch` | Golden Arch | ซุ้มประตูทอง |
| `item.panda` | Panda | แพนด้า |
| `item.ninja` | Ninja | นินจา |
| `item.astronaut` | Astronaut | นักบินอวกาศ |
| `item.harbor-night` | Harbor Night | ท่าเรือยามค่ำคืน |
| `item.snow-festival` | Snow Festival | เทศกาลหิมะ |
| `item.mahjong-table` | Mahjong Table | โต๊ะไพ่นกกระจอก |
| `item.koi-pond` | Koi Pond | บ่อปลาคาร์ป |
| `item.drum-tower` | Drum Tower | หอกลอง |
| `item.bubble-tea` | Bubble Tea Stand | ร้านชานมไข่มุก |
| `item.paper-umbrella` | Paper Umbrella | ร่มกระดาษ |
| `item.goldfish-banner` | Goldfish Banner | ธงปลาทอง |
| `item.neon-cat-sign` | Neon Cat Sign | ป้ายไฟแมวนีออน |
| `item.lion-drum` | Lion Dance Drum | กลองเชิดสิงโต |
| `item.star-shower` | Star Shower | ฝนดาว |
| `item.beach` | Beach Cat | แมวชายหาด |
| `item.island-sunset` | Island Sunset | พระอาทิตย์ตกที่เกาะ |
| `item.shaved-ice-cart` | Shaved-Ice Cart | รถเข็นน้ำแข็งไส |
| `item.mooncake-rabbit` | Mooncake Rabbit | กระต่ายขนมไหว้พระจันทร์ |
| `item.lantern-festival` | Lantern Festival | เทศกาลโคมไฟ |
| `item.mooncake-stall` | Mooncake Stall | แผงขนมไหว้พระจันทร์ |
| `item.dragon` | Dragon | มังกร |
| `item.dragon-gate` | Dragon Gate | ประตูมังกร |
| `item.firecracker-arch` | Firecracker Arch | ซุ้มประทัด |
| `building.lantern-post` | Lantern Post | เสาโคมไฟ |
| `building.coin-bank` | Coin Bank | ธนาคารเหรียญ |
| `building.tailor` | Tailor Shop | ร้านตัดเสื้อ |
| `building.kitten-cafe` | Kitten Café | คาเฟ่ลูกแมว |
| `building.emperor-gate` | Emperor's Gate | ประตูจักรพรรดิ |

Note on `scope.smartReviewProgress`: the value changed from a hard-coded
`.../8` to `.../{min}` per the pass-2 brief (parameterizing the Smart-Review
minimum). The call site in `main.js` (`renderScope`) does not yet pass a
`min` param — that wiring lands in Task 2. Until then this key renders the
literal text `{min}` unreplaced if exercised in the running app; it is not
covered by any existing runtime test, so `npm test` stays green, but this is
a known transitional gap the Task 2 agent must close first.
