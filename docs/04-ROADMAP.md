# 04 · Roadmap por Fases

Cada fase se entregó de forma independiente: estructura de carpetas, código, pruebas y mejoras posibles antes de avanzar a la siguiente.

| Fase | Nombre | Entregable principal | Estado |
|---|---|---|---|
| **1** | Arquitectura completa | Documentos de arquitectura + scaffolding del repo | ✅ |
| **2** | Diseño UI/UX | Tokens de tema (claro/oscuro), componentes shadcn/ui, shell (sidebar + topbar + command palette) | ✅ |
| **3** | Configuración del proyecto | `package.json`, Next.js 15, ESLint (flat config)/Prettier, Husky + lint-staged, CI en GitHub Actions | ✅ |
| **4** | Autenticación | Registro, login, recuperar contraseña, Google OAuth, middleware de rutas protegidas, cierre de sesión por inactividad | ✅ |
| **5** | Base de datos | 12 migraciones SQL, políticas RLS en cada tabla, vistas, tipos TypeScript generados | ✅ |
| **6** | Dashboard | KPIs, patrimonio neto, gráficos de ingresos/gastos y por categoría | ✅ |
| **7** | Transacciones | CRUD, filtros, etiquetas, adjuntos, transferencias entre cuentas, recurrencia | ✅ |
| **8** | Categorías | CRUD, color/icono, subcategorías, categorías por defecto al registrarse | ✅ |
| **9** | Cuentas | Multi-cuenta, multi-moneda, saldos calculados (no editables) | ✅ |
| **10** | Presupuestos | Por categoría, gastado/disponible/%, alertas por umbral | ✅ |
| **11** | Deudas | Como deudor o acreedor, pagos parciales, saldo pendiente | ✅ |
| **12** | Ahorros | Metas con fecha objetivo, % completado, aportes | ✅ |
| **13** | Inversiones | Monto invertido, historial de valorización | ✅ |
| **14** | Clientes | Ingresos por cliente (freelance), total generado | ✅ |
| **15** | Suscripciones | Recurrentes (semanal/mensual/anual), próximo cobro | ✅ |
| **16** | Reportes | Gráficos por periodo, exportar PDF/Excel/CSV | ✅ |
| **17** | Calendario | Pagos próximos, vencimientos, renovaciones | ✅ |
| **18** | Buscador global | Command palette (⌘K) sobre todo el sistema | ✅ |
| **19** | Configuración | Perfil, moneda, idioma, tema, respaldo cifrado (import/export) | ✅ |
| **20** | Endurecimiento de seguridad | Rate limiting en todos los flujos de auth, aislamiento de secretos server-only, fix de CSV injection y open redirect, auditoría de dependencias | ✅ |
| **21** | App móvil (Capacitor) | Proyecto Android nativo, envoltorio WebView sobre producción, login de Google vía Custom Tabs + deep link | ✅ |
| **22** | IA (fase futura) | Asistente que analiza gastos, detecta gastos innecesarios, propone presupuestos | No iniciada |

## Deuda técnica consciente

- **Cifrado a nivel de columna** (`account_number_encrypted` vía `pgcrypto`): la columna existe en el esquema, pero la capa de aplicación todavía no la usa — hoy ningún flujo escribe ni lee ese campo.
- **Firma de release** del AAB de Android: el build actual de Capacitor es debug; falta generar un keystore propio y publicar en Google Play.
- **MFA**: Supabase Auth lo soporta (TOTP), pero no está activado en la UI.
