# supabase/migrations

Aquí vive el esquema SQL versionado (una migración por tabla/feature, generada con `supabase migration new <nombre>`). Se puebla en la **Fase 5 (Base de Datos)** siguiendo exactamente el modelo descrito en `docs/02-BASE-DE-DATOS.md`: tablas, índices, RLS y vistas, en ese orden.

Nunca se edita una migración ya aplicada en producción — los cambios posteriores son migraciones nuevas.
