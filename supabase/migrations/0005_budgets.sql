create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  period text not null default 'monthly' check (period in ('monthly', 'yearly')),
  start_date date not null,
  end_date date,
  alert_threshold_percent smallint not null default 80 check (alert_threshold_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;
create policy "select_own_budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "insert_own_budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "update_own_budgets" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_budgets" on public.budgets for delete using (auth.uid() = user_id);

create index idx_budgets_user_period on public.budgets (user_id, period, start_date);

create trigger set_budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
