# 03 · Arquitectura de Seguridad

Modelo de amenazas: la app maneja saldos, deudas, números de cuenta e ingresos por cliente. El objetivo es que, incluso si el `anon key` público de Supabase se filtra (es público por diseño), o si un dispositivo móvil se pierde, los datos financieros sigan protegidos.

## 1. Autenticación

- **Proveedor:** Supabase Auth (gestiona hashing de contraseñas, emisión/rotación de JWT y refresh tokens — no se reinventa).
- **Métodos:** email + contraseña (obligatorio) y Google OAuth (opcional, mismo flujo de Supabase).
- **Hashing de contraseñas:** delegado a Supabase Auth, que usa **bcrypt**. La app **nunca** ve ni almacena la contraseña en texto plano ni un hash propio.
- **Sesión:**
  - Tokens de sesión guardados en **cookies `HttpOnly`, `Secure`, `SameSite=Lax`** vía `@supabase/ssr` — nunca en `localStorage` (mitiga robo de token por XSS).
  - **Access token JWT** de corta duración (~1h) + **refresh token** de larga duración; renovación automática y transparente en el middleware de Next.js.
  - **Cierre de sesión automático** por inactividad (`IdleLogoutWatcher`): temporizador en cliente que cierra la sesión y fuerza re-login tras un periodo sin interacción; además expiración dura server-side vía configuración de Supabase.
  - **Pendiente:** revocar sesiones activas en otros dispositivos desde la UI de Configuración — hoy solo se puede cerrar la sesión actual.
- **Recuperar contraseña:** flujo estándar de Supabase (email con link de un solo uso, expiración corta).
- **Multi-factor:** Supabase Auth lo soporta (TOTP), pero no está activado en la UI todavía — deuda técnica consciente.

## 2. Autorización de datos

- **Row Level Security en el 100% de las tablas** (ver `02-BASE-DE-DATOS.md`) — la autorización vive en PostgreSQL, no solo en el frontend. Aunque alguien llame a la API directamente con el `anon key`, RLS bloquea el acceso cruzado entre usuarios.
- **`service_role` key** (bypassa RLS): la app hoy no la usa en ningún flujo — todo pasa por el `anon key` + RLS. Está reservada en el esquema de env vars para una futura tarea administrativa server-side, y **nunca** se expone al cliente ni se incluye en el bundle de Next.js (`env.server.ts` usa `server-only` para garantizarlo en build time).

## 3. Cifrado

- **En tránsito:** HTTPS obligatorio end-to-end (Netlify fuerza TLS; Supabase solo acepta conexiones TLS).
- **En reposo:**
  - PostgreSQL de Supabase ya cifra el disco a nivel de infraestructura.
  - Backups exportados desde "Configuración → Respaldo" se cifran con **AES-256-GCM** (PBKDF2-SHA256, 210k iteraciones, salt e IV aleatorios por archivo) usando una contraseña que solo tú conoces, antes de guardarse en disco.
  - Cifrado a nivel de columna (`pgcrypto`) para el número de cuenta está **diseñado pero no implementado**: la columna `account_number_encrypted` existe en el esquema, pero ningún flujo de la aplicación la lee ni la escribe todavía (ver `02-BASE-DE-DATOS.md` §5).

## 4. Validación de entradas y prevención de inyecciones

- **Zod** como única fuente de verdad de validación, compartida entre formularios (React Hook Form) y Server Actions/Route Handlers — nunca se confía en lo que llega del cliente sin re-validar en servidor.
- **SQL Injection:** imposible por diseño porque todo acceso a datos pasa por el cliente de Supabase (PostgREST/`supabase-js`), que usa *parameterized queries*; no se construye SQL a mano en ningún caso de uso ni repositorio.
- **XSS:**
  - React escapa por defecto todo lo que se renderiza (`{value}`), nunca se usa `dangerouslySetInnerHTML` con contenido de usuario.
  - Sanitización adicional (`DOMPurify`) para el único caso de HTML enriquecido (notas con formato, si se llega a implementar).
  - **Content-Security-Policy** estricta (ver §6) como segunda barrera aunque haya un fallo de sanitización.
- **CSRF:** Server Actions de Next.js 15 incluyen protección CSRF nativa (verificación de origen). El único Route Handler de la app (`/auth/callback`) solo hace `GET` de lectura (intercambio de código OAuth) y valida que el `next` de retorno sea una ruta interna, no arbitraria — no requiere protección CSRF adicional al no mutar estado a partir de un formulario cross-site.

## 5. Rate limiting y fuerza bruta

- **Login:** 5 intentos por minuto, por IP + email.
- **Registro:** 3 intentos por hora, por IP + email.
- **Recuperar contraseña:** 3 intentos por hora, por IP + email (además, la respuesta nunca revela si el correo existe o no).
- Implementado con `@upstash/ratelimit` (sliding window) cuando hay credenciales de Redis configuradas; si no, degrada automáticamente a un limitador en memoria del proceso — no distribuido, pero mejor que nada mientras se configura Upstash.
- **Pendiente:** límite de tasa en endpoints de escritura de alto volumen (ej. importación CSV) — hoy solo cubre los flujos de autenticación.

## 6. Cabeceras de seguridad y CSP

Definidas de forma declarativa en `netlify.toml` (aplican a todo el sitio):

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
```

## 7. Gestión de secretos

- Variables sensibles (`SUPABASE_SERVICE_ROLE_KEY`, claves de cifrado, credenciales de Upstash) solo en **variables de entorno de Netlify**, nunca commiteadas. `.env.example` documenta las variables sin valores reales; `.env.local` está en `.gitignore`. Las credenciales de Google OAuth se configuran directamente como proveedor en el dashboard de Supabase, no como env var de esta app.
- Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` viajan al cliente (por diseño son públicas y seguras de exponer *porque* RLS protege los datos).

## 8. Auditoría y monitoreo

- Tabla `audit_log` (ver DB doc) registra creación/edición/eliminación de transacciones, cuentas y deudas vía triggers de PostgreSQL (`SECURITY DEFINER`, `search_path` fijo para evitar hijacking).
- **Pendiente:** registrar eventos de autenticación (login, cambio de contraseña) — hoy solo cubre mutaciones de datos, no eventos de Auth.

## 9. Seguridad en móvil (Capacitor/Android)

- El WebView de Capacitor navega directo al dominio de producción vía HTTPS (`server.url` en `capacitor.config.ts`) — nunca carga contenido por `http://` ni ejecuta HTML empaquetado localmente con datos reales.
- El login con Google no ocurre dentro del WebView (Google lo bloquea por política anti-phishing): se abre en Chrome Custom Tabs vía `@capacitor/browser`, y el retorno se recibe por un deep link con custom URL scheme registrado en `AndroidManifest.xml`, manejado por `@capacitor/app`.
- La sesión la gestiona el propio WebView (cookies del dominio de producción), igual que en un navegador normal — no hay una capa adicional de almacenamiento nativo (`@capacitor/preferences`/Android Keystore) todavía.
- **Pendiente:** bloqueo de captura de pantalla en vistas sensibles (`FLAG_SECURE`) y firma de release con keystore propio — el build actual de Capacitor es debug, sin publicar en Google Play.

## 10. Checklist OWASP (resumen de cobertura)

| Riesgo OWASP Top 10 | Mitigación |
|---|---|
| A01 Broken Access Control | RLS en cada tabla + verificación de sesión en middleware de Next.js |
| A02 Cryptographic Failures | TLS everywhere, backups cifrados con AES-256-GCM, HttpOnly cookies |
| A03 Injection | Parameterized queries vía Supabase client, Zod en todos los inputs |
| A04 Insecure Design | Threat modeling en este documento, RLS por diseño, principio de menor privilegio |
| A05 Security Misconfiguration | CSP/headers declarativos, `service_role` nunca en cliente |
| A07 Identification/Auth Failures | Supabase Auth (bcrypt, JWT rotation), rate limiting en login/registro/recuperación |
| A08 Software/Data Integrity | Dependencias auditadas (`npm audit`/Dependabot), CI con lint+test antes de deploy |
| A09 Logging Failures | `audit_log` + Netlify/Supabase logs |
| A10 SSRF | No hay fetch a URLs arbitrarias controladas por usuario |
