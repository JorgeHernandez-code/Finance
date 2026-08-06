# 01 · Arquitectura — Finance (Dashboard Financiero Personal)

> Rol: CTO / Arquitecto de Software. Este documento es la base de todo lo que se construye después. Cualquier cambio de stack o de capas debe actualizarse aquí primero.

## 1. Visión técnica

Se construye como si fuera el día 1 de un SaaS FinTech, aunque el único usuario inicial seas tú. Esto significa:

- **Multi-tenant desde el diseño de datos** (todo filtrado por `user_id` + Row Level Security), aunque hoy solo exista un tenant.
- **Separación estricta de capas** para poder cambiar Supabase por otro backend, o añadir un backend propio, sin reescribir la lógica de negocio.
- **Cero lógica de negocio en componentes React.** Los componentes solo orquestan hooks y muestran UI.
- **Todo tipado** con TypeScript en modo `strict`.

## 2. Stack final

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | Next.js 15 (App Router, Server Actions, RSC) | SSR/SSG híbrido, compatible con export estático para Capacitor, ecosistema maduro, despliegue nativo en Netlify |
| UI | React 19 + TypeScript strict | Concurrent features, tipado fuerte para datos financieros |
| Estilos | TailwindCSS + shadcn/ui (Radix) | Accesibilidad de fábrica (Radix), theming vía CSS vars, look Linear/Stripe sin reinventar componentes |
| Animación | Framer Motion | Transiciones de página, micro-interacciones, glassmorphism animado |
| Iconos | Lucide Icons | Consistente con shadcn/ui |
| Estado servidor | TanStack Query (React Query) | Cache, revalidación, estados de carga/error estandarizados para todas las llamadas a Supabase |
| Estado UI/cliente | Zustand | Estado ligero (sidebar, filtros, modales) sin boilerplate de Redux |
| Formularios | React Hook Form + Zod | Validación de esquema compartida cliente/servidor (misma fuente de verdad) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) | Todo-en-uno gratuito, RLS nativo a nivel de fila, Auth con JWT/refresh ya resuelto, Storage para adjuntos |
| Hosting web | Netlify (plan gratuito) | Despliegue continuo desde GitHub, Edge Functions, headers/CSP declarativos en `netlify.toml` |
| Repositorio | GitHub (privado) | Control de versiones, Actions para CI (lint/test/build) |
| Móvil | Capacitor 6 | Envuelve el build de Next.js (export estático) en un shell nativo Android; ruta directa a Google Play |
| Gráficos | Recharts (o Tremor) | Gráficos financieros interactivos, composables con Tailwind |
| Exportación | `exceljs` (Excel), `pdf-lib`/`@react-pdf/renderer` (PDF), CSV nativo | Reportes descargables |
| Testing | Vitest + Testing Library (unit/integration), Playwright (E2E) | Rápido, compatible con Next.js 15 |
| IA (Fase futura) | Vercel AI SDK + Supabase Edge Functions (proxy a Claude/OpenAI) | Se deja la interfaz de "asistente financiero" desacoplada desde el día 1 |

**Nota sobre Firebase:** se descarta. Supabase da PostgreSQL relacional (necesario para un modelo financiero con integridad referencial fuerte: cuentas, transacciones, deudas, presupuestos) + RLS declarativo en SQL, mientras que Firebase (Firestore) es NoSQL y obliga a duplicar/desnormalizar datos financieros, lo cual es más riesgoso para este dominio.

## 3. Clean Architecture aplicada a Next.js

Next.js tienta a mezclar todo en `app/`. Para evitarlo, separamos en 4 capas con **regla de dependencia estricta**: las capas internas (domain) no conocen a las externas (infrastructure, presentation).

```
                 ┌─────────────────────────┐
                 │      presentation        │  (React, hooks, componentes, stores)
                 │  ┌─────────────────────┐  │
                 │  │     application      │  │  (casos de uso, DTOs, orquestación)
                 │  │  ┌─────────────────┐  │  │
                 │  │  │     domain       │  │  │  (entidades, reglas de negocio puras)
                 │  │  └─────────────────┘  │  │
                 │  └─────────────────────┘  │
                 │      infrastructure       │  (Supabase, APIs externas, storage)
                 └─────────────────────────┘
```

La regla: `domain` no importa nada de las otras capas. `application` solo importa `domain` (usa interfaces de repositorio, no implementaciones). `infrastructure` implementa esas interfaces. `presentation` consume `application` a través de hooks.

### 3.1 Estructura de carpetas real

```
finance/
├── src/
│   ├── app/                        # Next.js App Router — SOLO routing y layouts
│   │   ├── (auth)/                 # login, registro, recuperar contraseña
│   │   ├── (dashboard)/            # rutas protegidas: dashboard, transacciones, etc.
│   │   ├── api/                    # route handlers (webhooks, exportaciones)
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── domain/                     # ❤️ CORE — sin dependencias externas
│   │   ├── entities/                # Transaction, Account, Budget, Debt, SavingsGoal...
│   │   ├── value-objects/           # Money, CurrencyCode, DateRange...
│   │   └── repositories/            # INTERFACES: ITransactionRepository, IAccountRepository...
│   │
│   ├── application/                 # Casos de uso (orquestan domain + repos)
│   │   ├── use-cases/
│   │   │   ├── transactions/        # CreateTransaction, DeleteTransaction, DuplicateTransaction...
│   │   │   ├── budgets/
│   │   │   ├── debts/
│   │   │   └── ...
│   │   └── dto/                     # esquemas Zod de entrada/salida
│   │
│   ├── infrastructure/              # Implementaciones concretas
│   │   ├── supabase/
│   │   │   ├── client.ts            # cliente browser
│   │   │   ├── server.ts            # cliente server (cookies httpOnly)
│   │   │   └── repositories/        # SupabaseTransactionRepository implements ITransactionRepository
│   │   ├── crypto/                  # cifrado AES-256 de campos sensibles
│   │   └── exporters/               # PDF/Excel/CSV
│   │
│   ├── presentation/                # UI
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui (button, dialog, input...)
│   │   │   ├── charts/
│   │   │   └── modules/             # componentes específicos: TransactionForm, BudgetCard...
│   │   ├── hooks/                   # useTransactions(), useBudgets() (envuelven React Query)
│   │   └── stores/                  # Zustand: useUIStore, useFilterStore
│   │
│   └── shared/
│       ├── config/                  # constantes, feature flags
│       ├── lib/                     # utils puras (formatMoney, formatDate)
│       └── types/                   # tipos compartidos
│
├── supabase/
│   ├── migrations/                  # SQL versionado
│   └── seed.sql
│
├── android/                         # generado por Capacitor
├── capacitor.config.ts
├── netlify.toml
├── __tests__/
└── docs/                            # este documento y los demás
```

### 3.2 Regla de oro por módulo funcional

Cada módulo de negocio (transacciones, presupuestos, deudas, ahorros, inversiones, clientes, suscripciones, calendario, reportes) sigue el mismo patrón vertical:

```
domain/entities/Debt.ts
domain/repositories/IDebtRepository.ts
application/use-cases/debts/{CreateDebt, RegisterPayment, GetDebtSchedule}.ts
infrastructure/supabase/repositories/SupabaseDebtRepository.ts
presentation/hooks/useDebts.ts
presentation/components/modules/debts/{DebtList, DebtForm, DebtCalendar}.tsx
app/(dashboard)/debts/page.tsx
```

Esto permite construir módulo por módulo (como pediste, por fases) sin romper los anteriores, y es la base para que el proyecto pueda convertirse en SaaS: basta con añadir `organization_id` junto a `user_id` el día que haya multi-usuario real.

## 4. Sistema de diseño (preparación para Fase 2 — UI/UX)

- **Tema:** oscuro por defecto, claro opcional. Tokens de color en CSS variables (`--background`, `--surface`, `--surface-glass`, `--accent`, `--danger`, `--success`) para poder theming en tiempo real.
- **Glassmorphism:** superficies con `backdrop-blur`, bordes `1px` translúcidos, sombras suaves — usado en cards de KPIs y sidebars, no en toda la UI (para no perder legibilidad de números).
- **Tipografía:** fuente variable tipo Inter/Geist, números financieros en `tabular-nums` para alineación correcta en tablas.
- **Animación:** Framer Motion para transiciones de ruta, entrada de cards (`stagger`), y feedback de acciones (guardar, eliminar).
- **Componentes base:** shadcn/ui como fundación (Dialog, Sheet, Command palette para el buscador global, DataTable para transacciones).

## 5. Preparación para IA (Fase futura)

Se deja un contrato de interfaz desde ya: `application/use-cases/ai/IFinancialInsightService.ts`, implementado en Fase 1 por un stub, y en el futuro por una Edge Function de Supabase que llama a la API de Claude con los datos agregados (nunca datos crudos sensibles sin agregar). Esto evita rediseñar el dashboard cuando se añada el asistente.

## 6. Escalabilidad hacia SaaS

- RLS por `user_id` desde el día 1 → migrar a `organization_id` es un cambio de columna, no de arquitectura.
- Módulos desacoplados → se pueden convertir en features "premium" con feature flags sin tocar el core.
- `infrastructure/supabase` es la única capa que sabe que existe Supabase → migrar a otro proveedor (o backend propio) solo toca esa carpeta.
