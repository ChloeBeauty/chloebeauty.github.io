/* Capa de datos: Firebase (si hay config) o MODO DEMO (localStorage).
   Toda la app usa solo estas funciones, así el resto del código no cambia. */
import { FIREBASE_CONFIG } from './firebase-config.js';
import { SERVICES } from './config.js';
import { PRODUCTS, CATEGORIES, COLLECTIONS, DEFAULT_SETTINGS } from './data.js';

export const DEMO = !FIREBASE_CONFIG.apiKey;
const V = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;

/* ---------------- Firebase lazy loader ---------------- */
let _fb;
export async function fb() {
  if (_fb) return _fb;
  _fb = (async () => {
    const [app, auth, fs] = await Promise.all([
      import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-firestore.js')
    ]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    if (SERVICES.appCheckSiteKey) { // Firebase App Check (opcional): bloquea clientes que no sean tu sitio
      try { const ac = await import(CDN + 'firebase-app-check.js'); ac.initializeAppCheck(a, { provider: new ac.ReCaptchaV3Provider(SERVICES.appCheckSiteKey), isTokenAutoRefreshEnabled: true }); } catch (e) { console.warn('App Check', e); }
    }
    const out = { app: a, A: auth, F: fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
    out.auth.languageCode = 'es';
    return out;
  })();
  return _fb;
}
export async function fbStorage() {
  const f = await fb();
  if (!f.S) { f.S = await import(CDN + 'firebase-storage.js'); f.storage = f.S.getStorage(f.app); }
  return f;
}

/* ---------------- Demo storage ---------------- */
const LS = 'cb_demo_';
const seed = {
  products: () => PRODUCTS, categories: () => CATEGORIES, collections: () => COLLECTIONS,
  settings: () => [{ id: 'store', ...DEFAULT_SETTINGS }], orders: () => demoOrders(), users: () => demoUsers(),
  sellers: () => [{ id: 'maison-lila', name: 'Maison Lila', email: 'ventas@maisonlila.example', cuit: '30-00000000-0', commissionType: 'pct', commission: 20, active: true, createdAt: Date.now() - 864e5 * 20 }],
  sellerApplications: () => [{ id: 'app1', company: 'Atelier Rubí', contact: 'Sofía M.', email: 'sofia@atelier.example', phone: '', category: 'Labiales veganos', products: '12', message: 'Queremos vender nuestra línea vegana.', status: 'nuevo', createdAt: Date.now() - 864e5 * 2 }]
};
function demoUsers() {
  return [
    { id: 'demo-admin', email: 'admin@demo.com', name: 'Admin Demo', role: 'admin', createdAt: Date.now() - 864e5 * 60 },
    { id: 'demo-cliente', email: 'cliente@demo.com', name: 'Clienta Demo', phone: '291 000-0000', role: 'cliente', addresses: [{ label: 'Casa', street: 'Calle Falsa 123', city: 'Bahía Blanca', province: 'Buenos Aires', zip: '8000' }], favorites: ['gloss-brillo-eterno'], createdAt: Date.now() - 864e5 * 12 }
  ];
}
function demoOrders() {
  const P = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const mk = (n, uid, email, days, status, ids, tracking) => {
    const items = ids.map(([id, q]) => ({ id, name: P[id].name, variant: P[id].variants[0]?.name || '', qty: q, price: P[id].price, image: P[id].images[0], sellerId: P[id].brand === 'Maison Lila' ? 'maison-lila' : null }));
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingCost = subtotal >= 60000 ? 0 : 6900;
    const at = Date.now() - days * 864e5;
    const flow = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado'];
    const hist = status === 'cancelado' ? [{ status: 'pendiente', at }, { status: 'cancelado', at: at + 36e5 }] : flow.slice(0, flow.indexOf(status) + 1).map((s, i) => ({ status: s, at: at + i * 864e5 * .7 }));
    return { id: 'demo-' + n, number: 'CB-' + (1000 + n), uid, email, customer: { name: email === 'cliente@demo.com' ? 'Clienta Demo' : 'Cliente ' + n, phone: '' },
      items, subtotal, shippingCost, total: subtotal + shippingCost, status, history: hist,
      shipping: { method: 'correo', label: 'Envío a todo el país', address: { street: 'Calle Falsa 123', city: 'Bahía Blanca', province: 'Buenos Aires', zip: '8000' } },
      payment: { method: 'mercadopago', label: 'Mercado Pago' }, tracking: tracking || null, notes: '', createdAt: at };
  };
  return [
    mk(1, 'demo-cliente', 'cliente@demo.com', 9, 'entregado', [['base-segunda-piel', 1], ['gloss-brillo-eterno', 2]], { carrier: 'Andreani', code: 'AN123456789', url: 'https://www.andreani.com/#!/informacionEnvio/AN123456789' }),
    mk(2, 'demo-cliente', 'cliente@demo.com', 2, 'enviado', [['paleta-rose-nude', 1]], { carrier: 'Correo Argentino', code: 'CA987654321AR', url: 'https://www.correoargentino.com.ar/formularios/e-commerce?id=CA987654321AR' }),
    mk(3, null, 'invitada@example.com', 1, 'pagado', [['eau-de-parfum-rosee', 1], ['ambar-rose', 1]]),
    mk(4, null, 'otra@example.com', 0, 'pendiente', [['labial-velvet-rose', 2]]),
    mk(5, null, 'x@example.com', 5, 'cancelado', [['rubor-petalo', 1]]),
    mk(6, null, 'y@example.com', 4, 'entregado', [['gloss-lila-glaze', 3], ['mascara-volumen-infinito', 1]])
  ];
}
function dload(c) {
  try { const raw = localStorage.getItem(LS + c); if (raw) return JSON.parse(raw); } catch (e) {}
  const v = seed[c] ? seed[c]() : []; dsave(c, v); return v;
}
function dsave(c, v) { try { localStorage.setItem(LS + c, JSON.stringify(v)); } catch (e) { console.warn('localStorage lleno', e); } }
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
function match(doc, [f, op, v]) {
  const x = f.split('.').reduce((o, k) => o?.[k], doc);
  switch (op) { case '==': return x === v; case '!=': return x !== v; case '>=': return x >= v; case '>': return x > v; case '<=': return x <= v; case '<': return x < v; case 'array-contains': return Array.isArray(x) && x.includes(v); case 'in': return v.includes(x); default: return true; }
}
const tsNum = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : v;
function normalize(d) { // convierte Timestamps de Firestore a ms
  for (const k of Object.keys(d)) { if (d[k] && typeof d[k].toMillis === 'function') d[k] = d[k].toMillis(); }
  if (Array.isArray(d.history)) d.history = d.history.map(h => ({ ...h, at: tsNum(h.at) }));
  return d;
}

/* ---------------- Generic collection API ---------------- */
export const db = {
  async list(c, { where = [], orderBy = null, dir = 'desc', limit = 0 } = {}) {
    if (DEMO) {
      let arr = dload(c).filter(d => where.every(w => match(d, w)));
      if (orderBy) arr.sort((a, b) => ((a[orderBy] > b[orderBy]) ? 1 : -1) * (dir === 'desc' ? -1 : 1));
      if (limit) arr = arr.slice(0, limit);
      return clone(arr);
    }
    const { db: d, F } = await fb();
    const parts = where.map(([f, op, v]) => F.where(f, op, v));
    if (orderBy) parts.push(F.orderBy(orderBy, dir));
    if (limit) parts.push(F.limit(limit));
    const snap = await F.getDocs(F.query(F.collection(d, c), ...parts));
    return snap.docs.map(s => normalize({ id: s.id, ...s.data() }));
  },
  async get(c, id) {
    if (DEMO) { const d = dload(c).find(x => x.id === id); return d ? clone(d) : null; }
    const { db: d, F } = await fb();
    const s = await F.getDoc(F.doc(d, c, id));
    return s.exists() ? normalize({ id: s.id, ...s.data() }) : null;
  },
  async set(c, id, data, merge = true) {
    if (DEMO) {
      const arr = dload(c); const i = arr.findIndex(x => x.id === id);
      const doc = { ...(merge && i >= 0 ? arr[i] : {}), ...clone(data), id };
      if (i >= 0) arr[i] = doc; else arr.push(doc);
      dsave(c, arr); return id;
    }
    const { db: d, F } = await fb();
    const { id: _drop, ...rest } = data;
    await F.setDoc(F.doc(d, c, id), rest, { merge });
    return id;
  },
  async add(c, data) {
    if (DEMO) { const id = uid(); return db.set(c, id, { createdAt: Date.now(), ...data }, false); }
    const { db: d, F } = await fb();
    const ref = await F.addDoc(F.collection(d, c), { createdAt: Date.now(), ...data });
    return ref.id;
  },
  async del(c, id) {
    if (DEMO) { dsave(c, dload(c).filter(x => x.id !== id)); return; }
    const { db: d, F } = await fb();
    await F.deleteDoc(F.doc(d, c, id));
  },
  /* escucha en tiempo real (Firestore onSnapshot) o sondeo en demo */
  watch(c, opts, cb) {
    if (DEMO) { const t = () => db.list(c, opts).then(cb); t(); const h = setInterval(t, 5000); return () => clearInterval(h); }
    let un = () => {};
    fb().then(({ db: d, F }) => {
      const parts = (opts.where || []).map(([f, op, v]) => F.where(f, op, v));
      un = F.onSnapshot(F.query(F.collection(d, c), ...parts), s => cb(s.docs.map(x => normalize({ id: x.id, ...x.data() }))), e => console.warn('watch', c, e.code));
    });
    return () => un();
  },
  resetDemo() { Object.keys(localStorage).filter(k => k.startsWith(LS)).forEach(k => localStorage.removeItem(k)); }
};

/* ---------------- Settings ---------------- */
let _settings;
export async function getSettings(force) {
  if (_settings && !force) return _settings;
  let s = null;
  try { s = await db.get('settings', 'store'); } catch (e) { console.warn('settings', e.code || e); }
  _settings = deepMerge(clone(DEFAULT_SETTINGS), s || {});
  return _settings;
}
export async function saveSettings(s) { _settings = null; await db.set('settings', 'store', s); }
function deepMerge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') a[k] = deepMerge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}

/* ---------------- Catálogo ---------------- */
let _products;
export function priceOf(p, s) { // precio público (marketplace: precio vendedor + comisión)
  if (p.sellerId && p.sellerPrice != null && s?.marketplace?.enabled) {
    const type = p.commission?.type || s.marketplace.defaultCommissionType;
    const val = Number(p.commission?.value ?? s.marketplace.defaultCommission);
    const raw = type === 'pct' ? p.sellerPrice * (1 + val / 100) : p.sellerPrice + val;
    return Math.round(raw / 10) * 10;
  }
  return Number(p.price) || 0;
}
export async function getProducts({ all = false, force = false } = {}) {
  if (!_products || force) {
    try { _products = await db.list('products'); } catch (e) { console.warn('products', e.code || e); _products = []; }
    if (!DEMO && !_products.length && !all) _products = clone(PRODUCTS); // Firebase vacío: mostrar catálogo de ejemplo
  }
  const s = await getSettings();
  let list = _products.map(p => ({ ...p, price: priceOf(p, s) }));
  if (!all) list = list.filter(p => p.status === 'published' && (!p.sellerId || s.marketplace.enabled));
  return list;
}
export async function getProduct(idOrSlug) {
  const list = await getProducts({ all: true });
  return list.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
}
export function invalidateProducts() { _products = null; }

/* ---------------- Auth ---------------- */
const listeners = new Set();
let current = null, ready = false;
const DS = 'cb_demo_session', DU = 'cb_demo_auth';
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36); };
function demoAuthDb() { try { return JSON.parse(localStorage.getItem(DU)) || { 'admin@demo.com': { uid: 'demo-admin', pass: hash('demo1234'), name: 'Admin Demo' }, 'cliente@demo.com': { uid: 'demo-cliente', pass: hash('demo1234'), name: 'Clienta Demo' } }; } catch (e) { return {}; } }
function demoSetSession(email) {
  if (!email) { localStorage.removeItem(DS); current = null; }
  else { const u = demoAuthDb()[email]; localStorage.setItem(DS, email); current = { uid: u.uid, email, displayName: u.name, emailVerified: true, provider: u.provider || 'password' }; }
  listeners.forEach(f => f(current));
}
function err(code) { const e = new Error(code); e.code = code; return e; }

export const auth = {
  get user() { return current; },
  get ready() { return ready; },
  onChange(cb) {
    listeners.add(cb);
    if (ready) cb(current);
    return () => listeners.delete(cb);
  },
  async init() {
    if (DEMO) {
      const e = localStorage.getItem(DS); const u = e && demoAuthDb()[e];
      current = u ? { uid: u.uid, email: e, displayName: u.name, emailVerified: true, provider: u.provider || 'password' } : null;
      ready = true; listeners.forEach(f => f(current)); return;
    }
    const { auth: a, A } = await fb();
    try { await A.getRedirectResult(a); } catch (e) { console.warn(e.code); }
    A.onAuthStateChanged(a, u => {
      current = u ? { uid: u.uid, email: u.email, displayName: u.displayName, emailVerified: u.emailVerified, provider: u.providerData[0]?.providerId === 'google.com' ? 'google' : 'password', _u: u } : null;
      ready = true; listeners.forEach(f => f(current));
    });
  },
  async register(email, pass, name) {
    if (DEMO) {
      const d = demoAuthDb(); if (d[email]) throw err('auth/email-already-in-use');
      if (pass.length < 6) throw err('auth/weak-password');
      d[email] = { uid: 'u' + uid(), pass: hash(pass), name }; localStorage.setItem(DU, JSON.stringify(d));
      await db.set('users', d[email].uid, { email, name, role: 'cliente', createdAt: Date.now() });
      demoSetSession(email); return;
    }
    const { auth: a, A } = await fb();
    const cred = await A.createUserWithEmailAndPassword(a, email, pass);
    await A.updateProfile(cred.user, { displayName: name });
    await A.sendEmailVerification(cred.user, { url: location.href });
    await db.set('users', cred.user.uid, { email, name, createdAt: Date.now() });
  },
  async login(email, pass) {
    if (DEMO) { const u = demoAuthDb()[email]; if (!u || u.pass !== hash(pass)) throw err('auth/invalid-credential'); demoSetSession(email); return; }
    const { auth: a, A } = await fb();
    await A.signInWithEmailAndPassword(a, email, pass);
  },
  async google() {
    if (DEMO) {
      const email = 'clienta.google@gmail.com'; const d = demoAuthDb();
      if (!d[email]) { d[email] = { uid: 'g' + uid(), pass: '', name: 'Clienta Google', provider: 'google' }; localStorage.setItem(DU, JSON.stringify(d)); await db.set('users', d[email].uid, { email, name: 'Clienta Google', role: 'cliente', createdAt: Date.now() }); }
      demoSetSession(email); return;
    }
    const { auth: a, A } = await fb();
    const p = new A.GoogleAuthProvider();
    try { const r = await A.signInWithPopup(a, p); await db.set('users', r.user.uid, { email: r.user.email, name: r.user.displayName || '', lastLogin: Date.now() }); }
    catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(a, p); throw e; }
  },
  async logout() { if (DEMO) return demoSetSession(null); const { auth: a, A } = await fb(); await A.signOut(a); },
  async reset(email) { if (DEMO) return; const { auth: a, A } = await fb(); await A.sendPasswordResetEmail(a, email); },
  async resendVerify() { if (DEMO) return; const { A } = await fb(); await A.sendEmailVerification(current._u); },
  async reauth(pass) {
    if (DEMO) { const u = demoAuthDb()[current.email]; if (u.provider !== 'google' && u.pass !== hash(pass)) throw err('auth/wrong-password'); return; }
    const { A } = await fb(); const u = current._u;
    if (current.provider === 'google') await A.reauthenticateWithPopup(u, new A.GoogleAuthProvider());
    else await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, pass));
  },
  async changeEmail(newEmail, pass) {
    await auth.reauth(pass);
    if (DEMO) { const d = demoAuthDb(); d[newEmail] = d[current.email]; delete d[current.email]; localStorage.setItem(DU, JSON.stringify(d)); await db.set('users', d[newEmail].uid, { email: newEmail }); demoSetSession(newEmail); return 'ok'; }
    const { A } = await fb(); await A.verifyBeforeUpdateEmail(current._u, newEmail); return 'verify';
  },
  async changePassword(oldPass, newPass) {
    await auth.reauth(oldPass);
    if (DEMO) { const d = demoAuthDb(); d[current.email].pass = hash(newPass); localStorage.setItem(DU, JSON.stringify(d)); return; }
    const { A } = await fb(); await A.updatePassword(current._u, newPass);
  },
  async deleteAccount(pass) {
    await auth.reauth(pass);
    const id = current.uid;
    try { await db.del('users', id); } catch (e) {}
    if (DEMO) { const d = demoAuthDb(); delete d[current.email]; localStorage.setItem(DU, JSON.stringify(d)); demoSetSession(null); return; }
    const { A } = await fb(); await A.deleteUser(current._u);
  },
  /* admin = email en settings/admins.emails (Firestore) o custom claim admin=true */
  async isAdmin() {
    if (!current) return false;
    if (DEMO) { const s = await getSettings(); return (s.adminEmails || []).includes(current.email); }
    try {
      const t = await current._u.getIdTokenResult(); if (t.claims.admin) return true;
      const d = await db.get('settings', 'admins'); return !!d && (d.emails || []).includes(current.email);
    } catch (e) { return false; }
  }
};

export const ERRORS = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.', 'auth/wrong-password': 'Contraseña incorrecta.', 'auth/user-not-found': 'No existe una cuenta con ese email.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.', 'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.', 'auth/invalid-email': 'El email no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.', 'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/requires-recent-login': 'Por seguridad, volvé a ingresar y repetí la acción.', 'permission-denied': 'No tenés permiso para hacer esto (revisá las reglas de Firestore).',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase → Authentication → Settings → Authorized domains.'
};
export const errMsg = e => ERRORS[e?.code] || e?.message || 'Ocurrió un error.';

/* ---------------- Imagen: compresión + subida ---------------- */
export async function compressImage(file, max = 1200, q = .82) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b), 'image/webp', q));
}
export async function uploadImage(file, folder = 'products') {
  const blob = await compressImage(file, DEMO ? 600 : 1200, DEMO ? .7 : .82);
  if (DEMO) return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  const { storage, S } = await fbStorage();
  const r = S.ref(storage, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`);
  await S.uploadBytes(r, blob, { contentType: 'image/webp', cacheControl: 'public,max-age=31536000' });
  return S.getDownloadURL(r);
}
