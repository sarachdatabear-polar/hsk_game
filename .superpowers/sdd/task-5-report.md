# Task 5 report: soft-intro moments + free first attempt

## Route taken for #fi-ok styling

Grepped `pause-resume` in `index.html`: it is a **class** (`class="pause-resume"`, not an id-based
selector) applied to the pause overlay's resume button, with real button styling (gradient sun
background, brown border, shadow, active-press transform) defined at `.pause-resume{...}` /
`.pause-resume:active{...}` (index.html lines 207-212).

Per the brief's Step 1 note, I put `class="pause-resume"` directly on `#fi-ok` and **skipped** the
bespoke `#fi-ok{...}` button-styling block from the brief (font/padding/border/background rules).
Kept the `#format-intro`, `#format-intro.on`, `.fi-card`, and `.fi-card p` rules verbatim from the
brief, since those aren't covered by any existing pause-overlay class.

## Changes per file

### `index.html`
- Added the `#format-intro` overlay markup (cat-guide image, `#fi-text`, `#fi-ok` button) right
  after the pause-overlay's closing `</div>`, still inside `#s-battle` (confirmed `#s-battle` opens
  at line 740; the new markup sits between the pause-overlay's close and `#s-battle`'s close).
  `#fi-ok` carries `class="pause-resume"` (see route above) instead of a bare `id` for styling.
- Added CSS next to the `.pause-overlay`/`.pause-toggle` rules: `#format-intro`,
  `#format-intro.on`, `#format-intro .fi-card`, `#format-intro .fi-card p`. No `#fi-ok` CSS block
  added (styling comes from `.pause-resume`).
- Confirmed `assets/cat-guide.png` exists in the repo (used by the `<img>` tag).

### `src/main.js`
- Added `let formatIntros = store.get("formatIntros", {});` next to `let settings = ...` (line 49).
- In `spawnZombie()`, replaced the Task 4 audio-policy pair with the soft-intro check + the
  frozen-aware audio-policy line, exactly as the brief specifies (introKey lookup, formatIntros
  persistence, `z.frozen`/`z.introFree` flags, `showFormatIntro(introKey)` call, and the `!z.frozen`
  guard added to the speak-on-spawn condition).
- Added `showFormatIntro(key)` directly below `renderQuestion` (before `lockOptions`): sets
  `#fi-text`/`#fi-ok` text via `t()`, shows the overlay, and on OK dismiss resets `z.x` to the
  spawn edge, clears `z.frozen`, and replays audio for `always`-audio formats.
- In `answer()`'s wrong-tap branch: introduced `const free = !!z.introFree;`, gated `sfx.bite()` +
  `hapticWrong()` behind `!free`, and gated `B.lives--`/`B.flash`/`B.screenShake` behind `!free`
  while `B.resolved++` still always runs. Note: the actual file has `pushMiss(z.w); if(boss)
  noteAnswer(z.w.h, false);` between the two brief-quoted snippets (rather than exactly "three
  lines later") — preserved that line and applied the same free-attempt gating semantics.
- In `bite()`: added `const free = !!(z && z.introFree);`, gated `B.lives--`/`B.flash` behind
  `!free`; `sfx.bite()` and `B.resolved++` still run unconditionally.

### `src/i18n.js`
- Added the four keys (`battle.introOk`, `battle.introListen`, `battle.introReverse`,
  `battle.introTone`) to both the `en` and `th` tables, immediately after `battle.reversePrompt`
  (the Task 4 addition), verbatim from the brief.

## Self-review grep evidence

```
$ grep -n "formatIntros" src/main.js
49:let formatIntros = store.get("formatIntros", {});   // v6: which formats have had their soft-intro
832:  if(introKey && !formatIntros[z.format]){
833:    formatIntros[z.format] = 1; store.set("formatIntros", formatIntros);

$ grep -n "introFree" src/main.js
834:    z.frozen = true; z.introFree = true;
967:    const free = !!z.introFree;   // first-ever attempt of a new format: no heart lost
1011:  const free = !!(z && z.introFree);   // intro word timing out is also forgiven
```

- Set in `spawnZombie` (line 834), read in `answer()`'s wrong branch (line 967) and in `bite()`
  (line 1011). Both wrong-tap and timeout paths gate `B.lives--` behind `!free` — the intro word
  can never cost a life.
- The audio-policy line in `spawnZombie` (`if(!z.frozen && (pol === "always" || ...)) speak(w.h);`)
  now skips `speak()` while `z.frozen` (intro pending); `showFormatIntro`'s `#fi-ok` onclick
  handler replays audio for `always`-policy formats after dismiss.
- `FORMATS[f].intro` keys (`battle.introListen`/`battle.introReverse`/`battle.introTone`, checked
  in `src/formats.js`) match the four new i18n keys exactly; confirmed all four keys present in
  both `en` and `th` tables of `src/i18n.js`.
- `#format-intro` markup confirmed inside `#s-battle` (inserted before `#s-battle`'s closing
  `</div>`, after the pause-overlay's closing `</div>`).
- `z.frozen` confirmed as the walker-movement gate in `loop()`:
  `if(z.state==="walk"){ if(!z.frozen){ z.x -= ... } }` (line ~1049).

## Test results

`npm test` → **554 tests passed across 35 files**, 0 failures.

## Concerns

- None blocking.
- Step 6 (manual browser verify of the freeze/overlay/dismiss/no-repeat-overlay flow) was
  explicitly deferred per task instructions to Task 6's end-to-end check — not performed here.
- Found a stale, unrelated report already sitting at this path (from a prior "centralize
  production icons" task) — overwrote it with this task's report as instructed.
