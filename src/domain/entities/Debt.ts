import type { DebtKind, DebtStatusValue, SnapshotDebt, SnapshotDebtPayment } from '@/domain/finance/snapshot';

export type DebtDirection = 'i_owe' | 'owed_to_me';
export type DebtStatus = DebtStatusValue;
export type { DebtKind };

/**
 * Deuda con su saldo calculado (v_debt_balance). Misma forma que la usada
 * por los cálculos de Finance 2.0 (src/domain/finance/debts.ts).
 */
export type Debt = SnapshotDebt;
export type DebtPayment = SnapshotDebtPayment & { notes: string | null };

export const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  personal_loan: 'Préstamo personal',
  bank_loan: 'Préstamo bancario',
  credit_card: 'Tarjeta de crédito',
  family: 'Deuda familiar',
  friend: 'Deuda con amigos',
  commercial: 'Deuda comercial',
  tax: 'Obligación tributaria',
  fine: 'Multa',
  utility: 'Servicio pendiente',
  state_loan: 'Préstamo estatal',
  other: 'Otra / sin clasificar',
};

export const DEBT_STATUS_LABEL: Record<DebtStatus, string> = {
  active: 'Activa',
  paid: 'Pagada',
  overdue: 'Vencida',
  negotiating: 'En negociación',
  agreement: 'Con acuerdo de pago',
};

export const RESPONSIBILITY_LABEL: Record<Debt['responsibility'], string> = {
  own: 'Propia',
  shared: 'Compartida',
  third_party: 'A nombre de un tercero',
};

export const COUNTRY_LABEL: Record<string, string> = { CO: 'Colombia', CL: 'Chile' };
