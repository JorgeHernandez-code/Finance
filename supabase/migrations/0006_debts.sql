create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creditor_name text not null,
  direction text not null check (direction in ('i_owe', 'owed_to_me')),
  principal_amount numeric(14, 2) not null check (principal_amount > 0),
  interest_rate numeric(5, 2),
  start_date date not null default current_date,
  due_date date,
  status text not null default 'active' check (status in ('active', 'paid', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;
create policy "select_own_debts" on public.debts for select using (auth.uid() = user_id);
create policy "insert_own_debts" on public.debts for insert with check (auth.uid() = user_id);
create policy "update_own_debts" on public.debts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_debts" on public.debts for delete using (auth.uid() = user_id);

create index idx_debts_user_status on public.debts (user_id, status);

create trigger set_debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.debt_payments enable row level security;

create policy "select_own_debt_payments" on public.debt_payments for select
  using (exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()));
create policy "insert_own_debt_payments" on public.debt_payments for insert
  with check (exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()));
create policy "delete_own_debt_payments" on public.debt_payments for delete
  using (exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()));

create index idx_debt_payments_debt on public.debt_payments (debt_id);
