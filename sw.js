// Service worker lives at the app ROOT (not pwa/) so its scope covers index.html.
// A worker registered from pwa/ would be scoped to /pwa/ and could not serve the
// app shell offline, since static hosts (GitHub Pages) don't send
// Service-Worker-Allowed to widen scope. Paths below are root-relative.
const SHELL = "nbhsk-shell-v39";
const AUDIO = "nbhsk-audio-v1";
const PRECACHE = [
  "index.html", "dist/app.js", "data/words.js", "data/cloze.js", "audio/index.json",
  "pwa/manifest.webmanifest", "pwa/icons/icon-192.png", "pwa/icons/icon-512.png",
  // art assets — tolerant: missing files are silently skipped so a partial
  // asset drop never bricks an offline install
  "assets/bg-home.webp",
  "assets/bg-quest.png",
  "assets/bg-flashcards.webp",
  "assets/bg-battle.png",
  "assets/bg-progress.webp",
  "assets/bg-collection.webp",
  "assets/cat-walk.png",
  "assets/cat-happy.png",
  "assets/cat-study.png",
  "assets/maneki.png",
  "assets/coin.png",
  "assets/lantern.png",
  "assets/cloud.png",
  "assets/ui-icons.svg",
  "assets/cat-midnight-walk.png",
  "assets/cat-midnight-happy.png",
  "assets/cat-sakura-walk.png",
  "assets/cat-sakura-happy.png",
  "assets/cat-jade-walk.png",
  "assets/cat-jade-happy.png",
  "assets/cat-gold-walk.png",
  "assets/cat-gold-happy.png",
  "assets/cat-boss-walk.png",
  "assets/cat-boss-happy.png",
  "assets/cat-astronaut-walk.png",
  "assets/cat-astronaut-happy.png",
  "assets/cat-beach-walk.png",
  "assets/cat-beach-happy.png",
  "assets/cat-dragon-walk.png",
  "assets/cat-dragon-happy.png",
  "assets/cat-mooncake-walk.png",
  "assets/cat-mooncake-happy.png",
  "assets/cat-ninja-walk.png",
  "assets/cat-ninja-happy.png",
  "assets/cat-panda-walk.png",
  "assets/cat-panda-happy.png",
  "assets/raccoon-walk.png",
  "assets/raccoon-happy.png",
  "assets/cat-portrait.png",
  "assets/cat-guide.png",
  "assets/cat-celebrate.png",
  "assets/cat-thinking.png",
  "assets/ui-tab.svg",
  "assets/bg-market.png",
  "assets/bg-results.webp",
  "assets/bg-temple.png",
  "assets/bg-bamboo.png",
  "assets/bg-street.png",
  "assets/bg-dragon-gate.png",
  "assets/deco-red-lantern.png",
  "assets/deco-noodle-stall.png",
  "assets/deco-tea-sign.png",
  "assets/deco-foo-dog.png",
  "assets/deco-golden-arch.png",
  "assets/bg-harbor-night.png",
  "assets/bg-island-sunset.png",
  "assets/bg-lantern-festival.png",
  "assets/bg-snow-festival.png",
  "assets/ui-button-primary.svg",
  "assets/ui-button-secondary.svg",
  "assets/ui-button-neutral.svg",
  "assets/ui-card-paper.svg",
  "assets/ui-card-soft.svg",
  "assets/ui-tag.svg",
  "assets/ui-badge-mastery.svg",
  "assets/ui-progress-track.svg",
  "assets/ui-progress-fill.svg",
  "assets/ui-stamp-correct.svg",
  "assets/ui-divider.svg",
  "assets/fx-correct.svg",
  "assets/fx-wrong.svg",
  "assets/fx-critical.svg",
  "assets/fx-perfect.svg",
  "assets/fx-retry.svg",
  "assets/fx-mastery.svg",
  "assets/fx-level-up.svg",
  "assets/fx-daily-goal.svg",
  "assets/ui-button-neutral-disabled.svg",
  "assets/ui-button-danger.svg",
  "assets/ui-button-start.svg",
  "assets/ui-panel.svg",
  "assets/ui-word-plaque.svg",
  "assets/ui-icon-tile.svg",
  "assets/vfx-orb-green.svg",
  "assets/vfx-orb-red.svg",
  "assets/vfx-orb-blue.svg",
  "assets/vfx-orb-gold.svg",
  "assets/fonts/lc-hanzi.woff2",
  "assets/fonts/lc-latin.woff2",
  "assets/fonts/lc-thai.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith(".mp3")) {
    e.respondWith(caches.open(AUDIO).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // Navigations (address-bar/app launches) may arrive as the directory URL
  // ("…/repo/"), which never matches the "index.html" cache key — fall back to
  // the cached shell so an offline launch still boots.
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).catch(() => caches.match("index.html"))
      )
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
