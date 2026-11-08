# نشر نسخة بُن العرب التجريبية من حسابك على GitHub

المستودع على GitHub لحفظ الكود، والنشر من Cloudflare Pages المرتبط به. لم تُنشأ أي حسابات أو مستودعات أو مواقع خارجية بواسطة هذه الحزمة.

## الرقم التجريبي

طلبات الموقع مجهّزة للإرسال إلى **07761810425**، المحفوظ دولياً `9647761810425` في `public/data/menu.json` ضمن `store.whatsapp`. هذا مستقل عن رقم الاتصال الظاهر في قسم الفرع. فتح واتساب يجهّز الرسالة فقط؛ لازم تضغط «إرسال» داخل واتساب حتى تصل.

## 1. فك الضغط

فك ضغط الحزمة في مجلد جديد. افتح المجلد الذي يحتوي:

```
public/
  index.html
  css/
  js/
  data/menu.json
  assets/
README.md
Start-Preview.cmd
```

احتفظ بمجلد public بهذا الاسم؛ هو مجلد الموقع المعد للنشر. للتجربة المحلية شغّل Start-Preview.cmd وافتح http://127.0.0.1:5182/.

## 2. ارفع على GitHub

1. سجّل الدخول إلى https://github.com/.
2. افتح https://github.com/new.
3. اكتب Repository name: `cafe-website-color-trial`.
4. اختر Private إذا تريد كود المشروع يبقى خاصاً؛ Cloudflare Pages يدعم المستودعات الخاصة والعامة. خصوصية المستودع لا تجعل رابط الموقع المنشور خاصاً.
5. فعّل Add README ثم اضغط Create repository.
6. داخل المستودع اضغط Add file ثم Upload files.
7. اسحب المجلد `public` نفسه وملف `README.md` من الحزمة إلى نافذة الرفع. ارفع الملفات بعد فك الضغط.
8. اكتب وصفاً مثل `Upload cafe website test version`، واحفظ التغيير على main. إذا اقترحت الواجهة فرعاً جديداً، أكمل إنشاء Pull request ثم ادمجه إلى main.
9. تأكد أن صفحة المستودع تعرض `public`، وداخله `index.html` و`css` و`js` و`data` و`assets` مباشرة.

## 3. انشر من Cloudflare Pages

1. افتح https://dash.cloudflare.com/ وأنشئ حساباً أو سجّل الدخول، وأكمل تأكيد البريد إذا طُلب.
2. افتح Workers & Pages ثم Create application ثم Pages.
3. اختر Import an existing Git repository أو Connect to Git، ثم GitHub.
4. اختر حسابك، واسمح بالوصول إلى المستودع المحدد `cafe-website-color-trial` عبر Only select repositories.
5. اختر المستودع واضغط Begin setup.
6. أدخل الإعدادات:

| الإعداد | القيمة |
|---|---|
| Project name | cafe-website-color-trial، أو اسم متاح تختاره |
| Production branch | main |
| Framework preset | None |
| Build command | exit 0 |
| Build output directory | public |
| Root directory (advanced) | اتركه فارغاً |
| Environment variables | لا تحتاج إضافة متغيرات |

7. اضغط Save and Deploy وانتظر ظهور Success ثم افتح Visit site أو رابط Production.
8. سيظهر رابط شبيه `https://اسم-المشروع.pages.dev`. الرابط الذي يعرضه حسابك هو الرابط الفعلي؛ هذا مجرد مثال.

GitHub Pages ليس الاختيار المناسب لهذه النسخة ذات السلة والطلبات التجارية؛ توثيق GitHub يقيّد الاستضافة الموجّهة أساساً للمعاملات التجارية. ربط GitHub بخدمة Pages الخاصة بـCloudflare يبقي ملفاتك وتحديثاتك في حساب GitHub.

## 4. جرّب وصول رسالة واتساب

1. افتح رابط الموقع من الهاتف، ويفضل التجربة بحساب واتساب آخر حتى تشاهد الاستلام على الرقم التجريبي.
2. أضف صنفاً للسلة وحدد الكمية.
3. افتح السلة ثم إكمال الطلب. لاختبار سريع اختر استلام من المحل.
4. اكتب اسم ورقم طالب الطلب. هذا الحقل يخص الزبون؛ رقم استلام المحل مضبوط مسبقاً داخل الملف.
5. أكمل المراجعة واضغط تجهيز الطلب ثم فتح واتساب بالطلب.
6. تأكد أن المحادثة المستهدفة هي 07761810425، ثم اضغط إرسال داخل واتساب.
7. افحص وصول الرسالة إلى حساب WhatsApp المسجل بهذا الرقم. تحقق من تسجيل الرقم في واتساب إذا ظهرت رسالة أنه غير متوفر.
8. بعد نجاح الاستلام، جرّب التوصيل والعنوان وتحديد موقع تجريبي.

يمكن فحص الرقم بفتح https://wa.me/9647761810425. لم تُرسل أي رسالة آلية أثناء تجهيز الحزمة.

## 5. تعديل الموقع لاحقاً

- من GitHub افتح public/data/menu.json ثم زر القلم Edit.
- لتغيير مستقبل واتساب عدّل `store.whatsapp`. رقم المحل السابق هو `9647717777647` إذا أردت إرجاعه بعد الاختبار.
- الأسعار في products، وأوقات العمل في store.hours، وأجرة التوصيل في store.deliveryFee.
- احفظ Commit changes على main؛ يبدأ Cloudflare نشراً جديداً تلقائياً. انتظر Success ثم حدّث الموقع.
- عند تغيير الصور ارفع الملفات داخل public/assets/images وحدّث مساراتها داخل menu.json.

## إذا لم يعمل

- خطأ 404: تحقق أن Build output directory هو public، وأن public/index.html موجود في main.
- تصميم أو منيو مفقود: تحقق من رفع مجلدات css وjs وdata وassets كاملة تحت public؛ أسماء الملفات حساسة لحالة الأحرف.
- النسخة القديمة ظاهرة: تحقق من آخر Deployment ناجح، ثم جرّب تحديثاً كاملاً أو نافذة خاصة.
- تعذر تحديد الموقع: استخدم رابط HTTPS واسمح بالموقع عند الضغط على الزر؛ إدخال العنوان والإحداثيات متاح أيضاً.
- لم تصل رسالة واتساب: فتح المحادثة لا يرسل الرسالة؛ اضغط إرسال وتحقق من الرقم وحساب واتساب المستهدف.

## مصادر الخطوات

- رفع الملفات على GitHub: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- حدود استخدام GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- نشر HTML ثابت على Cloudflare Pages: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- الربط بمستودع GitHub: https://developers.cloudflare.com/pages/get-started/git-integration/
