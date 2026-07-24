import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const srcDir = new URL("../src/", import.meta.url);
const srcJs = readdirSync(srcDir, { recursive: true })
  .filter(f => String(f).endsWith(".js"))
  .map(f => readFileSync(new URL(String(f), srcDir), "utf8"))
  .join("\n");

// Ids whose `.hidden` is assigned somewhere in src/. Two spellings are used:
// `$("#id").hidden = …` directly, and `const row = $("#id"), …` followed by
// `row.hidden = …`. The second is resolved only inside a short window after the
// declaration so a common variable name (`el`, `panel`) can't be matched
// against an unrelated assignment in a different function.
function idsToggledHidden() {
  const ids = new Set();
  for (const m of srcJs.matchAll(/\$\("#([\w-]+)"\)\.hidden\s*=/g)) ids.add(m[1]);
  for (const m of srcJs.matchAll(/([\w$]+)\s*=\s*\$\("#([\w-]+)"\)/g)) {
    const [, varName, id] = m;
    const window = srcJs.slice(m.index, m.index + 1200);
    if (new RegExp(`\\b${varName.replace(/\$/g, "\\$")}\\.hidden\\s*=`).test(window)) ids.add(id);
  }
  return [...ids];
}

const esc = s => s.replace(/[-]/g, "\\-");
const classesOf = id =>
  html.match(new RegExp(`<[^>]*\\bid="${esc(id)}"[^>]*>`))?.[0]
    .match(/\bclass="([^"]*)"/)?.[1].split(/\s+/).filter(Boolean) ?? [];
const declaresDisplay = cls =>
  [...html.matchAll(new RegExp(`\\.${esc(cls)}\\s*\\{([^}]*)\\}`, "g"))]
    .some(r => /display\s*:\s*(?!none)/.test(r[1]));
const hasHiddenOverride = (cls, id) =>
  new RegExp(`\\.${esc(cls)}\\[hidden\\]`).test(html) || new RegExp(`#${esc(id)}\\[hidden\\]`).test(html);

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

  // An author `display:` rule beats the UA `[hidden]{display:none}` rule, so
  // any JS-toggled element whose class declares a display needs an explicit
  // `[hidden]` override or setting `.hidden = true` silently does nothing.
  // This has bitten three times (.street-layouts-panel, .street-caption-row,
  // .profile-name-row) — guard the whole family rather than each instance.
  it("gives every JS-toggled element a [hidden] override when its class sets display", () => {
    const broken = [];
    for (const id of idsToggledHidden()) {
      for (const cls of classesOf(id)) {
        if (declaresDisplay(cls) && !hasHiddenOverride(cls, id)) {
          broken.push(`#${id}: .${cls} declares display with no .${cls}[hidden] override`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("contains a focus-trap and Escape path for dialogs", () => {
    expect(main).toMatch(/if\s*\(event\.key\s*!==\s*"Tab"\)/);
    expect(main).toMatch(/if\s*\(event\.key\s*===\s*"Escape"/);
    expect(main).toContain('sibling.inert = true');
    expect(main).toContain('sibling.inert = false');
  });
});
