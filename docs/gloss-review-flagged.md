# Gloss rewrite — flagged for your review (item 2)

**2938 unique-hanzi glosses rewritten** (covering all 3,417 `+` entries; now 0 remain). All 1,383 tests pass. Applied on branch `feat/ui-polish-1` — **not merged to main**.

You do **not** need to read all 2938. Review the **255 flagged** below. The other
2,683 are "high-confidence" — meaning **no worker flagged them**, not that they're
independently verified; your sign-off on those is trust, not proof. To calibrate that
trust I hand-audited a random **45 of the high-confidence set** (Sonnet-generated, the
weakest model) against hanzi+pinyin: **0 real errors** (one awkward wording). So the
bulk is sound, but if you want extra assurance, spot-read a few more from
`data/gloss-overrides.json` (the full map).

Reading: **hanzi | old (broken) | → new gloss | note**. These flagged ones matter most: a *confidently-worded but wrong* gloss is worse than obvious junk (the learner trusts it), so these — not the high-confidence bulk — are where a wrong meaning could hide. Tell me any to change.


---

## 1. LOW confidence — most uncertain (33 · read these)

Mostly **pipeline fragments** (clipped mid-phrase — not real words; a deeper dedup issue, not a gloss issue) and **proper nouns / historical terms**.

| hanzi | old | → new | why flagged |
|---|---|---|---|
| 时会 | time, when + can; be able to | **sometimes** | fragment, likely from 有时会... |
| 菜点 | dish, food + o'clock | **to order dishes** | unusual word order, source too mangled t |
| 一小 | one + small, little | **a little** | likely fragment of a longer word (e.g. 一 |
| 吃吃饭 | sound word sound of muffled laught | **to eat a meal** | likely duplicated character, garbled sou |
| 多纳 | many, much + to receive | **Duona (name)** | proper noun, unclear referent |
| 明景泰 | Ming Dynasty (1368-1644) + Jingtai | **Jingtai (Ming dynasty era)** | likely a name/era reference |
| 来不 | to come + not, no | **unable to (in time)** | hanzi looks truncated |
| 药都 | medicine + all, both | **Medicine Capital (city known for herbs)** | epithet for a city famous for medicine |
| 马公子 | Makung city in Penghu county (Pesc | **young master Ma (name)** | term of address / possible place name |
| 是从 | (text fragment: 'to be' + 'from') | **is from** | text fragment, not a standalone word |
| 越长越 | generic word for peoples or states | **the more it grows, the more...** | text fragment of 越...越 pattern |
| 座楼 | seat + house with more than 1 stor | **building (multi-story)** | fragment of a phrase like 'this/whole bu |
| 一大 | one + big | **a big... (fragment)** | likely part of a longer phrase, e.g. 一大早 |
| 中投 | China + to cast | **China Investment Corp. (abbr.); or mid-range shot** | ambiguous, possibly finance abbr. or bas |
| 多次重 | many times + to repeat | **repeated many times** | likely truncated from 多次重复/重申 |
| 应天 | to agree (to do something) + day | **Yingtian (old name for Nanjing)** | archaic/place-name usage, source too ter |
| 张大 | Zhang surname + big | **to open wide (eyes/mouth)** | could also be a name, Zhang Da |
| 知音卡 | intimate friend + to stop | **Zhiyin card (named membership/phone card)** | likely a brand/product name, source mang |
| 一个顶 | one of + apex | **one is worth (as much as)** | likely a fragment of a longer idiom |
| 四绝 | four + to cut short | **four unique masterpieces** | ambiguous set-phrase fragment |
| 天禧 | day + joy | **Tianxi (Song-dynasty era name)** | proper noun |
| 子花 | son + flower | **seed head of a flower** | unclear standalone term, possibly trunca |
| 工用 | work + to use | **for practical/work use** | uncommon combination |
| 待制 | to stay + system | **waiting to be summoned (imperial official title)** | archaic/historical term |
| 教坊 | to teach + lane usually as part of | **imperial music bureau (historical)** | archaic institution name |
| 水监 | water + to supervise | **water bureau (ancient office)** | obscure historical term |
| 永元 | forever + yuan currency | **Yongyuan (Han dynasty era name)** | historical era name |
| 秋水共长天一色 | limpid autumn waters (trad. descri | **autumn waters merging with the sky (poetic line)** | famous literary quote |
| 认起来 | to recognize + to stand up | **to start to look/seem recognizable** | unusual phrasing, meaning uncertain out  |
| 连蛋白 | to link + egg white | **even the egg white** | hanzi looks truncated/unclear context |
| 通惠 | to go through + favor | **Tonghui (a place/canal name)** | proper name, e.g. Tonghui River in Beiji |
| 项符合 | back of neck + in keeping with | **item(s) that match** | hanzi looks truncated |
| 地拉 | adverbial marker + to pull | **to drag along the ground** | isolated fragment; possibly part of 地拉那  |

## 2. MED confidence — sense/ambiguity calls (222)

Reasonable but I picked among senses or the word is ambiguous. Skim for anything off.

| hanzi | old | → new | note |
|---|---|---|---|
| 一下四周 | do something a bit, briefly + al | **all around (briefly)** | fragment, exact context unclear |
| 中原地区 | Central Plain, the middle and lo | **the Central Plains region (of China)** | source text was truncated |
| 人不知 | person, people + not to know | **others don't know/understand (you)** | fragment of Analects line 人不知而不愠 |
| 做起 | to do, to make + to rise | **to start doing** | fragment |
| 再有 | again + to have, there is | **to have more; furthermore** | fragment, context-dependent |
| 卡里 | to stop + inside, in | **on the card (balance)** | fragment, context-dependent |
| 却说 | but + to speak, to say | **meanwhile (narrative transition)** | classical narrative connector, e.g |
| 可不 | can + not, no | **exactly; indeed** | colloquial intensifier |
| 多万 | many, much + ten thousand | **more than X0,000** | fragment, needs preceding number |
| 多公里 | many, much + kilometer | **more than X kilometers** | fragment, needs preceding number |
| 多分钟 | many, much + minutes | **more than X minutes** | fragment, needs preceding number |
| 多发 | many, much + to send out | **to occur frequently** | fragment, context-dependent |
| 多场 | many, much + threshing floor | **several (matches/events)** | fragment, needs preceding number |
| 多块 | many, much + measure word for yu | **more than X yuan** | fragment, needs preceding number |
| 多岁 | many, much + years old | **more than X years old** | fragment, needs preceding number |
| 多座 | many, much + seat | **many (mountains/buildings)** |  |
| 大都城 | Dadu, capital of China during th | **Dadu (former name of Beijing)** | historic place name |
| 学馆 | to study, to learn + building | **academy; school (archaic term)** | archaic usage |
| 少洗 | few, little + to wash | **wash less (often)** | context-dependent shorthand |
| 少留 | few, little + to leave a message | **leave less (behind); don't stay long** | ambiguous sense of liu |
| 就让 | then + to let, to make | **just let** | fragment |
| 常有 | always + to have, there is | **often; frequently occurring** | fragment |
| 怕人 | to be afraid + person, people | **afraid of people; shy around people** | colloquial sense could also be 'fr |
| 怪不 | bewildering + not, no | **no wonder** | truncated from 怪不得 |
| 承印 | Cheng (c. 2000 BC), third of the | **to print (on behalf of someone)** | printing-industry term |
| 数多 | to count + many, much | **numerous, large in number** |  |
| 新石器时 | Neolithic + time, when | **Neolithic period** | hanzi looks truncated (新石器时代) |
| 有变 | to have, there is + to change | **there's a change** | terse fragment |
| 有神 | to have, there is + God | **full of life (eyes, expression)** | could also mean 'believes in gods' |
| 林里 | Japanese surname Hayashi + insid | **in the forest** | could also be a person's name |
| 琉璃厂 | colored glass + "cliff" radical  | **Liulichang (a street in Beijing)** | proper place name |
| 直隶省 | Ming and Qing dynasty province d | **Zhili Province (historical China)** | historical place name |
| 真够 | real, really + enough sufficient | **really enough; quite (extreme)** | colloquial intensifier, likely fra |
| 真的假 | really, truly + fake | **real or fake?** | likely fragment of 真的假的 |
| 穿厚 | to wear, to put on + thick | **to dress warmly (wear thick clothes)** | terse fragment |
| 红学家 | "Redology", academic field devot | **scholar of Redology (Dream of the Red Chamber studies)** | specialized academic term |
| 红学界 | "Redology", academic field devot | **the field of Redology** | specialized academic term |
| 胡床 | non-Han people, esp. from centra | **ancient folding stool** | historical term |
| 舍不 | to give up + not, no | **can't bear to (part with)** | fragment of 舍不得 |
| 贵在 | expensive + at, in | **the value lies in** | fragment, depends on following cla |
| 路上车 | on the way + car, vehicle | **car on the road** | possible fragment |
| 跳龙门 | to jump + Longmen county in Huiz | **to leap the dragon gate (idiom for success)** | from carp leaping to become a drag |
| 车族 | car, vehicle + race | **car-owning group** | informal 'X族' demographic term |
| 鉴定家 | to appraise + home, family | **appraiser; expert evaluator** | less common compound |
| 雨花石 | Yuhua district of Changsha city, | **rain flower pebble (decorative stone)** | famous stone from Nanjing |
| 高密县 | Gaomi county level city in Weifa | **Gaomi County (a place)** | proper place name |
| 龙门镇 | Longmen county in Huizhou, Guang | **Longmen Town (a place)** | proper place name |
| 一举两 | a move + two of something | **two birds with one stone (fragment)** | truncated from 一举两得 |
| 一分 | one + minute | **one minute** | could also mean one point |
| 一列 | one + to arrange | **one row; one train** | measure word, context-dependent |
| 一动 | one + (of something) to move | **a movement, a stir** | measure-word fragment |
| 一匹 | one + mate | **one (bolt of cloth/horse)** | pǐ is a measure word, counted noun |
| 一响 | one + echo | **a ring/sound** | measure-word fragment |
| 一所 | one + actually | **one (institution/building)** | bare measure word |
| 一番 | one + foreign non-Chinese | **a bout/spell of (effort)** | measure-word fragment |
| 一笔 | one + pen | **a sum (of money)** | could also mean 'one stroke' |
| 一股 | one + thigh | **a whiff/strand; one share** | measure-word, multiple senses |
| 一通 | one + to go through | **a spell (of action)** | abstract usage, counted noun uncle |
| 三官 | three + government official | **Three Officials (Daoist deities)** | ambiguous, could be literal 'three |
| 三毛 | three + hair | **San Mao (author's pen name)** | ambiguous, could mean 'three cents |
| 三班 | three + team | **class three; shift three** | context-dependent |
| 三秋 | three + autumn | **three autumns; three years** | figurative usage ambiguous |
| 三笔 | three + pen | **three strokes; three sums (money)** | measure-word, multiple senses |
| 不成方圆 | won't do + perimeter | **without rules, nothing succeeds (idiom fragment)** | truncated from 没有规矩不成方圆 |
| 东巴 | east + Ba state during Zhou dyna | **Dongba (Naxi shaman culture)** | specific ethnic/cultural term |
| 两幅 | two of something + width | **two (paintings/rolls of cloth)** | measure word fú, counted noun unce |
| 两座 | two of something + seat | **two (buildings/structures)** | measure word zuò, counted noun unc |
| 两笔 | two of something + pen | **two (sums of money)** | measure word bǐ, counted noun unce |
| 主义者 | -ism + (after a verb or adjectiv | **believer (in an ideology)** | suffix forming '-ist'; picked gene |
| 之能事 | literary possessive particle + p | **one's utmost skill** | classical fragment, usually part o |
| 九月九 | September + nine | **September 9th (Double Ninth Festival)** | date reference, could be plain dat |
| 二月河 | February + river | **Eryue He (author's pen name)** | person name |
| 五大 | five + big | **the five major** | truncated, likely part of a longer |
| 五座 | five + seat | **five (mountains/buildings)** | 座 counts mountains/buildings/bridg |
| 五月天 | May + day | **May (weather/days)** | literal reading, not the band name |
| 交子 | to hand over + son | **jiaozi (early Chinese paper currency)** | obscure historical term |
| 余处 | archaic I + to reside | **other places; elsewhere** | yú as 'remaining/extra' |
| 借景 | to lend + bright | **borrowed scenery (garden design technique)** | specific garden-design term |
| 先借 | early + to lend | **to borrow first** | fragment, context-dependent |
| 先抓 | early + to grab | **to grab/tackle first** | terse fragment |
| 光送 | light + to give a gift | **to only give as a gift** | fragment, context-dependent |
| 八条 | eight + strip | **eight (long thin items)** | measure word context |
| 再慢 | again + slow | **even slower** | comparative 再+adj |
| 几头 | how many + head | **how many (head of livestock)** | measure word tóu |
| 几幅 | how many + width | **how many (paintings/pieces)** | measure word fú |
| 几首 | how many + head | **how many (songs/poems)** | measure word shǒu |
| 出云 | to go out + (classical) to say | **clouds emerge** | could also be place name Izumo |
| 刀切 | knife + to cut | **to cut with a knife** | possibly refers to idiom 一刀切 'one- |
| 分餐制 | separate meals + system | **separate-plate dining system** | specific cultural/dining term |
| 包小包 | to cover + packet | **bags big and small** | likely truncated from 大包小包 |
| 千愁 | thousand + to worry about | **a thousand worries** | literary usage |
| 千方 | thousand + square | **by every means** | truncated from 千方百计 |
| 单斜 | bill + inclined | **monoclinic (crystallography)** | technical term |
| 双胞 | two + placenta | **twins** | likely truncated from 双胞胎 |
| 只怕有心人 | I'm afraid that... + resolute pe | **as long as one is determined** | fragment of proverb 世上无难事，只怕有心人 |
| 和文 | and + language | **Japanese (language/writing)** | 和文 = Japanese text, easy to misrea |
| 哪部 | which + ministry | **which one (film/book)** |  |
| 四极 | four + extremely | **the four poles/extremities** |  |
| 园林化 | gardens + to make into | **landscaped; turned into a garden** | less common derived term |
| 图书大厦 | books (in a library or bookstore | **book plaza (large bookstore)** | 图书大厦 as a proper-noun-style bookst |
| 川流 | river + to flow | **to flow like a river** | truncated from 川流不息 |
| 常会 | always + can; be able to | **often will** | terse fragment |
| 开来 | to open + to come | **to open up; spread out** | used as verb complement, needs pre |
| 弥漫型 | to pervade + mold | **diffuse type** | technical/medical term |
| 所用 | actually + to use | **used (by); that which is used** | fragment, meaning depends on conte |
| 换批 | to exchange + to ascertain | **to switch to a new batch** | unusual combination |
| 推掉 | to push + to fall | **to push away; to decline (an offer)** | two related senses |
| 数最多 | to count + at most | **the largest number** | fragment, needs context |
| 斧劈 | hatchet + to hack | **to chop with an axe** | also a painting-stroke technique t |
| 方可 | square + can | **only then** | usu. pairs with a preceding condit |
| 施胶 | to grant + to glue | **to size (apply glue coating, papermaking)** | technical term |
| 无核白 | nonnuclear + white | **seedless white (grape variety)** | specific cultivar name |
| 更具 | to change or replace + tool | **more (possessing a quality)** | fragment, typically followed by a  |
| 松烟 | pine + cigarette or pipe tobacco | **pine soot (ink-making material)** | ambiguous / low-context confidence |
| 极具 | extremely + tool | **greatly (possesses)** | e.g. 极具特色 = highly distinctive |
| 树王 | tree + Wang surname | **king tree (oldest/largest tree)** | could also be a name |
| 案几 | (legal) case + how many | **small low table/desk** | less common word |
| 欢乐谷 | gaiety + grain | **Happy Valley (theme park)** | proper name of a park chain |
| 款识 | section + to know | **inscription (on bronze/porcelain)** | specialized art/antiquities term |
| 此岸 | this + bank | **this shore (the mundane world)** | often Buddhist term, opposite of 彼 |
| 殿阁 | palace hall + pavilion usu. two- | **palace halls and pavilions** | literary/architectural term |
| 汽车族 | car + race | **car-owning group** | informal 'X族' demographic term |
| 流长 | to flow + long | **long-flowing (history)** | often part of 源远流长 |
| 海光 | ocean + light | **glimmer of the sea; sea light** | literary/poetic usage |
| 滑跑 | to slip + to run | **to taxi (aircraft)** | could also mean 'to slide while ru |
| 满坡 | Manchu ethnic group + slope | **the whole slope (covered with something)** | fragment, usually followed by a no |
| 满山 | Manchu ethnic group + mountain | **the whole mountain (covered with something)** | fragment, usually followed by a no |
| 满鲜花 | Manchu ethnic group + flower | **full of flowers** | likely fragment of a longer phrase |
| 漏窗 | to leak + shutter | **lattice window (Chinese garden feature)** | specific architectural term |
| 照见 | to shine + to see | **to shine light on; illuminate** | less common verb sense |
| 王大怒 | Wang surname + angry | **Wang became furious (name)** | sentence fragment with surname Wan |
| 王本来 | Wang surname + original | **Wang originally... (name)** | sentence fragment with surname Wan |
| 生活化 | life + to make into | **made more practical/everyday** | abstract usage varies by context |
| 用书 | to use + book | **to use a book; reference book** | ambiguous verb-object vs noun |
| 皮纸 | leather + paper | **tough handmade paper** | a type of Chinese paper |
| 盖碗茶 | lidded teacup + tea | **lidded-bowl tea** | specific tea-serving style |
| 相袭 | each other + to attack | **to follow one another (tradition)** | carried down/copied from each othe |
| 砍凿 | to chop + chisel | **to chop and hew** | rare/literary word |
| 神品 | God + article | **divine work; masterpiece** | rare usage |
| 秦晋之好 | Qin dynasty (221-207 BC) of the  | **marriage alliance (idiom)** | idiom from the states Qin & Jin in |
| 第一台 | first + Taiwan short for | **first (unit/machine)** | tái is a measure word, exact noun  |
| 第二支 | second + to support | **second (one, e.g. team/pen)** | zhī is a measure word, counted nou |
| 红楼 | red + house with more than 1 sto | **red mansion (building)** | could reference a specific buildin |
| 细节决定 | details + to decide to do someth | **details determine (the outcome)** | truncated phrase |
| 绝处 | to cut short + to reside | **desperate situation; dead end** | less common word |
| 缺少美 | lack + the Americas | **lacking beauty** | terse fragment |
| 耳生 | ear + to be born | **unfamiliar-sounding** | lit. 'strange to the ear' |
| 聊个 | to chat + general measure word | **to chat a bit** | terse fragment |
| 联系实际 | connection + reality | **to connect with reality** | phrasing could vary by context |
| 胞胎 | placenta + fetus | **twins (as in 双胞胎)** | usually appears within a larger co |
| 茶食 | tea + to eat | **tea snacks** | less common compound |
| 融为 | to melt + as; in the role of | **to merge/blend into (one)** | fragment of 融为一体 |
| 行笔 | row + pen | **brushwork (calligraphy)** | how the brush moves while writing |
| 西城 | the West + city walls | **west side of a city** | also a district name (Xicheng) in  |
| 西山 | the West + mountain | **Xishan (a place)** | generic name, multiple places shar |
| 西流 | the West + to flow | **to flow westward** | terse fragment |
| 西溪 | the West + creek | **West Creek (a place)** | proper place name |
| 词坛 | word + platform | **poetry (ci) circle** | literary term, less common |
| 购物满 | shopping + Manchu ethnic group | **(spend) over a set amount shopping** | truncated promotional phrase, e.g. |
| 走法 | to walk + France | **way of moving (e.g. chess move)** | ambiguous / low-context confidence |
| 越忙 | generic word for peoples or stat | **the busier** | fragment of 越...越... pattern |
| 跳跃性 | to jump + nature | **erratic; jumpy quality** | abstract usage varies by context |
| 辞赋 | to resign + poetic essay | **classical Chinese poetic prose** | literary genres 'ci' and 'fu' |
| 这块 | this + measure word for yuan or  | **this one (piece/yuan)** | measure word ambiguous without con |
| 这笔 | this + pen | **this (sum of money/deal)** | bǐ is a measure word, counted noun |
| 这部 | this + ministry | **this (film/vehicle/work)** | measure-word fragment |
| 遗篇 | to lose + sheet | **a work left behind (posthumous writing)** | ambiguous / low-context confidence |
| 那幅 | that + width | **that (painting/scroll)** | measure-word fragment |
| 醉卧 | intoxicated + to lie | **to lie drunk** | literary phrase |
| 镜头感 | camera lens + to feel | **camera presence; photogenic sense** | ambiguous / low-context confidence |
| 难得糊涂 | seldom + muddled | **better to play dumb sometimes (idiom)** | well-known idiom, hard to compress |
| 雨来 | rain + to come | **the rain comes / Yulai (a name)** | owner-flagged ambiguous |
| 面墙 | noodles + wall | **a wall** | measure-word fragment |
| 首都体育馆 | capital (city) + gym | **Capital Gymnasium (a place)** | proper noun, stadium in Beijing |
| 一传十 | one + to pass on + ten | **one tells ten (word spreads)** | fragment of 一传十,十传百 |
| 一分货 | one + minute + goods | **you get what you pay for** | part of 一分钱一分货 |
| 一切都在 | everything + all, both + at, in | **everything is present/here** | fragment |
| 一切都是 | everything + all, both + to be;  | **everything is** | sentence fragment; gloss of the ph |
| 七八年 | seven + eight + year | **seven or eight years** | could also mean the year 1978 in c |
| 中国公学 | China + public + to study, to le | **China Public School (historical college)** | proper name of an early-20th-c. Sh |
| 五里亭 | five + inside, in + pavilion | **Wuli Pavilion (a place)** | place/pavilion name |
| 先苦后甜 | early + bitter + after, behind + | **hardship first, sweetness later** | idiom |
| 再借不难 | again + to lend + not, no + diff | **then borrowing again is easy** | from proverb 有借有还，再借不难 |
| 刘半农 | (classical) a type of battle-ax  | **Liu Bannong (writer/poet)** | proper name |
| 十传百 | ten + to pass on + hundred | **ten tell a hundred (word spreads)** | part of 一传十,十传百 |
| 多万张 | many, much + ten thousand + Zhan | **over ten thousand sheets** | fragment; 张 counts sheets |
| 多亿年 | many, much + 100 million + year | **over a hundred million years** | fragment following a number, e.g.  |
| 天章阁 | day + chapter + pavilion usu. tw | **Tianzhang Pavilion (a place)** | Song-era hall name |
| 已有近 | already + to have, there is + ne | **already nearly (a number)** | fragment; e.g. 已有近百年 |
| 快给我 | fast + to give + I, me | **hurry, give it to me** | imperative fragment |
| 才会赢 | only just + can; be able to + to | **only then can you win** | fragment, e.g. from 爱拼才会赢 |
| 施以援 | to grant + to use + to help | **to lend a helping hand** | fragment of 施以援手 |
| 有借有还 | to have, there is + to lend + to | **always return what you borrow** | first half of a proverb |
| 李方膺 | Li surname + square + breast | **Li Fangying (Qing dynasty painter)** | proper name; identity inferred |
| 真让人 | real, really + to let, to make + | **really makes one (feel)** | sentence fragment |
| 让你在 | to let, to make + you + at, in | **to let you stay/be at** | sentence fragment |
| 运粮河 | to move + grain + river | **grain-transport canal** | may be a specific canal name |
| 逞一时之 | to show off + a period of time + | **to indulge a momentary (impulse)** | fragment of 逞一时之快/勇 |
| 马行空 | horse + row + empty | **a galloping horse across the sky (unfettered)** | fragment of 天马行空 |
| 鸡蛋里挑 | egg + inside, in + to carry on a | **to nitpick (find fault)** | fragment of 鸡蛋里挑骨头 |
| 鹤年堂 | crane + year + (main) hall | **Heniantang (an old pharmacy)** | famous Beijing medicine shop name |
| 学到老 | to study, to learn + to arrive + | **keep learning into old age** | from 活到老学到老 |
| 活到老 | to live + to arrive + prefix use | **live to old age** | from 活到老学到老 |
| 阿姆斯特 | prefix used before monosyllabic  | **Amster- (as in Amsterdam)** | truncated transliteration |
| 下过 | down, below + experience marker | **has rained (or snowed) before** | 过 = past-experience; assumes rain/ |
| 不了 | as a resultative verb suffix una | **unable to finish (verb complement)** | grammatical; sense depends on prec |
| 地守护 | adverbial marker + to guard | **to guard (over)** | fragment with adverbial 地 |
| 开了个 | to open + completed-action marke | **opened a** | fragment; verb+aspect+measure |
| 房地 | house + adverbial marker | **real estate; housing land** | clipped form; usually part of 房地产 |
| 打着 | to hit + ongoing-action marker | **holding up / carrying on** | sense depends on context |
| 电影吧 | movie, film + suggestion or soft | **let's watch a movie** | 吧 softens a suggestion; fragment |
| 穷人的孩子早当家 | poor people + possessive marker  | **poor children shoulder responsibility early** | proverb |
| 般的 | sort + possessive marker | **like; similar to** | bound form 般 'like/as'; needs a pr |
| 赶着 | to overtake + ongoing-action mar | **hurrying; driving (livestock)** | two senses depending on context |
| 八一 | eight + one | **August 1st (Army Day)** | owner-flagged ambiguous |
| 八五 | eight + five | **eighty-five** | owner-flagged ambiguous |
| 八百里 | eight + two-character surname Ba | **eight hundred li (a great distance)** | 里 = unit of distance; could be Bai |
| 六一 | six + one | **June 1st (Children's Day)** | owner-flagged ambiguous |
| 乐乐 | happy + happy | **to enjoy oneself; Lele (a name)** | could be the given name Lele |
| 打打 | to hit + to hit | **to give it a hit; to play** | context-dependent |
| 聪聪 | quick at hearing + quick at hear | **Congcong (a name)** | owner-flagged ambiguous |
| 许许 | to allow + to allow | **many; a great many** | likely from 许许多多; standalone rare |

## 3. Hard-bucket high-confidence — quality sample (40 of 415)

Idioms, aspect, ordinals, names — a window so you can gauge the hard set without reading all of it.

| hanzi | old | → new |
|---|---|---|
| 帮不了 | to help + no thanks used to politely | **can't help** |
| 为您服务 | as; in the role of + you politely +  | **at your service** |
| 亲眼看到 | with one's own eyes + to look, to wa | **to see with one's own eyes** |
| 高高的 | tall, high + tall, high + possessive | **tall; high** |
| 十七八年 | seventeen + eight + year | **seventeen or eighteen years** |
| 做点事 | to do, to make + o'clock + matter, t | **to do a bit of work** |
| 词儿 | word + suffix | **word; line of speech** |
| 受过伤 | to receive + experience marker + to  | **to have been injured** |
| 一草一木 | one + grass + one + tree | **every blade of grass and tree** |
| 第十届 | ordinal-number prefix + ten + to a | **the tenth (session)** |
| 八大处 | eight + big + to reside | **Badachu (a place in Beijing)** |
| 用之不竭 | to use + literary possessive particl | **inexhaustible** |
| 被忽视 | passive marker by + to neglect | **to be ignored; overlooked** |
| 满满的 | full + possessive marker | **full; brimming** |
| 浇地 | to pour liquid + adverbial marker | **to irrigate fields** |
| 小小的 | very small + possessive marker | **tiny; small** |
| 值得一看 | to be worth + one + to look, to watc | **worth seeing** |
| 水调歌头 | water + to transfer + song + head | **Shuidiao Getou (a ci poetry tune)** |
| 靠着 | to lean against or on + ongoing-acti | **leaning against** |
| 没吃过 | not; do not have + to eat + experien | **have never eaten** |
| 试了试 | to test + completed-action marker +  | **gave it a try** |
| 成竹在胸 | to succeed + bamboo + at, in + chest | **to have a well-thought-out plan** |
| 夹着尾巴 | to press from either side + ongoing- | **with tail between the legs** |
| 每件事 | every, each + measure word for cloth | **every matter** |
| 寄信人 | to send + letter + person, people | **sender of a letter** |
| 四五块 | four + five + measure word for yuan  | **four or five yuan** |
| 创造性地 | creativeness + adverbial marker | **creatively** |
| 小有名气 | small, little + famous + gas | **fairly well-known** |
| 用劲儿 | to use + strength + suffix | **to exert effort** |
| 前半部 | front, before + half + ministry | **the first half** |
| 总有一天 | inevitably there will be + one + day | **one day, eventually** |
| 落霞与孤鹜齐飞 | to leave out + rose-tinted sky or cl | **sunset glow flies with a lone wild duck** |
| 第三 | ordinal-number prefix + three | **third** |
| 一两个 | one + two of something + general mea | **one or two** |
| 老电影 | prefix used before the surname of a  | **an old movie** |
| 中到大雪 | China + to arrive + Daxue or Great S | **moderate to heavy snow** |
| 快停了 | fast + to stop + completed-action ma | **about to stop** |
| 从那以后 | from + that + after | **from then on** |
| 视觉暂留 | sight + temporary + to leave a messa | **persistence of vision** |
| 那句话 | that + sentence + dialect | **that sentence; those words** |

## Gameplay safety check (distractors)

Rewording can make two words share a gloss, which `distractors.js` excludes from
being each other's wrong-answers. Measured: same-gloss collisions rose **+132
words (0.6%)**, all **genuine synonyms** (此次/这次 → "this time"; 看清/看清楚 →
"to see clearly"; 孩子/小孩/儿童 → "child"). Largest cluster is 9 words out of
~10,000 in the level, so no question becomes unanswerable. No action needed.

Separate pre-existing smell (NOT from this rewrite): single characters like 上, 个
carry a useless "used in" gloss. Worth a future cleanup, out of scope here.

## Owner-default decisions I baked in (veto any)

- 六一 → **June 1st (Children's Day)**, 八一 → **August 1st (Army Day)** (common readings, not bare digits)
- 雨来 → **the rain comes / Yulai (a name)**; 乐乐/聪聪 → treated as given names
- Verb reduplication (走走, 尝尝) → base verb + "(a bit)" to keep the casual softening

