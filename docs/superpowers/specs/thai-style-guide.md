# Thai Style Guide — Lucky Cat HSK

**Status: v0 DRAFT — awaiting Jordan's pilot calibration (2026-07-24).** After the
pilot review, fold every correction Jordan makes into a rule here and bump to v1.
Every Thai-producing worker MUST receive this file verbatim in its prompt.

## Voice

Warm, natural, spoken Thai — a Thai friend explaining, not a manual translating.
The narrator is a friendly lucky cat: playful, encouraging, never childish, never
bureaucratic.

## Hard bans (translationese markers)

Never produce these patterns:

- `ทำการ + verb` (ทำการบันทึก → บันทึก)
- `มีความ + adj` as a verb phrase (มีความสุขใจในการเล่น → สนุก)
- `ได้รับการ + verb` passive chains (ผู้ที่ได้รับการเชิญ → ผู้ได้รับเชิญ / แขก)
- `ซึ่ง` relative-clause chains where spoken Thai just starts a new clause
- Formal-register verbs where a person says the plain one: รับประทาน→กิน,
  สนทนา→คุย, บริโภค→กิน/ใช้, ประสงค์→อยาก, กระทำ→ทำ (unless the source word is
  itself formal — see register matching)
- Word-for-word possessive echo (“my hobby is…” → งานอดิเรกของฉันคือ… is fine
  once; don't re-attach ของฉัน to every noun in the sentence)
- Exhaustive sense lists mirroring English semicolons/commas

## UI copy (i18n)

- Short, natural app-Thai imperatives: เริ่มเลย, ลองอีกครั้ง — no จง…, no โปรด…
  (กรุณา acceptable in genuine polite requests, sparingly)
- Particles where a person would actually put them (นะ / เลย / กัน / แล้ว) —
  seasoning, not every string
- No ครับ/ค่ะ (the app has no speaker gender; keeps copy neutral-friendly)
- Keep Latin tokens the game already brands: Lv, XP, HSK, PWA; `{n}`-style
  placeholders stay untouched and grammar must survive any n
- Everyday vocabulary: ตั้งค่า, ร้านค้า, ด่าน are fine; avoid stiff SRS-jargon
  calques — "คำที่ถึงกำหนด" → "คำที่ถึงเวลาทบทวน" (say what it means)

## Word glosses (`thai` column)

- Give the word a Thai speaker actually says for the **English** sense; hanzi/pinyin
  are context only
- **Lead sense + max one more.** Second sense only when the English carries two
  truly distinct senses; separate with "; " (semicolon+space). Never three.
- **Register-match the source word:** everyday EN word → everyday Thai; formal/
  literary EN word → the corresponding formal Thai (เชิญ vs ชวน both exist for a
  reason)
- Verbs in plain form (no การ- nominalization unless the English is a noun)
- A short Thai parenthetical is allowed only to disambiguate a bare word that is
  genuinely ambiguous: ใช้ (เงิน)
- No trailing/leading spaces; no English words inside the Thai except unavoidable
  proper nouns

## Example sentences

- Translate the **meaning** of the sentence the way a Thai person would say it —
  not word-for-word; natural word order wins over structural fidelity
- Spoken register: ฉัน as default first person, เขา third person; กิน not
  รับประทาน
- ๆ attaches to its word, space after: จริงๆ เลย (matches the existing drafts)
- Thai uses no full stop; keep ! and ？→? only when the source is genuinely
  exclamatory/interrogative
- Small numbers as Thai words when a speaker would say them (สองสามวัน), digits
  for scores/quantities an app would show
- The Chinese target word's meaning must actually appear in the Thai sentence
  (a learner maps sentence → word)

## Consistency glossary (game terms)

| EN term | TH |
|---|---|
| streak | เรียนต่อเนื่อง |
| word / words | คำ / คำศัพท์ |
| review | ทบทวน |
| coins | เหรียญ |
| level (HSK) | ระดับ HSK {n} |
| level (cat growth) | Lv {n} (Latin, branded) |
| mastered | เชี่ยวชาญ (pending pilot — candidate: จำแม่นแล้ว) |
| quest | ภารกิจ |
| shop | ร้านค้า |
| street | ถนน (pending pilot — candidate: ย่าน) |

Add rows as workers hit recurring terms; conflicts resolve here, not per-batch.

## Calibration log

_(empty until Jordan's pilot review — record each correction as
"pattern → rule" so the full run inherits it)_
