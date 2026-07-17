// Offline core + lazy cosmetic cache. The install is atomic for the files that
// must boot and play; optional costumes, seasonal scenes, shop tiles, and
// street decorations enter RUNTIME only after the player actually requests
// them. This keeps first install substantially smaller without losing offline
// access to previously viewed cosmetics.
const SHELL = "nbhsk-shell-v79";
const RUNTIME = "nbhsk-runtime-v76";
const AUDIO = "nbhsk-audio-v1";

const PRECACHE = [
  "index.html", "dist/app.js", "data/words.js", "data/cloze.js", "audio/index.json",
  "pwa/manifest.webmanifest", "pwa/icons/icon-192.png", "pwa/icons/icon-512.png",

  // CSS screen art and first-run/home characters.
  "assets/more-cat-icon.png", "assets/bg-home.webp", "assets/bg-quest.png",
  "assets/bg-flashcards.webp", "assets/bg-battle.png", "assets/bg-progress.webp",
  "assets/bg-collection.webp", "assets/bg-results.webp", "assets/cloud.png",
  "assets/cat-study.png", "assets/cat-portrait.png", "assets/cat-guide.png",
  "assets/cat-celebrate.png", "assets/cat-thinking.png",

  // Default Word Quest + Street art. Alternative skins/backdrops are runtime.
  "assets/cat-walk.png", "assets/cat-happy.png", "assets/raccoon-walk.png",
  "assets/raccoon-happy.png", "assets/cat-boss-walk.png", "assets/cat-boss-happy.png",
  "assets/bg-market.png", "assets/bg-temple.png", "assets/bg-bamboo.png",
  "assets/bg-street.png", "assets/maneki.png", "assets/coin.png", "assets/lantern.png",

  // Small UI surfaces/effects used throughout the core loop.
  "assets/ui-icons.svg", "assets/ui-tab.svg", "assets/ui-button-primary.svg",
  "assets/ui-button-secondary.svg", "assets/ui-button-neutral.svg",
  "assets/ui-button-neutral-disabled.svg", "assets/ui-button-danger.svg",
  "assets/ui-button-start.svg", "assets/ui-card-paper.svg", "assets/ui-card-soft.svg",
  "assets/ui-tag.svg", "assets/ui-panel.svg", "assets/ui-word-plaque.svg",
  "assets/ui-icon-tile.svg", "assets/ui-progress-track.svg", "assets/ui-progress-fill.svg",
  "assets/ui-badge-mastery.svg", "assets/ui-stamp-correct.svg", "assets/ui-divider.svg",
  "assets/fx-correct.svg", "assets/fx-wrong.svg", "assets/fx-critical.svg",
  "assets/fx-perfect.svg", "assets/fx-retry.svg", "assets/fx-mastery.svg",
  "assets/fx-level-up.svg", "assets/fx-daily-goal.svg", "assets/vfx-orb-green.svg",
  "assets/vfx-orb-red.svg", "assets/vfx-orb-blue.svg", "assets/vfx-orb-gold.svg",

  "assets/fonts/lc-hanzi.woff2", "assets/fonts/lc-latin.woff2", "assets/fonts/lc-thai.woff2"
];

self.addEventListener("install", event => {
  // Core failures must fail the install instead of producing a silently
  // incomplete offline shell. Optional assets are never part of this array.
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => ![SHELL, RUNTIME, AUDIO].includes(key))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheAfterFetch(cacheName, request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(caches.open(AUDIO).then(async cache => {
      const hit = await cache.match(request);
      return hit || cacheAfterFetch(AUDIO, request);
    }));
    return;
  }

  // Navigations are network-first so an online launch sees the latest HTML;
  // the atomic shell remains the offline fallback for either /repo/ or
  // /repo/index.html entry points.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(request)) || caches.match("index.html"))
    );
    return;
  }

  // Cache-first for same-origin shell/runtime resources. Optional art becomes
  // offline-capable after its first real use instead of during installation.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then(hit => hit || cacheAfterFetch(RUNTIME, request)));
  }
});
