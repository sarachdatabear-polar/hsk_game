import { describe, it, expect, vi } from "vitest";
import { createSupporterDownload } from "../src/ui/supporter-download.js";
import { SUPPORTER_DOWNLOAD_URL } from "../src/monetization/supporter-download.js";
import { t } from "../src/i18n.js";

// Coverage for the fix-round-1 defect: getSession() (src/cloud.js) returns a
// wrapper {ok, session, reason} — never the raw session — so download() must
// discriminate ok:false (offline/network) from ok:true+session:null
// (genuinely signed out) rather than reading session.access_token directly.
describe("createSupporterDownload().download()", () => {
  it("offline/network (ok:false) toasts failed, never calls fetch", async () => {
    const getSession = vi.fn(async () => ({ ok: false, reason: "offline" }));
    const toast = vi.fn();
    const fetchImpl = vi.fn();
    const navigate = vi.fn();
    const { download } = createSupporterDownload({ getSession, toast, fetchImpl, navigate });

    await download();

    expect(toast).toHaveBeenCalledWith(t("supporter.download.failed"));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("ok:true with no session toasts signin, never calls fetch", async () => {
    const getSession = vi.fn(async () => ({ ok: true, session: null }));
    const toast = vi.fn();
    const fetchImpl = vi.fn();
    const navigate = vi.fn();
    const { download } = createSupporterDownload({ getSession, toast, fetchImpl, navigate });

    await download();

    expect(toast).toHaveBeenCalledWith(t("supporter.download.signin"));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("valid session + 200 calls fetch once with the bearer token and navigates to the signed url", async () => {
    const getSession = vi.fn(async () => ({ ok: true, session: { access_token: "jwt-abc" } }));
    const toast = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      status: 200,
      json: async () => ({ url: "https://x/signed" }),
    }));
    const navigate = vi.fn();
    const { download } = createSupporterDownload({ getSession, toast, fetchImpl, navigate });

    await download();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(SUPPORTER_DOWNLOAD_URL, {
      method: "POST",
      headers: { Authorization: "Bearer jwt-abc" },
    });
    expect(navigate).toHaveBeenCalledWith("https://x/signed");
    expect(toast).not.toHaveBeenCalled();
  });

  it("valid session + 500 with a non-JSON body toasts failed, never navigates", async () => {
    const getSession = vi.fn(async () => ({ ok: true, session: { access_token: "jwt-abc" } }));
    const toast = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      status: 500,
      json: async () => { throw new Error("not json"); },
    }));
    const navigate = vi.fn();
    const { download } = createSupporterDownload({ getSession, toast, fetchImpl, navigate });

    await download();

    expect(toast).toHaveBeenCalledWith(t("supporter.download.failed"));
    expect(navigate).not.toHaveBeenCalled();
  });
});

// Native-platform gate (fix round 2): the WebView must never top-level-navigate
// to the signed download URL — see src/ui/supporter-download.js header comment
// and src/monetization/provider-stripe-web.js:71 for the established pattern.
describe("createSupporterDownload().usable()", () => {
  it("is true when isNative() is false (web/PWA)", () => {
    const { usable } = createSupporterDownload({
      getSession: vi.fn(), toast: vi.fn(), isNative: () => false,
    });
    expect(usable()).toBe(true);
  });

  it("is false when isNative() is true (Capacitor WebView)", () => {
    const { usable } = createSupporterDownload({
      getSession: vi.fn(), toast: vi.fn(), isNative: () => true,
    });
    expect(usable()).toBe(false);
  });
});

describe("createSupporterDownload().download() native gate", () => {
  it("refuses on native: no fetch, no navigate, no toast", async () => {
    const getSession = vi.fn(async () => ({ ok: true, session: { access_token: "jwt-abc" } }));
    const toast = vi.fn();
    const fetchImpl = vi.fn();
    const navigate = vi.fn();
    const { download } = createSupporterDownload({
      getSession, toast, fetchImpl, navigate, isNative: () => true,
    });

    await download();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });
});
