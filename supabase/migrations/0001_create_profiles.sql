-- Fase 4: tabla profiles (1:1 con auth.users) + trigger de auto-creación.
-- El resto del esquema (accounts, transactions, etc.) llega en Fase 5,
-- pero profiles nace aquí porque el flujo de registro la necesita.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  default_currency char(3) not null default 'COP',
  locale text not null default 'es-CO',
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "update_own_profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No se permite insert/delete manual desde el cliente: la fila nace y muere
-- junto con auth.users vía el trigger de abajo y el ON DELETE CASCADE.

-- Trigger: cada vez que Supabase Auth crea un usuario (signup con email o
-- con Google OAuth), se crea automáticamente su fila en profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático en cada update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
