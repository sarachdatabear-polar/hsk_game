# Lucky Cat HSK game-first onboarding with recommended account setup

**Date:** 2026-07-31  
**Status:** Revised UX recommendation  
**Companion:** [Production UX and payment audit](2026-07-31-production-ux-payment-audit.md)

## Product decision

The first playable experience must be **Word Quest**, not Flashcards.

Flashcards are a useful supporting tool, but opening the app with them teaches the wrong
mental model. A new player can reasonably conclude that Lucky Cat is a flashcard app
with a game added afterward. The intended product is the opposite:

> Lucky Cat is a Chinese vocabulary game. Flashcards, Tone Trainer, and Smart Review
> help the player improve between quests.

Account creation is the recommended primary path, but it is not a hard wall. A player
who is not ready to share an email can try one guided Word Quest first and decide
whether to save the earned progress afterward.

The redesigned first run is:

```text
Welcome and language
          |
          +------------------------+
          |                        |
          v                        v
Create account               Try one quest first
email + one-time code         local guest progress
          |                        |
          +------------+-----------+
                       |
                       v
Choose HSK starting level
                       |
                       v
Guided first Word Quest
learn the interface while playing
                       |
                       v
Guided Results
rewards + Review Pouch
                       |
        signed in -----+----- guest
          |                    |
          |                    v
          |             Save your progress?
          |             account / continue free
          +----------+---------+
                     |
                     v
Short app tour
Home → Cat Journey → Profile
                     |
                     v
Home, ready for the next quest
```

## Goals

The redesigned onboarding must:

1. Make a recoverable account the recommended route without blocking a first quest.
2. Present Word Quest as the core product within the first minute.
3. Teach the real battle interface through interaction, not slides.
4. Explain that missed words return and are part of learning, not failure.
5. Show why Home, Cat Journey, and Profile matter.
6. Introduce Flashcards and Tone Trainer as optional tools only after the game is clear.
7. Preserve the repository's offline and `file://` fallback behavior.
8. Let the player skip explanations without getting stuck.

## First-run sequence

### Step 1 — Welcome and language

The first screen should be simple:

**English**

> **Learn Chinese with Lucky Cat**
>
> Play short Word Quests, remember useful HSK words, and help your cat explore.

Controls:

- English / ไทย
- Primary: **Create my account**
- Secondary: **Try one quest first**
- Small privacy note: "Free. No password. Your progress follows you across devices."

Do not ask for the HSK level yet. First establish the product promise and account.

The secondary path goes directly to HSK selection, then the guided Word Quest. It does
not open Flashcards and does not create a different game mode.

If the device is offline or the app is opened through `file://`, disable or hide the
account CTA and make the secondary action primary:

- **Play offline on this device**
- Note: "You can connect an account later when you're online."

Account setup remains visually recommended online, but declining it never removes
learning features or prevents free play.

### Step 2A — Create account

Keep account creation inside onboarding. Do not send the user to More → Account.

**Title:** Save your learning from the start

**Body:** Enter your email so your words, streak, coins, and Supporter purchases can be
restored on another device.

Controls:

- Visible label: **Email address**
- Email input
- Primary: **Send my code**
- Secondary: **Back**
- Privacy link

Supporting copy:

> No password. We'll email you a one-time code.

Account creation should upgrade or reuse the existing Supabase anonymous identity so
the same cloud-merge behavior remains authoritative.

### Step 2A.2 — Verify account

Stay inside the same onboarding card.

**Title:** Check your email

**Body:** Enter the code sent to `{email}`.

Controls:

- Visible label: **Verification code**
- Numeric OTP input with `autocomplete="one-time-code"`
- Primary: **Verify and continue**
- **Resend in {s}s**
- **Use a different email**

On success:

- Confirm briefly: **Account ready ✓**
- Continue automatically to HSK selection.
- Do not send the player to a generic Account success screen.

### Step 2B — Try one quest first

If the player chooses the secondary path:

- Create or reuse the existing local/anonymous identity silently.
- Do not request email, profile details, notification permission, or payment.
- Continue directly to HSK selection.
- Mark the account choice as `try-first` so Results can show one relevant save prompt.

### Step 3 — Choose a starting level

Now personalize the first quest.

**Title:** Where should Lucky Cat start?

Choices:

- HSK1 through HSK6
- Recommended badge on HSK1

Helper copy:

> New to HSK? Start with HSK1. You can change this at any time.

Primary CTA:

> **Start my first Word Quest**

Promise:

> Six useful words · about two minutes

The first deck should remain the six highest-frequency words in the selected scope.
There is no Flashcard warm-up.

## Guided first Word Quest

The tutorial runs inside the real battle screen. It uses the normal meaning-choice
format, normal answers, normal Review Pouch behavior, and the real results calculation.
The guide pauses the timer only while instructional text is open.

The tutorial should not artificially mark answers correct or create a fake version of
the game. If the player misses, the normal answer reveal and word-return behavior teaches
the key product promise.

### Tutorial moment 1 — Meet the word

**Trigger:** The first question is rendered, before the timer starts.

**Highlight:** Hanzi, pinyin, and speaker control.

**Lucky Cat says:**

> This is your Chinese word. Read the pinyin or tap the speaker to hear it.

Action:

- **Got it**

After dismissal, start or resume the timer.

### Tutorial moment 2 — Choose the meaning

**Trigger:** Immediately after moment 1.

**Highlight:** The four answer buttons.

**Lucky Cat says:**

> Choose the meaning. A first-try answer builds your Lucky Flow.

Action:

- **Let me try**

This moment may be combined with moment 1 on short landscape screens if two overlays
would feel repetitive.

### Tutorial moment 3 — Correct answer

**Trigger:** The player's first correct answer.

**Highlight:** Feedback and Lucky Flow/HUD state.

**Lucky Cat says:**

> Nice! Correct first tries build Lucky Flow and earn more coins.

This is a small non-modal coach mark that disappears on the next question.

### Tutorial moment 4 — Missed word

**Trigger:** The first wrong answer or timeout. If neither occurs, explain it on Results.

**Highlight:** Revealed answer and Review Pouch feedback.

**Lucky Cat says:**

> No problem—missed words go into your Review Pouch and return soon.

Action:

- **Try it again later**

This is the most important learning message. It prevents a miss from feeling like a
punishment and explains why the quest may contain a word more than once.

### Tutorial moment 5 — Quest progress

**Trigger:** After the second resolved word.

**Highlight:** The quest progress indicator.

**Lucky Cat says:**

> Light every lantern to finish the quest. You are learning six words today.

Display once and dismiss automatically after about three seconds, with a manual close
action for accessibility.

No more tutorial interruptions should occur during the first quest.

## Guided first Results screen

Results should complete the tutorial instead of immediately sending the player to Home.

### Result explanation

Use three short highlights:

1. **Words learned**
   - "These are the words you completed today."
2. **Review Pouch**, only if there were misses
   - "Practice these now or let them return in a future quest."
3. **Coins and daily goal**
   - "Quests earn coins and move today's learning goal forward."

### Save-progress moment for the try-first path

If the player already created an account, skip this section.

If the player chose **Try one quest first**, show a card after the Results explanation:

> **Save what you learned**
>
> Create a free account to keep these words, coins, and your future streak safe across
> devices.

Actions:

- Primary: **Save my progress**
- Secondary: **Continue playing free**

**Save my progress** opens the same email and OTP steps inside a Results overlay. The
quest data stays in local storage while verification is in progress. After verification,
run the normal merge-safe sync, confirm **Progress saved ✓**, then continue to the app
tour.

**Continue playing free**:

- Keeps all learning features available.
- Preserves progress locally.
- Continues to the app tour.
- Does not repeat the full account prompt after every quest.
- Allows a later contextual backup reminder after meaningful progress.
- Still requires account setup inside the Supporter offer before a permanent purchase,
  so the entitlement can be restored.

Then show:

> **First quest complete!**
>
> Now let Lucky Cat show you where everything lives.

Primary:

- **Continue the tour**

Secondary:

- **Go to Home**

If the player skips here, onboarding is considered complete. Feature tips remain
available contextually later.

## Three-screen app tour

The post-quest tour should contain only three destinations. The player has already seen
the battle and Results screens, so repeating them would add noise.

### Tour step 1 — Home

**Highlight:** Main Word Quest CTA and HSK/scope chip.

**Title:** Your daily starting point

**Body:** Start the next Word Quest here. Tap the HSK label to change words, level, or
session length.

Then briefly highlight the secondary tools:

> Flashcards help you study before a quest. Tone Trainer helps you hear Mandarin tones.

This is the first time Flashcards should be introduced.

### Tour step 2 — Cat Journey

**Navigate to:** Cat tab.

**Highlight:** Daily goal and cat action.

**Title:** Learn, then explore

**Body:** Complete today's word goal, then send Lucky Cat exploring to bring back a
story and memory.

This connects the game loop to the retention loop.

### Tour step 3 — Profile

**Navigate to:** Profile tab.

**Highlight:** Mastered/seen stats and Progress tab.

**Title:** See what needs review

**Body:** Track mastered words here. When words are weak or due, Smart Review prepares
the right practice for you.

Final CTA:

- **Back to Home**

Closing the tour returns focus to Home's main Word Quest button.

## Features introduced later

The initial tour should not enumerate every feature. Use one-time contextual tips:

| Feature | Trigger | Tip |
|---|---|---|
| Daily Quests | After the second completed Word Quest | "Daily Quests give you small goals and extra rewards." |
| Shop / Collection | After the first meaningful coin reward | "Use coins to customize your cat and Word Quest." |
| Streak Freeze | After a two-day streak or first eligible risk | "A Streak Freeze can protect one missed day." |
| Flashcards | Already mentioned on Home; deeper tip on first open | "See, hear, and grade the same words at your own pace." |
| Tone Trainer | First time reliable audio makes it available | "Train your ear to distinguish Mandarin tones." |
| Smart Review | First time at least two words are due | "Smart Review is ready with words that need attention." |
| Advanced formats | Existing first-unlock event | Preserve the current one-time format introduction. |
| Friend invite | After Profile contains meaningful progress | "Share a score card and compare with a friend." |
| Supporter | Existing positive-moment policy | Open the dedicated Supporter offer, never onboarding. |

## Account and offline policy

### Online

- Account creation is the visually primary and recommended route.
- **Try one quest first** remains available as the secondary route.
- Choosing the secondary route never reduces free learning access.
- On a network error, preserve the typed email and provide Retry.
- Do not imply that an email has been sent until the server confirms it.
- Offer account setup again once on first Results, framed as saving progress.
- If the player continues free, use only occasional contextual backup reminders.

### Offline or `file://`

The project explicitly supports offline and direct-file use. A hard online-only account
wall would break that product requirement.

- Detect unavailable cloud access before displaying a dead-end form.
- Allow **Play offline on this device**.
- Store progress locally exactly as today.
- After the first completed quest and once online, show a calm account-backup tip.
- Never delete or replace local progress when the player connects later; reuse the
  existing merge-safe anonymous-account upgrade.

## Relationship to payment

Payment never appears during onboarding and is never required to keep playing.

- A player who created an account during Welcome can later go directly from the
  Supporter offer to Stripe Checkout.
- A player who chose **Try one quest first** or **Continue playing free** keeps the
  entire game. If they later choose Supporter, the Supporter sheet asks for email and
  OTP without sending them to the generic Account screen, then continues to checkout.
- Closing or declining the Supporter offer returns to the game immediately.
- Account refusal, payment cancellation, and payment failure never remove learning
  features or earned local progress.
- The Supporter offer appears only after a positive value moment under the separate
  once-per-day placement policy.

## Visual design

- Use Lucky Cat as the guide in a paper speech bubble.
- Keep the battle scene visible; highlight the current target with a soft gold outline
  rather than a heavy black spotlight.
- Pause the timer while a modal instruction is present.
- Use short 150–200 ms transitions and respect reduced motion.
- Show progress such as `1 of 3` only in the post-quest app tour. The interactive battle
  tips should feel responsive to play, not like a slideshow.
- Never cover the word or all answer choices with the bubble.
- In short landscape, position the guide beside the canvas or use the existing compact
  overlay region.

## Accessibility

- Modal tutorial bubbles use `role="dialog"` and `aria-modal="true"`.
- Titles and bodies use `aria-labelledby` and `aria-describedby`.
- Non-modal success tips use `role="status" aria-live="polite"`.
- Email and OTP fields have persistent visible labels.
- Focus moves predictably into and out of each tutorial bubble.
- Escape and Android Back close the explanation, not the whole quest.
- The timer never runs while focus is trapped in an instruction.
- The highlighted target is also named in text for screen-reader users.
- All controls preserve the 44 px minimum target.
- Test at 200% zoom, reduced motion, EN/TH, portrait, and landscape.

## State model

Replace the single `introDone` concept with explicit onboarding state. Keep it local
until the account is verified; the verified account can then sync normal player data.

Suggested local-only shape:

```js
{
  version: 1,
  accountChoice: "unseen" | "signed-in" | "try-first" | "continue-free",
  stage:
    "welcome" |
    "account" |
    "verify" |
    "level" |
    "quest" |
    "results" |
    "app-tour" |
    "complete",
  questTip: 0,
  appTourStep: 0,
  offline: false,
  contextualTips: {
    dailyQuests: false,
    shop: false,
    streakFreeze: false,
    flashcards: false,
    toneTrainer: false,
    smartReview: false,
    accountBackup: false
  }
}
```

Migration requirements:

- Preserve `nbhsk.introDone=true` as `stage:"complete"`.
- Existing players with mastery are always `stage:"complete"`.
- A fresh old-format profile with no mastery starts at Welcome.
- A partially completed new onboarding resumes at its last safe stage.
- Never overwrite current mastery, account, scope, or wallet data during migration.

## Suggested implementation boundaries

Keep the feature out of the frozen `main.js` scope except for mounting and callbacks.

- `src/onboarding.js`
  - Pure state normalization and migration decisions
  - Stage transitions
  - Tutorial eligibility
  - Contextual-tip policies
- `src/ui/onboarding-screen.js`
  - Welcome, account, OTP, and HSK steps
- `src/ui/quest-tutorial.js`
  - Word Quest coach marks and timer pause/resume coordination
- `src/ui/app-tour.js`
  - Home, Cat Journey, and Profile tour
- `src/ui/contextual-tips.js`
  - Later one-time feature tips
- `test/onboarding.test.js`
  - Pure state and stage transition coverage
- `test/quest-tutorial.test.js`
  - Tutorial policy coverage
- `index.html`
  - Top-level onboarding/tour hosts and visual styling
- `src/i18n.js`
  - English and Thai copy
- `src/main.js`
  - Mount modules and provide existing screen/battle callbacks
- `src/migrations.js`
  - Migrate the old `introDone` state safely
- `sw.js`
  - Bump the shell cache version when released

## Analytics

Only after analytics consent:

- `onboarding_account_start`
- `onboarding_try_quest_first`
- `onboarding_otp_sent`
- `onboarding_account_complete`
- `onboarding_level_selected`
- `onboarding_quest_start`
- `onboarding_quest_tip`
- `onboarding_quest_complete`
- `onboarding_save_offer`
- `onboarding_continue_free`
- `onboarding_app_tour_start`
- `onboarding_app_tour_complete`
- `onboarding_skipped` with stage
- `onboarding_offline`

Primary funnel:

```text
Welcome
→ first quest started
→ first quest completed
→ account verified now or after Results
→ second quest within 24 hours
```

Measure the two Welcome paths separately. The primary account route shows how many
players accept setup immediately; the try-first route shows whether experiencing Word
Quest increases later account completion. Neither experiment should reinsert
Flashcards ahead of the game.

## Testing matrix

### Pure tests

- Fresh online player can complete the recommended account route.
- Fresh online player can choose Try one quest first without account verification.
- Account errors preserve state and allow retry.
- Offline/file player receives the local fallback.
- HSK choice builds a six-word intro deck without opening Flashcards.
- Quest tips appear in the correct order and only once.
- Timer is paused while modal instructions are open.
- Wrong-answer guidance appears only on the first miss.
- Results transitions to the three-screen app tour.
- Try-first Results offers Save my progress and Continue playing free.
- Save my progress merges local progress after OTP verification.
- Continue playing free retains all learning features and local progress.
- Skip at any guided stage lands safely and records completion.
- Existing `introDone` and mastery profiles never see the new onboarding retroactively.
- Partial onboarding resumes safely.

### Browser and device tests

- Recommended route: Welcome → OTP → HSK → Word Quest → Results → app tour.
- Try-first route: Welcome → HSK → Word Quest → Results → save offer → app tour.
- Post-quest account completion preserves the just-finished quest.
- Continue-free path reaches Home and starts a second quest.
- Offline/file fallback through first quest.
- Wrong first answer and correct first answer variants.
- Timeout on the first question.
- Background/resume during an instruction.
- Browser/Android Back at every stage.
- Screen-reader focus and announcements.
- 200% zoom and reduced motion.
- English and Thai at:
  - 320×568
  - 390×844
  - 640×360
  - 844×390
  - 768×1024
  - 1280×800
- Physical Android keyboard, audio, interruption, and OTP autofill.

## Acceptance criteria

1. Flashcards never open automatically during first run.
2. Account creation is the primary Welcome action, with Try one quest first secondary.
3. Declining account creation never blocks or reduces free learning access.
4. Try-first players receive one progress-saving account offer after Results.
5. Offline/file users retain a functional local fallback.
6. The first playable activity is a real six-word Word Quest.
7. Tutorial messages pause the timer and never cover the active word or all answers.
8. A wrong answer demonstrates the real Review Pouch and return behavior.
9. Results explains learned words, misses, rewards, and daily progress.
10. The post-quest tour covers only Home, Cat Journey, and Profile.
11. Flashcards and Tone Trainer are described as supporting tools on Home.
12. Shop and Supporter do not appear in onboarding.
13. Skip, Back, network failure, reload, and app resume never trap the player.
14. Existing players are not shown the new onboarding retroactively.
15. Thai account and tutorial copy receives native review.
16. Responsive, keyboard, screen-reader, zoom, reduced-motion, offline, and physical
    Android checks pass.

## Final experience

The redesigned first session should feel like this:

> I could save my account immediately or try the game first. Lucky Cat taught me how to
> play by letting me play. I understand that missed words return, the game remains free,
> and I know where to continue tomorrow.

That presents the game honestly and makes Word Quest—not Flashcards—the center of Lucky
Cat HSK.
