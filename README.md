# Finance — Dashboard Financiero Personal

Aplicación web (y futura app móvil) para controlar por completo tus finanzas personales: cuentas, transacciones, presupuestos, deudas, ahorros, inversiones, clientes y suscripciones — con nivel de seguridad y arquitectura de producto SaaS.

## Stack

Next.js 15 · React 19 · TypeScript · TailwindCSS · shadcn/ui · Framer Motion · Supabase (PostgreSQL + Auth + Storage) · Netlify · Capacitor (Android).

Detalle completo de decisiones en [`docs/01-ARQUITECTURA.md`](docs/01-ARQUITECTURA.md).

## Documentación (Fase 1)

| Documento | Contenido |
|---|---|
| [`docs/01-ARQUITECTURA.md`](docs/01-ARQUITECTURA.md) | Stack, Clean Architecture, estructura de carpetas, sistema de diseño, escalabilidad a SaaS |
| [`docs/02-BASE-DE-DATOS.md`](docs/02-BASE-DE-DATOS.md) | Modelo ER, tablas, índices, políticas RLS, cifrado AES-256 |
| [`docs/03-SEGURIDAD.md`](docs/03-SEGURIDAD.md) | Autenticación, JWT/refresh, cifrado, CSP, rate limiting, checklist OWASP |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) | Las 22 fases del proyecto, una por una |

## Estructura del proyecto

```
finance/
├── src/
│   ├── app/              # Next.js App Router — routing y layouts
│   ├── domain/           # Entidades y reglas de negocio puras
│   ├── application/      # Casos de uso
│   ├── infrastructure/   # Supabase, cifrado, exportadores
│   ├── presentation/     # Componentes, hooks, stores
│   └── shared/           # Utilidades y tipos compartidos
├── supabase/migrations/  # Esquema SQL versionado
├── __tests__/            # Vitest + Playwright
├── docs/                 # Documentación de arquitectura
├── capacitor.config.ts   # Configuración para el build de Android
└── netlify.toml          # Config de despliegue + cabeceras de seguridad
```

Cada carpeta tiene su propio `README.md` explicando su responsabilidad — léelos antes de añadir código nuevo ahí.

## Cómo correr el proyecto (cuando haya código en `src/app`)

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Supabase
npm run dev
```

## Estado actual

**Fase 1 completada:** arquitectura, modelo de datos, modelo de seguridad y scaffolding del repo.
Ver [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) para las fases siguientes.

## Despliegue

- **Web:** conectar este repo en Netlify (build command `npm run build`, publish `.next`, plugin `@netlify/plugin-nextjs` ya configurado en `netlify.toml`).
- **Android:** `next build` con `BUILD_TARGET=capacitor` → `npx cap sync android` → `npx cap open android` → generar APK/AAB firmado desde Android Studio.
