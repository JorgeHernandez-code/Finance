# supabase/migrations

Aquí vive el esquema SQL versionado (una migración por tabla/feature, generada con `supabase migration new <nombre>`). Se puebla en la **Fase 5 (Base de Datos)** siguiendo exactamente el modelo descrito en `docs/02-BASE-DE-DATOS.md`: tablas, índices, RLS y vistas, en ese orden.

Nunca se edita una migración ya aplicada en producción — los cambios posteriores son migraciones nuevas.

## Finance 2.0 (0013–0015)

Aditivas y compatibles con la versión anterior de la app. Orden de despliegue: **aplicar 0013 → 0014 → 0015 en Supabase y después desplegar el código**. Pasos, verificación y riesgos en [`docs/05-FINANCE-2.md`](../../docs/05-FINANCE-2.md#3-despliegue-qué-hacer-y-en-qué-orden).

Antes de aplicar cualquier migración nueva, `npm test` la ejecuta sobre un Postgres embebido con datos del esquema anterior (`__tests__/db/`).
