import { boot, $, $$, cart, favs, money, img, esc, brandOf, catName, cardHTML, bindCards, toast, ROOT } from './ui.js';
import { getProduct, getProducts } from './store.js';
import { STORE } from './config.js';
boot();

const el = $('#product');
const id = el?.dataset.id || new URLSearchParams(location.search).get('id');

function templ(p) {
  return `<nav class="crumbs" aria-label="Migas de pan"><ol><li><a href="${ROOT}">Inicio</a></li><li><a href="${ROOT}tienda/">Tienda</a></li><li><a href="${ROOT}tienda/?cat=${esc(p.category)}">${esc(catName(p.category))}</a></li><li><span aria-current="page">${esc(p.name)}</span></li></ol></nav>
  <article class="product" id="product" data-id="${esc(p.id)}">
  <div class="gallery"><div class="main"><img id="pmain" src="${esc(img(p.images[0]))}" alt="${esc(p.name)}" width="400" height="560"></div><div class="thumbs" id="pthumbs"></div></div>
  <div class="pinfo"><p class="eyebrow" id="pbrand"></p><h1 id="pname"></h1><p class="price" id="pprice"></p><p class="muted small">${esc(p.size || '')}${p.sku ? ' · SKU ' + esc(p.sku) : ''}</p><p id="pshort"></p><div id="pvariants"></div><p class="stock" id="pstock"></p>
  <div class="buy"><div class="qty"><button aria-label="Restar" id="qminus">−</button><input id="pqty" value="1" aria-label="Cantidad" inputmode="numeric"><button aria-label="Sumar" id="qplus">+</button></div><button class="btn drip" id="padd">Agregar a la bolsa</button><button class="iconbtn" id="pfav" aria-label="Guardar en favoritos" aria-pressed="false">♡</button></div>
  <details class="acc" open><summary>Descripción</summary><p id="pdesc"></p></details></div></article>
  <section class="section"><h2 style="font-size:32px">También te puede gustar</h2><div class="grid-products" id="related"></div></section>`;
}

(async () => {
  const p = id && await getProduct(id);
  if (!p || (p.status !== 'published')) {
    const box = $('#dyn') || el?.parentElement;
    if (!el && box) { box.innerHTML = `<div class="nf"><p class="giant">ups</p><h1>No encontramos este producto</h1><a class="btn" href="${ROOT}tienda/">Volver a la tienda</a></div>`; document.title = 'Producto no encontrado | ' + STORE.name; }
    return;
  }
  if (!el) { // página dinámica: armar HTML + SEO
    $('#dyn').innerHTML = templ(p);
    document.title = `${p.seo?.title || p.name + ' · ' + brandOf(p)} | ${STORE.name}`;
    const md = document.querySelector('meta[name=description]'); md.content = p.seo?.description || `${p.short || ''} ${p.name} de ${brandOf(p)} a ${money(p.price)} en ${STORE.name}.`;
    const ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, sku: p.sku, image: p.images.map(i => new URL(img(i), location.href).href), brand: { '@type': 'Brand', name: brandOf(p) },
      offers: { '@type': 'Offer', priceCurrency: 'ARS', price: p.price, url: location.href, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } });
    document.head.append(ld);
    document.querySelector('link[rel=canonical]').href = STORE.url + 'producto/?id=' + encodeURIComponent(p.id);
  }
  // hidratar con datos actuales
  $('#pbrand').textContent = brandOf(p); $('#pname').textContent = p.name;
  $('#pprice').innerHTML = money(p.price) + (p.compareAt > p.price ? `<s>${money(p.compareAt)}</s>` : '');
  $('#pshort').textContent = p.short || ''; $('#pdesc').textContent = p.description || '';
  const stk = $('#pstock'); stk.textContent = p.stock > 0 ? (p.stock <= 5 ? `¡Quedan solo ${p.stock}!` : `En stock (${p.stock} disponibles)`) : 'Sin stock'; stk.classList.toggle('low', p.stock <= 5);
  const main = $('#pmain');
  $('#pthumbs').innerHTML = p.images.length > 1 ? p.images.map((s, i) => `<button aria-label="Ver foto ${i + 1}" ${i ? '' : 'aria-current="true"'} data-src="${esc(img(s))}"><img src="${esc(img(s))}" alt="" loading="lazy"></button>`).join('') : '';
  $('#pthumbs').onclick = e => { const b = e.target.closest('button'); if (!b) return; main.src = b.dataset.src; $$('#pthumbs button').forEach(x => x.setAttribute('aria-current', x === b)); };
  let variant = p.variants?.[0]?.name || '';
  if (p.variants?.length) {
    $('#pvariants').innerHTML = `<p class="small" style="margin:0"><b>Tono:</b> <span id="vname">${esc(variant)}</span></p><div class="swatches" role="group" aria-label="Tonos">${p.variants.map((v, i) => `<button class="sw ${v.hex ? '' : 'noc'}" aria-pressed="${!i}" data-v="${esc(v.name)}">${v.hex ? `<i style="background:${esc(v.hex)}"></i>` : ''}${esc(v.name)}</button>`).join('')}</div>`;
    $('#pvariants').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; variant = b.dataset.v; $('#vname').textContent = variant; $$('.sw').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  }
  const q = $('#pqty');
  $('#qminus').onclick = () => q.value = Math.max(1, (+q.value || 1) - 1);
  $('#qplus').onclick = () => q.value = Math.min(Math.max(1, p.stock), (+q.value || 1) + 1);
  const add = $('#padd'); if (p.stock <= 0) { add.disabled = true; add.textContent = 'Sin stock'; }
  add.onclick = () => { cart.add(p, variant, Math.max(1, +q.value || 1)); window.openCart?.(); };
  const fv = $('#pfav'); fv.setAttribute('aria-pressed', favs.has(p.id));
  fv.onclick = async () => { const on = await favs.toggle(p.id); fv.setAttribute('aria-pressed', on); fv.style.background = on ? 'var(--rose)' : ''; toast(on ? 'Guardado en favoritos' : 'Quitado de favoritos'); };
  if (favs.has(p.id)) fv.style.background = 'var(--rose)';
  const all = await getProducts();
  const rel = all.filter(x => x.category === p.category && x.id !== p.id).concat(all.filter(x => x.category !== p.category)).slice(0, 4);
  $('#related').innerHTML = rel.map(x => cardHTML(x)).join('');
  bindCards($('#related'), async i => all.find(x => x.id === i));
})();
