import {
  Utensils,
  Car,
  HeartPulse,
  Home,
  Cpu,
  Book,
  Tv,
  Briefcase,
  Wallet,
  Tag,
  Banknote,
  Smartphone,
  Landmark,
  ShoppingCart,
  Gift,
  Plane,
  GraduationCap,
  Dumbbell,
  Coffee,
  Gamepad2,
  Shirt,
  Fuel,
  Pill,
  Baby,
  PawPrint,
  RefreshCw,
  Laptop,
  MoreHorizontal,
  Target,
  HandCoins,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapa de nombre de ícono (guardado como texto en accounts.icon / categories.icon)
 * a componente de Lucide. Un solo lugar para Categorías (Fase 8), Cuentas
 * (Fase 9) y cualquier otro módulo que necesite renderizar el ícono elegido
 * por el usuario. `getIcon` cae a `Tag` si el nombre no está en el mapa
 * (por ejemplo datos creados fuera de la app).
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  'heart-pulse': HeartPulse,
  home: Home,
  cpu: Cpu,
  book: Book,
  tv: Tv,
  briefcase: Briefcase,
  wallet: Wallet,
  tag: Tag,
  banknote: Banknote,
  smartphone: Smartphone,
  'building-bank': Landmark,
  'shopping-cart': ShoppingCart,
  gift: Gift,
  plane: Plane,
  'graduation-cap': GraduationCap,
  dumbbell: Dumbbell,
  coffee: Coffee,
  gamepad: Gamepad2,
  shirt: Shirt,
  fuel: Fuel,
  pill: Pill,
  baby: Baby,
  'paw-print': PawPrint,
  refresh: RefreshCw,
  laptop: Laptop,
  target: Target,
  'hand-coins': HandCoins,
  'trending-up': TrendingUp,
  other: MoreHorizontal,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) || Tag;
}
