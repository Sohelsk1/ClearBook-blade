/* Clearbook does not cache pages or account data. Old caches are dropped on activate. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/")) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode !== "navigate" || url.pathname.startsWith("/api/")) return;
  event.respondWith((async () => {
    try {
      const preload = await event.preloadResponse;
      if (preload) return preload;
      return await fetch(request);
    } catch {
      return new Response(
        '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#09090B"><title>Clearbook is offline</title><main style="min-height:90vh;display:grid;place-content:center;padding:24px;background:#09090B;color:#F4F4F5;font:16px system-ui"><h1>You are offline</h1><p>Connect to the internet to access your Clearbook account and transactions.</p><button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:8px;background:#2563EB;color:white">Try again</button></main></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
  })());
});
