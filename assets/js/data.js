/* Datos de ejemplo (modo demo y catálogo inicial importable desde el admin).
   Las fotos son PLACEHOLDERS generados con IA: reemplazalas por fotos reales.
   brand: '' = marca propia (usa STORE.name). */

export const CATEGORIES = [
  { id: 'rostro', name: 'Rostro', order: 1 },
  { id: 'ojos', name: 'Ojos', order: 2 },
  { id: 'labios', name: 'Labios', order: 3 },
  { id: 'perfumes', name: 'Perfumes', order: 4 }
];

const now = Date.UTC(2026, 9, 1);

export const PRODUCTS = [
  { id: 'labial-velvet-rose', slug: 'labial-velvet-rose', name: 'Labial Velvet Rosé', brand: '', category: 'labios', price: 18900, compareAt: 21900, stock: 24, sku: 'LAB-001', size: '3,8 g',
    images: ['assets/img/p-labial.webp'], variants: [{ name: 'Rosé', hex: '#b5525f' }, { name: 'Mauve', hex: '#8e4a5c' }, { name: 'Nude', hex: '#c28a7c' }],
    tags: ['mate', 'larga duración', 'nuevo'], short: 'Labial cremoso de acabado aterciopelado.',
    description: 'Color intenso en una sola pasada, textura cremosa que no reseca y un acabado aterciopelado que dura todo el día. Con manteca de karité y vitamina E.', featured: true },
  { id: 'labial-coral-sunset', slug: 'labial-coral-sunset', name: 'Labial Coral Sunset', brand: '', category: 'labios', price: 18900, compareAt: null, stock: 15, sku: 'LAB-002', size: '3,8 g',
    images: ['assets/img/p-labial-coral.webp'], variants: [{ name: 'Coral', hex: '#c8645a' }, { name: 'Terracota', hex: '#a45540' }],
    tags: ['satinado'], short: 'Un coral cálido para todos los días.',
    description: 'Tono coral satinado con pigmentos que se adaptan al subtono de tu piel. Ideal para looks frescos de día y de verano.' },
  { id: 'gloss-brillo-eterno', slug: 'gloss-brillo-eterno', name: 'Gloss Brillo Eterno', brand: '', category: 'labios', price: 14500, compareAt: null, stock: 40, sku: 'GLO-001', size: '6 ml',
    images: ['assets/img/p-gloss.webp'], variants: [{ name: 'Rosa perla', hex: '#e6a3b4' }, { name: 'Cristal', hex: '#f3dce2' }],
    tags: ['glossy', 'nuevo', 'más vendido'], short: 'Brillo espejo que no pega.',
    description: 'Gloss de efecto espejo con ácido hialurónico y aceite de jojoba. Hidrata, da volumen visual y no se siente pegajoso.', featured: true },
  { id: 'gloss-lila-glaze', slug: 'gloss-lila-glaze', name: 'Gloss Lila Glaze', brand: 'Maison Lila', category: 'labios', price: 13200, compareAt: 15900, stock: 18, sku: 'GLO-002', size: '6 ml',
    images: ['assets/img/p-gloss-lila.webp'], variants: [{ name: 'Lila', hex: '#c9a0e6' }],
    tags: ['glossy', 'shimmer'], short: 'Destellos lilas sobre cualquier labial.',
    description: 'Top coat con micro destellos lilas para usar solo o sobre tu labial favorito.' },
  { id: 'base-segunda-piel', slug: 'base-segunda-piel', name: 'Base Segunda Piel', brand: '', category: 'rostro', price: 26900, compareAt: null, stock: 30, sku: 'BAS-001', size: '30 ml',
    images: ['assets/img/p-base.webp'], variants: [{ name: '01 Porcelana', hex: '#f1d3bf' }, { name: '02 Arena', hex: '#e2b896' }, { name: '03 Miel', hex: '#c9945f' }, { name: '04 Canela', hex: '#a26c43' }, { name: '05 Cacao', hex: '#6f452c' }],
    tags: ['24h', 'cobertura media'], short: 'Cobertura modulable que dura 24 h.',
    description: 'Base líquida liviana de cobertura media modulable. Acabado natural luminoso, resistente al calor y la humedad, con duración de hasta 24 horas.', featured: true },
  { id: 'rubor-petalo', slug: 'rubor-petalo', name: 'Rubor Pétalo', brand: '', category: 'rostro', price: 16800, compareAt: null, stock: 22, sku: 'RUB-001', size: '5 g',
    images: ['assets/img/p-rubor.webp'], variants: [{ name: 'Pétalo', hex: '#d27c8c' }],
    tags: ['polvo', 'buildable'], short: 'Rubor en polvo con efecto buena cara.',
    description: 'Rubor compacto de pigmento sedoso que se difumina fácil. Un rosa universal que favorece a todos los tonos de piel.' },
  { id: 'paleta-rose-nude', slug: 'paleta-rose-nude', name: 'Paleta Rosé Nude', brand: '', category: 'ojos', price: 32500, compareAt: 36900, stock: 12, sku: 'PAL-001', size: '9 × 1,2 g',
    images: ['assets/img/p-paleta.webp'], variants: [],
    tags: ['sombras', 'shimmer', 'mate'], short: '9 sombras mate y shimmer.',
    description: 'Nueve tonos rosados, malva y borravino en acabados mate, satinado y shimmer. Alta pigmentación y cero fallout.', featured: true },
  { id: 'mascara-volumen-infinito', slug: 'mascara-volumen-infinito', name: 'Máscara Volumen Infinito', brand: 'Rosé Atelier', category: 'ojos', price: 15400, compareAt: null, stock: 35, sku: 'MAS-001', size: '9 ml',
    images: ['assets/img/p-mascara.webp'], variants: [{ name: 'Negro', hex: '#1d1416' }, { name: 'Borravino', hex: '#5b0f2e' }],
    tags: ['volumen'], short: 'Pestañas con volumen sin grumos.',
    description: 'Cepillo de fibras que separa y carga cada pestaña. Fórmula resistente al agua que se retira con desmaquillante bifásico.' },
  { id: 'eau-de-parfum-rosee', slug: 'eau-de-parfum-rosee', name: 'Eau de Parfum Rosée', brand: '', category: 'perfumes', price: 48900, compareAt: null, stock: 10, sku: 'PER-001', size: '50 ml',
    images: ['assets/img/p-perfume.webp'], variants: [{ name: '50 ml' }, { name: '100 ml' }],
    tags: ['floral', 'nuevo'], short: 'Floral empolvado con rosa y almizcle.',
    description: 'Salida de pera y bergamota, corazón de rosa y peonía, fondo de almizcle blanco y vainilla. Una fragancia suave que se queda en la piel.', featured: true },
  { id: 'ambar-rose', slug: 'ambar-rose', name: 'Ámbar Rosé', brand: 'Maison Lila', category: 'perfumes', price: 52900, compareAt: 58900, stock: 8, sku: 'PER-002', size: '50 ml',
    images: ['assets/img/p-perfume-ambar.webp'], variants: [{ name: '50 ml' }],
    tags: ['oriental', 'cálido'], short: 'Ámbar cálido con rosa turca.',
    description: 'Una fragancia cálida y envolvente: rosa turca, ámbar, sándalo y un toque de vainilla tostada.' },
  { id: 'lilac-mist', slug: 'lilac-mist', name: 'Bruma Lilac Mist', brand: '', category: 'perfumes', price: 21900, compareAt: null, stock: 26, sku: 'PER-003', size: '100 ml',
    images: ['assets/img/p-perfume2.webp'], variants: [],
    tags: ['body mist', 'fresco'], short: 'Bruma corporal de lila y pera.',
    description: 'Bruma perfumada para cuerpo y pelo con notas de lila, pera y almizcle. Fresca, liviana y para usar todo el día.' }
].map((p, i) => ({ status: 'published', seo: { title: '', description: '' }, sellerId: null, sellerPrice: null, commission: null, featured: false, createdAt: now + i * 3600e3, ...p }));

export const COLLECTIONS = [
  { id: 'ritual-glossy', name: 'Ritual glossy', description: 'Todo para labios de vidrio.', productIds: ['gloss-brillo-eterno', 'labial-velvet-rose', 'gloss-lila-glaze'] },
  { id: 'la-rutina-completa', name: 'La rutina completa', description: 'Base, rubor, sombras, máscara y gloss.', productIds: ['base-segunda-piel', 'rubor-petalo', 'paleta-rose-nude', 'mascara-volumen-infinito', 'gloss-brillo-eterno'] }
];

export const REVIEWS = [
  { name: 'Lucía', age: 27, skin: 'Piel mixta · clara', stars: 5, text: 'La base no se movió en todo el día de trabajo. Y el gloss no pega nada.', product: 'Base Segunda Piel', img: 'assets/img/review-1.webp' },
  { name: 'Valentina', age: 31, skin: 'Piel seca · oliva', stars: 5, text: 'Me cambió las mañanas: tres productos y salgo con cara de descansada.', product: 'Rubor Pétalo', img: 'assets/img/review-2.webp' },
  { name: 'Camila', age: 24, skin: 'Piel grasa · morena', stars: 4, text: 'La paleta es una locura de pigmento. Los shimmer brillan muchísimo.', product: 'Paleta Rosé Nude', img: 'assets/img/review-3.webp' },
  { name: 'Mei', age: 29, skin: 'Piel sensible · clara', stars: 5, text: 'Por fin un perfume suave que dura. Me lo preguntan siempre.', product: 'Eau de Parfum Rosée', img: 'assets/img/review-4.webp' }
];

export const DEFAULT_SETTINGS = {
  logoUrl: '',
  colors: { bg: '#f6dde4', rose: '#e58aa6', burgundy: '#5b0f2e', lilac: '#c9a0e6' },
  contact: { email: '', phone: '', instagram: '', whatsapp: '', address: 'Bahía Blanca, Buenos Aires' },
  banner: { heroTagline: 'Brillo que dura todo el día.', heroButton: 'Comprar el ritual', announcement: 'Envío gratis desde $60.000 a todo el país' },
  seo: { title: '', description: '' },
  ga4: '',
  adminEmails: ['admin@demo.com'],
  payments: {
    mercadopago: { enabled: true, label: 'Mercado Pago', link: '', note: 'Te enviamos el link de pago de Mercado Pago por email/WhatsApp al confirmar el pedido.' },
    paypal: { enabled: false, label: 'PayPal', clientId: '', usdRate: 1200 },
    transferencia: { enabled: true, label: 'Transferencia bancaria', info: 'Alias: TU.ALIAS.AQUI — CBU: 0000000000000000000000 — Titular: Nombre Apellido', discount: 10 },
    efectivo: { enabled: true, label: 'Efectivo al retirar', info: 'Pagás al retirar en nuestro punto de retiro en Bahía Blanca.' }
  },
  shipping: {
    freeFrom: 60000,
    methods: [
      { id: 'retiro', label: 'Retiro en local (Bahía Blanca)', type: 'retiro', cost: 0, enabled: true },
      { id: 'domicilio-bb', label: 'Envío a domicilio · Bahía Blanca', type: 'fijo', cost: 2500, enabled: true },
      { id: 'correo', label: 'Envío a todo el país (Correo Argentino / Andreani)', type: 'zona', cost: 6900, zones: { 'Buenos Aires': 5900, 'CABA': 5900, 'Patagonia': 8900 }, enabled: true }
    ],
    carriers: [
      { id: 'correo-argentino', name: 'Correo Argentino', trackUrl: 'https://www.correoargentino.com.ar/formularios/e-commerce?id={code}' },
      { id: 'andreani', name: 'Andreani', trackUrl: 'https://www.andreani.com/#!/informacionEnvio/{code}' },
      { id: 'oca', name: 'OCA', trackUrl: 'https://www.oca.com.ar/Busquedas/Envios?numero={code}' }
    ]
  },
  marketplace: { enabled: false, defaultCommissionType: 'pct', defaultCommission: 20 }
};

export const ORDER_STATUSES = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];
