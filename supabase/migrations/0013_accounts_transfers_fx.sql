-- Finance 2.0 · Bloque 1: cuentas, transferencias de doble entrada,
-- tasas de cambio y conciliaciones.
--
-- Migración ADITIVA y compatible con la versión desplegada:
--   - solo agrega columnas nullable o con default, tablas nuevas e índices;
--   - no elimina ni renombra nada;
--   - las vistas se reemplazan conservando columnas, orden y tipos (las
--     columnas nuevas van al final), así el código desplegado sigue leyéndolas.
-- Se puede aplicar ANTES de desplegar el código nuevo.

-- ---------------------------------------------------------------------------
-- Cuentas: país (Colombia / Chile / otro). Nullable: si no se indica, la app
-- lo deduce de la moneda (COP → CO, CLP → CL) y lo muestra como deducido.

alter table public.accounts
  add column if not exists country char(2) check (country is null or country ~ '^[A-Z]{2}$');

-- ---------------------------------------------------------------------------
-- Transacciones: transferencias reales.
--
-- Una transferencia son DOS filas type = 'transfer' enlazadas entre sí por
-- transfer_pair_id: la pierna 'out' resta de la cuenta origen y la pierna
-- 'in' suma a la cuenta destino (en su propia moneda; permite cambio de
-- divisa entre cuentas). Las filas 'transfer' antiguas, sin dirección,
-- siguen siendo neutras en el saldo como hasta ahora.

alter table public.transactions
  add column if not exists transfer_direction text
    check (transfer_direction is null or transfer_direction in ('out', 'in'));

alter table public.transactions drop constraint if exists transactions_transfer_direction_type_check;
alter table public.transactions
  add constraint transactions_transfer_direction_type_check
  check (transfer_direction is null or type = 'transfer');

-- Clave de idempotencia: el formulario genera un UUID al abrirse; si el
-- mismo envío llega dos veces (doble clic, reintento de red), el segundo
-- insert choca con el índice único en vez de duplicar el movimiento.
alter table public.transactions add column if not exists idempotency_key uuid;
create unique index if not exists uq_transactions_idempotency
  on public.transactions (user_id, idempotency_key) where idempotency_key is not null;

create index if not exists idx_transactions_pair
  on public.transactions (transfer_pair_id) where transfer_pair_id is not null;

-- Crea las dos piernas de una transferencia de forma atómica.
-- SECURITY INVOKER (por defecto): corre con los permisos de quien llama, así
-- que RLS se aplica igual que con inserts directos.
create or replace function public.create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount_out numeric,
  p_amount_in numeric,
  p_date date,
  p_description text,
  p_notes text default null,
  p_idempotency_key uuid default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_from_currency char(3);
  v_to_currency char(3);
  v_out_id uuid;
  v_in_id uuid;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;
  if p_from_account = p_to_account then
    raise exception 'La cuenta de origen y la de destino deben ser distintas';
  end if;
  if p_amount_out is null or p_amount_out <= 0 or p_amount_in is null or p_amount_in <= 0 then
    raise exception 'Los montos deben ser mayores a 0';
  end if;

  if p_idempotency_key is not null then
    select id into v_out_id from public.transactions
      where user_id = v_user and idempotency_key = p_idempotency_key;
    if v_out_id is not null then
      return v_out_id;
    end if;
  end if;

  select currency into v_from_currency from public.accounts where id = p_from_account and user_id = v_user;
  select currency into v_to_currency from public.accounts where id = p_to_account and user_id = v_user;
  if v_from_currency is null or v_to_currency is null then
    raise exception 'Cuenta no encontrada';
  end if;
  if v_from_currency = v_to_currency and p_amount_out <> p_amount_in then
    raise exception 'En cuentas de la misma moneda el monto enviado y recibido debe coincidir';
  end if;

  insert into public.transactions
    (user_id, account_id, type, transfer_direction, amount, currency, description, notes, transaction_date, idempotency_key)
  values
    (v_user, p_from_account, 'transfer', 'out', p_amount_out, v_from_currency, p_description, p_notes, p_date, p_idempotency_key)
  returning id into v_out_id;

  insert into public.transactions
    (user_id, account_id, type, transfer_direction, amount, currency, description, notes, transaction_date, transfer_pair_id)
  values
    (v_user, p_to_account, 'transfer', 'in', p_amount_in, v_to_currency, p_description, p_notes, p_date, v_out_id)
  returning id into v_in_id;

  update public.transactions set transfer_pair_id = v_in_id where id = v_out_id;

  return v_out_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tasas de cambio ingresadas por el usuario (sin proveedor externo).
-- Significado: 1 base_currency = rate quote_currency, vigente en rate_date.

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  base_currency char(3) not null,
  quote_currency char(3) not null default 'COP',
  rate numeric(20, 8) not null check (rate > 0),
  rate_date date not null default current_date,
  source text,
  created_at timestamptz not null default now(),
  unique (user_id, base_currency, quote_currency, rate_date),
  check (base_currency <> quote_currency)
);

alter table public.exchange_rates enable row level security;
create policy "select_own_exchange_rates" on public.exchange_rates for select using (auth.uid() = user_id);
create policy "insert_own_exchange_rates" on public.exchange_rates for insert with check (auth.uid() = user_id);
create policy "update_own_exchange_rates" on public.exchange_rates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_exchange_rates" on public.exchange_rates for delete using (auth.uid() = user_id);

create index if not exists idx_exchange_rates_lookup
  on public.exchange_rates (user_id, base_currency, quote_currency, rate_date desc);

-- ---------------------------------------------------------------------------
-- Conciliaciones: "el extracto dice X". Confirma el saldo de una cuenta en
-- una fecha y deja registro de la diferencia con el saldo calculado. No
-- modifica el saldo ni crea movimientos: corregir es decisión del usuario.

create table if not exists public.account_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  reconciled_on date not null default current_date,
  statement_balance numeric(14, 2) not null,
  computed_balance numeric(14, 2) not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.account_reconciliations enable row level security;
create policy "select_own_reconciliations" on public.account_reconciliations for select using (auth.uid() = user_id);
create policy "insert_own_reconciliations" on public.account_reconciliations for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
  );
create policy "delete_own_reconciliations" on public.account_reconciliations for delete using (auth.uid() = user_id);

create index if not exists idx_reconciliations_account
  on public.account_reconciliations (account_id, reconciled_on desc);

-- ---------------------------------------------------------------------------
-- Vistas. Mismas columnas y orden que en 0011; lo nuevo va al final.

create or replace view public.v_account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.currency,
  a.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount
                         when t.type = 'expense' then -t.amount
                         when t.type = 'transfer' and t.transfer_direction = 'in' then t.amount
                         when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount
                         else 0 end), 0) as current_balance
from public.accounts a
left join public.transactions t
  on t.account_id = a.id and t.deleted_at is null
where a.is_archived = false
group by a.id, a.user_id, a.name, a.currency, a.initial_balance;

-- v_monthly_summary (0011) suma importes de monedas distintas en una sola
-- cifra. Se conserva intacta por compatibilidad con la versión desplegada;
-- el código nuevo usa esta vista, separada por moneda. Las transferencias
-- no son ingreso ni gasto y quedan fuera.
create or replace view public.v_monthly_summary_by_currency
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', transaction_date)::date as month,
  currency,
  sum(case when type = 'income' then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expense,
  count(*) filter (where type in ('income', 'expense')) as movement_count
from public.transactions
where deleted_at is null and type in ('income', 'expense')
group by user_id, date_trunc('month', transaction_date), currency;

create or replace view public.v_category_breakdown_by_currency
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.transaction_date)::date as month,
  t.currency,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.type as category_type,
  sum(t.amount) as total_amount
from public.transactions t
join public.categories c on c.id = t.category_id
where t.deleted_at is null and t.type in ('income', 'expense')
group by t.user_id, date_trunc('month', t.transaction_date), t.currency, c.id, c.name, c.color, c.type;

comment on view public.v_net_worth is
  'OBSOLETA (Finance 2.0): mezcla monedas y suma el ahorro dos veces. Se conserva solo por compatibilidad con la versión anterior; el patrimonio se calcula en src/domain/finance/netWorth.ts.';
comment on view public.v_monthly_summary is
  'OBSOLETA (Finance 2.0): mezcla monedas. Usar v_monthly_summary_by_currency.';
