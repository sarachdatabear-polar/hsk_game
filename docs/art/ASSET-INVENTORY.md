# Asset Inventory & Casino-Cue Audit — Education-First Redesign

Baseline audit captured before the education-first redesign (Phase A).

## 1. Current runtime image assets (`assets/`)
| File | Used by | Keep / Replace / Retheme |
|---|---|---|
| bg-home.png | `#s-home` background (layered over gradient, index.html ~243) | Replace (bg-home education) |
| bg-battle.png | `#s-battle` background (index.html ~182) | Replace (bg-quest) |
| bg-market.png / bg-temple.png / bg-bamboo.png | shop backdrops (purchasable) | Retheme later |
| cat-walk.png / cat-happy.png | player sprite (canvas) | Replace (education cat) |
| cat-{midnight,sakura,jade,gold,boss}-{walk,happy}.png | shop skins / boss | Retheme later |
| maneki.png | mascot | Replace (education maneki) |
| coin.png / lantern.png / cloud.png | HUD/decor | Demote gold (coin secondary) |
| btn-learn/shop/scores/progress/howto/sound.{png,svg} | home icon-row gold discs | Replace w/ icon family + soft surfaces |
| ui-icons.svg | all inline glyphs (`<use>`) | Extend to education set (Task B5) |

## 2. Casino / gambling cues found (must be removed or demoted)
| Cue | Where | Fix (phase) |
|---|---|---|
| Dark luxury base `#1a0d0d`, maroon panels | `:root`, `html,body`, panels | Warm paper palette (B1/B2) |
| Gold-heavy buttons, plaques, HUD pills, gold discs | `.big.gold`, `.hud-pill`, `.hud-round`, `.icon-btn` | Demote gold to accent (B2/B3/B5) |
| Coin-first status on Home | `#home-wallet` leads the pill row | Learning actions lead (B4/B6) |
| "Battle / Fight misses / Fight these" combat language | index.html + main.js | Education labels (B4) |
| "×N combo" combat framing | `#hud-combo`, quests.js | Learning Streak (B4) |
| "Lucky Shop" purchase framing | `#s-shop` | Collection (B4) |
| Casino-red crimson feedback accents | `#hud .combo`, flashes | Jade/coral education accents (B2) |

## 3. Fallback routines that MUST survive (never removed)
| Surface | Fallback | Source |
|---|---|---|
| Cat / sprites | `canvas` vector draw | `cat.js`, `sprites.js` |
| Backgrounds | CSS gradient under `url()` | index.html |
| UI frames | CSS `background`/gradient | index.html |
| Effects | canvas particle routines | `fx.js` |
| Audio | Web Speech fallback when mp3/index missing | `audio.js` |
