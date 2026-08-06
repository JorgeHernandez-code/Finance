# application

Casos de uso: orquestan entidades de `domain` a través de las interfaces de `repositories`, sin saber que Supabase existe.

- `use-cases/<modulo>/` — un archivo por acción de negocio: `CreateTransaction.ts`, `DuplicateTransaction.ts`, `RegisterDebtPayment.ts`, `CalculateNetWorth.ts`. Cada caso de uso recibe sus dependencias por inyección (constructor), lo que los hace triviales de testear con mocks del repositorio.
- `dto/` — esquemas Zod de entrada/salida, compartidos entre formularios (cliente) y Server Actions (servidor) para que la validación nunca se duplique ni se desincronice.

Regla: si un archivo aquí importa `supabase-js` directamente, está en la capa equivocada — debe recibir un repositorio inyectado que implemente la interfaz de `domain/repositories`.
