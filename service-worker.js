/*
 * 麻雀成績管理アプリ Service Worker
 * 第7章15〜16節：初回アクセス後はオフラインでも完全に利用できるようにする。
 * アプリはCSS/JSをすべてindex.html内に含む単一ファイル構成のため、
 * キャッシュ対象はシェル一式（HTML・Manifest・アイコン）のみでよい。
 *
 * v2でのキャッシュ戦略の変更点（重要）：
 * これまでHTML（index.html含む）もCache First（キャッシュ優先）で配信していたため、
 * アプリを更新してデプロイし直しても、オンライン環境でもブラウザが古いキャッシュを
 * 配信し続けてしまい、修正が反映されない不具合があった。
 * これを解消するため、HTML・ナビゲーション要求は Network First（まずネットワークから
 * 最新を取得し、失敗時のみキャッシュにフォールバック）に変更する。
 * アイコン等の静的ファイルは変更頻度が低いため、引き続き Cache First のままとする。
 */

const CACHE_VERSION = "v3";
const CACHE_NAME = `mahjong-app-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./tiles/portrait/1m.png",
  "./tiles/portrait/2m.png",
  "./tiles/portrait/3m.png",
  "./tiles/portrait/4m.png",
  "./tiles/portrait/5m.png",
  "./tiles/portrait/6m.png",
  "./tiles/portrait/7m.png",
  "./tiles/portrait/8m.png",
  "./tiles/portrait/9m.png",
  "./tiles/portrait/1s.png",
  "./tiles/portrait/2s.png",
  "./tiles/portrait/3s.png",
  "./tiles/portrait/4s.png",
  "./tiles/portrait/5s.png",
  "./tiles/portrait/6s.png",
  "./tiles/portrait/7s.png",
  "./tiles/portrait/8s.png",
  "./tiles/portrait/9s.png",
  "./tiles/portrait/1p.png",
  "./tiles/portrait/2p.png",
  "./tiles/portrait/3p.png",
  "./tiles/portrait/4p.png",
  "./tiles/portrait/5p.png",
  "./tiles/portrait/6p.png",
  "./tiles/portrait/7p.png",
  "./tiles/portrait/8p.png",
  "./tiles/portrait/9p.png",
  "./tiles/portrait/1z.png",
  "./tiles/portrait/2z.png",
  "./tiles/portrait/3z.png",
  "./tiles/portrait/4z.png",
  "./tiles/portrait/5z.png",
  "./tiles/portrait/6z.png",
  "./tiles/portrait/7z.png",
  "./tiles/landscape/1m.png",
  "./tiles/landscape/2m.png",
  "./tiles/landscape/3m.png",
  "./tiles/landscape/4m.png",
  "./tiles/landscape/5m.png",
  "./tiles/landscape/6m.png",
  "./tiles/landscape/7m.png",
  "./tiles/landscape/8m.png",
  "./tiles/landscape/9m.png",
  "./tiles/landscape/1s.png",
  "./tiles/landscape/2s.png",
  "./tiles/landscape/3s.png",
  "./tiles/landscape/4s.png",
  "./tiles/landscape/5s.png",
  "./tiles/landscape/6s.png",
  "./tiles/landscape/7s.png",
  "./tiles/landscape/8s.png",
  "./tiles/landscape/9s.png",
  "./tiles/landscape/1p.png",
  "./tiles/landscape/2p.png",
  "./tiles/landscape/3p.png",
  "./tiles/landscape/4p.png",
  "./tiles/landscape/5p.png",
  "./tiles/landscape/6p.png",
  "./tiles/landscape/7p.png",
  "./tiles/landscape/8p.png",
  "./tiles/landscape/9p.png",
  "./tiles/landscape/1z.png",
  "./tiles/landscape/2z.png",
  "./tiles/landscape/3z.png",
  "./tiles/landscape/4z.png",
  "./tiles/landscape/5z.png",
  "./tiles/landscape/6z.png",
  "./tiles/landscape/7z.png",
];

/* HTML・ナビゲーション要求かどうかを判定する */
function isHtmlRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

/* インストール時：アプリシェルを事前キャッシュする */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 有効化時：古いバージョンのキャッシュを削除する */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("mahjong-app-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 同一オリジン以外（他サイトへのリクエスト等）は素通しする
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.method !== "GET") return;

  // HTML・ナビゲーション要求：Network First
  // オンライン時は常に最新のindex.htmlを取得し、キャッシュも更新する。
  // オフライン時（fetch失敗時）のみキャッシュから返し、SPAとして起動できるようにする。
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // それ以外の静的ファイル（アイコン・manifest等）：Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => undefined);
    })
  );
});
