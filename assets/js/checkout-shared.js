/* Lógica compartida de envíos (la misma regla usa el Worker de pagos). */
export const PROVINCES = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];
export const PATAGONIA = ['Neuquén', 'Río Negro', 'Chubut', 'Santa Cruz', 'Tierra del Fuego'];
export function shippingCost(m, province, subtotal, freeFrom) {
  if (!m || m.type === 'retiro') return 0;
  if (freeFrom && subtotal >= freeFrom) return 0;
  if (m.type === 'gratis') return 0;
  if (m.type === 'zona') { const z = m.zones || {}; if (province in z) return +z[province]; if (PATAGONIA.includes(province) && 'Patagonia' in z) return +z.Patagonia; }
  return +m.cost || 0;
}
