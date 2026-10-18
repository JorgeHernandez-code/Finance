-- Finance 2.0 · Soporte para datos incompletos e importaciones idempotentes.
--
-- Motivo: al cargar datos reales aparecen valores que el usuario NO conoce
-- (saldo total de un préstamo del que solo sabe la cuota, precio de una meta
-- pendiente de cotizar, día de cobro de un servicio, frecuencia del gas).
-- El esquema anterior obligaba a inventarlos (NOT NULL). Aquí se permiten
-- como "desconocido" y se agregan marcas de estimación.
--
-- ADITIVA: solo quita NOT NULL (ninguna fila existente cambia), amplía CHECKs
-- y agrega columnas nullable o con default. Compatible con el código anterior
-- mientras no existan filas con los valores nuevos (las crea la importación,
-- que se ejecuta DESPUÉS de desplegar el código que las entiende).

-- ---------------------------------------------------------------------------
-- Referencia estable de importación (idempotencia: re-ejecutar no duplica).

alter table public.accounts add column if not exists import_ref text;
alter table public.debts add column if not exists import_ref text;
alter table public.subscriptions add column if not exists import_ref text;
alter table public.savings_goals add column if not exists import_ref text;
alter table public.clients add column if not exists import_ref text;

create unique index if not exists uq_accounts_import_ref on public.accounts (user_id, import_ref) where import_ref is not null;
create unique index if not exists uq_debts_import_ref on public.debts (user_id, import_ref) where import_ref is not null;
create unique index if not exists uq_subscriptions_import_ref on public.subscriptions (user_id, import_ref) where import_ref is not null;
create unique index if not exists uq_savings_goals_import_ref on public.savings_goals (user_id, import_ref) where import_ref is not null;
create unique index if not exists uq_clients_import_ref on public.clients (user_id, import_ref) where import_ref is not null;

-- ---------------------------------------------------------------------------
-- Cuentas: notas (p. ej. "efectivo adicional sin contar, ~10.000 COP" sin
-- sumarlo al saldo contable).

alter table public.accounts add column if not exists notes text check (notes is null or length(notes) <= 1000);

-- ---------------------------------------------------------------------------
-- Deudas

-- Saldo desconocido: solo se sabe la cuota. NULL = "pendiente de confirmar".
alter table public.debts alter column principal_amount drop not null;
-- Importe aproximado (p. ej. deuda familiar estimada, multa por confirmar).
alter table public.debts add column if not exists amount_is_estimate boolean not null default false;
-- A nombre de quién está legalmente y qué parte asume el usuario.
alter table public.debts add column if not exists legal_holder text check (legal_holder is null or length(legal_holder) <= 120);
alter table public.debts add column if not exists responsibility text not null default 'own'
  check (responsibility in ('own', 'shared', 'third_party'));
-- Número de la próxima cuota según lo informado (no implica que las anteriores estén verificadas).
alter table public.debts add column if not exists next_installment_number integer
  check (next_installment_number is null or next_installment_number > 0);

alter table public.debts drop constraint if exists debts_kind_check;
alter table public.debts add constraint debts_kind_check
  check (kind in ('personal_loan', 'bank_loan', 'credit_card', 'family', 'friend', 'commercial', 'tax', 'fine', 'utility', 'state_loan', 'other'));

-- ---------------------------------------------------------------------------
-- Gastos recurrentes

alter table public.subscriptions alter column next_billing_date drop not null;
alter table public.subscriptions alter column billing_cycle drop not null;
alter table public.subscriptions add column if not exists amount_is_estimate boolean not null default false;
-- false = la frecuencia es la informada pero falta confirmarla.
alter table public.subscriptions add column if not exists cycle_confirmed boolean not null default true;
alter table public.subscriptions add column if not exists notes text check (notes is null or length(notes) <= 1000);

alter table public.subscriptions drop constraint if exists subscriptions_billing_cycle_check;
alter table public.subscriptions add constraint subscriptions_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly'));

-- ---------------------------------------------------------------------------
-- Metas: monto pendiente de cotización, categoría y notas.

alter table public.savings_goals alter column target_amount drop not null;
alter table public.savings_goals add column if not exists category_id uuid references public.categories (id) on delete set null;
alter table public.savings_goals add column if not exists notes text check (notes is null or length(notes) <= 1000);
