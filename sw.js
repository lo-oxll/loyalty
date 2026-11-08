"use strict";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { /* نص عادي */ }
  const title = String(p.title || "").slice(0, 80) || "إشعار";
  e.waitUntil(self.registration.showNotification(title, {
    body: String(p.body || "").slice(0, 200), icon: "icon-192.png", badge: "icon-192.png",
    tag: String(p.tag || "loyalty").slice(0, 30), dir: "rtl", lang: "ar",
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.indexOf("loyalty.html") !== -1 && "focus" in c) return c.focus();
    return self.clients.openWindow("loyalty.html");
  }));
});
