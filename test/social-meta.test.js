import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("social / Open Graph meta", () => {
  const required = [
    '<meta name="description"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:url"',
    'property="og:type"',
    'name="twitter:card"',
    'assets/og-image.png',
  ];
  for (const frag of required) {
    it(`includes ${frag}`, () => expect(html).toContain(frag));
  }
  it("og:url is the canonical Pages URL", () =>
    expect(html).toContain("https://sarachdatabear-polar.github.io/hsk_game/"));
});
