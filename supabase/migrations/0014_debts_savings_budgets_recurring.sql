-- Finance 2.0 · Bloque 2: deudas, ahorro, presupuestos y gastos recurrentes.
--
-- ADITIVA y compatible con la versión desplegada (ver cabecera de 0013).
-- Las restricciones CHECK de "status"/"billing_cycle" se AMPLÍAN (los valores
-- antiguos siguen siendo válidos); ninguna fila existente cambia de valor.
--
-- Sobre los defaults de moneda: las deudas, metas y presupuestos existentes
-- no tenían moneda y la app siempre los mostró en COP. El default 'COP'
-- conserva exactamente lo que se veía; si alguno era en realidad en CLP,
-- hay que corregirlo desde el formulario (la app lo marca como dato a revisar
-- mientras el país esté vacío).

-- ---------------------------------------------------------------------------
-- DEUDAS

alter table public.debts add column if not exists currency char(3) not null default 'COP';
alter table public.debts add column if not exists country char(2)
  check (country is null or country ~ '^[A-Z]{2}$');
alter table public.debts add column if not exists kind text not null default 'other'
  check (kind in ('personal_loan', 'bank_loan', 'credit_card', 'family', 'friend', 'commercial', 'tax', 'fine', 'utility', 'other'));
alter table public.debts add column if not exists installment_amount numeric(14, 2)
  check (installment_amount is null or installment_amount > 0);
alter table public.debts add column if not exists installments_total integer
  check (installments_total is null or installments_total > 0);
alter table public.debts add column if not exists next_payment_date date;
alter table public.debts add column if not exists priority text
  check (priority is null or priority in ('high', 'medium', 'low'));
alter table public.debts add column if not exists negotiable text not null default 'unknown'
  check (negotiable in ('yes', 'no', 'unknown'));
-- Saldo confirmado con el acreedor (extracto, llamada, app del banco) en una
-- fecha. Sin confirmación, el saldo pendiente es una ESTIMACIÓN.
alter table public.debts add column if not exists balance_confirmed_amount numeric(14, 2)
  check (balance_confirmed_amount is null or balance_confirmed_amount >= 0);
alter table public.debts add column if not exists balance_confirmed_at date;
-- interest_rate (0006) no dice si es mensual o anual. Sin este dato, los
-- simuladores NO calculan intereses (y lo advierten) en vez de suponerlo.
alter table public.debts add column if not exists interest_rate_period text
  check (interest_rate_period is null or interest_rate_period in ('monthly', 'annual'));

alter table public.debts drop constraint if exists debts_balance_confirmation_check;
alter table public.debts add constraint debts_balance_confirmation_check
  check ((balance_confirmed_amount is null) = (balance_confirmed_at is null));

-- Estados nuevos: en negociación y con acuerdo de pago.
alter table public.debts drop constraint if exists debts_status_check;
alter table public.debts add constraint debts_status_check
  check (status in ('active', 'paid', 'overdue', 'negotiating', 'agreement'));

create index if not exists idx_debts_user_next_payment on public.debts (user_id, next_payment_date)
  where status <> 'paid';

-- Pagos: desglose opcional de intereses y cargos. Una cuota pagada NO reduce
-- el capital en su importe completo cuando parte se va en intereses/cargos.
alter table public.debt_payments add column if not exists interest_amount numeric(14, 2)
  check (interest_amount is null or interest_amount >= 0);
alter table public.debt_payments add column if not exists fees_amount numeric(14, 2)
  check (fees_amount is null or fees_amount >= 0);
alter table public.debt_payments drop constraint if exists debt_payments_breakdown_check;
alter table public.debt_payments add constraint debt_payments_breakdown_check
  check (coalesce(interest_amount, 0) + coalesce(fees_amount, 0) <= amount);
-- Movimiento de cuenta asociado (el dinero que salió). Registrar el pago y
-- el gasto por separado lo contaría dos veces; con este enlace es uno solo.
alter table public.debt_payments add column if not exists transaction_id uuid
  references public.transactions (id) on delete set null;
alter table public.debt_payments add column if not exists idempotency_key uuid;
create unique index if not exists uq_debt_payments_idempotency
  on public.debt_payments (debt_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists uq_debt_payments_transaction
  on public.debt_payments (transaction_id) where transaction_id is not null;

-- Saldo pendiente:
--   base      = saldo confirmado (si existe) o monto original
--   capital   = pago - intereses - cargos, solo pagos POSTERIORES a la confirmación
--   pendiente = base - capital
-- Pagos antiguos sin desglose cuentan como capital completo: mismo resultado
-- que la vista de 0011 para todas las deudas sin confirmación.
create or replace view public.v_debt_balance
with (security_invoker = true) as
select
  d.id as debt_id,
  d.user_id,
  d.creditor_name,
  d.direction,
  d.principal_amount,
  d.status,
  d.due_date,
  coalesce(sum(p.amount), 0) as total_paid,
  coalesce(d.balance_confirmed_amount, d.principal_amount)
    - coalesce(sum(p.amount - coalesce(p.interest_amount, 0) - coalesce(p.fees_amount, 0)) filter (
        where d.balance_confirmed_at is null or p.payment_date > d.balance_confirmed_at
      ), 0) as remaining_balance,
  d.currency,
  d.balance_confirmed_amount,
  d.balance_confirmed_at,
  count(p.id) filter (where d.balance_confirmed_at is null or p.payment_date > d.balance_confirmed_at)
    as payments_since_confirmation,
  coalesce(sum(coalesce(p.interest_amount, 0) + coalesce(p.fees_amount, 0)), 0) as total_interest_and_fees,
  max(p.payment_date) as last_payment_date
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id, d.user_id, d.creditor_name, d.direction, d.principal_amount, d.status, d.due_date,
  d.currency, d.balance_confirmed_amount, d.balance_confirmed_at;

-- Registra un pago de deuda de forma atómica y, opcionalmente, el gasto en
-- la cuenta de la que salió el dinero (un solo registro real, enlazado).
-- Idempotente por p_idempotency_key. SECURITY INVOKER: aplica RLS.
create or replace function public.record_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_interest_amount numeric default null,
  p_fees_amount numeric default null,
  p_notes text default null,
  p_account_id uuid default null,
  p_category_id uuid default null,
  p_idempotency_key uuid default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_debt record;
  v_account_currency char(3);
  v_transaction_id uuid;
  v_payment_id uuid;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  if p_idempotency_key is not null then
    select id into v_payment_id from public.debt_payments
      where debt_id = p_debt_id and idempotency_key = p_idempotency_key;
    if v_payment_id is not null then
      return v_payment_id;
    end if;
  end if;

  select id, creditor_name, direction, currency into v_debt
    from public.debts where id = p_debt_id and user_id = v_user;
  if v_debt.id is null then
    raise exception 'Deuda no encontrada';
  end if;

  if p_account_id is not null then
    select currency into v_account_currency from public.accounts where id = p_account_id and user_id = v_user;
    if v_account_currency is null then
      raise exception 'Cuenta no encontrada';
    end if;
    if v_account_currency <> v_debt.currency then
      raise exception 'La cuenta (%) y la deuda (%) tienen monedas distintas', v_account_currency, v_debt.currency;
    end if;

    insert into public.transactions
      (user_id, account_id, category_id, type, amount, currency, description, notes, transaction_date)
    values (
      v_user, p_account_id, p_category_id,
      case when v_debt.direction = 'i_owe' then 'expense' else 'income' end,
      p_amount, v_account_currency,
      case when v_debt.direction = 'i_owe' then 'Pago a ' else 'Cobro a ' end || v_debt.creditor_name,
      p_notes, p_payment_date
    )
    returning id into v_transaction_id;
  end if;

  insert into public.debt_payments
    (debt_id, amount, payment_date, notes, interest_amount, fees_amount, transaction_id, idempotency_key)
  values
    (p_debt_id, p_amount, p_payment_date, p_notes, p_interest_amount, p_fees_amount, v_transaction_id, p_idempotency_key)
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- METAS DE AHORRO
--
-- Un aporte es una RESERVA (dinero apartado dentro de una cuenta), no dinero
-- adicional: el patrimonio no lo suma por segunda vez y el "dinero libre"
-- es saldo de cuentas menos reservas.

alter table public.savings_goals add column if not exists currency char(3) not null default 'COP';
alter table public.savings_goals add column if not exists account_id uuid
  references public.accounts (id) on delete set null;
alter table public.savings_goals add column if not exists priority smallint not null default 3
  check (priority between 1 and 5);
alter table public.savings_goals add column if not exists planned_monthly_contribution numeric(14, 2)
  check (planned_monthly_contribution is null or planned_monthly_contribution > 0);
alter table public.savings_goals add column if not exists is_emergency_fund boolean not null default false;

-- Pausar o cancelar sin perder el historial (en vez de borrar).
alter table public.savings_goals drop constraint if exists savings_goals_status_check;
alter table public.savings_goals add constraint savings_goals_status_check
  check (status in ('active', 'completed', 'archived', 'paused', 'cancelled'));

-- Retiros de una reserva (p. ej. usar parte del fondo de emergencia).
alter table public.savings_contributions add column if not exists kind text not null default 'deposit'
  check (kind in ('deposit', 'withdrawal'));
alter table public.savings_contributions add column if not exists idempotency_key uuid;
create unique index if not exists uq_savings_contributions_idempotency
  on public.savings_contributions (savings_goal_id, idempotency_key) where idempotency_key is not null;

create or replace view public.v_savings_progress
with (security_invoker = true) as
select
  g.id as goal_id,
  g.user_id,
  g.name,
  g.target_amount,
  g.target_date,
  g.status,
  coalesce(sum(case when c.kind = 'withdrawal' then -c.amount else c.amount end), 0) as current_amount,
  round(coalesce(sum(case when c.kind = 'withdrawal' then -c.amount else c.amount end), 0)
    / nullif(g.target_amount, 0) * 100, 1) as progress_percent,
  g.currency,
  g.account_id,
  max(c.contribution_date) as last_contribution_date
from public.savings_goals g
left join public.savings_contributions c on c.savings_goal_id = g.id
group by g.id, g.user_id, g.name, g.target_amount, g.target_date, g.status, g.currency, g.account_id;

-- ---------------------------------------------------------------------------
-- PRESUPUESTOS
--
-- Corrección: v_budget_progress (0011) sumaba TODO el gasto desde start_date,
-- así que un presupuesto mensual creado hace meses aparecía sobregirado. Ahora
-- se mide solo el periodo en curso (mes o año) dentro de [start_date, end_date]
-- y en la moneda del presupuesto.

alter table public.budgets add column if not exists currency char(3) not null default 'COP';

create or replace view public.v_budget_progress
with (security_invoker = true) as
with periods as (
  select
    b.*,
    greatest(
      b.start_date,
      case when b.period = 'monthly' then date_trunc('month', current_date)::date
           else date_trunc('year', current_date)::date end
    ) as period_start,
    least(
      coalesce(b.end_date, 'infinity'::date),
      case when b.period = 'monthly' then (date_trunc('month', current_date) + interval '1 month - 1 day')::date
           else (date_trunc('year', current_date) + interval '1 year - 1 day')::date end
    ) as period_end
  from public.budgets b
),
spent as (
  select
    p.id as budget_id,
    coalesce(sum(t.amount), 0) as spent_amount
  from periods p
  left join public.transactions t
    on t.category_id = p.category_id
   and t.user_id = p.user_id
   and t.type = 'expense'
   and t.deleted_at is null
   and t.currency = p.currency
   and t.transaction_date between p.period_start and p.period_end
  group by p.id
)
select
  p.id as budget_id,
  p.user_id,
  p.category_id,
  c.name as category_name,
  p.amount as budget_amount,
  p.period,
  p.start_date,
  p.end_date,
  p.alert_threshold_percent,
  s.spent_amount,
  p.amount - s.spent_amount as available_amount,
  round(s.spent_amount / nullif(p.amount, 0) * 100, 1) as spent_percent,
  p.currency,
  p.period_start,
  p.period_end
from periods p
join public.categories c on c.id = p.category_id
join spent s on s.budget_id = p.id;

-- ---------------------------------------------------------------------------
-- INVERSIONES: moneda (la app siempre las mostró en COP).

alter table public.investments add column if not exists currency char(3) not null default 'COP';

-- ---------------------------------------------------------------------------
-- GASTOS RECURRENTES (se amplía la tabla subscriptions; no se duplica)

alter table public.subscriptions add column if not exists kind text not null default 'subscription'
  check (kind in ('subscription', 'rent', 'utilities', 'food', 'transport', 'phone', 'internet',
                  'loan_installment', 'personal', 'business', 'extraordinary', 'other'));
alter table public.subscriptions add column if not exists is_essential boolean not null default false;
-- Si la cuota de un préstamo se registra como recurrente, se enlaza a la
-- deuda: los compromisos mensuales la cuentan una sola vez.
alter table public.subscriptions add column if not exists debt_id uuid
  references public.debts (id) on delete set null;
alter table public.subscriptions add column if not exists last_reviewed_at date;

alter table public.subscriptions drop constraint if exists subscriptions_billing_cycle_check;
alter table public.subscriptions add constraint subscriptions_billing_cycle_check
  check (billing_cycle in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));

-- Historial de pagos de un recurrente: el pago real es una transacción
-- enlazada (se registra una sola vez).
alter table public.transactions add column if not exists subscription_id uuid
  references public.subscriptions (id) on delete set null;
create index if not exists idx_transactions_subscription
  on public.transactions (subscription_id) where subscription_id is not null;
