/* Only product IDs and quantities are stored locally. No customer information. */
(function (app) {
  'use strict';
  const KEY = 'alarab-static-cart-v1';
  const orderable = p => !!p && p.visible !== false && p.available !== false && Number.isSafeInteger(p.price) && p.price >= 0;

  function create(products, storage, onChange = () => {}) {
    const catalog = new Map(products.map(p => [p.id, p]));
    let items = [];
    try {
      const saved = JSON.parse(storage?.getItem(KEY) || '[]');
      const seen = new Set();
      if (Array.isArray(saved)) items = saved.filter(i => {
        if (!i || seen.has(i.id) || !orderable(catalog.get(i.id)) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20) return false;
        seen.add(i.id); return true;
      }).slice(0, 40).map(i => ({id: i.id, qty: i.qty}));
    } catch { /* Storage can be unavailable in private browsing. */ }

    function notify() {
      try { storage?.setItem(KEY, JSON.stringify(items)); } catch { /* The cart still works in memory. */ }
      onChange();
    }
    function add(id, qty = 1) {
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error("اختار كمية بين 1 و20.");
      if (!orderable(catalog.get(id))) throw new Error('هذا الصنف غير متاح للطلب حالياً.');
      const found = items.find(i => i.id === id);
      if (found) {
        if (found.qty + qty > 20) throw new Error('الحد الأعلى 20 قطعة من نفس الصنف.');
        found.qty += qty;
      } else {
        if (items.length >= 40) throw new Error('وصلت للحد الأعلى من الأصناف بالطلب.');
        items.push({id, qty});
      }
      notify();
    }
    function change(id, delta) {
      if (!Number.isInteger(delta) || Math.abs(delta) !== 1) return;
      items = items.map(i => i.id === id ? {...i, qty: Math.min(20, i.qty + delta)} : i).filter(i => i.qty > 0);
      notify();
    }
    function lines() { return items.map(i => ({...catalog.get(i.id), qty: i.qty})); }
    function summary(mode, fee) {
      if (!['delivery', 'pickup'].includes(mode) || !Number.isSafeInteger(fee) || fee < 0 || fee > 100000) throw new Error('إعدادات التوصيل غير صحيحة.');
      const subtotal = lines().reduce((sum, p) => sum + p.price * p.qty, 0);
      const deliveryFee = mode === 'pickup' ? 0 : fee;
      return {subtotal, fee: deliveryFee, total: subtotal + deliveryFee, count: items.reduce((sum, i) => sum + i.qty, 0)};
    }
    function clear() { items = []; notify(); }
    return {add, change, lines, summary, clear};
  }
  app.Cart = {create, orderable};
})(window.Cafe = window.Cafe || {});
