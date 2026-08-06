-- Fase 5: vistas agregadas para Dashboard, Reportes, Presupuestos, Deudas,
-- Ahorros y Clientes (docs/02-BASE-DE-DATOS.md §6).
--
-- `security_invoker = true` en todas: sin esto, una vista corre con los
-- permisos de quien la creó (el owner), no de quien la consulta, y podría
-- devolver filas de todos los usuarios sin importar RLS. Con esta opción
-- (Postgres 15+) la vista respeta RLS igual que si consultaras la tabla
-- directamente — la misma garantía de seguridad que ya tienen las tablas.

-- Nota sobre transferencias: por ahora estas vistas solo consideran 'income'
-- y 'expense' para el cálculo de saldos. El manejo exacto de 'transfer'
-- (qué pierna resta y cuál suma) se define en la Fase 7 al construir el
-- flujo de creación de transferencias; hoy el tipo existe en el esquema
-- pero su efecto en saldo se deja neutro a propósito para no adivinar mal.

create view public.v_account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.currency,
  a.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount
                         when t.type = 'expense' then -t.amount
                         else 0 end), 0) as current_balance
from public.accounts a
left join public.transactions t
  on t.account_id = a.id and t.deleted_at is null
where a.is_archived = false
group by a.id, a.user_id, a.name, a.currency, a.initial_balance;

-- ---------------------------------------------------------------------------

create view public.v_monthly_summary
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', transaction_date)::date as month,
  sum(case when type = 'income' then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expense,
  sum(case when type = 'income' then amount else -amount end)
    filter (where type in ('income', 'expense')) as balance
from public.transactions
where deleted_at is null
group by user_id, date_trunc('month', transaction_date);

-- ---------------------------------------------------------------------------

create view public.v_category_breakdown
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.transaction_date)::date as month,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.type as category_type,
  sum(t.amount) as total_amount
from public.transactions t
join public.categories c on c.id = t.category_id
where t.deleted_at is null
group by t.user_id, date_trunc('month', t.transaction_date), c.id, c.name, c.color, c.type;

-- ---------------------------------------------------------------------------

create view public.v_budget_progress
with (security_invoker = true) as
select
  b.id as budget_id,
  b.user_id,
  b.category_id,
  c.name as category_name,
  b.amount as budget_amount,
  b.period,
  b.start_date,
  b.end_date,
  b.alert_threshold_percent,
  coalesce(sum(t.amount) filter (
    where t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date >= b.start_date
      and t.transaction_date <= coalesce(b.end_date, current_date)
  ), 0) as spent_amount,
  b.amount - coalesce(sum(t.amount) filter (
    where t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date >= b.start_date
      and t.transaction_date <= coalesce(b.end_date, current_date)
  ), 0) as available_amount,
  round(
    coalesce(sum(t.amount) filter (
      where t.type = 'expense'
        and t.deleted_at is null
        and t.transaction_date >= b.start_date
        and t.transaction_date <= coalesce(b.end_date, current_date)
    ), 0) / nullif(b.amount, 0) * 100, 1
  ) as spent_percent
from public.budgets b
join public.categories c on c.id = b.category_id
left join public.transactions t on t.category_id = b.category_id and t.user_id = b.user_id
group by b.id, b.user_id, b.category_id, c.name, b.amount, b.period, b.start_date, b.end_date, b.alert_threshold_percent;

-- ---------------------------------------------------------------------------

create view public.v_debt_balance
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
  d.principal_amount - coalesce(sum(p.amount), 0) as remaining_balance
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id, d.user_id, d.creditor_name, d.direction, d.principal_amount, d.status, d.due_date;

-- ---------------------------------------------------------------------------

create view public.v_savings_progress
with (security_invoker = true) as
select
  g.id as goal_id,
  g.user_id,
  g.name,
  g.target_amount,
  g.target_date,
  g.status,
  coalesce(sum(c.amount), 0) as current_amount,
  round(coalesce(sum(c.amount), 0) / nullif(g.target_amount, 0) * 100, 1) as progress_percent
from public.savings_goals g
left join public.savings_contributions c on c.savings_goal_id = g.id
group by g.id, g.user_id, g.name, g.target_amount, g.target_date, g.status;

-- ---------------------------------------------------------------------------

create view public.v_client_totals
with (security_invoker = true) as
select
  cl.id as client_id,
  cl.user_id,
  cl.name,
  cl.status,
  coalesce(sum(t.amount) filter (where t.deleted_at is null), 0) as total_income
from public.clients cl
left join public.transactions t on t.client_id = cl.id and t.type = 'income'
group by cl.id, cl.user_id, cl.name, cl.status;

-- ---------------------------------------------------------------------------
-- KPI principal del Dashboard: disponible (saldo de cuentas) + invertido
-- + ahorrado - deudas que yo debo = patrimonio neto.

create view public.v_net_worth
with (security_invoker = true) as
select
  p.id as user_id,
  coalesce((select sum(current_balance) from public.v_account_balances where user_id = p.id), 0) as available,
  coalesce((select sum(amount_invested) from public.investments where user_id = p.id), 0) as invested,
  coalesce((select sum(current_amount) from public.v_savings_progress where user_id = p.id), 0) as saved,
  coalesce((select sum(remaining_balance) from public.v_debt_balance where user_id = p.id and direction = 'i_owe'), 0) as debt,
  coalesce((select sum(current_balance) from public.v_account_balances where user_id = p.id), 0)
    + coalesce((select sum(amount_invested) from public.investments where user_id = p.id), 0)
    + coalesce((select sum(current_amount) from public.v_savings_progress where user_id = p.id), 0)
    - coalesce((select sum(remaining_balance) from public.v_debt_balance where user_id = p.id and direction = 'i_owe'), 0)
    as net_worth
from public.profiles p;
