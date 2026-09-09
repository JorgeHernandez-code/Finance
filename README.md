# Finance — Dashboard Financiero Personal

[![CI](https://github.com/JorgeHernandez-code/Finance/actions/workflows/ci.yml/badge.svg)](https://github.com/JorgeHernandez-code/Finance/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-blue)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E)

Aplicación full-stack de finanzas personales — 12 módulos (transacciones, presupuestos, deudas, ahorros, inversiones, clientes, suscripciones, reportes, calendario...), con **Clean Architecture**, **Row Level Security** en cada tabla, y una app Android nativa. Desplegada en producción en Netlify.

**Demo en vivo:** [jorge-finance.netlify.app](https://jorge-finance.netlify.app)

## Por qué este proyecto

Lo construí para resolver un problema real (controlar mis propias finanzas — cuentas, clientes freelance, suscripciones) tratándolo como un producto SaaS desde el diseño: multi-tenant por `user_id` + RLS desde el día uno, separación estricta de capas, y un modelo de seguridad explícito (ver [`docs/03-SEGURIDAD.md`](docs/03-SEGURIDAD.md)) en vez de añadirlo después. Es el proyecto donde más deliberadamente apliqué buenas prácticas de arquitectura y seguridad de principio a fin.

## Funcionalidades

- **12 módulos financieros:** transacciones (con etiquetas, adjuntos, transferencias entre cuentas y recurrencia), categorías con subcategorías, cuentas multi-moneda, presupuestos con alertas por umbral, deudas (como deudor o acreedor) con pagos parciales, metas de ahorro, inversiones con historial de valorización, clientes (ingresos freelance), suscripciones recurrentes.
- **Dashboard** con patrimonio neto, KPIs del mes, tendencias y gráficos (ingresos/gastos, gasto por categoría).
- **Reportes** exportables a PDF, Excel y CSV.
- **Calendario** de pagos, vencimientos y renovaciones.
- **Buscador global** (⌘K) sobre todo el sistema.
- **Autenticación** con email/contraseña y Google OAuth (incluye el flujo nativo para Android — ver más abajo).
- **Respaldo cifrado**: exporta/restaura todos tus datos en un archivo protegido con AES-256-GCM y una contraseña que solo tú conoces.
- **App Android** nativa (Capacitor) además de la web.

## Seguridad

Este es el área donde más tiempo invertí, así que vale la pena listarla explícitamente en vez de darla por sentada:

- **Row Level Security en el 100% de las tablas** (12 migraciones) — la autorización vive en PostgreSQL, no en el código de la app; ni con la `anon key` filtrada se puede leer o escribir el dato de otro usuario.
- **Rate limiting** en login, registro y recuperación de contraseña (`@upstash/ratelimit` con degradación automática a un limitador en memoria si no hay Redis configurado).
- **Secretos de servidor aislados del bundle del cliente**: `env.server.ts` usa el paquete `server-only`, que hace fallar el build si algún componente cliente llega a importarlo — no solo un comentario de "no hacer esto".
- **CSP estricta y cabeceras de seguridad** declarativas en `netlify.toml` (`X-Frame-Options`, `HSTS`, `Permissions-Policy`, etc.).
- **CSRF** cubierto por la verificación de origen nativa de los Server Actions de Next.js 15.
- **Protección contra inyección de fórmulas CSV** (CWE-1236) en las exportaciones de reportes.
- **Protección contra open redirect** en el callback de OAuth (`/auth/callback`).
- **Backups cifrados** con AES-256-GCM + PBKDF2 (210k iteraciones), salt e IV aleatorios por archivo.
- **CI corre `npm audit`** en cada push además de lint/typecheck/test/build.

Detalle completo del modelo de amenazas y el checklist OWASP en [`docs/03-SEGURIDAD.md`](docs/03-SEGURIDAD.md).

## App móvil (Android)

La app depende de Server Actions y de una ruta de servidor para completar el login — código que no puede vivir en un bundle 100% estático. En vez de reescribir esa arquitectura para exportar HTML estático, el APK es un **envoltorio nativo con Capacitor**: el WebView navega directo al sitio en producción, así que toda la lógica de servidor (auth, RLS, mutaciones) sigue funcionando sin duplicar código entre web y móvil.

Un detalle no trivial que tuvo que resolverse: **Google bloquea el login OAuth dentro de WebViews embebidos** por política anti-phishing. La solución fue abrir ese flujo específico en Chrome Custom Tabs (`@capacitor/browser`) y recibir el retorno por un deep link con custom URL scheme (`@capacitor/app` + un intent-filter en `AndroidManifest.xml`), manteniendo intacto el flujo normal (Server Action + redirect) para la web.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, Middleware) |
| UI | React 19 · TypeScript strict · TailwindCSS · shadcn/ui (Radix) · Framer Motion |
| Estado | TanStack Query (servidor) · Zustand (UI) |
| Formularios | React Hook Form + Zod (mismo esquema cliente/servidor) |
| Backend | Supabase — PostgreSQL, Auth, Storage, Row Level Security |
| Hosting | Netlify (despliegue continuo desde `main`) |
| Móvil | Capacitor 6 (Android) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Exportación | `@react-pdf/renderer`, `exceljs`, CSV nativo |
| Testing | Vitest + Testing Library, Playwright (E2E) |
| CI | GitHub Actions — lint, typecheck, test, build, `npm audit` |

## Arquitectura

Clean Architecture con regla de dependencia estricta: las capas internas no conocen a las externas.

```
presentation/    → componentes, hooks (TanStack Query), stores (Zustand)
application/     → casos de uso + DTOs (Zod) — orquestan domain vía interfaces
domain/          → entidades y contratos de repositorio, sin dependencias externas
infrastructure/  → implementaciones concretas (Supabase, exportadores, rate limiting)
```

`domain` no importa nada de las otras capas. `application` solo conoce interfaces (`ITransactionRepository`, no `SupabaseTransactionRepository`). Esto es lo que permite testear casos de uso con mocks, y lo que haría viable cambiar de backend sin tocar la lógica de negocio. Detalle completo en [`docs/01-ARQUITECTURA.md`](docs/01-ARQUITECTURA.md).

```
src/
├── app/              # Next.js App Router — solo routing y layouts
├── domain/           # Entidades y contratos de repositorio
├── application/      # Casos de uso + DTOs Zod
├── infrastructure/   # Supabase, rate limiting, exportadores
├── presentation/     # Componentes, hooks, stores
└── shared/           # Config, utils y tipos compartidos
supabase/migrations/    # Esquema SQL versionado (12 migraciones)
android/                # Proyecto nativo generado por Capacitor
__tests__/              # Vitest (unit) + Playwright (E2E)
docs/                   # Arquitectura, base de datos, seguridad, roadmap
```

Cada carpeta bajo `src/` tiene su propio `README.md` explicando su responsabilidad.

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Supabase
npm run dev
```

Necesitas un proyecto de [Supabase](https://supabase.com) propio: aplica las migraciones de `supabase/migrations/` (en orden) y copia la URL + anon key a `.env.local`. El resto de variables en `.env.example` son opcionales (rate limiting distribuido, Google OAuth se configura desde el dashboard de Supabase, no por env var).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` / `npm run typecheck` | ESLint (flat config) y TypeScript en modo `strict` |
| `npm test` / `npm run test:watch` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run cap:sync` | Sincroniza el proyecto Android con la config de Capacitor |
| `npm run cap:open:android` | Abre el proyecto en Android Studio |

## Despliegue

- **Web:** Netlify, despliegue continuo desde `main` (`@netlify/plugin-nextjs`, headers/CSP en `netlify.toml`).
- **Android:** `npm run cap:sync` → `npm run cap:open:android` → generar APK/AAB firmado desde Android Studio. El WebView carga el sitio de producción (ver sección de arquitectura móvil arriba).
- **CI:** cada push/PR a `main` corre lint, typecheck, tests, build y `npm audit` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/01-ARQUITECTURA.md`](docs/01-ARQUITECTURA.md) | Stack, Clean Architecture, estructura de carpetas, escalabilidad a SaaS |
| [`docs/02-BASE-DE-DATOS.md`](docs/02-BASE-DE-DATOS.md) | Modelo ER, tablas, índices, políticas RLS |
| [`docs/03-SEGURIDAD.md`](docs/03-SEGURIDAD.md) | Autenticación, cifrado, CSP, rate limiting, checklist OWASP |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) | Historial de fases y qué sigue |

## Qué sigue

Deuda técnica consciente, sin pretender que no existe:

- Cifrado a nivel de columna (`pgcrypto`) para el número de cuenta: la columna existe en el esquema pero la capa de aplicación todavía no la usa.
- Firma de release del AAB de Android y publicación en Google Play (hoy el build de Capacitor es debug).
- Autenticación multifactor (Supabase la soporta; no está activada en la UI todavía).
- Cobertura de tests: Vitest y Playwright están configurados y corren en CI, pero la suite hoy es pequeña — los casos de uso de `application/` (los más valiosos de testear, por no depender de Supabase directamente) son el siguiente objetivo de cobertura.

## Licencia

[MIT](LICENSE) — © 2026 Jorge Hernández
