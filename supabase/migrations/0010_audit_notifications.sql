-- Fase 5: auditoría y notificaciones (docs/03-SEGURIDAD.md §8).

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Solo lectura y creación de las propias filas. Sin policy de update/delete
-- a propósito: un audit log editable o borrable por el cliente no sirve de nada.
create policy "select_own_audit_log" on public.audit_log for select using (auth.uid() = user_id);
create policy "insert_own_audit_log" on public.audit_log for insert with check (auth.uid() = user_id);

create index idx_audit_log_user_date on public.audit_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger genérico: registra automáticamente cada insert/update/delete en
-- las tablas críticas (transactions, accounts, debts). SECURITY DEFINER para
-- que el insert en audit_log no dependa de que exista una policy de insert
-- para el trigger en sí — corre con privilegios del dueño de la función.

create or replace function public.log_table_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  affected_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (affected_row ->> 'id')::uuid,
    affected_row
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_transactions on public.transactions;
create trigger audit_transactions
  after insert or update or delete on public.transactions
  for each row execute function public.log_table_change();

drop trigger if exists audit_accounts on public.accounts;
create trigger audit_accounts
  after insert or update or delete on public.accounts
  for each row execute function public.log_table_change();

drop trigger if exists audit_debts on public.debts;
create trigger audit_debts
  after insert or update or delete on public.debts
  for each row execute function public.log_table_change();

-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('budget_alert', 'payment_due', 'subscription_renewal', 'goal_completed')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "select_own_notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "insert_own_notifications" on public.notifications for insert with check (auth.uid() = user_id);
create policy "update_own_notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_notifications" on public.notifications for delete using (auth.uid() = user_id);

create index idx_notifications_user_unread on public.notifications (user_id, created_at desc) where is_read = false;
