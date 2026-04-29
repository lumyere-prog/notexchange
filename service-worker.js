self.addEventListener("install", () => {
  console.log("PWA installed");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});