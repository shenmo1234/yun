// Mochi 单文件版精简 Service Worker（2026-10-03）
// 策略：网络优先 + 离线回退。在线打开时自动拿最新 index.html 更新缓存，
// 断网时直接返回缓存的 index.html（全部逻辑已内联在单文件里，离线可用）。
const CACHE = 'mochi-single-v8.66-20261003';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(['./index.html']).catch(function () {});
    }).then(function () { self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = req.url;
  if (!url.indexOf(self.location.origin) === 0) return;
  var isPage = req.mode === 'navigate' ||
    url === self.location.origin + '/' ||
    /\/index\.html$/.test(url);
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(url, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(url).then(function (m) {
        if (m) return m;
        if (isPage) return caches.match('./index.html');
        return new Response('', { status: 404, statusText: 'offline' });
      });
    })
  );
});
