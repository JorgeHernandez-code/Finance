# app (Next.js App Router)

Solo routing, layouts y composición de página. **Ninguna lógica de negocio vive aquí** — cada `page.tsx` importa componentes de `presentation/components/modules` y hooks de `presentation/hooks`.

- `(auth)/` — `login/`, `register/`, `forgot-password/`, `reset-password/` — layout sin sidebar; las mutaciones son Server Actions en `actions.ts`.
- `(dashboard)/` — `dashboard/`, `transactions/`, `categories/`, `accounts/`, `budgets/`, `debts/`, `savings/`, `investments/`, `clients/`, `subscriptions/`, `reports/`, `calendar/`, `settings/` — layout con sidebar + topbar, protegido por middleware de sesión.
- `auth/callback/` — único Route Handler de la app: intercambia el código OAuth/reset por una sesión.
- `layout.tsx` — providers globales (React Query, tema, toasts, bridge de auth nativo para Android).
- `globals.css` — variables CSS del sistema de diseño (tokens de color, radios).
