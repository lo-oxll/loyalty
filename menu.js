"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  let d;
  try { d = await App.load(); } catch { $("#menu").innerHTML = '<p class="none">تعذّر تحميل القائمة.</p>'; return; }
  App.theme(d);
  const esc = App.esc, fmt = App.fmt;
  $("#name").textContent = d.name || "المنيو";
  if ($("#q")) document.title = "المنيو — " + (d.name || "");
  if (d.minOrder && $("#foot")) $("#foot").textContent = "الحد الأدنى للطلب السفري " + Number(d.minOrder).toLocaleString("en-US") + " د.ع";

  const cats = (d.categories || []).filter((c) => c.items && c.items.length);
  const byId = new Map(), cart = new Map();
  cats.forEach((c) => c.items.forEach((i) => byId.set(i.id, i)));
  const orderable = (i) => Number.isFinite(i.price) && i.price > 0;
  const total = () => [...cart.values()].reduce((s, x) => s + x.p * x.q, 0);
  const count = () => [...cart.values()].reduce((s, x) => s + x.q, 0);
  const qv = () => ($("#q") ? $("#q").value : "");
  const norm = (s) => String(s).replace(/[\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

  const ctl = (id) => {
    const q = (cart.get(id) || {}).q || 0, a = esc(id);
    return q
      ? `<button class="qb" type="button" data-a="-" data-id="${a}" aria-label="إنقاص">−</button><b>${q}</b><button class="qb" type="button" data-a="+" data-id="${a}" aria-label="زيادة">+</button>`
      : `<button class="btn sm" type="button" data-a="+" data-id="${a}">إضافة</button>`;
  };

  function render(filter = "") {
    const f = norm(filter.trim());
    let html = "", tabs = "";
    for (const c of cats) {
      const items = c.items.filter((i) => !f || norm(i.name + " " + (i.desc || "")).includes(f));
      if (!items.length) continue;
      tabs += `<a href="#c-${esc(c.id)}" data-id="c-${esc(c.id)}">${esc(c.name)}</a>`;
      html += `<section id="c-${esc(c.id)}"><h2>${esc(c.name)}</h2>` + items.map((i) =>
        `<article class="item">${i.img ? `<img class="pic" src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy" width="96" height="96">` : ""}` +
        `<div class="info"><h3>${esc(i.name)}</h3>${i.desc ? `<p>${esc(i.desc)}</p>` : ""}` +
        `<div class="row"><span class="price">${fmt(orderable(i) ? i.price : null)}</span>${orderable(i) ? `<span class="ctl" data-c="${esc(i.id)}">${ctl(i.id)}</span>` : ""}</div></div></article>`
      ).join("") + "</section>";
    }
    if ($("#tabs")) $("#tabs").innerHTML = tabs;
    $("#menu").innerHTML = html || '<p class="none">لا توجد نتائج مطابقة.</p>';
    observe();
  }

  let io;
  function observe() {
    if (!$("#tabs")) return;
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        $$("#tabs a").forEach((a) => a.classList.toggle("on", a.dataset.id === e.target.id));
        const on = $("#tabs a.on"), t = $("#tabs");
        if (on) t.scrollTo({ left: on.offsetLeft - t.clientWidth / 2 + on.clientWidth / 2, behavior: "smooth" });
      }
    }, { rootMargin: "-80px 0px -70% 0px" });
    $$("#menu section").forEach((s) => io.observe(s));
  }

  function bar() {
    const n = count();
    $("#bar").hidden = n === 0;
    $("#barN").textContent = n + " صنف";
    $("#barT").textContent = fmt(total());
  }

  function lines() {
    if (!cart.size) { sheet.close(); return; }
    $("#lines").innerHTML = [...cart.values()].map((x) =>
      `<div class="ln"><div><div>${esc(x.n)}</div><small>${fmt(x.p * x.q)}</small></div><span class="ctl">` +
      `<button class="qb" type="button" data-a="-" data-id="${esc(x.id)}" aria-label="إنقاص">−</button><b>${x.q}</b>` +
      `<button class="qb" type="button" data-a="+" data-id="${esc(x.id)}" aria-label="زيادة">+</button></span></div>`).join("");
    $("#total").textContent = fmt(total());
  }

  function change(id, dl) {
    const i = byId.get(id);
    if (!i || !orderable(i)) return;
    const q = Math.max(0, Math.min(99, ((cart.get(id) || {}).q || 0) + dl));
    if (q) cart.set(id, { id, n: i.name, p: i.price, q }); else cart.delete(id);
    $$(".ctl[data-c]").filter((e) => e.dataset.c === id).forEach((e) => { e.innerHTML = ctl(id); });
    bar();
    if (sheet.open) lines();
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (b) change(b.dataset.id, b.dataset.a === "+" ? 1 : -1);
  });

  const sheet = $("#sheet");
  let type = "hall";
  function setType(t) {
    type = t;
    $$(".seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
    $("#tableBox").hidden = t !== "hall";
    $("#send").textContent = t === "hall" ? "إرسال الطلب إلى الكاشير" : "إرسال الطلب (واتساب + الكاشير)";
    $("#err").textContent = "";
  }
  $$(".seg button").forEach((b) => { b.onclick = () => setType(b.dataset.t); });
  $("#bar").onclick = () => { lines(); setType(type); sheet.showModal(); };
  $("#close").onclick = () => sheet.close();
  $("#doneClose").onclick = () => sheet.close();
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener("close", () => {
    if (!$("#done").hidden) { cart.clear(); render(qv()); bar(); }
    $("#form").hidden = false; $("#done").hidden = true; $("#send").disabled = false;
  });

  const waLink = (o) => {
    const n = String(d.whatsapp || "").replace(/\D/g, "");
    if (!n) return "";
    const msg = [`طلب سفري #${o.code}`, ...o.items.map((x) => `${x.q} × ${x.n} = ${(x.p * x.q).toLocaleString("en-US")}`), `المجموع: ${o.total.toLocaleString("en-US")} د.ع`];
    if (o.note) msg.push("ملاحظات: " + o.note);
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(msg.join("\n"));
  };

  $("#send").onclick = async () => {
    const err = $("#err"), t = total();
    err.textContent = "";
    if (!cart.size) return;
    const table = parseInt($("#table").value, 10);
    if (type === "hall" && !(table >= 1 && table <= 999)) { err.textContent = "أدخل رقم الطاولة (1 - 999)."; $("#table").focus(); return; }
    const min = Number(d.minOrder) || 0;
    if (type === "out" && t < min) { err.textContent = "الحد الأدنى للطلب السفري " + min.toLocaleString("en-US") + " د.ع."; return; }
    const { id, code } = App.newId();
    const o = { id, code, t: Date.now(), type, table: type === "hall" ? table : 0, note: $("#note").value.trim().slice(0, 200), s: "new", total: t,
      items: [...cart.values()].map((x) => ({ id: x.id, n: x.n, p: x.p, q: x.q })) };
    $("#send").disabled = true;
    let ok = true;
    try { await Store.add(d, o); } catch { ok = false; }
    if (!ok && type === "hall") { err.textContent = "تعذّر إرسال الطلب. حاول مجدداً أو نادِ الموظف."; $("#send").disabled = false; return; }
    $("#form").hidden = true; $("#done").hidden = false;
    $("#doneNum").textContent = "#" + code;
    const wa = $("#waBtn"), link = type === "out" ? waLink(o) : "";
    wa.hidden = !link; if (link) wa.href = link;
    $("#doneMsg").textContent = type === "hall" ? `وصل طلبك إلى الكاشير. طاولة ${table}.`
      : ok ? "وصل طلبك إلى الكاشير. اضغط الزر لإرساله أيضاً عبر واتساب." : "تعذّر الإرسال إلى الكاشير. أرسل الطلب عبر واتساب.";
  };

  if ($("#q")) $("#q").addEventListener("input", () => render(qv()));
  render();
  if (location.hash) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }
})();
