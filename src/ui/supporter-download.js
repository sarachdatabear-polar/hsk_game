// src/ui/supporter-download.js
// Supporter self-serve download button (spec 2026-08-03). DOM wiring only —
// response interpretation lives in src/monetization/supporter-download.js
// (vitest-tested); this factory is untested by design like the other
// src/ui/ factories. The button renders wherever LOCAL supporter state is
// true; the edge function is the real gate (401/403 -> sign-in nudge).
import { t } from "../i18n.js";
import {
  SUPPORTER_DOWNLOAD_URL,
  parseDownloadResponse,
} from "../monetization/supporter-download.js";

export function createSupporterDownload({
  getSession,
  toast,
  fetchImpl = (...args) => fetch(...args),
  navigate = (url) => window.location.assign(url),
}) {
  let busy = false; // double-tap guard; module state like iapPending
  async function download() {
    if (busy) return;
    busy = true;
    try {
      const session = await getSession();
      const token = session && session.access_token;
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
  return { download, button };
}
