"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), esc = App.esc;
  let d;
  try { d = await App.load(); } catch { $("#name").textContent = "تعذّر تحميل البيانات"; return; }
  App.theme(d);
  const name = d.name || "المطعم";
  document.title = name + " — القائمة وحساباتنا";
  $("#name").textContent = name;
  if (d.tagline) { $("#tagline").textContent = d.tagline; $("#tagline").hidden = false; }

  const logo = $("#logo");
  if (d.logo) { const i = new Image(); i.alt = ""; i.src = d.logo; logo.append(i); } else logo.textContent = name.trim().charAt(0);

  // اختصار سري: 5 نقرات خلال ثانيتين = المدير، 3 نقرات = الكاشير
  let taps = 0, first = 0, timer;
  logo.addEventListener("click", () => {
    const now = Date.now();
    if (!taps || now - first > 2000) { taps = 0; first = now; }
    taps++;
    clearTimeout(timer);
    if (taps >= 5) { taps = 0; location.href = "admin.html"; return; }
    timer = setTimeout(() => { if (taps === 3) location.href = "cashier.html"; taps = 0; }, 700);
  });

  // زر التواصل (يمين) والموقع (يسار)
  const digits = (v) => String(v || "").replace(/\D/g, "");
  const L = [];
  if (d.phone) L.push(["اتصال", "tel:+" + digits(d.phone)]);
  if (d.whatsapp) L.push(["واتساب", "https://wa.me/" + digits(d.whatsapp) + "?text=" + encodeURIComponent(d.whatsappMessage || "")]);
  [["إنستغرام", d.instagram], ["فيسبوك", d.facebook], ["تيك توك", d.tiktok]].forEach(([t, u]) => { if (/^https:\/\//.test(u || "")) L.push([t, u]); });
  if (L.length) {
    const b = $("#contactBtn"), box = $("#contactBox");
    box.innerHTML = L.map(([t, u]) => `<a class="btn ghost sm" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`).join("");
    b.hidden = false;
    b.onclick = () => { box.hidden = !box.hidden; b.setAttribute("aria-expanded", String(!box.hidden)); };
  }
  if (/^https:\/\//.test(d.map || "")) { const m = $("#mapBtn"); m.href = d.map; m.hidden = false; }

  // الواي فاي: المتصفحات لا تستطيع الاتصال بالشبكة مباشرة، لذا ننسخ كلمة المرور ونرشد الزبون
  if (d.wifi && d.wifi.name) {
    const w = $("#wifi");
    w.hidden = false; w.textContent = "الواي فاي: " + d.wifi.name + " — اضغط للاتصال";
    w.onclick = async () => {
      let ok = false;
      if (d.wifi.password) { try { await navigator.clipboard.writeText(d.wifi.password); ok = true; } catch { /* لا نسخ */ } }
      App.toast(ok ? `تم نسخ كلمة المرور. اختر شبكة "${d.wifi.name}" من إعدادات الواي فاي والصقها.` : `اختر شبكة "${d.wifi.name}" من إعدادات الواي فاي.`, 5000);
    };
  }

  // مفتوح الآن / مغلق الآن
  const hrs = d.hours || [];
  let day = new Date().getDay(), now = new Date().getHours() * 60 + new Date().getMinutes();
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: d.timezone || "Asia/Baghdad", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday); now = +p.hour * 60 + +p.minute;
  } catch { /* توقيت الجهاز */ }
  const rng = (i) => {
    const h = hrs[(i + 7) % 7];
    if (!/^\d\d:\d\d-\d\d:\d\d$/.test(h || "")) return null;
    return h.split("-").map((t) => +t.slice(0, 2) * 60 + +t.slice(3));
  };
  if (hrs.length) {
    const t = rng(day), y = rng(day - 1);
    const open = (t && (t[0] < t[1] ? now >= t[0] && now < t[1] : now >= t[0])) || (y && y[0] >= y[1] && now < y[1]);
    const s = $("#status"); s.hidden = false; s.className = "status " + (open ? "open" : "closed"); s.textContent = open ? "مفتوح الآن" : "مغلق الآن";
  }

})();
