/* Analítica propia y respetuosa: solo corre si la persona acepta cookies.
   Guarda eventos anónimos en Firestore (colección "analytics") y un
   "latido" de presencia (colección "presence") cada 25 s para contar
   usuarios en línea. Sin datos personales, sin IP guardada. */
import { DEMO, db, getSettings } from './store.js';

let started = false, sid = '', ctx = null;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export function parseUA(ua = navigator.userAgent, w = screen.width, touch = navigator.maxTouchPoints || 0) {
  const U = ua.toLowerCase();
  let device = 'notebook/PC';
  if (/playstation|xbox|nintendo|switch/.test(U)) device = 'consola';
  else if (/smart-?tv|smarttv|tizen|webos|web0s|hbbtv|netcast|appletv|crkey|aft[a-z]|bravia|roku|googletv|android tv/.test(U)) device = 'TV';
  else if (/ipad|tablet|kindle|silk|playbook/.test(U) || (/android/.test(U) && !/mobile/.test(U)) || (/macintosh/.test(U) && touch > 1)) device = 'tablet';
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(U) || (touch > 0 && w < 768)) device = 'móvil';
  const browser = /edg\//.test(U) ? 'Edge' : /opr\/|opera/.test(U) ? 'Opera' : /samsungbrowser/.test(U) ? 'Samsung Internet' : /firefox|fxios/.test(U) ? 'Firefox' : /chrome|crios/.test(U) ? 'Chrome' : /safari/.test(U) ? 'Safari' : 'Otro';
  const os = /windows/.test(U) ? 'Windows' : /android/.test(U) ? 'Android' : /iphone|ipad|ipod/.test(U) ? 'iOS' : /mac os/.test(U) ? 'macOS' : /cros/.test(U) ? 'ChromeOS' : /linux/.test(U) ? 'Linux' : 'Otro';
  return { device, browser, os };
}

async function country() {
  const c = JSON.parse(localStorage.getItem('cb_geo') || 'null');
  if (c && Date.now() - c.t < 864e5) return c.v;
  let v = '';
  try { const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); v = j.country_name || j.country || ''; } } catch (e) {}
  if (!v) { try { const t = await (await fetch('https://www.cloudflare.com/cdn-cgi/trace')).text(); v = (t.match(/loc=(\w+)/) || [])[1] || ''; } catch (e) {} }
  if (v.length === 2) { try { v = new Intl.DisplayNames(['es'], { type: 'region' }).of(v); } catch (e) {} }
  localStorage.setItem('cb_geo', JSON.stringify({ t: Date.now(), v: v || 'Desconocido' }));
  return v || 'Desconocido';
}

function source() {
  const q = new URLSearchParams(location.search);
  const saved = JSON.parse(sessionStorage.getItem('cb_src') || 'null');
  if (saved) return saved;
  let ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  if (ref === location.hostname) ref = '';
  const s = { ref: ref || 'directo', utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '' };
  sessionStorage.setItem('cb_src', JSON.stringify(s));
  return s;
}

export async function initAnalytics() {
  if (started || localStorage.getItem('cb_consent') !== 'yes') return;
  started = true;
  sid = sessionStorage.getItem('cb_sid') || (Math.random().toString(36).slice(2) + Date.now().toString(36));
  sessionStorage.setItem('cb_sid', sid);
  const isNew = !localStorage.getItem('cb_seen'); localStorage.setItem('cb_seen', '1');
  ctx = { sid, ...parseUA(), lang: navigator.language, sw: screen.width, newVisitor: isNew, ...source() };
  ctx.country = await country();
  if (/\/admin\//.test(location.pathname)) return; // no contamos el panel
  track('pageview');
  heartbeat(); setInterval(() => document.visibilityState === 'visible' && heartbeat(), 25000);
  addEventListener('visibilitychange', () => document.visibilityState === 'visible' && heartbeat());
  const s = await getSettings();
  if (s.ga4) loadGA4(s.ga4);
}

async function heartbeat() {
  const now = Date.now();
  try { await db.set('presence', sid, { path: location.pathname, lastSeen: now, expireAt: new Date(now + 120000), device: ctx.device, country: ctx.country }, false); } catch (e) {}
}

export async function track(type, data = {}) {
  if (!started || !ctx) return;
  const ev = { type, path: location.pathname, title: document.title.slice(0, 80), ts: Date.now(), day: day(), ...ctx, ...data };
  try { await db.add('analytics', ev); } catch (e) { /* sin permiso o sin red: se ignora */ }
  if (window.gtag) window.gtag('event', type === 'pageview' ? 'page_view' : type, data);
}

function loadGA4(id) {
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; document.head.append(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date()); gtag('config', id, { anonymize_ip: true });
}

/* Datos sintéticos para el panel en modo demo */
export function demoAnalytics() {
  const out = []; const devs = ['móvil', 'móvil', 'móvil', 'notebook/PC', 'notebook/PC', 'tablet', 'TV', 'consola'];
  const br = ['Chrome', 'Chrome', 'Safari', 'Samsung Internet', 'Firefox', 'Edge']; const os = ['Android', 'Android', 'iOS', 'Windows', 'macOS'];
  const cs = ['Argentina', 'Argentina', 'Argentina', 'Argentina', 'Uruguay', 'Chile', 'España', 'Paraguay'];
  const refs = ['directo', 'directo', 'instagram.com', 'l.instagram.com', 'google.com', 'facebook.com', 'tiktok.com'];
  const pages = ['/', '/', '/tienda/', '/producto/gloss-brillo-eterno/', '/producto/base-segunda-piel/', '/producto/paleta-rose-nude/', '/checkout/', '/nosotros/'];
  let seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; const pick = a => a[Math.floor(r() * a.length)];
  for (let d = 29; d >= 0; d--) {
    const n = 25 + Math.round(30 * Math.sin((30 - d) / 5) ** 2 + r() * 25 + (29 - d));
    for (let i = 0; i < n; i++) {
      const ts = Date.now() - d * 864e5 - r() * 864e5 * .9;
      const e = { type: 'pageview', ts, day: day(ts), path: pick(pages), device: pick(devs), browser: pick(br), os: pick(os), country: pick(cs), ref: pick(refs), utm_source: r() < .15 ? 'instagram' : '', sid: 's' + d + '-' + Math.floor(i / 3) };
      out.push(e);
      if (r() < .12) out.push({ ...e, type: 'add_to_cart' });
      if (r() < .04) out.push({ ...e, type: 'purchase', value: 20000 + Math.round(r() * 50000) });
    }
  }
  return out;
}
export const isDemo = DEMO;
