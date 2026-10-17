-- Finance 2.0 · Bloque 3: Índice de Salud Financiera, Academia, progreso.
--
-- Solo tablas nuevas (más una columna nullable en profiles). Los puntos de
-- experiencia viven en su propia tabla y NO tienen relación con cuentas ni
-- transacciones: no hay forma de convertirlos en saldo.

alter table public.profiles add column if not exists risk_tolerance text
  check (risk_tolerance is null or risk_tolerance in ('low', 'medium', 'high'));

-- ---------------------------------------------------------------------------
-- Check-ins: acciones del usuario que no se pueden deducir de los datos
-- (revisión semanal, cierre mensual, revisión de suscripciones, pasos del
-- plan marcados como hechos). Una fila por acción y periodo.

create table if not exists public.user_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_key text not null check (action_key ~ '^[a-z0-9_.:-]{2,80}$'),
  period_start date not null,
  notes text check (notes is null or length(notes) <= 1000),
  completed_at timestamptz not null default now(),
  unique (user_id, action_key, period_start)
);

alter table public.user_checkins enable row level security;
create policy "select_own_checkins" on public.user_checkins for select using (auth.uid() = user_id);
create policy "insert_own_checkins" on public.user_checkins for insert with check (auth.uid() = user_id);
create policy "delete_own_checkins" on public.user_checkins for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Academia: progreso por lección. El contenido vive en el código
-- (src/domain/academy); aquí solo el avance del usuario.

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{2,80}$'),
  attempts integer not null default 0 check (attempts >= 0),
  exercise_response text check (exercise_response is null or length(exercise_response) <= 2000),
  quiz_passed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  check (completed_at is null or quiz_passed)
);

alter table public.lesson_progress enable row level security;
create policy "select_own_lesson_progress" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "insert_own_lesson_progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "update_own_lesson_progress" on public.lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Libro de experiencia (XP). Un evento por (fuente, clave): la restricción
-- única impide cobrar dos veces el mismo reto, lección o logro. Sin update
-- ni delete desde el cliente.

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in ('lesson', 'challenge', 'achievement')),
  source_key text not null check (source_key ~ '^[a-z0-9_.:-]{2,120}$'),
  points integer not null check (points between 1 and 500),
  description text not null check (length(description) <= 200),
  earned_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);

alter table public.xp_events enable row level security;
create policy "select_own_xp_events" on public.xp_events for select using (auth.uid() = user_id);
create policy "insert_own_xp_events" on public.xp_events for insert with check (auth.uid() = user_id);

create index if not exists idx_xp_events_user on public.xp_events (user_id, earned_at desc);

-- ---------------------------------------------------------------------------
-- Historial del Índice de Salud Financiera. Cada periodo (semana o mes) se
-- guarda con la versión de las reglas que lo calculó. Mientras el periodo
-- está abierto se actualiza; cuando se cierra (is_final = true) ya no se
-- puede modificar: un cambio de reglas no reescribe el pasado en silencio.

create table if not exists public.health_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_type text not null check (period_type in ('week', 'month')),
  period_start date not null,
  score smallint check (score is null or score between 0 and 100),
  confidence text not null check (confidence in ('building', 'low', 'medium', 'high')),
  components jsonb not null,
  rules_version text not null,
  is_final boolean not null default false,
  computed_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

alter table public.health_score_snapshots enable row level security;
create policy "select_own_health_snapshots" on public.health_score_snapshots for select using (auth.uid() = user_id);
create policy "insert_own_health_snapshots" on public.health_score_snapshots for insert with check (auth.uid() = user_id);
create policy "update_open_health_snapshots" on public.health_score_snapshots for update
  using (auth.uid() = user_id and is_final = false)
  with check (auth.uid() = user_id);

create index if not exists idx_health_snapshots_user on public.health_score_snapshots (user_id, period_type, period_start desc);
