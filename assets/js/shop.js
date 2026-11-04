import { boot, $, $$, cardHTML, bindCards, brandOf, esc } from './ui.js';
import { getProducts } from './store.js';
boot();

const grid = $('#grid'); let all = [];
const st = { q: '', cat: '', brand: '', min: '', max: '', sale: false, stock: false, sort: 'rel' };
const qs = new URLSearchParams(location.search);
st.q = qs.get('q') || ''; st.cat = qs.get('cat') || ''; st.brand = qs.get('marca') || '';
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function render() {
  let list = all.filter(p => {
    if (st.cat && p.category !== st.cat) return false;
    if (st.brand && brandOf(p) !== st.brand) return false;
    if (st.min && p.price < +st.min) return false;
    if (st.max && p.price > +st.max) return false;
    if (st.sale && !(p.compareAt > p.price)) return false;
    if (st.stock && p.stock <= 0) return false;
    if (st.q) { const h = norm([p.name, brandOf(p), p.category, p.short, ...(p.tags || [])].join(' ')); if (!norm(st.q).split(/\s+/).every(w => h.includes(w))) return false; }
    return true;
  });
  const s = { asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, az: (a, b) => a.name.localeCompare(b.name), new: (a, b) => (b.createdAt || 0) - (a.createdAt || 0), rel: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) }[st.sort];
  list.sort(s);
  grid.innerHTML = list.length ? list.map(p => cardHTML(p)).join('') : '<p class="empty" style="grid-column:1/-1">No encontramos productos con esos filtros.</p>';
  $('#rcount').textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
  const u = new URL(location.href); ['q', 'cat', 'marca'].forEach(k => u.searchParams.delete(k));
  if (st.q) u.searchParams.set('q', st.q); if (st.cat) u.searchParams.set('cat', st.cat); if (st.brand) u.searchParams.set('marca', st.brand);
  history.replaceState(null, '', u);
}
function chips(box, key) {
  $$('.chip', box).forEach(c => c.setAttribute('aria-pressed', c.dataset.v === st[key]));
  box.onclick = e => { const c = e.target.closest('.chip'); if (!c) return; st[key] = c.dataset.v; chips(box, key); render(); };
}
(async () => {
  all = await getProducts();
  const brands = [...new Set(all.map(brandOf))].sort();
  $('#fbrand').innerHTML = `<button class="chip" data-v="">Todas</button>` + brands.map(b => `<button class="chip" data-v="${esc(b)}">${esc(b)}</button>`).join('');
  chips($('#fcat'), 'cat'); chips($('#fbrand'), 'brand');
  $('#q').value = st.q;
  let t; $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value.trim(); render(); }, 200); });
  $('#pmin').oninput = e => { st.min = e.target.value; render(); };
  $('#pmax').oninput = e => { st.max = e.target.value; render(); };
  $('#fsale').onchange = e => { st.sale = e.target.checked; render(); };
  $('#fstock').onchange = e => { st.stock = e.target.checked; render(); };
  $('#sort').onchange = e => { st.sort = e.target.value; render(); };
  $('#fclear').onclick = () => { Object.assign(st, { q: '', cat: '', brand: '', min: '', max: '', sale: false, stock: false }); $('#q').value = ''; $('#pmin').value = ''; $('#pmax').value = ''; $('#fsale').checked = $('#fstock').checked = false; chips($('#fcat'), 'cat'); chips($('#fbrand'), 'brand'); render(); };
  $('#ftoggle').onclick = e => { const o = $('#filters').classList.toggle('open'); e.target.setAttribute('aria-expanded', o); };
  bindCards(grid, async id => all.find(p => p.id === id));
  render();
})();
