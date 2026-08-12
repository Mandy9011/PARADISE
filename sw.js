// 简单的 Service Worker：缓存应用外壳，支持离线 / 添加到主屏幕后全屏使用
const CACHE = 'homework-garden-v44';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './passwords.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './water_can.png',
  './雪花.webp',
  './蓝孔雀.webp'
];
// 关键外壳资源：必须全部缓存成功，否则安装失败并保留上一版 SW，
// 避免「外壳没进缓存却被强制接管」导致整页白屏（之前 v43 的回归点）
const CRITICAL = ['./', './index.html', './styles.css', './app.js', './passwords.js', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CRITICAL.map((a) => c.add(a))))   // 关键资源任一缺失 -> 安装失败（保留旧版）
      .then(() => Promise.all(
        ASSETS.filter((a) => !CRITICAL.includes(a)).map((a) => c.add(a).catch(() => {}))  // 图标/图片缺失忽略
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 用户上传的生长状态图放在 images/ 下，采用「网络优先」：
  // 保证家长新上传/替换的图片能立刻显示，不会被旧缓存挡住。
  if (url.pathname.indexOf('/images/') !== -1) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 应用外壳：缓存优先，离线可用；失败时回退到网络；
  // 关键：网络也失败时，导航请求绝不能落到「无响应」（否则整页白屏）——回退到缓存的 index.html 或一个最小兜底页。
  const isNav = e.request.mode === 'navigate';
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
          return res;
        })
        .catch(() => {
          if (isNav) {
            return caches.match('./index.html').then(
              (h) => h || new Response(
                '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
                '<title>花宠乐园</title><div style="padding:24px;font-family:sans-serif;color:#555">页面正在恢复，请检查网络连接后刷新。</div>',
                { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
            );
          }
          // 子资源（图片/脚本）兜底：返回空 200，不阻断主页面加载
          return caches.match(e.request).then((h) => h || new Response('', { status: 200 }));
        });
    })
  );
});
