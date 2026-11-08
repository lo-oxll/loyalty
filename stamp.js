"use strict";
(async () => {
  const $ = (s) => document.querySelector(s), esc = App.esc;
  const err = (t) => { $("#err").textContent = t || ""; };
  let d;
  try { d = await App.load(); } catch { err("تعذّر تحميل البيانات."); return; }
  App.theme(d);
  const cfg = Loy.cfg(d), base = Store.base(d);
  if (!base || !cfg.apiKey) { err("نظام الولاء غير مضبوط: رابط قاعدة Firebase ومفتاح Web API مطلوبان في لوحة المدير."); return; }

  // ---- مصادقة الكاشير عبر Firebase Auth (REST) ----
  const Auth = { tok: "", exp: 0 };
  const K = encodeURIComponent(cfg.apiKey);
  Auth.set = (t, rt, sec) => { Auth.tok = t; Auth.exp = Date.now() + Number(sec) * 1000; try { sessionStorage.setItem("loy_rt", rt); } catch { /* بلا تخزين */ } };
  Auth.login = async (email, pw) => {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${K}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
    const j = await r.json();
    if (!r.ok) throw new Error("login");
    Auth.set(j.idToken, j.refreshToken, j.expiresIn);
  };
  Auth.refresh = async () => {
    let rt = ""; try { rt = sessionStorage.getItem("loy_rt") || ""; } catch { /* بلا تخزين */ }
    if (!rt) return false;
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${K}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt) });
      const j = await r.json();
      if (!r.ok) return false;
      Auth.set(j.id_token, j.refresh_token, j.expires_in);
      return true;
    } catch { return false; }
  };
  Auth.token = async () => {
    if (Date.now() > Auth.exp - 60000 && !(await Auth.refresh())) { showLogin(); throw new Error("auth"); }
    return Auth.tok;
  };
  const staff = async (path, method, body) => Loy.http(`${base}${path}${path.includes("?") ? "&" : "?"}auth=${encodeURIComponent(await Auth.token())}`, method, body);

  function showLogin() { stopCam(); $("#app").hidden = true; $("#login").hidden = false; }
  function showApp() { $("#login").hidden = true; $("#app").hidden = false; err(""); }

  $("#title").textContent = "تسجيل الزيارات — " + (d.name || "");
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault(); err("");
    const b = $("#loginBtn"); b.disabled = true;
    try { await Auth.login($("#em").value.trim(), $("#pw").value); $("#pw").value = ""; showApp(); }
    catch { err("بيانات الدخول غير صحيحة."); }
    b.disabled = false;
  });
  $("#out").onclick = () => { Auth.tok = ""; Auth.exp = 0; try { sessionStorage.removeItem("loy_rt"); } catch { /* بلا تخزين */ } $("#res").hidden = true; showLogin(); };

  // ---- البحث والتسجيل ----
  let cur = null;
  async function lookup(code) {
    err(""); $("#res").hidden = true; cur = null;
    if (!Loy.okCode(code)) { err("الرمز غير صالح."); return; }
    try {
      const j = await staff(`/loyalty/c.json?orderBy=%22c%22&equalTo=%22${code}%22`, "GET");
      const e = Object.entries(j || {});
      if (!e.length) { err("لا توجد بطاقة بهذا الرمز."); return; }
      if (e.length > 1) { err("الرمز مكرر. اطلب من العميل إنشاء بطاقة جديدة."); return; }
      cur = { id: e[0][0], rec: Loy.clean(e[0][1]) };
      show();
    } catch (x) { if (x.message !== "auth") err("تعذّر البحث. تحقق من الاتصال وصلاحيات الحساب."); }
  }

  function show() {
    const r = cur.rec, N = cfg.target, free = r.v >= N;
    $("#res").hidden = false;
    $("#rName").textContent = r.n;
    let h = "";
    for (let i = 0; i < N; i++) h += `<span class="st ${i < r.v ? "on" : ""}">${i < r.v ? "✓" : i + 1}</span>`;
    h += `<span class="st gift ${free ? "on" : ""}">مجاني</span>`;
    $("#rStamps").innerHTML = h;
    $("#rStamps").style.gridTemplateColumns = `repeat(${Loy.cols(N + 1)},1fr)`;
    $("#rInfo").textContent = `الزيارات: ${r.t} · المجانية: ${r.f}` + (r.last ? " · آخر زيارة: " + new Date(r.last).toLocaleString("ar-IQ") : "");
    const a = $("#act"); a.disabled = false;
    a.textContent = free ? "تسليم المشروب المجاني" : "تسجيل زيارة";
  }

  $("#act").onclick = async () => {
    if (!cur) return;
    const a = $("#act"); a.disabled = true; err("");
    try {
      const raw = await Loy.get(d, cur.id);               // قراءة حديثة قبل الكتابة
      const fresh = Loy.clean(raw);
      if (!fresh) { err("البطاقة لم تعد موجودة."); return; }
      const now = Date.now();
      if (fresh.last && now - fresh.last < 3 * 36e5 && !confirm("سُجّلت زيارة لهذا العميل قبل أقل من 3 ساعات. تسجيل أخرى؟")) { cur.rec = fresh; show(); return; }
      const n = Loy.next(fresh, cfg.target, now);
      await staff(`/loyalty/c/${encodeURIComponent(cur.id)}.json`, "PATCH", n.patch);
      try { await staff("/loyalty/log.json", "POST", { id: cur.id, n: fresh.n, t: now, a: n.free ? "free" : "stamp" }); } catch { /* السجل ثانوي */ }
      cur.rec = Object.assign({}, fresh, n.patch);
      App.toast(n.free ? "تم تسليم المشروب المجاني" : "تم تسجيل الزيارة");
      show();
    } catch (x) { if (x.message !== "auth") err("تعذّر الحفظ. حاول مجدداً."); }
    finally { a.disabled = false; }
  };

  $("#manual").addEventListener("submit", (e) => { e.preventDefault(); lookup($("#code").value.trim().toUpperCase()); });

  // ---- الكاميرا ----
  let stream = null, timer = 0;
  function stopCam() { clearInterval(timer); timer = 0; if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } $("#cam").hidden = true; $("#scan").hidden = false; }
  $("#stop").onclick = stopCam;
  $("#scan").onclick = async () => {
    err("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { err("الكاميرا غير متاحة (يلزم HTTPS). استخدم إدخال الرمز."); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); }
    catch { err("لم يُسمح باستخدام الكاميرا. استخدم إدخال الرمز."); return; }
    const v = $("#vid"); v.srcObject = stream; await v.play().catch(() => {});
    $("#cam").hidden = false; $("#scan").hidden = true;
    const det = "BarcodeDetector" in window ? new BarcodeDetector({ formats: ["qr_code"] }) : null;
    const cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
    let busy = false;
    timer = setInterval(async () => {
      if (busy || !v.videoWidth) return;
      busy = true;
      try {
        let text = "";
        if (det) { const r = await det.detect(v); text = r[0] ? r[0].rawValue : ""; }
        else { cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0); const im = cx.getImageData(0, 0, cv.width, cv.height), q = jsQR(im.data, im.width, im.height); text = q ? q.data : ""; }
        const m = /^RC1:([A-HJ-NP-Z2-9]{8})$/.exec(text);
        if (m) { stopCam(); $("#code").value = m[1]; lookup(m[1]); }
      } catch { /* إطار غير صالح */ }
      busy = false;
    }, 300);
  };

  if (await Auth.refresh()) showApp(); else showLogin();
})();
