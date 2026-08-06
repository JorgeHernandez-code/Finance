-- Fase 5: tabla central de transacciones + etiquetas (N:M) + adjuntos.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null default 'COP',
  description text not null,
  notes text,
  transaction_date date not null default current_date,
  is_recurring boolean not null default false,
  recurring_rule jsonb,
  transfer_pair_id uuid references public.transactions (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "select_own_transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "insert_own_transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "update_own_transactions" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_transactions" on public.transactions for delete using (auth.uid() = user_id);

create index idx_transactions_user_date on public.transactions (user_id, transaction_date desc) where deleted_at is null;
create index idx_transactions_account on public.transactions (account_id);
create index idx_transactions_category on public.transactions (category_id);
create index idx_transactions_client on public.transactions (client_id) where client_id is not null;
create index idx_transactions_description_trgm on public.transactions using gin (description gin_trgm_ops);

create trigger set_transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);

alter table public.transaction_tags enable row level security;

create policy "select_own_transaction_tags" on public.transaction_tags for select
  using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));
create policy "insert_own_transaction_tags" on public.transaction_tags for insert
  with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));
create policy "delete_own_transaction_tags" on public.transaction_tags for delete
  using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));

-- ---------------------------------------------------------------------------

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0),
  created_at timestamptz not null default now()
);

alter table public.attachments enable row level security;
create policy "select_own_attachments" on public.attachments for select using (auth.uid() = user_id);
create policy "insert_own_attachments" on public.attachments for insert with check (auth.uid() = user_id);
create policy "delete_own_attachments" on public.attachments for delete using (auth.uid() = user_id);

create index idx_attachments_transaction on public.attachments (transaction_id);

-- Bucket privado de Storage para los archivos reales (esta tabla solo guarda metadatos).
-- Debe crearse una sola vez; `insert ... on conflict do nothing` lo hace idempotente.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "select_own_attachment_files" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "insert_own_attachment_files" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete_own_attachment_files" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
