# app (Next.js App Router)

Solo routing, layouts y composición de página. **Ninguna lógica de negocio vive aquí** — cada `page.tsx` importa componentes de `presentation/components/modules` y hooks de `presentation/hooks`.

Estructura prevista (se puebla desde la Fase 3 en adelante):

- `(auth)/` — `login/`, `register/`, `forgot-password/` — layout sin sidebar.
- `(dashboard)/` — `dashboard/`, `transactions/`, `categories/`, `accounts/`, `budgets/`, `debts/`, `savings/`, `investments/`, `clients/`, `subscriptions/`, `reports/`, `calendar/`, `settings/` — layout con sidebar + topbar, protegido por middleware de sesión.
- `api/` — Route Handlers para casos que no encajan en Server Actions (ej. exportación de archivos, webhooks).
- `layout.tsx` — providers globales (React Query, tema, toasts).
- `globals.css` — variables CSS del sistema de diseño (tokens de color, radios).
