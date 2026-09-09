# infrastructure

Implementaciones concretas de todo lo externo. Es la única capa que sabe que Supabase, el sistema de archivos o una API de terceros existen.

- `supabase/client.ts` — cliente de Supabase para uso en componentes cliente (browser).
- `supabase/server.ts` — cliente de Supabase para Server Components/Actions, usando cookies `HttpOnly` (`@supabase/ssr`).
- `supabase/repositories/` — clases que implementan las interfaces de `domain/repositories` (ej. `SupabaseTransactionRepository implements ITransactionRepository`). Aquí sí se permite `import { createClient } from '@supabase/supabase-js'`.
- `rate-limit/` — límite de intentos en login/registro/recuperar contraseña (Upstash Redis, con fallback a un limitador en memoria).
- `export/` — generación de PDF (`@react-pdf/renderer`), Excel (`exceljs`) y CSV para Reportes, y el cifrado AES-256-GCM de los backups.

Si mañana se cambia Supabase por otro backend, solo esta carpeta se toca.
