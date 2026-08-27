const CACHE_PREFIX = "modern-elearning";
const STATIC_CACHE = `${CACHE_PREFIX}-static-v1`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-v1`;

const PRECACHE_URLS = ["/", "/login", "/courses", "/offline"];

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Offline — Modern E-Learning Portal</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #262626; }
  .card { max-width: 420px; padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
  h1 { margin: 0 0 12px; font-size: 22px; }
  p { margin: 0 0 24px; line-height: 1.5; color: #595959; }
  a { display: inline-block; padding: 10px 20px; background: #1677ff; color: #fff; text-decoration: none; border-radius: 6px; }
</style>
</head>
<body>
  <div class="card">
    <h1>You are offline</h1>
    <p>Some features need a network connection. Cached pages and course content are still available, and your course content will sync when you reconnect.</p>
    <a href="/dashboard">Go to Dashboard</a>
  </div>
</body>
</html>`;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

async function putCache(cacheName, request, response) {
  if (response.type === "error" || response.status === 206) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await putCache(cacheName, request, networkResponse);
    }
    return networkResponse;
  } catch {
    return cached;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) putCache(cacheName, request, res);
      return res;
    })
    .catch(() => cached);
  return cached ?? (await networkPromise);
}

async function offlineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match("/offline");
  return (
    cached ??
    new Response(FALLBACK_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                ![STATIC_CACHE, IMAGE_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (!isSameOrigin(url)) {
    if (request.destination === "image") {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    }
    return;
  }

  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  if (url.pathname.startsWith("/icons/") || request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? offlineFallback()),
      ),
    );
    return;
  }
});
