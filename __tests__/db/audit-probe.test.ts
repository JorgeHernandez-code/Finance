// @vitest-environment node
/**
 * Sondas de auditoría sobre el esquema 0001–0012: documentan con SQL real los
 * defectos encontrados en la auditoría (docs/05-AUDITORIA-FINANCE-2.md). Las
 * migraciones nuevas los corrigen; los tests de 0013+ verifican la corrección.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

const U = '00000000-0000-4000-8000-0000000000a1';

describe('auditoría del esquema heredado (0001–0012)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ upTo: '0012_default_categories_on_signup.sql' });
    await createUser(db, U);
  }, 60_000);

  it('todas las tablas de public tienen RLS habilitado', async () => {
    const { rows } = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('DEFECTO: v_net_worth suma saldos de monedas distintas y suma el ahorro dos veces', async () => {
    const rows = await asUser(db, U, async () => {
      await db.query(
        `insert into accounts (user_id, name, type, currency, initial_balance) values
        ($1, 'COP', 'bank', 'COP', 1000000), ($1, 'CLP', 'bank', 'CLP', 500000)`,
        [U]
      );
      const goal = await db.query<{ id: string }>(
        `insert into savings_goals (user_id, name, target_amount) values ($1, 'Fondo', 100000) returning id`,
        [U]
      );
      await db.query(`insert into savings_contributions (savings_goal_id, amount) values ($1, 100000)`, [
        goal.rows[0]!.id,
      ]);
      return (
        await db.query<{ available: string; saved: string; net_worth: string }>(`select * from v_net_worth`)
      ).rows;
    });
    // 1.000.000 COP + 500.000 CLP se presentan como 1.500.000 de "algo",
    // y el aporte (que vive dentro de esas mismas cuentas) se vuelve a sumar.
    expect(Number(rows[0]!.available)).toBe(1500000);
    expect(Number(rows[0]!.net_worth)).toBe(1600000);
  });

  it('DEFECTO: un presupuesto mensual acumula el gasto de todos los meses desde start_date', async () => {
    const spent = await asUser(db, U, async () => {
      const acc = await db.query<{ id: string }>(
        `select id from accounts where user_id = $1 and currency = 'COP'`,
        [U]
      );
      const cat = await db.query<{ id: string }>(
        `select id from categories where user_id = $1 and name = 'Comida'`,
        [U]
      );
      await db.query(
        `insert into budgets (user_id, category_id, amount, period, start_date)
        values ($1, $2, 100000, 'monthly', current_date - interval '90 days')`,
        [U, cat.rows[0]!.id]
      );
      await db.query(
        `insert into transactions (user_id, account_id, category_id, type, amount, description, transaction_date) values
        ($1, $2, $3, 'expense', 50000, 'hace 2 meses', current_date - interval '60 days'),
        ($1, $2, $3, 'expense', 20000, 'este mes', current_date)`,
        [U, acc.rows[0]!.id, cat.rows[0]!.id]
      );
      return (await db.query<{ spent_amount: string }>(`select spent_amount from v_budget_progress`)).rows[0]!
        .spent_amount;
    });
    expect(Number(spent)).toBe(70000); // debería ser 20000 (solo el mes en curso)
  });

  it('DEFECTO: nada impide registrar dos veces el mismo abono (doble envío del formulario)', async () => {
    const count = await asUser(db, U, async () => {
      const debt = await db.query<{ id: string }>(
        `insert into debts (user_id, creditor_name, direction, principal_amount) values ($1, 'Banco', 'i_owe', 1000) returning id`,
        [U]
      );
      await db.query(
        `insert into debt_payments (debt_id, amount, payment_date) values ($1, 100, current_date), ($1, 100, current_date)`,
        [debt.rows[0]!.id]
      );
      return (await db.query<{ n: number }>(`select count(*)::int n from debt_payments`)).rows[0]!.n;
    });
    expect(count).toBe(2);
  });
});
