const CACHE_NAME = "distribuidora-agil-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/app.js",
  "./assets/icon.svg",
  "./assets/products/cerveja.svg",
  "./assets/products/combo.svg",
  "./assets/products/gelo.svg",
  "./assets/products/refrigerante.svg",
  "./assets/products/vinho.svg",
  "./assets/products/whisky.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
