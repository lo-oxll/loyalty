"use strict";
/* منطق مشترك لنظام الولاء: بطاقة العميل + شاشة الكاشير */
const Loy = {
  ALPHA: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  okId: (s) => /^[0-9a-f]{32}$/.test(s || ""),
  okCode: (s) => /^[A-HJ-NP-Z2-9]{8}$/.test(s || ""),
  newId() { return [...crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, "0")).join(""); },
  newCode() { return [...crypto.getRandomValues(new Uint8Array(8))].map((x) => Loy.ALPHA[x % 32]).join(""); },

  cfg(d) {
    const l = (d && d.loyalty) || {};
    const num = (v, def, min, max) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) && n >= min && n <= max ? n : def; };
    const txt = (v, def, max) => { const s = String(v == null ? "" : v).trim(); return s ? s.slice(0, max) : def; };
    const lat = l.lat === "" || l.lat == null ? NaN : Number(l.lat), lng = l.lng === "" || l.lng == null ? NaN : Number(l.lng);
    return {
      target: Math.round(num(l.target, 5, 1, 20)),
      radius: num(l.radius, 200, 20, 5000),
      absentDays: Math.round(num(l.absentDays, 14, 1, 365)),
      lat, lng, geo: Math.abs(lat) <= 90 && Math.abs(lng) <= 180,
      nearBody: txt(l.nearBody, "احنه بانتظارك", 120),
      absentTitle: txt(l.absentTitle, "koroot ai agent", 60),
      absentBody: txt(l.absentBody, "مشتاقين الك", 120),
      vapid: String(l.vapidPublic || "").trim(),
      apiKey: String(l.apiKey || "").trim(),
    };
  },

  dist(lat1, lng1, lat2, lng2) {
    const R = 6371000, r = (x) => (x * Math.PI) / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  },
  sameDay(ts, now) { if (!ts) return false; return new Date(ts).toDateString() === new Date(now == null ? Date.now() : now).toDateString(); },

  clean(o) {
    if (!o || typeof o !== "object") return null;
    const i = (v, max) => Math.min(max, Math.max(0, parseInt(v, 10) || 0));
    return { n: String(o.n || "").slice(0, 40), c: String(o.c || "").slice(0, 8), v: i(o.v, 50), t: i(o.t, 1e9), f: i(o.f, 1e9), last: Number(o.last) || 0, created: Number(o.created) || 0 };
  },
  // الزيارة التالية: إن اكتملت الدورة تُسلَّم المجانية وتبدأ دورة جديدة
  next(rec, target, now) {
    const free = rec.v >= target;
    return { free, patch: { v: free ? 0 : rec.v + 1, t: rec.t + 1, f: rec.f + (free ? 1 : 0), last: now } };
  },
  cols(n) { return Math.ceil(n / Math.ceil(n / 6)); }, // توزيع متوازن للدوائر (حتى 6 بالصف)
  left(n) { return n === 1 ? "زيارة واحدة" : n === 2 ? "زيارتان" : n + (n <= 10 ? " زيارات" : " زيارة"); },
  b64(s) {
    const p = "=".repeat((4 - (s.length % 4)) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  },

  async http(url, method, body) {
    const o = { method, cache: "no-store" };
    if (body !== undefined) { o.headers = { "Content-Type": "application/json" }; o.body = JSON.stringify(body); }
    const r = await fetch(url, o);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  },
  get(d, id) { return Loy.http(`${Store.base(d)}/loyalty/c/${encodeURIComponent(id)}.json`, "GET"); },
  create(d, id, rec) { return Loy.http(`${Store.base(d)}/loyalty/c/${encodeURIComponent(id)}.json`, "PUT", rec); },
  setSub(d, id, subJson) { return Loy.http(`${Store.base(d)}/loyalty/sub/${encodeURIComponent(id)}.json`, "PUT", subJson); },
};
if (typeof module !== "undefined") module.exports = Loy;
