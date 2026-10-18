# 05 · Finance 2.0: auditoría, cambios y despliegue

Fecha de la auditoría: 2026-10-17. Rama: `main` (sincronizada con `origin/main` en `baacd9a`).

> **Alcance de lo verificado.** El esquema se auditó con las migraciones del repo y con un Postgres real embebido (PGlite) en las pruebas. **No hubo acceso al Supabase remoto ni a Netlify** (no hay CLI ni credenciales de administración en este entorno), así que no se pudo comparar con el estado real de producción. Si alguna vez se cambió algo directamente en el panel de Supabase, puede no estar reflejado aquí.

---

## 1. Diagnóstico inicial

### Arquitectura (verificada en código)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15.5.23 (App Router, Server Components y Server Actions), React 19.0.8, TypeScript 5.7 estricto (`noUncheckedIndexedAccess`) |
| UI | Tailwind 3.4, componentes estilo shadcn/ui (Radix), Recharts, framer-motion, sonner |
| Datos | Supabase (Postgres + Auth) vía `@supabase/ssr` 0.5 y `supabase-js` 2.47, sesión en cookies, **solo anon key** |
| Estado cliente | TanStack Query 5, Zustand |
| Arquitectura | Capas limpias: `domain` → `application` (casos de uso + Zod) → `infrastructure` (repositorios Supabase) → `presentation` |
| Despliegue | Netlify con `@netlify/plugin-nextjs`, cabeceras de seguridad (CSP, HSTS, etc.) en `netlify.toml` |
| Móvil | Capacitor 6 (Android) |
| Calidad | ESLint 9, Prettier, Husky + lint-staged, CI de GitHub Actions (lint, typecheck, tests, build) |

### Lo que ya funcionaba bien
- **RLS en todas las tablas** con políticas `auth.uid() = user_id` (o por la tabla padre). Las vistas usan `security_invoker = true`. Verificado con pruebas.
- La clave `service_role` **no se usa en ningún archivo** de la app. Variables privadas aisladas con `server-only`.
- Rate limiting en login, registro y recuperación; cookies de sesión sin persistencia; cierre por inactividad.
- Validación de entradas con Zod en todos los casos de uso.

### Problemas encontrados (confirmados con SQL real en `__tests__/db/audit-probe.test.ts`)

| # | Problema | Impacto |
|---|---|---|
| 1 | `v_net_worth` **sumaba saldos de monedas distintas** (1.000.000 COP + 500.000 CLP = "1.500.000") | Patrimonio y "Dinero disponible" incorrectos con cuentas en Chile |
| 2 | `v_net_worth` **sumaba el ahorro dos veces**: los aportes a metas no salen de las cuentas, pero se sumaban encima del saldo | Patrimonio inflado |
| 3 | `v_budget_progress` sumaba **todo el gasto desde `start_date`**, no el del mes | Presupuestos mensuales aparecían sobregirados tras el primer mes |
| 4 | `v_monthly_summary` y los KPIs mezclaban monedas | Ingresos/gastos del mes incorrectos con varias monedas |
| 5 | Nada impedía **registrar dos veces el mismo pago** (doble clic) | Pagos duplicados |
| 6 | Las **transferencias no existían** (el roadmap las marcaba como hechas, pero el código las excluía a propósito) | No se podía mover dinero entre cuentas sin distorsionar ingresos/gastos |
| 7 | Deudas sin moneda, país, cuota, prioridad ni distinción saldo confirmado/estimado; un pago se descontaba completo aunque incluyera intereses | No se podía saber cuánto se debe en Colombia vs. Chile ni con qué certeza |
| 8 | El estado "vencida" era manual y no existía "sin fecha" ni "en negociación" | — |
| 9 | Fechas por defecto con `toISOString()` (UTC): después de las 19 h en Colombia el formulario proponía **el día siguiente** | Movimientos con fecha equivocada |
| 10 | Suscripciones: el total mensual sumaba monedas distintas como COP; sin frecuencia quincenal/trimestral; sin marca de esencial | — |
| 11 | Solo 4 pruebas (de `cn()`), ninguna de cálculos, migraciones ni RLS | Riesgo de regresiones |

### Riesgos de seguridad
- **Registro público abierto**: cualquiera puede crear una cuenta. RLS aísla sus datos de los tuyos (verificado), pero para una app personal conviene **desactivar el registro** en Supabase → Authentication → Sign In / Providers → *Allow new users to sign up*. Debe hacerse en Supabase, no solo en la UI, porque la API de registro es pública con la anon key.
- `audit_log` permite que el cliente inserte filas propias (solo afecta a su propio log). Bajo riesgo.
- Las FK no validan propiedad: un usuario podría referenciar el `account_id` de otro en una transacción propia (no expone datos ajenos gracias a RLS). Las funciones nuevas (`create_transfer`, `record_debt_payment`) y la tabla de conciliaciones **sí** validan propiedad.
- No hay MFA activado (Supabase lo soporta).
- `.env.local` contiene una `SUPABASE_SERVICE_ROLE_KEY` y otras claves; está en `.gitignore` y no está versionado. No se imprimió su contenido.

---

## 2. Qué se implementó

### Base de datos — migraciones nuevas (aditivas)
| Archivo | Contenido |
|---|---|
| `0013_accounts_transfers_fx.sql` | País en cuentas; transferencias de doble entrada (`transfer_direction`, RPC atómica `create_transfer`); idempotencia en transacciones; tabla `exchange_rates` (tasas manuales); tabla `account_reconciliations`; `v_account_balances` con transferencias; vistas por moneda `v_monthly_summary_by_currency` y `v_category_breakdown_by_currency` |
| `0014_debts_savings_budgets_recurring.sql` | Deudas: moneda, país, tipo, cuota, n.º de cuotas, próximo pago, prioridad, negociabilidad, saldo confirmado + fecha, periodo del interés, estados `negotiating`/`agreement`. Pagos: intereses, cargos, movimiento enlazado, idempotencia; RPC `record_debt_payment`. `v_debt_balance` corregida. Metas: moneda, cuenta, prioridad, aporte propuesto, fondo de emergencia, estados `paused`/`cancelled`, retiros. `v_budget_progress` corregida (periodo en curso, por moneda). Recurrentes: tipo, esencial, deuda enlazada, revisión; frecuencias quincenal/trimestral; `transactions.subscription_id`. Moneda en inversiones |
| `0015_progress_learning.sql` | `user_checkins`, `lesson_progress`, `xp_events` (único por fuente), `health_score_snapshots` (periodos cerrados no editables por RLS), `profiles.risk_tolerance` |

Garantías verificadas en `__tests__/db/finance2-migrations.test.ts` (aplicando 0013–0015 **sobre datos creados con el esquema anterior**):
- No se pierde ni cambia ninguna fila ni valor existente; los saldos de cuentas no cambian.
- Las columnas nuevas toman defaults que reproducen lo que la app ya mostraba (COP, saldo "sin confirmar").
- Ninguna migración borra tablas, columnas ni datos. Las restricciones CHECK solo se **amplían**.
- Las vistas conservan columnas, orden y tipos (lo nuevo va al final): **la versión desplegada sigue funcionando** con el esquema nuevo.
- RLS activo en todas las tablas; usuarios ajenos y `anon` no ven ni escriben nada; las RPC no operan sobre datos ajenos.

### Motor de cálculo (`src/domain/finance`, funciones puras y deterministas)
- `money.ts`: aritmética en centavos (sin errores de coma flotante); importes siempre agrupados por moneda.
- `fx.ts`: consolidación en COP **solo con tasas registradas**, con fecha y aviso de tasa vieja; si falta una tasa, esa moneda se excluye y se avisa.
- `availability.ts`: dinero por cuenta y moneda; confirmado (conciliado ≤ 35 días) vs. pendiente; reservado para metas; libre estimado.
- `debts.ts`: saldo confirmado/estimado, línea de tiempo (vencida solo con fecha acordada; "sin fecha" nunca es vencida), datos faltantes, resumen por país y moneda, simulador avalancha / bola de nieve (sin suponer si el interés es mensual o anual).
- `netWorth.ts`: activos − pasivos por moneda, sin doble conteo, con integridad (% confirmado) y advertencias.
- `cashflow.ts`: resumen del mes (fijos, variables, suscripciones, pagos de deuda, ahorro real), compromisos sin duplicar cuotas enlazadas, capacidad mensual (desconocida con < 2 meses de historial), proyección de presupuesto (no se proyecta sin historial ni antes del día 10).
- `savings.ts`: métricas por meta y escenarios conservador / base / optimista (supuestos etiquetados como supuestos; sin capacidad no propone aportes; fechas alternativas si no llega).
- `healthScore.ts`: Índice de Salud Financiera v1 (5 × 20 puntos, cada ítem explicado, "no aplica" solo por hechos verificables, "en construcción" con pocos datos, confianza).
- `progress.ts`: niveles, XP, rachas semanales (romper una racha no borra nada), retos adaptados (no se pide ahorrar en déficit ni se premia endeudarse), logros.
- `plan.ts`: Mi Plan Financiero en 6 etapas con evidencia; advertencia clara de déficit.
- `actions.ts`: próximas acciones y recordatorios internos (sin datos → sin recomendaciones).

### Pantallas
- **Dashboard** reescrito: registro rápido (gasto, ingreso, entre cuentas, pago, deuda, meta), dinero disponible por moneda, índice, próximas acciones, recordatorios, mes en curso, deudas, objetivos, actividad, retos y gráficos (ahora en una sola moneda).
- **Nuevas:** Mi plan (`/plan`), Patrimonio (`/net-worth`), Academia (`/academy`, 15 lecciones en 5 niveles; la respuesta se valida en el servidor y no viaja al navegador) y Mi progreso (`/progress`, con desglose del índice e historial).
- **Ampliadas:** Deudas (formulario completo pero opcional, pago con intereses y cuenta, confirmación de saldo, historial, simulador), Ahorros (pausa y cancelación sin perder historial, retiros, escenarios), Recurrentes (tipo, esencial, deuda enlazada, revisión), Transacciones (movimiento entre cuentas), Cuentas (conciliación), Presupuestos (moneda, restante, proyección), Categorías (sugeridas bajo demanda), Configuración (tasas de cambio, tolerancia al riesgo), Calendario (próximo pago de deudas, nuevas frecuencias).

### Pruebas
`npm test` ejecuta **97 pruebas** (11 archivos): migraciones y RLS sobre Postgres real (PGlite), compatibilidad con datos existentes, idempotencia, precisión monetaria, conversión de monedas, saldos, patrimonio, deudas, presupuestos, ahorro, índice, XP, retos, plan, academia.

---

## 3. Despliegue: qué hacer y en qué orden

> Las migraciones son compatibles con la versión desplegada, pero **el código nuevo necesita las migraciones**. Orden obligatorio: **primero la base de datos, después el código**.

1. **Respaldo** (recomendado): en la app, Configuración → Respaldo → exportar. En Supabase (plan con backups) verifica que exista un backup reciente.
2. **Supabase → SQL Editor**: ejecuta, **en este orden y una sola vez**, el contenido de:
   1. `supabase/migrations/0013_accounts_transfers_fx.sql`
   2. `supabase/migrations/0014_debts_savings_budgets_recurring.sql`
   3. `supabase/migrations/0015_progress_learning.sql`

   Si usas la Supabase CLI enlazada: `supabase db push`.
   Si una migración falla a mitad (por ejemplo, porque el esquema remoto difiere del repo), **detente** y revisa el error antes de seguir: cada archivo usa `if not exists` / `or replace` en tablas, columnas y vistas, pero las políticas RLS no son re-ejecutables.
3. **Verificación rápida** en el SQL Editor:
   ```sql
   select count(*) from public.exchange_rates;            -- 0, sin error
   select remaining_balance, currency from public.v_debt_balance limit 5;
   select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;  -- debe devolver 0 filas
   ```
4. **Desplegar el código**: push a `main` (Netlify construye con `npm run build`). No hacen falta variables de entorno nuevas.
5. **Recomendado:** desactiva el registro público en Supabase (ver Riesgos) y activa MFA cuando quieras.
6. **Revisión de datos tras desplegar** (la app lo señala como "por confirmar"):
   - Deudas y metas existentes quedaron en **COP**. Si alguna era en CLP, edítala.
   - Indica el **país** y si el **interés es mensual o anual** en cada deuda.
   - Registra una **tasa CLP→COP** en Configuración para ver totales consolidados.
   - **Concilia** cada cuenta y **confirma** el saldo de cada deuda.

**No ejecutes `supabase/seed.sql` en producción**: carga datos de ejemplo.

---

## 4. Pendientes y decisiones abiertas

- **Notificaciones externas** (correo o push): hoy los recordatorios son internos. Haría falta una tarea programada (Supabase `pg_cron` o Netlify Scheduled Functions), un proveedor de correo (p. ej. Resend) o push web (VAPID / FCM en Android), y tu autorización explícita.
- **Respaldo cifrado**: exporta e importa los campos anteriores a 0013; los campos nuevos (país, cuota, saldo confirmado, etc.) aún no se incluyen. Al importar un respaldo, toman sus valores por defecto.
- **Edición de transferencias**: se eliminan (ambas patas) y se registran de nuevo; no se editan.
- **País en cuentas**: la columna existe y se deduce de la moneda; falta exponerla en el formulario de cuentas.
- **Contenido de la Academia**: 15 lecciones sin normas ni impuestos. Si se agregan temas tributarios, deben citar la fuente oficial y la fecha (`sources` en la lección).
- **Pruebas E2E** autenticadas (Playwright) contra un Supabase de pruebas: no hay entorno de staging.
- La vista `v_net_worth` y `v_monthly_summary` siguen existiendo por compatibilidad, marcadas como obsoletas; se pueden eliminar en una migración futura, cuando ya no haya versiones viejas desplegadas.

---

## 5. Migración 0016: datos desconocidos e importaciones

`0016_import_support_unknowns.sql` permite registrar lo que el usuario **no sabe** sin inventarlo:

| Antes (obligatorio) | Ahora |
|---|---|
| Saldo de una deuda | Puede quedar vacío ("saldo por confirmar") cuando solo se conoce la cuota. No se suma a los totales y se cuenta aparte. |
| Monto de una meta | Puede quedar vacío ("pendiente de cotización"). |
| Fecha y frecuencia de un recurrente | Pueden quedar vacías. Nueva frecuencia bimestral. Marca de "frecuencia por confirmar". |
| — | Marcas de importe aproximado (deudas y recurrentes), titular legal y responsabilidad (propia / compartida / de un tercero), número de la próxima cuota, tipo "préstamo estatal" y notas en cuentas, metas y recurrentes. |
| — | `import_ref` único por usuario en cuentas, deudas, recurrentes, metas y clientes: permite importaciones idempotentes. |

Es aditiva (solo quita `NOT NULL`, amplía `CHECK` y agrega columnas). **Orden:** aplicar 0016 → desplegar el código → recién entonces cargar datos que usen valores vacíos (el código anterior no los sabe mostrar).

Las importaciones de datos personales **no se versionan**: viven en `/private/` (en `.gitignore`), porque el repositorio es público.
