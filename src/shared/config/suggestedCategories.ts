/**
 * Categorías sugeridas por Finance 2.0. NO se crean automáticamente: el
 * usuario las agrega con un clic desde Categorías, y solo se insertan las
 * que no existen ya (comparando el nombre sin mayúsculas ni tildes).
 */
export const SUGGESTED_CATEGORIES: {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}[] = [
  { name: 'Vivienda', type: 'expense', icon: 'home', color: '#8b5cf6' },
  { name: 'Servicios', type: 'expense', icon: 'other', color: '#0ea5e9' },
  { name: 'Alimentación', type: 'expense', icon: 'utensils', color: '#f59e0b' },
  { name: 'Transporte', type: 'expense', icon: 'car', color: '#3b82f6' },
  { name: 'Salud', type: 'expense', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Comunicaciones', type: 'expense', icon: 'smartphone', color: '#06b6d4' },
  { name: 'Suscripciones', type: 'expense', icon: 'refresh', color: '#ec4899' },
  { name: 'Educación', type: 'expense', icon: 'graduation-cap', color: '#22c55e' },
  { name: 'Compras personales', type: 'expense', icon: 'shirt', color: '#a855f7' },
  { name: 'Regalos', type: 'expense', icon: 'gift', color: '#f43f5e' },
  { name: 'Viajes', type: 'expense', icon: 'plane', color: '#14b8a6' },
  { name: 'Deudas', type: 'expense', icon: 'hand-coins', color: '#dc2626' },
  { name: 'Negocios', type: 'expense', icon: 'briefcase', color: '#64748b' },
  { name: 'Ahorro', type: 'expense', icon: 'target', color: '#16a34a' },
  { name: 'Inversiones', type: 'expense', icon: 'trending-up', color: '#0d9488' },
  { name: 'Otros', type: 'expense', icon: 'other', color: '#94a3b8' },
];

export const normalizeName = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
