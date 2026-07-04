// Service worker lives at the app ROOT (not pwa/) so its scope covers index.html.
// A worker registered from pwa/ would be scoped to /pwa/ and could not serve the
// app shell offline, since static hosts (GitHub Pages) don't send
// Service-Worker-Allowed to widen scope. Paths below are root-relative.
const SHELL = "nbhsk-shell-v8";
const AUDIO = "nbhsk-audio-v1";
const PRECACHE = [
  "index.html", "dist/app.js", "data/words.js", "audio/index.json",
  "pwa/manifest.webmanifest", "pwa/icons/icon-192.png", "pwa/icons/icon-512.png",
  // art assets — tolerant: missing files are silently skipped so a partial
  // asset drop never bricks an offline install
  "assets/bg-home.png",
  "assets/bg-battle.png",
  "assets/cat-walk.png",
  "assets/cat-happy.png",
  "assets/maneki.png",
  "assets/coin.png",
  "assets/lantern.png",
  "assets/cloud.png",
  "assets/btn-learn.png",
  "assets/btn-scores.png",
  "assets/btn-progress.png",
  "assets/btn-howto.png",
  "assets/btn-sound.png",
  "assets/fonts/title.woff2"
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
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
