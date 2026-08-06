# domain

Núcleo de negocio puro. **No importa nada de `application`, `infrastructure` ni `presentation`, ni de Next.js, ni de Supabase.** Solo TypeScript y reglas del dominio financiero.

- `entities/` — objetos con identidad y comportamiento: `Transaction`, `Account`, `Category`, `Budget`, `Debt`, `SavingsGoal`, `Investment`, `Client`, `Subscription`.
- `value-objects/` — objetos inmutables sin identidad: `Money` (monto + moneda, con aritmética segura sin errores de punto flotante), `DateRange`, `Percentage`.
- `repositories/` — **interfaces** (`ITransactionRepository`, `IAccountRepository`...) que definen qué operaciones existen, sin decir cómo se implementan. `infrastructure` las implementa.

Si un archivo aquí necesita `import` de `@supabase/supabase-js` o de React, está en la capa equivocada.
