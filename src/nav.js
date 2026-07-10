"use strict";
// Pure bottom-nav helpers (M2). No DOM here — main.js wires these to the
// actual <nav id="bottom-nav"> bar and to show(). Kept pure/tested so the
// tab list and screen->tab mapping can change without touching wiring code.

// The 4 bottom-nav tabs, left to right.
export const TABS = ["home", "street", "progress", "more"];

// Screens that ride "under" the More tab: reachable from More, not tabs
// themselves, but the nav stays visible (with More highlighted) while on them.
const MORE_SUBSCREENS = ["scores", "howto", "account"];

// Sub-screens that ride under the Progress tab (B2 sticker album).
const PROGRESS_SUBSCREENS = ["album"];

// Every screen where the bottom nav is shown at all: the 4 tabs, the More
// sub-screens, plus shop (reachable from home's icon row this milestone).
const NAV_VISIBLE = new Set([...TABS, ...MORE_SUBSCREENS, ...PROGRESS_SUBSCREENS, "shop"]);

export function navVisibleOn(screen) {
  return NAV_VISIBLE.has(screen);
}

// Which tab button should read "active" for a given screen. null when the
// nav isn't shown at all (battle/learn/scope/results).
export function activeTabFor(screen) {
  if (!navVisibleOn(screen)) return null;
  if (TABS.includes(screen)) return screen;
  if (MORE_SUBSCREENS.includes(screen)) return "more";
  if (PROGRESS_SUBSCREENS.includes(screen)) return "progress";
  if (screen === "shop") return "home";
  return null;
}
