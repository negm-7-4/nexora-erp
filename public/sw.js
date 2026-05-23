/* Nexora service worker — offline support via stale-while-revalidate. */
const CACHE = "nexora-cache-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  // Only handle same-origin GETs; let the browser handle Firebase/Google/etc.
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    try {
      const res = await fetch(req);
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    } catch {
      if (cached) return cached;
      if (req.mode === "navigate") {
        const root = await cache.match("/");
        if (root) return root;
      }
      return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
