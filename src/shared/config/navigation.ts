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
  { label: 'Transacciones', href: '/transactions', icon: ArrowLeftRight, phase: 7 },
  { label: 'Categorías', href: '/categories', icon: Tags, phase: 8 },
  { label: 'Cuentas', href: '/accounts', icon: Wallet, phase: 9 },
  { label: 'Presupuestos', href: '/budgets', icon: PiggyBank, phase: 10 },
  { label: 'Deudas', href: '/debts', icon: HandCoins, phase: 11 },
  { label: 'Ahorros', href: '/savings', icon: Target, phase: 12 },
  { label: 'Inversiones', href: '/investments', icon: TrendingUp, phase: 13 },
  { label: 'Clientes', href: '/clients', icon: Users, phase: 14 },
  { label: 'Suscripciones', href: '/subscriptions', icon: RefreshCw, phase: 15 },
  { label: 'Reportes', href: '/reports', icon: BarChart3, phase: 16 },
  { label: 'Calendario', href: '/calendar', icon: Calendar, phase: 17 },
];

export const SETTINGS_ITEM: NavItem = {
  label: 'Configuración',
  href: '/settings',
  icon: Settings,
  phase: 19,
};
