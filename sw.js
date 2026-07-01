/* Santro AI service worker — deliberately conservative.
   - Static assets (icons, brand images, css/js): cache-first with background refresh.
   - HTML pages and ALL JSON market data: network-first, short-lived fallback only
     when offline — market data must never look fresher than it is.
   - Never touches api.santroai.tech (auth/preferences/watchlist stay live-only).
   - Bump VERSION to invalidate everything. */
var VERSION = "santro-sw-v1";
var STATIC_RE = /\/(assets\/|site\.css|site\.js|ticker-about\.js|etf-data\.js|accounts\/accounts\.css)/;

self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;          // never intercept the API or CDNs

  if (STATIC_RE.test(url.pathname)) {
    // cache-first + background refresh for immutable-ish static assets
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }

  // pages + JSON: network-first; cached copy ONLY as an offline fallback
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && (req.mode === "navigate" || url.pathname.endsWith(".json"))) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      if (hit) return hit;
      if (req.mode === "navigate") {
        return new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
          "<body style='background:#0a0e13;color:#9aa6b2;font:15px system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center'>" +
          "<div><b style='color:#e6edf3'>Santro AI is offline.</b><br>No cached market data is shown as live.<br>Reconnect and reload.</div></body>",
          { headers: { "Content-Type": "text/html" } });
      }
      return Response.error();
    });
  }));
});
