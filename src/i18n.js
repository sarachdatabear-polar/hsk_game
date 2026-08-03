"use strict";
// UI localization. Pure: no DOM, no localStorage (caller owns persistence,
// like shop.js/quests.js). String tables are bundled — file://- and offline-safe.
// Keys are dotted by screen: home.*, scope.*, learn.*, results.*,
// quest.*, scores.*, progress.*, shop.*, howto.*, common.*,
// nav.* (bottom-nav tab labels), quests.* (M2 screen promotions),
// battle.* (M4 HUD round capsule + pause overlay), fc.* (flashcard-only
// strings not shared with learn.*), item.* (shop.js CATALOG id -> display
// name, t("item."+id)),
// toast.* (retention pack — main.js's floating toast()),
// notify.* (retention pack — Android streak-saver local notification, see
// notify.js/native.js).

export const STRINGS = {
  en: {
    // home
    "home.smart": "Smart Review",
    "home.flashcards": "Flashcards",
    "home.tones": "Tone Trainer",
    "home.tonesDisabledHint": "Needs sound",
    "home.shop": "Shop",
    "home.best": "Best Sessions",
    "home.progress": "Progress",
    "home.howto": "How to play",
    "home.sound": "Sound effects",
    "home.settings": "Settings",
    "home.streakTitle": "Study Streak",
    "home.streakDays": "{n} days",
    "home.freezes": "{n} freezes",
    "home.freeze-one": "1 freeze",
    "home.start": "START",
    "home.startReview": "REVIEW {n} DUE WORDS",
    "home.startHint": "Need at least 8 words in scope to start — widen it below.",
    "home.scopeWords": "{n} words",
    "home.levelChip": "Lv {lv}",
    "home.nextReview": "{n} words are due — Smart Review is ready.",
    "home.nextQuest": "Next: a {n}-word Lantern Trail quest.",
    // i18n pass 3 — growth card, milestone names, and previously-hardcoded labels
    "growth.title": "Lucky Cat · Lv {lv}",
    "growth.allUnlocked": "All milestones unlocked!",
    "progress.levelRow": "{pct} mastered · {seen}/{total} seen",
    "common.playAudio": "Play audio",
    "common.close": "Close",
    "common.continue": "Continue",
    "battle.critical": "BRILLIANT!",
    // toast (retention pack — main.js's floating toast())
    "toast.freeze-used": "Streak Freeze used — your {n}-day streak is safe",
    // notify (retention pack — Android local notification, see notify.js/native.js)
    "notify.streak.title": "Don't lose your {n}-day streak!",
    "notify.streak.body": "{remaining} words keep it alive — a quick Word Quest does it.",
    "notify.comeback.title": "Your lucky cat misses you 🐱",
    "notify.comeback.body": "You were on a {n}-day roll — jump back in and get it going again!",
    "notify.cat.title": "Your Lucky Cat is back",
    "notify.cat.body": "A new journey memory is ready to keep.",
    // account (client-auth round — Account sub-screen off More)
    "account.row": "Account",
    "account.title": "Account",
    "account.status.local": "On this device",
    "account.status.guest": "Guest account",
    "account.status.signedIn": "Signed in as {email}",
    "account.explain.offline": "Cloud accounts need an internet connection — your progress is safe on this device.",
    "account.explain.local": "Your progress lives on this device. Connect to back it up to the cloud.",
    "account.explain.guest": "Connected as a guest. Add your email so your account isn't lost with this device.",
    "account.explain.signedIn": "Your account is linked. Your progress backs up to the cloud automatically.",
    "account.connect": "Back up my progress",
    "account.stepEmail": "1 of 2 · Add your email",
    "account.stepVerify": "2 of 2 · Verification",
    "account.codeFor": "Enter the code sent to {email}.",
    "account.sendCode": "Send code",
    "account.verify": "Verify",
    "account.resend": "Resend code",
    "account.resendWait": "Resend in {s}s",
    "account.signOut": "Sign out",
    "account.delete": "Delete account",
    "account.deleteConfirm": "Permanently erase your cloud data? Signing out instead keeps it.",
    "account.deleteConfirmYes": "Delete permanently",
    "account.deleteCancel": "Cancel",
    "account.deleteDone": "Cloud account deleted",
    "account.deleteFail": "Couldn't delete — try again",
    "account.emailPh": "your@email.com",
    "account.codePh": "code from the email",
    "account.codeSent": "Code sent — check your email",
    "account.changeEmail": "Use a different email",
    "account.signedIn": "Signed in!",
    "account.signedOut": "Signed out",
    "account.err.offline": "No internet connection",
    "account.err.network": "Couldn't reach the cloud — try again",
    "account.err.badEmail": "That email doesn't look right",
    "account.err.badCode": "Wrong or expired code — try again",
    "account.lastSynced": "Last synced {when}",
    "account.neverSynced": "Not synced yet",
    "account.restored": "Progress restored ✓",
    "account.benefit.safe": "Keeps your streak, coins and mastery backed up",
    "account.benefit.devices": "Works on phone and computer — pick up where you left off",
    "account.benefit.free": "Free — no password, just an email later if you want",
    "milestone.scarf": "Red scarf",
    "milestone.coin": "Gold coin charm",
    "milestone.outfit": "Chinese outfit",
    "milestone.kitten": "Kitten follower",
    "milestone.emperor": "Emperor crown",
    "streak.restUsed": "🍵 Rest day used — your {n}-day streak is safe.",
    // first run (A4)
    "welcome.title": "Welcome!",
    "welcome.blurb": "Learn Chinese words by playing — a couple of minutes a day.",
    "welcome.language": "Your language",
    "welcome.level": "Start at",
    "welcome.levelHint": "New to HSK? Start with HSK1 — you can change this any time.",
    "welcome.start": "START LEARNING",
    "welcome.promise": "First, learn 6 words. Then play a short Word Quest.",
    "onboarding.language": "Your language",
    "onboarding.createAccount": "Create my free account",
    "onboarding.tryFirst": "Try one quest first",
    "onboarding.playOffline": "Play offline",
    "onboarding.freePromise": "The full game is free. An account only saves your progress across devices.",
    "onboarding.accountTitle": "Save your adventure",
    "onboarding.accountBlurb": "Enter your email and we’ll send a sign-in code. No password needed.",
    "onboarding.emailLabel": "Email address",
    "onboarding.noPassword": "Free account · no password · no payment",
    "onboarding.verifyTitle": "Check your email",
    "onboarding.codeLabel": "Sign-in code",
    "onboarding.levelTitle": "Choose your starting level",
    "onboarding.levelBlurb": "Your first guided quest uses six real words from this level.",
    "onboarding.levelHint": "Not sure? HSK1 is the best place to begin. You can change it later.",
    "onboarding.startQuest": "Start my first Word Quest",
    "onboarding.questPromise": "Six words · about two minutes · guidance included",
    "onboarding.quest.guide": "First quest guide",
    "onboarding.quest.wordTitle": "Meet {word}",
    "onboarding.quest.wordBody": "This is the Chinese word. Its pronunciation is {pinyin}. You can tap the word card to hear it again.",
    "onboarding.quest.answersTitle": "Choose the meaning",
    "onboarding.quest.answersBody": "Tap the answer that matches the Chinese word. The timer starts after this guide closes.",
    "onboarding.quest.letsPlay": "Let’s play",
    "onboarding.quest.correctTip": "Nice! Correct answers light the path and earn Lucky Coins.",
    "onboarding.quest.reviewTip": "No problem—missed words return later in this quest for another try.",
    "onboarding.quest.progressTip": "Path progress: {learned}/{target} words learned. Finish all six to complete the quest.",
    "onboarding.results.saveTitle": "Keep your first quest",
    "onboarding.results.saveBody": "Create your free account to back up these words, coins and future progress. No payment is needed.",
    "onboarding.results.readyTitle": "Your progress is saved",
    "onboarding.results.readyBody": "One quick tour will show you where to play, visit your cat and check progress.",
    "onboarding.results.save": "Save my progress",
    "onboarding.results.continueFree": "Continue without an account",
    "onboarding.results.tour": "Show me around",
    "onboarding.tour.homeTitle": "Home starts your next quest",
    "onboarding.tour.homeBody": "The large Word Quest button chooses a useful session for you. Flashcards and Tone Trainer are optional practice tools.",
    "onboarding.tour.catTitle": "Your cat grows with your learning",
    "onboarding.tour.catBody": "Complete today’s word goal, then send Lucky Cat exploring to bring back a memory.",
    "onboarding.tour.profileTitle": "Profile keeps the big picture",
    "onboarding.tour.profileBody": "See mastery, streaks, stickers and account sync here. Supporter payment is optional and never unlocks gameplay.",
    "onboarding.tour.count": "Tour {current} of {total}",
    "onboarding.tour.skip": "Skip tour",
    "onboarding.tour.finish": "Finish tour",
    "onboarding.tour.replay": "Replay app tour",
    "results.introHint": "Great first session! Come back tomorrow to start your streak 🍵",
    // bottom nav (M2)
    "nav.home": "Home",
    "nav.cat": "Cat",
    "nav.progress": "Profile",
    "nav.more": "More",
    // Cat Journey
    "cat.eyebrow": "Your learning companion",
    "cat.title": "Lucky Cat Journey",
    "cat.memories": "Memories",
    "cat.memoriesTitle": "Journey memories",
    "cat.memoriesEmpty": "Complete today's goal and send your cat exploring to make your first memory.",
    "cat.memoriesMore": "Show older memories",
    "cat.backgrounds": "Backgrounds",
    "cat.profile": "My progress",
    "cat.customizeQuests": "Customize Word Quest",
    "cat.away": "Exploring nearby…",
    "cat.characterAlt": "Your Lucky Cat learning companion",
    "cat.bond": "Cat Bond",
    "cat.dailyGoal": "Daily goal",
    "cat.bondPoints": "{n} bond",
    "cat.bondNext": "{n} to {name}",
    "cat.bondMax": "Maximum bond",
    "cat.goalComplete": "Daily goal complete ✓",
    "cat.goalProgress": "{done}/{goal} words today",
    "cat.status.ready": "Explore for 20 min · bring back 1 memory.",
    "cat.status.exploring": "Your cat is exploring. Back in about {n} min.",
    "cat.status.returned": "Your cat is back with a story for you!",
    "cat.status.done": "A good day together. Time for a cozy rest.",
    "cat.status.needsGoal": "Learn {goal} words today to power an adventure · {done}/{goal}",
    "cat.cta.study": "Study now",
    "cat.cta.explore": "Go exploring",
    "cat.cta.exploring": "Study while your cat explores",
    "cat.cta.return": "Keep this memory",
    "cat.cta.studyMore": "Study a little more",
    "cat.bg.home": "Study Room",
    "cat.bg.garden": "Vocabulary Garden",
    "cat.bg.market": "Morning Market",
    "cat.bg.lantern": "Lantern Riverside",
    "cat.bg.scholar": "Scholar Gate",
    "cat.bg.select": "Use {name}",
    "cat.bg.locked": "{name}, unlocks at {n} bond",
    "cat.bg.selected": "Selected",
    "cat.bg.points": "{n} bond",
    "cat.tier.studyBuddy": "Study Buddy",
    "cat.tier.curiousPaws": "Curious Paws",
    "cat.tier.explorer": "Neighborhood Explorer",
    "cat.tier.lanternFriend": "Lantern Friend",
    "cat.tier.scholarCat": "Scholar Cat",
    "cat.memory.leaf.title": "A garden leaf",
    "cat.memory.leaf.story": "Your cat found a heart-shaped leaf beside a quiet reading path and saved it for you.",
    "cat.memory.tea.title": "Warm tea steam",
    "cat.memory.tea.story": "A market neighbor shared a tiny cup of tea while your cat listened to new words.",
    "cat.memory.lantern.title": "Lantern glow",
    "cat.memory.lantern.story": "One lantern reflected like a little moon. Your cat followed its light home.",
    "cat.memory.bridge.title": "Light on the bridge",
    "cat.memory.bridge.story": "Your cat paused on the bridge and watched every bright reflection become a path.",
    "cat.memory.blossom.title": "Plum blossom",
    "cat.memory.blossom.story": "A soft pink petal landed on the satchel—just the right bookmark for today's lesson.",
    "cat.memory.brush.title": "Scholar's brush",
    "cat.memory.brush.story": "At the mountain pavilion, your cat watched a careful brush turn practice into progress.",
    "cat.memory.book.title": "Green book ribbon",
    "cat.memory.book.story": "Your cat brought home a ribbon to mark how far you have learned together.",
    "cat.memory.market.title": "Market orange",
    "cat.memory.market.story": "A shopkeeper chose the brightest orange as a cheerful reward for today's effort.",
    "cat.memory.archived.title": "A treasured memory",
    "cat.memory.archived.story": "Your cat kept this memory safe from an earlier journey.",
    "cat.memory.from": "From {place}",
    "cat.memory.playWord": "Play {word}",
    "home.cat.progress": "Cat Journey · {done}/{goal} words",
    "home.cat.ready": "Your cat is ready to explore",
    "home.cat.exploring": "Cat exploring · about {n} min",
    "home.cat.returned": "Welcome back · a memory is ready",
    "cat.memory.sunnyWindow.title": "A sunny window",
    "cat.memory.sunnyWindow.story": "Your cat found a warm patch of sunlight and saved the coziest spot for your next lesson.",
    "cat.memory.pageCorner.title": "A folded page corner",
    "cat.memory.pageCorner.story": "A breeze turned one page at a time while your cat patiently kept your place.",
    "cat.memory.pencilCurl.title": "A pencil curl",
    "cat.memory.pencilCurl.story": "A tiny curl from a sharpened pencil looked like a cat's tail beside the green book.",
    "cat.memory.littleBell.title": "A little bell note",
    "cat.memory.littleBell.story": "A soft bell rang once outside the study room, as if cheering for today's progress.",
    "cat.memory.bambooShadow.title": "Bamboo shadows",
    "cat.memory.bambooShadow.story": "Bamboo shadows crossed the path like gentle strokes while your cat walked through the garden.",
    "cat.memory.koiRipple.title": "A koi ripple",
    "cat.memory.koiRipple.story": "One curious koi made a perfect circle in the pond, and your cat waited for the water to grow still.",
    "cat.memory.gardenKite.title": "A garden kite",
    "cat.memory.gardenKite.story": "A small paper kite floated above the pavilion and dipped hello before climbing again.",
    "cat.memory.morningDew.title": "Morning dew",
    "cat.memory.morningDew.story": "Bright drops rested on the leaves like tiny glass beads along the reading path.",
    "cat.memory.stonePath.title": "The quiet stone path",
    "cat.memory.stonePath.story": "Your cat followed the pale stones slowly and found each step easier than the last.",
    "cat.memory.marketTag.title": "A blank market tag",
    "cat.memory.marketTag.story": "A shopkeeper gave your cat a clean paper tag to use as a bookmark for future words.",
    "cat.memory.basketRibbon.title": "A basket ribbon",
    "cat.memory.basketRibbon.story": "A coral ribbon slipped from a fruit basket, so your cat carried it home for the memory box.",
    "cat.memory.sesameBun.title": "Warm sesame bun",
    "cat.memory.sesameBun.story": "The baker shared a warm sesame bun, and your cat enjoyed its sweet smell on the walk home.",
    "cat.memory.marketBell.title": "The market bell",
    "cat.memory.marketBell.story": "The wooden market bell made one friendly note as the last stall opened for the morning.",
    "cat.memory.umbrellaColors.title": "Umbrella colors",
    "cat.memory.umbrellaColors.story": "Paper umbrellas made a bright patchwork overhead while your cat explored the quiet lane.",
    "cat.memory.riverPebble.title": "A smooth river pebble",
    "cat.memory.riverPebble.story": "Your cat chose a smooth jade-colored pebble where the river met the lantern light.",
    "cat.memory.moonReflection.title": "The reflected moon",
    "cat.memory.moonReflection.story": "The moon wobbled in the water and became round again when the evening breeze settled.",
    "cat.memory.fireflyPath.title": "A firefly path",
    "cat.memory.fireflyPath.story": "Three fireflies blinked beside the river, lighting a tiny path toward home.",
    "cat.memory.riversideCharm.title": "A riverside charm",
    "cat.memory.riversideCharm.story": "Under the curved bridge, your cat found a simple wooden charm polished smooth by the water.",
    "cat.memory.inkstoneLight.title": "Light on the inkstone",
    "cat.memory.inkstoneLight.story": "Morning light crossed the inkstone while the pavilion grew quiet enough for careful study.",
    "cat.memory.mountainCloud.title": "A mountain cloud",
    "cat.memory.mountainCloud.story": "A small cloud drifted below the scholar gate, making the pavilion feel high above the world.",
    "cat.memory.scholarBookmark.title": "A scholar's bookmark",
    "cat.memory.scholarBookmark.story": "Your cat found a plain green thread and tied it into a bookmark for the next chapter.",
    "cat.memory.scholarDesk.title": "The quiet scholar desk",
    "cat.memory.scholarDesk.story": "A clean desk, a closed book, and a patient morning waited together at the mountain pavilion.",
    "cat.announce.started": "Your cat has set off on today's journey.",
    "cat.announce.returned": "New memory earned: {name}.",
    "cat.announce.background": "Journey background changed.",
    "shop.dailyCatEmpty": "You own every pick available today. Fresh picks arrive at midnight.",
    "more.tagline": "Lucky Cat HSK — learn the words that actually appear on the test",
    "more.learnHelp": "Play & help",
    "more.settings": "Settings",
    "more.accountPrivacy": "Account & privacy",
    "more.version": "Lucky Cat HSK · Version 0.2.0",
    // Task 13: positive-only daily surprise. Guardrail-reviewed — no streak,
    // day-count, "in danger", or missed-day copy anywhere near these. If a
    // day is skipped, nothing here ever fires or says anything about it.
    "quests.title": "Daily Quests",
    "quests.button": "Quests",
    // scope
    "scope.title": "Choose your words",
    "scope.levels": "Levels",
    "scope.filters": "Filters",
    "scope.highYield": "Frequently tested words only",
    "scope.newOnly": "New words only",
    "scope.topN": "Top-N by frequency",
    "scope.all": "All",
    "scope.meaningLang": "Meaning language",
    "scope.english": "English",
    "scope.both": "Both",
    "scope.sessionLen": "Session length",
    "scope.stepWords": "1 · Choose words",
    "scope.moreFilters": "More word filters",
    "scope.stepMeaning": "2 · Meaning language",
    "scope.stepSession": "3 · Session",
    "scope.startQuest": "Start {n}-word quest",
    "scope.custom": "Custom",
    "scope.customLen": "Custom session length",
    "scope.customPh": "5–500",
    "scope.endless": "Endless",
    "scope.cards": "Cards",
    "scope.cardsResume": "Resume Cards · {n}",
    "scope.wordQuest": "Word Quest · {n}",
    "scope.smartReview": "Smart Review",
    "scope.smartReviewProgress": "Smart Review · {have}/{min}",
    "scope.smartReviewReady": "Smart Review · {n}",
    "scope.smartReviewLocked": "Play a session first — Smart Review learns your weak words",
    "scope.readout": "Pool: <b>{count}</b> words · ~<b>{pct}%</b> of exam text",
    "scope.readoutNoThai": "* {n} long-tail words have no Thai yet — English shown instead.",
    // journey map (B3)
    "scope.tabPicker": "Picker",
    "scope.tabJourney": "Journey",
    "journey.youAreHere": "You are here",
    "journey.nodeAll": "HSK{lv} · All words",
    "journey.nodeTop": "HSK{lv} · Top {n}",
    "journey.play": "Play",
    "journey.recommended": "Recommended next",
    "journey.review": "Review",
    "journey.continue": "Continue",
    "journey.start": "Start",
    "journey.levelProgress": "{done} of {total} stops complete",
    // learn / flashcards
    "learn.exit": "Exit",
    "learn.stillLearning": "Again",
    "learn.knowIt": "Got it",
    "learn.count": "{done} done · {left} left",
    "learn.hintFront": "tap to flip · HSK{lv} · in {ta}/{tt} papers",
    "learn.hintBack": "tap to flip back",
    "fc.noThai": "no Thai yet",
    "fc.inSentence": "In a sentence",
    "wd.info": "Word detail",
    "wd.core": "Core",
    "wd.extended": "Extended",
    "wd.appearsInPapers": "Appears in {n} of {total} papers",
    "wd.alsoInHsk3": "Also in HSK 3.0 · Band {band}",
    // results
    "results.roundOver": "Word Quest complete",
    "results.routeLabel": "Village Gate journey",
    "results.chapter": "Chapter {n}",
    "results.learnedTarget": "{learned} / {target} words learned",
    "results.attempts": "Attempts",
    "results.accuracy": "Accuracy",
    "results.lanterns": "Lanterns",
    "results.rewardTitle": "Lucky rewards",
    "results.nextReviewPractice": "Next: revisit your extra-practice words",
    "results.nextReviewTomorrow": "Your Lantern Trail continues tomorrow",
    "results.supporterLine": "Lucky Cat is free thanks to supporters — join them 🐾",
    "results.supporterCta": "Become a Supporter",
    "results.lanternAlt": "Lit lantern",
    "results.missed": "Needed extra practice",
    "results.reviewWords": "Review Words",
    "results.practiceMissed": "Practice these words again",
    "results.playAgain": "Play again",
    "results.home": "Home",
    "results.banked": "+{score} coins banked · total {total}",
    "results.perfect": "Perfect Word Quest! +{bonus} coin bonus",
    "results.levelUp": "Level up! Lv {lv}",
    "results.levelUpUnlocked": "Level up! Lv {lv} — unlocked: {items}",
    "results.sub": "{acc}% accuracy · {words} words · {key}",
    "results.bestTag": "Best session!",
    "results.bestPrev": "best {prev}",
    "results.questComplete": "Quest complete: {desc} +{reward} coins",
    "results.catReady": "Daily goal complete — your cat is ready to explore.",
    "results.catReadyAction": "Visit Cat",
    "results.projectProgress": "+{earned} this quest · {remaining} coins to go",
    "results.projectNoGain": "{remaining} coins to go",
    "results.projectReadyEarned": "+{earned} this quest · ready to build!",
    "results.projectReady": "Ready to build!",
    "results.viewProject": "View project",
    "results.buildNow": "Build now",
    // quests (keyed by quest id from quests.js QUEST_POOL)
    "quest.status.done": "Done",
    "quest.status.open": "Open",
    "quest.reward": "+{reward} coins",
    "quest.correct30": "Answer 30 words correctly",
    "quest.combo5": "Reach a ×5 learning streak",
    "quest.boss1": "Complete a Review Challenge",
    "quest.perfect1": "Finish a Word Quest with no extra-practice words",
    "quest.review1": "Play a Smart Review quest",
    "quest.learn20": "Mark 20 flashcards as known",
    // monthly quest layer (retention pack)
    "quest.monthly.title": "Monthly: {done}/{target} quests",
    "quest.monthly.claim": "Claim +{reward}",
    "quest.monthly.badge": "Monthly badge earned!",
    "quest.monthly.autoClaimed": "Monthly reward claimed for you: +{reward} coins",
    // scores / progress
    "scores.title": "Best Sessions",
    "scores.empty": "No sessions yet — complete a Word Quest.",
    "scores.play": "Play your first Word Quest",
    "progress.title": "Profile",
    "progress.needsWork": "Needs work",
    "progress.reviewThese": "Review these",
    "progress.practiceThese": "Practice These",
    "progress.nothing": "Nothing needs work — go play!",
    // profile-first dashboard
    "profile.defaultName": "Lucky Learner",
    "profile.editName": "Edit",
    "profile.namePh": "Player name",
    "profile.saveName": "Save",
    "profile.cancelName": "Cancel",
    "profile.level": "Lucky Cat · Lv {lv}",
    "profile.xp": "{into}/{need} XP toward the next level",
    "profile.streak": "{n}-day streak",
    "profile.coins": "{n} coins",
    "profile.mastered": "Words mastered",
    "profile.seen": "Words seen",
    "profile.stickers": "Stickers earned",
    "profile.bestSession": "Best session",
    "profile.collectionTitle": "Your collection",
    "profile.collectionCount": "{owned}/{total} cosmetics",
    "profile.stickerCount": "{earned}/{total} stickers",
    "profile.skin": "Word Quest cat: {name}",
    "profile.backdrop": "Word Quest backdrop: {name}",
    "profile.defaultCat": "Default Cat",
    "profile.defaultBackdrop": "Default",
    "profile.viewCollection": "View Collection",
    "profile.viewAlbum": "Sticker Album",
    "profile.tabOverview": "Overview",
    "profile.tabProgress": "Progress",
    "profile.tabCollection": "Collection",
    "profile.emptyTitle": "Your journey starts here",
    "profile.emptyBody": "Finish one short Word Quest to begin your progress, streak, and collection.",
    "profile.emptyCta": "Start first quest",
    "profile.accountTitle": "Account & backup",
    "profile.accountSummary": "Back up your progress or manage your connected email.",
    "friend.yourCode": "Your code — share it",
    "friend.share": "Share my code",
    "friend.shareText": "Compare our Lucky Cat HSK progress!",
    "friend.pasteLabel": "Have a friend's code?",
    "friend.pastePlaceholder": "Paste their code here",
    "friend.compareBtn": "Compare",
    "friend.compareAnother": "Compare another",
    "friend.invalidCode": "That code doesn't look right. Ask for a fresh one.",
    "friend.copied": "Code copied to clipboard",
    "friend.you": "You",
    "friend.them": "Friend",
    "friend.leadMine": "You're ahead! 🎉",
    "friend.leadTheirs": "Your friend is ahead — catch up!",
    "friend.leadTie": "Neck and neck!",
    "friend.metric.level": "Level",
    "friend.metric.streak": "Day streak",
    "friend.metric.mastered": "Words mastered",
    "friend.metric.stickers": "Stickers earned",
    "friend.inviteCta": "Invite a friend",
    "friend.inviteTitle": "Invite a friend",
    "friend.progressTitle": "Compare progress with friends",
    "friend.progressSummary": "Compare level, streak, mastered words, and stickers with a friend.",
    "friend.compareCta": "Compare progress",
    "friend.inviteLead": "Learning is better together — send your card!",
    "friend.privacyNote": "Your code and QR carry only your chosen name, level, and progress numbers — no account, no email, nothing personal.",
    "friend.qrLabel": "Or have them scan this:",
    "friend.qrTooLong": "Your name is too long for a QR code — share the link instead.",
    "friend.recentTitle": "Friends you've compared",
    "friend.recentEmpty": "No friends here yet — share your card to start!",
    "friend.recentClear": "Clear list",
    "friend.recentCleared": "Friend list cleared",
    "friend.asOfToday": "as of today",
    "friend.asOfDays": "as of {n} days ago",
    "friend.namePrompt": "Add your name so friends know it's you:",
    "friend.namePromptSave": "Save name",
    "avatar.title": "Profile picture",
    "avatar.change": "Change profile picture",
    "avatar.monogram": "Your initial",
    "avatar.photo": "Use a photo",
    "avatar.photoHint": "Your photo stays on this device — it is never uploaded.",
    "avatar.removePhoto": "Remove photo",
    "avatar.locked": "Unlock in the Shop",
    "avatar.seasonal": "Seasonal — see Shop",
    "avatar.photoError": "Couldn't read that photo — try another one.",
    "avatar.photoTooBig": "That photo is too detailed to save — try another one.",
    "avatar.saveFailed": "Not enough space to save the photo. Your old picture is kept.",
    "avatar.cat.lucky": "Lucky Cat",
    "profile.learningTitle": "Learning progress",
    "common.backProfile": "← Profile",
    // sticker album (B2 — earn-only, never sold)
    "progress.album": "Sticker Album",
    "album.title": "Sticker Album",
    "album.back": "← Profile",
    "album.events": "Events",
    "album.progress": "{earned} of {total} stickers earned",
    "album.nextTarget": "Next: {name}",
    "album.complete": "Album complete — every sticker is yours!",
    "album.filterNext": "Up next",
    "album.filterEarned": "Earned",
    "album.upNext": "Up next",
    "album.emptyEarned": "No stickers earned yet. Finish a Word Quest to collect your first one.",
    "sticker.scopeName": "HSK{lv} · Top {n}",
    "sticker.scopeHint": "Master all Top {n} words of HSK{lv}",
    "sticker.msName": "HSK{lv} · {pct}%",
    "sticker.msHint": "Master {pct}% of HSK{lv}",
    "sticker.welcomeName": "Welcome!",
    "sticker.welcomeHint": "Finish your first session",
    "sticker.bossName": "Challenge Champion",
    "sticker.bossHint": "Complete your first Review Challenge",
    "sticker.streak7Name": "7-Day Streak",
    "sticker.streak7Hint": "Keep a 7-day study streak",
    "sticker.streak30Name": "30-Day Streak",
    "sticker.streak30Hint": "Keep a 30-day study streak",
    "sticker.monthlyName": "Monthly Champion",
    "sticker.monthlyHint": "Finish 40 quests in a month",
    "results.newSticker": "New sticker: {name}",
    // shop / collection
    "shop.title": "Shop",
    "shop.skins": "Word Quest cats",
    "shop.backdrops": "Word Quest backdrops",
    "shop.effects": "Effects",
    "shop.sounds": "Sounds",
    "shop.catsNote": "Changes the cat and kitten you see during Word Quest.",
    "shop.backdropsNote": "Changes the scene behind your Word Quest.",
    "shop.effectsNote": "Changes the celebration burst after a correct answer.",
    "shop.soundsNote": "Changes game sound effects, not Chinese pronunciation.",
    "shop.supplies": "Supplies",
    "shop.categoryFeatured": "Featured",
    "shop.categoryCats": "Cats",
    "shop.categoryBackdrops": "Backdrops",
    "shop.categoryEffects": "Effects",
    "shop.categorySounds": "Sounds",
    "shop.categorySupplies": "Supplies",
    "shop.needMore": "Need {n} more coins",
    "shop.preview": "Preview",
    "shop.wallet": "Wallet: <b>{coins}</b> coins",
    "shop.buy": "Buy",
    "shop.equip": "Equip",
    "shop.equipped": "Equipped",
    "shop.coins": "{coins} coins",
    "shop.daily": "Today's Picks",
    "shop.dailyNote": "New picks at midnight",
    "shop.dailyAllOwned": "All stocked up! Fresh finds at midnight 🌙",
    "shop.season": "Season Corner",
    "shop.seasonUntil": "Available until {date}",
    "shop.seasonReturns": "🏮 {name} set returns {date}",
    "shop.seasonal": "Seasonal",
    "shop.seasonalReturns": "Returns {date}",
    "shop.upgrade": "Upgrade {stars} ({coins})",
    "shop.owned-count": "Owned: {n}/{cap}",
    // iap (IAP purchase flow v1 — mock provider; spec 2026-07-11)
    "shop.getCoins": "Get Coins",
    "shop.supporterTitle": "Supporter",
    "shop.supporterDesc": "6 HSK PDF guides by email · Android ad-free · +2,000 coins · Supporter badge",
    "shop.supporterOwned": "Thank you for supporting Lucky Cat! ♥",
    "iap.amount": "{coins} coins",
    "iap.pending": "Processing…",
    "iap.failed": "Purchase failed — nothing was charged. Try again.",
    "iap.wrongOrigin": "Purchases only work at {site}. Open the game there to become a Supporter — nothing was charged.",
    "iap.success": "+{coins} coins added!",
    "iap.supporterThanks": "You're a Supporter now — thank you! Your six HSK guides are on the way by email. ♥",
    "iap.supporterThanksSave": "You're a Supporter now ♥ — add your email to receive the six HSK guides and keep your purchase on every device.",
    "iap.restore": "Restore Purchases",
    "iap.restored": "Supporter restored ♥",
    "iap.nothingToRestore": "Nothing to restore",
    "iap.restoreFailed": "Restore failed — check your connection and try again.",
    // Real-provider purchase poll timeout (coin-purchase go-live T4): the
    // webhook's idempotent grant guarantees eventual delivery, so this is
    // reassurance, not an error — the next ordinary sync credits it.
    "iap.processing": "Purchase is processing — your coins will arrive shortly.",
    "iap.supporterProcessing": "Supporter is processing — it will activate automatically when payment completes.",
    // Web Supporter offer + account save-unlock copy (Task 5, web IAP billing)
    "iap.supporter.web.title": "Become a Supporter",
    "iap.supporter.web.blurb": "Support the project — six HSK1–6 PDF guides by email, a thank-you cosmetic, a Supporter badge, 2,000 coins, and Android ad-free. One payment.",
    "iap.needsAccountBody": "Create a free account so your purchase follows you to any device.",
    "supporter.sheet.eyebrow": "Optional support",
    "supporter.sheet.title": "Support Lucky Cat — once",
    "supporter.sheet.lead": "Lucky Cat stays free for everyone. Support the project and receive a permanent thank-you pack.",
    "supporter.sheet.benefitGuides": "6 frequency-ranked PDF guides — one each for HSK1–6 — sent to your email",
    "supporter.sheet.benefitCoins": "2,000 Lucky Coins now",
    "supporter.sheet.benefitBadge": "Permanent Supporter badge and thank-you cosmetic",
    "supporter.sheet.benefitAds": "Ad-free in the Android app",
    "supporter.sheet.benefitRestore": "Restores on devices linked to your email",
    "supporter.sheet.price": "{price} one time · no subscription",
    "supporter.sheet.secure": "Pay securely with PromptPay or card in Stripe Checkout.",
    "supporter.sheet.checkout": "Continue to secure checkout · {price}",
    "supporter.sheet.email": "Continue with email",
    "supporter.sheet.notNow": "Not now — keep playing free",
    "supporter.sheet.help": "Purchase help",
    "supporter.sheet.saveTitle": "Save your Supporter purchase",
    "supporter.sheet.saveBody": "Enter your email so we can send your six HSK guides and restore your Supporter purchase on another device. No password required.",
    "supporter.sheet.accountReady": "Account ready — you can continue to secure checkout",
    "supporter.sheet.active": "Supporter active ✓",
    "supporter.sheet.activeBody": "Thank you! Your permanent Supporter benefits are active on this account.",
    "supporter.download.btn": "Download your guides",
    "supporter.download.failed": "Download failed — please try again",
    "supporter.download.signin": "Sign in with the account you bought Supporter on to download",
    "account.supporterChip": "Supporter ♥",
    "item.supporter": "Supporter Pack",
    "item.coins_s": "Coin Pouch",
    "item.coins_m": "Coin Stack",
    "item.coins_l": "Coin Chest",
    "item.coins_xl": "Coin Vault",
    "shop.maxed": "★★★",
    "season.summer": "Summer",
    "season.midautumn": "Mid-Autumn",
    "season.cny": "Lunar New Year",
    // shop items (CATALOG ids, pass 2) — display-name fallback for t("item."+id)
    "item.market": "Night Market",
    "item.temple": "Temple Dawn",
    "item.bamboo": "Bamboo",
    "item.sakura-fx": "Sakura Petals",
    "item.firecracker-fx": "Firecrackers",
    "item.bells": "Temple Bells",
    "item.arcade": "Arcade",
    "item.streak-freeze": "Streak Freeze",
    "item.streak-freeze.desc": "Covers a missed day — your streak survives",
    "item.panda": "Panda",
    "item.ninja": "Ninja",
    "item.astronaut": "Astronaut",
    "item.harbor-night": "Harbor Night",
    "item.snow-festival": "Snow Festival",
    "item.lion-drum": "Lion Dance Drum",
    "item.star-shower": "Star Shower",
    "item.beach": "Beach Cat",
    "item.island-sunset": "Island Sunset",
    "item.mooncake-rabbit": "Mooncake Rabbit",
    "item.lantern-festival": "Lantern Festival",
    "item.dragon": "Dragon",
    "item.dragon-gate": "Dragon Gate",
    // howto
    "howto.title": "How to play",
    "howto.stepSeeTitle": "See the word",
    "howto.stepSeeBody": "Read the Chinese word and its pinyin. Tap the speaker whenever you want to hear it.",
    "howto.stepChooseTitle": "Choose its meaning",
    "howto.stepChooseBody": "Pick the correct meaning. First-try answers build your Lucky Flow.",
    "howto.stepLearnTitle": "Learn and continue",
    "howto.stepLearnBody": "Missed words return soon, so every quest ends with the planned words learned.",
    "howto.advanced": "Review Challenges and Learn mode",
    "howto.credits": "Audio, examples, and credits",
    "howto.try": "Try a 5-word quest",
    "howto.intro": "Follow Lucky Cat along the <b>Lantern Trail</b>. Each stop presents a Chinese word with pinyin.",
    "howto.tapMeaning": "Choose the <b>correct meaning</b>. Consecutive first-try answers build Lucky Flow.",
    "howto.oneShot": "Missed words return.",
    "howto.oneShotDetail": "A wrong tap reveals the answer and adds the word to your Review Pouch, so you can learn it when it returns.",
    "howto.tooSlow": "If time runs out, the answer is revealed and the word returns soon. Your Word Quest continues until every planned word is learned.",
    "howto.reviewChallenge": "Every tenth planned word becomes a <b>two-step Review Challenge</b>: meaning first, then reverse recall.",
    "howto.results": "Finish every planned word to receive a results postcard with learned words, extra practice, rewards, and your next review.",
    "howto.everyWord": "Every word shows <b>pinyin</b> and can be <b>heard aloud</b> — during the Word Quest, in flashcards, and in extra-practice review.",
    "howto.learnMode": "<b>Learn mode</b> drills the same word pool as flashcards first, so you can study, then play.",
    "howto.attribution": "Some example sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR.",
    // battle HUD + pause overlay (M4)
    "battle.round": "Round {label}",
    "battle.wordQuest": "Word Quest",
    "battle.routeName": "Lantern Trail",
    "battle.reviewPouch": "Review Pouch {n}",
    "battle.learnedProgress": "Learned {label}",
    "battle.luckyFlow": "Lucky Flow",
    "battle.promptChoose": "Choose the correct meaning.",
    "battle.promptMeaning": "Choose the correct meaning.",
    "battle.promptListen": "Listen, then choose the meaning you heard.",
    "battle.promptReverse": "Choose the hanzi that matches the meaning.",
    "battle.promptTone": "Choose the correct pinyin and tone.",
    "battle.promptCloze": "Choose the word that completes the sentence.",
    "battle.promptTyped": "Type the pinyin letters, then choose any tones shown.",
    "battle.reviewChallengeIntro": "Review Challenge · recall this word in two steps.",
    "battle.feedbackLearned": "Got it — this word is growing stronger.",
    "battle.feedbackReview": "Added to your Review Pouch — you will see it again soon.",
    "battle.pause": "Pause",
    "battle.paused": "Paused",
    "battle.resume": "Resume",
    "battle.quit": "Quit",
    "battle.quitConfirm": "Quit this quest?",
    "battle.audioGroup": "Audio",
    "battle.learningAidsGroup": "Learning aids",
    "battle.wordAudio": "Word audio",
    "battle.pinyin": "Pinyin",
    "battle.on": "On",
    "battle.off": "Off",
    "settings.sfxVol": "SFX volume",
    "settings.voiceVol": "Pronunciation",
    "settings.analytics": "Share anonymous usage data",
    "settings.analyticsHint": "Helps improve the game. No personal info, no word history. Off by default.",
    "settings.privacy": "Privacy Policy",
    "settings.terms": "Terms of Service",
    "settings.refund": "Refund Policy",
    "battle.canvasLabel": "Word Quest scene. Press Enter or Space to replay the word's audio (when available).",
    "battle.canvasWord": "Current word: {h}, pinyin {p}. Press Enter or Space to replay its audio.",
    "battle.canvasHanzi": "Current hanzi: {h}. Use the task below to recall its pinyin.",
    "battle.canvasListen": "Listen-only word. Press Enter or Space to replay the audio, then choose its meaning.",
    "battle.canvasHidden": "The answer is hidden for this recall task. Read the prompt and choices below.",
    "battle.canvasRevealed": "Answer revealed: {h}, pinyin {p}. Press Enter or Space to replay its audio.",
    "battle.replay": "Play it again",
    "battle.reversePrompt": "Pick the hanzi for: {meaning}",
    "battle.introOk": "Got it!",
    "battle.introListen": "New: listen first! Play the sound and tap the meaning you hear.",
    "battle.introReverse": "New: you know this word — now pick its hanzi from the meaning!",
    "battle.introTone": "New: tone check! Tap the pinyin with the right tone marks.",
    "battle.introCloze": "New: fill the blank! Pick the word that completes the sentence.",
    "battle.introTyped": "Master level — now you type it!\n1 · Type the pinyin letters\n2 · Tap any tone selectors shown\n3 · Press CHECK!",
    "battle.typedPlaceholder": "type the pinyin letters",
    "battle.typedGo": "CHECK!",
    "battle.typedLettersOk": "letters right — check the tones!",
    "battle.typedTonesOk": "tones right — check the spelling!",
    "battle.toneAria": "tone {n} for {syl}",
    // T4 (battle-interface round): per-format instruction line above the
    // card's pinyin — TH strings flagged for native-review queue.
    "battle.instruction.meaning": "Choose the correct meaning",
    "battle.instruction.reverse": "Choose the hanzi",
    "battle.instruction.listen": "Listen, then choose",
    "battle.instruction.tone": "Choose the pinyin",
    "battle.instruction.typed": "Type the pinyin",
    "battle.instruction.cloze": "Fill the blank",
    // T10 (battle-interface round): kill floater text, "Correct!  +N XP".
    "battle.correct": "Correct!",
    // tones (v6 phase 3: standalone tone-discrimination minigame)
    "tones.title": "Tone Trainer",
    "tones.instruction": "Which tone did you hear?",
    "tones.replay": "Play it again",
    "tones.progress": "{i} / {n}",
    "tones.tone1": "1",
    "tones.tone2": "2",
    "tones.tone3": "3",
    "tones.tone4": "4",
    "tones.toneAria": "Tone {n}",
    "tones.roundDone": "Round done!",
    "tones.score": "{score} / {total} correct",
    "tones.bestStreak": "Best streak: {n}",
    "tones.reward": "+{coins} coins · +{xp} XP",
    "tones.again": "Play again",
    // common
    "common.back": "← Home",
    "common.backMore": "← More",
    "common.cancel": "Cancel",
    "common.done": "Done",
    "common.language": "Language",
  },
  th: {
    // home
    "home.smart": "ทบทวนแบบอัจฉริยะ",
    "home.flashcards": "บัตรคำ",
    "home.tones": "ฝึกวรรณยุกต์",
    "home.tonesDisabledHint": "ต้องเปิดเสียง",
    "home.shop": "ร้านค้า",
    "home.best": "สถิติดีที่สุด",
    "home.progress": "ความคืบหน้า",
    "home.howto": "วิธีเล่น",
    "home.sound": "เสียงประกอบ",
    "home.settings": "ตั้งค่า",
    "home.streakTitle": "เรียนต่อเนื่อง",
    "home.streakDays": "{n} วัน",
    "home.freezes": "น้ำแข็ง {n} ชิ้น",
    "home.freeze-one": "น้ำแข็ง 1 ชิ้น",
    "home.start": "เริ่มเลย",
    "home.startReview": "ถึงเวลาทบทวน {n} คำ",
    "home.startHint": "ต้องมีอย่างน้อย 8 คำในขอบเขตถึงจะเริ่มได้ — ขยายขอบเขตด้านล่างได้เลย",
    "home.scopeWords": "{n} คำ",
    "home.levelChip": "Lv {lv}",
    "home.nextReview": "มีคำที่ถึงเวลาทบทวน {n} คำ — ทบทวนอัจฉริยะพร้อมแล้ว", // TH-REVIEW
    "home.nextQuest": "ต่อไป: ภารกิจเส้นทางโคมไฟ {n} คำ", // TH-REVIEW
    // i18n pass 3 — NEW strings, best-effort TH pending native review (see docs/i18n)
    "growth.title": "แมวนำโชค · Lv {lv}",
    "growth.allUnlocked": "ปลดล็อกครบทุกเป้าหมายแล้ว!",
    "progress.levelRow": "{pct} เชี่ยวชาญ · พบแล้ว {seen}/{total} คำ",
    "common.playAudio": "เล่นเสียง",
    "common.close": "ปิด",
    "common.continue": "ไปต่อ", // TH-REVIEW
    "battle.critical": "สุดยอด!",
    "toast.freeze-used": "ใช้น้ำแข็งกันหลุดแล้ว — สถิติ {n} วันของคุณยังอยู่",
    "notify.streak.title": "อย่าให้สถิติ {n} วันหลุดนะ!",
    "notify.streak.body": "อีก {remaining} คำ การเรียนต่อเนื่องก็ไม่ขาด — เล่นภารกิจคำศัพท์สั้น ๆ ก็พอ",
    "notify.comeback.title": "เจ้าแมวนำโชคคิดถึงคุณนะ 🐱",
    "notify.comeback.body": "คุณเรียนต่อเนื่องมาตั้ง {n} วัน — กลับมาลุยต่อกันเลย!",
    "notify.cat.title": "เจ้าแมวนำโชคกลับมาแล้ว", // TH-REVIEW
    "notify.cat.body": "ความทรงจำใหม่จากการเดินทางพร้อมให้คุณเก็บแล้ว", // TH-REVIEW
    // account (client-auth round)
    "account.row": "บัญชี",
    "account.title": "บัญชี",
    "account.status.local": "อยู่บนเครื่องนี้",
    "account.status.guest": "บัญชีผู้เยี่ยมชม",
    "account.status.signedIn": "เข้าสู่ระบบเป็น {email}",
    "account.explain.offline": "บัญชีคลาวด์ต้องใช้อินเทอร์เน็ต — ความคืบหน้าของคุณยังปลอดภัยบนเครื่องนี้",
    "account.explain.local": "ความคืบหน้าของคุณอยู่บนเครื่องนี้ เชื่อมต่อเพื่อสำรองข้อมูลบนคลาวด์",
    "account.explain.guest": "เชื่อมต่อแบบผู้เยี่ยมชมแล้ว เพิ่มอีเมลเพื่อไม่ให้บัญชีหายไปพร้อมเครื่อง",
    "account.explain.signedIn": "บัญชีของคุณเชื่อมต่อแล้ว ความคืบหน้าจะสำรองขึ้นคลาวด์ให้อัตโนมัติ",
    "account.connect": "สำรองความคืบหน้าของฉัน",
    "account.stepEmail": "1 จาก 2 · เพิ่มอีเมล", // TH-REVIEW
    "account.stepVerify": "2 จาก 2 · ยืนยันตัวตน", // TH-REVIEW
    "account.codeFor": "กรอกรหัสที่ส่งไปยัง {email}", // TH-REVIEW
    "account.sendCode": "ส่งรหัส",
    "account.verify": "ยืนยัน",
    "account.resend": "ส่งรหัสอีกครั้ง",
    "account.resendWait": "ส่งใหม่ได้ใน {s} วิ",
    "account.signOut": "ออกจากระบบ",
    "account.delete": "ลบบัญชี", // TH-REVIEW
    "account.deleteConfirm": "ลบข้อมูลบนคลาวด์อย่างถาวรหรือไม่? การออกจากระบบจะเก็บข้อมูลไว้", // TH-REVIEW
    "account.deleteConfirmYes": "ลบถาวร", // TH-REVIEW
    "account.deleteCancel": "ยกเลิก", // TH-REVIEW
    "account.deleteDone": "ลบบัญชีคลาวด์แล้ว", // TH-REVIEW
    "account.deleteFail": "ลบไม่สำเร็จ — ลองอีกครั้ง", // TH-REVIEW
    "account.emailPh": "your@email.com",
    "account.codePh": "รหัสจากอีเมล",
    "account.codeSent": "ส่งรหัสแล้ว — เช็กอีเมลของคุณ",
    "account.changeEmail": "ใช้อีเมลอื่น",
    "account.signedIn": "เข้าสู่ระบบแล้ว!",
    "account.signedOut": "ออกจากระบบแล้ว",
    "account.err.offline": "ไม่มีการเชื่อมต่ออินเทอร์เน็ต",
    "account.err.network": "ติดต่อคลาวด์ไม่ได้ — ลองอีกครั้ง",
    "account.err.badEmail": "อีเมลนี้ดูไม่ถูกต้อง",
    "account.err.badCode": "รหัสผิดหรือหมดอายุ — ลองอีกครั้ง",
    "account.lastSynced": "ซิงค์ล่าสุด {when}",
    "account.neverSynced": "ยังไม่ได้ซิงค์",
    "account.restored": "กู้คืนความคืบหน้าแล้ว ✓",
    "account.benefit.safe": "สำรองสถิติ เหรียญ และคำที่เชี่ยวชาญของคุณไว้ให้",
    "account.benefit.devices": "ใช้ได้ทั้งมือถือและคอมพิวเตอร์ — เล่นต่อจากที่ค้างไว้",
    "account.benefit.free": "ฟรี — ไม่ต้องตั้งรหัสผ่าน แค่อีเมลทีหลังถ้าต้องการ",
    "milestone.scarf": "ผ้าพันคอสีแดง",
    "milestone.coin": "เครื่องรางเหรียญทอง",
    "milestone.outfit": "ชุดจีน",
    "milestone.kitten": "ลูกแมวติดตาม",
    "milestone.emperor": "มงกุฎจักรพรรดิ",
    "streak.restUsed": "🍵 ใช้วันพักแล้ว — สถิติ {n} วันของคุณยังอยู่",
    // first run (A4)
    "welcome.title": "ยินดีต้อนรับ!",
    "welcome.blurb": "เรียนคำศัพท์จีนผ่านการเล่น — วันละไม่กี่นาที",
    "welcome.language": "ภาษาของคุณ",
    "welcome.level": "เริ่มที่ระดับ",
    "welcome.levelHint": "เพิ่งเริ่ม HSK ใช่ไหม? เริ่มที่ HSK1 และเปลี่ยนได้ทุกเมื่อ",
    "welcome.start": "เริ่มเรียนเลย",
    "welcome.promise": "เริ่มจากเรียน 6 คำ แล้วเล่นภารกิจคำศัพท์สั้น ๆ", // TH-REVIEW
    "onboarding.language": "ภาษาของคุณ", // TH-REVIEW
    "onboarding.createAccount": "สร้างบัญชีฟรี", // TH-REVIEW
    "onboarding.tryFirst": "ลองเล่นหนึ่งภารกิจก่อน", // TH-REVIEW
    "onboarding.playOffline": "เล่นแบบออฟไลน์", // TH-REVIEW
    "onboarding.freePromise": "เกมเต็มเล่นฟรี บัญชีมีไว้บันทึกความก้าวหน้าข้ามอุปกรณ์เท่านั้น", // TH-REVIEW
    "onboarding.accountTitle": "บันทึกการผจญภัยของคุณ", // TH-REVIEW
    "onboarding.accountBlurb": "กรอกอีเมล แล้วเราจะส่งรหัสเข้าสู่ระบบให้ ไม่ต้องใช้รหัสผ่าน", // TH-REVIEW
    "onboarding.emailLabel": "อีเมล", // TH-REVIEW
    "onboarding.noPassword": "บัญชีฟรี · ไม่ต้องใช้รหัสผ่าน · ไม่ต้องจ่ายเงิน", // TH-REVIEW
    "onboarding.verifyTitle": "ตรวจสอบอีเมลของคุณ", // TH-REVIEW
    "onboarding.codeLabel": "รหัสเข้าสู่ระบบ", // TH-REVIEW
    "onboarding.levelTitle": "เลือกระดับเริ่มต้น", // TH-REVIEW
    "onboarding.levelBlurb": "ภารกิจแนะนำครั้งแรกใช้คำจริง 6 คำจากระดับนี้", // TH-REVIEW
    "onboarding.levelHint": "ยังไม่แน่ใจใช่ไหม? เริ่มที่ HSK1 ได้เลย และเปลี่ยนภายหลังได้", // TH-REVIEW
    "onboarding.startQuest": "เริ่มภารกิจคำศัพท์แรก", // TH-REVIEW
    "onboarding.questPromise": "6 คำ · ประมาณ 2 นาที · มีคำแนะนำระหว่างเล่น", // TH-REVIEW
    "onboarding.quest.guide": "คู่มือภารกิจแรก", // TH-REVIEW
    "onboarding.quest.wordTitle": "มารู้จัก {word}", // TH-REVIEW
    "onboarding.quest.wordBody": "นี่คือคำภาษาจีน ออกเสียงว่า {pinyin} แตะการ์ดคำเพื่อฟังซ้ำได้", // TH-REVIEW
    "onboarding.quest.answersTitle": "เลือกความหมาย", // TH-REVIEW
    "onboarding.quest.answersBody": "แตะคำตอบที่ตรงกับคำภาษาจีน ตัวจับเวลาจะเริ่มหลังจากปิดคำแนะนำนี้", // TH-REVIEW
    "onboarding.quest.letsPlay": "เริ่มเล่น", // TH-REVIEW
    "onboarding.quest.correctTip": "เยี่ยม! คำตอบที่ถูกจะส่องทางและให้เหรียญนำโชค", // TH-REVIEW
    "onboarding.quest.reviewTip": "ไม่เป็นไร คำที่ตอบพลาดจะกลับมาให้ลองอีกครั้งในภารกิจนี้", // TH-REVIEW
    "onboarding.quest.progressTip": "ความก้าวหน้า: เรียนแล้ว {learned}/{target} คำ ทำครบหกคำเพื่อจบภารกิจ", // TH-REVIEW
    "onboarding.results.saveTitle": "เก็บภารกิจแรกของคุณไว้", // TH-REVIEW
    "onboarding.results.saveBody": "สร้างบัญชีฟรีเพื่อสำรองคำศัพท์ เหรียญ และความก้าวหน้าต่อไป ไม่ต้องจ่ายเงิน", // TH-REVIEW
    "onboarding.results.readyTitle": "บันทึกความก้าวหน้าแล้ว", // TH-REVIEW
    "onboarding.results.readyBody": "ชมทัวร์สั้น ๆ เพื่อดูจุดเริ่มเล่น เยี่ยมเจ้าแมว และตรวจสอบความก้าวหน้า", // TH-REVIEW
    "onboarding.results.save": "บันทึกความก้าวหน้า", // TH-REVIEW
    "onboarding.results.continueFree": "เล่นต่อโดยไม่สร้างบัญชี", // TH-REVIEW
    "onboarding.results.tour": "พาชมแอป", // TH-REVIEW
    "onboarding.tour.homeTitle": "หน้าหลักเริ่มภารกิจถัดไป", // TH-REVIEW
    "onboarding.tour.homeBody": "ปุ่มภารกิจคำศัพท์ขนาดใหญ่จะเลือกเซสชันที่เหมาะให้คุณ ส่วนแฟลชการ์ดและฝึกโทนเสียงเป็นตัวเลือกเสริม", // TH-REVIEW
    "onboarding.tour.catTitle": "เจ้าแมวเติบโตไปกับการเรียน", // TH-REVIEW
    "onboarding.tour.catBody": "ทำเป้าหมายคำศัพท์วันนี้ให้ครบ แล้วส่งแมวนำโชคออกสำรวจเพื่อนำความทรงจำกลับมา", // TH-REVIEW
    "onboarding.tour.profileTitle": "โปรไฟล์แสดงภาพรวม", // TH-REVIEW
    "onboarding.tour.profileBody": "ดูคำที่เชี่ยวชาญ สถิติ สติกเกอร์ และการซิงก์บัญชีได้ที่นี่ การสนับสนุนแบบชำระเงินเป็นทางเลือกและไม่ปลดล็อกเกม", // TH-REVIEW
    "onboarding.tour.count": "ทัวร์ {current} จาก {total}", // TH-REVIEW
    "onboarding.tour.skip": "ข้ามทัวร์", // TH-REVIEW
    "onboarding.tour.finish": "จบทัวร์", // TH-REVIEW
    "onboarding.tour.replay": "ดูทัวร์แอปอีกครั้ง", // TH-REVIEW
    "results.introHint": "ครั้งแรกเยี่ยมไปเลย! พรุ่งนี้กลับมาเริ่มเรียนต่อเนื่องกันนะ 🍵",
    // bottom nav (M2)
    "nav.home": "หน้าหลัก",
    "nav.cat": "เจ้าแมว",
    "nav.progress": "โปรไฟล์",
    "nav.more": "เพิ่มเติม",
    // Cat Journey
    "cat.eyebrow": "เพื่อนคู่ใจในการเรียน", // TH-REVIEW
    "cat.title": "การเดินทางของแมวนำโชค", // TH-REVIEW
    "cat.memories": "ความทรงจำ", // TH-REVIEW
    "cat.memoriesTitle": "ความทรงจำจากการเดินทาง", // TH-REVIEW
    "cat.memoriesEmpty": "ทำเป้าหมายวันนี้ให้สำเร็จ แล้วส่งเจ้าแมวออกสำรวจเพื่อสร้างความทรงจำแรก", // TH-REVIEW
    "cat.memoriesMore": "แสดงความทรงจำที่เก่ากว่า", // TH-REVIEW
    "cat.backgrounds": "ฉากหลัง", // TH-REVIEW
    "cat.profile": "ความคืบหน้าของฉัน", // TH-REVIEW
    "cat.customizeQuests": "แต่งภารกิจคำศัพท์", // TH-REVIEW
    "cat.away": "กำลังสำรวจแถวนี้…", // TH-REVIEW
    "cat.characterAlt": "เจ้าแมวนำโชค เพื่อนคู่ใจในการเรียนของคุณ", // TH-REVIEW
    "cat.bond": "สายสัมพันธ์กับเจ้าแมว", // TH-REVIEW
    "cat.dailyGoal": "เป้าหมายประจำวัน", // TH-REVIEW
    "cat.bondPoints": "สายสัมพันธ์ {n}", // TH-REVIEW
    "cat.bondNext": "อีก {n} ถึง {name}", // TH-REVIEW
    "cat.bondMax": "สายสัมพันธ์เต็มแล้ว", // TH-REVIEW
    "cat.goalComplete": "ทำเป้าหมายวันนี้สำเร็จ ✓", // TH-REVIEW
    "cat.goalProgress": "วันนี้ {done}/{goal} คำ", // TH-REVIEW
    "cat.status.ready": "ออกสำรวจ 20 นาที · นำความทรงจำกลับมา 1 ชิ้น", // TH-REVIEW
    "cat.status.exploring": "เจ้าแมวกำลังสำรวจ กลับมาในอีกประมาณ {n} นาที", // TH-REVIEW
    "cat.status.returned": "เจ้าแมวกลับมาพร้อมเรื่องเล่าให้คุณ!", // TH-REVIEW
    "cat.status.done": "วันนี้เป็นวันที่ดีด้วยกัน ได้เวลาพักสบาย ๆ แล้ว", // TH-REVIEW
    "cat.status.needsGoal": "เรียนวันนี้ให้ครบ {goal} คำ เพื่อออกผจญภัย · {done}/{goal}", // TH-REVIEW
    "cat.cta.study": "เรียนตอนนี้", // TH-REVIEW
    "cat.cta.explore": "ออกไปสำรวจ", // TH-REVIEW
    "cat.cta.exploring": "เรียนระหว่างที่เจ้าแมวสำรวจ", // TH-REVIEW
    "cat.cta.return": "เก็บความทรงจำนี้", // TH-REVIEW
    "cat.cta.studyMore": "เรียนเพิ่มอีกนิด", // TH-REVIEW
    "cat.bg.home": "ห้องเรียน", // TH-REVIEW
    "cat.bg.garden": "สวนคำศัพท์", // TH-REVIEW
    "cat.bg.market": "ตลาดยามเช้า", // TH-REVIEW
    "cat.bg.lantern": "ริมแม่น้ำแสงโคม", // TH-REVIEW
    "cat.bg.scholar": "ประตูบัณฑิต", // TH-REVIEW
    "cat.bg.select": "ใช้ฉาก {name}", // TH-REVIEW
    "cat.bg.locked": "{name} ปลดล็อกเมื่อสายสัมพันธ์ถึง {n}", // TH-REVIEW
    "cat.bg.selected": "เลือกแล้ว", // TH-REVIEW
    "cat.bg.points": "สายสัมพันธ์ {n}", // TH-REVIEW
    "cat.tier.studyBuddy": "เพื่อนเรียน", // TH-REVIEW
    "cat.tier.curiousPaws": "อุ้งเท้าช่างสงสัย", // TH-REVIEW
    "cat.tier.explorer": "นักสำรวจละแวกบ้าน", // TH-REVIEW
    "cat.tier.lanternFriend": "เพื่อนแสงโคม", // TH-REVIEW
    "cat.tier.scholarCat": "แมวบัณฑิต", // TH-REVIEW
    "cat.memory.leaf.title": "ใบไม้จากสวน", // TH-REVIEW
    "cat.memory.leaf.story": "เจ้าแมวพบใบไม้รูปหัวใจข้างทางอ่านหนังสืออันเงียบสงบ และเก็บไว้ให้คุณ", // TH-REVIEW
    "cat.memory.tea.title": "ไอชาอุ่น ๆ", // TH-REVIEW
    "cat.memory.tea.story": "เพื่อนบ้านในตลาดแบ่งชาถ้วยเล็กให้ ขณะที่เจ้าแมวตั้งใจฟังคำศัพท์ใหม่", // TH-REVIEW
    "cat.memory.lantern.title": "แสงโคม", // TH-REVIEW
    "cat.memory.lantern.story": "โคมดวงหนึ่งสะท้อนเหมือนพระจันทร์ดวงน้อย เจ้าแมวเดินตามแสงนั้นกลับบ้าน", // TH-REVIEW
    "cat.memory.bridge.title": "แสงบนสะพาน", // TH-REVIEW
    "cat.memory.bridge.story": "เจ้าแมวหยุดบนสะพาน มองทุกเงาสะท้อนสว่างกลายเป็นเส้นทาง", // TH-REVIEW
    "cat.memory.blossom.title": "ดอกเหมย", // TH-REVIEW
    "cat.memory.blossom.story": "กลีบสีชมพูอ่อนตกบนกระเป๋า พอดีสำหรับคั่นบทเรียนวันนี้", // TH-REVIEW
    "cat.memory.brush.title": "พู่กันของบัณฑิต", // TH-REVIEW
    "cat.memory.brush.story": "ที่ศาลาบนเขา เจ้าแมวเห็นพู่กันเปลี่ยนการฝึกฝนอย่างตั้งใจให้เป็นความก้าวหน้า", // TH-REVIEW
    "cat.memory.book.title": "ริบบิ้นหนังสือสีเขียว", // TH-REVIEW
    "cat.memory.book.story": "เจ้าแมวนำริบบิ้นกลับมา เพื่อคั่นหน้าว่าพวกคุณเรียนมาด้วยกันไกลแค่ไหนแล้ว", // TH-REVIEW
    "cat.memory.market.title": "ส้มจากตลาด", // TH-REVIEW
    "cat.memory.market.story": "เจ้าของร้านเลือกส้มที่สดใสที่สุด เป็นรางวัลแสนร่าเริงสำหรับความพยายามวันนี้", // TH-REVIEW
    "cat.memory.archived.title": "ความทรงจำล้ำค่า", // TH-REVIEW
    "cat.memory.archived.story": "เจ้าแมวเก็บความทรงจำจากการเดินทางครั้งก่อนไว้อย่างดี", // TH-REVIEW
    "cat.memory.from": "จาก {place}", // TH-REVIEW
    "cat.memory.playWord": "ฟังเสียง {word}", // TH-REVIEW
    "home.cat.progress": "การเดินทางของเจ้าแมว · {done}/{goal} คำ", // TH-REVIEW
    "home.cat.ready": "เจ้าแมวพร้อมออกสำรวจแล้ว", // TH-REVIEW
    "home.cat.exploring": "เจ้าแมวกำลังสำรวจ · ประมาณ {n} นาที", // TH-REVIEW
    "home.cat.returned": "ยินดีต้อนรับกลับ · ความทรงจำพร้อมแล้ว", // TH-REVIEW
    // Cat Journey evergreen-v1 expansion — Thai draft, native sign-off remains
    // a release gate in the full-product execution plan.
    "cat.memory.sunnyWindow.title": "หน้าต่างรับแดด", // TH-REVIEW
    "cat.memory.sunnyWindow.story": "เจ้าแมวพบมุมอุ่น ๆ ที่แสงแดดส่องถึง และเก็บที่นั่งสบายที่สุดไว้ให้บทเรียนครั้งหน้า", // TH-REVIEW
    "cat.memory.pageCorner.title": "มุมหน้ากระดาษ", // TH-REVIEW
    "cat.memory.pageCorner.story": "สายลมเปิดหนังสือทีละหน้า ขณะที่เจ้าแมวคอยเฝ้าหน้าที่คุณอ่านค้างไว้อย่างใจเย็น", // TH-REVIEW
    "cat.memory.pencilCurl.title": "เศษดินสอม้วน", // TH-REVIEW
    "cat.memory.pencilCurl.story": "เศษดินสอที่เหลาแล้วม้วนเหมือนหางแมวเล็ก ๆ อยู่ข้างหนังสือสีเขียว", // TH-REVIEW
    "cat.memory.littleBell.title": "เสียงกระดิ่งน้อย", // TH-REVIEW
    "cat.memory.littleBell.story": "กระดิ่งหน้าห้องเรียนดังเบา ๆ หนึ่งครั้ง ราวกับกำลังยินดีกับความก้าวหน้าของวันนี้", // TH-REVIEW
    "cat.memory.bambooShadow.title": "เงาไผ่", // TH-REVIEW
    "cat.memory.bambooShadow.story": "เงาไผ่พาดผ่านทางเหมือนเส้นพู่กันอ่อน ๆ ขณะที่เจ้าแมวเดินเล่นในสวน", // TH-REVIEW
    "cat.memory.koiRipple.title": "ระลอกน้ำของปลาคาร์ป", // TH-REVIEW
    "cat.memory.koiRipple.story": "ปลาคาร์ปช่างสงสัยว่ายเป็นวงกลมพอดี เจ้าแมวจึงนั่งรอจนผิวน้ำนิ่งอีกครั้ง", // TH-REVIEW
    "cat.memory.gardenKite.title": "ว่าวในสวน", // TH-REVIEW
    "cat.memory.gardenKite.story": "ว่าวกระดาษลอยเหนือศาลา ก้มลงมาทักทายก่อนจะลอยสูงขึ้นอีกครั้ง", // TH-REVIEW
    "cat.memory.morningDew.title": "น้ำค้างยามเช้า", // TH-REVIEW
    "cat.memory.morningDew.story": "หยดน้ำใสเกาะบนใบไม้เหมือนลูกแก้วเม็ดจิ๋ว เรียงอยู่ตลอดทางอ่านหนังสือ", // TH-REVIEW
    "cat.memory.stonePath.title": "ทางหินอันเงียบสงบ", // TH-REVIEW
    "cat.memory.stonePath.story": "เจ้าแมวค่อย ๆ เดินตามก้อนหินสีอ่อน และพบว่าแต่ละก้าวง่ายขึ้นเรื่อย ๆ", // TH-REVIEW
    "cat.memory.marketTag.title": "ป้ายเปล่าจากตลาด", // TH-REVIEW
    "cat.memory.marketTag.story": "เจ้าของร้านให้ป้ายกระดาษสะอาดแก่เจ้าแมว เพื่อใช้คั่นหน้าคำศัพท์ที่จะเรียนต่อไป", // TH-REVIEW
    "cat.memory.basketRibbon.title": "ริบบิ้นจากตะกร้า", // TH-REVIEW
    "cat.memory.basketRibbon.story": "ริบบิ้นสีปะการังหลุดจากตะกร้าผลไม้ เจ้าแมวจึงนำกลับมาเก็บไว้ในกล่องความทรงจำ", // TH-REVIEW
    "cat.memory.sesameBun.title": "ขนมงาอุ่น ๆ", // TH-REVIEW
    "cat.memory.sesameBun.story": "คนทำขนมแบ่งขนมงาอุ่น ๆ ให้ กลิ่นหอมหวานติดตามเจ้าแมวไปตลอดทางกลับบ้าน", // TH-REVIEW
    "cat.memory.marketBell.title": "กระดิ่งตลาด", // TH-REVIEW
    "cat.memory.marketBell.story": "กระดิ่งไม้ในตลาดดังเสียงเป็นมิตรหนึ่งครั้ง เมื่อร้านสุดท้ายเปิดรับเช้าวันใหม่", // TH-REVIEW
    "cat.memory.umbrellaColors.title": "สีสันของร่มกระดาษ", // TH-REVIEW
    "cat.memory.umbrellaColors.story": "ร่มกระดาษเรียงเป็นลวดลายสดใสเหนือศีรษะ ขณะที่เจ้าแมวสำรวจตรอกอันเงียบสงบ", // TH-REVIEW
    "cat.memory.riverPebble.title": "ก้อนกรวดริมแม่น้ำ", // TH-REVIEW
    "cat.memory.riverPebble.story": "เจ้าแมวเลือกก้อนกรวดสีหยกผิวเรียบ ตรงจุดที่สายน้ำพบกับแสงโคม", // TH-REVIEW
    "cat.memory.moonReflection.title": "เงาจันทร์ในน้ำ", // TH-REVIEW
    "cat.memory.moonReflection.story": "พระจันทร์สั่นไหวอยู่บนผิวน้ำ แล้วกลับมากลมอีกครั้งเมื่อลมเย็นสงบลง", // TH-REVIEW
    "cat.memory.fireflyPath.title": "ทางแสงหิ่งห้อย", // TH-REVIEW
    "cat.memory.fireflyPath.story": "หิ่งห้อยสามตัวกะพริบแสงข้างแม่น้ำ ส่องเป็นทางเล็ก ๆ ให้เจ้าแมวกลับบ้าน", // TH-REVIEW
    "cat.memory.riversideCharm.title": "เครื่องรางริมแม่น้ำ", // TH-REVIEW
    "cat.memory.riversideCharm.story": "ใต้สะพานโค้ง เจ้าแมวพบเครื่องรางไม้เรียบง่ายที่สายน้ำขัดจนผิวเนียน", // TH-REVIEW
    "cat.memory.inkstoneLight.title": "แสงบนจานฝนหมึก", // TH-REVIEW
    "cat.memory.inkstoneLight.story": "แสงยามเช้าพาดผ่านจานฝนหมึก ขณะที่ศาลาเงียบสงบพอสำหรับการเรียนอย่างตั้งใจ", // TH-REVIEW
    "cat.memory.mountainCloud.title": "เมฆเหนือภูเขา", // TH-REVIEW
    "cat.memory.mountainCloud.story": "เมฆก้อนเล็กลอยต่ำกว่าประตูบัณฑิต ทำให้ศาลาดูสูงเหนือโลกกว้าง", // TH-REVIEW
    "cat.memory.scholarBookmark.title": "ที่คั่นหนังสือของบัณฑิต", // TH-REVIEW
    "cat.memory.scholarBookmark.story": "เจ้าแมวพบด้ายสีเขียวเรียบ ๆ แล้วผูกเป็นที่คั่นหนังสือสำหรับบทถัดไป", // TH-REVIEW
    "cat.memory.scholarDesk.title": "โต๊ะบัณฑิตอันเงียบสงบ", // TH-REVIEW
    "cat.memory.scholarDesk.story": "โต๊ะสะอาด หนังสือที่ปิดไว้ และเช้าอันสงบ รออยู่ด้วยกันที่ศาลาบนเขา", // TH-REVIEW
    "cat.announce.started": "เจ้าแมวออกเดินทางของวันนี้แล้ว", // TH-REVIEW
    "cat.announce.returned": "ได้รับความทรงจำใหม่: {name}", // TH-REVIEW
    "cat.announce.background": "เปลี่ยนฉากการเดินทางแล้ว", // TH-REVIEW
    "shop.dailyCatEmpty": "คุณมีของแนะนำวันนี้ครบแล้ว ของใหม่มาตอนเที่ยงคืน", // TH-REVIEW
    "more.tagline": "Lucky Cat HSK — เรียนคำศัพท์ที่ออกข้อสอบจริง",
    "more.learnHelp": "เล่นและความช่วยเหลือ", // TH-REVIEW
    "more.settings": "ตั้งค่า", // TH-REVIEW
    "more.accountPrivacy": "บัญชีและความเป็นส่วนตัว", // TH-REVIEW
    "more.version": "Lucky Cat HSK · เวอร์ชัน 0.2.0", // TH-REVIEW
    "quests.title": "ภารกิจประจำวัน",
    "quests.button": "ภารกิจ",
    // scope
    "scope.title": "เลือกคำศัพท์",
    "scope.levels": "ระดับ",
    "scope.filters": "ตัวกรอง",
    "scope.highYield": "เฉพาะคำที่ออกข้อสอบบ่อย",
    "scope.newOnly": "เฉพาะคำใหม่",
    "scope.topN": "จัดอันดับตามความถี่",
    "scope.all": "ทั้งหมด",
    "scope.meaningLang": "ภาษาที่ใช้แสดงความหมาย",
    "scope.english": "ภาษาอังกฤษ",
    "scope.both": "ทั้งสอง",
    "scope.sessionLen": "จำนวนคำต่อรอบ",
    "scope.stepWords": "1 · เลือกคำศัพท์", // TH-REVIEW
    "scope.moreFilters": "ตัวกรองคำศัพท์เพิ่มเติม", // TH-REVIEW
    "scope.stepMeaning": "2 · ภาษาที่ใช้แสดงความหมาย", // TH-REVIEW
    "scope.stepSession": "3 · จำนวนคำต่อรอบ", // TH-REVIEW
    "scope.startQuest": "เริ่มภารกิจ {n} คำ", // TH-REVIEW
    "scope.custom": "กำหนดเอง",
    "scope.customLen": "จำนวนคำต่อรอบแบบกำหนดเอง", // TH-REVIEW
    "scope.customPh": "5–500",
    "scope.endless": "ไม่จำกัด",
    "scope.cards": "บัตรคำ",
    "scope.cardsResume": "เล่นบัตรคำต่อ · {n}",
    "scope.wordQuest": "ภารกิจคำศัพท์ · {n}",
    "scope.smartReview": "ทบทวนอัจฉริยะ",
    "scope.smartReviewProgress": "ทบทวนอัจฉริยะ · {have}/{min}",
    "scope.smartReviewReady": "ทบทวนอัจฉริยะ · {n}",
    "scope.smartReviewLocked": "เล่นสักรอบก่อน — ทบทวนอัจฉริยะจะเรียนรู้คำที่คุณยังไม่แม่น",
    "scope.readout": "คลังคำ: <b>{count}</b> คำ · ~<b>{pct}%</b> ของข้อสอบ",
    "scope.readoutNoThai": "* มี {n} คำที่ยังไม่มีภาษาไทย — แสดงภาษาอังกฤษแทน",
    // journey map (B3)
    "scope.tabPicker": "เลือกเอง",
    "scope.tabJourney": "เส้นทาง",
    "journey.youAreHere": "คุณอยู่ตรงนี้", // TH-REVIEW
    "journey.nodeAll": "HSK{lv} · คำทั้งหมด", // TH-REVIEW
    "journey.nodeTop": "HSK{lv} · {n} คำแรก", // TH-REVIEW
    "journey.play": "เล่น", // TH-REVIEW
    "journey.recommended": "แนะนำให้เล่นต่อ", // TH-REVIEW
    "journey.review": "ทบทวน", // TH-REVIEW
    "journey.continue": "เล่นต่อ", // TH-REVIEW
    "journey.start": "เริ่ม", // TH-REVIEW
    "journey.levelProgress": "ผ่านแล้ว {done} จาก {total} จุด", // TH-REVIEW
    // learn / flashcards
    "learn.exit": "ออก",
    "learn.stillLearning": "ฝึกอีกครั้ง",
    "learn.knowIt": "จำได้แล้ว",
    "learn.count": "เรียนแล้ว {done} · เหลือ {left}",
    "learn.hintFront": "แตะเพื่อพลิก · HSK{lv} · พบใน {ta}/{tt} ชุดข้อสอบ",
    "learn.hintBack": "แตะเพื่อพลิกกลับ",
    "fc.noThai": "ยังไม่มีภาษาไทย",
    "fc.inSentence": "ในประโยค",
    "wd.info": "รายละเอียดคำ",
    "wd.core": "หลัก",
    "wd.extended": "เพิ่มเติม",
    "wd.appearsInPapers": "พบใน {n} จาก {total} ชุดข้อสอบ",
    "wd.alsoInHsk3": "มีใน HSK 3.0 · ระดับ {band}",
    // results
    "results.roundOver": "ภารกิจคำศัพท์สำเร็จ",
    "results.routeLabel": "เส้นทางประตูหมู่บ้าน",
    "results.chapter": "บทที่ {n}",
    "results.learnedTarget": "เรียนรู้แล้ว {learned} / {target} คำ",
    "results.attempts": "ตอบทั้งหมด",
    "results.accuracy": "ความแม่นยำ",
    "results.lanterns": "โคมไฟ",
    "results.rewardTitle": "รางวัลนำโชค",
    "results.nextReviewPractice": "ต่อไป: ทบทวนคำที่ต้องฝึกเพิ่ม",
    "results.nextReviewTomorrow": "เส้นทางโคมไฟไปต่อพรุ่งนี้นะ",
    "results.supporterLine": "Lucky Cat ฟรีได้เพราะผู้สนับสนุน — มาร่วมเป็นหนึ่งในนั้นนะ 🐾", // TH-REVIEW: machine-drafted, queued for native spot-check
    "results.supporterCta": "ร่วมเป็นผู้สนับสนุน", // TH-REVIEW: machine-drafted, queued for native spot-check
    "results.lanternAlt": "โคมไฟที่จุดแล้ว",
    "results.missed": "คำที่ต้องฝึกเพิ่ม",
    "results.reviewWords": "ทบทวนคำ",
    "results.practiceMissed": "ฝึกคำเหล่านี้อีกครั้ง",
    "results.playAgain": "เล่นอีกครั้ง",
    "results.home": "หน้าหลัก",
    "results.banked": "+{score} เหรียญ · รวม {total}",
    "results.perfect": "ภารกิจคำศัพท์สมบูรณ์แบบ! โบนัส +{bonus} เหรียญ",
    "results.levelUp": "เลื่อนระดับ! Lv {lv}",
    "results.levelUpUnlocked": "เลื่อนระดับ! Lv {lv} — ปลดล็อก: {items}",
    "results.sub": "แม่นยำ {acc}% · {words} คำ · {key}",
    "results.bestTag": "สถิติใหม่!",
    "results.bestPrev": "ดีที่สุด {prev}",
    "results.questComplete": "ภารกิจสำเร็จ: {desc} +{reward} เหรียญ",
    "results.catReady": "ทำเป้าหมายวันนี้สำเร็จ — เจ้าแมวพร้อมออกสำรวจแล้ว", // TH-REVIEW
    "results.catReadyAction": "ไปหาเจ้าแมว", // TH-REVIEW
    "results.projectProgress": "+{earned} จากภารกิจนี้ · เหลืออีก {remaining} เหรียญ",
    "results.projectNoGain": "เหลืออีก {remaining} เหรียญ",
    "results.projectReadyEarned": "+{earned} จากภารกิจนี้ · พร้อมสร้างแล้ว!",
    "results.projectReady": "พร้อมสร้างแล้ว!",
    "results.viewProject": "ดูโปรเจกต์",
    "results.buildNow": "สร้างเลย",
    // quests
    "quest.status.done": "สำเร็จ",
    "quest.status.open": "ยังไม่เสร็จ",
    "quest.reward": "+{reward} เหรียญ",
    "quest.correct30": "ตอบถูก 30 คำ",
    "quest.combo5": "ทำจังหวะโชคดี ×5",
    "quest.boss1": "ผ่านด่านทบทวน",
    "quest.perfect1": "จบภารกิจคำศัพท์โดยไม่มีคำที่ต้องฝึกเพิ่ม",
    "quest.review1": "เล่นภารกิจทบทวนอัจฉริยะ",
    "quest.learn20": "ทำเครื่องหมายรู้แล้ว 20 บัตรคำ",
    // monthly quest layer (retention pack)
    "quest.monthly.title": "รายเดือน: {done}/{target} ภารกิจ",
    "quest.monthly.claim": "รับ +{reward}",
    "quest.monthly.badge": "ได้เหรียญตรารายเดือนแล้ว!",
    "quest.monthly.autoClaimed": "รับรางวัลรายเดือนให้คุณแล้ว: +{reward} เหรียญ",
    // scores / progress
    "scores.title": "สถิติดีที่สุด",
    "scores.empty": "ยังไม่มีสถิติ — เล่นภารกิจคำศัพท์ก่อน",
    "scores.play": "เล่นภารกิจคำศัพท์ครั้งแรก", // TH-REVIEW
    "progress.title": "โปรไฟล์",
    "progress.needsWork": "ต้องฝึกเพิ่ม",
    "progress.reviewThese": "ทบทวนคำเหล่านี้",
    "progress.practiceThese": "ฝึกคำเหล่านี้",
    "progress.nothing": "ไม่มีคำที่ต้องฝึก — ไปเล่นกันเลย!",
    // profile-first dashboard
    "profile.defaultName": "นักเรียนแมวนำโชค",
    "profile.editName": "แก้ไข",
    "profile.namePh": "ชื่อผู้เล่น",
    "profile.saveName": "บันทึก",
    "profile.cancelName": "ยกเลิก",
    "profile.level": "แมวนำโชค · Lv {lv}",
    "profile.xp": "{into}/{need} XP สู่เลเวลถัดไป",
    "profile.streak": "เรียนต่อเนื่อง {n} วัน",
    "profile.coins": "{n} เหรียญ",
    "profile.mastered": "คำที่เชี่ยวชาญ",
    "profile.seen": "คำที่เคยเรียน",
    "profile.stickers": "สติกเกอร์ที่ได้รับ",
    "profile.bestSession": "คะแนนรอบดีที่สุด",
    "profile.collectionTitle": "ของสะสมของคุณ",
    "profile.collectionCount": "ของตกแต่ง {owned}/{total}",
    "profile.stickerCount": "สติกเกอร์ {earned}/{total}",
    "profile.skin": "แมวในภารกิจคำศัพท์: {name}", // TH-REVIEW
    "profile.backdrop": "ฉากหลังภารกิจคำศัพท์: {name}", // TH-REVIEW
    "profile.defaultCat": "แมวเริ่มต้น",
    "profile.defaultBackdrop": "ค่าเริ่มต้น",
    "profile.viewCollection": "ดูของสะสม",
    "profile.viewAlbum": "อัลบั้มสติกเกอร์",
    "profile.tabOverview": "ภาพรวม", // TH-REVIEW
    "profile.tabProgress": "ความคืบหน้า", // TH-REVIEW
    "profile.tabCollection": "ของสะสม", // TH-REVIEW
    "profile.emptyTitle": "เส้นทางของคุณเริ่มที่นี่", // TH-REVIEW
    "profile.emptyBody": "เล่นภารกิจคำศัพท์สั้น ๆ หนึ่งรอบ เพื่อเริ่มบันทึกความคืบหน้า การเรียนต่อเนื่อง และของสะสม", // TH-REVIEW
    "profile.emptyCta": "เริ่มภารกิจแรก", // TH-REVIEW
    "profile.accountTitle": "บัญชีและการสำรองข้อมูล", // TH-REVIEW
    "profile.accountSummary": "สำรองความคืบหน้า หรือจัดการอีเมลที่เชื่อมต่อไว้", // TH-REVIEW
    "friend.yourCode": "รหัสของคุณ — แชร์เลย",
    "friend.share": "แชร์รหัสของฉัน",
    "friend.shareText": "มาเทียบความคืบหน้า Lucky Cat HSK กัน!",
    "friend.pasteLabel": "มีรหัสของเพื่อนไหม?",
    "friend.pastePlaceholder": "วางรหัสของเพื่อนที่นี่",
    "friend.compareBtn": "เทียบ",
    "friend.compareAnother": "เทียบคนอื่น",
    "friend.invalidCode": "รหัสนี้ดูไม่ถูกต้อง ขอรหัสใหม่จากเพื่อน",
    "friend.copied": "คัดลอกรหัสแล้ว",
    "friend.you": "คุณ",
    "friend.them": "เพื่อน",
    "friend.leadMine": "คุณนำอยู่! 🎉",
    "friend.leadTheirs": "เพื่อนนำอยู่ — ตามให้ทัน!",
    "friend.leadTie": "สูสีกันมาก!",
    "friend.metric.level": "เลเวล",
    "friend.metric.streak": "เรียนต่อเนื่อง (วัน)",
    "friend.metric.mastered": "คำที่เชี่ยวชาญ",
    "friend.metric.stickers": "สติกเกอร์ที่ได้รับ",
    "friend.inviteCta": "ชวนเพื่อน", // TH-REVIEW
    "friend.inviteTitle": "ชวนเพื่อน", // TH-REVIEW
    "friend.progressTitle": "เทียบความคืบหน้ากับเพื่อน", // TH-REVIEW
    "friend.progressSummary": "เทียบเลเวล การเรียนต่อเนื่อง คำที่เชี่ยวชาญ และสติกเกอร์กับเพื่อน", // TH-REVIEW
    "friend.compareCta": "เทียบความคืบหน้า", // TH-REVIEW
    "friend.inviteLead": "เรียนด้วยกันสนุกกว่า — ส่งการ์ดของคุณเลย!", // TH-REVIEW
    "friend.privacyNote": "รหัสและ QR ของคุณมีแค่ชื่อที่คุณตั้ง เลเวล และตัวเลขความคืบหน้า — ไม่มีบัญชี ไม่มีอีเมล ไม่มีข้อมูลส่วนตัว", // TH-REVIEW
    "friend.qrLabel": "หรือให้เพื่อนสแกนอันนี้:", // TH-REVIEW
    "friend.qrTooLong": "ชื่อของคุณยาวเกินไปสำหรับ QR — แชร์เป็นลิงก์แทนนะ", // TH-REVIEW
    "friend.recentTitle": "เพื่อนที่เคยเทียบกัน", // TH-REVIEW
    "friend.recentEmpty": "ยังไม่มีเพื่อนเลย — แชร์การ์ดของคุณเพื่อเริ่มกันเลย!", // TH-REVIEW
    "friend.recentClear": "ล้างรายชื่อ", // TH-REVIEW
    "friend.recentCleared": "ล้างรายชื่อเพื่อนแล้ว", // TH-REVIEW
    "friend.asOfToday": "ข้อมูลของวันนี้", // TH-REVIEW
    "friend.asOfDays": "ข้อมูลเมื่อ {n} วันก่อน", // TH-REVIEW
    "friend.namePrompt": "ใส่ชื่อของคุณให้เพื่อนรู้ว่าเป็นคุณ:", // TH-REVIEW
    "friend.namePromptSave": "บันทึกชื่อ", // TH-REVIEW
    "avatar.title": "รูปโปรไฟล์", // TH-REVIEW
    "avatar.change": "เปลี่ยนรูปโปรไฟล์", // TH-REVIEW
    "avatar.monogram": "ตัวอักษรย่อของคุณ", // TH-REVIEW
    "avatar.photo": "ใช้รูปถ่าย", // TH-REVIEW
    "avatar.photoHint": "รูปของคุณอยู่ในเครื่องนี้เท่านั้น — ไม่มีการอัปโหลดเด็ดขาด", // TH-REVIEW
    "avatar.removePhoto": "ลบรูปถ่าย", // TH-REVIEW
    "avatar.locked": "ปลดล็อกได้ในร้านค้า", // TH-REVIEW
    "avatar.seasonal": "แมวตามฤดูกาล — ดูในร้านค้า", // TH-REVIEW
    "avatar.photoError": "อ่านรูปนี้ไม่ได้ — ลองรูปอื่นดูนะ", // TH-REVIEW
    "avatar.photoTooBig": "รูปนี้มีรายละเอียดมากเกินไปจนบันทึกไม่ได้ — ลองรูปอื่นดูนะ", // TH-REVIEW
    "avatar.saveFailed": "พื้นที่ไม่พอสำหรับบันทึกรูป รูปเดิมของคุณยังอยู่", // TH-REVIEW
    "avatar.cat.lucky": "แมวนำโชค", // TH-REVIEW
    "profile.learningTitle": "ความคืบหน้าการเรียน",
    "common.backProfile": "← โปรไฟล์",
    // sticker album (B2 — earn-only, never sold)
    "progress.album": "อัลบั้มสติกเกอร์",
    "album.title": "อัลบั้มสติกเกอร์",
    "album.back": "← โปรไฟล์",
    "album.events": "อีเวนต์",
    "album.progress": "ได้รับสติกเกอร์ {earned} จาก {total} ชิ้น", // TH-REVIEW
    "album.nextTarget": "ชิ้นต่อไป: {name}", // TH-REVIEW
    "album.complete": "อัลบั้มครบแล้ว — สติกเกอร์ทุกชิ้นเป็นของคุณ!", // TH-REVIEW
    "album.filterNext": "เป้าหมายต่อไป", // TH-REVIEW
    "album.filterEarned": "ได้รับแล้ว", // TH-REVIEW
    "album.upNext": "เป้าหมายต่อไป", // TH-REVIEW
    "album.emptyEarned": "ยังไม่ได้รับสติกเกอร์ เล่นภารกิจคำศัพท์ให้จบเพื่อรับชิ้นแรก", // TH-REVIEW
    "sticker.scopeName": "HSK{lv} · Top {n}",
    "sticker.scopeHint": "เชี่ยวชาญคำศัพท์ Top {n} ของ HSK{lv} ให้ครบ",
    "sticker.msName": "HSK{lv} · {pct}%",
    "sticker.msHint": "เชี่ยวชาญ {pct}% ของ HSK{lv}",
    "sticker.welcomeName": "ยินดีต้อนรับ!",
    "sticker.welcomeHint": "เล่นจบรอบแรก",
    "sticker.bossName": "แชมป์ด่านทบทวน",
    "sticker.bossHint": "ผ่านด่านทบทวนครั้งแรก",
    "sticker.streak7Name": "เรียนต่อเนื่อง 7 วัน",
    "sticker.streak7Hint": "รักษาการเรียนต่อเนื่อง 7 วัน",
    "sticker.streak30Name": "เรียนต่อเนื่อง 30 วัน",
    "sticker.streak30Hint": "รักษาการเรียนต่อเนื่อง 30 วัน",
    "sticker.monthlyName": "แชมป์รายเดือน",
    "sticker.monthlyHint": "ทำภารกิจสำเร็จ 40 ครั้งในหนึ่งเดือน",
    "results.newSticker": "สติกเกอร์ใหม่: {name}",
    // shop / collection
    "shop.title": "ร้านค้า",
    "shop.skins": "แมวในภารกิจคำศัพท์", // TH-REVIEW
    "shop.backdrops": "ฉากหลังภารกิจคำศัพท์", // TH-REVIEW
    "shop.effects": "เอฟเฟกต์",
    "shop.sounds": "เสียง",
    "shop.catsNote": "เปลี่ยนแมวและลูกแมวที่เห็นในภารกิจคำศัพท์", // TH-REVIEW
    "shop.backdropsNote": "เปลี่ยนฉากหลังของภารกิจคำศัพท์", // TH-REVIEW
    "shop.effectsNote": "เปลี่ยนเอฟเฟกต์ฉลองหลังตอบถูก", // TH-REVIEW
    "shop.soundsNote": "เปลี่ยนเสียงเอฟเฟกต์ของเกม แต่ไม่เปลี่ยนเสียงอ่านภาษาจีน", // TH-REVIEW
    "shop.supplies": "ของใช้",
    "shop.categoryFeatured": "แนะนำ", // TH-REVIEW
    "shop.categoryCats": "แมว", // TH-REVIEW
    "shop.categoryBackdrops": "ฉากหลัง", // TH-REVIEW
    "shop.categoryEffects": "เอฟเฟกต์", // TH-REVIEW
    "shop.categorySounds": "เสียง", // TH-REVIEW
    "shop.categorySupplies": "ของใช้", // TH-REVIEW
    "shop.needMore": "ต้องการอีก {n} เหรียญ", // TH-REVIEW
    "shop.preview": "ลองดู",
    "shop.wallet": "กระเป๋าเงิน: <b>{coins}</b> เหรียญ",
    "shop.buy": "ซื้อ",
    "shop.equip": "ใช้งาน",
    "shop.equipped": "ใช้งานอยู่",
    "shop.coins": "{coins} เหรียญ",
    "shop.daily": "ของแนะนำวันนี้", // TH-REVIEW
    "shop.dailyNote": "เปลี่ยนของแนะนำใหม่ตอนเที่ยงคืน", // TH-REVIEW
    "shop.dailyAllOwned": "มีครบทุกชิ้นแล้ว! ของใหม่มาตอนเที่ยงคืน 🌙",
    "shop.season": "มุมเทศกาล",
    "shop.seasonUntil": "มีถึง {date}",
    "shop.seasonReturns": "🏮 ชุด {name} จะกลับมา {date}",
    "shop.seasonal": "ตามฤดูกาล", // TH-REVIEW
    "shop.seasonalReturns": "กลับมา {date}", // TH-REVIEW
    "shop.upgrade": "อัปเกรด {stars} ({coins})",
    "shop.owned-count": "มีอยู่: {n}/{cap}",
    // iap (IAP purchase flow v1 — mock provider; spec 2026-07-11)
    "shop.getCoins": "เติมเหรียญ",
    "shop.supporterTitle": "ผู้สนับสนุน",
    "shop.supporterDesc": "คู่มือ PDF HSK 6 ระดับทางอีเมล · ไม่มีโฆษณาใน Android · 2,000 เหรียญ · ตราผู้สนับสนุน",
    "shop.supporterOwned": "ขอบคุณที่สนับสนุน Lucky Cat! ♥",
    "iap.amount": "{coins} เหรียญ",
    "iap.pending": "กำลังดำเนินการ…",
    "iap.failed": "การซื้อไม่สำเร็จ — ยังไม่มีการเรียกเก็บเงิน ลองใหม่อีกครั้ง",
    // ⚠ MACHINE-DRAFTED, NOT NATIVE-REVIEWED. Payment-critical Thai — belongs in
    // the Phase 0 item 4 sign-off pass before billing activates.
    "iap.wrongOrigin": "การซื้อใช้ได้ที่ {site} เท่านั้น เปิดเกมที่นั่นเพื่อเป็นผู้สนับสนุน — ยังไม่มีการเรียกเก็บเงิน",
    "iap.success": "ได้รับ +{coins} เหรียญแล้ว!",
    "iap.supporterThanks": "คุณเป็นผู้สนับสนุนแล้ว — ขอบคุณ! คู่มือ HSK ทั้ง 6 ระดับกำลังส่งไปทางอีเมล ♥", // TH-REVIEW
    "iap.supporterThanksSave": "คุณเป็นผู้สนับสนุนแล้ว ♥ — เพิ่มอีเมลเพื่อรับคู่มือ HSK ทั้ง 6 ระดับและใช้สิทธิ์ได้ทุกเครื่อง", // TH-REVIEW
    "iap.restore": "กู้คืนการซื้อ",
    "iap.restored": "กู้คืนสถานะผู้สนับสนุนแล้ว ♥",
    "iap.nothingToRestore": "ไม่มีรายการให้กู้คืน",
    "iap.restoreFailed": "กู้คืนไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่",
    "iap.processing": "การซื้อกำลังดำเนินการ — เหรียญของคุณจะเข้าบัญชีในไม่ช้า", // TH-REVIEW 2026-07-12: machine-translated, needs native review
    "iap.supporterProcessing": "กำลังดำเนินการ Supporter — ระบบจะเปิดใช้งานอัตโนมัติเมื่อชำระเงินเสร็จ", // TH-REVIEW
    // Web Supporter offer + account save-unlock copy (Task 5, web IAP billing) — TH-REVIEW: queued for native spot-check
    "iap.supporter.web.title": "เป็นผู้สนับสนุน",
    "iap.supporter.web.blurb": "สนับสนุนโปรเจกต์ — รับคู่มือ PDF HSK1–6 ทางอีเมล ไอเทมขอบคุณ ตราผู้สนับสนุน เหรียญ 2,000 และไม่มีโฆษณาใน Android จ่ายครั้งเดียว", // TH-REVIEW
    "iap.needsAccountBody": "สร้างบัญชีฟรี เพื่อให้การซื้อของคุณติดตามไปได้ทุกอุปกรณ์",   // TH-REVIEW
    "supporter.sheet.eyebrow": "การสนับสนุนแบบเลือกได้", // TH-REVIEW
    "supporter.sheet.title": "สนับสนุน Lucky Cat ครั้งเดียว", // TH-REVIEW
    "supporter.sheet.lead": "Lucky Cat ยังเล่นฟรีสำหรับทุกคน สนับสนุนโปรเจกต์และรับแพ็กขอบคุณแบบถาวร", // TH-REVIEW
    "supporter.sheet.benefitGuides": "คู่มือ PDF จัดอันดับคำศัพท์ 6 ไฟล์ แยก HSK1–6 ส่งไปทางอีเมล", // TH-REVIEW
    "supporter.sheet.benefitCoins": "รับ 2,000 เหรียญนำโชคทันที", // TH-REVIEW
    "supporter.sheet.benefitBadge": "ตราผู้สนับสนุนและไอเทมขอบคุณแบบถาวร", // TH-REVIEW
    "supporter.sheet.benefitAds": "ไม่มีโฆษณาในแอป Android", // TH-REVIEW
    "supporter.sheet.benefitRestore": "กู้คืนได้บนอุปกรณ์ที่เชื่อมกับอีเมลของคุณ", // TH-REVIEW
    "supporter.sheet.price": "{price} จ่ายครั้งเดียว · ไม่มีสมาชิกแบบรายเดือน", // TH-REVIEW
    "supporter.sheet.secure": "ชำระอย่างปลอดภัยด้วยพร้อมเพย์หรือบัตรผ่าน Stripe Checkout", // TH-REVIEW
    "supporter.sheet.checkout": "ไปยังหน้าชำระเงินที่ปลอดภัย · {price}", // TH-REVIEW
    "supporter.sheet.email": "ดำเนินการต่อด้วยอีเมล", // TH-REVIEW
    "supporter.sheet.notNow": "ไว้ทีหลัง — เล่นฟรีต่อ", // TH-REVIEW
    "supporter.sheet.help": "ความช่วยเหลือเรื่องการซื้อ", // TH-REVIEW
    "supporter.sheet.saveTitle": "บันทึกการซื้อ Supporter", // TH-REVIEW
    "supporter.sheet.saveBody": "กรอกอีเมลเพื่อรับคู่มือ HSK ทั้ง 6 ระดับ และกู้คืนสิทธิ์ Supporter บนอุปกรณ์อื่นได้ ไม่ต้องใช้รหัสผ่าน", // TH-REVIEW
    "supporter.sheet.accountReady": "บัญชีพร้อมแล้ว — ไปยังหน้าชำระเงินที่ปลอดภัยได้เลย", // TH-REVIEW
    "supporter.sheet.active": "Supporter เปิดใช้งานแล้ว ✓", // TH-REVIEW
    "supporter.sheet.activeBody": "ขอบคุณ! สิทธิ์ Supporter แบบถาวรเปิดใช้งานในบัญชีนี้แล้ว", // TH-REVIEW
    "supporter.download.btn": "ดาวน์โหลดคู่มือของคุณ", // TH-REVIEW
    "supporter.download.failed": "ดาวน์โหลดไม่สำเร็จ — โปรดลองอีกครั้ง", // TH-REVIEW
    "supporter.download.signin": "เข้าสู่ระบบด้วยบัญชีที่ซื้อ Supporter เพื่อดาวน์โหลด", // TH-REVIEW
    "account.supporterChip": "ผู้สนับสนุน ♥",
    "item.supporter": "แพ็กผู้สนับสนุน",
    "item.coins_s": "ถุงเหรียญ",
    "item.coins_m": "กองเหรียญ",
    "item.coins_l": "หีบเหรียญ",
    "item.coins_xl": "คลังเหรียญ",
    "shop.maxed": "★★★",
    "season.summer": "ฤดูร้อน",
    "season.midautumn": "ไหว้พระจันทร์",
    "season.cny": "ตรุษจีน",
    // shop items (CATALOG ids, pass 2) — display-name fallback for t("item."+id)
    "item.market": "ตลาดกลางคืน",
    "item.temple": "วัดยามรุ่งอรุณ",
    "item.bamboo": "ไผ่",
    "item.sakura-fx": "กลีบซากุระ",
    "item.firecracker-fx": "ประทัด",
    "item.bells": "ระฆังวัด",
    "item.arcade": "อาร์เคด",
    "item.streak-freeze": "น้ำแข็งกันหลุด",
    "item.streak-freeze.desc": "ชดเชยวันที่ขาด — สถิติเรียนต่อเนื่องยังอยู่",
    "item.panda": "แพนด้า",
    "item.ninja": "นินจา",
    "item.astronaut": "นักบินอวกาศ",
    "item.harbor-night": "ท่าเรือยามค่ำคืน",
    "item.snow-festival": "เทศกาลหิมะ",
    "item.lion-drum": "กลองเชิดสิงโต",
    "item.star-shower": "ฝนดาว",
    "item.beach": "แมวชายหาด",
    "item.island-sunset": "พระอาทิตย์ตกที่เกาะ",
    "item.mooncake-rabbit": "กระต่ายขนมไหว้พระจันทร์",
    "item.lantern-festival": "เทศกาลโคมไฟ",
    "item.dragon": "มังกร",
    "item.dragon-gate": "ประตูมังกร",
    // howto
    "howto.title": "วิธีเล่น",
    "howto.stepSeeTitle": "ดูคำศัพท์", // TH-REVIEW
    "howto.stepSeeBody": "อ่านคำศัพท์จีนและพินอิน แตะลำโพงได้ทุกเมื่อที่ต้องการฟังเสียง", // TH-REVIEW
    "howto.stepChooseTitle": "เลือกความหมาย", // TH-REVIEW
    "howto.stepChooseBody": "เลือกความหมายที่ถูกต้อง การตอบถูกครั้งแรกจะสร้างจังหวะโชคดี", // TH-REVIEW
    "howto.stepLearnTitle": "เรียนรู้แล้วไปต่อ", // TH-REVIEW
    "howto.stepLearnBody": "คำที่พลาดจะกลับมาอีกครั้ง ทำให้ทุกภารกิจจบลงเมื่อเรียนรู้คำที่วางไว้ครบ", // TH-REVIEW
    "howto.advanced": "ด่านทบทวนและโหมดเรียนรู้", // TH-REVIEW
    "howto.credits": "เสียง ตัวอย่าง และเครดิต", // TH-REVIEW
    "howto.try": "ลองภารกิจ 5 คำ", // TH-REVIEW
    "howto.intro": "เดินไปกับแมวนำโชคตาม<b>เส้นทางโคมไฟ</b> แต่ละจุดจะแสดงคำศัพท์จีนพร้อมพินอิน",
    "howto.tapMeaning": "เลือก<b>ความหมายที่ถูกต้อง</b> การตอบถูกครั้งแรกต่อเนื่องจะสร้างจังหวะโชคดี",
    "howto.oneShot": "คำที่พลาดจะกลับมา",
    "howto.oneShotDetail": "หากแตะผิด เกมจะแสดงคำตอบและเพิ่มคำนั้นลงถุงทบทวน เพื่อให้คุณเรียนรู้อีกครั้งเมื่อคำนั้นกลับมา",
    "howto.tooSlow": "หากหมดเวลา เกมจะแสดงคำตอบและนำคำนั้นกลับมาในไม่ช้า ภารกิจคำศัพท์จะดำเนินต่อจนคุณเรียนรู้ครบทุกคำที่วางไว้",
    "howto.reviewChallenge": "ทุกคำลำดับที่สิบจะเป็น<b>ด่านทบทวนสองขั้น</b>: เลือกความหมายก่อน แล้วนึกคำตอบย้อนกลับ",
    "howto.results": "เรียนรู้คำที่วางไว้ให้ครบเพื่อรับโปสการ์ดสรุปคำที่เรียน คำที่ต้องฝึกเพิ่ม รางวัล และการทบทวนครั้งถัดไป",
    "howto.everyWord": "ทุกคำแสดง<b>พินอิน</b>และสามารถ<b>ฟังเสียงได้</b> — ทั้งระหว่างภารกิจคำศัพท์ ในบัตรคำ และตอนทบทวนคำที่ต้องฝึกเพิ่ม",
    "howto.learnMode": "<b>โหมดเรียนรู้</b>ฝึกคลังคำเดียวกับบัตรคำก่อน เพื่อให้คุณได้ทบทวนก่อนเริ่มเล่น",
    "howto.attribution": "ประโยคตัวอย่างบางส่วนจาก Tatoeba (tatoeba.org) สัญญาอนุญาต CC-BY 2.0 FR",
    // battle HUD + pause overlay (M4)
    "battle.round": "รอบ {label}",
    "battle.wordQuest": "ภารกิจคำศัพท์",
    "battle.routeName": "เส้นทางโคมไฟ",
    "battle.reviewPouch": "ถุงทบทวน {n}",
    "battle.learnedProgress": "เรียนแล้ว {label}",
    "battle.luckyFlow": "จังหวะโชคดี",
    "battle.promptChoose": "เลือกความหมายที่ถูกต้อง",
    "battle.promptMeaning": "เลือกความหมายที่ถูกต้อง",
    "battle.promptListen": "ฟังเสียง แล้วเลือกความหมายที่ได้ยิน",
    "battle.promptReverse": "เลือกตัวอักษรจีนที่ตรงกับความหมาย",
    "battle.promptTone": "เลือกพินอินและวรรณยุกต์ที่ถูกต้อง",
    "battle.promptCloze": "เลือกคำที่เติมประโยคให้สมบูรณ์",
    "battle.promptTyped": "พิมพ์ตัวอักษรพินอิน แล้วเลือกวรรณยุกต์ที่แสดง",
    "battle.reviewChallengeIntro": "ด่านทบทวน · ทบทวนคำนี้ให้ครบสองขั้น",
    "battle.feedbackLearned": "เก่งมาก — คุณจำคำนี้ได้ดีขึ้นอีกขั้น",
    "battle.feedbackReview": "เพิ่มลงถุงทบทวนแล้ว — คุณจะได้พบคำนี้อีกในไม่ช้า",
    "battle.pause": "หยุดชั่วคราว",
    "battle.paused": "หยุดชั่วคราว",
    "battle.resume": "เล่นต่อ",
    "battle.quit": "ออก",
    "battle.quitConfirm": "ออกจากภารกิจนี้?", // TH-REVIEW
    "battle.audioGroup": "เสียง", // TH-REVIEW
    "battle.learningAidsGroup": "ตัวช่วยการเรียน", // TH-REVIEW
    "battle.wordAudio": "เสียงคำศัพท์",
    "battle.pinyin": "พินอิน",
    "battle.on": "เปิด",
    "battle.off": "ปิด",
    "settings.sfxVol": "ระดับเสียงเอฟเฟกต์", // TH-REVIEW 2026-07-12: relabeled from เสียงเอฟเฟกต์
    "settings.voiceVol": "ระดับเสียงอ่าน",
    "settings.analytics": "แชร์ข้อมูลการใช้งานแบบไม่ระบุตัวตน",
    "settings.analyticsHint": "ช่วยพัฒนาเกม ไม่มีข้อมูลส่วนตัว ไม่มีประวัติคำศัพท์ ปิดไว้เป็นค่าเริ่มต้น",
    "settings.privacy": "นโยบายความเป็นส่วนตัว",
    "settings.terms": "ข้อกำหนดการให้บริการ", // TH-REVIEW
    "settings.refund": "นโยบายการคืนเงิน", // TH-REVIEW
    "battle.canvasLabel": "ฉากภารกิจคำศัพท์ กด Enter หรือ Space เพื่อฟังเสียงคำศัพท์อีกครั้ง (เมื่อเปิดให้ฟัง)",
    "battle.canvasWord": "คำปัจจุบัน: {h} พินอิน {p} กด Enter หรือ Space เพื่อฟังเสียงอีกครั้ง",
    "battle.canvasHanzi": "ตัวอักษรจีนปัจจุบัน: {h} ทำโจทย์ด้านล่างเพื่อนึกพินอิน",
    "battle.canvasListen": "โจทย์ฟังเสียง กด Enter หรือ Space เพื่อฟังซ้ำ แล้วเลือกความหมาย",
    "battle.canvasHidden": "โจทย์นี้ซ่อนคำตอบไว้ อ่านคำสั่งและตัวเลือกด้านล่าง",
    "battle.canvasRevealed": "เฉลย: {h} พินอิน {p} กด Enter หรือ Space เพื่อฟังเสียงอีกครั้ง",
    "battle.replay": "ฟังอีกครั้ง",
    "battle.reversePrompt": "เลือกตัวอักษรจีนของคำว่า: {meaning}",
    "battle.introOk": "เข้าใจแล้ว!",
    "battle.introListen": "ใหม่: ฟังก่อนนะ! กดฟังเสียงแล้วแตะความหมายที่ได้ยิน",
    "battle.introReverse": "ใหม่: คำนี้คุ้นแล้ว — เลือกตัวอักษรจีนจากความหมายเลย!",
    "battle.introTone": "ใหม่: เช็ควรรณยุกต์! แตะพินอินที่มีวรรณยุกต์ถูกต้อง",
    "battle.introCloze": "ใหม่: เติมคำในช่องว่าง! เลือกคำที่ทำให้ประโยคสมบูรณ์",
    "battle.introTyped": "ด่านมาสเตอร์ — พิมพ์เองเลย!\n1 · พิมพ์ตัวอักษรพินอิน\n2 · แตะวรรณยุกต์ที่แสดง\n3 · กด ตรวจคำตอบ!",
    "battle.typedPlaceholder": "พิมพ์ตัวอักษรพินอิน",
    "battle.typedGo": "ตรวจคำตอบ!",
    "battle.typedLettersOk": "ตัวอักษรถูกแล้ว — เช็ควรรณยุกต์!",
    "battle.typedTonesOk": "วรรณยุกต์ถูกแล้ว — เช็คตัวสะกด!",
    "battle.toneAria": "วรรณยุกต์ {n} ของ {syl}",
    // T4 (battle-interface round) — machine/plan-authored, flagged for the
    // native-review queue (see i18n.js header convention).
    "battle.instruction.meaning": "เลือกความหมายที่ถูกต้อง",
    "battle.instruction.reverse": "เลือกตัวอักษรจีนที่ถูกต้อง",
    "battle.instruction.listen": "ฟังแล้วเลือกความหมาย",
    "battle.instruction.tone": "เลือกพินอินที่ถูกต้อง",
    "battle.instruction.typed": "พิมพ์พินอิน",
    "battle.instruction.cloze": "เติมคำในช่องว่าง",
    // T10 (battle-interface round) — machine/plan-authored, flagged for the
    // native-review queue.
    "battle.correct": "ถูกต้อง!",
    // tones (v6 phase 3: standalone tone-discrimination minigame)
    "tones.title": "ฝึกวรรณยุกต์",
    "tones.instruction": "คุณได้ยินวรรณยุกต์อะไร",
    "tones.replay": "ฟังอีกครั้ง",
    "tones.progress": "{i} / {n}",
    "tones.tone1": "1",
    "tones.tone2": "2",
    "tones.tone3": "3",
    "tones.tone4": "4",
    "tones.toneAria": "วรรณยุกต์ {n}",
    "tones.roundDone": "จบรอบแล้ว!",
    "tones.score": "ถูก {score} จาก {total}",
    "tones.bestStreak": "ต่อเนื่องสูงสุด {n} ครั้ง",
    "tones.reward": "+{coins} เหรียญ · +{xp} XP",
    "tones.again": "เล่นอีกครั้ง",
    // common
    "common.back": "← หน้าหลัก",
    "common.backMore": "← เพิ่มเติม",
    "common.cancel": "ยกเลิก",
    "common.done": "เสร็จ",
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
