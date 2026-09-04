/**
 * service-worker.js
 * ------------------------------------------------------------------
 * オフラインでも基本機能（運動記録・資産確認）が使えるように、
 * アプリシェルとローカルアセットをキャッシュする（33章 ⑤）。
 * データそのものはlocalStorageに保存されるため、通信状況に
 * 左右されない。
 * ------------------------------------------------------------------
 */

const CACHE_VERSION = "chikutate-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./config.js",
  "./exercises.js",
  "./tips.js",
  "./praises.js",
  "./mascot.js",
  "./models.js",
  "./storage.js",
  "./gameBalance.js",
  "./cardioCalculator.js",
  "./strengthCalculator.js",
  "./enduranceCalculator.js",
  "./decayCalculator.js",
  "./habitCalculator.js",
  "./bptCalculator.js",
  "./seasonManager.js",
  "./format.js",
  "./icons.js",
  "./chart.js",
  "./picker.js",
  "./confirm.js",
  "./home.js",
  "./bptInfo.js",
  "./pressureInfo.js",
  "./habitInfo.js",
  "./assetRankInfo.js",
  "./record.js",
  "./exercisePicker.js",
  "./template.js",
  "./result.js",
  "./levelUpView.js",
  "./edit.js",
  "./asset.js",
  "./seasons.js",
  "./science.js",
  "./gameBalanceSettings.js",
  "./more.js",
  "./router.js",
  "./app.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./rank-bronze.png",
  "./rank-bg-genkan.jpg",
  "./rank-bg-station.jpg",
  "./rank-bg-shoutengai.jpg",
  "./rank-bg-village.jpg",
  "./rank-bg-city.jpg",
  "./rank-bg-pref-hokkaido.jpg",
  "./rank-bg-pref-saitama.jpg",
  "./rank-bg-pref-yamanashi.jpg",
  "./rank-bg-pref-shiga.jpg",
  "./rank-bg-pref-nara.jpg",
  "./rank-bg-pref-tottori.jpg",
  "./rank-bg-pref-tochigi.jpg",
  "./rank-bg-pref-tokushima.jpg",
  "./rank-bg-pref-gunma.jpg",
  "./rank-bg-pref-ibaraki.jpg",
  "./rank-bg-pref-saga.jpg",
  "./rank-bg-pref-osaka.jpg",
  "./rank-bg-pref-toyama.jpg",
  "./rank-bg-pref-akita.jpg",
  "./rank-bg-pref-miyazaki.jpg",
  "./rank-bg-pref-fukui.jpg",
  "./rank-bg-pref-chiba.jpg",
  "./rank-bg-pref-kanagawa.jpg",
  "./rank-bg-pref-yamagata.jpg",
  "./rank-bg-pref-kagawa.jpg",
  "./rank-bg-pref-ishikawa.jpg",
  "./rank-bg-pref-gifu.jpg",
  "./rank-bg-pref-kyoto.jpg",
  "./rank-bg-pref-fukushima.jpg",
  "./rank-bg-pref-nagano.jpg",
  "./rank-bg-pref-aomori.jpg",
  "./rank-bg-pref-wakayama.jpg",
  "./rank-bg-pref-aichi.jpg",
  "./rank-bg-pref-okayama.jpg",
  "./rank-bg-pref-fukuoka.jpg",
  "./rank-bg-pref-kochi.jpg",
  "./rank-bg-pref-hyogo.jpg",
  "./rank-bg-pref-niigata.jpg",
  "./rank-bg-pref-miyagi.jpg",
  "./rank-bg-pref-tokyo.jpg",
  "./rank-bg-pref-iwate.jpg",
  "./rank-bg-pref-oita.jpg",
  "./rank-bg-pref-shimane.jpg",
  "./rank-bg-pref-kumamoto.jpg",
  "./rank-bg-pref-hiroshima.jpg",
  "./rank-bg-pref-mie.jpg",
  "./rank-bg-pref-yamaguchi.jpg",
  "./rank-bg-pref-ehime.jpg",
  "./rank-bg-pref-okinawa.jpg",
  "./rank-bg-pref-kagoshima.jpg",
  "./rank-bg-pref-nagasaki.jpg",
  "./rank-bg-pref-shizuoka.jpg",
  "./rank-bg-japan.jpg",
  "./rank-bg-america.jpg",
  "./rank-bg-earth.jpg",
  "./rank-bg-mercury.jpg",
  "./rank-bg-venus.jpg",
  "./rank-bg-saturn.jpg",
  "./rank-silver.png",
  "./rank-gold.png",
  "./rank-platinum.png",
  "./rank-legend.png",
  "./rank-god.png",
  "./mascot-normal.png",
  "./mascot-joy.png",
  "./mascot-motivated.png",
  "./mascot-tehepero.png",
  "./mascot-body-jump.png",
  "./mascot-body-guts.png",
  "./mascot-run-01.png",
  "./mascot-run-02.png",
  "./mascot-run-07.png",
  "./mascot-run-08.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // 外部リソース: ネットワーク優先、失敗時はキャッシュ
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  const isImage = /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(url.pathname);

  if (isImage) {
    // 画像: 更新頻度が低いためキャッシュ優先（オフライン性・速度を重視）
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, resClone));
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    // アプリ本体（HTML/JS/CSS/JSON）: ネットワーク優先で常に最新を取得し、
    // オフライン時のみキャッシュへフォールバックする（更新が反映されない問題を防ぐ）
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
