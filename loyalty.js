"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), esc = App.esc, LS = {
    get: (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* تخزين غير متاح */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* تخزين غير متاح */ } },
  };
  const say = (t, ok) => { const m = $("#msg"); m.textContent = t; m.className = "msg" + (ok ? " ok" : ""); };

  let d;
  try { d = await App.load(); } catch { $("#boot").textContent = "تعذّر تحميل البيانات."; return; }
  App.theme(d);
  const cfg = Loy.cfg(d), base = Store.base(d), name = d.name || "الكافيه";
  document.title = "بطاقة الولاء — " + name;
  $("#boot").hidden = true;
  if (!base) { $("#off").hidden = false; return; }

  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  let reg = null;
  if ("serviceWorker" in navigator) { try { reg = await navigator.serviceWorker.register("sw.js"); } catch { /* بلا خدمة خلفية */ } }

  // هوية العميل: تُحفظ على الجهاز، وتُستعاد من الرابط (#c=...) عند فقدها
  let id = LS.get("loy_id"), rec = null;
  if (!Loy.okId(id)) {
    const h = /^#c=([0-9a-f]{32})$/.exec(location.hash);
    id = h ? h[1] : "";
    if (id) LS.set("loy_id", id);
  }

  function showReg() {
    $("#cardBox").hidden = true; $("#reg").hidden = false;
    $("#regTitle").textContent = "بطاقة ولاء " + name;
    $("#regInfo").textContent = `سجّل اسمك لتحصل على بطاقتك. بعد ${cfg.target} زيارات، الزيارة التالية مجانية.`;
    $("#iosTip").hidden = !(iOS && !standalone);
    $("#nm").focus();
  }

  const qrSvg = (text) => { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); };

  function draw() {
    const r = rec, N = cfg.target;
    $("#reg").hidden = true; $("#cardBox").hidden = false;
    $("#cafe").textContent = name; $("#who").textContent = r.n;
    const lg = $("#lg");
    if (!lg.firstChild) { if (d.logo) { const i = new Image(); i.alt = ""; i.src = d.logo; lg.append(i); } else lg.textContent = name.trim().charAt(0); }
    let h = "";
    for (let i = 0; i < N; i++) h += `<span class="st ${i < r.v ? "on" : ""}">${i < r.v ? "✓" : i + 1}</span>`;
    h += `<span class="st gift ${r.v >= N ? "on" : ""}">مجاني</span>`;
    $("#stamps").innerHTML = h;
    $("#stamps").style.gridTemplateColumns = `repeat(${Loy.cols(N + 1)},1fr)`;
    $("#stamps").setAttribute("aria-label", `${Math.min(r.v, N)} من ${N} زيارات`);
    $("#prog").textContent = r.v >= N ? "زيارتك القادمة مجانية! أرِ بطاقتك للكاشير." : `تبقّى ${Loy.left(N - r.v)} ثم مشروبك المجاني علينا.`;
    $("#qr").innerHTML = qrSvg("RC1:" + r.c);
    $("#code").textContent = r.c;
    $("#foot").textContent = `الزيارات: ${r.t} · المجانية المستلمة: ${r.f}`;
    alertsUi();
  }

  async function refresh() {
    try {
      const j = await Loy.get(d, id);
      if (j === null) { LS.del("loy_id"); LS.del("loy_cache"); id = ""; rec = null; history.replaceState(null, "", location.pathname); showReg(); return; }
      rec = Loy.clean(j); LS.set("loy_cache", JSON.stringify(rec)); say("");
    } catch {
      if (!rec) { try { rec = Loy.clean(JSON.parse(LS.get("loy_cache"))); } catch { rec = null; } }
      if (!rec) { say("تعذّر الاتصال. حاول مجدداً."); return; }
      say("لا يوجد اتصال، يُعرض آخر ما حُفظ.");
    }
    draw();
  }

  $("#reg").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = $("#nm").value.trim().replace(/\s+/g, " "), err = $("#regErr"), btn = $("#regBtn");
    err.textContent = "";
    if (n.length < 2 || n.length > 40) { err.textContent = "اكتب اسمك (من حرفين إلى 40 حرفاً)."; $("#nm").focus(); return; }
    btn.disabled = true;
    const nid = Loy.newId(), body = { n, c: Loy.newCode(), v: 0, t: 0, f: 0, created: Date.now() };
    try { await Loy.create(d, nid, body); } catch { err.textContent = "تعذّر إنشاء البطاقة. تحقق من الاتصال وحاول مجدداً."; btn.disabled = false; return; }
    id = nid; LS.set("loy_id", id); rec = Loy.clean(body); LS.set("loy_cache", JSON.stringify(rec));
    history.replaceState(null, "", "#c=" + id);
    btn.disabled = false;
    draw();
  });

  // ---- التنبيهات والموقع ----
  const canAlert = "Notification" in window && !!reg && (!iOS || standalone);
  function alertsUi() {
    const b = $("#alerts"), on = canAlert && Notification.permission === "granted" && LS.get("loy_alerts") === "1";
    b.hidden = !canAlert || on;
    let t = "";
    if (!canAlert) t = iOS && !standalone ? "لتفعيل التنبيهات على الآيفون: أضف البطاقة للشاشة الرئيسية وافتحها من هناك." : "المتصفح لا يدعم التنبيهات.";
    else if (on && cfg.geo) t = "تنبيه القرب يعمل أثناء فتح البطاقة فقط. تنبيه الاشتياق يصلك حتى والتطبيق مغلق.";
    else if (on) t = "التنبيهات مفعّلة.";
    $("#alertHint").textContent = t;
  }

  async function subscribe() {
    if (!cfg.vapid || !("PushManager" in window)) return false;
    const r = await navigator.serviceWorker.ready;
    let s = await r.pushManager.getSubscription();
    if (!s) {
      try { s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Loy.b64(cfg.vapid) }); }
      catch { return false; }
    }
    await Loy.setSub(d, id, JSON.stringify(s));
    return true;
  }

  let watch = null;
  function startGeo() {
    if (!cfg.geo || watch !== null || !("geolocation" in navigator)) return;
    watch = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy: false, maximumAge: 30000, timeout: 60000 });
  }
  function onPos(p) {
    if (!rec || Loy.dist(p.coords.latitude, p.coords.longitude, cfg.lat, cfg.lng) > cfg.radius) return;
    if (Loy.sameDay(rec.last)) return;                                   // سُجّلت زيارته اليوم
    if (Date.now() - (Number(LS.get("loy_near")) || 0) < 6 * 36e5) return; // لا أكثر من تنبيه كل 6 ساعات
    LS.set("loy_near", String(Date.now()));
    if (Notification.permission === "granted" && reg) reg.showNotification(name, { body: cfg.nearBody, icon: "icon-192.png", tag: "near", dir: "rtl", lang: "ar" });
    App.toast(cfg.nearBody, 5000);
  }

  $("#alerts").onclick = async () => {
    say("");
    try {
      if (await Notification.requestPermission() !== "granted") { say("لم يُسمح بالتنبيهات. فعّلها من إعدادات المتصفح للموقع."); return; }
      LS.set("loy_alerts", "1");
      const ok = await subscribe();
      startGeo();
      alertsUi();
      say(ok || !cfg.vapid ? "تم تفعيل التنبيهات." : "تم التفعيل جزئياً: تعذّر تسجيل تنبيه الاشتياق على هذا الجهاز.", ok);
    } catch { say("تعذّر تفعيل التنبيهات."); }
  };

  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("#install").hidden = standalone; });
  $("#install").onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch { /* أُلغي */ } deferred = null; $("#install").hidden = true; };
  window.addEventListener("appinstalled", () => { $("#install").hidden = true; });

  // ---- التشغيل ----
  if (!id) showReg(); else await refresh();
  if (rec && canAlert && Notification.permission === "granted" && LS.get("loy_alerts") === "1") { subscribe().catch(() => {}); startGeo(); }
  setInterval(() => { if (id && !document.hidden) refresh(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (id && !document.hidden) refresh(); });
})();
