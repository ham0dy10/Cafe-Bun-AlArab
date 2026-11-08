/* Load and render the editable catalog. All paths work under a GitHub Pages subfolder. */
(function (app) {
  'use strict';
  let products = [], category = 'الكل', query = '', expanded = false;
  let onProduct = () => {}, onAdd = () => {}, orderingOpen = true, quantityFor = () => 0;
  const normalize = value => String(value).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').toLowerCase().trim();

  function normalizeWhatsApp(value) {
    let phone = String(value ?? '').trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/[\s()+-]/g, '');
    if (phone.startsWith('00')) phone = phone.slice(2);
    if (/^07[3-9]\d{8}$/.test(phone)) phone = '964' + phone.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('رقم واتساب المحل غير صحيح. اكتب رقمك المحلي مثل 07761810425 أو الدولي مثل 9647761810425.');
    return phone;
  }

  function validate(data) {
    if (!data || !data.store || !Array.isArray(data.products)) throw new Error('ملف المنيو غير مكتمل.');
    const ids = new Set();
    const validProducts = data.products.map(p => {
      if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || typeof p.category !== 'string' || !p.name.trim() || !p.category.trim()) throw new Error('يوجد صنف غير صحيح أو مكرر في المنيو.');
      ids.add(p.id);
      if (p.price !== null && (!Number.isSafeInteger(p.price) || p.price < 0 || p.price > 1000000)) throw new Error('تأكد من أسعار الأصناف في ملف المنيو.');
      if (typeof p.image !== 'string' || !/^assets\/images\/[a-zA-Z0-9_.-]+$/.test(p.image)) throw new Error('مسار صورة أحد الأصناف غير صحيح.');
      return {...p, description: typeof p.description === 'string' ? p.description : '', visible: p.visible !== false, available: p.available !== false};
    });
    const s = {...data.store, whatsapp: normalizeWhatsApp(data.store.whatsapp)};
    if (typeof s.name !== 'string' || !/^[1-9]\d{7,14}$/.test(s.whatsapp) || !Number.isSafeInteger(s.deliveryFee) || s.deliveryFee < 0 || s.deliveryFee > 100000) throw new Error('إعدادات المحل أو أجرة التوصيل غير صحيحة.');
    if (!Number.isFinite(s.latitude) || Math.abs(s.latitude) > 85 || !Number.isFinite(s.longitude) || Math.abs(s.longitude) > 180) throw new Error('إحداثيات الفرع غير صحيحة.');
    if (typeof s.mapsUrl !== 'string' || !/^https:\/\/(maps\.app\.goo\.gl|maps\.google\.com|www\.google\.com)\//.test(s.mapsUrl)) throw new Error('رابط خريطة الفرع غير صحيح.');
    return {store: {...s, orderingOpen: s.orderingOpen !== false}, products: validProducts};
  }

  async function load() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('data/menu.json?v=20261108-iphone-01', {signal: controller.signal, cache: 'no-store'});
      if (!response.ok) throw new Error('تعذر تحميل المنيو. جرّب مرة ثانية.');
      return validate(await response.json());
    } catch (error) {
      if (location.protocol === 'file:') throw new Error('افتح الموقع من رابط المعاينة المحلية حتى يتحمّل المنيو. طريقة التشغيل موجودة بملف README.');
      if (error.name === 'AbortError') throw new Error('اتأخر تحميل المنيو. تأكد من اتصالك وجرّب مرة ثانية.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function render() {
    const categories = ['الكل', ...new Set(products.map(p => p.category))];
    const tabs = document.getElementById('menu-categories');
    tabs.replaceChildren(...categories.map(name => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name;
      button.className = category === name ? 'selected' : '';
      button.setAttribute('aria-pressed', String(category === name));
      button.addEventListener('click', () => { category = name; expanded = true; render(); });
      return button;
    }));
    const filtered = products.filter(p => (category === 'الكل' || category === p.category) && normalize(p.name + ' ' + p.description).includes(normalize(query)));
    const featured = categories.slice(1).flatMap(c => filtered.filter(p => p.category === c).slice(0, 2));
    const shown = expanded ? filtered : featured.slice(0, 8);
    const grid = document.getElementById('menu-products');
    grid.innerHTML = shown.map((p, i) => {
      const e = app.escape;
      const disabled = !app.Cart.orderable(p) || !orderingOpen;
      return `<article class="product"><button class="product-image" data-details="${e(p.id)}" aria-label="تفاصيل ${e(p.name)}"><img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy" width="400" height="420"><span class="product-number">${String(i + 1).padStart(2, '0')}</span>${!p.available ? '<span class="badge">غير متوفر حالياً</span>' : ''}<span class="image-arrow" aria-hidden="true"><svg class="arrow-icon arrow-nw" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 19 5 5M5 17V5h12"/></svg></span></button><div class="product-category">${e(p.category)}</div><h3><button data-details="${e(p.id)}">${e(p.name)}</button></h3><div class="product-foot"><span class="${p.price === null ? 'pending-price' : ''}">${e(app.money(p.price))}</span><button class="plus" data-add="${e(p.id)}" aria-label="أضف ${e(p.name)}" ${disabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v16M4 12h16"/></svg></button><span class="product-cart-quantity" data-product-count="${e(p.id)}" ${quantityFor(p.id) ? '' : 'hidden'}>في سلتك: <b>${quantityFor(p.id)}</b></span></div></article>`;
    }).join('');
    const state = document.getElementById('menu-state');
    state.textContent = !orderingOpen ? 'استقبال الطلبات متوقف مؤقتاً. تگدر تتصفح المنيو.' : !filtered.length ? 'ما لگينا صنف بهذا الاسم.' : '';
    state.hidden = !state.textContent;
    const all = document.getElementById('show-all');
    all.hidden = expanded || filtered.length <= 8;
    all.innerHTML = `شوف كل المنيو (${filtered.length}) <svg class="arrow-icon arrow-down" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>`;
    const note = document.getElementById('menu-note');
    note.textContent = products.some(p => p.price === null) ? 'بعض الأسعار قيد التحديث. يتاح طلب الصنف بعد اعتماد سعره. الصور الحالية توضيحية.' : 'الصور الحالية توضيحية لحين إضافة صور المنتجات النهائية.';
    note.hidden = false;
    app.Motion?.refresh(grid);
  }

  function init(data, handlers) {
    products = data.products.filter(p => p.visible);
    orderingOpen = data.store.orderingOpen;
    onProduct = handlers.onProduct; onAdd = handlers.onAdd; quantityFor = handlers.quantityFor;
    document.getElementById('menu-search').addEventListener('input', event => { query = event.target.value; expanded = true; render(); });
    document.getElementById('show-all').addEventListener('click', () => { expanded = true; render(); });
    document.getElementById('menu-products').addEventListener('click', event => {
      const details = event.target.closest('[data-details]');
      const add = event.target.closest('[data-add]');
      if (details) onProduct(products.find(p => p.id === details.dataset.details));
      if (add && !add.disabled) onAdd(products.find(p => p.id === add.dataset.add));
    });
    render();
  }
  function updateCounts() {
    document.querySelectorAll('[data-product-count]').forEach(el => {
      const qty = quantityFor(el.dataset.productCount);
      el.hidden = !qty; el.querySelector('b').textContent = qty;
    });
  }
  app.Menu = {load, validate, init, normalize, normalizeWhatsApp, updateCounts};
})(window.Cafe = window.Cafe || {});
