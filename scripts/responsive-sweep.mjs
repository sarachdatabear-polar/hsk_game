#!/usr/bin/env node
// Permanent viewport regression harness — drives home/shop/battle at the
// standard device matrix and reports overflow / clipped controls / tap-target
// / scroll regressions. Promoted from the throwaway probes used in the
// responsive-all-devices round (.superpowers/sdd/responsive-sweep.mjs +
// resp-battle-probe.mjs).
//
// Usage:
//   npm run serve                       # in another shell — python http.server on :8000
//   node scripts/responsive-sweep.mjs           # full 10-viewport x 3-screen sweep
//   node scripts/responsive-sweep.mjs --battle 390x844   # single-shot battle probe
//
// Requires: npm i --no-save playwright-core, and Microsoft Edge installed
// (uses channel:"msedge" so it doesn't need a separate browser download).
import { chromium } from "playwright-core";
import http from "node:http";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { layout } from "../src/layout.js";

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

const BASE_URL = "http://localhost:8000";
const TOL = 1; // px tolerance for viewport-edge comparisons

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
}

// ---------------------------------------------------------------------------
// Per-screen probe: overflow-x, elements past left/right edge, tap targets
// under 36px, and (battle only) ancestor-aware clipped-below count.
// ---------------------------------------------------------------------------
function probeScreen([screenName, tol]) {
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
      return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36);
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

// street-quests-popup: 2026-07-11 audit F2/F3 reverted the Daily Quests merge
// — the street screen now shows scene + caption + a compact "Quests" button,
// and the daily-quest + monthly rows live behind a popup overlay
// (#quest-overlay) that button opens. This snapshots the pre-click state
// (button present, popup not already open) — the click/open/close sequence
// itself is driven from runFullSweep since it needs real click events, not
// just a DOM snapshot.
function probeStreetScene() {
  const screen = document.querySelector("#s-street");
  const cv = document.querySelector("#street-cv");
  const r = cv?.getBoundingClientRect();
  return {
    active: screen?.classList.contains("on") ?? false,
    cvHeight: r ? Math.round(r.height) : 0,
    btnPresent: !!document.querySelector("#street-quests-btn"),
    overlayOpenBeforeClick: document.querySelector("#quest-overlay")?.classList.contains("on") ?? false,
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

// ---------------------------------------------------------------------------
// Navigation helpers shared by the full sweep and the --battle single-shot.
// ---------------------------------------------------------------------------
async function preparePage(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(installPageHelpers);
  await page.addInitScript(() => {
    localStorage.setItem("nbhsk.introDone", "true");
    localStorage.setItem("nbhsk.locale", '"en"');
    localStorage.setItem("nbhsk.wallet", "5000");
  });
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

// ---------------------------------------------------------------------------
// Server reachability check — the harness never starts the server itself
// (the user runs `npm run serve` in another shell); fail fast with a clear
// message rather than letting every page.goto() time out one by one.
// ---------------------------------------------------------------------------
async function assertServerReachable() {
  // Deliberately uses node:http rather than global fetch()/undici: Node 24's
  // undici client crashes the whole process with an uncaught
  // `assert(!this.paused)` when talking to Python's http.server (HTTP/1.0,
  // connection: close). node:http doesn't hit that path.
  const reachable = await new Promise(resolve => {
    const req = http.get(`${BASE_URL}/index.html`, res => {
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
// Full sweep: home + shop + battle at all 10 viewports.
// ---------------------------------------------------------------------------
async function runFullSweep() {
  await assertServerReachable();
  const browser = await chromium.launch(launchOpts());
  const lines = [];
  let anyFail = false;

  for (const [name, width, height] of VIEWPORTS) {
    const { page, errs } = await preparePage(browser, width, height);

    const home = await page.evaluate(probeScreen, ["home", TOL]);
    const startVisible = await page.evaluate(probeStartInFold, TOL);
    const overscrollY = await page.evaluate(
      () => getComputedStyle(document.documentElement).overscrollBehaviorY
    );

    // street-quests-popup: street tab shows scene + button; clicking the
    // button must open the popup with the quest rows, and the X must close
    // it again — with the bottom nav still reachable throughout (mirrors the
    // shop nav-reachable probe below).
    await goToStreet(page);
    const streetScene = await page.evaluate(probeStreetScene);
    await page.evaluate(() => document.querySelector("#street-quests-btn")?.click());
    await page.waitForTimeout(150);
    const questPopup = await page.evaluate(probeQuestPopup);
    const streetNav = await page.evaluate(probeNavReachable, TOL);
    await page.evaluate(() => document.querySelector("#quest-popup-close")?.click());
    await page.waitForTimeout(150);
    const questPopupClosed = await page.evaluate(
      () => !(document.querySelector("#quest-overlay")?.classList.contains("on") ?? false)
    );
    await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await goToShop(page);
    const shop = await page.evaluate(probeScreen, ["shop", TOL]);

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

    await goToAccount(page);
    const account = await page.evaluate(probeScreen, ["account", TOL]);
    await page.evaluate(() => document.querySelector('[data-go="home"]')?.click());
    await page.waitForTimeout(100);

    await goToBattle(page);
    const battle = await page.evaluate(probeScreen, ["battle", TOL]);
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
    if (battle.overflowX) failures.push("battle overflow-x");
    if (account.overflowX) failures.push("account overflow-x");
    if (startVisible !== "in-fold") failures.push(`start=${startVisible}`);
    if (home.small.length) failures.push(`home small-taps:[${home.small}]`);
    if (shop.small.length) failures.push(`shop small-taps:[${shop.small}]`);
    if (battle.small.length) failures.push(`battle small-taps:[${battle.small}]`);
    if (account.small.length) failures.push(`account small-taps:[${account.small}]`);
    if (home.wide.length) failures.push(`home wide:[${home.wide}]`);
    if (shop.wide.length) failures.push(`shop wide:[${shop.wide}]`);
    if (battle.wide.length) failures.push(`battle wide:[${battle.wide}]`);
    if (account.wide.length) failures.push(`account wide:[${account.wide}]`);
    if (battle.clippedBelow > 0) failures.push(`battle clipped-below=${battle.clippedBelow}`);
    if (overscrollY !== "none") failures.push(`overscroll-behavior-y=${overscrollY}`);
    if (!streetScene.active) failures.push("street: #s-street not active");
    // Sanity floor, not a "big enough" assertion — the smallest measured tier
    // (land-640, 640x360) sits at 187px under the new min(52vh,400px) cap;
    // this just catches an actual regression (e.g. cv collapsing to 0).
    if (streetScene.cvHeight < 150) failures.push(`street: cv height=${streetScene.cvHeight}<150`);
    if (!streetScene.btnPresent) failures.push("street-quests: #street-quests-btn missing");
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
    `\n${lines.filter(l => l.startsWith("[PASS]")).length}/${VIEWPORTS.length} viewports passed`
  );

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
  const battle = await page.evaluate(probeScreen, ["battle", TOL]);
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

// ---------------------------------------------------------------------------
const battleArgIdx = process.argv.indexOf("--battle");
if (battleArgIdx !== -1) {
  await runBattleSingleShot(process.argv[battleArgIdx + 1]);
} else {
  await runFullSweep();
}
