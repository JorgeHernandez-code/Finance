# __tests__

- Unit/integration: Vitest + Testing Library, colocados espejando la estructura de `src/` (ej. `__tests__/application/use-cases/transactions/CreateTransaction.test.ts`).
- E2E: Playwright, flujos completos (login → crear transacción → ver reflejada en dashboard).

Los casos de uso en `application/` son el objetivo principal de cobertura: al no depender de Supabase directamente (reciben repositorios inyectados), se testean con mocks, sin necesidad de una base de datos real.

## Finance 2.0

- `__tests__/domain/`: cálculos puros de `src/domain/finance` y `src/domain/academy` (saldos, monedas, deudas, patrimonio, presupuestos, ahorro, índice de salud, XP, retos, plan). Fecha fija (`fixtures.ts → TODAY`) para que sean deterministas.
- `__tests__/db/`: migraciones y RLS sobre un **Postgres real embebido** (PGlite, sin Docker ni red). `harness.ts` crea los stubs mínimos de Supabase (`auth.uid()`, roles `anon`/`authenticated`, `storage`) y aplica `supabase/migrations/*.sql` tal cual.
  - `audit-probe.test.ts` documenta los defectos del esquema 0001–0012.
  - `finance2-migrations.test.ts` aplica 0013–0015 sobre datos creados con el esquema anterior y verifica que no se pierde nada, la idempotencia y el aislamiento entre usuarios.

Toda migración nueva se prueba aquí antes de ejecutarla en producción: `npm test`.
