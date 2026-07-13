// Native integrations for the Capacitor Android build. Every export is a no-op
// on the plain web/PWA build (guarded by isNative()), so the browser bundle is
// unaffected. Capacitor plugins are reached via the global window.Capacitor.Plugins
// registry (available only inside the native WebView) to avoid bundling native ESM.
export function isNative() {
  return !!(typeof window !== "undefined" && window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function"
    && window.Capacitor.isNativePlatform());
}
function plugins() {
  return (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins) || {};
}

export function nextBackScreen(currentScreen) {
  return currentScreen === "home" ? null : "home";
}

export function hapticKill()  { if (isNative()) plugins().Haptics?.impact({ style: "LIGHT" })?.catch(() => {}); }
export function hapticWrong() { if (isNative()) plugins().Haptics?.impact({ style: "MEDIUM" })?.catch(() => {}); }

let awakeOn = false;
export function keepAwake(on) {
  if (!isNative() || on === awakeOn) return;
  awakeOn = on;
  const ka = plugins().KeepAwake;
  if (ka) (on ? ka.keepAwake() : ka.allowSleep());
}

// Streak-saver local notification (retention pack). Web/PWA: inert.
// Android needs @capacitor/local-notifications + POST_NOTIFICATIONS runtime
// permission (Android 13+). The permission PROMPT must happen in the
// foreground (requestNotifPermission, called from active play) — Android 13+
// silently suppresses a permission dialog raised by an app that is leaving the
// foreground. This background sync therefore only *checks* the existing grant;
// it never prompts.
export async function syncStreakReminder(plan, title, body) {
  if (!isNative()) return;
  const LN = plugins().LocalNotifications;
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: 1001 }] });
    if (!plan.schedule) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const at = new Date();
    at.setHours(plan.hour, 0, 0, 0);
    await LN.schedule({ notifications: [{ id: 1001, title, body, schedule: { at } }] });
  } catch (e) { /* notification failure must never break gameplay */ }
}

// Lapsed-streak "come back" local notification (re-engagement). Web/PWA: inert.
// Distinct id (1002) from the same-day streak-saver (1001) so the two never
// cancel each other. Rescheduled on every sync for `afterDays` out at REMINDER_HOUR
// (19:00 local, via plan.hour), so it only fires if the player is genuinely absent
// that long. Like syncStreakReminder it only CHECKS the existing grant — the
// foreground prompt lives in main.js.
export async function syncReengageReminder(plan, title, body) {
  if (!isNative()) return;
  const LN = plugins().LocalNotifications;
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: 1002 }] });
    if (!plan.schedule) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const at = new Date();
    at.setDate(at.getDate() + plan.afterDays);
    at.setHours(plan.hour, 0, 0, 0);   // civilized time (REMINDER_HOUR via the plan), not a raw +72h stamp
    await LN.schedule({ notifications: [{ id: 1002, title, body, schedule: { at } }] });
  } catch (e) { /* notification failure must never break gameplay */ }
}

// Foreground POST_NOTIFICATIONS prompt. Call this while the app is visible
// (during play) so Android 13+ actually shows the dialog. Idempotent: once the
// user has decided, Capacitor returns the status without re-showing. Returns
// the display status ("granted"/"denied"/…); "denied" on plain web where no
// notification can be shown. Never throws — must not break gameplay.
export async function requestNotifPermission() {
  if (!isNative()) return "denied";
  const LN = plugins().LocalNotifications;
  if (!LN) return "denied";
  try {
    const perm = await LN.requestPermissions();
    return perm && perm.display ? perm.display : "denied";
  } catch (e) { return "denied"; }
}

export function initNative({ getScreen, goHome }) {
  // Plain web/PWA build has no bridge at all -> stay completely inert.
  if (typeof window === "undefined" || !window.Capacitor) return;
  // Under Capacitor the plugin registry (window.Capacitor.Plugins.App) can still
  // be unpopulated at module-eval time, which silently dropped the back-button
  // listener and the status-bar color. Retry briefly until App is ready.
  let tries = 0;
  const tick = () => {
    const P = plugins();
    if (isNative() && P.App && typeof P.App.addListener === "function") {
      P.StatusBar?.setBackgroundColor({ color: "#141a14" });
      P.StatusBar?.setStyle({ style: "DARK" });
      P.App.addListener("backButton", () => {
        const dest = nextBackScreen(getScreen());
        if (dest === null) P.App.exitApp();
        else goHome();               // all non-home screens return home in this app
      });
      return;
    }
    if (++tries < 25) setTimeout(tick, 100);   // up to ~2.5s for the bridge to finish
  };
  tick();
}
