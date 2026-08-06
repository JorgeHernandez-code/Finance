create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('stocks', 'crypto', 'real_estate', 'business', 'other')),
  amount_invested numeric(14, 2) not null check (amount_invested > 0),
  start_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investments enable row level security;
create policy "select_own_investments" on public.investments for select using (auth.uid() = user_id);
create policy "insert_own_investments" on public.investments for insert with check (auth.uid() = user_id);
create policy "update_own_investments" on public.investments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_investments" on public.investments for delete using (auth.uid() = user_id);

create index idx_investments_user on public.investments (user_id);

create trigger set_investments_updated_at before update on public.investments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Historial de valor -> permite calcular rentabilidad en el tiempo (Fase 13).

create table if not exists public.investment_valuations (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments (id) on delete cascade,
  value numeric(14, 2) not null check (value >= 0),
  valuation_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (investment_id, valuation_date)
);

alter table public.investment_valuations enable row level security;

create policy "select_own_investment_valuations" on public.investment_valuations for select
  using (exists (select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()));
create policy "insert_own_investment_valuations" on public.investment_valuations for insert
  with check (exists (select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()));
create policy "delete_own_investment_valuations" on public.investment_valuations for delete
  using (exists (select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()));

create index idx_investment_valuations_investment on public.investment_valuations (investment_id, valuation_date desc);
