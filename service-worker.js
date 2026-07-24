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

const CACHE_VERSION = "v2";
const CACHE_NAME = `mahjong-app-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
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
