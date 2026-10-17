/**
 * Banco de pruebas de base de datos: Postgres real embebido (PGlite, WASM)
 * con los stubs mínimos de Supabase que necesitan las migraciones:
 *   - roles `anon` / `authenticated` (RLS se evalúa contra ellos)
 *   - `auth.users` + `auth.uid()` leyendo `request.jwt.claim.sub`, igual que Supabase
 *   - `storage.buckets` / `storage.objects` / `storage.foldername()`
 *
 * Aplica TODAS las migraciones de supabase/migrations en orden, exactamente
 * como están en el repo. No se conecta a ningún Supabase remoto.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select string_to_array(name, '/')
  $$;

  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export function listMigrations(upTo?: string): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{4}_.*\.sql$/.test(file))
    .sort()
    .filter((file) => !upTo || file <= upTo);
}

export async function createTestDb(options: { upTo?: string } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec(SUPABASE_STUBS);
  for (const file of listMigrations(options.upTo)) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`);
    }
  }
  return db;
}

export async function applyMigrationsAfter(db: PGlite, after: string): Promise<void> {
  for (const file of listMigrations().filter((f) => f > after)) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`);
    }
  }
}

/** Crea un usuario en auth.users (dispara handle_new_user → profile + categorías). */
export async function createUser(db: PGlite, id: string, fullName = 'Test'): Promise<void> {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${id}@test.local`,
    JSON.stringify({ full_name: fullName }),
  ]);
}

/**
 * Ejecuta `fn` como el rol `authenticated` con `auth.uid() = userId`, igual
 * que una request de PostgREST con el JWT de ese usuario. Con userId = null
 * se comporta como `anon`.
 */
export async function asUser<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false)`);
  await db.exec(userId ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
