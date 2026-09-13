// Bump this version whenever shipped assets or question data change.
const VERSION = "v1";
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `kanji-dragon-trail-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE = CACHE_PREFIX + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/art.js",
  "./src/dragons.js",
  "./src/engine.js",
  "./src/game.js",
  "./src/play-screens.js",
  "./src/screens.js",
  "./src/sound.js",
  "./src/style.css",
  "./data/grade-kanji.json",
  "./data/questions.json",
  "./assets/emblem.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/KleeOne-SemiBold.ttf",
  "./assets/dragons/phantom.png",
  "./assets/dragons/normal/01.png",
  "./assets/dragons/normal/02.png",
  "./assets/dragons/normal/03.png",
  "./assets/dragons/normal/04.png",
  "./assets/dragons/normal/05.png",
  "./assets/dragons/normal/06.png",
  "./assets/dragons/normal/07.png",
  "./assets/dragons/normal/08.png",
  "./assets/dragons/normal/09.png",
  "./assets/dragons/normal/10.png",
  "./assets/dragons/normal/11.png",
  "./assets/dragons/normal/12.png",
  "./assets/dragons/normal/13.png",
  "./assets/dragons/normal/14.png",
  "./assets/dragons/normal/15.png",
  "./assets/dragons/normal/16.png",
  "./assets/dragons/boss/01.png",
  "./assets/dragons/boss/02.png",
  "./assets/dragons/boss/03.png",
  "./assets/dragons/boss/04.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // Let an active journey finish; activate the update on the next app launch.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(SCOPE.pathname)
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch (error) {
        if (event.request.mode === "navigate")
          return cache.match("./index.html");
        throw error;
      }
    }),
  );
});
