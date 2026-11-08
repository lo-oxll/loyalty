"use strict";
const App = {
  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  fmt: (n) => (n == null ? "اسأل عن السعر" : Number(n).toLocaleString("en-US") + " د.ع"),
  async load() {
    const r = await fetch("data.json", { cache: "no-store" });
    if (!r.ok) throw new Error("data.json");
    return r.json();
  },
  theme(d) {
    const t = (d && d.theme) || {}, ok = (v) => /^#[0-9a-f]{6}$/i.test(v || ""), s = document.documentElement.style;
    if (ok(t.primary)) {
      s.setProperty("--primary", t.primary);
      const n = parseInt(t.primary.slice(1), 16), lum = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
      s.setProperty("--ink", lum > 150 ? "#1a1a1a" : "#ffffff");
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = t.primary;
    }
    if (ok(t.text)) s.setProperty("--text", t.text);
  },
  toast(m, ms) {
    let e = document.getElementById("toast");
    if (!e) { e = document.createElement("div"); e.id = "toast"; e.className = "toast"; e.setAttribute("role", "status"); document.body.append(e); }
    e.textContent = m; e.classList.add("show");
    clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("show"), 2200);
  },
  newId() {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.getRandomValues(new Uint8Array(4));
    const code = [...b].map((x) => a[x % a.length]).join("");
    return { code, id: Date.now().toString(36) + "-" + code };
  },
  async hash(pw, salt) {
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 150000 }, k, 256);
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  },
  async mk(pw) {
    const s = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, "0")).join("");
    return s + ":" + (await App.hash(pw, s));
  },
  gate(hash, title) {
    return new Promise((res) => {
      const o = document.createElement("div");
      o.className = "gate";
      o.innerHTML = `<form class="card"><h2>${App.esc(title)}</h2><input type="password" autocomplete="current-password" aria-label="كلمة السر" required><p class="msg" role="alert"></p><button class="btn block">دخول</button></form>`;
      document.body.append(o);
      const f = o.firstChild, i = f.querySelector("input"), m = f.querySelector(".msg");
      i.focus();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const [s, h] = String(hash).split(":");
        try {
          if ((await App.hash(i.value, s)) === h) { o.remove(); res(); return; }
          m.textContent = "كلمة السر غير صحيحة"; i.select();
        } catch { m.textContent = "يتطلب اتصالاً آمناً (HTTPS)"; }
      };
    });
  },
};

// تخزين الطلبات: قاعدة Firebase Realtime عبر REST إن وُضع الرابط، وإلا localStorage (نفس الجهاز فقط)
const Store = {
  base(d) {
    const u = String((d && d.ordersUrl) || "").trim().replace(/\/+$/, "");
    return /^https:\/\/[\w.-]+\.(firebasedatabase\.app|firebaseio\.com)$/.test(u) ? u : "";
  },
  loc() { try { return JSON.parse(localStorage.getItem("orders_v1")) || []; } catch { return []; } },
  saveLoc(a) { localStorage.setItem("orders_v1", JSON.stringify(a.slice(-200))); },
  async add(d, o) {
    const u = this.base(d);
    if (!u) { const a = this.loc(); a.push(o); this.saveLoc(a); return; }
    const r = await fetch(`${u}/orders/${encodeURIComponent(o.id)}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
    if (!r.ok) throw new Error("HTTP " + r.status);
  },
  async list(d) {
    const u = this.base(d);
    if (!u) return this.loc();
    const r = await fetch(`${u}/orders.json?orderBy=%22%24key%22&limitToLast=100`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return j ? Object.values(j) : [];
  },
  async patch(d, id, p) {
    const u = this.base(d);
    if (!u) { const a = this.loc(); const o = a.find((x) => x.id === id); if (o) Object.assign(o, p); this.saveLoc(a); return; }
    const r = await fetch(`${u}/orders/${encodeURIComponent(id)}.json`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) throw new Error("HTTP " + r.status);
  },
};
