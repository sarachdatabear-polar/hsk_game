import { describe, expect, it, vi } from "vitest";
import { getUrl } from "../scripts/url-get.mjs";

describe("getUrl", () => {
  it.each([
    ["http://localhost:8000/index.html", "http"],
    ["https://example.com/index.html", "https"],
  ])("uses the matching client for %s", (url, expectedClient) => {
    const request = {};
    const clients = {
      http: { get: vi.fn(() => request) },
      https: { get: vi.fn(() => request) },
    };
    const callback = vi.fn();

    expect(getUrl(url, callback, clients)).toBe(request);
    expect(clients[expectedClient].get).toHaveBeenCalledWith(url, callback);
    expect(clients[expectedClient === "http" ? "https" : "http"].get).not.toHaveBeenCalled();
  });

  it("rejects unsupported protocols before making a request", () => {
    const clients = {
      http: { get: vi.fn() },
      https: { get: vi.fn() },
    };

    expect(() => getUrl("file:///tmp/index.html", vi.fn(), clients)).toThrow(
      "Unsupported URL protocol: file:"
    );
    expect(clients.http.get).not.toHaveBeenCalled();
    expect(clients.https.get).not.toHaveBeenCalled();
  });
});
