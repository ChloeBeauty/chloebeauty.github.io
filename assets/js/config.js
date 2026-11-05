/* =====================================================================
   CONFIGURACIÓN DE LA TIENDA — el ÚNICO lugar donde se define el nombre.
   Cambiá STORE.name (y si querés STORE.wordmark) y todo el sitio se
   actualiza: títulos, menú, logo, textos, SEO, JSON-LD, sitemap y README.
   Si publicás con GitHub Actions (recomendado), las páginas estáticas se
   regeneran solas al guardar este archivo.
   ===================================================================== */
export const STORE = {
  name: 'Chloe Beauty',            // nombre comercial completo
  wordmark: 'chloe',               // palabra grande del logo (minúsculas queda lindo)
  tagline: 'Maquillaje y perfumes con brillo propio',
  description: 'Tienda online de maquillaje y perfumes en Argentina: labiales, glosses, bases, paletas y fragancias con envíos a todo el país desde Bahía Blanca.',
  // Dirección pública final del sitio, CON barra al final.
  // Ej.: 'https://tuusuario.github.io/chloe-beauty/' o 'https://www.tudominio.com.ar/'
  url: 'https://chloebeauty.dev.ar/',
  locale: 'es-AR',
  currency: 'ARS',
  city: 'Bahía Blanca',
  region: 'Buenos Aires',
  country: 'AR',
  // Datos de contacto (PLACEHOLDERS: reemplazalos por los reales)
  email: 'hola@tudominio.com.ar',
  phone: '+54 9 291 000-0000',
  instagram: 'chloebeauty',
  whatsapp: '',                    // ej. '5492910000000' (sin + ni espacios)
  keywords: 'maquillaje, perfumes, labiales, gloss, base de maquillaje, paleta de sombras, cosmética, marcas de cosmética, vender maquillaje online, Bahía Blanca, Argentina'
};

/* =====================================================================
   SERVICIOS OPCIONALES (dejar vacío = desactivado). Ninguno es secreto.
   ===================================================================== */
export const SERVICES = {
  // URL de tu Cloudflare Worker de pagos (carpeta serverless/cloudflare-worker).
  // Vacío = el checkout usa pago MANUAL (transferencia / link de pago que enviás vos).
  workerUrl: '',                 // ej. 'https://pagos-tienda.tuusuario.workers.dev'
  mercadoPagoPublicKey: '',      // Public key de MP (APP_USR-...) para el botón Wallet. Vacío = redirección.
  paypalClientId: '',            // Client ID PÚBLICO de PayPal (el secret va solo en el Worker)
  paypalCurrency: 'USD',         // PayPal no opera en ARS: se convierte con la cotización de Ajustes
  turnstileSiteKey: '',          // Cloudflare Turnstile (anti-bots) — requiere workerUrl para verificar
  appCheckSiteKey: ''            // Firebase App Check con reCAPTCHA v3 (site key)
};
