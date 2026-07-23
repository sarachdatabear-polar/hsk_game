#!/usr/bin/env node
// Permanent viewport regression harness — drives home/shop/profile/account/battle at the
// standard device matrix and reports overflow / clipped controls / tap-target
// / scroll regressions. Promoted from the throwaway probes used in the
// responsive-all-devices round (.superpowers/sdd/responsive-sweep.mjs +
// resp-battle-probe.mjs).
//
// Usage:
//   npm run serve                       # in another shell — python http.server on :8000
//   node scripts/responsive-sweep.mjs           # full 10-viewport multi-screen sweep (EN)
//   node scripts/responsive-sweep.mjs --locale=th    # same permanent gate in Thai
//   node scripts/responsive-sweep.mjs --battle 390x844   # single-shot battle probe
//   node scripts/responsive-sweep.mjs --street-project   # focused project loop probe
//
// Requires: npm i --no-save playwright-core, and Microsoft Edge installed
// (uses channel:"msedge" so it doesn't need a separate browser download).
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { layout } from "../src/layout.js";
import { getUrl } from "./url-get.mjs";

// Prefer Edge (Windows dev box); fall back to the playwright-cached chromium
// (VPS — `npx playwright install chromium`). PW_CHROMIUM overrides both.
function launchOpts() {
  const explicit = process.env.PW_CHROMIUM;
  if (explicit) return { executablePath: explicit, headless: true };
  const cached = join(homedir(), ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
  if (process.platform !== "win32" && existsSync(cached))
    return { executablePath: cached, headless: true };
  return { channel: "msedge", headless: true };
}

const BASE_URL = process.env.RESP_BASE_URL || "http://localhost:8000";
const localeArg = process.argv.find(arg => arg.startsWith("--locale="))?.split("=", 2)[1];
const LOCALE = (localeArg || process.env.RESP_LOCALE) === "th" ? "th" : "en";
const TOL = 1; // px tolerance for viewport-edge comparisons
const MIN_TAP = 44; // Phase 6 accessibility/release acceptance floor

// [name, width, height] — matches the device matrix agreed for this round.
const VIEWPORTS = [
  ["se-320", 320, 568],
  ["fold-344", 344, 882],
  ["s-360", 360, 640],
  ["tall-360", 360, 800],
  ["iph-390", 390, 844],
  ["andr-412", 412, 915],
  ["land-640", 640, 360],
  ["land-844", 844, 390],
  ["tab-768", 768, 1024],
  ["desk-1280", 1280, 800],
];

// ---------------------------------------------------------------------------
// In-page helpers (installed via addInitScript so they exist before any of
// the app's own scripts run, and are available to every page.evaluate call).
// ---------------------------------------------------------------------------
function installPageHelpers() {
  window.__resp = {
    spriteReady: [],
    streetBgDraws: 0,
    drawnAssets: [],
    // Intersect an element's own rect with the clipping rect of every
    // ancestor whose computed overflow actually clips (hidden/clip/scroll/
    // auto). This is the fix for the false-positive where a naive
    // `rect.bottom > innerHeight` check flags something like the
    // -webkit-line-clamp'd .opt-label span: the span's own box can report a
    // rect that pokes past the viewport, but its parent button clips it with
    // overflow:hidden, so nothing is actually visibly overflowing.
    effectiveVisibleRect(el) {
      const r = el.getBoundingClientRect();
      const rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      let node = el.parentElement;
      while (node && node.nodeType === 1) {
        const cs = getComputedStyle(node);
        const clipRe = /(hidden|scroll|auto|clip)/;
        const clipsY = clipRe.test(cs.overflowY) || clipRe.test(cs.overflow);
        const clipsX = clipRe.test(cs.overflowX) || clipRe.test(cs.overflow);
        if (clipsY || clipsX) {
          const ar = node.getBoundingClientRect();
          if (clipsY) {
            rect.top = Math.max(rect.top, ar.top);
            rect.bottom = Math.min(rect.bottom, ar.bottom);
          }
          if (clipsX) {
            rect.left = Math.max(rect.left, ar.left);
            rect.right = Math.min(rect.right, ar.right);
          }
        }
        node = node.parentElement;
      }
      return rect;
    },
    // True only if the element still has a positive-area visible rect after
    // ancestor-clip intersection, AND that visible rect's bottom edge is
    // still past the viewport. Elements with zero visible area (already
    // fully hidden by an ancestor clip) are skipped, not flagged.
    isClippedBelowViewport(el, innerHeight, tol) {
      const rect = this.effectiveVisibleRect(el);
      const w = rect.right - rect.left;
      const h = rect.bottom - rect.top;
      if (w <= 0 || h <= 0) return false;
      return rect.bottom > innerHeight + tol;
    },
  };
  window.addEventListener("nbhsk:sprite-ready", event => {
    window.__resp.spriteReady.push(event.detail?.name || "");
  });
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
    const src = image?.currentSrc || image?.src || "";
    if (src.includes("/assets/bg-street.png"))
      window.__resp.streetBgDraws++;
    const asset = src.split("/").pop() || "";
    if (asset && !window.__resp.drawnAssets.includes(asset))
      window.__resp.drawnAssets.push(asset);
    return drawImage.call(this, image, ...args);
  };
}

// ---------------------------------------------------------------------------
// Per-screen probe: overflow-x, elements past left/right edge, tap targets
// under 44px, and (battle only) ancestor-aware clipped-below count.
// ---------------------------------------------------------------------------
function probeScreen([screenName, tol, minTap]) {
  const doc = document.documentElement;
  const overflowX = doc.scrollWidth > window.innerWidth + tol;

  const wide = [...document.querySelectorAll("body *")]
    .filter(el => el.offsetParent !== null)
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return r.right > window.innerWidth + tol || r.left < -tol;
    })
    .slice(0, 5)
    .map(el => el.id || el.className?.toString().slice(0, 30) || el.tagName);

  const small = [...document.querySelectorAll(".screen:not([hidden]) button, .nav-bar button")]
    .filter(el => el.offsetParent !== null)
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.height < minTap || r.width < minTap);
    })
    .slice(0, 5)
    .map(el => {
      const r = el.getBoundingClientRect();
      const label = (el.textContent || el.className.toString()).trim().slice(0, 16);
      return `${label}(${Math.round(r.width)}x${Math.round(r.height)})`;
    });

  let clippedBelow = 0;
  if (screenName === "battle") {
    clippedBelow = [...document.querySelectorAll("#s-battle *")]
      .filter(el => el.offsetParent !== null)
      .filter(el => window.__resp.isClippedBelowViewport(el, window.innerHeight, tol)).length;
  }

  return { overflowX, wide, small, clippedBelow };
}

// nav-reachable: the bottom tab bar must be fully inside the viewport at the
// current scroll position. Trivially true on screens whose document fits the
// viewport; on tall documents (shop catalog) it requires the bar to stick.
function probeNavReachable(tol) {
  const nav = document.querySelector("#bottom-nav");
  if (!nav) return "missing";
  const r = nav.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return "hidden";
  const inView = r.top < window.innerHeight && r.bottom <= window.innerHeight + tol;
  return inView
    ? "in-view"
    : `out(top=${Math.round(r.top)},bottom=${Math.round(r.bottom)},ih=${window.innerHeight})`;
}

// Street action reachability: snapshot all three primary controls, including
// their center-point hit target and 44px floor. runFullSweep then drives real
// pointer clicks through Decorate, focused Street Shop, and the Quests popup.
function probeStreetScene() {
  const screen = document.querySelector("#s-street");
  const cv = document.querySelector("#street-cv");
  const r = cv?.getBoundingClientRect();
  const actions = ["street-decorate-btn", "street-shop-btn", "street-quests-btn"]
    .map(id => document.getElementById(id))
    .map(button => {
      if (!button) return { present: false, hit: false, width: 0, height: 0 };
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        present: true,
        hit: hit === button || button.contains(hit),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
  return {
    active: screen?.classList.contains("on") ?? false,
    cvHeight: r ? Math.round(r.height) : 0,
    actions,
    overlayOpenBeforeClick: document.querySelector("#quest-overlay")?.classList.contains("on") ?? false,
    paintedBgReady: window.__resp.spriteReady.includes("bg-street"),
    paintedBgDraws: window.__resp.streetBgDraws,
  };
}
// Scoped to #quest-overlay specifically (not a bare #quest-panel lookup):
// renderQuests() runs at boot, so #quest-panel is populated from startup and
// stays populated even if it isn't actually nested inside the popup — a bare
// selector would pass regardless of where the panel lives (same guard as the
// pre-revert probe this replaces).
function probeQuestPopup() {
  const overlay = document.querySelector("#quest-overlay");
  const panel = document.querySelector("#quest-overlay #quest-panel");
  return {
    open: overlay?.classList.contains("on") ?? false,
    questPanelChildren: panel ? panel.children.length : 0,
  };
}

function probeStartInFold(tol) {
  const b = document.querySelector("#home-start");
  if (!b) return "missing";
  const r = b.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return "hidden";
  return r.top >= -tol && r.bottom <= window.innerHeight + tol ? "in-fold" : "below-fold";
}

function probeBattle(tol) {
  const cv = document.querySelector("#cv");
  const cvRect = cv?.getBoundingClientRect();
  const cvSize = cvRect ? { w: Math.round(cvRect.width), h: Math.round(cvRect.height) } : null;

  const optBtns = [...document.querySelectorAll("#opts button")];
  const visibleOptBtns = optBtns.filter(b => {
    const r = b.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.top >= -tol &&
      r.left >= -tol &&
      r.bottom <= window.innerHeight + tol &&
      r.right <= window.innerWidth + tol
    );
  });

  const pauseBtn = document.querySelector("#hud-pause");
  let pauseOnScreen = false;
  if (pauseBtn) {
    const r = pauseBtn.getBoundingClientRect();
    pauseOnScreen =
      r.width > 0 &&
      r.height > 0 &&
      r.top >= -tol &&
      r.left >= -tol &&
      r.bottom <= window.innerHeight + tol &&
      r.right <= window.innerWidth + tol;
  }

  const doc = document.documentElement;
  const scrollNeeded =
    doc.scrollHeight > window.innerHeight + tol || doc.scrollWidth > window.innerWidth + tol;

  return {
    cvSize,
    optBtnCount: optBtns.length,
    visibleOptBtnCount: visibleOptBtns.length,
    optHeights: [...document.querySelectorAll("#opts button")].map(b =>
      Math.round(b.getBoundingClientRect().height)
    ),
    pauseOnScreen,
    scrollNeeded,
  };
}

function probeLearn(tol) {
  const ids = ["fc-card", "fc-again", "fc-spk", "fc-know"];
  const controls = ids.map(id => document.getElementById(id));
  const inViewport = controls.every(el => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top >= -tol && r.left >= -tol &&
      r.bottom <= window.innerHeight + tol && r.right <= window.innerWidth + tol;
  });
  const doc = document.documentElement;
  return {
    inViewport,
    scrollNeeded: doc.scrollHeight > window.innerHeight + tol || doc.scrollWidth > window.innerWidth + tol,
    againDisabled: document.querySelector("#fc-again")?.disabled ?? false,
    knowDisabled: document.querySelector("#fc-know")?.disabled ?? false,
  };
}

// The Cards deck is intentionally shuffled in production. A release gate must
// not inherit that randomness: advance to a fixed, layout-stressing example
// before measuring the flipped card. These words are in the default HSK1 top
// 20 and exercise long English-sentence / Thai-meaning wrapping respectively.
async function selectFlashcardWord(page, hanzi) {
  for (let i = 0; i < 25; i++) {
    const current = await page.evaluate(
      () => (document.querySelector("#fc-card .hz")?.textContent || "").trim()
    );
    if (current === hanzi) return true;
    await page.evaluate(() => document.querySelector("#fc-card")?.click());
    await page.evaluate(() => document.querySelector("#fc-know")?.click());
    await page.waitForTimeout(10);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Navigation helpers shared by the full sweep and the --battle single-shot.
// ---------------------------------------------------------------------------
async function preparePage(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(installPageHelpers);
  // Production randomness must not make a release gate intermittently green.
  // Seed 9 deliberately selects the long HSK1 `下午` bilingual cloze prompt,
  // which is the 320x568 stress case that exposed an 8px document overflow.
  await page.addInitScript(seed => {
    let state = seed >>> 0;
    Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  }, 9);
  await page.addInitScript(locale => {
    localStorage.setItem("nbhsk.introDone", "true");
    localStorage.setItem("nbhsk.locale", JSON.stringify(locale));
    localStorage.setItem("nbhsk.wallet", "5000");
  }, LOCALE);
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  return { page, errs };
}

async function goToShop(page) {
  await page.evaluate(() => document.querySelector('[data-go="shop"]')?.click());
  await page.waitForTimeout(250);
}

async function goToStreet(page) {
  await page.evaluate(() => document.querySelector('[data-go="street"]')?.click());
  await page.waitForTimeout(250);
  await page.waitForFunction(() => window.__resp.spriteReady.includes("bg-street"), null, { timeout:3000 })
    .catch(() => {});
  await page.waitForTimeout(50);
}

async function goToProfile(page) {
  await page.evaluate(() => document.querySelector('[data-go="progress"]')?.click());
  await page.waitForTimeout(250);
}

async function goToAccount(page) {
  await page.evaluate(() => document.querySelector('#bottom-nav [data-go="more"], [data-go="more"]')?.click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#s-more [data-go="account"]')?.click());
  await page.waitForTimeout(250);
}

async function goToBattle(page) {
  await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector("#home-start")?.scrollIntoView());
  await page.evaluate(() => document.querySelector("#home-start")?.click());
  await page.waitForTimeout(900);
}

// F9: force every word in the dataset to a streak of 1 — formatFor (src/
// formats.js) maps streak 1-2 to the "listen" format, so whichever word the
// battle spawns is guaranteed to be a listen question. Written to
// localStorage then the page is reloaded so main.js's module-level
// masteryStore (read once at boot from store.get("mastery", {})) picks it
// up; setting it after boot would be too late for the first spawn.
async function forceListenFormat(page) {
  await page.evaluate(() => {
    const D = window.HSK_DATA;
    const m = {};
    for (const lv of Object.values(D.levels)) for (const w of lv) m[w.h] = { s: 1, k: 1, r: 1 };
    localStorage.setItem("nbhsk.mastery", JSON.stringify(m));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(700);
}

async function forceQuestionFormat(page, streak) {
  await page.evaluate(r => {
    const D = window.HSK_DATA;
    const m = {};
    for (const lv of Object.values(D.levels)) for (const w of lv) m[w.h] = { s: r, k: r, r };
    localStorage.setItem("nbhsk.mastery", JSON.stringify(m));
    localStorage.setItem("nbhsk.formatIntros", JSON.stringify({
      listen: 1, reverse: 1, tone: 1, cloze: 1, typed: 1,
    }));
    localStorage.setItem("nbhsk.scope", JSON.stringify({
      levels:[1], core:false, newOnly:false, topN:100, lang:"both", sessionLen:20,
    }));
  }, streak);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
}

async function runQuestionFormatProbe(browser, format, streak, width, height) {
  const { page, errs } = await preparePage(browser, width, height);
  await forceQuestionFormat(page, streak);
  await goToBattle(page);

  const info = await page.evaluate(([expected, tol, minTap]) => {
    const battle = document.querySelector("#s-battle");
    const visibleControls = [...document.querySelectorAll("#opts button, #opts input")]
      .filter(el => el.offsetParent !== null);
    const rects = visibleControls.map(el => {
      const r = el.getBoundingClientRect();
      return { w:r.width, h:r.height, top:r.top, left:r.left, right:r.right, bottom:r.bottom };
    });
    const doc = document.documentElement;
    return {
      actual:battle?.dataset.format || "",
      scrollNeeded:doc.scrollHeight > window.innerHeight + tol || doc.scrollWidth > window.innerWidth + tol,
      allInViewport:rects.every(r => r.top >= -tol && r.left >= -tol &&
        r.bottom <= window.innerHeight + tol && r.right <= window.innerWidth + tol),
      small:rects.filter(r => r.w < minTap || r.h < minTap)
        .map(r => `${Math.round(r.w)}x${Math.round(r.h)}`),
      toneChips:document.querySelectorAll("#opts .tone-chip").length,
      typedInput:!!document.querySelector("#opts .typed-letters"),
      clozePrompt:!!document.querySelector("#opts .cloze-prompt"),
      reversePrompt:!!document.querySelector("#opts .boss-prompt"),
      toneSignals:document.querySelectorAll("#opts .tone-sig").length,
      feedback:(document.querySelector("#quest-feedback")?.textContent || "").trim(),
      expected,
    };
  }, [format, TOL, MIN_TAP]);

  const failures = [];
  if (info.actual !== format) failures.push(`format=${info.actual || "missing"}, expected=${format}`);
  if (info.scrollNeeded) failures.push("scroll needed");
  if (!info.allInViewport) failures.push("controls outside viewport");
  if (info.small.length) failures.push(`small-controls:[${info.small}]`);
  if (format === "typed" && (!info.typedInput || info.toneChips < 4))
    failures.push(`typed controls missing (input=${info.typedInput}, tones=${info.toneChips})`);
  if (format === "cloze" && !info.clozePrompt) failures.push("cloze prompt missing");
  if (format === "reverse" && !info.reversePrompt) failures.push("reverse prompt missing");
  if (format === "tone" && info.toneSignals !== 4)
    failures.push(`tone signals=${info.toneSignals}, expected=4`);
  if (!info.feedback) failures.push("format prompt empty");
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  const line = `[${failures.length ? "FAIL" : "PASS"}] ${format} ${width}x${height}: ` +
    `controls=${info.small.length ? "small" : "44px+"} prompt=${info.feedback.slice(0, 36)}` +
    (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");
  await page.close();
  return { line, failed:failures.length > 0 };
}

// F9 permanent gate: at the two worst tiers from the diagnosis, drive a
// forced listen-format question and assert the page fits without scrolling.
// Returns a sweep-style [PASS]/[FAIL] line plus a boolean for the caller's
// overall exit code.
async function runListenFormatProbe(browser, width, height) {
  const { page, errs } = await preparePage(browser, width, height);
  await forceListenFormat(page);
  await goToBattle(page);

  const info = await page.evaluate(tol => {
    const doc = document.documentElement;
    return {
      listenFmt: document.querySelector("#s-battle.listen-fmt") !== null,
      replay: document.querySelector("#opts .replay") !== null,
      scrollHeight: doc.scrollHeight,
      innerHeight: window.innerHeight,
      fits: doc.scrollHeight <= window.innerHeight + tol,
    };
  }, 2);

  const failures = [];
  if (!info.replay) failures.push("listen-fmt: .replay row not found (format not forced to listen)");
  if (!info.listenFmt) failures.push("listen-fmt: #s-battle.listen-fmt class missing");
  if (!info.fits)
    failures.push(`listen-fmt: scrollHeight=${info.scrollHeight}>innerHeight+2=${info.innerHeight + 2}`);
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  const status = failures.length ? "FAIL" : "PASS";
  const line =
    `[${status}] listen-fmt ${width}x${height}: scrollHeight=${info.scrollHeight}` +
    ` innerHeight=${info.innerHeight}` +
    (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");

  await page.close();
  return { line, failed: failures.length > 0 };
}

// Phase 6: finish a deterministic five-word quest with one intentional miss,
// then verify the real Results postcard. This covers the route that the normal
// battle probe cannot reach and keeps missed-word audio targets in the gate.
async function runResultsProbe(browser, width, height) {
  const { page, errs } = await preparePage(browser, width, height);
  await page.evaluate(() => {
    localStorage.setItem("nbhsk.scope", JSON.stringify({
      levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:5,
    }));
    localStorage.setItem("nbhsk.shop", JSON.stringify({
      streetProject:{ v:1, itemId:"koi-pond", plotId:"plot-medium-01" },
    }));
  });
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(300);
  await goToBattle(page);

  await page.waitForFunction(() => [...document.querySelectorAll("#opts button")]
    .some(b => !b.disabled && !b._correct && !b.classList.contains("replay")));
  await page.evaluate(() => [...document.querySelectorAll("#opts button")]
    .find(b => !b.disabled && !b._correct && !b.classList.contains("replay"))?.click());
  await page.waitForTimeout(80);
  await page.evaluate(() => document.querySelector("#cv")?.click());

  for(let guard=0; guard<12; guard++){
    if(await page.evaluate(() => document.querySelector("#s-results")?.classList.contains("on"))) break;
    await page.waitForFunction(() =>
      document.querySelector("#s-results")?.classList.contains("on") ||
      [...document.querySelectorAll("#opts button")]
        .some(b => !b.disabled && b._correct && !b.classList.contains("replay"))
    );
    if(await page.evaluate(() => document.querySelector("#s-results")?.classList.contains("on"))) break;
    await page.evaluate(() => [...document.querySelectorAll("#opts button")]
      .find(b => !b.disabled && b._correct && !b.classList.contains("replay"))?.click());
    await page.waitForTimeout(520);
    await page.evaluate(() => document.querySelector("#cv")?.click());
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => document.querySelector("#s-results")?.classList.contains("on"));

  const info = await page.evaluate(([tol, minTap]) => {
    const doc = document.documentElement;
    const active = document.querySelector("#s-results.on");
    const small = [...active.querySelectorAll("button")]
      .filter(b => b.offsetParent !== null)
      .filter(b => {
        const r = b.getBoundingClientRect();
        return r.width < minTap || r.height < minTap;
      })
      .map(b => {
        const r = b.getBoundingClientRect();
        return `${b.getAttribute("aria-label") || b.textContent.trim().slice(0,16)}(${Math.round(r.width)}x${Math.round(r.height)})`;
      });
    return {
      overflowX:doc.scrollWidth > window.innerWidth + tol,
      learned:document.querySelector("#r-learned")?.textContent || "",
      nextVisible:document.querySelector("#r-next-review")?.offsetParent !== null,
      missedRows:document.querySelectorAll("#r-miss .missrow").length,
      projectVisible:document.querySelector("#r-project")?.offsetParent !== null,
      projectName:(document.querySelector("#r-project-name")?.textContent || "").trim(),
      projectProgress:Number(document.querySelector("#r-project-meter")?.getAttribute("aria-valuenow") || 0),
      projectAction:(document.querySelector("#r-project-action")?.textContent || "").trim(),
      small,
    };
  }, [TOL, MIN_TAP]);

  const failures = [];
  if(info.overflowX) failures.push("results overflow-x");
  // Locale-neutral: English begins with "5 / 5" while Thai wraps the same
  // learned/target values in translated copy.
  if(!/5\s*\/\s*5/.test(info.learned)) failures.push(`results learned=${info.learned}`);
  if(!info.nextVisible) failures.push("results next-review hidden");
  if(info.missedRows < 1) failures.push("results missed-word recap absent");
  if(!info.projectVisible) failures.push("results Street Project hidden");
  if(!info.projectName) failures.push("results Street Project name empty");
  if(info.projectProgress < 83) failures.push(`results Street Project progress=${info.projectProgress}`);
  if(!info.projectAction) failures.push("results Street Project action empty");
  if(info.small.length) failures.push(`results small-taps:[${info.small}]`);
  if(errs.length) failures.push(`JSERR:${errs[0]}`);

  const status = failures.length ? "FAIL" : "PASS";
  const line = `[${status}] results ${width}x${height}: learned=${info.learned}` +
    ` misses=${info.missedRows}` + (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");
  await page.close();
  return { line, failed:failures.length > 0 };
}

// Street Project retention loop: use real pointer clicks from focused shop
// preview -> choose goal -> see progress card -> change goal.
async function runStreetProjectProbe(browser) {
  const { page, errs } = await preparePage(browser, 390, 844);
  await page.evaluate(() => {
    localStorage.setItem("nbhsk.shop", JSON.stringify({
      owned:["panda","market"], skin:"panda", backdrop:"market",
    }));
  });
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(350);
  await goToStreet(page);
  await page.waitForFunction(() =>
    window.__resp.spriteReady.includes("bg-market") &&
    (window.__resp.spriteReady.includes("cat-panda-walk") ||
      window.__resp.spriteReady.includes("cat-panda-happy")), null, { timeout:3000 })
    .catch(() => {});
  const resident = await page.evaluate(() => {
    const canvas=document.querySelector("#street-resident-cv");
    const scroll=document.querySelector("#street-scroll");
    const world=document.querySelector("#street-world");
    return {
      canvasSized:!!canvas?.width && !!canvas?.height,
      themeDrawn:window.__resp.drawnAssets.includes("bg-market.png"),
      catDrawn:window.__resp.drawnAssets.some(name=>
        name==="cat-panda-walk.png" || name==="cat-panda-happy.png"),
      oneScreen:!!scroll && !!world &&
        scroll.scrollWidth<=scroll.clientWidth+1 &&
        world.clientWidth<=scroll.clientWidth+1,
      pagerRemoved:!document.querySelector("#street-prev, #street-next, #street-pager"),
    };
  });
  await page.locator("#street-shop-btn").click();
  await page.waitForTimeout(100);
  await page.locator('.shoprow[data-item-id="koi-pond"] button').click();
  await page.waitForTimeout(180);
  const preview = await page.evaluate(() => ({
    active:document.querySelector("#s-street")?.classList.contains("on") ?? false,
    visible:document.querySelector("#street-preview-panel")?.offsetParent !== null,
    projectButton:document.querySelector("#street-preview-project")?.offsetParent !== null,
  }));
  await page.locator("#street-preview-project").click();
  await page.waitForTimeout(180);
  const selected = await page.evaluate(() => {
    const project=JSON.parse(localStorage.getItem("nbhsk.shop") || "{}").streetProject;
    return {
      project,
      cardVisible:document.querySelector("#street-project")?.offsetParent !== null,
      previewHidden:document.querySelector("#street-preview-panel")?.hidden ?? false,
      name:(document.querySelector("#street-project-name")?.textContent || "").trim(),
      pct:Number(document.querySelector("#street-project-meter")?.getAttribute("aria-valuenow") || 0),
      buildDisabled:document.querySelector("#street-project-build")?.disabled ?? false,
    };
  });
  await page.locator("#street-project-change").click();
  await page.waitForTimeout(120);
  const changeOpenedShop = await page.evaluate(() =>
    document.querySelector("#s-shop")?.classList.contains("on") &&
    document.querySelector("#s-shop")?.classList.contains("street-focus"));
  // Exact-price ready path: replace the goal, enter Build Now, verify Back
  // stays on Street, then complete the real Buy & Place flow.
  await page.locator('.shoprow[data-item-id="golden-arch"] button').click();
  await page.waitForTimeout(120);
  await page.locator("#street-preview-project").click();
  await page.waitForTimeout(120);
  const ready = await page.evaluate(() => ({
    pct:Number(document.querySelector("#street-project-meter")?.getAttribute("aria-valuenow") || 0),
    buildDisabled:document.querySelector("#street-project-build")?.disabled ?? true,
  }));
  await page.locator("#street-project-build").click();
  await page.waitForTimeout(120);
  await page.locator("#street-preview-back").click();
  await page.waitForTimeout(120);
  const backStayedOnStreet = await page.evaluate(() =>
    document.querySelector("#s-street")?.classList.contains("on") &&
    document.querySelector("#street-project")?.offsetParent !== null &&
    document.querySelector("#street-preview-panel")?.hidden);
  await page.locator("#street-project-build").click();
  await page.waitForTimeout(120);
  await page.locator("#street-preview-buy").click();
  await page.waitForTimeout(180);
  const completed = await page.evaluate(() => {
    const shop=JSON.parse(localStorage.getItem("nbhsk.shop") || "{}");
    return {
      owned:shop.owned?.includes("golden-arch") ?? false,
      projectCleared:!shop.streetProject?.itemId,
      editorVisible:document.querySelector("#street-editor")?.offsetParent !== null,
      wallet:Number(localStorage.getItem("nbhsk.wallet") || -1),
    };
  });

  const failures = [];
  if(!resident.canvasSized || !resident.themeDrawn || !resident.catDrawn ||
      !resident.oneScreen || !resident.pagerRemoved)
    failures.push(`Street resident/theme unavailable=${JSON.stringify(resident)}`);
  if(!preview.active || !preview.visible || !preview.projectButton)
    failures.push(`project preview unavailable=${JSON.stringify(preview)}`);
  if(selected.project?.itemId !== "koi-pond" || !selected.project?.plotId)
    failures.push(`project not persisted=${JSON.stringify(selected.project)}`);
  if(!selected.cardVisible || !selected.previewHidden)
    failures.push(`project card state=${JSON.stringify(selected)}`);
  if(!selected.name || selected.pct !== 83 || !selected.buildDisabled)
    failures.push(`project progress state=${JSON.stringify(selected)}`);
  if(!changeOpenedShop) failures.push("project Change did not open focused shop");
  if(ready.pct !== 100 || ready.buildDisabled)
    failures.push(`ready project state=${JSON.stringify(ready)}`);
  if(!backStayedOnStreet) failures.push("project preview Back did not stay on Street");
  if(!completed.owned || !completed.projectCleared || !completed.editorVisible || completed.wallet !== 0)
    failures.push(`project completion state=${JSON.stringify(completed)}`);
  if(errs.length) failures.push(`JSERR:${errs[0]}`);
  const line=`[${failures.length?"FAIL":"PASS"}] Street Project 390x844: `+
    `item=${selected.project?.itemId||"missing"} progress=${selected.pct}% complete=${completed.owned}`+
    (failures.length?` | FAILURES: ${failures.join("; ")}`:"");
  await page.close();
  return {line,failed:failures.length>0};
}

async function runCardsResumeProbe(browser) {
  const { page, errs } = await preparePage(browser, 390, 844);
  await page.evaluate(() => {
    localStorage.removeItem("nbhsk.flashcards");
    localStorage.setItem("nbhsk.scope", JSON.stringify({
      levels:[1], core:false, newOnly:false, topN:100, lang:"both", sessionLen:5,
    }));
  });
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(350);
  await page.evaluate(() => document.querySelector("#home-scope-chip")?.click());
  await page.evaluate(() => document.querySelector("#go-learn")?.click());
  await page.waitForTimeout(100);

  const disabledBeforeFlip = await page.evaluate(() =>
    document.querySelector("#fc-again")?.disabled && document.querySelector("#fc-know")?.disabled);
  await page.evaluate(() => document.querySelector("#fc-card")?.click());
  await page.evaluate(() => document.querySelector("#fc-know")?.click());
  await page.waitForTimeout(100);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nbhsk.flashcards") || "null"));
  await page.evaluate(() => document.querySelector('#s-learn [data-go="home"]')?.click());
  await page.evaluate(() => document.querySelector("#home-scope-chip")?.click());
  await page.waitForTimeout(100);
  const resumeLabel = await page.evaluate(() => document.querySelector("#go-learn")?.textContent?.trim() || "");
  await page.evaluate(() => document.querySelector("#go-learn")?.click());
  await page.waitForTimeout(100);
  const resumed = await page.evaluate(expected => ({
    front:document.querySelector("#fc-card .hz")?.textContent || "",
    disabled:document.querySelector("#fc-again")?.disabled && document.querySelector("#fc-know")?.disabled,
    expected:expected?.deck?.[expected?.i] || "",
  }), saved);

  const failures = [];
  if (!disabledBeforeFlip) failures.push("answers enabled before first flip");
  if (!saved || saved.i !== 1 || saved.done !== 1 || saved.total !== 5)
    failures.push(`bad snapshot=${JSON.stringify(saved)}`);
  if (!/4/.test(resumeLabel)) failures.push(`resume count missing from label=${resumeLabel}`);
  if (!resumed.disabled) failures.push("resumed answers enabled before flip");
  if (!resumed.expected || resumed.front !== resumed.expected)
    failures.push(`resumed card=${resumed.front}, expected=${resumed.expected}`);
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  const line = `[${failures.length ? "FAIL" : "PASS"}] cards resume 390x844: ` +
    `saved=${saved?.i ?? "?"}/5 label=${resumeLabel.slice(0,30)}` +
    (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");
  await page.close();
  return { line, failed:failures.length > 0 };
}

// F2 (2026-07-26 audit): true first-run onboarding probe. Every other probe
// in this file seeds nbhsk.introDone=true via preparePage() specifically to
// skip onboarding and test the returning-user app — which structurally kept
// the Welcome screen invisible to this permanent gate and let the landscape
// CTA-below-the-fold regression (F2) ship undetected (see
// docs/planning/2026-07-26-launch-audit-findings.md). This probe seeds NO
// localStorage keys except locale, so isFirstRun() (src/firstrun.js) sees a
// genuinely fresh profile and main.js's boot path calls show("welcome").
async function prepareWelcomePage(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(locale => {
    localStorage.setItem("nbhsk.locale", JSON.stringify(locale));
  }, LOCALE);
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  return { page, errs };
}

async function runWelcomeProbe(browser, width, height) {
  const { page, errs } = await prepareWelcomePage(browser, width, height);

  const info = await page.evaluate(tol => {
    const rectIn = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        bottom: r.bottom,
        inView: r.width > 0 && r.height > 0 &&
          r.top >= -tol && r.bottom <= window.innerHeight + tol,
      };
    };
    const doc = document.documentElement;
    return {
      active: document.querySelector("#s-welcome")?.classList.contains("on") ?? false,
      startBtn: rectIn(document.querySelector("#welcome-start")),
      hsk6Chip: rectIn(document.querySelector('#welcome-level-chips [data-wlv="6"]')),
      scrollNeeded: doc.scrollHeight > window.innerHeight + tol,
      innerHeight: window.innerHeight,
      scrollHeight: doc.scrollHeight,
    };
  }, TOL);

  const failures = [];
  if (!info.active) failures.push("welcome: #s-welcome not active (first-run state not reached)");
  if (!info.startBtn) failures.push("welcome: #welcome-start missing");
  else if (!info.startBtn.inView)
    failures.push(`welcome: #welcome-start below fold (bottom=${Math.round(info.startBtn.bottom)}>innerHeight=${info.innerHeight})`);
  if (!info.hsk6Chip) failures.push("welcome: HSK6 level chip missing");
  else if (!info.hsk6Chip.inView)
    failures.push(`welcome: HSK6 level chip below fold (bottom=${Math.round(info.hsk6Chip.bottom)}>innerHeight=${info.innerHeight})`);
  if (info.scrollNeeded)
    failures.push(`welcome: scroll needed (scrollHeight=${info.scrollHeight}>innerHeight=${info.innerHeight})`);
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  const status = failures.length ? "FAIL" : "PASS";
  const line = `[${status}] welcome ${width}x${height} (${LOCALE}): ` +
    `start=${info.startBtn?.inView ? "in-fold" : "BELOW-FOLD"}` +
    (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");
  await page.close();
  return { line, failed: failures.length > 0 };
}

async function runAccessibilityProbe(browser) {
  const { page, errs } = await preparePage(browser, 390, 844);
  const navState = await page.evaluate(() => ({
    current:document.querySelector('#bottom-nav [aria-current="page"]')?.dataset.tab || "",
    count:document.querySelectorAll('#bottom-nav [aria-current="page"]').length,
  }));
  await goToBattle(page);
  const canvasBefore = await page.evaluate(() => document.querySelector("#cv")?.getAttribute("aria-label") || "");
  // A real user click focuses the trigger; Element.click() does not, which
  // would make the return-focus assertion test a synthetic non-user path.
  await page.click("#hud-pause");
  await page.waitForTimeout(50);
  const pauseOpen = await page.evaluate(() => ({
    on:document.querySelector("#pause-overlay")?.classList.contains("on") || false,
    active:document.activeElement?.id || "",
    modal:document.querySelector("#pause-overlay")?.getAttribute("aria-modal") || "",
  }));
  await page.keyboard.press("Shift+Tab");
  const trapped = await page.evaluate(() => !!document.activeElement?.closest("#pause-overlay"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(50); // focus restoration is intentionally requestAnimationFrame-scheduled
  const pauseClosed = await page.evaluate(() => ({
    on:document.querySelector("#pause-overlay")?.classList.contains("on") || false,
    active:document.activeElement?.id || "",
  }));
  await page.evaluate(() => [...document.querySelectorAll("#opts button")]
    .find(b => !b.disabled && !b._correct && !b.classList.contains("replay"))?.click());
  await page.waitForTimeout(50);
  const canvasAfter = await page.evaluate(() => document.querySelector("#cv")?.getAttribute("aria-label") || "");

  const failures = [];
  if (navState.current !== "home" || navState.count !== 1)
    failures.push(`nav current=${navState.current}/${navState.count}`);
  if (!canvasBefore) failures.push("canvas label missing");
  if (!pauseOpen.on || pauseOpen.active !== "pause-resume" || pauseOpen.modal !== "true")
    failures.push(`pause open=${JSON.stringify(pauseOpen)}`);
  if (!trapped) failures.push("focus escaped pause dialog");
  if (pauseClosed.on || pauseClosed.active !== "hud-pause")
    failures.push(`pause close=${JSON.stringify(pauseClosed)}`);
  if (!canvasAfter || canvasAfter === canvasBefore) failures.push("canvas reveal label did not change");
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  const line = `[${failures.length ? "FAIL" : "PASS"}] accessibility 390x844: ` +
    `nav=${navState.current} focus=${pauseOpen.active}->${pauseClosed.active} canvas=dynamic` +
    (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "");
  await page.close();
  return { line, failed:failures.length > 0 };
}

// ---------------------------------------------------------------------------
// Server reachability check — the harness never starts the server itself
// (the user runs `npm run serve` in another shell); fail fast with a clear
// message rather than letting every page.goto() time out one by one.
// ---------------------------------------------------------------------------
async function assertServerReachable() {
  // Deliberately uses Node's protocol-specific clients rather than global
  // fetch()/undici: Node 24's undici client crashes the whole process with an uncaught
  // `assert(!this.paused)` when talking to Python's http.server (HTTP/1.0,
  // connection: close). The native http/https clients don't hit that path.
  const reachable = await new Promise(resolve => {
    const req = getUrl(`${BASE_URL}/index.html`, res => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
  if (!reachable) {
    console.error(
      `responsive-sweep: cannot reach ${BASE_URL}/index.html.\n` +
        `Start the server first in another shell: npm run serve`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Full sweep: home + shop + profile + account + battle at all 10 viewports.
// ---------------------------------------------------------------------------
async function runFullSweep() {
  await assertServerReachable();
  let browser = await chromium.launch(launchOpts());
  const lines = [];
  let anyFail = false;

  for (const [name, width, height] of VIEWPORTS) {
    const { page, errs } = await preparePage(browser, width, height);

    const home = await page.evaluate(probeScreen, ["home", TOL, MIN_TAP]);
    const startVisible = await page.evaluate(probeStartInFold, TOL);
    const overscrollY = await page.evaluate(
      () => getComputedStyle(document.documentElement).overscrollBehaviorY
    );

    // Street's three primary actions are exercised with Playwright pointer
    // clicks (not HTMLElement.click()), so an overlay or stale bundle that
    // leaves the controls visible-but-dead fails the release sweep.
    await goToStreet(page);
    const streetScene = await page.evaluate(probeStreetScene);
    await page.locator("#street-decorate-btn").click();
    await page.waitForTimeout(100);
    const streetDecorate = await page.evaluate(() => ({
      editorVisible: !document.querySelector("#street-editor")?.hidden,
      actionsHidden: !!document.querySelector("#street-actions")?.hidden,
    }));
    await page.locator("#street-cancel").click();
    await page.waitForTimeout(100);
    await page.locator("#street-shop-btn").click();
    await page.waitForTimeout(100);
    const streetShop = await page.evaluate(() => ({
      active: document.querySelector("#s-shop")?.classList.contains("on") ?? false,
      focused: document.querySelector("#s-shop")?.classList.contains("street-focus") ?? false,
    }));
    await page.locator("#shop-back").click();
    await page.waitForTimeout(100);
    await page.locator("#street-quests-btn").click();
    await page.waitForTimeout(150);
    const questPopup = await page.evaluate(probeQuestPopup);
    const streetNav = await page.evaluate(probeNavReachable, TOL);
    await page.locator("#quest-popup-close").click();
    await page.waitForTimeout(150);
    const questPopupClosed = await page.evaluate(
      () => !(document.querySelector("#quest-overlay")?.classList.contains("on") ?? false)
    );
    await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await goToShop(page);
    const shop = await page.evaluate(probeScreen, ["shop", TOL, MIN_TAP]);

    // nav-reachable: on shop the tab bar must be inside the viewport both at
    // the top of the document and after scrolling to the middle of the (tall)
    // catalog — persistent nav, not "scroll the whole catalog to find it".
    // Trivially passes on viewports where the shop document fits.
    const navAtTop = await page.evaluate(probeNavReachable, TOL);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(100);
    const navAtMid = await page.evaluate(probeNavReachable, TOL);
    await page.evaluate(() => window.scrollTo(0, 0));

    // stale-scroll: scroll to the bottom of shop, then navigate to progress
    // via show() — the document scroll position must reset to 0, not carry
    // over from the previous screen (both screens ride the shared document
    // scroller; there's no per-screen scroll container). Progress (rather
    // than home) is used as the target because it's tall enough that the
    // browser doesn't clamp the carried-over scrollY back to 0 on its own,
    // which would mask the bug. One portrait phone viewport is enough — this
    // isn't viewport-size-dependent.
    let staleScrollY = null;
    if (name === "s-360") {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.evaluate(() => document.querySelector('[data-go="progress"]')?.click());
      await page.waitForTimeout(150);
      staleScrollY = await page.evaluate(() => window.scrollY);
      // Restore to home for the rest of this viewport's flow (goToBattle
      // clicks home again anyway, but keep this probe self-contained).
      await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
      await page.waitForTimeout(100);
    }

    await goToProfile(page);
    const profile = await page.evaluate(probeScreen, ["progress", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector("#profile-edit-name")?.click());
    await page.waitForTimeout(50);
    const profileEdit = await page.evaluate(probeScreen, ["progress", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector("#profile-cancel-name")?.click());
    await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await goToAccount(page);
    const account = await page.evaluate(probeScreen, ["account", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
    await page.waitForTimeout(100);

    // Release-readiness expansion: exercise the secondary learning and
    // information screens that are not reachable through the four bottom
    // tabs alone. The flashcard check runs both sides of the card because the
    // back has materially different content height.
    await page.evaluate(() => document.querySelector("#home-scope-chip")?.click());
    await page.waitForTimeout(100);
    const scopePicker = await page.evaluate(probeScreen, ["scope-picker", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#scope-view-tabs [data-view="journey"]')?.click());
    await page.waitForTimeout(100);
    const scopeJourney = await page.evaluate(probeScreen, ["scope-journey", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#scope-view-tabs [data-view="picker"]')?.click());
    await page.evaluate(() => document.querySelector("#go-learn")?.click());
    await page.waitForTimeout(150);
    const learnTarget = LOCALE === "th" ? "了" : "商店";
    const learnTargetFound = await selectFlashcardWord(page, learnTarget);
    const learnBefore = await page.evaluate(probeLearn, TOL);
    await page.evaluate(() => document.querySelector("#fc-card")?.click());
    await page.waitForTimeout(50);
    const learn = await page.evaluate(probeScreen, ["learn", TOL, MIN_TAP]);
    const learnAfter = await page.evaluate(probeLearn, TOL);
    await page.evaluate(() => document.querySelector('#s-learn [data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await page.evaluate(() => document.querySelector("#home-tones-btn")?.click());
    await page.waitForTimeout(150);
    const tones = await page.evaluate(probeScreen, ["tones", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#s-tones [data-go="home"]')?.click());
    await page.evaluate(() => document.querySelector('#bottom-nav [data-go="more"]')?.click());
    await page.waitForTimeout(100);
    const more = await page.evaluate(probeScreen, ["more", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#s-more [data-go="scores"]')?.click());
    await page.waitForTimeout(100);
    const scores = await page.evaluate(probeScreen, ["scores", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#s-scores [data-go="more"]')?.click());
    await page.evaluate(() => document.querySelector('#s-more [data-go="howto"]')?.click());
    await page.waitForTimeout(100);
    const howto = await page.evaluate(probeScreen, ["howto", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#s-howto [data-go="more"]')?.click());
    await page.evaluate(() => document.querySelector('#bottom-nav [data-go="progress"]')?.click());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelector('#s-progress [data-go="album"]')?.click());
    await page.waitForTimeout(100);
    const album = await page.evaluate(probeScreen, ["album", TOL, MIN_TAP]);
    await page.evaluate(() => document.querySelector('#s-album [data-go="progress"]')?.click());
    await page.evaluate(() => document.querySelector('#s-progress [data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await goToBattle(page);
    const battle = await page.evaluate(probeScreen, ["battle", TOL, MIN_TAP]);
    const battleInfo = await page.evaluate(probeBattle, TOL);
    const cvRect = await page.evaluate(() => {
      const r = document.querySelector("#cv").getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    const L = layout(cvRect.w, cvRect.h);

    const isLandscape = height <= 500;
    const isShortPortrait = height <= 620;
    const scrollAssertApplies = isLandscape || isShortPortrait;
    const portraitVp = height > width;

    const failures = [];
    if (home.overflowX) failures.push("home overflow-x");
    if (shop.overflowX) failures.push("shop overflow-x");
    if (profile.overflowX) failures.push("profile overflow-x");
    if (profileEdit.overflowX) failures.push("profile-edit overflow-x");
    if (battle.overflowX) failures.push("battle overflow-x");
    if (account.overflowX) failures.push("account overflow-x");
    if (startVisible !== "in-fold") failures.push(`start=${startVisible}`);
    if (home.small.length) failures.push(`home small-taps:[${home.small}]`);
    if (shop.small.length) failures.push(`shop small-taps:[${shop.small}]`);
    if (profile.small.length) failures.push(`profile small-taps:[${profile.small}]`);
    if (profileEdit.small.length) failures.push(`profile-edit small-taps:[${profileEdit.small}]`);
    if (battle.small.length) failures.push(`battle small-taps:[${battle.small}]`);
    if (account.small.length) failures.push(`account small-taps:[${account.small}]`);
    if (home.wide.length) failures.push(`home wide:[${home.wide}]`);
    if (shop.wide.length) failures.push(`shop wide:[${shop.wide}]`);
    if (profile.wide.length) failures.push(`profile wide:[${profile.wide}]`);
    if (profileEdit.wide.length) failures.push(`profile-edit wide:[${profileEdit.wide}]`);
    if (battle.wide.length) failures.push(`battle wide:[${battle.wide}]`);
    if (account.wide.length) failures.push(`account wide:[${account.wide}]`);
    for (const [screenName, result] of [
      ["scope-picker", scopePicker], ["scope-journey", scopeJourney], ["learn", learn],
      ["tones", tones], ["more", more], ["scores", scores], ["howto", howto], ["album", album],
    ]) {
      if (result.overflowX) failures.push(`${screenName} overflow-x`);
      if (result.small.length) failures.push(`${screenName} small-taps:[${result.small}]`);
      if (result.wide.length) failures.push(`${screenName} wide:[${result.wide}]`);
    }
    if (!learnBefore.againDisabled || !learnBefore.knowDisabled)
      failures.push("learn answers enabled before flip");
    if (!learnTargetFound) failures.push(`learn fixture missing:${learnTarget}`);
    if (learnAfter.againDisabled || learnAfter.knowDisabled)
      failures.push("learn answers disabled after flip");
    if (!learnAfter.inViewport) failures.push("learn controls outside viewport after flip");
    if (height <= 500 && learnAfter.scrollNeeded) failures.push("learn landscape scroll needed");
    if (battle.clippedBelow > 0) failures.push(`battle clipped-below=${battle.clippedBelow}`);
    if (overscrollY !== "none") failures.push(`overscroll-behavior-y=${overscrollY}`);
    if (!streetScene.active) failures.push("street: #s-street not active");
    // Sanity floor, not a "big enough" assertion — the smallest measured tier
    // (land-640, 640x360) sits at 187px under the new min(52vh,400px) cap;
    // this just catches an actual regression (e.g. cv collapsing to 0).
    if (streetScene.cvHeight < 150) failures.push(`street: cv height=${streetScene.cvHeight}<150`);
    if (streetScene.actions.some(action => !action.present))
      failures.push(`street-actions: missing=${JSON.stringify(streetScene.actions)}`);
    if (streetScene.actions.some(action => !action.hit))
      failures.push(`street-actions: blocked-hit=${JSON.stringify(streetScene.actions)}`);
    if (streetScene.actions.some(action => action.width < MIN_TAP || action.height < MIN_TAP))
      failures.push(`street-actions: small-hit=${JSON.stringify(streetScene.actions)}`);
    if (!streetDecorate.editorVisible || !streetDecorate.actionsHidden)
      failures.push(`street-decorate: did not open editor=${JSON.stringify(streetDecorate)}`);
    if (!streetShop.active || !streetShop.focused)
      failures.push(`street-shop: did not open focused shop=${JSON.stringify(streetShop)}`);
    if (!streetScene.paintedBgReady || streetScene.paintedBgDraws < 1)
      failures.push(`street: lazy painted background did not redraw (ready=${streetScene.paintedBgReady}, draws=${streetScene.paintedBgDraws})`);
    if (streetScene.overlayOpenBeforeClick) failures.push("street-quests: popup open before click");
    if (!questPopup.open) failures.push("street-quests: popup did not open on button click");
    if (questPopup.questPanelChildren < 1)
      failures.push(`street-quests: #quest-panel empty (children=${questPopup.questPanelChildren})`);
    if (!questPopupClosed) failures.push("street-quests: popup did not close on X");
    if (streetNav !== "in-view") failures.push(`street-quests: nav-unreachable:${streetNav}`);
    if (navAtTop !== "in-view") failures.push(`shop nav-unreachable@top:${navAtTop}`);
    if (navAtMid !== "in-view") failures.push(`shop nav-unreachable@mid:${navAtMid}`);
    if (staleScrollY !== null && staleScrollY > 1)
      failures.push(`stale-scroll: shop->progress scrollY=${staleScrollY}`);
    if (!battleInfo.cvSize) failures.push("battle #cv missing");
    else if (battleInfo.cvSize.h < 160) failures.push(`battle #cv height=${battleInfo.cvSize.h}<160`);
    if (battleInfo.optBtnCount !== 4) failures.push(`battle #opts count=${battleInfo.optBtnCount}!=4`);
    else if (battleInfo.visibleOptBtnCount !== 4)
      failures.push(`battle #opts visible=${battleInfo.visibleOptBtnCount}/4`);
    if (!battleInfo.pauseOnScreen) failures.push("battle pause off-screen");
    if (scrollAssertApplies && battleInfo.scrollNeeded)
      failures.push(`battle scroll needed (${isLandscape ? "landscape" : "short-portrait"})`);
    // 56px is the PRD portrait-phone floor keyed on viewport width — canvas-width
    // keying let the 360-wide motivating case fall into the tautological 48
    // branch that can never fire; landscape battle canvases are height-starved
    // by design (the answers grid claims a full-height column) and only need
    // to clear the 48px absolute readability floor.
    const hanziFloor = (portraitVp && width >= 360) ? 56 : 48;
    if (L.hanziPx < hanziFloor)
      failures.push(
        `battle hanzi=${L.hanziPx.toFixed(1)}<${hanziFloor} (cv ${Math.round(cvRect.w)}x${Math.round(cvRect.h)})`
      );
    // Ballooning opt-buttons is a portrait-only defect: in landscape the
    // answers grid deliberately owns a full-height column (landscape tier
    // sets max-height:none) and can't squeeze the canvas, so tall buttons
    // there aren't the bug this gate protects against.
    const maxOpt = battleInfo.optHeights.length ? Math.max(...battleInfo.optHeights) : 0;
    if (portraitVp && maxOpt > 142) failures.push(`battle opt-height=${maxOpt}>142`);
    if (errs.length) failures.push(`JSERR:${errs[0]}`);

    const status = failures.length ? "FAIL" : "PASS";
    if (failures.length) anyFail = true;

    lines.push(
      `[${status}] ${name} (${width}x${height}): start=${startVisible}` +
        ` cv=${battleInfo.cvSize ? `${battleInfo.cvSize.w}x${battleInfo.cvSize.h}` : "none"}` +
        ` opts=${battleInfo.visibleOptBtnCount}/${battleInfo.optBtnCount}` +
        ` pause=${battleInfo.pauseOnScreen ? "on" : "OFF"}` +
        (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "")
    );

    await page.close();
  }

  console.log(lines.join("\n"));
  console.log(
    `\n${lines.filter(l => l.startsWith("[PASS]")).length}/${VIEWPORTS.length} ${LOCALE.toUpperCase()} viewports passed`
  );

  // The full screen sweep deliberately visits the art-heavy Shop ten times.
  // Recycle Chromium before the focused probes so decoded image memory cannot
  // accumulate until a later Results target crashes despite each page closing.
  await browser.close();
  browser = await chromium.launch(launchOpts());

  // F9 permanent gate: listen-format overflow probe, run as an extra
  // mini-pass rather than growing the 10-viewport matrix above. 360x640
  // matches the s-360 tier's dimensions exactly; 390x680 is one of the two
  // worst tiers the diagnosis measured and isn't itself a standard viewport.
  const listenTiers = [[360, 640], [390, 680]];
  const listenLines = [];
  for (const [w, h] of listenTiers) {
    const r = await runListenFormatProbe(browser, w, h);
    listenLines.push(r.line);
    if (r.failed) anyFail = true;
  }
  console.log("\n" + listenLines.join("\n"));
  console.log(
    `\n${listenLines.filter(l => l.startsWith("[PASS]")).length}/${listenTiers.length} listen-format probes passed`
  );

  const formatSpecs = [["reverse",3], ["tone",5], ["cloze",7], ["typed",9]];
  const formatTiers = [[320,568], [640,360]];
  const formatLines = [];
  for (const [format, streak] of formatSpecs) {
    for (const [w, h] of formatTiers) {
      const r = await runQuestionFormatProbe(browser, format, streak, w, h);
      formatLines.push(r.line);
      if (r.failed) anyFail = true;
    }
  }
  console.log("\n" + formatLines.join("\n"));
  console.log(
    `\n${formatLines.filter(l => l.startsWith("[PASS]")).length}/${formatLines.length} advanced-format probes passed`
  );

  await browser.close();
  browser = await chromium.launch(launchOpts());

  const streetProject = await runStreetProjectProbe(browser);
  console.log("\n" + streetProject.line);
  if(streetProject.failed) anyFail = true;

  const resultsTiers = [[360,640], [390,844], [640,360]];
  const resultsLines = [];
  for(const [w,h] of resultsTiers){
    const r = await runResultsProbe(browser, w, h);
    resultsLines.push(r.line);
    if(r.failed) anyFail = true;
  }
  console.log("\n" + resultsLines.join("\n"));
  console.log(
    `\n${resultsLines.filter(l => l.startsWith("[PASS]")).length}/${resultsTiers.length} results probes passed`
  );

  // F2 (2026-07-26 audit): true first-run Welcome screen, landscape only —
  // the two tiers the audit found the CTA below the fold on. Portrait was
  // already clean (v76 fix) and isn't re-checked here to keep this probe
  // focused on the regression class it exists to catch.
  const welcomeTiers = [[640, 360], [844, 390]];
  const welcomeLines = [];
  for (const [w, h] of welcomeTiers) {
    const r = await runWelcomeProbe(browser, w, h);
    welcomeLines.push(r.line);
    if (r.failed) anyFail = true;
  }
  console.log("\n" + welcomeLines.join("\n"));
  console.log(
    `\n${welcomeLines.filter(l => l.startsWith("[PASS]")).length}/${welcomeTiers.length} welcome onboarding probes passed`
  );

  const cardsResume = await runCardsResumeProbe(browser);
  console.log("\n" + cardsResume.line);
  if (cardsResume.failed) anyFail = true;

  const accessibility = await runAccessibilityProbe(browser);
  console.log(accessibility.line);
  if (accessibility.failed) anyFail = true;

  await browser.close();
  process.exit(anyFail ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --battle WxH: single-shot battle-screen probe at one custom viewport.
// ---------------------------------------------------------------------------
async function runBattleSingleShot(spec) {
  const m = /^(\d+)x(\d+)$/.exec(spec);
  if (!m) {
    console.error(`responsive-sweep: --battle expects WxH, e.g. --battle 390x844 (got "${spec}")`);
    process.exit(1);
  }
  const width = Number(m[1]);
  const height = Number(m[2]);

  await assertServerReachable();
  const browser = await chromium.launch(launchOpts());
  const { page, errs } = await preparePage(browser, width, height);

  await goToBattle(page);
  const battle = await page.evaluate(probeScreen, ["battle", TOL, MIN_TAP]);
  const battleInfo = await page.evaluate(probeBattle, TOL);

  const isLandscape = height <= 500;
  const isShortPortrait = height <= 620;
  const scrollAssertApplies = isLandscape || isShortPortrait;

  const failures = [];
  if (battle.overflowX) failures.push("battle overflow-x");
  if (battle.small.length) failures.push(`small-taps:[${battle.small}]`);
  if (battle.wide.length) failures.push(`wide:[${battle.wide}]`);
  if (battle.clippedBelow > 0) failures.push(`clipped-below=${battle.clippedBelow}`);
  if (!battleInfo.cvSize) failures.push("#cv missing");
  else if (battleInfo.cvSize.h < 160) failures.push(`#cv height=${battleInfo.cvSize.h}<160`);
  if (battleInfo.optBtnCount !== 4) failures.push(`#opts count=${battleInfo.optBtnCount}!=4`);
  else if (battleInfo.visibleOptBtnCount !== 4)
    failures.push(`#opts visible=${battleInfo.visibleOptBtnCount}/4`);
  if (!battleInfo.pauseOnScreen) failures.push("pause off-screen");
  if (scrollAssertApplies && battleInfo.scrollNeeded)
    failures.push(`scroll needed (${isLandscape ? "landscape" : "short-portrait"})`);
  if (errs.length) failures.push(`JSERR:${errs[0]}`);

  console.log(
    `[${failures.length ? "FAIL" : "PASS"}] battle ${width}x${height}: ` +
      `cv=${battleInfo.cvSize ? `${battleInfo.cvSize.w}x${battleInfo.cvSize.h}` : "none"}` +
      ` opts=${battleInfo.visibleOptBtnCount}/${battleInfo.optBtnCount}` +
      ` pause=${battleInfo.pauseOnScreen ? "on" : "OFF"}` +
      (failures.length ? ` | FAILURES: ${failures.join("; ")}` : "")
  );

  await page.close();
  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

async function runStreetProjectSingleShot() {
  await assertServerReachable();
  const browser = await chromium.launch(launchOpts());
  const result = await runStreetProjectProbe(browser);
  console.log(result.line);
  await browser.close();
  process.exit(result.failed ? 1 : 0);
}

// ---------------------------------------------------------------------------
const battleArgIdx = process.argv.indexOf("--battle");
if (battleArgIdx !== -1) {
  await runBattleSingleShot(process.argv[battleArgIdx + 1]);
} else if (process.argv.includes("--street-project")) {
  await runStreetProjectSingleShot();
} else {
  await runFullSweep();
}
