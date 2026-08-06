# presentation

Todo lo visual y de interacción. Los componentes nunca llaman a Supabase directamente: consumen hooks, que a su vez consumen casos de uso de `application`.

- `components/ui/` — primitivas shadcn/ui personalizadas (Button, Dialog, Input, DataTable, Command...).
- `components/charts/` — wrappers de Recharts con el tema visual de la app (dark, glassmorphism).
- `components/modules/<modulo>/` — componentes específicos de cada feature: `transactions/TransactionForm.tsx`, `debts/DebtCalendar.tsx`, etc.
- `hooks/` — un hook por entidad (`useTransactions`, `useBudgets`, `useDebts`), envolviendo TanStack Query: cache, loading, error, mutaciones optimistas.
- `stores/` — Zustand para estado puramente de UI (sidebar abierta/cerrada, filtros activos, modal actual) — **nunca** para datos que vienen del servidor (eso es responsabilidad de React Query).
