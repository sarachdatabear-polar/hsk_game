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

export function hapticKill()  { if (isNative()) plugins().Haptics?.impact({ style: "LIGHT" }); }
export function hapticWrong() { if (isNative()) plugins().Haptics?.impact({ style: "MEDIUM" }); }

let awakeOn = false;
export function keepAwake(on) {
  if (!isNative() || on === awakeOn) return;
  awakeOn = on;
  const ka = plugins().KeepAwake;
  if (ka) (on ? ka.keepAwake() : ka.allowSleep());
}

// Streak-saver local notification (retention pack). Web/PWA: inert.
// Android needs @capacitor/local-notifications + POST_NOTIFICATIONS runtime
// permission (Android 13+) — requestPermissions() on first schedule.
export async function syncStreakReminder(plan, title, body) {
  if (!isNative()) return;
  const LN = plugins().LocalNotifications;
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: 1001 }] });
    if (!plan.schedule) return;
    const perm = await LN.requestPermissions();
    if (perm.display !== "granted") return;
    const at = new Date();
    at.setHours(plan.hour, 0, 0, 0);
    await LN.schedule({ notifications: [{ id: 1001, title, body, schedule: { at } }] });
  } catch (e) { /* notification failure must never break gameplay */ }
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
