/* Page interactions, modal dialogs and customer delivery-location picker. */
(function (app) {
  'use strict';
  const $ = id => document.getElementById(id);
  app.escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  app.money = n => n === null ? 'بانتظار اعتماد السعر' : new Intl.NumberFormat('en-US').format(n) + ' د.ع';
  let store, cart, selectedProduct, locationPicker, customerLocation = null, returnToCheckout = false;
  let toastTimeout, mapLibraryPromise, productQuantity = 1, cartPage = 0, checkoutPanel = 'contact', messagePage = 0, messageLines = [];
  const dialogs = [...document.querySelectorAll('dialog')];

  // Reveal content once as it enters the screen. Content is visible without JS.
  app.Motion = (() => {
    const targets = '.hero-copy > *, #story > .section-no, #story > div:not(.intro-text), .intro-text > *, .section-top > *, #menu-categories, .product, .delivery-art, .delivery-copy > *, .visit-grid > div:first-child > *, .branch-map, .footer-top > *, .footer-bottom';
    const pending = new Set();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    function reveal(element) {
      element.classList.remove('reveal-pending');
      element.classList.add('reveal-done');
      pending.delete(element);
      observer?.unobserve(element);
    }
    try {
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
        }, {threshold: 0.06, rootMargin: '0px 0px -20px 0px'});
      }
    } catch { /* Unsupported observers leave all content visible. */ }
    function refresh(root = document) {
      for (const element of pending) {
        if (!element.isConnected) { observer?.unobserve(element); pending.delete(element); }
      }
      if (!observer || preference.matches) return;
      const groups = new Map();
      root.querySelectorAll(targets).forEach(element => {
        if (element.classList.contains('reveal-done') || pending.has(element)) return;
        const parent = element.parentElement;
        const index = groups.get(parent) || 0;
        groups.set(parent, index + 1);
        const columns = window.matchMedia('(max-width: 580px)').matches ? 2 : 4;
        element.style.setProperty('--reveal-delay', `${(index % columns) * 65}ms`);
        // A focused control must remain visible, including after filtering the menu.
        if (element.contains(document.activeElement)) { reveal(element); return; }
        element.classList.add('reveal-target', 'reveal-pending');
        pending.add(element); observer.observe(element);
      });
    }
    document.addEventListener('focusin', event => {
      const element = event.target.closest('.reveal-pending');
      if (element) reveal(element);
    });
    const updatePreference = () => {
      if (preference.matches) { for (const element of [...pending]) reveal(element); }
    };
    if (preference.addEventListener) preference.addEventListener('change', updatePreference);
    else if (preference.addListener) preference.addListener(updatePreference);
    return {refresh};
  })();


  function hideToast() {
    clearTimeout(toastTimeout);
    $('toast').hidden = true;
  }
  function toast(message, success = false) {
    clearTimeout(toastTimeout);
    $('toast-title').textContent = success ? 'تمت إضافته إلى سلتك' : 'تنبيه';
    $('toast-message').textContent = message;
    $('toast-success').hidden = !success;
    $('toast-view').hidden = !success;
    $('toast').hidden = false;
    toastTimeout = setTimeout(hideToast, 3000);
  }
  function syncScrollLock() { document.body.classList.toggle('modal-open', dialogs.some(d => d.open)); }
  function openDialog(dialog) {
    dialogs.filter(d => d.open && d !== dialog).forEach(d => d.close());
    if (!dialog.open) dialog.showModal();
    syncScrollLock();
  }
  dialogs.forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (dialog.id === 'product-dialog') {
        // Quantity and add controls stay interactive; other areas return to the menu.
        if (!event.target.closest('#product-add, [data-product-quantity]')) dialog.close();
        return;
      }
      if (dialog.id === 'developer-dialog' && !event.target.closest('a')) { dialog.close(); return; }
      if (event.target.closest('[data-close-dialog]')) dialog.close();
      // Ignore clicks inside the dialog's own padding; only close on the backdrop.
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', syncScrollLock);
  });

  function showStep(step) {
    ['cart', 'checkout', 'whatsapp'].forEach(name => { $(name + '-step').hidden = name !== step; });
    $('cart-dialog').setAttribute('aria-labelledby', step + '-title');
    if ($('cart-dialog').open) {
      $('cart-dialog').scrollTop = 0;
      const target = $(step + '-title');
      target.tabIndex = -1; target.focus({preventScroll: true});
    }
  }
  function mode() { return $('checkout-form').elements.fulfillment.value; }
  function updateTotals() {
    if (!cart) return;
    const total = cart.summary(mode(), store.deliveryFee);
    $('checkout-subtotal').textContent = app.money(total.subtotal);
    $('checkout-fee').textContent = app.money(total.fee);
    $('checkout-total').textContent = app.money(total.total);

    $('checkout-form').elements.address.required = mode() === 'delivery';
  }
  function renderCart() {
    if (!cart) return;
    const lines = cart.lines();
    const summary = cart.summary('pickup', store.deliveryFee);
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = summary.count; el.hidden = summary.count === 0; });
    $('cart-empty').hidden = !!lines.length;
    $('cart-summary').hidden = !lines.length;
    $('go-checkout').disabled = !store.orderingOpen || !lines.length;
    $('cart-subtotal').textContent = app.money(summary.subtotal);
    const e = app.escape;
    const pageSize = cartPageSize();
    const pages = Math.max(1, Math.ceil(lines.length / pageSize));
    cartPage = Math.min(cartPage, pages - 1);
    $('cart-pagination').hidden = pages < 2;
    $('cart-page').textContent = `${cartPage + 1} / ${pages}`;
    $('cart-previous').disabled = cartPage === 0;
    $('cart-next').disabled = cartPage === pages - 1;
    app.Menu.updateCounts();
    $('cart-lines').innerHTML = lines.slice(cartPage * pageSize, (cartPage + 1) * pageSize).map(p => `<div class="cart-row"><img src="${e(p.image)}" alt="" width="58" height="65"><div><b>${e(p.name)}</b><small>${e(app.money(p.price * p.qty))}</small></div><div class="qty"><button type="button" data-change="1" data-id="${e(p.id)}" aria-label="زيادة ${e(p.name)}" ${p.qty >= 20 ? 'disabled' : ''}>+</button><span>${p.qty}</span><button type="button" data-change="-1" data-id="${e(p.id)}" aria-label="تقليل ${e(p.name)}">−</button></div></div>`).join('');
    updateTotals();
  }
  function addProduct(product, qty = 1) {
    if (!cart || !product) return;
    try {
      if (!store.orderingOpen) throw new Error('استقبال الطلبات متوقف مؤقتاً.');
      cart.add(product.id, qty);
      $('product-dialog').close();
      toast(`${product.name} · الكمية في سلتك: ${quantityFor(product.id)}`, true);
    } catch (error) { toast(error.message); }
  }
  function productDetails(product) {
    if (!product) return;
    selectedProduct = product;
    productQuantity = 1; updateProductQuantity();
    $('product-image').src = product.image; $('product-image').alt = product.name;
    $('product-title').textContent = product.name;
    $('product-category').textContent = product.category;
    $('product-description').textContent = product.description;
    $('product-description').hidden = !product.description.trim();
    $('product-price').textContent = app.money(product.price);
    $('product-add').disabled = !app.Cart.orderable(product) || !store.orderingOpen;
    $('product-add').textContent = product.price === null ? 'يُتاح الطلب بعد اعتماد السعر' : !product.available ? 'غير متوفر حالياً' : !store.orderingOpen ? 'الطلبات متوقفة مؤقتاً' : 'أضف إلى طلبك +';
    updateProductQuantity();
    openDialog($('product-dialog'));
  }
  function quantityFor(id) { return cart?.lines().find(p => p.id === id)?.qty || 0; }
  function cartPageSize() { return window.innerHeight < 540 ? 1 : window.innerHeight < 740 ? 2 : 3; }
  function updateProductQuantity() {
    const remaining = Math.max(0, 20 - quantityFor(selectedProduct.id));
    productQuantity = Math.min(productQuantity, remaining);
    $('product-quantity').value = productQuantity;
    $('product-increase').disabled = productQuantity >= remaining;
    $('product-decrease').disabled = productQuantity <= 1;
    $('product-price').textContent = app.money(selectedProduct.price * productQuantity);
    $('product-add').disabled = !remaining || !app.Cart.orderable(selectedProduct) || !store.orderingOpen;
  }
  const checkoutTitles = {contact: 'شلون نتواصل وياك؟', address: 'وين نوصّل مزاجك؟', review: 'راجع تفاصيل طلبك.'};
  function showCheckoutPanel(panel) {
    checkoutPanel = panel;
    document.querySelectorAll('[data-checkout-panel]').forEach(el => { el.hidden = el.dataset.checkoutPanel !== panel; });
    $('checkout-title').textContent = checkoutTitles[panel];
    const steps = mode() === 'delivery' ? ['contact', 'address', 'review'] : ['contact', 'review'];
    $('checkout-progress').textContent = `الخطوة ${steps.indexOf(panel) + 1} من ${steps.length}`;
    $('back-to-cart').innerHTML = panel === 'contact' ? '<svg class="arrow-icon arrow-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg> الرجوع للسلة' : '<svg class="arrow-icon arrow-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg> الخطوة السابقة';
    $('checkout-next').hidden = panel === 'review';
    $('checkout-submit').hidden = panel !== 'review';
    $('checkout-error').hidden = true;
    updateTotals();
  }
  function validatePanel(panel) {
    const fields = panel === 'contact' ? ['name', 'phone'] : ['address'];
    for (const name of fields) {
      const input = $('checkout-form').elements[name];
      let message = '';
      if (name === 'phone') { try { app.WhatsApp.normalizePhone(input.value); } catch (error) { message = error.message; } }
      else if (input.value.trim().length < (name === 'name' ? 2 : 5)) message = name === 'name' ? 'اكتب اسمك حتى نعرف صاحب الطلب.' : 'اكتب عنوان التوصيل أو أقرب نقطة دالة.';
      if (message || !input.validity.valid) {
        showCheckoutPanel(panel);
        $('checkout-error').textContent = message || 'راجع الحقل وأكمل البيانات.';
        $('checkout-error').hidden = false; input.focus({preventScroll: true}); return false;
      }
    }
    return true;
  }
  function nextCheckoutPanel() {
    if (!validatePanel(checkoutPanel)) return;
    showCheckoutPanel(checkoutPanel === 'contact' && mode() === 'delivery' ? 'address' : 'review');
  }
  $('checkout-next').addEventListener('click', nextCheckoutPanel);
  $('checkout-form').elements.fulfillment.forEach(input => input.addEventListener('change', () => showCheckoutPanel('contact')));
  function renderMessage() {
    // Paginate visual lines too, so long notes and product names cannot overflow.
    const size = window.innerHeight < 540 ? 2 : window.innerHeight < 740 ? 3 : 6;
    const preview = $('whatsapp-preview'), style = getComputedStyle(preview);
    const bodyStyle = getComputedStyle($('cart-dialog').querySelector('.modal-body'));
    const width = Math.max(80, ($('cart-dialog').clientWidth || Math.min(520, innerWidth - 24)) - parseFloat(bodyStyle.paddingLeft) - parseFloat(bodyStyle.paddingRight) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 6);
    const measure = document.createElement('canvas').getContext('2d'); measure.font = style.font;
    const visualLines = messageLines.flatMap(line => {
      const parts = []; let rest = line;
      while (measure.measureText(rest).width > width) {
        let end = 1;
        while (end < rest.length && measure.measureText(rest.slice(0, end + 1)).width <= width) end++;
        const space = rest.lastIndexOf(' ', end);
        if (space > 0) end = space;
        parts.push(rest.slice(0, end)); rest = rest.slice(end).trimStart();
      }
      parts.push(rest); return parts;
    });
    const pages = Math.max(1, Math.ceil(visualLines.length / size));
    messagePage = Math.max(0, Math.min(messagePage, pages - 1));
    $('whatsapp-preview').textContent = visualLines.slice(messagePage * size, (messagePage + 1) * size).join('\n');
    $('message-page').textContent = `${messagePage + 1} / ${pages}`;
    $('message-previous').disabled = messagePage === 0;
    $('message-next').disabled = messagePage === pages - 1;
  }

  function updateCustomerLocation(point) {
    customerLocation = point ? {...point} : null;
    $('checkout-location-status').textContent = point ? 'اعتمدت موقعك. ينضاف رابط المكان برسالة الطلب.' : 'أضف موقعك حتى يوصل الطلب بسهولة.';
    $('delivery-location-status').textContent = point ? '✓ موقع التوصيل جاهز وينضاف لطلبك.' : '';
    $('checkout-location-link').hidden = !point;
    $('remove-location').hidden = !point;
    if (point) $('checkout-location-link').href = app.WhatsApp.locationLink(point);
    else $('checkout-location-link').removeAttribute('href');
  }

  // Lazy-load stable Leaflet 1.9.4 only when the visitor opens the location map.
  function loadMapLibrary() {
    if (window.L) return Promise.resolve(window.L);
    if (mapLibraryPromise) return mapLibraryPromise;
    mapLibraryPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = 'anonymous';
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; script.crossOrigin = 'anonymous';
      let jsReady = false, cssReady = false, finished = false;
      const timer = setTimeout(() => fail(), 15000);
      function fail() {
        if (finished) return;
        finished = true; clearTimeout(timer); script.remove(); css.remove();
        reject(new Error('تعذر تحميل الخريطة. تگدر تستخدم موقعك الحالي أو تدخل الإحداثيات.'));
      }
      function loaded() {
        if (!finished && jsReady && cssReady) {
          finished = true; clearTimeout(timer); resolve(window.L);
        }
      }
      css.onload = () => { cssReady = true; loaded(); }; css.onerror = fail;
      script.onload = () => { jsReady = true; loaded(); }; script.onerror = fail;
      document.head.append(css, script);
    }).catch(error => { mapLibraryPromise = null; throw error; });
    return mapLibraryPromise;
  }

  class LocationPicker {
    constructor(settings) {
      this.store = settings; this.map = null; this.marker = null; this.pending = null;
      this.active = false; this.version = 0; this.geoVersion = 0;
      $('locate-me').addEventListener('click', () => this.locate());
      $('apply-coordinates').addEventListener('click', () => {
        const lat = $('location-lat').value.trim(), lng = $('location-lng').value.trim();
        if (!lat || !lng || !app.WhatsApp.validLocation({lat: Number(lat), lng: Number(lng)})) {
          this.feedback('اكتب خط عرض بين -85 و85 وخط طول بين -180 و180.', true); return;
        }
        this.setPoint({lat: Number(lat), lng: Number(lng)}, true);
      });
      $('confirm-location').addEventListener('click', () => {
        if (!app.WhatsApp.validLocation(this.pending)) return;
        updateCustomerLocation(this.pending); $('location-dialog').close();
      });
    }
    feedback(message, error = false) {
      $('location-feedback').textContent = message;
      $('location-feedback').classList.toggle('is-error', error);
    }
    async open(saved) {
      this.active = true; const version = ++this.version; this.geoVersion++;
      this.pending = null;
      $('location-lat').value = ''; $('location-lng').value = '';
      $('selected-coordinates').hidden = true; $('confirm-location').disabled = true;
      $('locate-me').disabled = false; $('locate-me-label').textContent = 'استخدم موقعي الحالي';
      if (this.marker && this.map) { this.map.removeLayer(this.marker); this.marker = null; }
      this.feedback('نحمّل الخريطة…');
      if (saved) this.setPoint(saved, false);
      try {
        const L = await loadMapLibrary();
        if (!this.active || version !== this.version) return;
        if (!this.map) {
          this.map = L.map('location-map', {scrollWheelZoom: false, maxZoom: 19, minZoom: 2, worldCopyJump: true});
          const tileUrl = /^https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png$/.test(this.store.tileUrl || '') ? this.store.tileUrl : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
          const tiles = L.tileLayer(tileUrl, {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(this.map);
          tiles.on('tileerror', () => { if (this.active) this.feedback('بعض أجزاء الخريطة ما اتحمّلت. تگدر تستخدم موقعك الحالي أو تدخل الإحداثيات.', true); });
          L.circleMarker([this.store.latitude, this.store.longitude], {radius: 7, color: '#1B0404', fillColor: '#DCB192', fillOpacity: 1}).addTo(this.map).bindTooltip('فرع بُن العَرب');
          this.map.on('click', event => this.setPoint(event.latlng, false));
          this.map.getContainer().addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target === this.map.getContainer()) {
              event.preventDefault(); this.setPoint(this.map.getCenter(), false);
            }
          });
        }
        this.map.invalidateSize();
        this.map.setView(this.pending ? [this.pending.lat, this.pending.lng] : [this.store.latitude, this.store.longitude], this.pending ? 17 : 14, {animate: false});
        if (this.pending) this.drawMarker();
        this.feedback(this.pending ? 'تأكد من مكان العلامة، وبعدين اعتمد الموقع.' : 'المس مكانك على الخريطة. الدائرة الصغيرة تمثل فرع بُن العَرب.');
      } catch (error) {
        if (this.active && version === this.version) this.feedback(error.message, true);
      }
    }
    setPoint(point, center) {
      if (!this.active) return;
      // Leaflet may report a wrapped longitude when the map is dragged across worlds.
      const normalized = {lat: Number(point.lat), lng: ((Number(point.lng) + 180) % 360 + 360) % 360 - 180};
      if (!app.WhatsApp.validLocation(normalized)) { this.feedback('هذا المكان خارج حدود الخريطة. اختار مكان ثاني.', true); return; }
      this.geoVersion++; this.pending = normalized;
      $('locate-me').disabled = false; $('locate-me-label').textContent = 'استخدم موقعي الحالي';
      $('location-lat').value = normalized.lat.toFixed(6); $('location-lng').value = normalized.lng.toFixed(6);
      $('selected-coordinates').hidden = false;
      $('selected-coordinates').textContent = `${normalized.lat.toFixed(6)}, ${normalized.lng.toFixed(6)}`;
      $('confirm-location').disabled = false;
      if (this.map) { this.drawMarker(); if (center) this.map.setView([normalized.lat, normalized.lng], 17); }
      this.feedback('تأكد من مكان العلامة، وبعدين اضغط «اعتماد هذا الموقع».');
    }
    drawMarker() {
      const L = window.L;
      if (!this.map || !this.pending || !L) return;
      if (this.marker) this.marker.setLatLng(this.pending);
      else {
        const icon = L.divIcon({className: 'customer-pin', html: '<span aria-hidden="true"></span>', iconSize: [32, 42], iconAnchor: [16, 42]});
        this.marker = L.marker(this.pending, {draggable: true, icon, title: 'موقع التوصيل، اسحب لتغييره', alt: 'موقع التوصيل'}).addTo(this.map);
        this.marker.on('dragend', () => this.setPoint(this.marker.getLatLng(), false));
      }
    }
    locate() {
      if (!this.active) return;
      if (!window.isSecureContext) { this.feedback('تحديد الموقع الحالي يحتاج رابط HTTPS أو المعاينة المحلية. تگدر تختار مكانك على الخريطة.', true); return; }
      if (!navigator.geolocation) { this.feedback('متصفحك ما يدعم تحديد الموقع. حدّد مكانك على الخريطة.', true); return; }
      const version = ++this.geoVersion;
      $('locate-me').disabled = true; $('locate-me-label').textContent = 'نحدّد موقعك…';
      this.feedback('اسمح للمتصفح باستخدام موقعك إذا تريد تحديده تلقائياً.');
      navigator.geolocation.getCurrentPosition(position => {
        if (!this.active || version !== this.geoVersion) return;
        this.setPoint({lat: position.coords.latitude, lng: position.coords.longitude}, true);
      }, error => {
        if (!this.active || version !== this.geoVersion) return;
        $('locate-me').disabled = false; $('locate-me-label').textContent = 'استخدم موقعي الحالي';
        this.feedback(error.code === 1 ? 'صلاحية الموقع مو مفعلة. تگدر تحدده بلمسة على الخريطة.' : error.code === 3 ? 'تأخر تحديد الموقع. جرّب مرة ثانية أو اختار مكانك على الخريطة.' : 'ما قدرنا نحدد موقعك الحالي. اختار مكانك على الخريطة.', true);
      }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
    }
    close() { this.active = false; this.version++; this.geoVersion++; }
  }
  // Exposed for focused tests with a fake geolocation provider; never requests location on load.
  app.LocationPicker = LocationPicker;

  document.querySelectorAll('[data-open-developer]').forEach(button => button.addEventListener('click', () => {
    hideToast();
    openDialog($('developer-dialog'));
  }));

  document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => {
    hideToast();
    showStep('cart'); renderCart(); openDialog($('cart-dialog'));
  }));
  document.querySelectorAll('[data-open-location]').forEach(button => button.addEventListener('click', () => {
    if (!locationPicker) { toast('انتظر تحميل المنيو، وبعدها حدّد مكانك.'); return; }
    returnToCheckout = $('cart-dialog').open && !$('checkout-step').hidden;
    openDialog($('location-dialog')); locationPicker.open(customerLocation);
  }));
  $('location-dialog').addEventListener('close', () => {
    locationPicker?.close();
    if (returnToCheckout) { returnToCheckout = false; openDialog($('cart-dialog')); }
  });
  $('product-increase').addEventListener('click', () => { productQuantity = Math.min(20 - quantityFor(selectedProduct.id), productQuantity + 1); updateProductQuantity(); });
  $('product-decrease').addEventListener('click', () => { productQuantity = Math.max(1, productQuantity - 1); updateProductQuantity(); });
  $('location-dialog').querySelector('.coordinate-details').addEventListener('toggle', event => { if (!event.target.open) locationPicker?.map?.invalidateSize(); });
  $('product-add').addEventListener('click', () => addProduct(selectedProduct, productQuantity));
  $('cart-previous').addEventListener('click', () => { cartPage--; renderCart(); });
  $('cart-next').addEventListener('click', () => { cartPage++; renderCart(); });
  $('message-previous').addEventListener('click', () => { messagePage--; renderMessage(); });
  $('message-next').addEventListener('click', () => { messagePage++; renderMessage(); });
  window.addEventListener('resize', () => { renderCart(); renderMessage(); });
  $('cart-lines').addEventListener('click', event => {
    const button = event.target.closest('[data-change]');
    if (button && cart) cart.change(button.dataset.id, Number(button.dataset.change));
  });
  $('browse-menu').addEventListener('click', () => { $('cart-dialog').close(); window.location.hash = 'menu'; });
  $('go-checkout').addEventListener('click', () => { if (cart?.lines().length && store.orderingOpen) { updateTotals(); showCheckoutPanel('contact'); showStep('checkout'); } });
  $('back-to-cart').addEventListener('click', () => {
    if (checkoutPanel === 'contact') showStep('cart');
    else showCheckoutPanel(checkoutPanel === 'review' && mode() === 'delivery' ? 'address' : 'contact');
  });
  $('edit-order').addEventListener('click', () => { showCheckoutPanel('contact'); showStep('checkout'); });
  $('remove-location').addEventListener('click', () => updateCustomerLocation(null));
  $('checkout-form').elements.fulfillment.forEach(input => input.addEventListener('change', updateTotals));
  $('clear-order').addEventListener('click', () => {
    cart?.clear(); $('checkout-form').reset(); updateCustomerLocation(null);
    messageLines = []; renderMessage(); $('whatsapp-send').removeAttribute('href');
    showStep('cart'); updateTotals();
  });
  $('checkout-form').addEventListener('submit', event => {
    event.preventDefault();
    if (checkoutPanel !== 'review') { nextCheckoutPanel(); return; }
    if (!validatePanel('contact') || (mode() === 'delivery' && !validatePanel('address'))) return;
    $('checkout-error').hidden = true;
    try {
      if (!cart) throw new Error('انتظر تحميل المنيو أولاً.');
      const data = new FormData(event.currentTarget);
      const draft = app.WhatsApp.buildOrder({store, lines: cart.lines(), fulfillment: mode(), customer: {name: data.get('name'), phone: data.get('phone'), address: data.get('address'), notes: data.get('notes')}, location: customerLocation});
      messageLines = draft.text.split('\n'); messagePage = 0; renderMessage(); $('whatsapp-send').href = draft.href;
      showStep('whatsapp');
    } catch (error) { $('checkout-error').textContent = error.message; $('checkout-error').hidden = false; }
  });

  async function start() {
    $('retry-menu').hidden = true;
    $('menu-state').hidden = false; $('menu-state').textContent = 'نحضّر المنيو…';
    try {
      const data = await app.Menu.load(); store = data.store;
      let storage; try { storage = window.localStorage; } catch { storage = null; }
      cart = app.Cart.create(data.products, storage, renderCart);
      app.Menu.init(data, {onProduct: productDetails, onAdd: addProduct, quantityFor});
      locationPicker = new LocationPicker(store);
      document.querySelectorAll('[data-tagline]').forEach(el => { el.textContent = store.tagline; });
      document.querySelectorAll('[data-delivery-fee]').forEach(el => { el.textContent = app.money(store.deliveryFee); });
      document.querySelectorAll('[data-store-address]').forEach(el => { el.textContent = store.address; });
      document.querySelectorAll('[data-branch-link]').forEach(el => { el.href = store.mapsUrl; });
      document.querySelectorAll('[data-store-phone]').forEach(el => { el.textContent = store.phone; el.href = 'tel:' + String(store.phone).replace(/[^+\d]/g, ''); });
      $('store-hours').textContent = typeof store.hours === 'string' && store.hours.trim() ? store.hours.trim() : 'قيد التحديث';
      $('store-hours').hidden = false;

      renderCart();
    } catch (error) {
      $('menu-state').textContent = error.message || 'تعذر تحميل المنيو.'; $('menu-state').hidden = false;
      $('retry-menu').hidden = false;
    }
  }
  $('load-branch-map').addEventListener('click', () => {
    if (!store) { toast('انتظر تحميل بيانات الفرع، وبعدها افتح الخريطة.'); return; }
    $('branch-map').src = `https://maps.google.com/maps?q=${store.latitude},${store.longitude}&z=17&hl=ar&output=embed`;
    $('branch-map').hidden = false;
    $('load-branch-map').hidden = true;
  });
  $('retry-menu').addEventListener('click', start);
  $('year').textContent = new Date().getFullYear();
  app.Motion.refresh();
  start();
})(window.Cafe = window.Cafe || {});
