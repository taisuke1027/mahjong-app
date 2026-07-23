/*
 * 麻雀成績管理アプリ Service Worker
 * 第7章15〜16節：初回アクセス後はオフラインでも完全に利用できるようにする。
 * アプリはCSS/JSをすべてindex.html内に含む単一ファイル構成のため、
 * キャッシュ対象はシェル一式（HTML・Manifest・アイコン）のみでよい。
 */

const CACHE_VERSION = "v1";
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

/* fetch時：キャッシュ優先（Cache First）。オフライン時も同一オリジンのシェルはキャッシュから返す。
   ナビゲーション要求（画面遷移・再読み込み）は、失敗時に index.html へフォールバックし、
   SPAとしてオフラインでも常に起動できるようにする。 */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 同一オリジン以外（他サイトへのリクエスト等）は素通しする
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // 取得できたレスポンスは以後のオフライン利用のためにキャッシュへ保存する
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // オフラインでキャッシュにも無い場合、画面遷移要求ならアプリ本体へフォールバック
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        });
    })
  );
});
