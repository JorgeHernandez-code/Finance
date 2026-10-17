// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BOB = '00000000-0000-4000-8000-00000000000b';

describe('migraciones existentes (0001–0012)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ upTo: '0012_default_categories_on_signup.sql' });
    await createUser(db, ALICE);
    await createUser(db, BOB);
  }, 60_000);

  it('se aplican en orden sin errores y el alta crea profile + categorías', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.categories where user_id = $1`,
      [ALICE]
    );
    expect(rows[0]!.n).toBe(9);
  });

  it('RLS: un usuario no ve las cuentas de otro', async () => {
    await asUser(db, ALICE, () =>
      db.query(`insert into public.accounts (user_id, name, type) values ($1, 'Privada', 'bank')`, [ALICE])
    );
    const seenByBob = await asUser(db, BOB, () => db.query(`select * from public.accounts`));
    expect(seenByBob.rows).toHaveLength(0);
    const seenByAnon = await asUser(db, null, () => db.query(`select * from public.accounts`));
    expect(seenByAnon.rows).toHaveLength(0);
  });

  it('RLS: un usuario no puede insertar filas a nombre de otro', async () => {
    await expect(
      asUser(db, BOB, () =>
        db.query(`insert into public.accounts (user_id, name, type) values ($1, 'Robo', 'bank')`, [ALICE])
      )
    ).rejects.toThrow(/row-level security/);
  });
});
