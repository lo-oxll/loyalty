// يُشغَّل يومياً (GitHub Actions): يرسل تنبيه الاشتياق لمن غاب أكثر من المدة المحددة، مرة واحدة لكل غياب.
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import * as webpush from "web-push";

const env = (k) => { const v = process.env[k]; if (!v) throw new Error("متغير ناقص: " + k); return v; };

initializeApp({ credential: cert(JSON.parse(env("FIREBASE_SERVICE_ACCOUNT"))), databaseURL: env("FIREBASE_DB_URL") });
webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC"), env("VAPID_PRIVATE"));

const res = await fetch(env("SITE_URL").replace(/\/+$/, "") + "/data.json", { cache: "no-store" });
if (!res.ok) throw new Error("تعذّر قراءة data.json: HTTP " + res.status);
const L = (await res.json()).loyalty || {};
const days = Number(L.absentDays) >= 1 && Number(L.absentDays) <= 365 ? Number(L.absentDays) : 14;
const title = String(L.absentTitle || "").trim().slice(0, 60) || "koroot ai agent";
const body = String(L.absentBody || "").trim().slice(0, 120) || "مشتاقين الك";

const db = getDatabase();
const [cs, ss] = await Promise.all([db.ref("loyalty/c").get(), db.ref("loyalty/sub").get()]);
const customers = cs.val() || {}, subs = ss.val() || {}, now = Date.now();
let sent = 0, skipped = 0, failed = 0;

for (const [id, c] of Object.entries(customers)) {
  const ref = Number(c.last) || Number(c.created) || 0;
  if (!ref || now - ref < days * 864e5) continue;       // لم يغب بعد
  if (Number(c.nt) > ref) { skipped++; continue; }      // أُرسل له تنبيه عن هذا الغياب
  if (typeof subs[id] !== "string") continue;           // لم يفعّل التنبيهات
  let sub;
  try { sub = JSON.parse(subs[id]); } catch { continue; }
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, tag: "miss" }), { TTL: 3 * 86400 });
    await db.ref(`loyalty/c/${id}/nt`).set(now);
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) await db.ref(`loyalty/sub/${id}`).remove(); // اشتراك منتهٍ
    else { failed++; console.error(id, e.statusCode || e.message); }
  }
}
console.log(`أُرسل: ${sent} · سبق إرساله: ${skipped} · فشل: ${failed}`);
process.exit(failed ? 1 : 0);
