# 04 · Roadmap por Fases

Cada fase se entrega de forma independiente con: estructura de carpetas, código, explicación, buenas prácticas aplicadas, pruebas y mejoras posibles — tal como pediste. No se avanza a la siguiente fase hasta cerrar la anterior.

| Fase | Nombre | Entregable principal | Estado |
|---|---|---|---|
| **1** | Arquitectura completa | Este set de documentos + scaffolding del repo | ✅ En esta entrega |
| **2** | Diseño UI/UX | Sistema de diseño en código: tokens de tema (claro/oscuro), componentes base shadcn/ui personalizados, layout shell (sidebar + topbar + command palette), mockups de las pantallas clave | Pendiente |
| **3** | Configuración del proyecto | `package.json` real con todas las dependencias, Next.js 15 configurado (App Router, middleware, fonts), ESLint/Prettier, Husky + lint-staged, CI en GitHub Actions | Pendiente |
| **4** | Autenticación | Registro, login, recuperar contraseña, Google OAuth opcional, middleware de rutas protegidas, cierre de sesión automático | Pendiente |
| **5** | Base de datos | Migraciones SQL reales de todas las tablas, políticas RLS, funciones/vistas, seed de datos de prueba, tipos TypeScript generados (`supabase gen types`) | Pendiente |
| **6** | Dashboard | KPIs (saldo total, disponible, invertido, deudas, ahorros, ingresos/gastos del mes, balance), gráficos, patrimonio neto | Pendiente |
| **7** | Transacciones | CRUD completo, duplicar, buscar, filtros, etiquetas, notas, adjuntos | Pendiente |
| **8** | Categorías | CRUD, color/icono, categorías del sistema (Comida, Transporte, Salud...) + personalizadas (Bonarep, Trendencia, Automatizaciones...) | Pendiente |
| **9** | Cuentas | Multi-cuenta (Efectivo, Nequi, Davivienda, Bancolombia, PayPal, Payoneer, Caja), saldos calculados, transferencias entre cuentas | Pendiente |
| **10** | Presupuestos | Por categoría, gastado/disponible/%, alertas al superar umbral | Pendiente |
| **11** | Deudas | Prestamista, monto, interés, fecha, pagos parciales, saldo pendiente, calendario de vencimientos | Pendiente |
| **12** | Ahorros | Metas (Laptop, Viaje, Moto, Casa, Capital empresa), % completado, aportes | Pendiente |
| **13** | Inversiones | Monto, fecha, rentabilidad histórica, notas | Pendiente |
| **14** | Clientes | Ingresos por cliente (Bonarep, MasterEquipos, Trendencia, Automatizaciones, Freelance, Página Web...), total generado por cliente | Pendiente |
| **15** | Suscripciones | Netflix, Spotify, Claude, OpenAI, hosting, dominios, GitHub, Canva, Notion — gasto mensual total | Pendiente |
| **16** | Reportes | Gráficos interactivos por mes/año/categoría/cuenta, exportar PDF/Excel/CSV | Pendiente |
| **17** | Calendario | Pagos próximos, facturas, deudas, renovaciones de suscripciones | Pendiente |
| **18** | Buscador global | Command palette (⌘K) que busca en todo el sistema | Pendiente |
| **19** | Configuración | Perfil, moneda, idioma, tema, respaldo (import/export cifrado) | Pendiente |
| **20** | Importación CSV | Mapeo de columnas, detección de duplicados, vista previa antes de confirmar | Pendiente |
| **21** | PWA + Capacitor | Preparar build estático, `capacitor init`, generar APK firmado, checklist de Google Play | Pendiente |
| **22** | IA (Fase 2 del producto) | Asistente que analiza gastos, detecta gastos innecesarios, propone presupuestos, proyecciones | Pendiente — solo arquitectura preparada en Fase 1 |

## Cómo se trabaja cada fase

Al iniciar cada fase te preguntaré (si algo no está claro) y luego entregaré:

1. Estructura de carpetas/archivos nuevos.
2. Código completo y comentado donde aporta valor (sin comentarios obvios).
3. Explicación de decisiones de diseño relevantes.
4. Buenas prácticas aplicadas (accesibilidad, performance, seguridad).
5. Pruebas (unitarias con Vitest, y E2E con Playwright donde aplique).
6. Mejoras posibles / deuda técnica consciente que se deja para después.

## Próximo paso sugerido

Fase 2 (Diseño UI/UX) o Fase 3 (Configuración del proyecto) — dime cuál prefieres empezar primero, o si quieres que continúe en el orden del roadmap.
