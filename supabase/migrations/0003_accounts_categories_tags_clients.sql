-- Fase 5: cuentas, categorías, etiquetas y clientes.
-- Reutiliza public.set_updated_at() creada en 0001_create_profiles.sql.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'digital_wallet', 'credit_card', 'other')),
  institution text,
  currency char(3) not null default 'COP',
  initial_balance numeric(14, 2) not null default 0,
  account_number_encrypted bytea,
  color text not null default '#3b82f6',
  icon text not null default 'wallet',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
create policy "select_own_accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "insert_own_accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "update_own_accounts" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_accounts" on public.accounts for delete using (auth.uid() = user_id);

create index idx_accounts_user on public.accounts (user_id) where is_archived = false;

create trigger set_accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  parent_id uuid references public.categories (id) on delete set null,
  color text not null default '#8b5cf6',
  icon text not null default 'tag',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "select_own_categories" on public.categories for select using (auth.uid() = user_id);
create policy "insert_own_categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "update_own_categories" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_categories" on public.categories for delete using (auth.uid() = user_id and is_system = false);

create index idx_categories_user on public.categories (user_id);
create index idx_categories_parent on public.categories (parent_id) where parent_id is not null;

-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.tags enable row level security;
create policy "select_own_tags" on public.tags for select using (auth.uid() = user_id);
create policy "insert_own_tags" on public.tags for insert with check (auth.uid() = user_id);
create policy "update_own_tags" on public.tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_tags" on public.tags for delete using (auth.uid() = user_id);

create index idx_tags_user on public.tags (user_id);

-- ---------------------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null default '#14b8a6',
  icon text not null default 'briefcase',
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "select_own_clients" on public.clients for select using (auth.uid() = user_id);
create policy "insert_own_clients" on public.clients for insert with check (auth.uid() = user_id);
create policy "update_own_clients" on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_clients" on public.clients for delete using (auth.uid() = user_id);

create index idx_clients_user on public.clients (user_id, status);

create trigger set_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
