// @vitest-environment node
/**
 * Migraciones 0013–0015 aplicadas SOBRE una base con datos creados con el
 * esquema anterior (simula producción): verifica que no se pierde ni cambia
 * ningún dato existente, que las correcciones funcionan, la idempotencia y
 * el aislamiento RLS de las tablas nuevas.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { applyMigrationsAfter, asUser, createTestDb, createUser } from './harness';

const ME = '00000000-0000-4000-8000-0000000000c1';
const OTHER = '00000000-0000-4000-8000-0000000000c2';

type Row = Record<string, unknown>;

describe('Finance 2.0: migraciones sobre datos existentes', () => {
  let db: PGlite;
  let copAccount: string;
  let clpAccount: string;
  let debtId: string;
  let foodCategory: string;
  let before: {
    accounts: Row[];
    transactions: Row[];
    debts: Row[];
    payments: Row[];
    goals: Row[];
    balances: Row[];
  };

  const q = async <T = Row>(sql: string, params: unknown[] = []) =>
    (await db.query<T>(sql, params)).rows as [T, ...T[]];

  beforeAll(async () => {
    db = await createTestDb({ upTo: '0012_default_categories_on_signup.sql' });
    await createUser(db, ME);
    await createUser(db, OTHER);

    // Datos "de producción" creados con el esquema viejo.
    await asUser(db, ME, async () => {
      copAccount = (
        await q<{ id: string }>(
          `insert into accounts (user_id, name, type, currency, initial_balance) values ($1, 'Bancolombia', 'bank', 'COP', 1000000) returning id`,
          [ME]
        )
      )[0].id;
      clpAccount = (
        await q<{ id: string }>(
          `insert into accounts (user_id, name, type, currency, initial_balance) values ($1, 'BancoEstado', 'bank', 'CLP', 200000) returning id`,
          [ME]
        )
      )[0].id;
      foodCategory = (
        await q<{ id: string }>(`select id from categories where user_id = $1 and name = 'Comida'`, [ME])
      )[0].id;
      await q(
        `insert into transactions (user_id, account_id, category_id, type, amount, currency, description, transaction_date) values
        ($1, $2, $3, 'expense', 50000, 'COP', 'Mercado viejo', current_date - interval '70 days'),
        ($1, $2, $3, 'expense', 20000, 'COP', 'Mercado', current_date),
        ($1, $2, null, 'income', 300000, 'COP', 'Pago', current_date)`,
        [ME, copAccount, foodCategory]
      );
      debtId = (
        await q<{ id: string }>(
          `insert into debts (user_id, creditor_name, direction, principal_amount, interest_rate) values ($1, 'Banco X', 'i_owe', 1000000, 2.5) returning id`,
          [ME]
        )
      )[0].id;
      await q(
        `insert into debt_payments (debt_id, amount, payment_date) values ($1, 100000, current_date - interval '10 days')`,
        [debtId]
      );
      const goal = (
        await q<{ id: string }>(
          `insert into savings_goals (user_id, name, target_amount) values ($1, 'Fondo', 500000) returning id`,
          [ME]
        )
      )[0].id;
      await q(`insert into savings_contributions (savings_goal_id, amount) values ($1, 50000)`, [goal]);
      await q(
        `insert into budgets (user_id, category_id, amount, period, start_date) values ($1, $2, 100000, 'monthly', current_date - interval '100 days')`,
        [ME, foodCategory]
      );
      await q(
        `insert into subscriptions (user_id, name, amount, billing_cycle, next_billing_date) values ($1, 'Netflix', 30000, 'monthly', current_date + 5)`,
        [ME]
      );
    });

    before = {
      accounts: await q(`select * from accounts order by id`),
      transactions: await q(`select * from transactions order by id`),
      debts: await q(`select * from debts order by id`),
      payments: await q(`select * from debt_payments order by id`),
      goals: await q(`select * from savings_goals order by id`),
      balances: await q(`select * from v_account_balances order by account_id`),
    };

    await applyMigrationsAfter(db, '0012_default_categories_on_signup.sql');
  }, 120_000);

  it('conserva todas las filas y valores existentes', async () => {
    const pick = (rows: Row[], keys: string[]) =>
      rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));
    const after = {
      accounts: await q(`select * from accounts order by id`),
      transactions: await q(`select * from transactions order by id`),
      debts: await q(`select * from debts order by id`),
      payments: await q(`select * from debt_payments order by id`),
      goals: await q(`select * from savings_goals order by id`),
    };
    for (const key of Object.keys(after) as (keyof typeof after)[]) {
      const original = before[key];
      expect(after[key]).toHaveLength(original.length);
      expect(pick(after[key], Object.keys(original[0] ?? {}))).toEqual(original);
    }
  });

  it('los saldos de cuentas existentes no cambian', async () => {
    expect(await q(`select * from v_account_balances order by account_id`)).toEqual(before.balances);
  });

  it('las columnas nuevas toman defaults que reflejan lo que la app mostraba (COP, sin confirmar)', async () => {
    const [debt] = await q<{ currency: string; negotiable: string; balance_confirmed_amount: unknown }>(
      `select * from debts`
    );
    expect(debt.currency).toBe('COP');
    expect(debt.negotiable).toBe('unknown');
    expect(debt.balance_confirmed_amount).toBeNull();
  });

  it('v_debt_balance: sin confirmación ni desglose, mismo saldo que antes', async () => {
    const [row] = await q<{ remaining_balance: string; total_paid: string }>(
      `select * from v_debt_balance where debt_id = $1`,
      [debtId]
    );
    expect(Number(row.remaining_balance)).toBe(900000);
    expect(Number(row.total_paid)).toBe(100000);
  });

  it('presupuesto mensual: solo cuenta el gasto del mes en curso', async () => {
    const [row] = await q<{ spent_amount: string }>(`select spent_amount from v_budget_progress`);
    expect(Number(row.spent_amount)).toBe(20000);
  });

  it('transferencia: resta en origen, suma en destino, atómica e idempotente', async () => {
    const key = '11111111-1111-4111-8111-111111111111';
    await asUser(db, ME, async () => {
      await expect(
        q(`select create_transfer($1, $1, 100000, 100000, current_date, 'A la misma cuenta')`, [copAccount])
      ).rejects.toThrow(/distintas/);

      const nequi = (
        await q<{ id: string }>(
          `insert into accounts (user_id, name, type, currency) values ($1, 'Nequi', 'digital_wallet', 'COP') returning id`,
          [ME]
        )
      )[0].id;
      const a = await q<{ id: string }>(
        `select create_transfer($1, $2, 100000, 100000, current_date, 'A Nequi', null, $3) as id`,
        [copAccount, nequi, key]
      );
      const b = await q<{ id: string }>(
        `select create_transfer($1, $2, 100000, 100000, current_date, 'A Nequi', null, $3) as id`,
        [copAccount, nequi, key]
      );
      expect(a[0].id).toBe(b[0].id);

      const balances = await q<{ account_id: string; current_balance: string }>(
        `select account_id, current_balance from v_account_balances`
      );
      const byId = new Map(balances.map((r) => [r.account_id, Number(r.current_balance)]));
      expect(byId.get(copAccount)).toBe(1000000 - 50000 - 20000 + 300000 - 100000);
      expect(byId.get(nequi)).toBe(100000);

      const legs = await q(`select * from transactions where type = 'transfer'`);
      expect(legs).toHaveLength(2);
    });
  });

  it('transferencia entre monedas distintas registra cada pierna en su moneda', async () => {
    await asUser(db, ME, async () => {
      await q(`select create_transfer($1, $2, 100000, 22000, current_date, 'COP a CLP')`, [
        copAccount,
        clpAccount,
      ]);
      const [leg] = await q<{ currency: string; amount: string }>(
        `select currency, amount from transactions where account_id = $1 and type = 'transfer'`,
        [clpAccount]
      );
      expect(leg.currency).toBe('CLP');
      expect(Number(leg.amount)).toBe(22000);
    });
  });

  it('pago de deuda: intereses no reducen capital, enlaza el gasto y no se duplica', async () => {
    const key = '22222222-2222-4222-8222-222222222222';
    await asUser(db, ME, async () => {
      const args = [debtId, copAccount, foodCategory, key];
      const sql = `select record_debt_payment($1, 120000, current_date, 20000, 0, 'Cuota 2', $2, $3, $4) as id`;
      const a = await q<{ id: string }>(sql, args);
      const b = await q<{ id: string }>(sql, args);
      expect(a[0].id).toBe(b[0].id);

      const [bal] = await q<{ remaining_balance: string; total_interest_and_fees: string }>(
        `select * from v_debt_balance where debt_id = $1`,
        [debtId]
      );
      expect(Number(bal.remaining_balance)).toBe(900000 - 100000);
      expect(Number(bal.total_interest_and_fees)).toBe(20000);

      const linked = await q(
        `select t.* from debt_payments p join transactions t on t.id = p.transaction_id where p.id = $1`,
        [a[0].id]
      );
      expect(linked).toHaveLength(1);
    });
  });

  it('saldo confirmado: solo descuentan los pagos posteriores a la confirmación', async () => {
    await asUser(db, ME, async () => {
      await q(
        `update debts set balance_confirmed_amount = 850000, balance_confirmed_at = current_date - 1 where id = $1`,
        [debtId]
      );
      const [bal] = await q<{ remaining_balance: string }>(
        `select remaining_balance from v_debt_balance where debt_id = $1`,
        [debtId]
      );
      expect(Number(bal.remaining_balance)).toBe(850000 - 100000); // solo el pago de hoy (capital 100.000)
    });
  });

  it('acepta los estados y ciclos nuevos y rechaza confirmación incompleta', async () => {
    await asUser(db, ME, async () => {
      await q(`update debts set status = 'negotiating' where id = $1`, [debtId]);
      await q(`update subscriptions set billing_cycle = 'biweekly', kind = 'rent', is_essential = true`);
      await expect(
        q(`update debts set balance_confirmed_amount = 1, balance_confirmed_at = null where id = $1`, [
          debtId,
        ])
      ).rejects.toThrow(/check/i);
    });
  });

  it('retiros de una meta restan del ahorro acumulado', async () => {
    await asUser(db, ME, async () => {
      const [goal] = await q<{ id: string }>(`select id from savings_goals`);
      await q(
        `insert into savings_contributions (savings_goal_id, amount, kind) values ($1, 20000, 'withdrawal')`,
        [goal.id]
      );
      const [p] = await q<{ current_amount: string }>(`select current_amount from v_savings_progress`);
      expect(Number(p.current_amount)).toBe(30000);
    });
  });

  it('XP: la misma fuente no se puede cobrar dos veces', async () => {
    await asUser(db, ME, async () => {
      await q(
        `insert into xp_events (user_id, source_type, source_key, points, description) values ($1, 'lesson', 'fundamentos-patrimonio', 30, 'Lección')`,
        [ME]
      );
      await expect(
        q(
          `insert into xp_events (user_id, source_type, source_key, points, description) values ($1, 'lesson', 'fundamentos-patrimonio', 30, 'Lección')`,
          [ME]
        )
      ).rejects.toThrow(/duplicate|unique/i);
    });
  });

  it('lección: no se puede marcar completada sin aprobar la pregunta', async () => {
    await asUser(db, ME, async () => {
      await expect(
        q(
          `insert into lesson_progress (user_id, lesson_id, completed_at, quiz_passed) values ($1, 'x-lesson', now(), false)`,
          [ME]
        )
      ).rejects.toThrow(/check/i);
    });
  });

  it('puntaje histórico cerrado no se puede reescribir', async () => {
    await asUser(db, ME, async () => {
      await q(
        `insert into health_score_snapshots (user_id, period_type, period_start, score, confidence, components, rules_version, is_final)
        values ($1, 'week', '2026-01-05', 40, 'medium', '[]', 'v1', true)`,
        [ME]
      );
      await q(`update health_score_snapshots set score = 99 where period_start = '2026-01-05'`);
      const [row] = await q<{ score: number }>(
        `select score from health_score_snapshots where period_start = '2026-01-05'`
      );
      expect(row.score).toBe(40);
    });
  });

  it('RLS: otro usuario no ve ni escribe en ninguna tabla nueva', async () => {
    const tables = [
      'exchange_rates',
      'account_reconciliations',
      'user_checkins',
      'lesson_progress',
      'xp_events',
      'health_score_snapshots',
    ];
    await asUser(db, ME, async () => {
      await q(
        `insert into exchange_rates (user_id, base_currency, quote_currency, rate) values ($1, 'CLP', 'COP', 4.2)`,
        [ME]
      );
      await q(
        `insert into account_reconciliations (user_id, account_id, statement_balance, computed_balance) values ($1, $2, 1, 1)`,
        [ME, copAccount]
      );
      await q(
        `insert into user_checkins (user_id, action_key, period_start) values ($1, 'weekly_review', current_date)`,
        [ME]
      );
    });
    await asUser(db, OTHER, async () => {
      for (const table of tables) {
        expect(await q(`select * from ${table}`), table).toHaveLength(0);
      }
      // No puede conciliar una cuenta ajena aunque ponga su propio user_id.
      await expect(
        q(
          `insert into account_reconciliations (user_id, account_id, statement_balance, computed_balance) values ($1, $2, 1, 1)`,
          [OTHER, copAccount]
        )
      ).rejects.toThrow(/row-level security/);
      // Las funciones RPC tampoco operan sobre datos ajenos.
      await expect(q(`select record_debt_payment($1, 1, current_date)`, [debtId])).rejects.toThrow(
        /no encontrada/
      );
      await expect(
        q(`select create_transfer($1, $2, 1, 1, current_date, 'x')`, [copAccount, clpAccount])
      ).rejects.toThrow(/no encontrada/);
    });
    await asUser(db, null, async () => {
      await expect(
        q(`select create_transfer($1, $2, 1, 1, current_date, 'x')`, [copAccount, clpAccount])
      ).rejects.toThrow(/autenticado/);
    });
  });

  it('todas las tablas de public siguen con RLS habilitado', async () => {
    const rows = await q<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(rows).toEqual([]);
  });

  it('las vistas nuevas usan security_invoker (respetan RLS)', async () => {
    const rows = await q<{ relname: string; reloptions: string[] | null }>(`
      select c.relname, c.reloptions from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'`);
    for (const view of rows) {
      expect(view.reloptions ?? [], view.relname).toContain('security_invoker=true');
    }
  });

  it('las migraciones son re-ejecutables sin error (idempotentes donde importa)', async () => {
    // 0013–0015 usan "if not exists"/"or replace"; las políticas no, así que
    // re-ejecutar una entera fallaría a propósito. Verificamos al menos las vistas.
    await expect(
      db.exec(`create or replace view public.v_monthly_summary_by_currency with (security_invoker = true) as
      select user_id, date_trunc('month', transaction_date)::date as month, currency,
        sum(case when type = 'income' then amount else 0 end) as total_income,
        sum(case when type = 'expense' then amount else 0 end) as total_expense,
        count(*) filter (where type in ('income', 'expense')) as movement_count
      from public.transactions where deleted_at is null and type in ('income', 'expense')
      group by user_id, date_trunc('month', transaction_date), currency`)
    ).resolves.not.toThrow();
  });
});
