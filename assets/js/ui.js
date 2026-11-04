/* Núcleo compartido: marca, header, carrito, tarjetas, toasts, cookies, reveal. */
import { STORE } from './config.js';
import { DEMO, auth, getSettings, getProducts, db } from './store.js';
import { STATIC_SLUGS } from './static-pages.js';
import { CATEGORIES } from './data.js';
import { initAnalytics, track } from './analytics.js';

export const ROOT = document.documentElement.dataset.root || './';
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const money = n => nf.format(Math.round(Number(n) || 0));
export const date = ms => ms ? new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
export const dateTime = ms => ms ? new Date(ms).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
/* URL segura: solo https, data:image y rutas relativas del sitio (nunca javascript:) */
export const safeUrl = (u, fallback = '') => { const s = String(u || '').trim(); if (/^https:\/\//i.test(s) || /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(s) || /^blob:/i.test(s)) return s; if (/^[\w./-]+$/.test(s) && !s.includes('..')) return s; return fallback; };
export const img = src => { const s = safeUrl(src); return !s ? ROOT + 'assets/img/p-labial.webp' : /^(https:|data:|blob:)/i.test(s) ? s : ROOT + s.replace(/^\//, ''); };
export const isHex = c => /^#[0-9a-f]{3,8}$/i.test(String(c || ''));
/* Límite de intentos del lado del cliente (no reemplaza al del servidor) */
export function rateLimit(key, max = 5, windowMs = 60000) {
  const k = 'cb_rl_' + key, now = Date.now();
  const arr = JSON.parse(localStorage.getItem(k) || '[]').filter(t => now - t < windowMs);
  if (arr.length >= max) { const wait = Math.ceil((windowMs - (now - arr[0])) / 1000); throw Object.assign(new Error(`Demasiados intentos. Esperá ${wait} segundos.`), { code: 'rate-limit' }); }
  arr.push(now); localStorage.setItem(k, JSON.stringify(arr));
}
/* Validaciones */
export const V = {
  email: s => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(String(s || '').trim()),
  text: (s, min = 1, max = 500) => { const t = String(s ?? '').trim(); return t.length >= min && t.length <= max; },
  phone: s => !s || /^[+\d\s()-]{6,25}$/.test(s),
  dni: s => !s || /^\d{7,9}$/.test(String(s).replace(/\./g, '')),
  cuit: s => !s || /^\d{2}-?\d{8}-?\d$/.test(s),
  zip: s => /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(String(s || '').trim())
};
export const brandOf = p => p.brand || STORE.name;
export const catName = id => CATEGORIES.find(c => c.id === id)?.name || id;
export const productUrl = p => STATIC_SLUGS.includes(p.slug) ? `${ROOT}producto/${p.slug}/` : `${ROOT}producto/?id=${encodeURIComponent(p.id)}`;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ICON = {
  bag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  heart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};

/* ---------- Marca (desde config.js, una sola fuente) ---------- */
export function applyBrand() {
  $$('[data-brand=name]').forEach(e => e.textContent = STORE.name);
  $$('[data-brand=wordmark]').forEach(e => e.textContent = STORE.wordmark);
  const built = document.querySelector('meta[name=x-brand]')?.content;
  if (built && built !== STORE.name) { // config cambiada sin regenerar: actualizar metadatos en vivo
    const rx = new RegExp(built.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    document.title = document.title.replace(rx, STORE.name);
    $$('meta[content]').forEach(m => { if (m.content.includes(built)) m.content = m.content.replace(rx, STORE.name); });
    $$('script[type="application/ld+json"]').forEach(s => s.textContent = s.textContent.replace(rx, STORE.name));
  }
}
async function applySettings() {
  const s = await getSettings();
  const r = document.documentElement.style;
  if (s.colors) [['--bg', 'bg'], ['--rose', 'rose'], ['--bur', 'burgundy'], ['--lilac', 'lilac']].forEach(([v, k]) => isHex(s.colors[k]) && r.setProperty(v, s.colors[k]));
  const logo = safeUrl(s.logoUrl); if (logo) $$('.logo').forEach(l => { const i = new Image(); i.src = img(logo); i.alt = STORE.name; l.replaceChildren(i); });
  const an = $('.announce'); if (an && s.banner?.announcement) an.textContent = s.banner.announcement;
  if (s.contact) {
    $$('[data-contact]').forEach(el => { const k = el.dataset.contact; const v = s.contact[k]; if (v) { el.textContent = k === 'instagram' ? '@' + v.replace(/^@/, '') : v; if (el.tagName === 'A') el.href = k === 'email' ? (V.email(v) ? 'mailto:' + v : el.href) : k === 'phone' ? 'tel:' + v.replace(/[^\d+]/g, '') : k === 'instagram' ? 'https://instagram.com/' + encodeURIComponent(v.replace(/^@/, '')) : el.href; } });
  }
  return s;
}

/* ---------- Toast / modal ---------- */
export function toast(msg) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), 2800);
}
export function modal(html, onMount) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(m);
  const close = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  onMount?.(m.firstElementChild, close);
  m.querySelector('input,select,textarea,button')?.focus();
  return close;
}

/* ---------- Carrito ---------- */
const CK = 'cb_cart';
export const cart = {
  items: JSON.parse(localStorage.getItem(CK) || '[]'),
  save() { localStorage.setItem(CK, JSON.stringify(this.items)); renderCart(); },
  add(p, variant = '', qty = 1) {
    const key = p.id + '|' + variant;
    const it = this.items.find(i => i.key === key);
    if (it) it.qty += qty; else this.items.push({ key, id: p.id, name: p.name, brand: brandOf(p), variant, qty, price: p.price, image: p.images?.[0] || '', sellerId: p.sellerId || null, sellerPrice: p.sellerPrice ?? null, slug: p.slug });
    this.save(); track('add_to_cart', { id: p.id, value: p.price * qty });
    const pill = $('.cartpill'); pill?.classList.remove('bump'); void pill?.offsetWidth; pill?.classList.add('bump');
    toast(`${p.name} se agregó a tu bolsa`);
  },
  setQty(key, q) { const it = this.items.find(i => i.key === key); if (!it) return; it.qty = Math.max(1, Math.min(99, q)); this.save(); },
  remove(key) { this.items = this.items.filter(i => i.key !== key); this.save(); },
  clear() { this.items = []; this.save(); },
  get count() { return this.items.reduce((s, i) => s + i.qty, 0); },
  get subtotal() { return this.items.reduce((s, i) => s + i.qty * i.price, 0); }
};
let freeFrom = 60000;
export async function refreshCartPrices() { // precios actualizados desde la base
  const ps = await getProducts({ all: true }); let ch = false;
  cart.items = cart.items.filter(i => { const p = ps.find(x => x.id === i.id); if (!p) { ch = true; return false; } if (p.price !== i.price) { i.price = p.price; ch = true; } return true; });
  if (ch) cart.save();
}
function renderCart() {
  $$('.cartpill .count').forEach(c => c.textContent = cart.count);
  const d = $('#drawer'); if (!d) return;
  const items = $('.items', d);
  if (!cart.items.length) items.innerHTML = `<div class="empty"><p>Tu bolsa está vacía.</p><a class="btn" href="${ROOT}tienda/">Ir a la tienda</a></div>`;
  else items.innerHTML = cart.items.map(i => `<div class="citem"><div class="im"><img src="${esc(img(i.image))}" alt="" width="40" height="52"></div>
    <div><b>${esc(i.name)}</b>${i.variant ? `<div class="muted small">${esc(i.variant)}</div>` : ''}<div class="qty" style="margin-top:6px"><button aria-label="Restar" data-q="${esc(i.key)}" data-d="-1">−</button><input aria-label="Cantidad" value="${i.qty}" data-qi="${esc(i.key)}" inputmode="numeric"><button aria-label="Sumar" data-q="${esc(i.key)}" data-d="1">+</button></div></div>
    <div style="text-align:right"><b>${money(i.price * i.qty)}</b><br><button class="rm" data-rm="${esc(i.key)}">Quitar</button></div></div>`).join('');
  const sub = cart.subtotal; const left = Math.max(0, freeFrom - sub);
  $('footer', d).innerHTML = cart.items.length ? `<p class="small" style="margin:0">${left ? `Te faltan <b>${money(left)}</b> para el envío gratis` : '¡Tenés envío gratis! 🎉'}</p>
    <div class="freebar"><i style="width:${Math.min(100, sub / freeFrom * 100)}%"></i></div>
    <div class="sumrow total"><span>Subtotal</span><span>${money(sub)}</span></div>
    <a class="btn block drip" href="${ROOT}checkout/" style="margin-top:10px">Finalizar compra</a>` : '';
}
function setupDrawer() {
  const d = $('#drawer'), sc = $('#scrim'); if (!d) return;
  const open = () => { d.classList.add('open'); sc.classList.add('open'); d.setAttribute('aria-hidden', 'false'); $('.close', d).focus(); };
  const close = () => { d.classList.remove('open'); sc.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); };
  $$('.cartpill').forEach(b => b.addEventListener('click', open));
  sc.addEventListener('click', close); $('.close', d).addEventListener('click', close);
  document.addEventListener('keydown', e => e.key === 'Escape' && close());
  d.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (q) { const it = cart.items.find(i => i.key === q.dataset.q); cart.setQty(q.dataset.q, it.qty + Number(q.dataset.d)); }
    const r = e.target.closest('[data-rm]'); if (r) cart.remove(r.dataset.rm);
  });
  d.addEventListener('change', e => { const i = e.target.closest('[data-qi]'); if (i) cart.setQty(i.dataset.qi, parseInt(i.value) || 1); });
  window.openCart = open;
  renderCart();
}

/* ---------- Favoritos ---------- */
export const favs = {
  list: JSON.parse(localStorage.getItem('cb_favs') || '[]'),
  has(id) { return this.list.includes(id); },
  async toggle(id) {
    this.list = this.has(id) ? this.list.filter(x => x !== id) : [...this.list, id];
    localStorage.setItem('cb_favs', JSON.stringify(this.list));
    if (auth.user) db.set('users', auth.user.uid, { favorites: this.list }).catch(() => {});
    return this.has(id);
  }
};

/* ---------- Tarjeta de producto ---------- */
export function cardHTML(p, { lazy = true } = {}) {
  const tag = p.compareAt > p.price ? `<span class="tag sale">-${Math.round((1 - p.price / p.compareAt) * 100)}%</span>` : (p.tags || []).includes('nuevo') ? '<span class="tag">nuevo</span>' : (p.tags || []).includes('más vendido') ? '<span class="tag">top</span>' : '';
  return `<article class="pcard" data-id="${esc(p.id)}">
    <div class="media">${tag}<img src="${esc(img(p.images?.[0]))}" alt="${esc(p.name)} · ${esc(brandOf(p))}" ${lazy ? 'loading="lazy"' : ''} decoding="async" width="200" height="260">
    <button class="fav" aria-label="Guardar en favoritos" aria-pressed="${favs.has(p.id)}" data-fav="${esc(p.id)}">${ICON.heart}</button></div>
    <p class="brand">${esc(brandOf(p))}</p>
    <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
    <div class="foot"><span class="price">${money(p.price)}${p.compareAt > p.price ? `<s>${money(p.compareAt)}</s>` : ''}<small>${esc(p.size || '')}</small></span>
    <button class="plus" aria-label="Agregar ${esc(p.name)} a la bolsa" data-add="${esc(p.id)}" ${p.stock <= 0 ? 'disabled title="Sin stock"' : ''}>+</button></div></article>`;
}
export function bindCards(root, getP) {
  root.addEventListener('click', async e => {
    const a = e.target.closest('[data-add]'); if (a) { e.preventDefault(); const p = await getP(a.dataset.add); if (p) cart.add(p, p.variants?.[0]?.name || ''); }
    const f = e.target.closest('[data-fav]'); if (f) { e.preventDefault(); const on = await favs.toggle(f.dataset.fav); f.setAttribute('aria-pressed', on); toast(on ? 'Guardado en favoritos' : 'Quitado de favoritos'); }
  });
}

/* ---------- Reveal / scroll ---------- */
export function reveal(root = document) {
  const els = $$('.rv:not(.in)', root);
  if (reduced || !('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

/* ---------- Cookie banner ---------- */
function cookieBanner() {
  if (localStorage.getItem('cb_consent')) return;
  const c = document.createElement('div'); c.className = 'cookie'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Cookies');
  c.innerHTML = `<p>Usamos almacenamiento local para tu bolsa y, si aceptás, estadísticas anónimas de visitas para mejorar la tienda. <a href="${ROOT}privacidad/">Más info</a>.</p><div class="acts"><button class="btn ghost sm" data-c="no">Solo esenciales</button><button class="btn sm" data-c="yes">Aceptar</button></div>`;
  document.body.append(c);
  c.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; localStorage.setItem('cb_consent', b.dataset.c); c.remove(); if (b.dataset.c === 'yes') initAnalytics(); });
}

/* ---------- Header ---------- */
function setupHeader() {
  const b = $('.burger'), m = $('.mobile-nav');
  b?.addEventListener('click', () => { const o = m.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
  const path = location.pathname.replace(/index\.html$/, '');
  $$('.nav a, .mobile-nav a').forEach(a => { try { if (new URL(a.href).pathname === path && !a.hash) a.setAttribute('aria-current', 'page'); } catch (e) {} });
  auth.onChange(u => $$('[data-login-label]').forEach(a => a.textContent = u ? 'Mi cuenta' : 'Ingresar'));
}

/* ---------- Boot ---------- */
export async function boot() {
  applyBrand(); setupHeader(); setupDrawer(); cookieBanner(); reveal();
  if (DEMO) document.documentElement.classList.add('is-demo');
  auth.init().catch(e => console.warn('auth', e));
  try { const s = await applySettings(); freeFrom = s.shipping?.freeFrom || freeFrom; renderCart(); } catch (e) { console.warn(e); }
  refreshCartPrices().catch(() => {});
  if (localStorage.getItem('cb_consent') === 'yes') initAnalytics();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {});
}
