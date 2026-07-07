# v6 Question Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three tap-based question formats (listening-first, reverse recall, tone recall) chosen per word by a mastery ladder inside the normal battle, with kind soft-intro moments.

**Architecture:** Two new pure modules — `src/pinyin.js` (tone-mark utilities) and `src/formats.js` (ladder + format registry that builds option data) — plus a thin refactor in `src/main.js`: `renderOptions`/`renderBossHanzi` merge into one `renderQuestion` driven by the registry, and `drawWordPlate` takes per-format visibility flags instead of a boolean. Spec: `docs/superpowers/specs/2026-07-07-v6-question-types-design.md`.

**Tech Stack:** Vanilla ES modules, vitest (`npm test`), no new dependencies, no build step (src/ is bundled to dist/app.js via `npm run build`; the service worker precaches the bundle, never src/).

## Global Constraints

- **No economy changes:** scoring, lives, combo, one-attempt rule identical across formats (spec "no fake difficulty").
- **Bosses unchanged:** the two-stage boss ritual keeps its exact current behavior; it never consults the ladder.
- **A4 first-run intro battle** (`introPhase === "battle"`) pins every word to the `meaning` format.
- **Audio safety:** a `listen` question must never be unanswerable — downgrade to `meaning` when no MP3 and `chooseTts() === "none"`.
- **Every user-facing string** goes through `i18n.js` with both `en` and `th` entries.
- **New src files must be added to the sw.js precache list** and `SHELL` bumped once (Task 6, not per-task).
- macOS BSD sed: `sed -n 'START,ENDp'` with computed numbers; `sed -n 'N,+Kp'` does NOT work.
- Commit after each task; message style: short imperative summary, body optional.

**Word record shape** (from `data/words.js`, used everywhere): `{ h: "你好", p: "nǐ hǎo", e: "hello", t: "สวัสดี", lv: 1, ... }`. Mastery record shape (from `src/mastery.js`): `store[hanzi] = { s: seen, k: correct, r: currentStreak, ls: lastSeenMs }`.

---

### Task 1: `src/pinyin.js` — tone-mark utilities

**Files:**
- Create: `src/pinyin.js`
- Test: `test/pinyin.test.js`

**Interfaces:**
- Consumes: nothing (pure text utility).
- Produces: `toneSlots(p) -> [{i, vowel, tone}]` (index into the string, base vowel `a|e|i|o|u|ü`, tone 1–4; neutral syllables have no slot), `retone(p, tones[]) -> string` (same slot count required), `toneVariants(p, rand?) -> string[3] | null` (3 wrong-but-plausible re-tonings, `null` when the pinyin has no tone marks). Task 2 imports `toneSlots` and `toneVariants`.

Design note (refines the spec): we never segment pinyin into syllables. Data pinyin already carries diacritics (`"nǐ hǎo"`, `"yīhuìr"`), so tone slots are exactly the marked vowel characters, and variants are produced by swapping a marked char for a different-tone mark of the same vowel. This sidesteps unspaced-syllable parsing, and ü/iu/ui/erhua placement is preserved for free.

- [ ] **Step 1: Write the failing test**

Create `test/pinyin.test.js`:

```js
import { describe, it, expect } from "vitest";
import { toneSlots, retone, toneVariants } from "../src/pinyin.js";

describe("toneSlots", () => {
  it("reads tones off the marked vowels", () => {
    expect(toneSlots("nǐ hǎo").map(s => s.tone)).toEqual([3, 3]);
    expect(toneSlots("nǐ hǎo").map(s => s.vowel)).toEqual(["i", "a"]);
  });
  it("neutral syllables contribute no slot", () => {
    expect(toneSlots("ma")).toEqual([]);          // 吗-style all-neutral
    expect(toneSlots("xièxie").length).toBe(1);   // second syllable neutral
  });
  it("handles ü and erhua", () => {
    expect(toneSlots("lǜ")).toEqual([{ i: 1, vowel: "ü", tone: 4 }]);
    expect(toneSlots("yīhuìr").map(s => s.tone)).toEqual([1, 4]);
  });
});

describe("retone", () => {
  it("roundtrips: reapplying the original tones is identity", () => {
    for (const p of ["nǐ hǎo", "lǜ", "yīhuìr", "xiǎng", "xièxie"]) {
      expect(retone(p, toneSlots(p).map(s => s.tone))).toBe(p);
    }
  });
  it("re-marks the same vowel positions", () => {
    expect(retone("nǐ hǎo", [2, 4])).toBe("ní hào");
    expect(retone("lǜ", [3])).toBe("lǚ");
  });
});

describe("toneVariants", () => {
  const firstRand = () => 0;
  it("single tone slot yields exactly the 3 other tones", () => {
    expect(new Set(toneVariants("mā", firstRand))).toEqual(new Set(["má", "mǎ", "mà"]));
  });
  it("variants are distinct from the original and each other", () => {
    for (let i = 0; i < 20; i++) {
      const v = toneVariants("nǐ hǎo", Math.random);
      expect(v).toHaveLength(3);
      expect(new Set(v).size).toBe(3);
      expect(v).not.toContain("nǐ hǎo");
    }
  });
  it("returns null when there are no tone marks", () => {
    expect(toneVariants("ma", firstRand)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/pinyin.test.js`
Expected: FAIL — `Cannot find module '../src/pinyin.js'`

- [ ] **Step 3: Write the implementation**

Create `src/pinyin.js`:

```js
// Tone-mark utilities for the v6 tone-recall format. We never segment pinyin
// into syllables: a "tone slot" is a marked vowel character in the string, so
// neutral syllables simply have no slot and mark placement (iu/ui, ü, erhua)
// is inherited from the data instead of recomputed.
const MARKED = {
  a: ["ā", "á", "ǎ", "à"], e: ["ē", "é", "ě", "è"], i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"], u: ["ū", "ú", "ǔ", "ù"], "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
};
const TONE_OF = {};
for (const [vowel, arr] of Object.entries(MARKED)) {
  arr.forEach((ch, k) => { TONE_OF[ch] = { vowel, tone: k + 1 }; });
}

export function toneSlots(p) {
  const slots = [];
  [...(p || "")].forEach((ch, i) => {
    if (TONE_OF[ch]) slots.push({ i, vowel: TONE_OF[ch].vowel, tone: TONE_OF[ch].tone });
  });
  return slots;
}

export function retone(p, tones) {
  const chars = [...p];
  toneSlots(p).forEach((s, k) => { chars[s.i] = MARKED[s.vowel][tones[k] - 1]; });
  return chars.join("");
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 3 wrong-but-plausible re-tonings: every single-slot tone change (the classic
// confusions), deduped, shuffled. null when the word has no tone marks at all
// (all-neutral particles like 吗/呢) — the caller must fall back to another format.
export function toneVariants(p, rand = Math.random) {
  const slots = toneSlots(p);
  if (!slots.length) return null;
  const orig = slots.map(s => s.tone);
  const cands = new Set();
  slots.forEach((s, k) => {
    for (let t = 1; t <= 4; t++) {
      if (t !== s.tone) {
        const tones = orig.slice();
        tones[k] = t;
        cands.add(retone(p, tones));
      }
    }
  });
  return shuffle([...cands], rand).slice(0, 3);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/pinyin.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pinyin.js test/pinyin.test.js
git commit -m "v6: pinyin tone-slot utilities (toneSlots/retone/toneVariants)"
```

---

### Task 2: `src/formats.js` — mastery ladder + format registry

**Files:**
- Create: `src/formats.js`
- Test: `test/formats.test.js`

**Interfaces:**
- Consumes: `pickDistractors(pool, target, rand)` from `src/distractors.js`; `meaning(w, lang) -> {main, sub}` from `src/pool.js`; `toneSlots`, `toneVariants` from `src/pinyin.js` (Task 1).
- Produces (Tasks 3–5 rely on these exact names):
  - `formatFor(word, rec, caps) -> "meaning"|"listen"|"reverse"|"tone"` — `rec` is the mastery record or `undefined`; `caps = { audio: boolean }`.
  - `FORMATS[format]` with fields: `plaque` (`{hz?, py?, icon?, mask?}` truthy flags), `audio` (`"always"|"setting"|"never"`), `intro` (i18n key or `null`), `buildOptions(word, deck, lang, rand) -> [{label, sub, correct}]` (always 4 entries, exactly one `correct: true`).

- [ ] **Step 1: Write the failing test**

Create `test/formats.test.js`:

```js
import { describe, it, expect } from "vitest";
import { formatFor, FORMATS } from "../src/formats.js";

const mk = (h, p, e, t) => ({ h, p, e, t, lv: 1, f: 50 });
const word = mk("你好", "nǐ hǎo", "hello", "สวัสดี");
const deck = [
  word,
  mk("谢谢", "xièxie", "thanks", "ขอบคุณ"),
  mk("水", "shuǐ", "water", "น้ำ"),
  mk("大", "dà", "big", "ใหญ่"),
  mk("狗", "gǒu", "dog", "หมา"),
  mk("吃", "chī", "to eat", "กิน"),
  mk("猫", "māo", "cat", "แมว"),
  mk("茶", "chá", "tea", "ชา"),
];
const rec = r => ({ s: r + 1, k: r, r, ls: 0 });
const caps = { audio: true };
const firstRand = () => 0;

describe("formatFor — the mastery ladder", () => {
  it("unseen and streak 0 get meaning-MC", () => {
    expect(formatFor(word, undefined, caps)).toBe("meaning");
    expect(formatFor(word, rec(0), caps)).toBe("meaning");
  });
  it("streak 1-2 get listening", () => {
    expect(formatFor(word, rec(1), caps)).toBe("listen");
    expect(formatFor(word, rec(2), caps)).toBe("listen");
  });
  it("streak 3-4 get reverse recall", () => {
    expect(formatFor(word, rec(3), caps)).toBe("reverse");
    expect(formatFor(word, rec(4), caps)).toBe("reverse");
  });
  it("streak 5+ gets tone recall", () => {
    expect(formatFor(word, rec(5), caps)).toBe("tone");
    expect(formatFor(word, rec(9), caps)).toBe("tone");
  });
  it("listen downgrades to meaning without audio", () => {
    expect(formatFor(word, rec(1), { audio: false })).toBe("meaning");
    expect(formatFor(word, rec(3), { audio: false })).toBe("reverse");
  });
  it("tone falls back to meaning for markless pinyin", () => {
    const neutral = mk("吗", "ma", "question particle", "ไหม");
    expect(formatFor(neutral, rec(5), caps)).toBe("meaning");
  });
});

describe("FORMATS registry", () => {
  it("meaning/listen options are meanings; one correct", () => {
    for (const f of ["meaning", "listen"]) {
      const opts = FORMATS[f].buildOptions(word, deck, "en", firstRand);
      expect(opts).toHaveLength(4);
      expect(opts.filter(o => o.correct)).toHaveLength(1);
      expect(opts.find(o => o.correct).label).toBe("hello");
    }
  });
  it("reverse options are hanzi with pinyin subs", () => {
    const opts = FORMATS.reverse.buildOptions(word, deck, "en", firstRand);
    expect(opts.find(o => o.correct)).toEqual(
      expect.objectContaining({ label: "你好", sub: "nǐ hǎo" }));
  });
  it("tone options are 4 distinct re-tonings incl. the real one", () => {
    const opts = FORMATS.tone.buildOptions(word, deck, "en", Math.random);
    expect(opts).toHaveLength(4);
    expect(new Set(opts.map(o => o.label)).size).toBe(4);
    expect(opts.find(o => o.correct).label).toBe("nǐ hǎo");
  });
  it("plaque flags follow the spec table", () => {
    expect(FORMATS.meaning.plaque).toEqual({ hz: true, py: true });
    expect(FORMATS.listen.plaque).toEqual({ icon: true });
    expect(FORMATS.reverse.plaque).toEqual({ mask: true });
    expect(FORMATS.tone.plaque).toEqual({ hz: true });
  });
  it("audio policy: listen always, tone/reverse never, meaning per setting", () => {
    expect(FORMATS.listen.audio).toBe("always");
    expect(FORMATS.meaning.audio).toBe("setting");
    expect(FORMATS.reverse.audio).toBe("never");
    expect(FORMATS.tone.audio).toBe("never");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/formats.test.js`
Expected: FAIL — `Cannot find module '../src/formats.js'`

- [ ] **Step 3: Write the implementation**

Create `src/formats.js`:

```js
// v6 question formats: the mastery ladder picks a format per word, and the
// FORMATS registry describes each format as data — what the walking plaque
// may reveal, the audio policy, the soft-intro string, and how to build the
// 4 option buttons. main.js renders; nothing here touches the DOM.
import { pickDistractors } from "./distractors.js";
import { meaning } from "./pool.js";
import { toneSlots, toneVariants } from "./pinyin.js";

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ladder: streak 0/unseen -> meaning, 1-2 -> listen, 3-4 -> reverse, 5+ -> tone.
// A miss resets the streak (mastery.js), so failures self-heal down the ladder.
export function formatFor(word, rec, caps = { audio: true }) {
  const r = (rec && rec.r) || 0;
  let f = r >= 5 ? "tone" : r >= 3 ? "reverse" : r >= 1 ? "listen" : "meaning";
  if (f === "listen" && !caps.audio) f = "meaning";      // no MP3 + no TTS
  if (f === "tone" && toneSlots(word.p).length === 0) f = "meaning"; // 吗/呢-style
  return f;
}

function meaningOptions(word, deck, lang, rand) {
  return shuffle([word, ...pickDistractors(deck, word, rand)], rand).map(o => {
    const m = meaning(o, lang);
    return { label: m.main, sub: m.sub, correct: o.h === word.h };
  });
}

export const FORMATS = {
  meaning: {
    plaque: { hz: true, py: true },
    audio: "setting",
    intro: null,               // today's format needs no introduction
    buildOptions: meaningOptions,
  },
  listen: {
    plaque: { icon: true },    // 🔊 only — the ear does the work
    audio: "always",
    intro: "battle.introListen",
    buildOptions: meaningOptions,
  },
  reverse: {
    plaque: { mask: true },    // ？？ like today's boss stage 2
    audio: "never",            // audio would say the answer
    intro: "battle.introReverse",
    buildOptions(word, deck, lang, rand) {
      return shuffle([word, ...pickDistractors(deck, word, rand)], rand)
        .map(o => ({ label: o.h, sub: o.p, correct: o.h === word.h }));
    },
  },
  tone: {
    plaque: { hz: true },      // hanzi only; pinyin would give the tones away
    audio: "never",
    intro: "battle.introTone",
    buildOptions(word, deck, lang, rand) {
      const wrong = toneVariants(word.p, rand) || [];
      return shuffle(
        [{ label: word.p, sub: "", correct: true },
         ...wrong.map(p => ({ label: p, sub: "", correct: false }))], rand);
    },
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/formats.test.js test/pinyin.test.js`
Expected: PASS (both files)

- [ ] **Step 5: Commit**

```bash
git add src/formats.js test/formats.test.js
git commit -m "v6: format registry + mastery-ladder picker (formats.js)"
```

---

### Task 3: `main.js` — merge renderOptions/renderBossHanzi into renderQuestion (behavior-preserving)

No new formats appear in this task. The goal is to route today's two question paths (regular meaning-MC, boss stage 2) through the registry so Task 4 is pure wiring. After this task the game must look and behave **identically**.

**Files:**
- Modify: `src/main.js` (functions around lines 831–870: `renderOptions`, `renderBossHanzi`; `answer` at ~872; `revealCorrect` at ~866; `spawnZombie` call at ~824; boss transition in `loop()` at ~1006)

**Interfaces:**
- Consumes: `FORMATS` from Task 2.
- Produces: `renderQuestion(word, format, promptKey)` — later tasks call it; option buttons carry `b._correct` (boolean) instead of `b._w` (word object); `answer(btn, opt)` reads `opt.correct`; `revealCorrect()` takes no argument.

- [ ] **Step 1: Add the import**

At the top of `src/main.js`, next to `import { pickDistractors } from "./distractors.js";` (line 3), add:

```js
import { FORMATS } from "./formats.js";
```

- [ ] **Step 2: Replace `renderOptions` and `renderBossHanzi` with `renderQuestion`**

Delete both function bodies (`function renderOptions(word){...}` and `function renderBossHanzi(word){...}`, currently `src/main.js:831-863`) and put in their place:

```js
// One renderer for every question format. Options come back from the FORMATS
// registry as plain data; promptKey (boss stage 2 / regular reverse) adds the
// full-width prompt row above the grid, reusing the boss-prompt styling.
function renderQuestion(word, format, promptKey){
  const deck = B.deck.length >= 8 ? B.deck : pool;
  const box = $("#opts");
  box.innerHTML = "";
  if(promptKey){
    const m = meaningOf(word, scope.lang);
    const prompt = document.createElement("div");
    prompt.className = "boss-prompt";
    prompt.textContent = t(promptKey, { meaning: m.main });
    box.appendChild(prompt);
  }
  for(const o of FORMATS[format].buildOptions(word, deck, scope.lang, Math.random)){
    const b = document.createElement("button");
    b.innerHTML = o.label + (o.sub? `<span class="th">${o.sub}</span>`:"");
    b._correct = !!o.correct;
    b.onclick = ()=>answer(b, o);
    box.appendChild(b);
  }
}
```

- [ ] **Step 3: Update the three consumers**

1. In `spawnZombie()` (~line 824), replace `renderOptions(w);` with:

```js
  renderQuestion(w, "meaning");
```

2. In `loop()`'s boss transition (~line 1006), replace `renderBossHanzi(bz.w);` with:

```js
      renderQuestion(bz.w, "reverse", "battle.bossPrompt");
```

3. In `answer(btn, o)` (~line 872), replace the line `const correct = o.h === z.w.h;` with:

```js
  const correct = !!o.correct;
```

4. Replace `revealCorrect` (~line 866):

```js
function revealCorrect(){
  document.querySelectorAll("#opts button").forEach(b=>{
    if(b._correct) b.classList.add("good");
  });
}
```

and change its two call sites (in the wrong-tap branch of `answer()` ~line 943 and in `bite()` ~line 980) from `revealCorrect(z.w);` to `revealCorrect();`.

- [ ] **Step 4: Check main.js's local `shuffle` for remaining users**

Run: `grep -n "shuffle" src/main.js`
The registry now owns option shuffling. If the only remaining hits are the local `function shuffle` definition itself, delete that function; if other call sites remain (e.g. deck shuffling), leave it.

- [ ] **Step 5: Full suite + manual smoke**

Run: `npm test`
Expected: 33 files / 534+ tests PASS (this refactor touches only untested DOM glue; any failure means a behavior change — stop and fix).

Manual smoke (dev server or `open index.html` per repo README): start a battle — meaning buttons look unchanged; reach word #10 (first boss): stage 1 meaning → stage 2 shows the "Review Challenge" prompt with hanzi+pinyin buttons, plaque masked to ？？ while walking, exactly as before.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "v6: renderQuestion refactor — boss + meaning paths through FORMATS registry"
```

---

### Task 4: wire the ladder — per-word formats, plaque flags, audio policy, replay button

**Files:**
- Modify: `src/audio.js` (add `audioAvailable`), `test/audio.test.js` (new case), `src/main.js` (`spawnZombie`, `drawWordPlate` + its call site ~line 1158, `renderQuestion`), `src/i18n.js` (2 keys × 2 languages), `index.html` (one CSS rule)

**Interfaces:**
- Consumes: `formatFor`, `FORMATS` (Task 2), `renderQuestion` (Task 3), `masteryStore` (existing, `src/main.js:65` area), `speak`/`chooseTts` (existing `src/audio.js`).
- Produces: `audioAvailable(hanzi) -> boolean` in `src/audio.js`; `z.format` set on every walker (`"meaning"` for bosses stage 1 and intro-battle words; the boss transition sets `z.format = "reverse"`); `drawWordPlate(z, vis, t)` where `vis = { mask, icon, py }` booleans. Task 5 relies on `z.format` and on `spawnZombie`'s format block.

- [ ] **Step 1: Failing test for `audioAvailable`**

In `test/audio.test.js`, add (match the file's existing import style — it already imports from `../src/audio.js`):

```js
import { initAudio, audioAvailable } from "../src/audio.js";

describe("audioAvailable", () => {
  it("true for bundled mp3s, false otherwise when no TTS exists (node env)", () => {
    initAudio(["你好"]);
    expect(audioAvailable("你好")).toBe(true);
    expect(audioAvailable("没有")).toBe(false); // node: no speechSynthesis, no Capacitor
  });
});
```

Run: `npx vitest run test/audio.test.js` — expected FAIL (`audioAvailable` not exported).

- [ ] **Step 2: Implement in `src/audio.js`**

Below `chooseTts()` add:

```js
// Can this word be spoken at all? (bundled mp3, or any TTS path)
export function audioAvailable(hanzi) {
  return mp3Set.has(hanzi) || chooseTts() !== "none";
}
```

Run: `npx vitest run test/audio.test.js` — expected PASS.

- [ ] **Step 3: Pick the format in `spawnZombie` and follow the audio policy**

In `src/main.js`, extend the audio import (line ~4, wherever `speak` is imported from `./audio.js`) with `audioAvailable`, and the formats import from Task 3 with `formatFor`:

```js
import { formatFor, FORMATS } from "./formats.js";
```

Then in `spawnZombie()` replace these two lines (~lines 823–824):

```js
  if(settings.autoSpeak) speak(w.h);
  renderQuestion(w, "meaning");
```

with:

```js
  const z = B.zombie;
  // v6 ladder: per-word format from the mastery streak. Bosses keep their own
  // two-stage ritual and the A4 intro battle stays meaning-only.
  z.format = (z.boss || introPhase === "battle") ? "meaning"
    : formatFor(w, masteryStore[w.h], { audio: audioAvailable(w.h) });
  const pol = FORMATS[z.format].audio;
  if(pol === "always" || (pol === "setting" && settings.autoSpeak)) speak(w.h);
  renderQuestion(w, z.format, z.format === "reverse" ? "battle.reversePrompt" : null);
```

And in the `loop()` boss transition (Task 3 step 3.2), set the format before rendering — replace:

```js
      renderQuestion(bz.w, "reverse", "battle.bossPrompt");
```

with:

```js
      bz.format = "reverse";
      renderQuestion(bz.w, "reverse", "battle.bossPrompt");
```

- [ ] **Step 4: Plaque visibility flags**

Replace the call site in the draw loop (`src/main.js:1158`):

```js
    const hideWord = z.boss && z.stage === "hanzi" && z.state === "walk";
    drawWordPlate(z, hideWord, t);
```

with:

```js
    // Format decides what the plaque may reveal while the word is live; any
    // resolution (kill/wrong/timeout) reveals everything, as before.
    const fl = FORMATS[z.format || "meaning"].plaque;
    const live = z.state === "walk" && !z.revealed;
    drawWordPlate(z, { mask: live && !!fl.mask, icon: live && !!fl.icon, py: !live || !!fl.py }, t);
```

In `drawWordPlate` (line 1241) change the signature and the first lines:

```js
function drawWordPlate(z, vis, t){
  const w = z.w, boss = z.boss, level = w.lv;
  const hanzi = vis.mask ? "？？" : vis.icon ? "🔊" : w.h;
  // pinyin off when: the format hides it (reverse/listen/tone while live), OR the player toggled it off
  const pinyin = (!vis.py || !settings.showPinyin) ? "" : w.p;
```

(The rest of the function body is untouched — it only reads `hanzi`/`pinyin`.)

- [ ] **Step 5: Replay button for listening questions**

In `renderQuestion` (Task 3), after the `promptKey` block, add:

```js
  if(format === "listen"){
    const rp = document.createElement("button");
    rp.className = "replay";
    rp.textContent = "🔊 " + t("battle.replay");
    rp.onclick = ()=> speak(word.h);   // never locked — replay is always allowed
    box.appendChild(rp);
  }
```

`lockOptions()` disables every `#opts button` including this one after resolution — acceptable (the word is revealed by then).

In `index.html`, next to the `.boss-prompt` rule (line ~306), add:

```css
  #opts .replay{grid-column:1/-1; font-weight:800; padding:8px 0;}
```

- [ ] **Step 6: i18n strings**

In `src/i18n.js`, in the `en` table next to `"battle.bossPrompt"` (line 155), add:

```js
    "battle.replay": "Play it again",
    "battle.reversePrompt": "Pick the hanzi for: {meaning}",
```

In the `th` table next to its `"battle.bossPrompt"` (line 306), add:

```js
    "battle.replay": "ฟังอีกครั้ง",
    "battle.reversePrompt": "เลือกตัวอักษรจีนของคำว่า: {meaning}",
```

- [ ] **Step 7: Full suite + manual verify of each format**

Run: `npm test` — expected all PASS.

Manual: in the browser console, seed a streak to force each rung, e.g.:
`localStorage.setItem("nbhsk.mastery", JSON.stringify({"你好":{s:6,k:6,r:5,ls:Date.now()}}))` (tone) — then `r:3` (reverse), `r:1` (listen). Start battles and confirm: listen → 🔊 plaque + auto-audio + replay row; reverse → ？？ plaque + prompt row + hanzi buttons; tone → hanzi-only plaque, 4 pinyin options differing only in tone marks; wrong tap / timeout reveals the full word in every format.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/audio.js src/i18n.js index.html test/audio.test.js
git commit -m "v6: mastery-ladder formats live in battle (listen/reverse/tone)"
```

---

### Task 5: soft-intro moments + free first attempt

**Files:**
- Modify: `src/main.js` (`spawnZombie` intro check, new `showFormatIntro`, `answer()` wrong branch ~line 936, `bite()` ~line 973), `index.html` (overlay markup + CSS), `src/i18n.js` (4 keys × 2 languages)

**Interfaces:**
- Consumes: `z.format` and the `spawnZombie` format block (Task 4), `FORMATS[f].intro` (Task 2), existing `z.frozen` walker-freeze, existing `store.get/set` localStorage helper.
- Produces: persisted `nbhsk.formatIntros` blob (`{listen:1, reverse:1, tone:1}` as formats get introduced); `z.introFree` flag consumed inside this task only.

- [ ] **Step 1: Overlay markup + CSS**

In `index.html`, immediately after the pause overlay's closing `</div>` (search `id="pause-overlay"`, find its matching close inside `#s-battle`), add:

```html
    <!-- v6 soft-intro: first-ever meeting of a question format. Walker is
         frozen (z.frozen) behind this; dismiss resets it to the spawn edge. -->
    <div id="format-intro">
      <div class="fi-card">
        <img src="assets/cat-guide.png" alt="" width="96">
        <p id="fi-text"></p>
        <button id="fi-ok"></button>
      </div>
    </div>
```

Next to the pause overlay's CSS (grep `#pause-overlay` in the `<style>` block), add — reuse the same button class the pause overlay's resume button uses if one exists (check `id="pause-resume"`'s class attribute and copy it onto `#fi-ok` instead of the button styles below if so):

```css
  #format-intro{position:absolute; inset:0; display:none; align-items:center;
    justify-content:center; background:rgba(31,45,42,.45); z-index:30;}
  #format-intro.on{display:flex;}
  #format-intro .fi-card{background:#FBF5E8; border:2px solid #B98F55;
    border-radius:16px; padding:18px 20px; max-width:280px; text-align:center;}
  #format-intro .fi-card p{margin:10px 0 14px; font-weight:700;}
  #fi-ok{font:inherit; font-weight:800; padding:10px 24px; border-radius:12px;
    border:2px solid #32775E; background:#EAF3EC;}
```

- [ ] **Step 2: Intro state + trigger in `spawnZombie`**

In `src/main.js`, next to `let settings = ...` (line 48), add:

```js
let formatIntros = store.get("formatIntros", {});   // v6: which formats have had their soft-intro
```

In `spawnZombie()`, replace the Task 4 audio-policy pair of lines:

```js
  const pol = FORMATS[z.format].audio;
  if(pol === "always" || (pol === "setting" && settings.autoSpeak)) speak(w.h);
```

with:

```js
  // v6 soft-intro: the first-ever appearance of a format freezes the walker,
  // the guide explains it in one line, and that word can never cost a life.
  const introKey = FORMATS[z.format].intro;
  if(introKey && !formatIntros[z.format]){
    formatIntros[z.format] = 1; store.set("formatIntros", formatIntros);
    z.frozen = true; z.introFree = true;
    showFormatIntro(introKey);
  }
  const pol = FORMATS[z.format].audio;
  // during an intro the audio waits for dismiss (played in showFormatIntro's OK)
  if(!z.frozen && (pol === "always" || (pol === "setting" && settings.autoSpeak))) speak(w.h);
```

- [ ] **Step 3: `showFormatIntro`**

Add below `renderQuestion` in `src/main.js`:

```js
function showFormatIntro(key){
  $("#fi-text").textContent = t(key);
  $("#fi-ok").textContent = t("battle.introOk");
  $("#format-intro").classList.add("on");
  $("#fi-ok").onclick = ()=>{
    $("#format-intro").classList.remove("on");
    const z = B.zombie;
    if(z && z.state === "walk"){
      z.x = B.w + 30;      // full runway — the intro must never eat thinking time
      z.frozen = false;
      if(FORMATS[z.format].audio === "always") speak(z.w.h);
    }
  };
}
```

- [ ] **Step 4: Free first attempt in `answer()` and `bite()`**

In the wrong-tap branch of `answer()` (currently starts `}else{` with the "ONE attempt per word" comment, ~line 936), replace:

```js
    B.combo = 0;
    sfx.wrong(); sfx.bite(); hapticWrong();
```

with:

```js
    B.combo = 0;
    const free = !!z.introFree;   // first-ever attempt of a new format: no heart lost
    sfx.wrong(); if(!free){ sfx.bite(); hapticWrong(); }
```

and three lines later replace:

```js
    B.lives--; B.flash = 1; B.screenShake = REDUCED_MOTION ? 0 : 1; B.resolved++;
```

with:

```js
    if(!free){ B.lives--; B.flash = 1; B.screenShake = REDUCED_MOTION ? 0 : 1; }
    B.resolved++;
```

In `bite()` (line 973), replace:

```js
  sfx.bite();
  B.lives--; B.flash = 1;
  B.resolved++;
```

with:

```js
  const free = !!(z && z.introFree);   // intro word timing out is also forgiven
  sfx.bite();
  if(!free){ B.lives--; B.flash = 1; }
  B.resolved++;
```

(The miss still goes through `noteAnswer`/`pushMiss` in both paths — the word is re-drilled; only the heart is spared.)

- [ ] **Step 5: i18n strings**

`en` table (next to the Task 4 additions):

```js
    "battle.introOk": "Got it!",
    "battle.introListen": "New: listen first! Play the sound and tap the meaning you hear.",
    "battle.introReverse": "New: you know this word — now pick its hanzi from the meaning!",
    "battle.introTone": "New: tone check! Tap the pinyin with the right tone marks.",
```

`th` table:

```js
    "battle.introOk": "เข้าใจแล้ว!",
    "battle.introListen": "ใหม่: ฟังก่อนนะ! กดฟังเสียงแล้วแตะความหมายที่ได้ยิน",
    "battle.introReverse": "ใหม่: คำนี้คุ้นแล้ว — เลือกตัวอักษรจีนจากความหมายเลย!",
    "battle.introTone": "ใหม่: เช็ควรรณยุกต์! แตะพินอินที่มีวรรณยุกต์ถูกต้อง",
```

- [ ] **Step 6: Full suite + manual verify**

Run: `npm test` — all PASS.

Manual: `localStorage.removeItem("nbhsk.formatIntros")`, seed a streak-1 word (Task 4 step 7 recipe), start a battle → on the listening word: walker frozen at the right edge, overlay with cat guide + "listen first" line; OK → walker resets to the edge, audio plays; tap a wrong answer → answer revealed, word queued to misses, hearts UNCHANGED; the next listening word gets no overlay (flag persisted). Repeat once for reverse (r:3) and tone (r:5).

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/i18n.js index.html
git commit -m "v6: soft-intro moments + free first attempt per format"
```

---

### Task 6: service worker + final verification

**Files:**
- Modify: `sw.js` (precache list + `SHELL` bump)

**Interfaces:**
- Consumes: everything above. Produces: shippable build.

- [ ] **Step 1: Precache the two new modules** [SUPERSEDED at final review: entries removed — deploys don't ship src/; only the SHELL bump stands]

In `sw.js`, find the precache array (grep `"src/`) and add alongside the other src entries:

```js
  "src/formats.js",
  "src/pinyin.js",
```

- [ ] **Step 2: Bump the shell version once for the whole v6 round**

`sw.js:5`: change `const SHELL = "nbhsk-shell-v28";` to:

```js
const SHELL = "nbhsk-shell-v29";
```

- [ ] **Step 3: Full suite**

Run: `npm test`
Expected: all files PASS — including `sw-precache.test.js` (it cross-checks the precache list against files on disk; if it fails listing a missing/extra entry, fix the sw.js list, not the test).

- [ ] **Step 4: End-to-end sanity**

Play one full round covering: a fresh word (meaning), the boss (both stages), plus the three seeded rungs from Task 4/5 recipes. Confirm scoring/combo/lives behave identically across formats and the results screen still shows misses correctly.

- [ ] **Step 5: Commit**

```bash
git add sw.js
git commit -m "v6: precache formats/pinyin modules, SHELL v29"
```

---

## Self-review notes (done at plan time)

- **Spec coverage:** ladder (T2), per-format plaque/audio/options (T2+T4), boss/intro-battle pinning (T4), audio downgrade (T2+T4 `audioAvailable`), tone fallback on markless pinyin (T2), soft intros + free first attempt incl. timeout (T5), i18n EN+TH (T4+T5), scoring untouched (no task touches scoring.js), sw bump (T6), tests per module (T1/T2/T4). Spec's "plaque shows the meaning" for reverse is implemented as ？？-plaque + full-width prompt row (the proven boss layout) — meaning text in the canvas plaque would break the CJK-sized layout; recorded here as an approved refinement.
- **Type consistency:** `formatFor(word, rec, caps)`; options `{label, sub, correct}`; `drawWordPlate(z, vis, t)` with `vis = {mask, icon, py}`; `z.format`, `z.introFree`, `formatIntros` blob — names match across tasks.
- **Placeholders:** none; every code step shows the code.
