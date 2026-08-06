create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null default 'COP',
  billing_cycle text not null check (billing_cycle in ('weekly', 'monthly', 'yearly')),
  next_billing_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  icon text not null default 'refresh',
  color text not null default '#f59e0b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "select_own_subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "insert_own_subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "update_own_subscriptions" on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_subscriptions" on public.subscriptions for delete using (auth.uid() = user_id);

create index idx_subscriptions_next_billing on public.subscriptions (user_id, next_billing_date) where status = 'active';

create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
