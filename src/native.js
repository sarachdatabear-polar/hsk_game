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

export function initNative({ getScreen, goHome }) {
  if (!isNative()) return;
  const P = plugins();
  P.StatusBar?.setBackgroundColor({ color: "#141a14" });
  P.StatusBar?.setStyle({ style: "DARK" });
  P.App?.addListener("backButton", () => {
    const dest = nextBackScreen(getScreen());
    if (dest === null) P.App.exitApp();
    else goHome();               // all non-home screens return home in this app
  });
}
