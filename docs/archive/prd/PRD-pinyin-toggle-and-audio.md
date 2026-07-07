# PRD — Battle pinyin toggle + one-shot word audio

*Small feature round. Scope proposed 2026-07-06, pending sign-off. Two independent changes that ship together.*

---

## 1. Problem statement

Two friction points in the battle loop, both raised by the user:

1. **Pinyin is always on, for everyone.** The battle word plate always prints pinyin under the hanzi. For a learner past the beginner stage, that pinyin is a *crutch*: the eye reads the phonetics and never has to recall the character. There is no way to turn it off and quiz yourself on the character alone.
2. **The word is spoken twice.** Audio plays when the word walks in (on spawn) and then **again** when the player taps the correct answer. The second playback is redundant and, on a fast combo, overlaps/stutters. The user wants audio to fire once — at the start — and not repeat after the tap.

## 2. Why this is the right split (research)

The "battle only" scope is pedagogically deliberate, not arbitrary:

- Pinyin dependency is a documented effect, and the **interference is proficiency-dependent** — the crutch effect is strongest at lower levels, but experienced learners are specifically held back by leaning on pinyin over character orthography ([BYU eye-tracking thesis](https://scholarsarchive.byu.edu/etd/9461/); [Cambridge B:L&C study on pinyin activating character orthography](https://www.cambridge.org/core/journals/bilingualism-language-and-cognition/article/abs/reading-pinyin-activates-character-orthography-for-highly-experienced-learners-of-chinese/20B74CCBBBA28B3E1C5735833A3FD9E1)). So a **quiz** context is exactly where hiding pinyin pays off.
- Established Chinese apps already treat this as a per-context display choice: **Pleco lets you quiz on "Characters" only vs "Chars + Pron"** depending on your level ([AllSet Learning — Pleco flashcards](https://www.allsetlearning.com/news/how-to-use-pleco-flashcards)). We mirror that idea, applied to our quiz mode.

This gives us a clean model: **flashcards = study mode (pinyin always shown, it scaffolds), battle = quiz mode (pinyin optional, hiding it tests recall).** That's why the toggle lives in the battle and affects the battle only.

## 3. Pillars

- **P1 — Let advanced learners test character recognition.** One tap hides pinyin during the battle; the setting sticks across sessions.
- **P2 — Audio once, at the moment it matters.** The word is heard when it appears; no echo on the answer tap.

## 4. Non-goals

- **Flashcards are unchanged.** Pinyin stays on both faces of the flashcard; the `#fc-spk` manual replay button stays. (Per the user's "battle only" decision.)
- **No change to the on-spawn audio behavior** or the existing `#hud-audio` (autoSpeak) toggle — that already gates whether the word speaks on spawn.
- No new pure module (there is no new logic — this is a boolean setting + wiring, exactly like the existing `settings.autoSpeak`).
- No new npm deps, no build/framework change, no data-pipeline change, no backend.
- No new localStorage *keys* — the pinyin flag is an additive field on the existing `nbhsk.settings` object.

## 5. Features

### F1 — Battle pinyin toggle (`settings.showPinyin`)

**State.** Extend the existing settings object (`main.js:33`):
```js
let settings = Object.assign({autoSpeak:true, showPinyin:true}, store.get("settings", {}));
```
- Default **on** — existing players and first-timers see no change until they choose to hide it.
- Additive to `nbhsk.settings`; old saved objects load unchanged (missing field falls back to the `true` default). Satisfies the "additive localStorage" invariant.

**UI.** A new round HUD button `#hud-pinyin`, placed in the battle HUD next to `#hud-audio` (`index.html:420`). It mirrors the existing toggle-button pattern exactly:
- Icon convention like `sound`/`muted` and `bell`/`bell-off`: add a **`pinyin` / `pinyin-off`** symbol pair to `assets/ui-icons.svg` (a small phonetic-mark glyph; the `-off` variant slashed/dimmed).
- `title`/`aria-label` = "show pinyin" (static attribute, matching the other HUD buttons).
- Click handler mirrors `#hud-audio` (`main.js:369`): flip `settings.showPinyin`, `store.set("settings", settings)`, swap the icon via `setIconOnly`.
- `updateHud()` (`main.js:382`) sets the initial icon state, same as it does for `#hud-audio`.

**Wiring (battle plate only).** In `draw()` where `drawWordPlate` is called (`main.js:702`), pass pinyin only when enabled:
- When `settings.showPinyin` is false, pass `""` as the pinyin argument.
- `drawWordPlate` **already handles empty pinyin** — it shrinks the plate height (`lh = (pinyin ? 86 : 64)`) and vertically centers the hanzi (`main.js:758,791`). So hiding pinyin needs **no new layout code**; the plate just renders compact.
- Because `draw()` runs every frame, toggling mid-battle updates the current word live.
- The boss stage-2 "pick the hanzi" path already forces pinyin off; that behavior is preserved (it hides regardless of the setting).

### F2 — One-shot word audio (remove the answer-time replay)

- Delete the `speak(z.w.h)` call on a correct answer (`main.js:494`, the "sound sticks with the correct answer" line).
- After this, the only automatic speak in the battle is the on-spawn call (`main.js:405`), which stays gated by `settings.autoSpeak`. Result: **each word is spoken exactly once, when it walks in.**
- The flashcard spawn-speak (`main.js:271`) and the manual `#fc-spk` replay (`main.js:279`) are untouched.

## 6. Acceptance criteria

1. New `#hud-pinyin` button appears in the battle HUD; every `$("#id")` referenced in `main.js` still exists in `index.html` (DOM-id check passes).
2. Tapping it hides/shows the pinyin line on the battle word plate immediately, and the hanzi re-centers with no clipping at 360×640.
3. The choice persists: quit to home, start a new battle → pinyin state is retained. A `nbhsk.settings` object saved before this change still loads (defaults to pinyin **on**).
4. Flashcards still show pinyin on both faces regardless of the battle toggle.
5. In battle, a word is spoken **once** on spawn (when autoSpeak is on) and **not** again on a correct tap. With autoSpeak off, no automatic speak at all.
6. `npm test` green (existing ~30 tests unaffected — no pure-module change), `npm run build` clean.

## 7. Files touched

- `src/main.js` — settings default; `#hud-pinyin` handler; `updateHud` icon; gate pinyin in the `drawWordPlate` call; remove the answer-time `speak`.
- `index.html` — new `#hud-pinyin` button in the HUD.
- `assets/ui-icons.svg` — `pinyin` / `pinyin-off` symbols.
- `sw.js` — bump `SHELL` cache version on ship (user-facing change).
- `docs/V2-EXECUTION-PLAN.md` / `docs/USER-CHECKLIST.md` — status + playtest items on ship.

## 8. Risks / notes

- **Icon design** is the only genuinely new asset. If a bespoke glyph is fussy, fallback is a text-label toggle ("拼" shown/dimmed) — but the SVG-symbol route keeps the HUD visually uniform.
- Removing the answer-time speak is safe for the boss flow: line 494 is only the audio call; the adjacent `noteAnswer`/scoring lines are independent.
