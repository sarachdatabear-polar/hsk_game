// src/ui/supporter-download.js
// Supporter self-serve download button (spec 2026-08-03). DOM wiring only —
// response interpretation lives in src/monetization/supporter-download.js
// (vitest-tested); this factory now also carries vitest coverage of
// download() via its injection points (fix round 1 — see test/
// supporter-download-ui.test.js). The button renders wherever LOCAL
// supporter state is true; the edge function is the real gate (401/403 ->
// sign-in nudge). getSession (src/cloud.js) never throws — it returns a
// wrapper {ok, session, reason}, NOT the raw session; ok:false means an
// offline/network failure (not a sign-in problem), and ok:true with a null
// session means genuinely signed out. Mirrors the discrimination pattern at
// src/sync.js:325.
import { t } from "../i18n.js";
import { isNative as isNativePlatform } from "../native.js";
import {
  SUPPORTER_DOWNLOAD_URL,
  parseDownloadResponse,
} from "../monetization/supporter-download.js";

export function createSupporterDownload({
  getSession,
  toast,
  fetchImpl = (...args) => fetch(...args),
  navigate = (url) => window.location.assign(url),
  isNative = isNativePlatform,
}) {
  // The WebView must never top-level-navigate to the signed download URL: on
  // Android this currently avoids escaping the app only because Capacitor
  // happens to externalize foreign-host top-level navigations — an
  // unenforced platform default, not a guarantee, that would silently stop
  // applying if capacitor.config.json's server.allowNavigation is ever
  // widened. usable() is the explicit gate; mirrors the isNative/usable()
  // pattern in src/monetization/provider-stripe-web.js:54,71.
  function usable() {
    return !isNative();
  }
  let busy = false; // double-tap guard; module state like iapPending
  async function download() {
    if (!usable()) return; // defense in depth — see usable() above
    if (busy) return;
    busy = true;
    try {
      const s = await getSession();
      if (!s || !s.ok) { toast(t("supporter.download.failed")); return; }
      const token = s.session && s.session.access_token;
      if (!token) { toast(t("supporter.download.signin")); return; }
      let response;
      try {
        response = await fetchImpl(SUPPORTER_DOWNLOAD_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        toast(t("supporter.download.failed"));
        return;
      }
      let body = null;
      try { body = await response.json(); } catch { /* non-JSON error body */ }
      const parsed = parseDownloadResponse(response.status, body);
      if (!parsed.ok) {
        toast(t(parsed.reason === "signin" ? "supporter.download.signin" : "supporter.download.failed"));
        return;
      }
      navigate(parsed.url);
    } finally {
      busy = false;
    }
  }
  function button(className = "chip buy-chip") {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = t("supporter.download.btn");
    el.onclick = download;
    return el;
  }
  return { download, button, usable };
}
