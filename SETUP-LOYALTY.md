# إعداد نظام الولاء

1. **القواعد**: Firebase ← Realtime Database ← Rules، والصق محتوى `database.rules.json`. (قاعدة `orders` بقيت مفتوحة كما يعمل الموقع الآن.)
2. **حساب الكاشير**: Authentication ← فعّل Email/Password ← أنشئ مستخدماً ← انسخ UID. ثم في Realtime Database أضف يدوياً: `staff` ← `<UID>` = `true`.
3. **مفتاح الويب**: Project settings ← Web API Key. الصقه في لوحة المدير (حقل Firebase Web API Key).
4. **مفاتيح التنبيه**: نفّذ `npx web-push generate-vapid-keys`. العام ← لوحة المدير. الخاص ← GitHub Secret فقط.
5. **GitHub Secrets** (Settings ← Secrets ← Actions): `FIREBASE_SERVICE_ACCOUNT` (محتوى ملف JSON لمفتاح حساب الخدمة) · `FIREBASE_DB_URL` · `VAPID_PUBLIC` · `VAPID_PRIVATE` · `VAPID_SUBJECT` (مثل `mailto:you@mail.com`) · `SITE_URL` (مثل `https://lo-oxll.github.io/ScanMenu`).
6. **لوحة المدير**: اضبط قسم «نظام الولاء» (عدد الزيارات، الإحداثيات، النصوص) ← نزّل data.json وارفعه.
7. **QR للزبائن**: أنشئ QR للرابط `…/loyalty.html` واطبعه عند المدخل. الكاشير يفتح `…/stamp.html`.

للتجربة اليدوية للتنبيه اليومي: GitHub ← Actions ← loyalty-notify ← Run workflow.

المكتبات المرفقة: qrcode-generator 2.0.4 (MIT) وjsQR 1.4.0 (Apache-2.0).
