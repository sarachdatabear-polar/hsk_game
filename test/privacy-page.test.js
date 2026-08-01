import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const priv = () => readFileSync(new URL("../privacy.html", import.meta.url), "utf8");
const stage = readFileSync(new URL("../scripts/stage-www.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("hosted privacy policy", () => {
  it("privacy.html exists with real policy content", () => {
    const h = priv();
    expect(h).toContain("Privacy Policy");
    // Contact-for-deletion. Moved off the personal Gmail on 2026-08-01: this
    // address is published to every buyer on Stripe receipts, so it has to be
    // a support address, not the maintainer's own inbox.
    expect(h).toContain("support@luckycathsk.com");
  });
  it("is staged into www/ by stage-www", () =>
    expect(stage).toContain('"privacy.html"'));
  it("is linked from the app settings screen", () =>
    expect(index).toContain('href="privacy.html"'));
});
