import Link from 'next/link';
import type { Route } from 'next';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, HandCoins, Landmark, Target } from 'lucide-react';

const ACTIONS: { href: Route; label: string; icon: typeof ArrowUpCircle; tone: string }[] = [
  {
    href: '/transactions?nuevo=expense' as Route,
    label: 'Gasto',
    icon: ArrowDownCircle,
    tone: 'text-danger',
  },
  {
    href: '/transactions?nuevo=income' as Route,
    label: 'Ingreso',
    icon: ArrowUpCircle,
    tone: 'text-success',
  },
  {
    href: '/transactions?nuevo=transfer' as Route,
    label: 'Entre cuentas',
    icon: ArrowLeftRight,
    tone: 'text-primary',
  },
  { href: '/debts?nuevo=pago' as Route, label: 'Pago de deuda', icon: HandCoins, tone: 'text-warning' },
  { href: '/debts?nuevo=deuda' as Route, label: 'Deuda', icon: Landmark, tone: 'text-muted-foreground' },
  { href: '/savings?nuevo=meta' as Route, label: 'Meta', icon: Target, tone: 'text-success' },
];

/** Registro rápido: las acciones más frecuentes a un toque. */
export function QuickActions() {
  return (
    <nav aria-label="Registro rápido" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ACTIONS.map(({ href, label, icon: Icon, tone }) => (
        <Link
          key={label}
          href={href}
          className="glass flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon className={`size-5 ${tone}`} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
