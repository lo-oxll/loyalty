"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), esc = App.esc, fmt = App.fmt;
  let d;
  try { d = await App.load(); } catch { document.body.textContent = "تعذّر تحميل البيانات."; return; }
  App.theme(d);
  $("#app").hidden = false;
  $("#title").textContent = "الكاشير — " + (d.name || "");

  const price = new Map();
  (d.categories || []).forEach((c) => c.items.forEach((i) => price.set(i.id, i.price)));

  // الطلبات تأتي من قاعدة عامة الكتابة: نعقّمها ونعيد حساب الأسعار من القائمة الحالية
  const clean = (o) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.items)) return null;
    const items = o.items.slice(0, 60).map((x) => {
      const p = x && price.get(x.id);
      return { n: String((x && x.n) ?? "").slice(0, 80), q: Math.min(99, Math.max(1, parseInt(x && x.q, 10) || 1)), p: Number.isFinite(p) ? p : Math.max(0, Number(x && x.p) || 0) };
    });
    return { id: String(o.id || "").slice(0, 40), code: String(o.code || "").slice(0, 6), t: Number(o.t) || 0,
      type: o.type === "hall" ? "hall" : "out", table: parseInt(o.table, 10) || 0, note: String(o.note || "").slice(0, 200),
      s: o.s === "done" ? "done" : "new", items, total: items.reduce((a, x) => a + x.p * x.q, 0) };
  };

  let orders = [], seen = null, tab = "new";
  const label = (o) => (o.type === "hall" ? "صالة · طاولة " + o.table : "سفري");

  function draw() {
    const list = orders.filter((o) => o.s === tab);
    document.querySelectorAll(".ctabs button").forEach((b) => {
      const n = orders.filter((o) => o.s === b.dataset.tab).length;
      b.setAttribute("aria-pressed", String(b.dataset.tab === tab));
      b.textContent = (b.dataset.tab === "new" ? "الجديدة" : "المنجزة") + " (" + n + ")";
    });
    $("#list").innerHTML = list.map((o) =>
      `<article class="card ord ${o.s}"><header><span>#${esc(o.code)}</span><span>${esc(label(o))}</span></header>` +
      `<div class="meta">${esc(new Date(o.t).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }))}</div>` +
      o.items.map((x) => `<div class="ln"><span>${x.q} × ${esc(x.n)}</span><small>${(x.p * x.q).toLocaleString("en-US")}</small></div>`).join("") +
      (o.note ? `<div class="meta">ملاحظات: ${esc(o.note)}</div>` : "") +
      `<div class="tot"><span>المجموع</span><span>${fmt(o.total)}</span></div>` +
      `<div class="acts"><button class="btn ghost" type="button" data-act="print" data-id="${esc(o.id)}">طباعة</button>` +
      (o.s === "new" ? `<button class="btn" type="button" data-act="done" data-id="${esc(o.id)}">تم</button>` : "") + `</div></article>`
    ).join("") || '<p class="none" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">لا توجد طلبات.</p>';
  }

  function print(o) {
    $("#receipt").innerHTML =
      `<h1>${esc(d.name || "")}</h1><p class="c">#${esc(o.code)} — ${esc(label(o))}</p><p class="c">${esc(new Date(o.t).toLocaleString("ar-IQ"))}</p><hr>` +
      o.items.map((x) => `<div class="ln"><span>${x.q} × ${esc(x.n)}</span><span>${(x.p * x.q).toLocaleString("en-US")}</span></div>`).join("") +
      `<hr><div class="ln tot"><span>المجموع</span><span>${esc(fmt(o.total))}</span></div>` +
      (o.note ? `<hr><p>ملاحظات: ${esc(o.note)}</p>` : "") + `<hr><p class="c">شكراً لزيارتكم</p>`;
    window.print();
  }

  const beep = () => {
    try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.4); } catch { /* لا صوت */ }
  };

  async function poll() {
    try {
      orders = (await Store.list(d)).map(clean).filter(Boolean).sort((a, b) => b.t - a.t);
      $("#err").hidden = true;
      const fresh = seen ? orders.filter((o) => o.s === "new" && !seen.has(o.id)) : [];
      seen = new Set(orders.map((o) => o.id));
      if (fresh.length) { beep(); if ($("#auto").checked) fresh.reverse().forEach(print); }
      draw();
    } catch { $("#err").hidden = false; }
  }

  document.querySelectorAll(".ctabs button").forEach((b) => { b.onclick = () => { tab = b.dataset.tab; draw(); }; });
  $("#list").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const o = orders.find((x) => x.id === b.dataset.id);
    if (!o) return;
    if (b.dataset.act === "print") print(o);
    else { try { await Store.patch(d, o.id, { s: "done" }); poll(); } catch { App.toast("تعذّر التحديث"); } }
  });

  poll();
  setInterval(poll, 4000);
})();
