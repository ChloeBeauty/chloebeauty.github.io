/* Ganchos de seguridad opcionales: Cloudflare Turnstile y llamadas al Worker. */
import { SERVICES } from './config.js';

let tsLoad;
function loadTurnstile() {
  tsLoad = tsLoad || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => res(window.turnstile); s.onerror = rej; document.head.append(s);
  });
  return tsLoad;
}
/* Agrega el widget a un formulario (si hay site key). Devuelve una función que entrega el token. */
export function protectForm(form) {
  if (!SERVICES.turnstileSiteKey || !form) return async () => '';
  const box = document.createElement('div'); box.className = 'ts-box'; box.style.margin = '8px 0';
  form.querySelector('button:last-of-type')?.before(box);
  let id;
  loadTurnstile().then(t => { id = t.render(box, { sitekey: SERVICES.turnstileSiteKey, language: 'es', theme: 'light' }); }).catch(() => {});
  return async () => { const t = window.turnstile; const tok = t && id !== undefined ? t.getResponse(id) : ''; if (t && id !== undefined) t.reset(id); return tok || ''; };
}
/* Verifica el token en el Worker (el secret de Turnstile vive solo ahí). */
export async function verifyHuman(token) {
  if (!SERVICES.turnstileSiteKey) return true;
  if (!SERVICES.workerUrl) return !!token;
  if (!token) throw Object.assign(new Error('Completá la verificación anti-bots.'), { code: 'turnstile' });
  const r = await api('/api/turnstile/verify', { token });
  if (!r.success) throw Object.assign(new Error('No pudimos verificar que no seas un bot.'), { code: 'turnstile' });
  return true;
}
export async function api(path, body) {
  if (!SERVICES.workerUrl) throw new Error('Worker de pagos no configurado');
  const r = await fetch(SERVICES.workerUrl.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), referrerPolicy: 'strict-origin-when-cross-origin' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Error del servidor de pagos'), { code: 'api', status: r.status });
  return j;
}
