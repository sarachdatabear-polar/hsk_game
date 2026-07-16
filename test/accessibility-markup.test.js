import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

describe("accessibility markup contract", () => {
  it("allows browser zoom", () => {
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i)?.[1] ?? "";
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?(?:,|$)/i);
  });

  it("exposes the game canvas as a keyboard-operable control", () => {
    expect(html).toMatch(/<canvas\s+id="cv"[^>]*tabindex="0"[^>]*role="button"/);
    expect(html).toContain('aria-keyshortcuts="Enter Space"');
    expect(main).toContain('updateCanvasA11y(word, format, false)');
    expect(main).toContain('updateCanvasA11y(z.w, z.format, true)');
  });

  it("labels answer choices and modal overlays", () => {
    expect(html).toContain('id="opts" role="group" aria-labelledby="quest-feedback"');
    expect(html).toContain('id="pause-overlay" role="dialog" aria-modal="true"');
    expect(html).toContain('id="format-intro" role="dialog" aria-modal="true"');
    expect(html).toContain('id="quest-overlay" role="dialog" aria-modal="true"');
  });

  it("maintains current and pressed state in script", () => {
    expect(html).toContain('<nav id="bottom-nav" aria-label="Primary">');
    expect(main).toContain('b.setAttribute("aria-current", "page")');
    expect(main).toContain('el.setAttribute("aria-pressed", String(!!on))');
  });

  it("contains a focus-trap and Escape path for dialogs", () => {
    expect(main).toMatch(/if\s*\(event\.key\s*!==\s*"Tab"\)/);
    expect(main).toMatch(/if\s*\(event\.key\s*===\s*"Escape"/);
    expect(main).toContain('sibling.inert = true');
    expect(main).toContain('sibling.inert = false');
  });
});
