// Bump this version whenever shipped assets or question data change.
const VERSION = "v2";
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
  "./src/sound-score.js",
  "./src/startup.js",
  "./src/style.css",
  "./data/questions.json",
];
// Large artwork/fonts must never block installation of the playable app.
const OPTIONAL_ASSETS = [
  "./data/grade-kanji.json",
  "./assets/emblem.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
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
const CACHEABLE = new Set([...ASSETS, ...OPTIONAL_ASSETS].map(path => new URL(path, SCOPE).href));

async function readCached(request) {
  try { return await (await caches.open(CACHE)).match(request); }
  catch { return undefined; } // A storage failure must still allow online play.
}
async function storeResponse(request, response) {
  const url = typeof request === "string" ? request : request.url;
  if (!CACHEABLE.has(url) || !response.ok || response.status === 206) return;
  try { await (await caches.open(CACHE)).put(request, response); }
  catch { /* Quota/private-mode failures cannot discard a successful response. */ }
}

let warming;
function warmOptionalAssets() {
  if (warming) return warming;
  warming = (async () => {
    const pending = [...OPTIONAL_ASSETS];
    // Keep downloads bounded and let the foreground question request go first.
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (pending.length) {
        const url = new URL(pending.shift(), SCOPE).href;
        if (await readCached(url)) continue;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try { await storeResponse(url, await fetch(url, { signal: controller.signal })); }
        catch { /* Retry missing optional assets on the next launch/reconnection. */ }
        finally { clearTimeout(timeout); }
      }
    }));
  })().finally(() => { warming = undefined; });
  return warming;
}
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
      .catch(() => {})
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_OPTIONAL") event.waitUntil(warmOptionalAssets());
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(SCOPE.pathname)
  )
    return;
  let responseForCache;
  const response = (async () => {
    const cached = await readCached(event.request);
    // Explicit retries can replace an invalid cached response.
    if (cached && event.request.cache !== "reload") return cached;
    try {
      const network = await fetch(event.request);
      if (!network.ok && cached) return cached;
      // Clone before respondWith can hand the body to the browser.
      if (network.ok && CACHEABLE.has(event.request.url)) responseForCache = network.clone();
      return network;
    } catch (error) {
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const shell = await readCached(new URL("./index.html", SCOPE).href);
        if (shell) return shell;
      }
      throw error;
    }
  })();
  event.respondWith(response);
  // Extend lifetime synchronously; the response itself never waits for a write.
  event.waitUntil(response.then(() => responseForCache ? storeResponse(event.request, responseForCache) : undefined).catch(() => {}));
});
