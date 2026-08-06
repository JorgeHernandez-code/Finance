create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  icon text not null default 'target',
  color text not null default '#22c55e',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
create policy "select_own_savings_goals" on public.savings_goals for select using (auth.uid() = user_id);
create policy "insert_own_savings_goals" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "update_own_savings_goals" on public.savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_savings_goals" on public.savings_goals for delete using (auth.uid() = user_id);

create index idx_savings_goals_user on public.savings_goals (user_id, status);

create trigger set_savings_goals_updated_at before update on public.savings_goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  savings_goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  contribution_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.savings_contributions enable row level security;

create policy "select_own_savings_contributions" on public.savings_contributions for select
  using (exists (select 1 from public.savings_goals g where g.id = savings_goal_id and g.user_id = auth.uid()));
create policy "insert_own_savings_contributions" on public.savings_contributions for insert
  with check (exists (select 1 from public.savings_goals g where g.id = savings_goal_id and g.user_id = auth.uid()));
create policy "delete_own_savings_contributions" on public.savings_contributions for delete
  using (exists (select 1 from public.savings_goals g where g.id = savings_goal_id and g.user_id = auth.uid()));

create index idx_savings_contributions_goal on public.savings_contributions (savings_goal_id);
