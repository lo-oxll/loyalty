"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), esc = App.esc;
  let d;
  try { d = await App.load(); } catch { d = {}; }
  if (d.adminHash) await App.gate(d.adminHash, "لوحة المدير");
  $("#app").hidden = false;

  const DEF = { primary: "#c8102e", text: "#1a1a1a" };
  const LDEF = { target: 5, lat: "", lng: "", radius: 200, absentDays: 14, nearBody: "احنه بانتظارك", absentTitle: "koroot ai agent", absentBody: "مشتاقين الك", vapidPublic: "", apiKey: "" };
  const init = () => { d.theme = Object.assign({}, DEF, d.theme); d.wifi = d.wifi || {}; d.categories = d.categories || []; d.loyalty = Object.assign({}, LDEF, d.loyalty); };
  init();

  const F = [["name", "اسم المطعم"], ["tagline", "العبارة التعريفية"], ["whatsapp", "رقم واتساب (دولي، مثل +9647700000000)", 1], ["phone", "رقم الاتصال", 1],
    ["map", "رابط خرائط Google", 1], ["instagram", "إنستغرام", 1], ["facebook", "فيسبوك", 1], ["tiktok", "تيك توك", 1],
    ["minOrder", "الحد الأدنى للطلب السفري (د.ع)", 0, "number"], ["ordersUrl", "رابط قاعدة الطلبات (Firebase Realtime)", 1],
    ["wifi.name", "اسم الواي فاي", 1], ["wifi.password", "كلمة مرور الواي فاي", 1]];
  const FL = [["loyalty.target", "عدد الزيارات قبل المجانية (5 = السادسة مجانية)", 0, "number"], ["loyalty.lat", "خط عرض الكافيه (Latitude)", 1], ["loyalty.lng", "خط طول الكافيه (Longitude)", 1],
    ["loyalty.radius", "مسافة تنبيه القرب (متر)", 0, "number"], ["loyalty.nearBody", "نص تنبيه القرب"],
    ["loyalty.absentDays", "أيام الغياب قبل تنبيه الاشتياق", 0, "number"], ["loyalty.absentTitle", "عنوان تنبيه الاشتياق"], ["loyalty.absentBody", "نص تنبيه الاشتياق"],
    ["loyalty.vapidPublic", "مفتاح VAPID العام (للتنبيهات)", 1], ["loyalty.apiKey", "Firebase Web API Key (لدخول الكاشير)", 1]];
  const get = (p) => { const v = p.split(".").reduce((o, k) => (o ? o[k] : undefined), d); return v == null ? "" : v; };
  const set = (p, v) => { const k = p.split("."), l = k.pop(); k.reduce((o, x) => (o[x] = o[x] || {}), d)[l] = v; };

  const rows = (A) => A.map(([p, t, ltr, type]) =>
    `<label for="f_${p}">${esc(t)}</label><input id="f_${p}" data-p="${p}" type="${type || "text"}" ${type === "number" ? 'min="0" inputmode="numeric"' : ""} class="${ltr ? "ltr" : ""}" value="${esc(get(p))}" autocomplete="off">`).join("");
  function fields() {
    $("#fields").innerHTML = rows(F);
    $("#loyFields").innerHTML = rows(FL);
    $("#cPrimary").value = d.theme.primary; $("#cText").value = d.theme.text;
    const lp = $("#logoPrev"); lp.hidden = !d.logo; if (d.logo) lp.src = d.logo;
    menu();
  }
  const onField = (e) => {
    const p = e.target.dataset.p;
    if (p) set(p, e.target.type === "number" ? Math.max(0, Number(e.target.value) || 0) : e.target.value.trim());
  };
  $("#fields").addEventListener("input", onField);
  $("#loyFields").addEventListener("input", onField);
  $("#cPrimary").oninput = (e) => { d.theme.primary = e.target.value; App.theme(d); };
  $("#cText").oninput = (e) => { d.theme.text = e.target.value; App.theme(d); };
  $("#cReset").onclick = () => { d.theme = Object.assign({}, DEF); $("#cPrimary").value = DEF.primary; $("#cText").value = DEF.text; App.theme(d); };

  const shrink = (file, max, q) => new Promise((ok, no) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return no(new Error("نوع الصورة غير مدعوم (JPG/PNG/WebP)."));
    const r = new FileReader();
    r.onerror = () => no(new Error("تعذّرت قراءة الملف."));
    r.onload = () => {
      const im = new Image();
      im.onerror = () => no(new Error("تعذّرت قراءة الصورة."));
      im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", q));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
  const say = (t, ok) => { const m = $("#msg"); m.textContent = t; m.className = "msg" + (ok ? " ok" : ""); };

  $("#logoFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { d.logo = await shrink(f, 256, 0.85); fields(); say("", 1); } catch (x) { say(x.message); }
  };
  $("#logoRm").onclick = () => { d.logo = ""; fields(); };

  const uid = () => "i" + Math.random().toString(36).slice(2, 8);
  function menu() {
    $("#menuEd").innerHTML = d.categories.map((c, ci) =>
      `<div class="card" style="margin-bottom:12px"><div class="rowf"><input data-ci="${ci}" data-f="name" value="${esc(c.name)}" aria-label="اسم القسم" placeholder="اسم القسم">` +
      `<button class="btn ghost sm" type="button" data-act="delCat" data-ci="${ci}">حذف القسم</button></div>` +
      c.items.map((i, ii) => {
        const k = `data-ci="${ci}" data-ii="${ii}"`;
        return `<div class="it"><div>${i.img ? `<img class="th" src="${esc(i.img)}" alt="">` : '<div class="th"></div>'}</div><div class="g">` +
          `<input ${k} data-f="name" value="${esc(i.name)}" placeholder="اسم الوجبة" aria-label="اسم الوجبة">` +
          `<input ${k} data-f="price" type="number" min="0" inputmode="numeric" value="${i.price == null ? "" : i.price}" placeholder="السعر (فارغ = اسأل عن السعر)" aria-label="السعر">` +
          `<input ${k} data-f="desc" value="${esc(i.desc || "")}" placeholder="الوصف" aria-label="الوصف">` +
          `<input ${k} data-act="img" type="file" accept="image/jpeg,image/png,image/webp" aria-label="صورة الوجبة">` +
          `<div class="rowf">${i.img ? `<button class="btn ghost sm" type="button" data-act="rmImg" ${k}>إزالة الصورة</button>` : ""}<button class="btn ghost sm" type="button" data-act="delItem" ${k}>حذف الوجبة</button></div></div></div>`;
      }).join("") +
      `<button class="btn ghost sm" type="button" data-act="addItem" data-ci="${ci}" style="margin-top:10px">إضافة وجبة</button></div>`).join("");
  }
  const target = (el) => { const c = d.categories[el.dataset.ci]; return el.dataset.ii === undefined ? c : c.items[el.dataset.ii]; };
  $("#menuEd").addEventListener("input", (e) => {
    const t = e.target, f = t.dataset.f;
    if (!f) return;
    target(t)[f] = f === "price" ? (t.value === "" ? null : Math.max(0, Number(t.value))) : t.value;
  });
  $("#menuEd").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const a = b.dataset.act, c = d.categories[b.dataset.ci];
    if (a === "delCat" && confirm("حذف القسم وكل وجباته؟")) d.categories.splice(b.dataset.ci, 1);
    else if (a === "addItem") c.items.push({ id: uid(), name: "", desc: "", price: null, img: "" });
    else if (a === "delItem" && confirm("حذف الوجبة؟")) c.items.splice(b.dataset.ii, 1);
    else if (a === "rmImg") c.items[b.dataset.ii].img = "";
    else return;
    menu();
  });
  $("#menuEd").addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset.act !== "img" || !t.files[0]) return;
    try { target(t).img = await shrink(t.files[0], 640, 0.72); menu(); say("", 1); } catch (x) { say(x.message); }
  });
  $("#addCat").onclick = () => { d.categories.push({ id: "c" + uid(), name: "قسم جديد", items: [] }); menu(); };

  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!j || typeof j !== "object" || Array.isArray(j)) throw 0; d = j; init(); App.theme(d); fields(); say("تم الاستيراد.", 1); }
    catch { say("ملف JSON غير صالح."); }
  };

  async function build() {
    if (!String(d.name || "").trim()) throw new Error("اسم المطعم مطلوب.");
    if (d.whatsapp && !/^\+?\d{8,15}$/.test(d.whatsapp)) throw new Error("رقم واتساب غير صالح.");
    if (d.ordersUrl && !Store.base(d)) throw new Error("رابط قاعدة الطلبات يجب أن يكون https://....firebasedatabase.app");
    const out = JSON.parse(JSON.stringify(d)), L = out.loyalty;
    const tg = Math.round(Number(L.target));
    if (!(tg >= 1 && tg <= 20)) throw new Error("عدد الزيارات قبل المجانية: من 1 إلى 20.");
    if (!(L.radius >= 20 && L.radius <= 5000)) throw new Error("مسافة التنبيه: من 20 إلى 5000 متر.");
    if (!(L.absentDays >= 1 && L.absentDays <= 365)) throw new Error("أيام الغياب: من 1 إلى 365.");
    L.target = tg;
    if (String(L.lat).trim() === "" && String(L.lng).trim() === "") { L.lat = ""; L.lng = ""; }
    else {
      const la = Number(L.lat), ln = Number(L.lng);
      if (String(L.lat).trim() === "" || String(L.lng).trim() === "" || !(Math.abs(la) <= 90 && Math.abs(ln) <= 180)) throw new Error("إحداثيات الكافيه غير صالحة.");
      L.lat = la; L.lng = ln;
    }
    if (L.vapidPublic && !/^[A-Za-z0-9_-]{80,100}$/.test(L.vapidPublic)) throw new Error("مفتاح VAPID العام غير صالح.");
    out.categories = out.categories.map((c) => ({ ...c, items: c.items.filter((i) => String(i.name).trim()) })).filter((c) => String(c.name).trim());
    const ids = out.categories.flatMap((c) => c.items.map((i) => i.id));
    if (new Set(ids).size !== ids.length) throw new Error("معرّفات الوجبات مكررة في data.json.");
    for (const [id, key] of [["#pwA", "adminHash"]]) {
      const v = $(id).value;
      if (!v) continue;
      if (v.length < 8) throw new Error("كلمة السر 8 أحرف على الأقل.");
      out[key] = await App.mk(v);
    }
    return JSON.stringify(out, null, 2);
  }
  $("#save").onclick = async () => {
    try {
      const j = await build(), a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([j], { type: "application/json" })); a.download = "data.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); say("تم التنزيل. ارفعه إلى المستودع.", 1);
    } catch (x) { say(x.message); }
  };
  $("#copy").onclick = async () => {
    try { await navigator.clipboard.writeText(await build()); say("تم النسخ.", 1); } catch (x) { say(x.message || "تعذّر النسخ."); }
  };

  App.theme(d);
  fields();
})();
