#!/usr/bin/env node
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.FIGMA_CAPTURE_BASE_URL || "http://localhost:8000";
const OUT_DIR = join(process.cwd(), ".figma-capture-2026-07-26");
const GALLERY_FILE = join(process.cwd(), "figma-journey-capture.html");
const VIEWPORT = { width: 390, height: 844 };

function launchOptions(){
  const explicit = process.env.PW_CHROMIUM;
  if(explicit) return { executablePath:explicit, headless:true };
  const cached = join(homedir(), ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
  if(existsSync(cached)) return { executablePath:cached, headless:true };
  return { channel:"msedge", headless:true };
}

function today(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const screens = [];
function screen(id, name, flow, prepare){
  screens.push({ id, name, flow, prepare });
}

async function boot(browser, { firstRun=false, catJourney=false } = {}){
  const page = await browser.newPage({ viewport:VIEWPORT, deviceScaleFactor:1 });
  await page.addInitScript(({ firstRun, catJourney, date }) => {
    if(sessionStorage.getItem("nbhsk.figmaCaptureSeeded") === "1") return;
    localStorage.clear();
    let state = 9;
    Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
    localStorage.setItem("nbhsk.locale", JSON.stringify("en"));
    if(!firstRun) localStorage.setItem("nbhsk.introDone", "true");
    localStorage.setItem("nbhsk.wallet", "860");
    localStorage.setItem("nbhsk.xp", "4200");
    localStorage.setItem("nbhsk.features.catJourney", JSON.stringify(catJourney));
    localStorage.setItem("nbhsk.daily", JSON.stringify({
      last:date, streak:4, today:{ date, resolved:20 }, restWeek:"", restDay:"",
    }));
    localStorage.setItem("nbhsk.scope", JSON.stringify({
      levels:[3], core:false, newOnly:false, topN:100, lang:"both", sessionLen:5,
    }));
    localStorage.setItem("nbhsk.profile", JSON.stringify({ displayName:"Mali" }));
    localStorage.setItem("nbhsk.shop", JSON.stringify({
      owned:["classic","courtyard"], skin:"classic", backdrop:"courtyard",
    }));
    sessionStorage.setItem("nbhsk.figmaCaptureSeeded", "1");
  }, { firstRun, catJourney, date:today() });
  await page.goto(`${BASE_URL}/index.html`, { waitUntil:"load" });
  await page.waitForTimeout(800);
  return page;
}

async function click(page, selector, wait=180){
  await page.locator(selector).first().click();
  await page.waitForTimeout(wait);
}

async function nav(page, destination){
  await click(page, `[data-go="${destination}"]`, 260);
}

async function goScope(page, view){
  await click(page, "#home-scope-chip", 180);
  await click(page, `#scope-view-tabs [data-view="${view}"]`, 180);
}

async function goLearn(page, reveal=false){
  await goScope(page, "picker");
  await click(page, "#go-learn", 220);
  if(reveal) await click(page, "#fc-card", 120);
}

async function goProfile(page, view="overview"){
  await click(page, '#bottom-nav [data-go="progress"]', 260);
  await click(page, `#profile-tabs [data-profile-view="${view}"]`, 120);
}

async function goMore(page){
  await page.locator('#bottom-nav [data-go="more"]').click();
  await page.waitForTimeout(180);
}

async function goBattle(page){
  await page.locator("#home-start").scrollIntoViewIfNeeded();
  await click(page, "#home-start", 900);
  if(await page.locator("#format-intro").evaluate(el => getComputedStyle(el).display !== "none").catch(()=>false)){
    await click(page, "#fi-ok", 160);
  }
}

async function catReady(page){
  await page.evaluate(() => localStorage.removeItem("nbhsk.catJourney"));
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(600);
  await click(page, '[data-tab="street"]', 220);
}

async function catExploring(page){
  await catReady(page);
  await click(page, "#cat-primary", 180);
}

async function catReturned(page){
  await catExploring(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("nbhsk.catJourney"));
    state.activeJourney.readyAt = Date.now() - 1;
    localStorage.setItem("nbhsk.catJourney", JSON.stringify(state));
  });
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(500);
  await click(page, '[data-tab="street"]', 180);
}

async function catMemory(page){
  await catReturned(page);
  await click(page, "#cat-primary", 180);
}

async function solveToResults(page){
  await page.evaluate(() => {
    localStorage.setItem("nbhsk.scope", JSON.stringify({
      levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:5,
    }));
  });
  await page.reload({ waitUntil:"load" });
  await page.waitForTimeout(500);
  await goBattle(page);
  await page.waitForFunction(() => [...document.querySelectorAll("#opts button")]
    .some(button => !button.disabled && !button._correct && !button.classList.contains("replay")));
  await page.evaluate(() => [...document.querySelectorAll("#opts button")]
    .find(button => !button.disabled && !button._correct && !button.classList.contains("replay"))?.click());
  await page.waitForTimeout(100);
  if(await page.locator("#quest-continue").isVisible()) await click(page, "#quest-continue", 120);
  else await page.evaluate(() => document.querySelector("#cv")?.click());

  for(let guard=0; guard<16; guard++){
    if(await page.locator("#s-results").evaluate(el => el.classList.contains("on"))) break;
    await page.waitForFunction(() =>
      document.querySelector("#s-results")?.classList.contains("on") ||
      [...document.querySelectorAll("#opts button")]
        .some(button => !button.disabled && button._correct && !button.classList.contains("replay"))
    );
    if(await page.locator("#s-results").evaluate(el => el.classList.contains("on"))) break;
    await page.evaluate(() => [...document.querySelectorAll("#opts button")]
      .find(button => !button.disabled && button._correct && !button.classList.contains("replay"))?.click());
    await page.waitForTimeout(560);
    if(await page.locator("#quest-continue").isVisible()) await click(page, "#quest-continue", 100);
    else await page.evaluate(() => document.querySelector("#cv")?.click());
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => document.querySelector("#s-results")?.classList.contains("on"));
  await page.waitForTimeout(250);
}

screen("LC-01", "Welcome · Choose HSK Level", "Onboarding", async page => {});
screen("LC-02", "Home · Daily Plan", "Core Loop", async page => {});
screen("LC-03", "Scope · Recommended Journey", "Core Loop", page => goScope(page, "journey"));
screen("LC-04", "Scope · Word Picker", "Core Loop", page => goScope(page, "picker"));
screen("LC-05", "Flashcards · Recall", "Learning", page => goLearn(page, false));
screen("LC-06", "Flashcards · Answer", "Learning", page => goLearn(page, true));
screen("LC-07", "Word Detail · Explanation", "Learning", async page => {
  await goLearn(page, true);
  await click(page, "#fc-info", 150);
});
screen("LC-08", "Tone Trainer · Active", "Learning", page => click(page, "#home-tones-btn", 300));
screen("LC-09", "Cat Journey · Ready", "Retention", page => catReady(page));
screen("LC-10", "Cat Journey · Exploring", "Retention", page => catExploring(page));
screen("LC-11", "Cat Journey · Returned", "Retention", page => catReturned(page));
screen("LC-12", "Cat Journey · Memory Earned", "Retention", page => catMemory(page));
screen("LC-13", "Cat Journey · Memories Drawer", "Retention", async page => {
  await catMemory(page);
  await click(page, "#cat-memories-toggle", 140);
});
screen("LC-14", "Cat Journey · Backgrounds Drawer", "Retention", async page => {
  await catMemory(page);
  await click(page, "#cat-backgrounds-toggle", 140);
});
screen("LC-15", "Profile · Overview", "Progress", page => goProfile(page, "overview"));
screen("LC-16", "Profile · Learning Progress", "Progress", page => goProfile(page, "progress"));
screen("LC-17", "Profile · Collection", "Progress", page => goProfile(page, "collection"));
screen("LC-18", "Profile · Edit Name", "Progress", async page => {
  await goProfile(page, "overview");
  await click(page, "#profile-edit-name", 100);
});
screen("LC-19", "Friend Comparison · Share", "Social", async page => {
  await goProfile(page, "collection");
  await click(page, "#go-friend", 150);
});
screen("LC-20", "Sticker Album · Up Next", "Progress", async page => {
  await goProfile(page, "collection");
  await nav(page, "album");
});
screen("LC-21", "Sticker Album · Earned", "Progress", async page => {
  await goProfile(page, "collection");
  await nav(page, "album");
  await click(page, '#album-filters [data-album-filter="earned"]', 120);
});
screen("LC-22", "Shop · Featured", "Collection", page => nav(page, "shop"));
screen("LC-23", "Shop · Cat Styles", "Collection", async page => {
  await nav(page, "shop");
  await click(page, '[data-shop-category-tab="skins"]', 120);
});
screen("LC-24", "More · Settings", "Utility", page => goMore(page));
screen("LC-25", "Best Sessions · Empty", "Utility", async page => {
  await goMore(page);
  await click(page, '#s-more [data-go="scores"]', 150);
});
screen("LC-26", "How to Play · Core Steps", "Support", async page => {
  await goMore(page);
  await click(page, '#s-more [data-go="howto"]', 150);
});
screen("LC-27", "How to Play · Advanced Rules", "Support", async page => {
  await goMore(page);
  await click(page, '#s-more [data-go="howto"]', 150);
  await click(page, "#s-howto details:first-of-type summary", 120);
});
screen("LC-28", "Account · Local Save", "Account", async page => {
  await goMore(page);
  await click(page, '#s-more [data-go="account"]', 220);
});
screen("LC-29", "Account · Connect Email", "Account", async page => {
  await goMore(page);
  await click(page, '#s-more [data-go="account"]', 1200);
  await click(page, "#account-panel button", 200);
  await page.waitForSelector("#account-panel input[type=email]", { state:"visible" });
});
screen("LC-30", "Word Quest · Active", "Core Loop", page => goBattle(page));
screen("LC-31", "Word Quest · Correction", "Core Loop", async page => {
  await goBattle(page);
  await page.evaluate(() => [...document.querySelectorAll("#opts button")]
    .find(button => !button.disabled && !button._correct && !button.classList.contains("replay"))?.click());
  await page.waitForTimeout(160);
});
screen("LC-32", "Word Quest · Paused", "Core Loop", async page => {
  await goBattle(page);
  await click(page, "#hud-pause", 120);
});
screen("LC-33", "Word Quest · Quit Confirmation", "Core Loop", async page => {
  await goBattle(page);
  await click(page, "#hud-pause", 100);
  await click(page, "#pause-quit", 100);
});
screen("LC-34", "Word Quest · Results", "Core Loop", page => solveToResults(page));

mkdirSync(OUT_DIR, { recursive:true });
const FORCE_IDS = new Set(["LC-07","LC-09","LC-10","LC-11","LC-12","LC-13","LC-14","LC-29"]);
const browser = await chromium.launch(launchOptions());
try{
  for(const item of screens){
    const screenshotPath = join(OUT_DIR, `${item.id}.png`);
    if(existsSync(screenshotPath) && !FORCE_IDS.has(item.id)){
      process.stdout.write(`${item.id} cached\n`);
      continue;
    }
    const page = await boot(browser, {
      firstRun:item.id === "LC-01",
      catJourney:item.flow === "Retention",
    });
    try{
      await item.prepare(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(180);
      await page.screenshot({
        path:screenshotPath,
        animations:"disabled",
        caret:"hide",
      });
      process.stdout.write(`${item.id} ${item.name}\n`);
    }finally{
      await page.close();
    }
  }
}finally{
  await browser.close();
}

const flowOrder = ["Onboarding","Core Loop","Learning","Retention","Progress","Social","Collection","Utility","Support","Account"];
const groups = flowOrder.map(flow => ({
  flow,
  items:screens.filter(item => item.flow === flow),
})).filter(group => group.items.length);
const cards = groups.map(group => `
  <section class="flow" aria-label="${group.flow}">
    <header class="flow-head">
      <p>USER JOURNEY</p>
      <h2>${group.flow}</h2>
      <span>${group.items.length} states</span>
    </header>
    <div class="screen-grid">
      ${group.items.map(item => `
        <article class="screen-card" aria-label="${item.id} — ${item.name}">
          <div class="screen-name">
            <b>${item.id}</b>
            <span>${item.name}</span>
          </div>
          <img src=".figma-capture-2026-07-26/${item.id}.png" alt="${item.id} — ${item.name}" width="390" height="844">
        </article>`).join("")}
    </div>
  </section>`).join("");

writeFileSync(GALLERY_FILE, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lucky Cat HSK — User Journey Screens — 2026-07-26</title>
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%;background:#f3efe6;color:#21302b;font-family:Inter,Arial,sans-serif}
    body{padding:72px}
    .board-head{display:flex;align-items:flex-end;justify-content:space-between;margin:0 0 56px;padding:32px 36px;border-radius:24px;background:#173f37;color:#fff}
    .board-head p,.flow-head p{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.15em;color:#f0bb53}
    .board-head h1{margin:0;font-size:40px;line-height:1.05}
    .board-head span{font-size:16px;color:#d8eee8}
    .flow{margin:0 0 72px}
    .flow-head{display:flex;align-items:end;gap:18px;margin:0 0 20px;padding-bottom:14px;border-bottom:2px solid #d4cbb9}
    .flow-head p{margin:0}
    .flow-head h2{margin:0;font-size:25px}
    .flow-head span{margin-left:auto;color:#6c756f}
    .screen-grid{display:grid;grid-template-columns:repeat(4,390px);gap:44px 28px;align-items:start}
    .screen-card{width:390px;border-radius:20px;background:#fff;box-shadow:0 8px 28px rgba(35,49,43,.13);overflow:hidden}
    .screen-name{height:76px;padding:14px 16px 13px;border-bottom:1px solid #e7e0d4;background:#fff}
    .screen-name b{display:block;margin-bottom:5px;color:#177466;font-size:13px;letter-spacing:.06em}
    .screen-name span{display:block;font-size:16px;font-weight:750;line-height:1.2}
    .screen-card img{display:block;width:390px;height:844px;object-fit:cover;object-position:top;background:#fff}
  </style>
</head>
<body>
  <header class="board-head">
    <div><p>LUCKY CAT HSK</p><h1>User Journey Screens</h1></div>
    <span>Latest app capture · 2026-07-26 · 390 × 844</span>
  </header>
  ${cards}
</body>
</html>`);
console.log(`Gallery: ${GALLERY_FILE}`);
