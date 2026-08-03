import { describe, it, expect } from "vitest";
import {
  SUPPORTER_DOWNLOAD_URL,
  parseDownloadResponse,
} from "../src/monetization/supporter-download.js";

describe("SUPPORTER_DOWNLOAD_URL", () => {
  it("points at the project's supporter-download function", () => {
    expect(SUPPORTER_DOWNLOAD_URL).toBe(
      "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download",
    );
  });
});

describe("parseDownloadResponse", () => {
  it("accepts 200 with an https url", () => {
    expect(parseDownloadResponse(200, { url: "https://x.supabase.co/signed" }))
      .toEqual({ ok: true, url: "https://x.supabase.co/signed" });
  });

  it("rejects 200 with a missing or non-https url", () => {
    expect(parseDownloadResponse(200, {}).ok).toBe(false);
    expect(parseDownloadResponse(200, { url: "http://insecure" }).ok).toBe(false);
    expect(parseDownloadResponse(200, { url: 42 }).ok).toBe(false);
    expect(parseDownloadResponse(200, null).ok).toBe(false);
  });

  it("maps 401 and 403 to the sign-in nudge", () => {
    // 403 = valid session, wrong account (no entitlement) — the fix for the
    // user is the same: sign in to the account that bought Supporter.
    expect(parseDownloadResponse(401, { error: "unauthorized" })).toEqual({ ok: false, reason: "signin" });
    expect(parseDownloadResponse(403, { error: "not_supporter" })).toEqual({ ok: false, reason: "signin" });
  });

  it("maps everything else to failed", () => {
    expect(parseDownloadResponse(500, null)).toEqual({ ok: false, reason: "failed" });
    expect(parseDownloadResponse(402, null)).toEqual({ ok: false, reason: "failed" });
    expect(parseDownloadResponse(503, "service unavailable")).toEqual({ ok: false, reason: "failed" });
    expect(parseDownloadResponse(0, null)).toEqual({ ok: false, reason: "failed" });
  });
});
