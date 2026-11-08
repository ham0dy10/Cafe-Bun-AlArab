/* Build a WhatsApp draft. The visitor sends it themselves; there is no backend. */
(function (app) {
  'use strict';
  function normalizePhone(value) {
    let phone = String(value).replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 1776)).replace(/[\s()+-]/g, '');
    if (phone.startsWith('00964')) phone = phone.slice(2);
    if (/^9647[3-9]\d{8}$/.test(phone)) phone = '0' + phone.slice(3);
    if (!/^07[3-9]\d{8}$/.test(phone)) throw new Error('اكتب رقم موبايل عراقي صحيح، مثل 07712345678.');
    return phone;
  }
  function validLocation(point) {
    return !!point && Number.isFinite(point.lat) && Math.abs(point.lat) <= 85 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
  }
  function locationLink(point) {
    if (!validLocation(point)) throw new Error('موقع التوصيل غير صحيح.');
    return `https://www.google.com/maps?q=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  }
  function money(n) { return new Intl.NumberFormat('en-US').format(n) + ' د.ع'; }
  function buildOrder({store, lines, fulfillment, customer, location}) {
    if (!store.orderingOpen) throw new Error('استقبال الطلبات متوقف مؤقتاً.');
    if (!/^[1-9]\d{7,14}$/.test(store.whatsapp)) throw new Error('رقم واتساب المحل غير صحيح.');
    if (!['delivery', 'pickup'].includes(fulfillment)) throw new Error('اختار طريقة الاستلام.');
    if (!Array.isArray(lines) || !lines.length || lines.length > 40) throw new Error('أضف أصناف للسلة أولاً.');
    const ids = new Set();
    for (const p of lines) {
      if (!app.Cart.orderable(p) || !Number.isInteger(p.qty) || p.qty < 1 || p.qty > 20 || ids.has(p.id)) throw new Error('راجع أصناف الطلب وكمياتها.');
      ids.add(p.id);
    }
    const name = String(customer.name || '').trim();
    const address = String(customer.address || '').trim();
    const notes = String(customer.notes || '').trim();
    if (name.length < 2 || name.length > 80) throw new Error('اكتب اسمك حتى نعرف صاحب الطلب.');
    const phone = normalizePhone(customer.phone || '');
    if (fulfillment === 'delivery' && (address.length < 5 || address.length > 400)) throw new Error('اكتب عنوان التوصيل أو أقرب نقطة دالة.');
    if (notes.length > 500) throw new Error('الملاحظات أطول من الحد المسموح.');
    if (fulfillment === 'delivery' && location && !validLocation(location)) throw new Error('اختار موقع صحيح على الخريطة.');
    if (!Number.isSafeInteger(store.deliveryFee) || store.deliveryFee < 0 || store.deliveryFee > 100000) throw new Error('أجرة التوصيل غير صحيحة.');
    const subtotal = lines.reduce((s, p) => s + p.price * p.qty, 0);
    const fee = fulfillment === 'delivery' ? store.deliveryFee : 0;
    const total = subtotal + fee;
    const text = [
      `طلب من ${store.name}`, '',
      ...lines.map(p => `${p.qty} × ${p.name} — ${money(p.price * p.qty)}`), '',
      `مجموع الأصناف: ${money(subtotal)}`, `التوصيل: ${money(fee)}`, `المجموع: ${money(total)}`, '',
      `الاسم: ${name}`, `رقم الهاتف: ${phone}`,
      fulfillment === 'delivery' ? `الطريقة: توصيل\nالعنوان: ${address}` : 'الطريقة: استلام من المحل',
      ...(fulfillment === 'delivery' && location ? [`موقع التوصيل: ${locationLink(location)}`] : []),
      ...(notes ? [`ملاحظات: ${notes}`] : []), '',
      'الدفع عند الاستلام. يرجى تأكيد الأصناف والأسعار والطلب.'
    ].join('\n');
    return {text, subtotal, fee, total, href: `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`};
  }
  app.WhatsApp = {normalizePhone, validLocation, locationLink, buildOrder};
})(window.Cafe = window.Cafe || {});
