export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: ClientStatus;
  notes: string | null;
  /** Suma de transacciones de tipo income ligadas a este cliente (v_client_totals) — útil para ver quién factura más. */
  totalIncome: number;
  createdAt: string;
}
