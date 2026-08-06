# __tests__

- Unit/integration: Vitest + Testing Library, colocados espejando la estructura de `src/` (ej. `__tests__/application/use-cases/transactions/CreateTransaction.test.ts`).
- E2E: Playwright, flujos completos (login → crear transacción → ver reflejada en dashboard).

Los casos de uso en `application/` son el objetivo principal de cobertura: al no depender de Supabase directamente (reciben repositorios inyectados), se testean con mocks, sin necesidad de una base de datos real.
