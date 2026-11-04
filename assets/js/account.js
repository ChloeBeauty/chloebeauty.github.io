/* Panel de clienta: ingreso/registro (email o Google), pedidos con seguimiento,
   perfil, direcciones, seguridad y favoritos. */
import { boot, $, $$, esc, money, date, dateTime, img, ROOT, toast, favs, cardHTML, bindCards, V, rateLimit, safeUrl } from './ui.js';
import { DEMO, auth, db, errMsg, getProducts } from './store.js';
import { PROVINCES } from './checkout-shared.js';
boot();
const box = $('#acc');
const q = new URLSearchParams(location.search);
let tab = q.get('pedido') ? 'pedidos' : 'pedidos', profile = {};
const GICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

/* ---------------- Ingreso / registro ---------------- */
function authView(mode = 'login') {
  box.innerHTML = `<div class="auth"><h1 style="font-size:44px;text-align:center">Mi cuenta</h1>
  ${DEMO ? '<p class="note demo">Modo demo: probá con <b>cliente@demo.com</b> / <b>demo1234</b>, o como administradora con <b>admin@demo.com</b> / <b>demo1234</b>.</p>' : ''}
  <div class="card"><div class="tabs2" role="tablist"><button role="tab" aria-selected="${mode === 'login'}" data-m="login">Ingresar</button><button role="tab" aria-selected="${mode === 'register'}" data-m="register">Crear cuenta</button></div>
  <button class="gbtn" id="google">${GICON} Continuar con Google</button><div class="or">o con tu email</div>
  <form id="af" novalidate>${mode === 'register' ? '<label class="field">Nombre<input name="name" required autocomplete="name" maxlength="80"></label>' : ''}
  <label class="field">Email<input name="email" type="email" required autocomplete="email" maxlength="190"></label>
  <label class="field">Contraseña<input name="pass" type="password" required minlength="${mode === 'register' ? 8 : 6}" maxlength="128" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}">${mode === 'register' ? '<span class="h">Mínimo 8 caracteres, con letras y números.</span>' : ''}</label>
  ${mode === 'register' ? `<label class="check"><input type="checkbox" name="terms" required> Acepto los <a href="${ROOT}terminos/">términos</a> y la <a href="${ROOT}privacidad/">política de privacidad</a>.</label>` : ''}
  <button class="btn block drip">${mode === 'register' ? 'Crear cuenta' : 'Ingresar'}</button><p class="err" role="alert"></p></form>
  ${mode === 'login' ? '<p style="text-align:center;margin:6px 0 0"><button class="rm" id="forgot" style="background:none;border:0;text-decoration:underline;cursor:pointer;color:var(--bur)">Olvidé mi contraseña</button></p>' : ''}
  ${DEMO ? '<p style="text-align:center"><button class="btn ghost sm" id="demoAdmin">Entrar como administradora (demo)</button></p>' : ''}</div></div>`;
  const f = $('#af'), er = $('.err', f);
  $$('[data-m]').forEach(b => b.onclick = () => authView(b.dataset.m));
  $('#google').onclick = async () => { er.textContent = ''; try { rateLimit('login', 8, 5 * 60000); await auth.google(); } catch (e) { er.textContent = e.code === 'rate-limit' ? e.message : errMsg(e); } };
  f.onsubmit = async e => {
    e.preventDefault(); er.textContent = '';
    const d = Object.fromEntries(new FormData(f)); d.email = (d.email || '').trim().toLowerCase();
    if (!V.email(d.email)) return er.textContent = 'Ingresá un email válido.';
    if (mode === 'register') {
      if (!V.text(d.name, 2, 80)) return er.textContent = 'Ingresá tu nombre.';
      if (d.pass.length < 8 || !/[a-z]/i.test(d.pass) || !/\d/.test(d.pass)) return er.textContent = 'La contraseña necesita 8 caracteres con letras y números.';
      if (!d.terms) return er.textContent = 'Tenés que aceptar los términos.';
    } else if (!d.pass) return er.textContent = 'Ingresá tu contraseña.';
    const b = $('button.btn', f); b.disabled = true;
    try {
      rateLimit('login', 8, 5 * 60000);
      if (mode === 'register') { await auth.register(d.email, d.pass, d.name.trim()); toast(DEMO ? '¡Cuenta creada!' : 'Te enviamos un email para verificar tu cuenta.'); }
      else await auth.login(d.email, d.pass);
    } catch (x) { er.textContent = x.code === 'rate-limit' ? x.message : errMsg(x); b.disabled = false; }
  };
  $('#forgot')?.addEventListener('click', async () => {
    const email = f.email.value.trim().toLowerCase();
    if (!V.email(email)) { er.textContent = 'Escribí tu email arriba y volvé a tocar "Olvidé mi contraseña".'; return; }
    try { rateLimit('reset', 3, 10 * 60000); await auth.reset(email); er.textContent = ''; toast('Si el email existe, te llega un enlace para crear una nueva contraseña.'); } catch (x) { er.textContent = x.code === 'rate-limit' ? x.message : errMsg(x); }
  });
  $('#demoAdmin')?.addEventListener('click', async () => { await auth.login('admin@demo.com', 'demo1234'); location.href = ROOT + 'admin/'; });
}

/* ---------------- Panel ---------------- */
async function dashView(u) {
  try { profile = (await db.get('users', u.uid)) || {}; } catch (e) { profile = {}; }
  if (Array.isArray(profile.favorites)) { favs.list = [...new Set([...favs.list, ...profile.favorites])]; localStorage.setItem('cb_favs', JSON.stringify(favs.list)); }
  const admin = await auth.isAdmin();
  box.innerHTML = `<div class="page-hero" style="padding-bottom:0"><p class="eyebrow">Hola${profile.name || u.displayName ? ', ' + esc((profile.name || u.displayName).split(' ')[0]) : ''} ✨</p><h1 style="font-size:clamp(36px,5vw,64px)">Mi cuenta</h1>
  ${!u.emailVerified ? '<p class="note">Tu email todavía no está verificado. <button class="btn sm" id="reverify">Reenviar email de verificación</button></p>' : ''}</div>
  <div class="dash"><nav class="side-nav" aria-label="Secciones de la cuenta">
    ${[['pedidos', 'Mis pedidos'], ['perfil', 'Perfil y direcciones'], ['seguridad', 'Email y contraseña'], ['favoritos', 'Favoritos']].map(([k, l]) => `<button data-t="${k}" aria-current="${tab === k}">${l}</button>`).join('')}
    ${admin ? `<a class="btn sm" href="${ROOT}admin/" style="margin-top:8px;justify-content:center">Panel de administración</a>` : ''}
    <button id="logout" style="color:var(--muted)">Cerrar sesión</button></nav><section id="pane"></section></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; $$('[data-t]').forEach(x => x.setAttribute('aria-current', x === b)); pane(u); });
  $('#logout').onclick = () => auth.logout();
  $('#reverify')?.addEventListener('click', async () => { try { rateLimit('verify', 2, 5 * 60000); await auth.resendVerify(); toast('Listo, revisá tu correo.'); } catch (x) { toast(x.message); } });
  pane(u);
}
function pane(u) { ({ pedidos: ordersPane, perfil: profilePane, seguridad: securityPane, favoritos: favsPane })[tab](u, $('#pane')); }

async function ordersPane(u, el) {
  el.innerHTML = '<p class="muted">Cargando pedidos…</p>';
  let list = [];
  try { list = (await db.list('orders', { where: [['uid', '==', u.uid]] })).sort((a, b) => b.createdAt - a.createdAt); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  if (!list.length) { el.innerHTML = `<div class="card empty"><p>Todavía no hiciste pedidos.</p><a class="btn" href="${ROOT}tienda/">Ir a la tienda</a></div>`; return; }
  el.innerHTML = `<div class="table-wrap"><table class="t"><caption class="sr-only">Mis pedidos</caption><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>
  ${list.map(o => `<tr><td><b>${esc(o.number)}</b><div class="small muted">${o.items.length} producto${o.items.length > 1 ? 's' : ''}</div></td><td>${date(o.createdAt)}</td><td><span class="pill ${esc(o.status)}">${esc(o.status)}</span></td><td>${money(o.total)}</td><td><button class="btn sm ghost" data-o="${esc(o.id)}">Ver detalle</button></td></tr>`).join('')}</tbody></table></div><div id="odet" style="margin-top:14px"></div>`;
  const show = id => { const o = list.find(x => x.id === id); if (o) { $('#odet').innerHTML = orderDetail(o); $('#odet').scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  el.onclick = e => { const b = e.target.closest('[data-o]'); if (b) show(b.dataset.o); };
  const pid = q.get('pedido'); if (pid) show(pid);
}
export function orderDetail(o) {
  const flow = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado'];
  const label = { pendiente: 'Pedido recibido', pagado: 'Pago acreditado', preparando: 'Preparando tu pedido', enviado: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };
  const cur = o.status === 'cancelado' ? -1 : flow.indexOf(o.status);
  const at = s => (o.history || []).find(h => h.status === s)?.at;
  const steps = o.status === 'cancelado' ? [...(o.history || []).map(h => h.status)] : flow;
  const tUrl = safeUrl(o.tracking?.url);
  return `<div class="card"><div class="adm-head"><h2 style="font-size:24px">Pedido ${esc(o.number)}</h2><span class="pill ${esc(o.status)}">${esc(o.status)}</span></div>
  <div class="row2" style="align-items:start"><div><h3 style="font-size:16px">Seguimiento</h3><ol class="timeline">${steps.map((s, i) => `<li class="${o.status === 'cancelado' || i <= cur ? 'done' : ''} ${s === o.status ? 'cur' : ''}"><i></i><b>${esc(label[s] || s)}</b>${at(s) ? `<div class="small muted">${dateTime(at(s))}</div>` : ''}</li>`).join('')}</ol>
  ${o.tracking?.code ? `<p class="note">Envío por <b>${esc(o.tracking.carrier)}</b> · Código <b>${esc(o.tracking.code)}</b>${tUrl ? `<br><a href="${esc(tUrl)}" target="_blank" rel="noopener noreferrer">Seguir el envío →</a>` : ''}</p>` : ''}</div>
  <div><h3 style="font-size:16px">Productos</h3>${o.items.map(i => `<div class="citem" style="grid-template-columns:48px 1fr auto"><div class="im" style="width:48px;height:48px"><img src="${esc(img(i.image))}" alt="" width="30" height="40"></div><div>${esc(i.name)}<div class="small muted">${esc(i.variant || '')} × ${+i.qty}</div></div><b>${money(i.price * i.qty)}</b></div>`).join('')}
  <div style="margin-top:10px"><div class="sumrow"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="sumrow"><span>Envío (${esc(o.shipping?.label || '')})</span><span>${o.shippingCost ? money(o.shippingCost) : 'Gratis'}</span></div>${o.discount ? `<div class="sumrow"><span>Descuento</span><span>−${money(o.discount)}</span></div>` : ''}<div class="sumrow total"><span>Total</span><span>${money(o.total)}</span></div>
  <p class="small muted">Pago: ${esc(o.payment?.label || '')}${o.shipping?.address ? ` · Envío a ${esc(o.shipping.address.street)}, ${esc(o.shipping.address.city)}` : ''}</p></div></div></div></div>`;
}

function profilePane(u, el) {
  const ad = profile.addresses || [];
  el.innerHTML = `<div class="card"><h2 style="font-size:24px">Tus datos</h2><form id="pf" novalidate>
  <div class="row2"><label class="field">Nombre y apellido<input name="name" maxlength="80" value="${esc(profile.name || u.displayName || '')}"></label><label class="field">Teléfono<input name="phone" type="tel" maxlength="25" value="${esc(profile.phone || '')}"></label></div>
  <label class="field">DNI <span class="h">(opcional)</span><input name="dni" inputmode="numeric" maxlength="10" value="${esc(profile.dni || '')}"></label>
  <button class="btn">Guardar cambios</button><p class="err" role="alert"></p></form></div>
  <div class="card" style="margin-top:12px"><h2 style="font-size:24px">Direcciones</h2><div id="adl">${ad.map((a, i) => `<div class="opt" style="cursor:default"><span><b>${esc(a.label || 'Dirección')}</b><br><span class="small">${esc(a.street)}${a.apt ? ', ' + esc(a.apt) : ''} · ${esc(a.city)}, ${esc(a.province)} (${esc(a.zip)})</span></span><button class="btn sm ghost r" data-del="${i}">Eliminar</button></div>`).join('') || '<p class="muted small">No tenés direcciones guardadas.</p>'}</div>
  <details class="acc"><summary>Agregar dirección</summary><form id="af2" novalidate><div class="row2"><label class="field">Nombre (ej. Casa)<input name="label" maxlength="30"></label><label class="field">Calle y número<input name="street" maxlength="120" required></label></div>
  <div class="row3"><label class="field">Ciudad<input name="city" maxlength="60" required></label><label class="field">Provincia<select name="province">${PROVINCES.map(p => `<option>${p}</option>`).join('')}</select></label><label class="field">Código postal<input name="zip" maxlength="8" required></label></div>
  <label class="field">Piso / depto<input name="apt" maxlength="30"></label><button class="btn sm">Agregar</button><p class="err" role="alert"></p></form></details></div>`;
  const save = async data => { await db.set('users', u.uid, data); profile = { ...profile, ...data }; };
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const er = $('.err', e.target); er.textContent = '';
    if (!V.text(d.name, 2, 80)) return er.textContent = 'Ingresá tu nombre.'; if (!V.phone(d.phone)) return er.textContent = 'Teléfono no válido.'; if (!V.dni(d.dni)) return er.textContent = 'DNI no válido.';
    try { await save({ name: d.name.trim(), phone: d.phone.trim(), dni: d.dni.replace(/\D/g, '') }); toast('Datos guardados'); } catch (x) { er.textContent = errMsg(x); }
  };
  $('#af2').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const er = $('.err', e.target);
    if (!V.text(d.street, 3, 120) || !V.text(d.city, 2, 60)) return er.textContent = 'Completá calle y ciudad.'; if (!V.zip(d.zip)) return er.textContent = 'Código postal no válido.';
    if (ad.length >= 5) return er.textContent = 'Podés guardar hasta 5 direcciones.';
    try { await save({ addresses: [...ad, { label: d.label.trim() || 'Dirección', street: d.street.trim(), apt: d.apt.trim(), city: d.city.trim(), province: d.province, zip: d.zip.trim() }] }); toast('Dirección agregada'); profilePane(u, el); } catch (x) { er.textContent = errMsg(x); }
  };
  $('#adl').onclick = async e => { const b = e.target.closest('[data-del]'); if (!b) return; await save({ addresses: ad.filter((_, i) => i !== +b.dataset.del) }); profilePane(u, el); };
}

function securityPane(u, el) {
  const g = u.provider === 'google';
  el.innerHTML = `${g ? '<p class="note">Ingresás con Google: el email y la contraseña se administran desde tu cuenta de Google.</p>' : `
  <div class="card"><h2 style="font-size:22px">Cambiar email</h2><form id="ef" novalidate><div class="row2"><label class="field">Nuevo email<input name="email" type="email" maxlength="190" required></label><label class="field">Contraseña actual<input name="pass" type="password" autocomplete="current-password" required></label></div><button class="btn sm">Cambiar email</button><p class="err" role="alert"></p></form></div>
  <div class="card" style="margin-top:12px"><h2 style="font-size:22px">Cambiar contraseña</h2><form id="cf" novalidate><div class="row2"><label class="field">Contraseña actual<input name="old" type="password" autocomplete="current-password" required></label><label class="field">Nueva contraseña<input name="pass" type="password" autocomplete="new-password" minlength="8" required></label></div><button class="btn sm">Cambiar contraseña</button><p class="err" role="alert"></p></form></div>`}
  <div class="card" style="margin-top:12px;border:1.5px solid #f0c2c2"><h2 style="font-size:22px">Eliminar cuenta</h2><p class="small muted">Se borran tus datos de perfil y el acceso. Los pedidos se conservan por obligaciones fiscales.</p><form id="df" novalidate>${g ? '' : '<label class="field">Contraseña<input name="pass" type="password" autocomplete="current-password" required></label>'}<label class="check"><input type="checkbox" name="ok" required> Entiendo que esta acción no se puede deshacer.</label><button class="btn sm" style="background:#a3203a">Eliminar mi cuenta</button><p class="err" role="alert"></p></form></div>`;
  const run = (id, fn) => { const f = $(id); if (!f) return; f.onsubmit = async e => { e.preventDefault(); const er = $('.err', f); er.textContent = ''; try { rateLimit('sec', 5, 5 * 60000); await fn(Object.fromEntries(new FormData(f)), er); } catch (x) { er.textContent = x.code === 'rate-limit' ? x.message : errMsg(x); } }; };
  run('#ef', async d => { if (!V.email(d.email)) throw new Error('Email no válido.'); const r = await auth.changeEmail(d.email.trim().toLowerCase(), d.pass); toast(r === 'verify' ? 'Te enviamos un enlace al nuevo email para confirmar el cambio.' : 'Email actualizado'); });
  run('#cf', async d => { if (d.pass.length < 8 || !/\d/.test(d.pass)) throw new Error('La nueva contraseña necesita 8 caracteres con números.'); await auth.changePassword(d.old, d.pass); toast('Contraseña actualizada'); $('#cf').reset(); });
  run('#df', async d => { if (!d.ok) throw new Error('Confirmá la casilla para continuar.'); await auth.deleteAccount(d.pass || ''); toast('Tu cuenta fue eliminada.'); });
}

async function favsPane(u, el) {
  const all = await getProducts(); const list = all.filter(p => favs.has(p.id));
  el.innerHTML = list.length ? `<div class="grid-products">${list.map(p => cardHTML(p)).join('')}</div>` : `<div class="card empty"><p>Todavía no guardaste favoritos. Tocá el ♡ en cualquier producto.</p><a class="btn" href="${ROOT}tienda/">Explorar</a></div>`;
  bindCards(el, async id => all.find(p => p.id === id));
}

auth.onChange(u => { if (u && q.get('next') === 'checkout') { location.href = ROOT + 'checkout/'; return; } u ? dashView(u) : authView(q.get('modo') === 'registro' ? 'register' : 'login'); });
