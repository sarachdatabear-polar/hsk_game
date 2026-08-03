import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { STRINGS } from "../src/i18n.js";
import { productById } from "../src/monetization/products.js";

// The three standalone legal pages. They are NOT part of the esbuild bundle:
// each is self-contained HTML+CSS so it renders with zero external requests,
// which is what the file:// constraint and the offline precache both need.
// That means the shared styling is duplicated across them on purpose — a
// legal.css would be one more asset that has to load before a policy page is
// readable, and a policy that renders unstyled when a fetch fails is worse
// than three copies of 90 lines of CSS.
const PAGES = ["privacy.html", "terms.html", "refund.html"];

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const swSrc = read("sw.js");
const indexHtml = read("index.html");
const stageWww = readFileSync(new URL("../scripts/stage-www.js", import.meta.url), "utf8");

const SUPPORT_EMAIL = "support@luckycathsk.com";

describe("legal pages", () => {
  it("all three pages exist at the web root", () => {
    for (const page of PAGES) {
      expect(existsSync(new URL(`../${page}`, import.meta.url)), page).toBe(true);
    }
  });

  it("each page is a complete, titled, responsive document", () => {
    for (const page of PAGES) {
      const html = read(page);
      expect(html, page).toContain("<!DOCTYPE html>");
      expect(html, page).toContain('<html lang="en">');
      expect(html, page).toMatch(/<title>[^<]+Lucky Cat HSK<\/title>/);
      expect(html, page).toContain('<meta name="description"');
      expect(html, page).toContain('name="viewport"');
      // Every page must offer a way back into the app — a dead end on a legal
      // page is where a confused buyer becomes a chargeback.
      expect(html, page).toContain('href="index.html"');
    }
  });

  it("publishes the same support contact on every page", () => {
    for (const page of PAGES) {
      expect(read(page), page).toContain(SUPPORT_EMAIL);
    }
  });

  it("no page advertises itself as an unreviewed draft", () => {
    // The privacy policy shipped for weeks with a highlighted "DRAFT — not
    // legal advice / must be reviewed" banner. A payment processor reviewing
    // the site reads that first. Owner decision 2026-08-01: neutral wording.
    for (const page of PAGES) {
      expect(read(page), page).not.toMatch(/DRAFT/i);
      expect(read(page), page).not.toMatch(/not legal advice/i);
    }
  });

  it("states an effective date on every page", () => {
    for (const page of PAGES) {
      expect(read(page), page).toMatch(/Effective date:<\/strong>\s*\d{4}-\d{2}-\d{2}/);
    }
  });
});

describe("refund policy", () => {
  const html = read("refund.html");

  it("states the 14-day no-questions window", () => {
    expect(html).toMatch(/14 days/);
    expect(html).toMatch(/no questions asked/i);
  });

  it("quotes the Supporter price that the code actually charges", () => {
    // stripe-checkout builds the session from products.js; a refund page that
    // quotes a different number than the buyer was charged is a dispute.
    const supporter = productById("supporter");
    expect(supporter.priceTHB).toBe(79);
    expect(html).toContain(`${supporter.priceTHB}`);
  });

  it("names how to request a refund", () => {
    expect(html).toContain(SUPPORT_EMAIL);
  });
});

describe("privacy policy — payment processors", () => {
  const html = read("privacy.html");

  it("names Stripe, which now processes every web purchase", () => {
    // Web billing goes direct to Stripe Checkout (RevenueCat Web Billing was
    // ruled out because it cannot carry PromptPay). Telling Stripe "I sell via
    // Stripe" while the published policy names only Apple/Google/RevenueCat is
    // the kind of mismatch that stalls an account review.
    expect(html).toContain("Stripe");
  });

  it("still names the store processors, which remain the Android path", () => {
    expect(html).toContain("RevenueCat");
    expect(html).toContain("Google Play");
  });

  it("discloses transactional Supporter delivery through Resend", () => {
    expect(html).toContain("Resend");
    expect(html).toMatch(/six HSK frequency-guide PDFs/i);
    expect(html).toMatch(/do not use this purchase email to subscribe you\s+to marketing/i);
  });

  it("states that card details never reach us on either path", () => {
    expect(html).toMatch(/do not receive or store your (payment )?card details/i);
  });
});

describe("legal pages are shipped, cached and reachable", () => {
  it("stages every page into www/ for Capacitor", () => {
    for (const page of PAGES) {
      expect(stageWww, page).toContain(`"${page}"`);
    }
  });

  it("precaches every page so policies work offline", () => {
    const precache = swSrc.slice(swSrc.indexOf("const PRECACHE = ["), swSrc.indexOf("];", swSrc.indexOf("const PRECACHE = [")));
    for (const page of PAGES) {
      expect(precache, page).toContain(`"${page}"`);
    }
  });

  it("links every page from the More screen", () => {
    for (const page of PAGES) {
      expect(indexHtml, page).toContain(`href="${page}"`);
    }
  });

  it("opens each link in a new tab without leaking the opener", () => {
    const links = indexHtml.match(/<a href="(?:privacy|terms|refund)\.html"[^>]*>/g) || [];
    expect(links).toHaveLength(PAGES.length);
    for (const link of links) {
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener"');
    }
  });
});

describe("legal link labels are localized", () => {
  const keys = ["settings.privacy", "settings.terms", "settings.refund"];

  it("defines every legal link label in both locales", () => {
    for (const key of keys) {
      expect(STRINGS.en[key], `en:${key}`).toBeTruthy();
      expect(STRINGS.th[key], `th:${key}`).toBeTruthy();
    }
  });

  it("does not leave a Thai label as an untranslated English copy", () => {
    for (const key of keys) {
      expect(STRINGS.th[key], key).not.toBe(STRINGS.en[key]);
    }
  });
});
