// Tiny hand-built dataset: 妈妈 recycled from lv1 into lv2; 高兴 new at lv2.
export const LEVELS = {
  "1": [
    { h: "妈妈", p: "mā ma", e: "mother", t: "แม่", lv: 1, f: 50, ta: 5, tt: 5, c: 1, n: 1 },
    { h: "水",   p: "shuǐ",  e: "water",  t: "น้ำ", lv: 1, f: 30, ta: 4, tt: 5, c: 1, n: 1 },
    { h: "猫",   p: "māo",   e: "cat",    t: "",    lv: 1, f: 2,  ta: 1, tt: 5, c: 0, n: 1 }
  ],
  "2": [
    { h: "妈妈", p: "mā ma", e: "mother", t: "แม่",   lv: 2, f: 40, ta: 6, tt: 6, c: 1, n: 0 },
    { h: "高兴", p: "gāo xìng", e: "happy", t: "ดีใจ", lv: 2, f: 25, ta: 6, tt: 6, c: 1, n: 1 },
    { h: "跑",   p: "pǎo",   e: "to run", t: "วิ่ง",  lv: 2, f: 1,  ta: 1, tt: 6, c: 0, n: 1 }
  ]
};
export const MANIFEST = {
  levels: {
    "1": { freq_total: 82 },
    "2": { freq_total: 66 }
  }
};
