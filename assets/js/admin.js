/* Panel de administración (protegido por rol). Todo lo que se muestra pasa por esc(). */
import { boot, $, $$, esc, money, date, dateTime, img, ROOT, toast, modal, safeUrl, isHex, V, brandOf, catName } from './ui.js';
import { DEMO, auth, db, errMsg, getSettings, saveSettings, getProducts, invalidateProducts, uploadImage, priceOf } from './store.js';
import { PRODUCTS, CATEGORIES, COLLECTIONS, ORDER_STATUSES } from './data.js';
import { STORE, SERVICES } from './config.js';
import { demoAnalytics } from './analytics.js';
boot();

const box = $('#adm');
const SECTIONS = [['dashboard', 'Dashboard'], ['analitica', 'Analítica'], ['productos', 'Productos'], ['colecciones', 'Catálogos'], ['pedidos', 'Pedidos'], ['pagos', 'Métodos de pago'], ['envios', 'Envíos'], ['marketplace', 'Dropshipping'], ['mensajes', 'Mensajes'], ['usuarios', 'Usuarios'], ['ajustes', 'Ajustes']];
let cur = location.hash.slice(1) || 'dashboard', S, charts = [], unsub = [];
const num = (v, d = 0) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const fd = f => Object.fromEntries(new FormData(f));
const clean = (s, max = 500) => String(s ?? '').trim().slice(0, max);
const PAID = ['pagado', 'preparando', 'enviado', 'entregado'];

function shell() {
  box.innerHTML = `<div class="page-hero" style="padding-bottom:0"><p class="eyebrow">${esc(STORE.name)} · administración ${DEMO ? '<span class="pill">modo demo</span>' : ''}</p></div>
  ${DEMO ? '<p class="note demo">Modo demo: los cambios se guardan solo en este navegador. Conectá Firebase (ver README) para usarlo de verdad. <button class="btn sm ghost" id="resetDemo">Restaurar datos demo</button></p>' : ''}
  <div class="dash"><nav class="side-nav" aria-label="Secciones del panel">${SECTIONS.map(([k, l]) => `<button data-s="${k}" aria-current="${k === cur}">${l}</button>`).join('')}<a class="btn sm ghost" href="${ROOT}" style="margin-top:8px;justify-content:center">Ver tienda</a></nav><section id="sec" aria-live="polite"></section></div>`;
  $$('[data-s]').forEach(b => b.onclick = () => go(b.dataset.s));
  $('#resetDemo')?.addEventListener('click', () => { if (confirm('¿Restaurar todos los datos de ejemplo?')) { db.resetDemo(); location.reload(); } });
}
function go(k) {
  cur = k; history.replaceState(null, '', '#' + k);
  $$('[data-s]').forEach(b => b.setAttribute('aria-current', b.dataset.s === k));
  charts.forEach(c => c.destroy()); charts = []; unsub.forEach(u => u()); unsub = [];
  const el = $('#sec'); el.innerHTML = '<p class="muted">Cargando…</p>';
  ({ dashboard, analitica, productos, colecciones, pedidos, pagos, envios, marketplace, mensajes, usuarios, ajustes })[k](el).catch(e => { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; console.warn(e); });
}
const chartReady = () => new Promise(r => { const t = () => window.Chart ? r(window.Chart) : setTimeout(t, 100); t(); });
async function chart(canvas, cfg) {
  const C = await chartReady();
  C.defaults.font.family = 'Manrope, system-ui, sans-serif'; C.defaults.color = '#8b5a6c';
  const c = new C(canvas, { ...cfg, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: cfg.type === 'doughnut', position: 'bottom' } }, ...(cfg.options || {}) } });
  charts.push(c); return c;
}
const PAL = ['#5b0f2e', '#e58aa6', '#c9a0e6', '#d9708f', '#f3c9d6', '#7a1d42', '#b88bd9', '#f6dde4'];

/* ---------------- Analítica: datos ---------------- */
async function events(days = 30) {
  if (DEMO) { const local = await db.list('analytics'); return [...demoAnalytics(), ...local]; }
  return db.list('analytics', { where: [['ts', '>=', Date.now() - days * 864e5]], orderBy: 'ts', dir: 'asc', limit: 20000 });
}
const countBy = (arr, k) => Object.entries(arr.reduce((m, e) => (m[e[k] || '—'] = (m[e[k] || '—'] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
function liveCounter(el) {
  const set = n => { el.textContent = n; };
  if (DEMO) { set(1 + Math.floor(Math.random() * 4)); const h = setInterval(() => set(1 + Math.floor(Math.random() * 4)), 5000); unsub.push(() => clearInterval(h)); return; }
  let docs = [];
  const calc = () => set(docs.filter(d => Date.now() - d.lastSeen < 60000).length);
  unsub.push(db.watch('presence', { where: [['lastSeen', '>=', Date.now() - 10 * 60000]] }, d => { docs = d; calc(); }));
  const h = setInterval(calc, 5000); unsub.push(() => clearInterval(h));
}

/* ---------------- Dashboard ---------------- */
async function dashboard(el) {
  const [orders, products, ev] = await Promise.all([db.list('orders'), getProducts({ all: true }), events(30)]);
  const paid = orders.filter(o => PAID.includes(o.status));
  const sales = paid.reduce((s, o) => s + o.total, 0);
  const pv = ev.filter(e => e.type === 'pageview');
  el.innerHTML = `<div class="adm-head"><h2>Dashboard</h2><span class="muted small">Últimos 30 días</span></div>
  <div class="kpis"><div class="kpi"><div class="l">Ventas cobradas</div><div class="v">${money(sales)}</div></div><div class="kpi"><div class="l">Pedidos</div><div class="v">${orders.length}</div><div class="l">${orders.filter(o => o.status === 'pendiente').length} pendientes</div></div>
  <div class="kpi"><div class="l">Ticket promedio</div><div class="v">${money(paid.length ? sales / paid.length : 0)}</div></div><div class="kpi"><div class="l">Productos</div><div class="v">${products.length}</div><div class="l">${products.filter(p => p.stock <= 5).length} con poco stock</div></div></div>
  <div class="kpis" style="grid-template-columns:1fr 1fr 1fr"><div class="kpi live"><div class="l"><span class="dot-live"></span>Usuarios en línea ahora</div><div class="v" id="live">–</div></div>
  <div class="kpi"><div class="l">Visitas (30 días)</div><div class="v">${pv.length}</div></div><div class="kpi"><div class="l">Conversión</div><div class="v">${pv.length ? (ev.filter(e => e.type === 'purchase').length / new Set(pv.map(e => e.sid)).size * 100).toFixed(1) : 0}%</div><div class="l">compras / sesiones</div></div></div>
  <div class="charts"><div class="card wide"><h3 style="font-size:16px">Visitas por día</h3><div style="height:220px"><canvas id="c1" aria-label="Visitas por día"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Últimos pedidos</h3>${orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(o => `<div class="sumrow"><span>${esc(o.number)} · <span class="pill ${esc(o.status)}">${esc(o.status)}</span></span><b>${money(o.total)}</b></div>`).join('') || '<p class="muted">Sin pedidos.</p>'}</div>
  <div class="card"><h3 style="font-size:16px">Stock bajo</h3>${products.filter(p => p.stock <= 5).map(p => `<div class="sumrow"><span>${esc(p.name)}</span><b>${+p.stock}</b></div>`).join('') || '<p class="muted">Todo en orden.</p>'}</div></div>`;
  liveCounter($('#live'));
  const days = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10));
  const per = days.map(d => pv.filter(e => e.day === d).length);
  chart($('#c1'), { type: 'line', data: { labels: days.map(d => d.slice(8) + '/' + d.slice(5, 7)), datasets: [{ data: per, borderColor: '#5b0f2e', backgroundColor: 'rgba(229,138,166,.25)', fill: true, tension: .35, pointRadius: 0 }] } });
}

/* ---------------- Analítica completa ---------------- */
async function analitica(el) {
  const ev = await events(30); const pv = ev.filter(e => e.type === 'pageview');
  const sessions = new Set(pv.map(e => e.sid)).size;
  const funnel = [['Sesiones', sessions], ['Agregaron a la bolsa', new Set(ev.filter(e => e.type === 'add_to_cart').map(e => e.sid)).size], ['Iniciaron checkout', new Set(ev.filter(e => e.type === 'begin_checkout').map(e => e.sid)).size], ['Compraron', new Set(ev.filter(e => e.type === 'purchase').map(e => e.sid)).size]];
  const tbl = (rows, h) => `<table class="t"><thead><tr><th>${h}</th><th>Visitas</th></tr></thead><tbody>${rows.slice(0, 10).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</tbody></table>`;
  const utm = countBy(pv.filter(e => e.utm_source), 'utm_source');
  el.innerHTML = `<div class="adm-head"><h2>Analítica</h2><span class="muted small">Propia, anónima y con consentimiento · últimos 30 días ${S.ga4 ? '· GA4 activo' : ''}</span></div>
  <div class="kpis"><div class="kpi live"><div class="l"><span class="dot-live"></span>En línea ahora</div><div class="v" id="live">–</div></div><div class="kpi"><div class="l">Visitas</div><div class="v">${pv.length}</div></div><div class="kpi"><div class="l">Sesiones</div><div class="v">${sessions}</div></div><div class="kpi"><div class="l">Páginas / sesión</div><div class="v">${sessions ? (pv.length / sessions).toFixed(1) : 0}</div></div></div>
  <div class="charts"><div class="card wide"><h3 style="font-size:16px">Visitas por día</h3><div style="height:220px"><canvas id="a1"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Dispositivos</h3><div style="height:230px"><canvas id="a2"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Países</h3><div style="height:230px"><canvas id="a3"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Navegadores</h3><div style="height:230px"><canvas id="a4"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Sistemas operativos</h3><div style="height:230px"><canvas id="a5"></canvas></div></div>
  <div class="card"><h3 style="font-size:16px">Páginas más vistas</h3>${tbl(countBy(pv, 'path'), 'Página')}</div>
  <div class="card"><h3 style="font-size:16px">Origen (referrers)</h3>${tbl(countBy(pv, 'ref'), 'Origen')}${utm.length ? `<h3 style="font-size:14px;margin-top:12px">Campañas UTM</h3>${tbl(utm, 'utm_source')}` : ''}</div>
  <div class="card wide"><h3 style="font-size:16px">Conversiones</h3><div style="height:200px"><canvas id="a6"></canvas></div><p class="small muted">Ingresos registrados: ${money(ev.filter(e => e.type === 'purchase').reduce((s, e) => s + (e.value || 0), 0))}</p></div></div>
  <p class="small muted">Los países se estiman con un servicio público de geolocalización (ipapi.co / Cloudflare) sin guardar la IP. Los dispositivos se detectan por userAgent y tamaño de pantalla (móvil, tablet, notebook/PC, TV, consola).</p>`;
  liveCounter($('#live'));
  const days = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10));
  chart($('#a1'), { type: 'bar', data: { labels: days.map(d => d.slice(8) + '/' + d.slice(5, 7)), datasets: [{ data: days.map(d => pv.filter(e => e.day === d).length), backgroundColor: '#e58aa6', borderRadius: 6 }] } });
  const dough = (id, rows) => chart($(id), { type: 'doughnut', data: { labels: rows.map(r => r[0]), datasets: [{ data: rows.map(r => r[1]), backgroundColor: PAL, borderWidth: 0 }] } });
  dough('#a2', countBy(pv, 'device')); dough('#a4', countBy(pv, 'browser').slice(0, 6)); dough('#a5', countBy(pv, 'os').slice(0, 6));
  const cs = countBy(pv, 'country').slice(0, 8);
  chart($('#a3'), { type: 'bar', data: { labels: cs.map(r => r[0]), datasets: [{ data: cs.map(r => r[1]), backgroundColor: '#5b0f2e', borderRadius: 6 }] }, options: { indexAxis: 'y' } });
  chart($('#a6'), { type: 'bar', data: { labels: funnel.map(f => f[0]), datasets: [{ data: funnel.map(f => f[1]), backgroundColor: ['#f3c9d6', '#e58aa6', '#c9a0e6', '#5b0f2e'], borderRadius: 8 }] } });
}

/* ---------------- Productos ---------------- */
async function productos(el) {
  const list = await getProducts({ all: true, force: true });
  const sellers = S.marketplace.enabled ? await db.list('sellers') : [];
  el.innerHTML = `<div class="adm-head"><h2>Productos</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${!DEMO ? '<button class="btn sm ghost" id="seed">Importar catálogo de ejemplo</button>' : ''}<button class="btn sm" id="newp">+ Nuevo producto</button></div></div>
  <input type="search" id="ps" placeholder="Buscar por nombre, SKU o marca" style="margin-bottom:10px">
  <div class="table-wrap"><table class="t"><thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody id="pt"></tbody></table></div>`;
  const draw = f => { $('#pt').innerHTML = list.filter(p => !f || [p.name, p.sku, brandOf(p)].join(' ').toLowerCase().includes(f.toLowerCase())).map(p => `<tr><td><img src="${esc(img(p.images?.[0]))}" alt=""></td><td><b>${esc(p.name)}</b><div class="small muted">${esc(brandOf(p))} · ${esc(p.sku || '')}${p.sellerId ? ' · vendedor' : ''}</div></td><td>${esc(catName(p.category))}</td><td>${money(p.price)}${p.compareAt ? `<div class="small muted"><s>${money(p.compareAt)}</s></div>` : ''}</td><td>${+p.stock}</td><td><span class="pill ${esc(p.status)}">${p.status === 'published' ? 'publicado' : 'borrador'}</span></td><td style="white-space:nowrap"><button class="btn sm ghost" data-e="${esc(p.id)}">Editar</button> <button class="btn sm ghost" data-d="${esc(p.id)}" aria-label="Eliminar ${esc(p.name)}">✕</button></td></tr>`).join(''); };
  draw(); $('#ps').oninput = e => draw(e.target.value);
  $('#newp').onclick = () => editProduct(null, sellers);
  $('#seed')?.addEventListener('click', async () => { if (!confirm('¿Cargar los 11 productos y 2 catálogos de ejemplo en Firestore?')) return; for (const p of PRODUCTS) await db.set('products', p.id, p, false); for (const c of COLLECTIONS) await db.set('collections', c.id, c, false); invalidateProducts(); toast('Catálogo importado'); go('productos'); });
  el.onclick = async e => {
    const b = e.target.closest('[data-e]'); if (b) editProduct(list.find(p => p.id === b.dataset.e), sellers);
    const d = e.target.closest('[data-d]'); if (d && confirm('¿Eliminar este producto? No se puede deshacer.')) { await db.del('products', d.dataset.d); invalidateProducts(); toast('Producto eliminado'); go('productos'); }
  };
}
function editProduct(p, sellers) {
  const raw = p ? { ...p, price: p.sellerId ? p.price : p.price } : { id: '', name: '', brand: '', category: 'labios', price: 0, compareAt: null, stock: 0, sku: '', size: '', images: [], variants: [], tags: [], status: 'draft', short: '', description: '', seo: { title: '', description: '' }, featured: false, sellerId: null, sellerPrice: null, commission: null };
  let images = [...(raw.images || [])];
  const mk = S.marketplace.enabled;
  modal(`<div class="adm-head"><h2>${p ? 'Editar producto' : 'Nuevo producto'}</h2><button class="iconbtn" data-close aria-label="Cerrar">✕</button></div>
  <form id="pf" novalidate>
  <div class="row2"><label class="field">Nombre<input name="name" required maxlength="120" value="${esc(raw.name)}"></label><label class="field">Marca <span class="h">(vacío = ${esc(STORE.name)})</span><input name="brand" maxlength="60" value="${esc(raw.brand)}"></label></div>
  <div class="row3"><label class="field">Categoría<select name="category">${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === raw.category ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><label class="field">SKU<input name="sku" maxlength="40" value="${esc(raw.sku)}"></label><label class="field">Tamaño<input name="size" maxlength="30" value="${esc(raw.size)}" placeholder="50 ml"></label></div>
  <div class="row3"><label class="field">Precio ($)<input name="price" type="number" min="0" step="1" value="${+raw.price || 0}"></label><label class="field">Precio anterior <span class="h">(tachado)</span><input name="compareAt" type="number" min="0" value="${raw.compareAt || ''}"></label><label class="field">Stock<input name="stock" type="number" min="0" step="1" value="${+raw.stock || 0}"></label></div>
  ${mk ? `<fieldset class="card" style="background:var(--bg2);margin-bottom:12px"><legend class="small"><b>Dropshipping / vendedor</b></legend><div class="row2"><label class="field">Vendedor<select name="sellerId"><option value="">— Propio —</option>${sellers.map(s => `<option value="${esc(s.id)}" ${s.id === raw.sellerId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><label class="field">Precio del vendedor ($)<input name="sellerPrice" type="number" min="0" value="${raw.sellerPrice ?? ''}"></label></div>
  <div class="row2"><label class="field">Comisión<select name="ctype"><option value="">Por defecto (${esc(S.marketplace.defaultCommission)}${S.marketplace.defaultCommissionType === 'pct' ? '%' : ' $'})</option><option value="pct" ${raw.commission?.type === 'pct' ? 'selected' : ''}>Porcentaje</option><option value="fixed" ${raw.commission?.type === 'fixed' ? 'selected' : ''}>Monto fijo</option></select></label><label class="field">Valor<input name="cval" type="number" min="0" value="${raw.commission?.value ?? ''}"></label></div><p class="small">Precio público calculado: <b id="pub">—</b></p></fieldset>` : ''}
  <label class="field">Fotos <span class="h">Subí varias, ordenalas con ← →. Primera = principal.</span></label><div class="imgs-edit" id="imgs"></div>
  <div class="row2" style="margin-top:8px"><label class="field">Subir fotos<input type="file" id="files" accept="image/*" multiple></label><label class="field">…o pegar URL de imagen (https)<span style="display:flex;gap:6px"><input id="iurl" type="url" placeholder="https://…"><button type="button" class="btn sm" id="addurl">Agregar</button></span></label></div>
  <label class="field">Descripción corta<input name="short" maxlength="160" value="${esc(raw.short)}"></label>
  <label class="field">Descripción<textarea name="description" maxlength="3000">${esc(raw.description)}</textarea></label>
  <label class="field">Tonos / variantes <span class="h">Uno por línea: Nombre | #color (opcional)</span><textarea name="variants" maxlength="1500">${esc((raw.variants || []).map(v => v.hex ? `${v.name} | ${v.hex}` : v.name).join('\n'))}</textarea></label>
  <label class="field">Etiquetas <span class="h">separadas por coma (ej.: nuevo, más vendido)</span><input name="tags" maxlength="200" value="${esc((raw.tags || []).join(', '))}"></label>
  <div class="row2"><label class="field">Título SEO<input name="seoTitle" maxlength="70" value="${esc(raw.seo?.title)}"></label><label class="field">Descripción SEO<input name="seoDesc" maxlength="160" value="${esc(raw.seo?.description)}"></label></div>
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin:6px 0 14px"><label class="switch"><input type="checkbox" name="published" ${raw.status === 'published' ? 'checked' : ''}> Publicado</label><label class="switch"><input type="checkbox" name="featured" ${raw.featured ? 'checked' : ''}> Destacado</label></div>
  <button class="btn">Guardar producto</button> <span class="err" role="alert"></span></form>`, (m, close) => {
    const f = $('#pf', m), er = $('.err', f);
    const drawImgs = () => { $('#imgs', m).innerHTML = images.map((s, i) => `<i class="it"><img src="${esc(img(s))}" alt="Foto ${i + 1}"><span class="ctl"><button type="button" data-mv="${i}" data-dir="-1" aria-label="Mover a la izquierda">←</button><button type="button" data-rmi="${i}" aria-label="Quitar foto">✕</button><button type="button" data-mv="${i}" data-dir="1" aria-label="Mover a la derecha">→</button></span></i>`).join('') || '<p class="small muted">Sin fotos.</p>'; };
    drawImgs();
    $('#imgs', m).onclick = e => {
      const mv = e.target.closest('[data-mv]'); if (mv) { const i = +mv.dataset.mv, j = i + +mv.dataset.dir; if (j >= 0 && j < images.length) { [images[i], images[j]] = [images[j], images[i]]; drawImgs(); } }
      const rm = e.target.closest('[data-rmi]'); if (rm) { images.splice(+rm.dataset.rmi, 1); drawImgs(); }
    };
    $('#addurl', m).onclick = () => { const u = safeUrl($('#iurl', m).value); if (!u || !/^https:/.test(u)) return toast('Pegá una URL https válida'); images.push(u); $('#iurl', m).value = ''; drawImgs(); };
    $('#files', m).onchange = async e => {
      for (const file of [...e.target.files].slice(0, 8)) {
        if (!file.type.startsWith('image/') || file.size > 15e6) { toast('Archivo no válido: ' + file.name); continue; }
        try { toast('Subiendo ' + file.name + '…'); images.push(await uploadImage(file)); drawImgs(); }
        catch (x) { toast('No se pudo subir (¿Storage activado?). Usá una URL.'); console.warn(x); }
      }
      e.target.value = '';
    };
    const pub = () => { if (!mk || !$('#pub', m)) return; const d = fd(f); $('#pub', m).textContent = d.sellerId && d.sellerPrice ? money(priceOf({ sellerId: d.sellerId, sellerPrice: num(d.sellerPrice), commission: d.ctype ? { type: d.ctype, value: num(d.cval) } : null }, S)) : 'usa el precio normal'; };
    f.addEventListener('input', pub); pub();
    f.onsubmit = async e => {
      e.preventDefault(); er.textContent = ''; const d = fd(f);
      if (!V.text(d.name, 2, 120)) return er.textContent = 'Ingresá el nombre.';
      const price = Math.round(num(d.price)), stock = Math.round(num(d.stock));
      if (price < 0 || stock < 0) return er.textContent = 'Precio y stock no pueden ser negativos.';
      const variants = clean(d.variants, 1500).split('\n').map(l => l.split('|').map(x => x.trim())).filter(([n]) => n).slice(0, 30).map(([name, hex]) => ({ name: name.slice(0, 40), ...(isHex(hex) ? { hex } : {}) }));
      const id = p?.id || slugify(d.name) + '-' + Date.now().toString(36).slice(-4);
      const doc = { name: clean(d.name, 120), slug: p?.slug || slugify(d.name), brand: clean(d.brand, 60), category: CATEGORIES.some(c => c.id === d.category) ? d.category : 'labios', sku: clean(d.sku, 40), size: clean(d.size, 30),
        price, compareAt: d.compareAt ? Math.round(num(d.compareAt)) || null : null, stock, images: images.slice(0, 12), variants, tags: clean(d.tags, 200).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 15),
        short: clean(d.short, 160), description: clean(d.description, 3000), seo: { title: clean(d.seoTitle, 70), description: clean(d.seoDesc, 160) },
        status: d.published ? 'published' : 'draft', featured: !!d.featured, updatedAt: Date.now(), ...(p ? {} : { createdAt: Date.now() }) };
      if (mk) Object.assign(doc, { sellerId: d.sellerId || null, sellerPrice: d.sellerId && d.sellerPrice ? Math.round(num(d.sellerPrice)) : null, commission: d.ctype ? { type: d.ctype, value: num(d.cval) } : null });
      try { await db.set('products', id, doc); invalidateProducts(); toast('Producto guardado'); close(); go('productos'); } catch (x) { er.textContent = errMsg(x); }
    };
  });
}

/* ---------------- Catálogos / colecciones ---------------- */
async function colecciones(el) {
  const [cols, prods] = await Promise.all([db.list('collections'), getProducts({ all: true })]);
  el.innerHTML = `<div class="adm-head"><h2>Catálogos y colecciones</h2><button class="btn sm" id="newc">+ Nueva colección</button></div>
  ${cols.map(c => `<div class="card" style="margin-bottom:10px"><div class="adm-head" style="margin:0"><div><b>${esc(c.name)}</b><div class="small muted">${esc(c.description || '')} · ${(c.productIds || []).length} productos</div></div><div><button class="btn sm ghost" data-ce="${esc(c.id)}">Editar</button> <button class="btn sm ghost" data-cd="${esc(c.id)}">✕</button></div></div></div>`).join('') || '<p class="muted">Sin colecciones.</p>'}
  <p class="small muted">La colección con id <b>la-rutina-completa</b> alimenta el botón flotante “La rutina completa” del inicio.</p>`;
  const edit = c => modal(`<div class="adm-head"><h2>${c ? 'Editar' : 'Nueva'} colección</h2><button class="iconbtn" data-close aria-label="Cerrar">✕</button></div><form id="cf2"><label class="field">Nombre<input name="name" maxlength="80" required value="${esc(c?.name || '')}"></label><label class="field">Descripción<input name="description" maxlength="200" value="${esc(c?.description || '')}"></label>
    <fieldset style="border:0;padding:0"><legend class="small"><b>Productos</b></legend>${prods.map(p => `<label class="check"><input type="checkbox" name="p" value="${esc(p.id)}" ${(c?.productIds || []).includes(p.id) ? 'checked' : ''}> ${esc(p.name)}</label>`).join('')}</fieldset><button class="btn">Guardar</button> <span class="err"></span></form>`, (m, close) => {
    $('#cf2', m).onsubmit = async e => { e.preventDefault(); const f = e.target; const name = clean(f.name.value, 80); if (!name) return;
      const ids = $$('input[name=p]:checked', f).map(i => i.value);
      try { await db.set('collections', c?.id || slugify(name), { name, description: clean(f.description.value, 200), productIds: ids }); toast('Colección guardada'); close(); go('colecciones'); } catch (x) { $('.err', f).textContent = errMsg(x); } };
  });
  $('#newc').onclick = () => edit(null);
  el.onclick = async e => { const b = e.target.closest('[data-ce]'); if (b) edit(cols.find(c => c.id === b.dataset.ce)); const d = e.target.closest('[data-cd]'); if (d && confirm('¿Eliminar la colección?')) { await db.del('collections', d.dataset.cd); go('colecciones'); } };
}

/* ---------------- Pedidos ---------------- */
async function pedidos(el) {
  const list = (await db.list('orders')).sort((a, b) => b.createdAt - a.createdAt);
  el.innerHTML = `<div class="adm-head"><h2>Pedidos</h2><select id="fs" style="width:auto"><option value="">Todos los estados</option>${ORDER_STATUSES.map(s => `<option>${s}</option>`).join('')}</select></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Pago</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody id="ot"></tbody></table></div>`;
  const draw = f => $('#ot').innerHTML = list.filter(o => !f || o.status === f).map(o => `<tr><td><b>${esc(o.number)}</b></td><td>${esc(o.customer?.name)}<div class="small muted">${esc(o.email)}</div></td><td>${dateTime(o.createdAt)}</td><td>${esc(o.payment?.label)}<div class="small muted">${o.payment?.mode === 'auto' ? 'automático' : 'manual'}</div></td><td><span class="pill ${esc(o.status)}">${esc(o.status)}</span></td><td>${money(o.total)}</td><td><button class="btn sm ghost" data-o="${esc(o.id)}">Gestionar</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Sin pedidos.</td></tr>';
  draw(); $('#fs').onchange = e => draw(e.target.value);
  el.onclick = e => { const b = e.target.closest('[data-o]'); if (b) orderModal(list.find(o => o.id === b.dataset.o)); };
}
function orderModal(o) {
  const carriers = S.shipping.carriers || [];
  const a = o.shipping?.address;
  modal(`<div class="adm-head"><h2>Pedido ${esc(o.number)}</h2><button class="iconbtn" data-close aria-label="Cerrar">✕</button></div>
  <div class="row2" style="align-items:start"><div><p><b>${esc(o.customer?.name)}</b><br>${esc(o.email)}<br>${esc(o.customer?.phone || '')}${o.customer?.dni ? '<br>DNI ' + esc(o.customer.dni) : ''}</p>
  <p class="small">${esc(o.shipping?.label)}${a ? `<br>${esc(a.street)} ${esc(a.apt || '')}, ${esc(a.city)}, ${esc(a.province)} (${esc(a.zip)})` : ''}</p>
  <p class="small">Pago: ${esc(o.payment?.label)} (${o.payment?.mode === 'auto' ? 'automático' : 'manual'})${o.payment?.id ? ' · ID ' + esc(o.payment.id) : ''}${o.verifiedTotal ? `<br>Total verificado por servidor: <b>${money(o.verifiedTotal)}</b>` : ''}</p>
  ${o.notes ? `<p class="note small">Nota de la clienta: ${esc(o.notes)}</p>` : ''}</div>
  <div>${o.items.map(i => `<div class="sumrow small"><span>${esc(i.name)} ${esc(i.variant ? '· ' + i.variant : '')} × ${+i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}<div class="sumrow"><span>Envío</span><span>${money(o.shippingCost)}</span></div>${o.discount ? `<div class="sumrow"><span>Descuento</span><span>−${money(o.discount)}</span></div>` : ''}<div class="sumrow total"><span>Total</span><span>${money(o.total)}</span></div></div></div>
  <form id="of"><div class="row3"><label class="field">Estado<select name="status">${ORDER_STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
  <label class="field">Transporte<select name="carrier"><option value="">—</option>${carriers.map(c => `<option ${c.name === o.tracking?.carrier ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="field">Código de seguimiento<input name="code" maxlength="60" value="${esc(o.tracking?.code || '')}"></label></div>
  <label class="field">Notas internas<textarea name="adminNotes" maxlength="1000">${esc(o.adminNotes || '')}</textarea></label>
  <button class="btn">Guardar cambios</button> <span class="err" role="alert"></span></form>
  <h3 style="font-size:15px;margin-top:16px">Historial</h3><ul class="small">${(o.history || []).map(h => `<li>${esc(h.status)} · ${dateTime(h.at)}${h.note ? ' · ' + esc(h.note) : ''}</li>`).join('')}</ul>`, (m, close) => {
    $('#of', m).onsubmit = async e => {
      e.preventDefault(); const d = fd(e.target); const er = $('.err', e.target);
      if (!ORDER_STATUSES.includes(d.status)) return;
      const c = carriers.find(x => x.name === d.carrier); const code = clean(d.code, 60).replace(/[^\w-]/g, '');
      const upd = { status: d.status, adminNotes: clean(d.adminNotes, 1000), tracking: c && code ? { carrier: c.name, code, url: safeUrl(c.trackUrl.replace('{code}', encodeURIComponent(code))) } : null, updatedAt: Date.now() };
      if (d.status !== o.status) upd.history = [...(o.history || []), { status: d.status, at: Date.now(), note: 'admin' }];
      try {
        if (PAID.includes(d.status) && !o.stockApplied) { // descontar stock una sola vez
          const ps = await getProducts({ all: true, force: true });
          for (const it of o.items) { const p = ps.find(x => x.id === it.id); if (p) await db.set('products', p.id, { stock: Math.max(0, (+p.stock || 0) - it.qty) }); }
          upd.stockApplied = true; invalidateProducts();
        }
        if (PAID.includes(d.status)) upd.payment = { ...o.payment, status: 'aprobado' };
        await db.set('orders', o.id, upd); toast('Pedido actualizado'); close(); go('pedidos');
      } catch (x) { er.textContent = errMsg(x); }
    };
  });
}

/* ---------------- Pagos ---------------- */
async function pagos(el) {
  const P = S.payments;
  el.innerHTML = `<div class="adm-head"><h2>Métodos de pago</h2></div>
  <p class="note ${SERVICES.workerUrl ? '' : 'demo'}">${SERVICES.workerUrl ? `Worker de pagos conectado: <b>${esc(SERVICES.workerUrl)}</b>. Mercado Pago y PayPal se confirman automáticamente.` : 'Sin Worker de pagos: Mercado Pago funciona como <b>pago manual</b> (enviás el link) y PayPal queda oculto. Para cobro automático seguí el README → “Pagos automáticos”.'}</p>
  <form id="payf">
  <div class="card" style="margin:12px 0"><label class="switch"><input type="checkbox" name="mp_on" ${P.mercadopago.enabled ? 'checked' : ''}> Mercado Pago</label>
   <label class="field" style="margin-top:10px">Link de pago para cobro manual <span class="h">(link.mercadopago.com.ar/… o mpago.la/…)</span><input name="mp_link" type="url" maxlength="300" value="${esc(P.mercadopago.link)}"></label>
   <label class="field">Mensaje para la clienta (pago manual)<input name="mp_note" maxlength="300" value="${esc(P.mercadopago.note)}"></label>
   <p class="small muted">Pago automático: el Access Token va SOLO como secret del Worker. La Public Key va en <code>config.js → SERVICES.mercadoPagoPublicKey</code>.</p></div>
  <div class="card" style="margin-bottom:12px"><label class="switch"><input type="checkbox" name="pp_on" ${P.paypal.enabled ? 'checked' : ''}> PayPal</label>
   <label class="field" style="margin-top:10px">Cotización: pesos por 1 ${esc(SERVICES.paypalCurrency)}<input name="pp_rate" type="number" min="1" value="${+P.paypal.usdRate || 0}"></label>
   <p class="small muted">Client ID público: <code>config.js → SERVICES.paypalClientId</code> (${SERVICES.paypalClientId ? 'configurado' : 'vacío'}). El secret va solo en el Worker.</p></div>
  <div class="card" style="margin-bottom:12px"><label class="switch"><input type="checkbox" name="tr_on" ${P.transferencia.enabled ? 'checked' : ''}> Transferencia bancaria</label>
   <label class="field" style="margin-top:10px">Datos (alias, CBU, titular)<textarea name="tr_info" maxlength="400">${esc(P.transferencia.info)}</textarea></label><label class="field">Descuento por transferencia (%)<input name="tr_disc" type="number" min="0" max="50" value="${+P.transferencia.discount || 0}"></label></div>
  <div class="card" style="margin-bottom:12px"><label class="switch"><input type="checkbox" name="ef_on" ${P.efectivo.enabled ? 'checked' : ''}> Efectivo al retirar</label><label class="field" style="margin-top:10px">Indicaciones<input name="ef_info" maxlength="300" value="${esc(P.efectivo.info)}"></label></div>
  <button class="btn">Guardar</button> <span class="err" role="alert"></span></form>`;
  $('#payf').onsubmit = async e => {
    e.preventDefault(); const d = fd(e.target);
    const link = clean(d.mp_link, 300); if (link && !/^https:\/\//.test(link)) return $('.err', e.target).textContent = 'El link debe empezar con https://';
    S.payments = { mercadopago: { ...P.mercadopago, enabled: !!d.mp_on, link, note: clean(d.mp_note, 300) }, paypal: { ...P.paypal, enabled: !!d.pp_on, usdRate: Math.max(1, num(d.pp_rate, 1)) },
      transferencia: { ...P.transferencia, enabled: !!d.tr_on, info: clean(d.tr_info, 400), discount: Math.min(50, Math.max(0, num(d.tr_disc))) }, efectivo: { ...P.efectivo, enabled: !!d.ef_on, info: clean(d.ef_info, 300) } };
    try { await saveSettings(S); toast('Métodos de pago guardados'); } catch (x) { $('.err', e.target).textContent = errMsg(x); }
  };
}

/* ---------------- Envíos ---------------- */
async function envios(el) {
  const sh = S.shipping;
  el.innerHTML = `<div class="adm-head"><h2>Envíos</h2></div><form id="shf">
  <div class="card" style="margin-bottom:12px"><label class="field">Envío gratis desde ($) <span class="h">0 = nunca</span><input name="free" type="number" min="0" value="${+sh.freeFrom || 0}"></label></div>
  <div id="ml">${sh.methods.map((m, i) => `<div class="card" style="margin-bottom:10px" data-i="${i}"><div class="row3"><label class="field">Nombre<input name="l${i}" maxlength="80" value="${esc(m.label)}"></label><label class="field">Tipo<select name="t${i}">${[['retiro', 'Retiro en local'], ['fijo', 'Tarifa fija'], ['zona', 'Por zona/provincia'], ['gratis', 'Gratis']].map(([v, l]) => `<option value="${v}" ${v === m.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="field">Costo base ($)<input name="c${i}" type="number" min="0" value="${+m.cost || 0}"></label></div>
  <label class="field">Costos por zona <span class="h">una por línea: Provincia = costo (también “Patagonia”)</span><textarea name="z${i}" maxlength="1500">${esc(Object.entries(m.zones || {}).map(([k, v]) => `${k} = ${v}`).join('\n'))}</textarea></label>
  <div style="display:flex;justify-content:space-between"><label class="switch"><input type="checkbox" name="e${i}" ${m.enabled ? 'checked' : ''}> Activo</label><button type="button" class="btn sm ghost" data-rmm="${i}">Eliminar</button></div></div>`).join('')}</div>
  <button type="button" class="btn sm ghost" id="addm">+ Agregar método</button>
  <div class="card" style="margin:12px 0"><h3 style="font-size:16px">Transportes para seguimiento</h3><p class="small muted">Uno por línea: Nombre | URL de seguimiento con {code}</p><textarea name="carriers" maxlength="2000">${esc(sh.carriers.map(c => `${c.name} | ${c.trackUrl}`).join('\n'))}</textarea></div>
  <button class="btn">Guardar</button> <span class="err" role="alert"></span></form>`;
  const f = $('#shf');
  $('#addm').onclick = async () => { S.shipping.methods.push({ id: 'm' + Date.now().toString(36), label: 'Nuevo envío', type: 'fijo', cost: 0, enabled: false }); envios(el); };
  el.onclick = e => { const b = e.target.closest('[data-rmm]'); if (b && confirm('¿Eliminar método?')) { S.shipping.methods.splice(+b.dataset.rmm, 1); envios(el); } };
  f.onsubmit = async e => {
    e.preventDefault(); const d = fd(f);
    const methods = sh.methods.map((m, i) => ({ id: m.id, label: clean(d['l' + i], 80) || 'Envío', type: d['t' + i], cost: Math.max(0, num(d['c' + i])), enabled: !!d['e' + i],
      zones: Object.fromEntries(clean(d['z' + i], 1500).split('\n').map(l => l.split('=').map(x => x.trim())).filter(([k, v]) => k && v && Number.isFinite(+v)).map(([k, v]) => [k.slice(0, 40), +v])) }));
    const carriers = clean(d.carriers, 2000).split('\n').map(l => l.split('|').map(x => x.trim())).filter(([n, u]) => n && /^https:\/\/.+\{code\}/.test(u || '')).map(([name, trackUrl]) => ({ id: slugify(name), name: name.slice(0, 40), trackUrl }));
    S.shipping = { freeFrom: Math.max(0, num(d.free)), methods, carriers };
    try { await saveSettings(S); toast('Envíos guardados'); } catch (x) { $('.err', f).textContent = errMsg(x); }
  };
}

/* ---------------- Dropshipping / marketplace ---------------- */
async function marketplace(el) {
  const mk = S.marketplace;
  const [sellers, apps, orders, prods] = await Promise.all([db.list('sellers'), db.list('sellerApplications'), db.list('orders'), getProducts({ all: true })]);
  const rep = sellers.map(s => {
    let sales = 0, payout = 0, n = 0;
    orders.filter(o => PAID.includes(o.status)).forEach(o => o.items.filter(i => i.sellerId === s.id).forEach(i => {
      const p = prods.find(x => x.id === i.id); const base = p?.sellerPrice ?? i.price * (1 - (s.commission || mk.defaultCommission) / 100);
      sales += i.price * i.qty; payout += Math.min(base, i.price) * i.qty; n++;
    }));
    return { s, sales, payout, commission: sales - payout, n };
  });
  el.innerHTML = `<div class="adm-head"><h2>Dropshipping / marketplace</h2><label class="switch"><input type="checkbox" id="mkon" ${mk.enabled ? 'checked' : ''}> ${mk.enabled ? 'Activado' : 'Desactivado'}</label></div>
  <p class="small muted">Con el modo activado, podés cargar vendedores (marcas o empresas). Sus productos se publican con <b>precio del vendedor + tu comisión</b> y el stock lo informa el vendedor. Desactivado, sus productos se ocultan de la tienda.</p>
  <form id="mkf" class="card" style="margin:12px 0"><div class="row3"><label class="field">Comisión por defecto<select name="type"><option value="pct" ${mk.defaultCommissionType === 'pct' ? 'selected' : ''}>Porcentaje (%)</option><option value="fixed" ${mk.defaultCommissionType === 'fixed' ? 'selected' : ''}>Monto fijo ($)</option></select></label><label class="field">Valor<input name="val" type="number" min="0" value="${+mk.defaultCommission}"></label><div style="align-self:end;margin-bottom:12px"><button class="btn sm">Guardar</button></div></div></form>
  <div class="adm-head"><h3 style="font-size:20px;margin:0">Vendedores</h3><button class="btn sm" id="news">+ Nuevo vendedor</button></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Vendedor</th><th>Comisión</th><th>Productos</th><th>Ventas</th><th>Tu comisión</th><th>A pagar al vendedor</th><th></th></tr></thead><tbody>
  ${rep.map(({ s, sales, payout, commission }) => `<tr><td><b>${esc(s.name)}</b><div class="small muted">${esc(s.email)} · ${s.active ? 'activo' : 'inactivo'}</div></td><td>${s.commission ?? mk.defaultCommission}${(s.commissionType || mk.defaultCommissionType) === 'pct' ? '%' : ' $'}</td><td>${prods.filter(p => p.sellerId === s.id).length}</td><td>${money(sales)}</td><td><b>${money(commission)}</b></td><td>${money(payout)}</td><td><button class="btn sm ghost" data-se="${esc(s.id)}">Editar</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Sin vendedores.</td></tr>'}</tbody></table></div>
  <h3 style="font-size:20px;margin:22px 0 10px">Postulaciones recibidas</h3>
  <div class="table-wrap"><table class="t"><thead><tr><th>Empresa</th><th>Contacto</th><th>Categoría</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>
  ${apps.sort((a, b) => b.createdAt - a.createdAt).map(a => `<tr><td><b>${esc(a.company)}</b><div class="small muted">${esc(a.web || '')}</div></td><td>${esc(a.contact)}<div class="small muted">${esc(a.email)} ${esc(a.phone || '')}</div></td><td>${esc(a.category)}</td><td>${date(a.createdAt)}</td><td><span class="pill">${esc(a.status)}</span></td><td style="white-space:nowrap"><button class="btn sm ghost" data-aa="${esc(a.id)}">Aprobar</button> <button class="btn sm ghost" data-ar="${esc(a.id)}">Rechazar</button></td></tr>${a.message ? `<tr><td colspan="6" class="small muted">“${esc(a.message)}”</td></tr>` : ''}`).join('') || '<tr><td colspan="6" class="muted">Sin postulaciones.</td></tr>'}</tbody></table></div>`;
  $('#mkon').onchange = async e => { S.marketplace.enabled = e.target.checked; await saveSettings(S); invalidateProducts(); toast(e.target.checked ? 'Marketplace activado' : 'Marketplace desactivado'); go('marketplace'); };
  $('#mkf').onsubmit = async e => { e.preventDefault(); const d = fd(e.target); S.marketplace.defaultCommissionType = d.type === 'fixed' ? 'fixed' : 'pct'; S.marketplace.defaultCommission = Math.max(0, num(d.val)); await saveSettings(S); toast('Guardado'); };
  const editS = s => modal(`<div class="adm-head"><h2>${s ? 'Editar' : 'Nuevo'} vendedor</h2><button class="iconbtn" data-close aria-label="Cerrar">✕</button></div><form id="sf"><div class="row2"><label class="field">Nombre / marca<input name="name" maxlength="80" required value="${esc(s?.name || '')}"></label><label class="field">Email<input name="email" type="email" maxlength="190" value="${esc(s?.email || '')}"></label></div>
  <div class="row3"><label class="field">CUIT<input name="cuit" maxlength="13" value="${esc(s?.cuit || '')}"></label><label class="field">Comisión<select name="commissionType"><option value="pct" ${s?.commissionType !== 'fixed' ? 'selected' : ''}>%</option><option value="fixed" ${s?.commissionType === 'fixed' ? 'selected' : ''}>$ fijo</option></select></label><label class="field">Valor<input name="commission" type="number" min="0" value="${s?.commission ?? mk.defaultCommission}"></label></div>
  <label class="switch"><input type="checkbox" name="active" ${s?.active !== false ? 'checked' : ''}> Activo</label><p></p><button class="btn">Guardar</button> ${s ? '<button type="button" class="btn ghost" id="dels">Eliminar</button>' : ''} <span class="err" role="alert"></span></form>`, (m, close) => {
    $('#sf', m).onsubmit = async e => { e.preventDefault(); const d = fd(e.target); const er = $('.err', e.target);
      if (!V.text(d.name, 2, 80)) return er.textContent = 'Ingresá el nombre.'; if (d.email && !V.email(d.email)) return er.textContent = 'Email no válido.'; if (!V.cuit(d.cuit)) return er.textContent = 'CUIT no válido.';
      await db.set('sellers', s?.id || slugify(d.name), { name: clean(d.name, 80), email: clean(d.email, 190), cuit: clean(d.cuit, 13), commissionType: d.commissionType === 'fixed' ? 'fixed' : 'pct', commission: Math.max(0, num(d.commission)), active: !!d.active, ...(s ? {} : { createdAt: Date.now() }) });
      toast('Vendedor guardado'); close(); go('marketplace'); };
    $('#dels', m)?.addEventListener('click', async () => { if (confirm('¿Eliminar vendedor?')) { await db.del('sellers', s.id); close(); go('marketplace'); } });
  });
  $('#news').onclick = () => editS(null);
  el.onclick = async e => {
    const b = e.target.closest('[data-se]'); if (b) editS(sellers.find(s => s.id === b.dataset.se));
    const a = e.target.closest('[data-aa]'); if (a) { const ap = apps.find(x => x.id === a.dataset.aa); await db.set('sellerApplications', ap.id, { status: 'aprobado' }); await db.set('sellers', slugify(ap.company), { name: clean(ap.company, 80), email: clean(ap.email, 190), cuit: clean(ap.cuit || '', 13), commissionType: mk.defaultCommissionType, commission: mk.defaultCommission, active: true, createdAt: Date.now() }); toast('Postulación aprobada y vendedor creado'); go('marketplace'); }
    const r = e.target.closest('[data-ar]'); if (r) { await db.set('sellerApplications', r.dataset.ar, { status: 'rechazado' }); go('marketplace'); }
  };
}

/* ---------------- Mensajes ---------------- */
async function mensajes(el) {
  const [msgs, wd, subs] = await Promise.all([db.list('messages'), db.list('withdrawals'), db.list('subscribers')]);
  const rows = (arr, fn) => arr.sort((a, b) => b.createdAt - a.createdAt).map(fn).join('') || '<p class="muted small">Nada por acá.</p>';
  el.innerHTML = `<div class="adm-head"><h2>Mensajes</h2></div>
  <h3 style="font-size:18px">Arrepentimientos (${wd.length})</h3>${rows(wd, w => `<div class="card" style="margin-bottom:8px"><b>${esc(w.code)}</b> · pedido ${esc(w.order)} · ${date(w.createdAt)}<div class="small">${esc(w.name)} · DNI ${esc(w.dni)} · ${esc(w.email)}</div>${w.message ? `<p class="small muted">${esc(w.message)}</p>` : ''}</div>`)}
  <h3 style="font-size:18px;margin-top:16px">Contacto (${msgs.length})</h3>${rows(msgs, m => `<div class="card" style="margin-bottom:8px"><b>${esc(m.name)}</b> · ${esc(m.email)} ${esc(m.phone || '')} · ${date(m.createdAt)}<p class="small" style="white-space:pre-wrap">${esc(m.message)}</p></div>`)}
  <h3 style="font-size:18px;margin-top:16px">Suscriptoras al newsletter (${subs.length})</h3><div class="card small">${subs.map(s => esc(s.email)).join(', ') || 'Sin suscriptoras.'}</div>`;
}

/* ---------------- Usuarios ---------------- */
async function usuarios(el) {
  const [users, admins] = await Promise.all([db.list('users'), DEMO ? Promise.resolve({ emails: S.adminEmails }) : db.get('settings', 'admins').catch(() => null)]);
  const adm = admins?.emails || [];
  el.innerHTML = `<div class="adm-head"><h2>Usuarios</h2><span class="muted small">${users.length} cuentas</span></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Nombre</th><th>Email</th><th>Alta</th><th>Rol</th></tr></thead><tbody>
  ${users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(u => `<tr><td>${esc(u.name || '—')}</td><td>${esc(u.email)}</td><td>${date(u.createdAt)}</td><td><select data-role="${esc(u.email)}" style="width:auto;min-height:34px;padding:4px 10px"><option value="cliente">clienta/e</option><option value="admin" ${adm.includes(u.email) ? 'selected' : ''}>admin</option></select></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">El rol admin se guarda en la lista de emails administradores (Ajustes). Nadie puede darse permisos a sí mismo: lo impiden las reglas de Firestore.</p>`;
  el.onchange = async e => { const s = e.target.closest('[data-role]'); if (!s) return; const email = s.dataset.role; const list = s.value === 'admin' ? [...new Set([...adm, email])] : adm.filter(x => x !== email);
    if (!list.length) { toast('Tiene que quedar al menos un admin'); s.value = 'admin'; return; }
    await saveAdmins(list); toast('Rol actualizado'); go('usuarios'); };
}
async function saveAdmins(list) { S.adminEmails = list; if (DEMO) await saveSettings(S); else await db.set('settings', 'admins', { emails: list }, false); }

/* ---------------- Ajustes ---------------- */
async function ajustes(el) {
  let admins = S.adminEmails; if (!DEMO) { try { admins = (await db.get('settings', 'admins'))?.emails || []; } catch (e) {} }
  el.innerHTML = `<div class="adm-head"><h2>Ajustes</h2></div><form id="sf">
  <div class="card" style="margin-bottom:12px"><h3 style="font-size:16px">Marca</h3><p class="small">Nombre de la tienda: <b>${esc(STORE.name)}</b> · logo de texto: <b>${esc(STORE.wordmark)}</b>.<br><span class="muted">Se cambia en un solo lugar: <code>assets/js/config.js</code> (ver README). Así el nombre queda igual en todo el sitio, el SEO y Google.</span></p>
  <label class="field">Logo (imagen opcional, reemplaza el texto)<input name="logoUrl" type="url" maxlength="400" value="${esc(S.logoUrl)}" placeholder="https://… o assets/img/logo.webp"></label><label class="field">…o subir logo<input type="file" id="logof" accept="image/*"></label>
  <div class="row3">${[['bg', 'Fondo'], ['rose', 'Rosa'], ['burgundy', 'Borravino'], ['lilac', 'Lila']].map(([k, l]) => `<label class="field">${l}<input type="color" name="c_${k}" value="${esc(isHex(S.colors[k]) ? S.colors[k] : '#000000')}" style="padding:4px;min-height:44px"></label>`).join('')}</div></div>
  <div class="card" style="margin-bottom:12px"><h3 style="font-size:16px">Contacto y redes</h3><div class="row2"><label class="field">Email<input name="email" type="email" maxlength="190" value="${esc(S.contact.email)}" placeholder="${esc(STORE.email)}"></label><label class="field">Teléfono<input name="phone" maxlength="25" value="${esc(S.contact.phone)}" placeholder="${esc(STORE.phone)}"></label></div>
  <div class="row2"><label class="field">Instagram (usuario)<input name="instagram" maxlength="40" value="${esc(S.contact.instagram)}" placeholder="${esc(STORE.instagram)}"></label><label class="field">WhatsApp (solo números)<input name="whatsapp" maxlength="20" value="${esc(S.contact.whatsapp)}"></label></div><label class="field">Dirección / zona<input name="address" maxlength="120" value="${esc(S.contact.address)}"></label></div>
  <div class="card" style="margin-bottom:12px"><h3 style="font-size:16px">Textos del banner</h3><label class="field">Barra de anuncio<input name="announcement" maxlength="120" value="${esc(S.banner.announcement)}"></label><div class="row2"><label class="field">Frase del inicio<input name="heroTagline" maxlength="80" value="${esc(S.banner.heroTagline)}"></label><label class="field">Botón del inicio<input name="heroButton" maxlength="30" value="${esc(S.banner.heroButton)}"></label></div></div>
  <div class="card" style="margin-bottom:12px"><h3 style="font-size:16px">SEO y medición</h3><label class="field">Google Analytics 4 (ID de medición, opcional)<input name="ga4" maxlength="20" value="${esc(S.ga4)}" placeholder="G-XXXXXXXXXX"></label><p class="small muted">Título y descripción por defecto se generan desde config.js; cada producto tiene sus campos SEO.</p></div>
  <div class="card" style="margin-bottom:12px"><h3 style="font-size:16px">Emails administradores</h3><label class="field">Uno por línea<textarea name="admins" maxlength="2000">${esc(admins.join('\n'))}</textarea></label></div>
  <button class="btn">Guardar ajustes</button> <span class="err" role="alert"></span></form>`;
  const f = $('#sf');
  $('#logof').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { f.logoUrl.value = await uploadImage(file, 'branding'); toast('Logo subido, guardá para aplicar'); } catch (x) { toast('No se pudo subir. Pegá una URL.'); } };
  f.onsubmit = async e => {
    e.preventDefault(); const d = fd(f); const er = $('.err', f); er.textContent = '';
    if (d.email && !V.email(d.email)) return er.textContent = 'Email de contacto no válido.';
    if (d.ga4 && !/^G-[A-Z0-9]{4,15}$/.test(d.ga4)) return er.textContent = 'El ID de GA4 tiene el formato G-XXXXXXX.';
    const logo = clean(d.logoUrl, 400); if (logo && !safeUrl(logo)) return er.textContent = 'URL de logo no válida.';
    const adminList = clean(d.admins, 2000).split(/\s+/).map(x => x.toLowerCase()).filter(V.email);
    if (!adminList.length) return er.textContent = 'Dejá al menos un email administrador.';
    S.logoUrl = safeUrl(logo); S.colors = Object.fromEntries(['bg', 'rose', 'burgundy', 'lilac'].map(k => [k, isHex(d['c_' + k]) ? d['c_' + k] : S.colors[k]]));
    S.contact = { email: clean(d.email, 190), phone: clean(d.phone, 25), instagram: clean(d.instagram, 40).replace(/[^\w.]/g, ''), whatsapp: clean(d.whatsapp, 20).replace(/\D/g, ''), address: clean(d.address, 120) };
    S.banner = { announcement: clean(d.announcement, 120), heroTagline: clean(d.heroTagline, 80), heroButton: clean(d.heroButton, 30) }; S.ga4 = clean(d.ga4, 20);
    try { await saveSettings(S); await saveAdmins(adminList); toast('Ajustes guardados'); } catch (x) { er.textContent = errMsg(x); }
  };
}

/* ---------------- Acceso ---------------- */
auth.onChange(async u => {
  if (!u) { box.innerHTML = `<div class="auth card" style="text-align:center"><h1 style="font-size:34px">Panel de administración</h1><p>Ingresá con una cuenta administradora.</p><a class="btn" href="${ROOT}cuenta/">Ingresar</a>${DEMO ? '<p class="note demo" style="margin-top:12px">Demo: admin@demo.com / demo1234</p>' : ''}</div>`; return; }
  if (!(await auth.isAdmin())) { box.innerHTML = `<div class="auth card" style="text-align:center"><h1 style="font-size:30px">Sin permiso</h1><p>La cuenta <b>${esc(u.email)}</b> no es administradora.</p><a class="btn" href="${ROOT}cuenta/">Ir a mi cuenta</a></div>`; return; }
  S = await getSettings(true); shell(); go(SECTIONS.some(s => s[0] === cur) ? cur : 'dashboard');
});
