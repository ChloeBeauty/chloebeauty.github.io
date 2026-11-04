/* Páginas simples: contacto, vendé con nosotros, arrepentimiento, legales. */
import { boot, $, V, rateLimit } from './ui.js';
import { db, errMsg } from './store.js';
import { protectForm, verifyHuman } from './security.js';
boot();

/* fields: { nombre: [validador, mensaje] } — todo se valida antes de guardar */
function bindForm(id, col, rules, okText, extra = () => ({})) {
  const f = $(id); if (!f) return;
  const token = protectForm(f);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit],button:not([type])', f), er = $('.err', f); er.textContent = '';
    const data = Object.fromEntries(new FormData(f)); delete data.ok;
    for (const k of Object.keys(data)) data[k] = String(data[k]).trim().slice(0, 2000);
    if (f.elements.ok && !f.elements.ok.checked) { er.textContent = 'Tenés que aceptar para continuar.'; return; }
    for (const [k, [fn, msg]] of Object.entries(rules)) if (!fn(data[k])) { er.textContent = msg; f.elements[k]?.focus(); return; }
    btn.disabled = true;
    try {
      rateLimit(col, 3, 10 * 60000);
      await verifyHuman(await token());
      const add = extra(data);
      await db.add(col, { ...data, ...add, status: 'nuevo' });
      const p = document.createElement('p'); p.className = 'ok'; p.style.fontSize = '16px'; p.textContent = okText(add);
      f.replaceChildren(p);
    } catch (err) { er.textContent = err.code === 'rate-limit' || err.code === 'turnstile' ? err.message : errMsg(err); btn.disabled = false; }
  });
}
bindForm('#contactForm', 'messages', {
  name: [s => V.text(s, 2, 80), 'Ingresá tu nombre.'], email: [V.email, 'Ingresá un email válido.'],
  phone: [V.phone, 'El teléfono no es válido.'], message: [s => V.text(s, 5, 2000), 'Escribí tu mensaje (mínimo 5 caracteres).']
}, () => '¡Gracias! Recibimos tu mensaje y te respondemos a la brevedad.');
bindForm('#sellerForm', 'sellerApplications', {
  company: [s => V.text(s, 2, 100), 'Ingresá el nombre de la empresa o marca.'], contact: [s => V.text(s, 2, 80), 'Ingresá la persona de contacto.'],
  email: [V.email, 'Ingresá un email válido.'], phone: [V.phone, 'El teléfono no es válido.'], cuit: [V.cuit, 'El CUIT debe tener 11 números.'],
  web: [s => !s || V.text(s, 2, 200), 'La web es demasiado larga.'], message: [s => !s || V.text(s, 0, 2000), 'El mensaje es demasiado largo.']
}, () => '¡Gracias por postular tu marca! Revisamos tu propuesta y te contactamos por email.');
bindForm('#withdrawForm', 'withdrawals', {
  name: [s => V.text(s, 3, 80), 'Ingresá nombre y apellido.'], dni: [s => s && V.dni(s), 'Ingresá un DNI válido (solo números).'],
  email: [V.email, 'Ingresá un email válido.'], order: [s => V.text(s, 3, 30), 'Ingresá el número de pedido.']
}, a => `Recibimos tu solicitud de arrepentimiento. Tu código de trámite es ${a.code}. Te contactamos por email dentro de las 24 h hábiles.`,
  () => ({ code: 'ARR-' + Date.now().toString(36).toUpperCase() }));
