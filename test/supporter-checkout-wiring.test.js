import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Regression pin for a dead buy button, found during the 2026-07-31 Stripe
// test-mode rehearsal. The supporter sheet and iapBuy each had a reasonable
// double-tap guard; composed, they deadlocked and NO purchase could ever
// start from the web offer sheet — silently, with no fetch, no toast and no
// console error. It shipped in v138 and was live through v140, invisible only
// because billing is dark so the button was unreachable.
//
// Source-text assertions rather than a live DOM: there is no jsdom in this
// repo and main.js wiring is untested by design (AGENTS.md), so this follows
// the quest-results-screen.test.js pattern of pinning a wiring contract by
// reading the source.
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../src/ui/supporter-offer-sheet.js", import.meta.url), "utf8");

describe("supporter checkout wiring — the two guards must not deadlock", () => {
  it("the sheet disables its button BEFORE awaiting the handler", () => {
    // This is the sheet's half of the contract. It is fine on its own; it is
    // stated here so the other half below has something to point at.
    const action = sheet.match(/function action\([\s\S]*?\n {2}}/)?.[0] ?? "";
    expect(action).toContain("button.disabled = true");
    const disableAt = action.indexOf("button.disabled = true");
    const handlerAt = action.indexOf("await handler(button)");
    expect(disableAt).toBeGreaterThan(-1);
    expect(handlerAt).toBeGreaterThan(-1);
    expect(disableAt).toBeLessThan(handlerAt);
  });

  it("routes the sheet's checkout straight into iapBuy", () => {
    // If this stops being true the deadlock cannot recur, but the test below
    // would then be pinning nothing — so fail loudly rather than pass vacuously.
    expect(main).toMatch(/onCheckout:\s*button\s*=>\s*iapBuy\(/);
  });

  it("routes every Supporter card through the verified-email offer sheet", () => {
    const card = main.match(/function makeSupporterCard\(\)\{[\s\S]*?\n}\n\n\/\/ Buy flow/)?.[0] ?? "";
    expect(card).not.toBe("");
    expect(card).toContain("btn.onclick = () => openSupporterOffer()");
    expect(card).not.toMatch(/isNative\(\)[\s\S]*iapBuy\(productById\("supporter"\)/);
  });

  it("shows the emailed six-guide benefit before checkout", () => {
    expect(sheet).toContain('t("supporter.sheet.benefitGuides")');
  });

  it("iapBuy does NOT refuse an already-disabled button", () => {
    const guard = main.match(/async function iapBuy\(p, btn\)\{[\s\S]*?\n {2}iapPending = p\.id;/)?.[0] ?? "";
    expect(guard).not.toBe("");
    // The exact defect: `if(iapPending || btn.disabled) return;`
    expect(guard).not.toMatch(/if\s*\([^)]*btn\.disabled[^)]*\)\s*return/);
    // ...while the guard it actually needs is still present.
    expect(guard).toMatch(/if\s*\(\s*iapPending\s*\)\s*return/);
  });
});
