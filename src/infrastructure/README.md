# infrastructure

Implementaciones concretas de todo lo externo. Es la única capa que sabe que Supabase, el sistema de archivos o una API de terceros existen.

- `supabase/client.ts` — cliente de Supabase para uso en componentes cliente (browser).
- `supabase/server.ts` — cliente de Supabase para Server Components/Actions, usando cookies `HttpOnly` (`@supabase/ssr`).
- `supabase/repositories/` — clases que implementan las interfaces de `domain/repositories` (ej. `SupabaseTransactionRepository implements ITransactionRepository`). Aquí sí se permite `import { createClient } from '@supabase/supabase-js'`.
- `crypto/` — utilidades de cifrado AES-256 (Web Crypto API) para la capa opcional de cifrado en cliente descrita en `docs/02-BASE-DE-DATOS.md`.
- `exporters/` — generación de PDF (`@react-pdf/renderer`), Excel (`exceljs`) y CSV para el módulo de Reportes.

Si mañana se cambia Supabase por otro backend, solo esta carpeta se toca.
