"use strict";
// UI localization. Pure: no DOM, no localStorage (caller owns persistence,
// like shop.js/quests.js). String tables are bundled — file://- and offline-safe.
// Keys are dotted by screen: home.*, scope.*, learn.*, results.*,
// quest.*, scores.*, progress.*, shop.*, howto.*, common.*.

export const STRINGS = {
  en: {
    // home
    "home.tagline1": "Match each word to its meaning —",
    "home.tagline": "master real-exam HSK vocabulary.",
    "home.learn": "Learn",
    "home.smart": "Smart Review",
    "home.flashcards": "Flashcards",
    "home.collection": "Collection",
    "home.best": "Best Sessions",
    "home.progress": "Progress",
    "home.howto": "How to play",
    "home.sound": "Sound effects",
    // scope
    "scope.title": "Choose your words",
    "scope.levels": "Levels",
    "scope.filters": "Filters",
    "scope.highYield": "High-yield only",
    "scope.newOnly": "New words only",
    "scope.topN": "Top-N by frequency",
    "scope.all": "All",
    "scope.meaningLang": "Meaning language",
    "scope.english": "English",
    "scope.both": "Both",
    "scope.sessionLen": "Session length",
    "scope.custom": "Custom",
    "scope.customPh": "5–500",
    "scope.endless": "Endless",
    "scope.cards": "Cards",
    "scope.wordQuest": "Word Quest · {n}",
    "scope.smartReview": "Smart Review",
    "scope.smartReviewProgress": "Smart Review · {have}/8",
    "scope.smartReviewReady": "Smart Review · {n}",
    "scope.readout": "Pool: <b>{count}</b> words · ~<b>{pct}%</b> of exam text",
    "scope.readoutNoThai": "* {n} long-tail words have no Thai yet — English shown instead.",
    // learn / flashcards
    "learn.exit": "Exit",
    "learn.stillLearning": "Still learning",
    "learn.knowIt": "Know it",
    "learn.count": "{done} done · {left} left",
    // results
    "results.roundOver": "Round over",
    "results.missed": "Words you missed",
    "results.reviewWords": "Review Words",
    "results.practiceMissed": "Practice Missed Words",
    "results.playAgain": "Play again",
    "results.home": "Home",
    "results.banked": "+{score} coins banked · total {total}",
    "results.perfect": "Perfect round! +{bonus} coin bonus",
    "results.levelUp": "Level up! Lv {lv}",
    "results.levelUpUnlocked": "Level up! Lv {lv} — unlocked: {items}",
    "results.sub": "{acc}% accuracy · {words} words · {key}",
    "results.bestTag": "Best session!",
    "results.bestPrev": "best {prev}",
    "results.questComplete": "Quest complete: {desc} +{reward} coins",
    // quests (keyed by quest id from quests.js QUEST_POOL)
    "quest.status.done": "Done",
    "quest.status.open": "Open",
    "quest.reward": "+{reward} coins",
    "quest.correct30": "Answer 30 words correctly",
    "quest.combo5": "Reach a ×5 learning streak",
    "quest.boss1": "Complete a Review Challenge",
    "quest.perfect1": "Finish a round with no misses",
    "quest.review1": "Play a Smart Review round",
    "quest.learn20": "Mark 20 flashcards as known",
    // scores / progress
    "scores.title": "Best Sessions",
    "scores.empty": "No sessions yet — complete a Word Quest.",
    "progress.title": "Progress",
    "progress.needsWork": "Needs work",
    "progress.reviewThese": "Review these",
    "progress.practiceThese": "Practice These",
    "progress.nothing": "Nothing needs work — go play!",
    // shop / collection
    "shop.title": "Collection",
    "shop.skins": "Cat skins",
    "shop.backdrops": "Quest backdrops",
    "shop.effects": "Effects",
    "shop.sounds": "Sounds",
    "shop.street": "Street decorations",
    "shop.wallet": "Wallet: <b>{coins}</b> coins",
    "shop.buy": "Buy",
    "shop.equip": "Equip",
    "shop.equipped": "Equipped",
    "shop.onStreet": "On street",
    "shop.coins": "{coins} coins",
    // howto
    "howto.title": "How to play",
    "howto.oneShot": "You get one shot per word.",
    // common
    "common.back": "← Home",
    "common.language": "Language",
  },
  th: {
    // home
    "home.tagline1": "จับคู่คำศัพท์กับความหมาย —",
    "home.tagline": "เรียนรู้คำศัพท์ HSK จากข้อสอบจริง",
    "home.learn": "เรียน",
    "home.smart": "ทบทวนอัจฉริยะ",
    "home.flashcards": "บัตรคำ",
    "home.collection": "คอลเลกชัน",
    "home.best": "สถิติดีที่สุด",
    "home.progress": "ความคืบหน้า",
    "home.howto": "วิธีเล่น",
    "home.sound": "เสียงประกอบ",
    // scope
    "scope.title": "เลือกคำศัพท์",
    "scope.levels": "ระดับ",
    "scope.filters": "ตัวกรอง",
    "scope.highYield": "เฉพาะคำออกบ่อย",
    "scope.newOnly": "เฉพาะคำใหม่",
    "scope.topN": "จัดอันดับตามความถี่",
    "scope.all": "ทั้งหมด",
    "scope.meaningLang": "ภาษาของความหมาย",
    "scope.english": "อังกฤษ",
    "scope.both": "ทั้งสอง",
    "scope.sessionLen": "จำนวนคำต่อรอบ",
    "scope.custom": "กำหนดเอง",
    "scope.customPh": "5–500",
    "scope.endless": "ไม่จำกัด",
    "scope.cards": "บัตรคำ",
    "scope.wordQuest": "เควสต์คำศัพท์ · {n}",
    "scope.smartReview": "ทบทวนอัจฉริยะ",
    "scope.smartReviewProgress": "ทบทวนอัจฉริยะ · {have}/8",
    "scope.smartReviewReady": "ทบทวนอัจฉริยะ · {n}",
    "scope.readout": "คลังคำ: <b>{count}</b> คำ · ~<b>{pct}%</b> ของข้อสอบ",
    "scope.readoutNoThai": "* มี {n} คำที่ยังไม่มีภาษาไทย — แสดงภาษาอังกฤษแทน",
    // learn / flashcards
    "learn.exit": "ออก",
    "learn.stillLearning": "ยังไม่แม่น",
    "learn.knowIt": "รู้แล้ว",
    "learn.count": "ทำแล้ว {done} · เหลือ {left}",
    // results
    "results.roundOver": "จบรอบ",
    "results.missed": "คำที่ตอบผิด",
    "results.reviewWords": "ทบทวนคำ",
    "results.practiceMissed": "ฝึกคำที่ผิด",
    "results.playAgain": "เล่นอีกครั้ง",
    "results.home": "หน้าหลัก",
    "results.banked": "+{score} เหรียญ · รวม {total}",
    "results.perfect": "รอบสมบูรณ์แบบ! โบนัส +{bonus} เหรียญ",
    "results.levelUp": "เลื่อนระดับ! Lv {lv}",
    "results.levelUpUnlocked": "เลื่อนระดับ! Lv {lv} — ปลดล็อก: {items}",
    "results.sub": "แม่นยำ {acc}% · {words} คำ · {key}",
    "results.bestTag": "สถิติใหม่!",
    "results.bestPrev": "ดีที่สุด {prev}",
    "results.questComplete": "เควสต์สำเร็จ: {desc} +{reward} เหรียญ",
    // quests
    "quest.status.done": "สำเร็จ",
    "quest.status.open": "ยังไม่เสร็จ",
    "quest.reward": "+{reward} เหรียญ",
    "quest.correct30": "ตอบถูก 30 คำ",
    "quest.combo5": "ทำคอมโบเรียนรู้ ×5",
    "quest.boss1": "ผ่านด่านทบทวน",
    "quest.perfect1": "จบรอบโดยไม่ตอบผิด",
    "quest.review1": "เล่นรอบทบทวนอัจฉริยะ",
    "quest.learn20": "ทำเครื่องหมายรู้แล้ว 20 บัตร",
    // scores / progress
    "scores.title": "สถิติดีที่สุด",
    "scores.empty": "ยังไม่มีสถิติ — เล่นเควสต์คำศัพท์ก่อน",
    "progress.title": "ความคืบหน้า",
    "progress.needsWork": "ต้องฝึกเพิ่ม",
    "progress.reviewThese": "ทบทวนคำเหล่านี้",
    "progress.practiceThese": "ฝึกคำเหล่านี้",
    "progress.nothing": "ไม่มีคำที่ต้องฝึก — ไปเล่นกันเลย!",
    // shop / collection
    "shop.title": "คอลเลกชัน",
    "shop.skins": "สกินแมว",
    "shop.backdrops": "ฉากหลัง",
    "shop.effects": "เอฟเฟกต์",
    "shop.sounds": "เสียง",
    "shop.street": "ของตกแต่งถนน",
    "shop.wallet": "กระเป๋าเงิน: <b>{coins}</b> เหรียญ",
    "shop.buy": "ซื้อ",
    "shop.equip": "ใช้งาน",
    "shop.equipped": "ใช้งานอยู่",
    "shop.onStreet": "อยู่บนถนน",
    "shop.coins": "{coins} เหรียญ",
    // howto
    "howto.title": "วิธีเล่น",
    "howto.oneShot": "ตอบได้ครั้งเดียวต่อคำ",
    // common
    "common.back": "← หน้าหลัก",
    "common.language": "ภาษา",
  },
};

let locale = "en";

export function detectLocale(nav = (typeof navigator !== "undefined" ? navigator : {})) {
  return /^th/i.test(nav && nav.language ? nav.language : "") ? "th" : "en";
}

export function setLocale(l) {
  if (STRINGS[l]) locale = l;
}

export function getLocale() {
  return locale;
}

export function t(key, params) {
  const table = STRINGS[locale] || STRINGS.en;
  let s = key in table ? table[key] : (key in STRINGS.en ? STRINGS.en[key] : key);
  if (params) for (const k in params) s = s.split(`{${k}}`).join(String(params[k]));
  return s;
}
