import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Wallet,
  PiggyBank,
  HandCoins,
  Target,
  TrendingUp,
  Users,
  RefreshCw,
  BarChart3,
  Calendar,
  Settings,
  Compass,
  Landmark,
  GraduationCap,
  Trophy,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Fase del roadmap en la que este módulo se vuelve funcional (docs/04-ROADMAP.md) */
  phase: number;
}

/**
 * Fuente única de verdad de la navegación: la usan la Sidebar, el CommandPalette
 * (buscador ⌘K) y, más adelante, cualquier breadcrumb. Un solo lugar para
 * agregar un módulo nuevo.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, phase: 6 },
  { label: 'Mi plan', href: '/plan', icon: Compass, phase: 23 },
  { label: 'Transacciones', href: '/transactions', icon: ArrowLeftRight, phase: 7 },
  { label: 'Cuentas', href: '/accounts', icon: Wallet, phase: 9 },
  { label: 'Deudas', href: '/debts', icon: HandCoins, phase: 11 },
  { label: 'Presupuestos', href: '/budgets', icon: PiggyBank, phase: 10 },
  { label: 'Ahorros', href: '/savings', icon: Target, phase: 12 },
  { label: 'Recurrentes', href: '/subscriptions', icon: RefreshCw, phase: 15 },
  { label: 'Patrimonio', href: '/net-worth', icon: Landmark, phase: 23 },
  { label: 'Academia', href: '/academy', icon: GraduationCap, phase: 23 },
  { label: 'Mi progreso', href: '/progress', icon: Trophy, phase: 23 },
  { label: 'Inversiones', href: '/investments', icon: TrendingUp, phase: 13 },
  { label: 'Clientes', href: '/clients', icon: Users, phase: 14 },
  { label: 'Reportes', href: '/reports', icon: BarChart3, phase: 16 },
  { label: 'Calendario', href: '/calendar', icon: Calendar, phase: 17 },
  { label: 'Categorías', href: '/categories', icon: Tags, phase: 8 },
];

export const SETTINGS_ITEM: NavItem = {
  label: 'Configuración',
  href: '/settings',
  icon: Settings,
  phase: 19,
};
