# Frequency-tail example sentences — bounded sample + finding

_2026-07-19. #3 track. Jordan asked for a **bounded validated sample for
greenlight**, not a mass run. This is that sample plus what it revealed about the
tail. **No tail examples were shipped** — awaiting your call on the full run._

## The tail is bigger and lower-quality than "low value" implied

Words in HSK4–6 below the example-round frequency cap, lacking any example and
not already a cloze word:

| Level | Cap | Tail words without examples |
|---|---|---:|
| HSK4 | f = 1 | 939 |
| HSK5 | f ≤ 2 | 3,328 |
| HSK6 | f ≤ 3 | 6,685 |
| **Total** | | **~10,950** |

**The bigger issue is composition, not count.** Sampling the HSK4 f=1 tail, the
majority are **not standalone vocabulary** — they're the same mis-segmented
frequency-extraction artifacts #126 flagged, plus compositional n-grams and
proper nouns:

- fragments / counting phrases: `一万公里`, `一切都在`, `一切顺利`, `一亿多`, `一个个`
- compositional n-grams: `下周一` (next Monday), `不堵车` (no traffic jam),
  `上半场` (first half), `东北部`, `上下车`
- proper nouns: `万里` ("Wan Li, PRC politician")

A crude "looks like a real word" filter keeps only ~647 of 939 HSK4 f=1 rows,
and even those still include many marginal compositional entries. So generating
example sentences across the whole tail would **spend effort making flashcards
for non-words** — which is exactly why this was SKIPped, and it also quietly
reinforces the bad catalog entries #126 was about.

## The sample (clean subset, 10 rows, all pass the build validator)

Authored against `build_examples_data.py` rules (target hanzi present, ends with
。？！, body length 5–16, not a cloze word). All 10/10 validate:

| hanzi | example | en |
|---|---|---|
| 不准 | 这里不准停车。 | No parking here. |
| 不必 | 你不必担心这件事。 | You don't need to worry about this. |
| 不算 | 这点小事不算什么。 | This little thing is nothing. |
| 东北 | 冬天的东北很冷。 | The Northeast is cold in winter. |
| 东部 | 中国东部人口很多。 | Eastern China is densely populated. |
| 世界杯 | 他很喜欢看世界杯。 | He loves watching the World Cup. |
| 上班族 | 上班族每天都很忙。 | Office workers are busy every day. |
| 不诚实 | 他觉得说谎很不诚实。 | He thinks lying is dishonest. |
| 上下车 | 请注意上下车安全。 | Please mind your safety getting on and off. |
| 下周一 | 我们下周一再见面。 | We'll meet again next Monday. |

Quality on genuine words is good and shippable. The generation itself is not the
bottleneck — **word selection is.**

## Recommendation

Don't do a blanket ~11k-word run. Two better options:

1. **Curated real-word run** — first pass the tail through a "is this a real
   HSK vocabulary word" filter (drop counting-phrases, n-grams, proper nouns),
   which likely leaves ~1–2k genuine words across HSK4–6; generate + validate
   examples only for those. Ships real value, avoids reinforcing artifacts.
2. **Fold into the #126 cleanup instead** — the tail's artifacts are a *catalog
   data-quality* problem, not an examples gap. Cleaning them from
   `product/by-level` (removing non-words) is higher-leverage than papering over
   them with example sentences.

**My recommendation: option 1 if you want tail examples at all, but the SKIP was
sound** — the marginal tail word rarely needs a sentence a learner will see.
Greenlight a curated run, or leave SKIPped.
