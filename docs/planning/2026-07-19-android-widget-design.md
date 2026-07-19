# Android home-screen widget — design & implementation spec

_2026-07-19. Scoped this session (Jordan: "do it all"). **Not built** — native
widget code cannot be exercised anywhere on the VPS (no device/emulator), and
writing blind native code into `android/` risks the one build path nobody here
can verify: Jordan's keystore-bound Windows APK. This doc is the buildable spec;
implementation + on-device QA are the owner lane._

## Goal

A single small home-screen widget that pulls the player back in daily. Roadmap
rank 4 (`docs/planning/2026-07-16-next-roadmap.md`): "useful retention surface,
but needs physical-device QA." One widget, one job: show the streak + today's
goal progress and deep-link into a Smart Review.

## What it shows (1×1 / 2×1 "Streak" widget)

- **Streak flame + count** — `streakInfo(daily,…).streak` (src/daily.js).
- **Today's goal ring** — `n / GOAL` words done today (GOAL=20, src/daily.js).
- **State-aware CTA line**:
  - goal not met → "Keep your N-day streak" 
  - goal met → "🎉 Goal done — streak safe"
  - streak at risk (last activity ≠ today, evening) → "Play to save your streak"
- Tapping anywhere opens the app **straight into Smart Review** via a deep link.

Keep it to those fields — they're the only state that changes daily and the only
ones that motivate a return. No word content (localization + font risk on the
launcher surface).

## Data flow (the key design decision)

The widget process is **separate from the WebView** and cannot read
`localStorage`. So the app must publish a tiny snapshot the widget can read:

1. On every session end / goal change, the web app writes a small JSON blob
   (`{streak, doneToday, goal, atRisk, updatedAt}`) through a new
   `native.publishWidgetState(snapshot)` bridge (no-op on web, guarded by
   `isNative()` exactly like `hapticKill`/`keepAwake` in `src/native.js`).
2. A thin Capacitor plugin (Kotlin) writes that blob to `SharedPreferences`
   (key `nbhsk.widget`) and calls `AppWidgetManager.updateAppWidget(...)`.
3. The `AppWidgetProvider.onUpdate` reads `SharedPreferences` and renders the
   `RemoteViews`. No live JS in the widget — it only ever shows the last
   published snapshot, which is correct (it reflects the last time you played).

This mirrors the existing bridge convention: reach plugins via
`window.Capacitor.Plugins`, keep the web bundle untouched, degrade to no-op off
native.

## Android pieces to add (all under `android/`, owner-built)

- `app/src/main/java/.../StreakWidgetProvider.kt` — `AppWidgetProvider`;
  `onUpdate` reads `SharedPreferences("CapacitorStorage" or "nbhsk")`, binds
  `RemoteViews`, sets a `PendingIntent` (deep link, below).
- `app/src/main/res/layout/widget_streak.xml` — flame icon, count, goal text.
  Use the app palette (`#141a14` bg to match splash/status bar in
  `capacitor.config.json`).
- `app/src/main/res/xml/widget_streak_info.xml` — `appwidget-provider`
  (minWidth/Height ~40dp/40dp for 1×1, `updatePeriodMillis` 0 — we push updates,
  the launcher's 30-min minimum is too coarse and battery-wasteful).
- `AndroidManifest.xml` — register the provider `<receiver>` with
  `APPWIDGET_UPDATE` intent-filter + meta-data pointing at the info XML.
- A minimal local Capacitor plugin (`WidgetBridge`) exposing
  `publishState(snapshot)` → writes prefs + triggers update.

## Deep link into Smart Review

- `PendingIntent` → `MainActivity` with `data = Uri.parse("luckycat://smart")`
  (or `https://…#smart` using the existing `androidScheme:"https"`).
- Web side: extend the same boot hash/deep-link handling added for friend
  compare (`#f=` in `src/main.js`) with a `#smart` branch that starts a Smart
  Review deck once the app is ready. Reuse `#go-smart`'s existing start path.

## Web-side work (small, testable here — can be done ahead of the native lane)

1. `native.publishWidgetState(snapshot)` — no-op guard + plugin call. Unit-test
   the pure snapshot builder `buildWidgetSnapshot(daily, todayStr(), freezes)`
   → `{streak, doneToday, goal, atRisk}` in isolation.
2. Call it wherever `noteDaily()` / session-end already fire.
3. `#smart` deep-link branch in the boot handler.

These three are safe to land before the native code exists (the bridge no-ops
on web/PWA), so the pure `buildWidgetSnapshot` + deep-link can ship + be tested
on the VPS; only the Kotlin/RemoteViews half is owner+device-gated.

## Owner gates (cannot be done on the VPS)

- All Kotlin / `res/` / manifest work above.
- **On-device QA**: add widget from launcher, verify render at 1×1 and 2×1,
  dark/light launcher backgrounds, streak/goal update after a session, deep
  link opens Smart Review, no ANR, battery sane.
- Rebuild + re-sign the APK/AAB (keystore-bound, Windows).

## Recommendation

Do the **web-side three** (snapshot builder + bridge stub + `#smart` deep link)
in a normal VPS session — small, unit-testable, ships dormant. Hold the native
half until Jordan has a device and is doing an Android build pass anyway, so the
widget's first render is QA'd on real hardware rather than shipped blind.
