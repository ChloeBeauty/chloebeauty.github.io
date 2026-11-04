/* Checkout: datos → envío → pago. Los precios se vuelven a leer de la base;
   con el Worker de pagos, el servidor recalcula todo (nunca confía en el navegador). */
import { boot, $, $$, cart, money, img, esc, ROOT, toast, V, rateLimit, refreshCartPrices } from './ui.js';
import { DEMO, db, auth, getSettings, errMsg } from './store.js';
import { SERVICES, STORE } from './config.js';
import { api } from './security.js';
import { track } from './analytics.js';
boot();

import { PROVINCES, shippingCost } from './checkout-shared.js';
const AUTO = !DEMO && !!SERVICES.workerUrl;
const box = $('#co');
let S, profile = null;

function payOptions() {
  const P = S.payments, out = [];
  if (P.mercadopago?.enabled) out.push({ id: 'mercadopago', label: 'Mercado Pago', sub: AUTO ? 'Tarjetas, dinero en cuenta y cuotas. Pagás de forma segura en Mercado Pago.' : 'Pago manual: te enviamos el link de pago de Mercado Pago para completar la compra.', badge: AUTO ? 'Automático' : 'Manual' });
  if (P.paypal?.enabled && AUTO && SERVICES.paypalClientId) out.push({ id: 'paypal', label: 'PayPal', sub: `Se cobra en ${SERVICES.paypalCurrency} según la cotización del día.`, badge: 'Automático' });
  if (P.transferencia?.enabled) out.push({ id: 'transferencia', label: 'Transferencia bancaria', sub: (P.transferencia.discount ? `${P.transferencia.discount}% de descuento. ` : '') + 'Pago manual: te mostramos los datos al confirmar.', badge: 'Manual' });
  if (P.efectivo?.enabled) out.push({ id: 'efectivo', label: 'Efectivo al retirar', sub: 'Solo con retiro en local.', badge: 'Manual' });
  return out;
}
function totals(f) {
  const sub = cart.subtotal;
  const m = S.shipping.methods.find(x => x.id === f.ship?.value);
  const ship = shippingCost(m, f.province?.value, sub, S.shipping.freeFrom);
  const disc = f.pay?.value === 'transferencia' ? Math.round(sub * (S.payments.transferencia.discount || 0) / 100) : 0;
  return { sub, ship, disc, total: sub + ship - disc, method: m };
}
function summaryHTML(t) {
  return `<h2 style="font-size:22px">Resumen</h2>${cart.items.map(i => `<div class="citem" style="grid-template-columns:52px 1fr auto"><div class="im" style="width:52px;height:52px"><img src="${esc(img(i.image))}" alt="" width="30" height="42"></div><div><b>${esc(i.name)}</b><div class="muted small">${esc(i.variant)} × ${i.qty}</div></div><b>${money(i.price * i.qty)}</b></div>`).join('')}
  <div style="margin-top:12px"><div class="sumrow"><span>Subtotal</span><span>${money(t.sub)}</span></div><div class="sumrow"><span>Envío</span><span>${t.ship ? money(t.ship) : 'Gratis'}</span></div>${t.disc ? `<div class="sumrow"><span>Descuento transferencia</span><span>−${money(t.disc)}</span></div>` : ''}<div class="sumrow total"><span>Total</span><span>${money(t.total)}</span></div></div>`;
}
function render() {
  if (!cart.items.length) { box.innerHTML = `<div class="empty card"><p>Tu bolsa está vacía.</p><a class="btn" href="${ROOT}tienda/">Ir a la tienda</a></div>`; return; }
  const u = auth.user, a = profile?.addresses?.[0] || {};
  const pays = payOptions();
  box.innerHTML = `<div class="checkout"><form id="cof" novalidate>
  <div class="steps"><span class="on">1 · Datos</span><span class="on">2 · Envío</span><span class="on">3 · Pago</span></div>
  ${DEMO ? '<p class="note demo">Modo demo: el pedido se guarda en este navegador y no se cobra nada.</p>' : ''}
  <div class="card" style="margin:12px 0"><h2 style="font-size:22px">1. Tus datos</h2>${u ? '' : `<p class="small muted">¿Ya tenés cuenta? <a href="${ROOT}cuenta/?next=checkout">Ingresá</a> para seguir tus pedidos.</p>`}
    <div class="row2"><label class="field">Email<input name="email" type="email" required autocomplete="email" maxlength="190" value="${esc(u?.email || '')}"></label><label class="field">Nombre y apellido<input name="name" required autocomplete="name" maxlength="80" value="${esc(profile?.name || u?.displayName || '')}"></label></div>
    <div class="row2"><label class="field">Teléfono<input name="phone" type="tel" required autocomplete="tel" maxlength="25" value="${esc(profile?.phone || '')}"></label><label class="field">DNI <span class="h">(opcional, para facturar)</span><input name="dni" inputmode="numeric" maxlength="10" value="${esc(profile?.dni || '')}"></label></div></div>
  <div class="card" style="margin-bottom:12px"><h2 style="font-size:22px">2. Envío</h2>
    ${S.shipping.methods.filter(m => m.enabled).map((m, i) => `<label class="opt"><input type="radio" name="ship" value="${esc(m.id)}" ${i ? '' : 'checked'}><span><b>${esc(m.label)}</b>${m.type === 'zona' ? '<br><span class="small muted">Costo según provincia</span>' : ''}</span><span class="r" data-shipcost="${esc(m.id)}"></span></label>`).join('')}
    <div id="addr" style="margin-top:12px"><div class="row2"><label class="field">Calle y número<input name="street" autocomplete="street-address" maxlength="120" value="${esc(a.street || '')}"></label><label class="field">Piso / depto <span class="h">(opcional)</span><input name="apt" maxlength="30" value="${esc(a.apt || '')}"></label></div>
    <div class="row3"><label class="field">Ciudad<input name="city" autocomplete="address-level2" maxlength="60" value="${esc(a.city || '')}"></label><label class="field">Provincia<select name="province">${PROVINCES.map(p => `<option ${p === (a.province || 'Buenos Aires') ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="field">Código postal<input name="zip" autocomplete="postal-code" maxlength="8" value="${esc(a.zip || '')}"></label></div></div></div>
  <div class="card"><h2 style="font-size:22px">3. Pago</h2>
    ${pays.map((p, i) => `<label class="opt"><input type="radio" name="pay" value="${p.id}" ${i ? '' : 'checked'}><span><b>${esc(p.label)}</b> <span class="pill ${p.badge === 'Automático' ? 'on' : ''}">${p.badge}</span><br><span class="small muted">${esc(p.sub)}</span></span></label>`).join('') || '<p class="err">No hay medios de pago habilitados.</p>'}
    <label class="field" style="margin-top:10px">Notas para el pedido <span class="h">(opcional)</span><textarea name="notes" maxlength="500"></textarea></label>
    <label class="check"><input type="checkbox" name="terms" required> Acepto los <a href="${ROOT}terminos/" target="_blank" rel="noopener noreferrer">términos y condiciones</a> y la <a href="${ROOT}privacidad/" target="_blank" rel="noopener noreferrer">política de privacidad</a>.</label>
    <button class="btn block drip" id="cobtn" style="margin-top:8px">Confirmar pedido</button><p class="err" role="alert" id="coerr"></p></div>
  </form><aside class="card summary" id="sum"></aside></div>`;
  const f = $('#cof');
  const upd = () => {
    const t = totals(f);
    $('#addr').hidden = t.method?.type === 'retiro';
    $$('[data-shipcost]').forEach(s => { const m = S.shipping.methods.find(x => x.id === s.dataset.shipcost); const c = shippingCost(m, f.province.value, cart.subtotal, S.shipping.freeFrom); s.textContent = c ? money(c) : 'Gratis'; });
    const ef = f.querySelector('input[value=efectivo]'); if (ef) { ef.disabled = t.method?.type !== 'retiro'; if (ef.disabled && ef.checked) f.querySelector('input[name=pay]:not([disabled])').checked = true; }
    $('#sum').innerHTML = summaryHTML(t);
  };
  f.addEventListener('change', upd); upd();
  f.addEventListener('submit', submit);
}

function validate(f, t) {
  const d = Object.fromEntries(new FormData(f));
  if (!V.email(d.email)) return ['email', 'Ingresá un email válido.'];
  if (!V.text(d.name, 3, 80)) return ['name', 'Ingresá tu nombre y apellido.'];
  if (!V.phone(d.phone) || !d.phone) return ['phone', 'Ingresá un teléfono válido.'];
  if (!V.dni(d.dni)) return ['dni', 'El DNI debe tener entre 7 y 9 números.'];
  if (t.method?.type !== 'retiro') {
    if (!V.text(d.street, 3, 120)) return ['street', 'Ingresá la calle y el número.'];
    if (!V.text(d.city, 2, 60)) return ['city', 'Ingresá la ciudad.'];
    if (!V.zip(d.zip)) return ['zip', 'Ingresá un código postal válido (ej. 8000).'];
  }
  if (!d.pay) return ['pay', 'Elegí un medio de pago.'];
  if (!d.terms) return ['terms', 'Tenés que aceptar los términos para continuar.'];
  return null;
}

async function submit(e) {
  e.preventDefault();
  const f = e.target, er = $('#coerr'), btn = $('#cobtn'); er.textContent = '';
  await refreshCartPrices();
  const t = totals(f); const bad = validate(f, t);
  if (bad) { er.textContent = bad[1]; f.elements[bad[0]]?.focus?.(); return; }
  const d = Object.fromEntries(new FormData(f));
  try { rateLimit('checkout', 4, 5 * 60000); } catch (x) { er.textContent = x.message; return; }
  btn.disabled = true; btn.textContent = 'Procesando…';
  const pay = S.payments[d.pay];
  const order = {
    number: STORE.wordmark.slice(0, 2).toUpperCase() + '-' + Date.now().toString(36).toUpperCase().slice(-6),
    uid: auth.user?.uid || null, email: d.email.trim().toLowerCase(),
    customer: { name: d.name.trim(), phone: d.phone.trim(), dni: (d.dni || '').replace(/\D/g, '') },
    items: cart.items.slice(0, 50).map(i => ({ id: i.id, name: i.name, variant: i.variant || '', qty: i.qty, price: i.price, image: i.image || '', sellerId: i.sellerId || null })),
    subtotal: t.sub, shippingCost: t.ship, discount: t.disc, total: t.total,
    shipping: { method: t.method.id, label: t.method.label, address: t.method.type === 'retiro' ? null : { street: d.street.trim(), apt: (d.apt || '').trim(), city: d.city.trim(), province: d.province, zip: d.zip.trim() } },
    payment: { method: d.pay, label: pay.label, mode: (d.pay === 'mercadopago' || d.pay === 'paypal') && AUTO ? 'auto' : 'manual', status: 'pendiente' },
    status: 'pendiente', history: [{ status: 'pendiente', at: Date.now() }], tracking: null, notes: (d.notes || '').trim().slice(0, 500), createdAt: Date.now()
  };
  try {
    const id = await db.add('orders', order);
    track('purchase', { value: order.total, orderId: id });
    if (auth.user) db.set('users', auth.user.uid, { name: order.customer.name, phone: order.customer.phone, ...(order.shipping.address ? { addresses: [{ label: 'Principal', ...order.shipping.address }] } : {}) }).catch(() => {});
    if (order.payment.mode === 'auto') return autoPay(id, order);
    done(id, order);
  } catch (x) { er.textContent = errMsg(x); btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
}

/* ---------- Pago automático (requiere Worker) ---------- */
function loadScript(src, attrs = {}) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; Object.assign(s, attrs); s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.append(s); }); }
async function autoPay(id, order) {
  cart.clear();
  box.innerHTML = `<div class="card" style="max-width:620px;margin:0 auto 40px"><h2>Pedido ${esc(order.number)} creado</h2><p>Completá el pago para confirmarlo. El total lo calcula nuestro servidor con los precios vigentes.</p><div id="paybox" style="min-height:60px"><p class="muted">Preparando el pago…</p></div><p class="err" id="payerr" role="alert"></p><p class="small muted">Si cerrás esta pantalla, vas a poder ver el pedido en <a href="${ROOT}cuenta/">Mi cuenta</a>; escribinos y te ayudamos a completar el pago.</p></div>`;
  const pb = $('#paybox'), pe = $('#payerr');
  try {
    if (order.payment.method === 'mercadopago') {
      const r = await api('/api/mp/preference', { orderId: id });
      if (SERVICES.mercadoPagoPublicKey) {
        await loadScript('https://sdk.mercadopago.com/js/v2');
        pb.innerHTML = '<div id="wallet"></div>';
        const mp = new window.MercadoPago(SERVICES.mercadoPagoPublicKey, { locale: 'es-AR' });
        await mp.bricks().create('wallet', 'wallet', { initialization: { preferenceId: r.id, redirectMode: 'self' } });
      } else {
        pb.innerHTML = ''; const a = document.createElement('a'); a.className = 'btn block drip'; a.textContent = `Pagar ${money(r.total)} con Mercado Pago`; a.href = r.init_point; a.rel = 'noopener'; pb.append(a);
        location.href = r.init_point;
      }
    } else if (order.payment.method === 'paypal') {
      await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(SERVICES.paypalClientId)}&currency=${encodeURIComponent(SERVICES.paypalCurrency)}&intent=capture&locale=es_AR`);
      pb.innerHTML = '<div id="ppbtns"></div>';
      window.paypal.Buttons({
        style: { shape: 'pill', color: 'gold', label: 'pay' },
        createOrder: async () => (await api('/api/paypal/create-order', { orderId: id })).id,
        onApprove: async data => {
          const r = await api('/api/paypal/capture', { orderId: id, paypalOrderId: data.orderID });
          if (r.status === 'COMPLETED') done(id, { ...order, status: 'pagado' }); else pe.textContent = 'El pago quedó pendiente de revisión. Te avisamos por email.';
        },
        onCancel: () => { pe.textContent = 'Cancelaste el pago. Podés intentarlo de nuevo.'; },
        onError: err => { console.warn(err); pe.textContent = 'PayPal no pudo procesar el pago. Probá de nuevo o elegí otro medio.'; }
      }).render('#ppbtns');
    }
  } catch (x) { pb.innerHTML = ''; pe.textContent = (x.message || 'No pudimos iniciar el pago.') + ' Tu pedido quedó guardado: te contactamos para completar el pago manualmente.'; }
}

function done(id, order) {
  cart.clear();
  const P = S.payments; let how = '';
  if (order.status === 'pagado') how = '<p class="ok">¡Pago aprobado! Ya estamos preparando tu pedido.</p>';
  else if (order.payment.method === 'transferencia') how = `<p><b>Pago manual por transferencia.</b> Transferí <b>${money(order.total)}</b> a:</p><p class="note">${esc(P.transferencia.info)}</p><p class="small">Enviá el comprobante por email o WhatsApp indicando el pedido ${esc(order.number)}.</p>`;
  else if (order.payment.method === 'mercadopago') how = `<p><b>Pago manual con Mercado Pago.</b> ${esc(P.mercadopago.note || '')}</p>${P.mercadopago.link && /^https:\/\//.test(P.mercadopago.link) ? `<p><a class="btn" href="${esc(P.mercadopago.link)}" target="_blank" rel="noopener noreferrer">Abrir link de pago</a></p><p class="small muted">Ingresá el monto ${money(order.total)} y en la descripción el pedido ${esc(order.number)}.</p>` : ''}`;
  else if (order.payment.method === 'efectivo') how = `<p><b>Pagás en efectivo al retirar.</b> ${esc(P.efectivo.info)}</p>`;
  box.innerHTML = `<div class="card" style="max-width:640px;margin:0 auto 50px;text-align:center"><p class="eyebrow">¡Gracias por tu compra!</p><h2>Pedido ${esc(order.number)}</h2><p>Te enviamos el detalle a <b>${esc(order.email)}</b>. Total: <b>${money(order.total)}</b>.</p><div style="text-align:left">${how}</div>
  <p><a class="btn ghost" href="${ROOT}cuenta/">Ver mis pedidos</a> <a class="btn" href="${ROOT}tienda/">Seguir comprando</a></p></div>`;
  scrollTo({ top: 0 });
}

(async () => {
  S = await getSettings();
  const go = async u => { if (u) { try { profile = await db.get('users', u.uid); } catch (e) {} } render(); };
  auth.onChange(go);
  if (!auth.ready) setTimeout(() => !box.querySelector('form,.empty') && render(), 1500);
  track('begin_checkout', { value: cart.subtotal });
  // vuelta desde Mercado Pago
  const q = new URLSearchParams(location.search);
  if (q.get('status')) toast(q.get('status') === 'approved' ? '¡Pago aprobado!' : 'El pago no se completó.');
})();
