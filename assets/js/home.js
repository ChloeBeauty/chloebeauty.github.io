import { boot, $, $$, cardHTML, bindCards, cart, money, img, reduced, toast, esc, ROOT, V, rateLimit } from './ui.js';
import { protectForm, verifyHuman } from './security.js';
import { getProducts, getSettings, db } from './store.js';
import { COLLECTIONS } from './data.js';

boot();
let products = [];
const getP = id => products.find(p => p.id === id);

/* ---------- Carrusel + pestañas ---------- */
const car = $('#carousel'), dots = $('#dots');
function renderCarousel(cat = 'todo') {
  const list = cat === 'todo' ? products : products.filter(p => p.category === cat);
  car.innerHTML = list.map(p => cardHTML(p)).join('');
  car.scrollLeft = 0; buildDots();
}
function buildDots() {
  const pages = Math.max(1, Math.ceil(car.scrollWidth / car.clientWidth - 0.05));
  dots.innerHTML = Array.from({ length: pages }, (_, i) => `<button aria-label="Página ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}></button>`).join('');
}
car.addEventListener('scroll', () => {
  const i = Math.round(car.scrollLeft / car.clientWidth);
  $$('button', dots).forEach((b, j) => b.setAttribute('aria-current', i === j));
}, { passive: true });
dots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) car.scrollTo({ left: [...dots.children].indexOf(b) * car.clientWidth, behavior: 'smooth' }); });
// arrastrar con el mouse
let drag = null;
car.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, l: car.scrollLeft, moved: false }; });
addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) { drag.moved = true; car.classList.add('dragging'); } car.scrollLeft = drag.l - dx; });
addEventListener('pointerup', () => { if (!drag) return; car.classList.remove('dragging'); drag = null; });
$$('.tab').forEach(t => t.addEventListener('click', () => { $$('.tab').forEach(x => x.setAttribute('aria-selected', x === t)); renderCarousel(t.dataset.cat); }));
bindCards(car, async id => getP(id));
addEventListener('resize', buildDots);

/* ---------- Rutina completa (pill flotante) ---------- */
async function routine() {
  let col = COLLECTIONS.find(c => c.id === 'la-rutina-completa');
  try { col = (await db.get('collections', 'la-rutina-completa')) || col; } catch (e) {}
  const items = col.productIds.map(getP).filter(Boolean);
  if (!items.length) return;
  const pill = $('#routine'); const total = items.reduce((s, p) => s + p.price, 0);
  $('.th img', pill).src = img(items[items.length - 1].images[0]);
  $('[data-r=count]', pill).textContent = `${items.length} productos · ${money(total)}`;
  pill.onclick = () => { items.forEach(p => cart.add(p, p.variants?.[0]?.name || '')); window.openCart?.(); };
  const hero = $('.hero'), ft = $('.footer');
  const upd = () => { const past = scrollY > hero.offsetHeight * 0.7; const fr = ft.getBoundingClientRect().top < innerHeight; pill.classList.toggle('show', past && !fr); };
  addEventListener('scroll', upd, { passive: true }); upd();
}

/* ---------- Botones "agregar" estáticos ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add-static]'); if (!b) return;
  const p = getP(b.dataset.addStatic); if (p) cart.add(p, p.variants?.[0]?.name || ''); else toast('Producto no disponible');
});

/* ---------- Recomendado (visor) ---------- */
function viewer() {
  const v = $('#viewer'); if (!v) return;
  const ids = JSON.parse(v.dataset.ids); const words = JSON.parse(v.dataset.words);
  let i = 0;
  const show = n => {
    i = (n + ids.length) % ids.length; const p = getP(ids[i]); if (!p) return;
    const im = $('.stage img', v); im.classList.add('out');
    setTimeout(() => { im.src = img(p.images[0]); im.alt = p.name; im.classList.remove('out'); }, reduced ? 0 : 260);
    $('.word', v).textContent = words[i];
    $('.desc', v).innerHTML = `<b>${esc(p.name)}</b> · ${esc(p.description)} <br><b>${money(p.price)}</b>`;
    $('.bag', v).dataset.addStatic = p.id;
    $$('.thumbs button', v).forEach((b, j) => b.setAttribute('aria-current', j === i));
  };
  $('.next', v).addEventListener('click', () => show(i + 1));
  $$('.thumbs button', v).forEach((b, j) => b.addEventListener('click', () => show(j)));
  let sx = 0; v.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  v.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
  show(0);
}

/* ---------- Reseñas ---------- */
const rt = $('#revtrack');
$('#revprev')?.addEventListener('click', () => rt.scrollBy({ left: -rt.clientWidth * .8, behavior: 'smooth' }));
$('#revnext')?.addEventListener('click', () => rt.scrollBy({ left: rt.clientWidth * .8, behavior: 'smooth' }));

/* ---------- Scroll: parallax + moodboard ---------- */
const giant = $('.hero .giant'), model = $('.hero .model'), peek = $('.footer .peek');
const board = $('#board'); const pols = board ? $$('[data-sx]', board) : []; const center = $('.centercard', board || document);
function frame() {
  const y = scrollY, H = innerHeight;
  if (giant && y < H * 1.2) { giant.style.transform = `translateY(${y * 0.35}px)`; model.style.transform = `translate(-50%, ${y * 0.12}px)`; }
  if (board) {
    const r = board.getBoundingClientRect();
    let k = 1 - (r.top + r.height * 0.15) / H; k = Math.max(0, Math.min(1, k * 1.3)); // 0 = juntas, 1 = esparcidas
    const e = 1 - Math.pow(1 - k, 3);
    pols.forEach(p => { const sx = +p.dataset.sx, sy = +p.dataset.sy, rot = +p.dataset.r; p.style.transform = `translate(${sx * (1 - e)}%, ${sy * (1 - e)}%) rotate(${rot * e + (1 - e) * rot * .3}deg)`; });
    center.style.transform = `translate(-50%,-50%) scale(${0.85 + 0.15 * e}) rotate(${(1 - e) * -6}deg)`;
  }
  if (peek) { const r = peek.parentElement.getBoundingClientRect(); const k = Math.max(0, Math.min(1, (H - r.top) / r.height)); peek.style.transform = `translate(-50%, ${(1 - k) * 60}%) rotate(${14 - k * 10}deg)`; }
}
if (!reduced) { let tick = false; addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { frame(); tick = false; }); } }, { passive: true }); frame(); }

/* ---------- 3D ---------- */
function three() {
  const host = $('#bottle3d'); if (!host) return;
  const weak = reduced || navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4);
  let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
  if (weak || !gl) return; // queda la imagen de respaldo
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); import('./three-bottle.js').then(m => m.mountBottle(host)).catch(err => console.warn('3D no disponible', err)); } }, { rootMargin: '300px' });
  io.observe(host);
}

/* ---------- Newsletter ---------- */
const newsToken = protectForm($('#news'));
$('#news')?.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target; const email = f.email.value.trim().toLowerCase();
  if (!V.email(email)) return toast('Ingresá un email válido.');
  try { rateLimit('news', 3, 10 * 60000); await verifyHuman(await newsToken()); await db.add('subscribers', { email, source: 'home' }); toast('¡Gracias! Ya estás en la lista.'); f.reset(); }
  catch (err) { toast(err.code === 'rate-limit' || err.code === 'turnstile' ? err.message : 'No pudimos guardar tu email. Probá más tarde.'); }
});

/* ---------- Init ---------- */
(async () => {
  products = await getProducts();
  renderCarousel();
  const s = await getSettings();
  if (s.banner?.heroTagline) $('#heroTag').textContent = s.banner.heroTagline;
  if (s.banner?.heroButton) $('#heroBtn').firstChild.textContent = s.banner.heroButton + ' ';
  routine(); viewer(); three();
})();
