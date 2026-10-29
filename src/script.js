/* =====================================================
   BiTel / Bitelicious - script.js
   Keranjang, form pemesanan, dan order via WhatsApp
   Mendukung desktop dan HP (Android / iOS)
   ===================================================== */
(() => {
  'use strict';

  // ====== PENGATURAN (ubah di sini) ======
  // Format 62xxxxxxxxxx (tanpa +, tanpa 0 di depan)
  const WA_NUMBER = '6282398070323';
  const STORAGE_KEY = 'bitelicious_cart_v1';

  // Kunci harus sama dengan yang dipakai di data-product-control="..."
  const PRODUCTS = {
    'lumpia-orig':    { name: 'Lumpia Ubi Ungu Original',      price: 11000 },
    'lumpia-keju':    { name: 'Lumpia Ubi Ungu Keju',          price: 13000 },
    'lumpia-cokelat': { name: 'Lumpia Ubi Ungu Cokelat',       price: 13000 },
    'teh-violet':     { name: 'Teh Telang Violet Galaxy',      price: 7000 },
    'teh-blue':       { name: 'Teh Telang Blue Ocean',         price: 9000 },
    'bundle-1':       { name: 'Paket Dopping',                 price: 15000 },
    'bundle-2':       { name: 'Paket Paradise',                price: 16000 },
  };
  // =======================================

  const MAX_QTY = 99;
  const $ = (id) => document.getElementById(id);
  const rupiah = (n) => 'Rp' + n.toLocaleString('id-ID');

  /* ---------- State keranjang (tersimpan di localStorage) ---------- */
  let cart = loadCart(); // { productId: qty }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const clean = {};
      Object.keys(raw).forEach((id) => {
        const q = Number(raw[id]);
        if (PRODUCTS[id] && Number.isInteger(q) && q > 0) clean[id] = Math.min(q, MAX_QTY);
      });
      return clean;
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* abaikan */ }
  }

  /* ---------- Toast kecil ---------- */
  let toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.className =
        'fixed left-1/2 -translate-x-1/2 bottom-6 z-[100] px-4 py-2.5 rounded-2xl ' +
        'bg-purple-600 text-white text-sm font-bold shadow-xl shadow-purple-900/50 ' +
        'transition-all duration-300 opacity-0 translate-y-4 pointer-events-none';
      toastEl.style.marginBottom = 'env(safe-area-inset-bottom, 0px)';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.remove('opacity-0', 'translate-y-4');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('opacity-0', 'translate-y-4'), 1600);
  }

  /* ---------- Render Tombol Produk di Katalog ---------- */
  function renderProductControls() {
    document.querySelectorAll('[data-product-control]').forEach((el) => {
      const id = el.dataset.productControl;
      if (!PRODUCTS[id]) return;

      const qty = cart[id] || 0;

      if (qty > 0) {
        el.innerHTML = `
          <div class="flex items-center gap-1.5 bg-purple-600 text-white rounded-xl px-2 py-1 shadow-md shadow-purple-600/30">
            <button type="button" onclick="changeQty('${id}', -1)" aria-label="Kurangi"
              class="w-6 h-6 flex items-center justify-center font-extrabold hover:bg-purple-700 rounded-lg active:scale-90 transition text-sm">−</button>
            <span class="text-xs font-black px-1.5">${qty}</span>
            <button type="button" onclick="changeQty('${id}', 1)" aria-label="Tambah"
              class="w-6 h-6 flex items-center justify-center font-extrabold hover:bg-purple-700 rounded-lg active:scale-90 transition text-sm">+</button>
          </div>
        `;
      } else {
        el.innerHTML = `
          <button type="button" onclick="addToCart('${id}')" 
            class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition">
            <span>+</span> Tambah
          </button>
        `;
      }
    });
  }

  /* ---------- Fungsi keranjang ---------- */
  function addToCart(id) {
    if (!PRODUCTS[id]) return;
    cart[id] = Math.min((cart[id] || 0) + 1, MAX_QTY);
    saveCart();
    renderCart();
    renderProductControls();
    bumpBadge();
    toast('✓ ' + PRODUCTS[id].name + ' ditambahkan');
  }

  function changeQty(id, delta) {
    if (!cart[id] && delta > 0) {
      addToCart(id);
      return;
    }
    if (!cart[id]) return;

    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    if (cart[id] > MAX_QTY) cart[id] = MAX_QTY;

    saveCart();
    renderCart();
    renderProductControls();
  }

  function removeItem(id) {
    delete cart[id];
    saveCart();
    renderCart();
    renderProductControls();
  }

  function cartEntries() {
    return Object.keys(cart).map((id) => ({
      id,
      name: PRODUCTS[id].name,
      price: PRODUCTS[id].price,
      qty: cart[id],
    }));
  }

  function cartTotals() {
    const items = cartEntries();
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((t, i) => t + i.price * i.qty, 0),
    };
  }

  function bumpBadge() {
    const badge = $('cart-count-badge');
    if (!badge) return;
    badge.classList.add('scale-125');
    setTimeout(() => badge.classList.remove('scale-125'), 200);
  }

  function renderCart() {
    const { items, count, total } = cartTotals();

    const badge = $('cart-count-badge');
    if (badge) badge.textContent = count;
    const countText = $('cart-item-count-text');
    if (countText) countText.textContent = count + ' Item';
    const totalEl = $('cart-total-price');
    if (totalEl) totalEl.textContent = rupiah(total);

    const box = $('cart-items-container');
    if (!box) return;

    if (!items.length) {
      box.innerHTML =
        '<p class="rounded-2xl border border-dashed border-purple-500/40 p-5 text-center text-sm text-purple-300/80">' +
        'Keranjangmu masih kosong.<br>Pilih menu favoritmu dulu ya 💜</p>';
      return;
    }

    box.innerHTML = items.map((i) => `
      <div class="flex items-center gap-3 rounded-2xl bg-purple-900/40 border border-purple-500/20 p-3" data-id="${i.id}">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-white leading-snug">${i.name}</p>
          <p class="text-xs text-purple-300">${rupiah(i.price)} × ${i.qty} = <span class="font-bold text-pink-300">${rupiah(i.price * i.qty)}</span></p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button type="button" data-action="dec" aria-label="Kurangi ${i.name}"
            class="h-9 w-9 rounded-xl bg-purple-800 text-white font-bold active:scale-90 transition">−</button>
          <span class="w-6 text-center text-sm font-bold text-white">${i.qty}</span>
          <button type="button" data-action="inc" aria-label="Tambah ${i.name}"
            class="h-9 w-9 rounded-xl bg-purple-600 text-white font-bold active:scale-90 transition">+</button>
          <button type="button" data-action="del" aria-label="Hapus ${i.name}"
            class="ml-1 h-9 w-9 rounded-xl bg-red-500/20 text-red-300 active:scale-90 transition">🗑</button>
        </div>
      </div>`).join('');
  }

  // ---------- Reset setelah kembali dari WhatsApp ----------
  const PENDING_ORDER_KEY = 'bitelicious_pending_order';

  function resetAfterWhatsAppReturn() {
    if (sessionStorage.getItem(PENDING_ORDER_KEY) !== '1') {
      return;
    }

    sessionStorage.removeItem(PENDING_ORDER_KEY);

    const sudahDikirim = window.confirm(
      'Apakah pesanan kamu sudah berhasil dikirim melalui WhatsApp?\n\n' +
      'Pilih OK untuk mengosongkan keranjang dan kembali ke Beranda.'
    );

    if (!sudahDikirim) {
      return;
    }

    cart = {};
    saveCart();
    renderCart();
    renderProductControls();

    const form = $('order-form');
    if (form) form.reset();

    clearError();
    syncAddress();

    window.location.hash = 'beranda';
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    toast('Pesanan selesai. Keranjang berhasil dikosongkan 💜');
  }

  function initWhatsAppReturnHandler() {
    window.addEventListener('pageshow', resetAfterWhatsAppReturn);
    window.addEventListener('focus', resetAfterWhatsAppReturn);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        resetAfterWhatsAppReturn();
      }
    });
  }

  /* ---------- Menu mobile (hamburger) ---------- */
  function initMobileMenu() {
    const btn = $('mobile-menu-btn');
    const menu = $('mobile-menu');
    if (!btn || !menu) return;

    const setOpen = (open) => {
      menu.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'mobile-menu');

    btn.addEventListener('click', () => setOpen(menu.classList.contains('hidden')));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 768) setOpen(false); });
  }

  /* ---------- Metode pesanan: tampil/sembunyi alamat ---------- */
  function currentMethod() {
    const r = document.querySelector('input[name="order-method"]:checked');
    return r ? r.value : 'Diantar';
  }

  function syncAddress() {
    const wrap = $('address-container');
    if (!wrap) return;
    wrap.classList.toggle('hidden', currentMethod() !== 'Diantar');
  }

  /* ---------- Validasi & kirim ke WhatsApp ---------- */
  function normalizePhone(raw) {
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('0')) d = '62' + d.slice(1);
    else if (d.startsWith('8')) d = '62' + d;
    return d;
  }

  function showError(msg) {
    const el = $('form-error-msg');
    if (!el) return alert(msg);
    el.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    const el = $('form-error-msg');
    if (el) el.classList.add('hidden');
  }

function buildMessage(data) {
    const { items, total } = cartTotals();

    const daftar = items
        .map((i) => `- ${i.name} x${i.qty} (${rupiah(i.price * i.qty)})`)
        .join('\n');

    const metode = data.method === 'Diantar'
        ? `Diantar\nAlamat: ${data.address}`
        : 'Ambil Sendiri';

    let msg =
        `Nama Pemesan: ${data.name}\n` +
        `No Telp: ${data.phone}\n` +
        `Diantar/Ambil: ${metode}\n` +
        `Metode Pembayaran: ${data.payment}\n` +
        `Pesanannya apa aja:\n${daftar}\n` +
        `Total: ${rupiah(total)}`;

    if (data.notes) {
        msg += `\nCatatan: ${data.notes}`;
    }

    return msg;
}


  function openWhatsApp(message) {
    const url =
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    sessionStorage.setItem(PENDING_ORDER_KEY, '1');

    if (isMobile) {
      window.location.href = url;
    } else {
      const whatsappWindow = window.open(url, '_blank');
      if (!whatsappWindow) {
        window.location.href = url;
      }
    }
  }


function submitOrder() {
    clearError();

    const name = $('customer-name').value.trim();
    const phoneRaw = $('customer-phone').value.trim();
    const phone = normalizePhone(phoneRaw);
    const method = currentMethod();
    const address = $('customer-address').value.trim();
    const notes = $('customer-notes').value.trim();

    // Ambil metode pembayaran yang dipilih
    const paymentElement = document.querySelector(
        'input[name="payment-method"]:checked'
    );

    if (!paymentElement) {
        return showError('Pilih metode pembayaran terlebih dahulu.');
    }

    const payment = paymentElement.value;

    // Validasi pesanan
    if (!cartTotals().items.length) {
        return showError('Keranjang masih kosong. Pilih menu dulu ya.');
    }

    if (name.length < 2) {
        $('customer-name').focus();
        return showError('Nama pemesan wajib diisi.');
    }

    if (phone.length < 10 || phone.length > 15) {
        $('customer-phone').focus();
        return showError('Nomor telepon tidak valid. Contoh: 08123456789');
    }

    if (method === 'Diantar' && address.length < 5) {
        $('customer-address').focus();
        return showError('Alamat pengantaran wajib diisi jika memilih Diantar.');
    }

    // Kirim pesanan beserta metode pembayaran ke WhatsApp
    openWhatsApp(buildMessage({
        name,
        phone: phoneRaw,
        method,
        address,
        notes,
        payment
    }));
}


  /* ---------- Inisialisasi ---------- */
  function init() {
    // Expose fungsi ke window agar onclick="..." di HTML dapat dipanggil
    window.addToCart = addToCart;
    window.changeQty = changeQty;

    // Aksi +/−/hapus di keranjang (event delegation)
    const box = $('cart-items-container');
    if (box) {
      box.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        const row = e.target.closest('[data-id]');
        if (!btn || !row) return;
        const id = row.dataset.id;
        if (btn.dataset.action === 'inc') changeQty(id, 1);
        else if (btn.dataset.action === 'dec') changeQty(id, -1);
        else if (btn.dataset.action === 'del') removeItem(id);
      });
    }

    document.querySelectorAll('input[name="order-method"]').forEach((r) =>
      r.addEventListener('change', syncAddress));

    const btn = $('btn-submit-order');
    if (btn) btn.addEventListener('click', submitOrder);

    const form = $('order-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitOrder(); });

    ['customer-name', 'customer-phone', 'customer-address', 'customer-notes'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('input', clearError);
    });

    initMobileMenu();
    syncAddress();
    renderCart();
    renderProductControls(); // Inisialisasi tampilan tombol kartu produk
    initWhatsAppReturnHandler();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();