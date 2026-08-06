# 03 · Arquitectura de Seguridad

Modelo de amenazas: la app maneja saldos, deudas, números de cuenta e ingresos por cliente. El objetivo es que, incluso si el `anon key` público de Supabase se filtra (es público por diseño), o si un dispositivo móvil se pierde, los datos financieros sigan protegidos.

## 1. Autenticación

- **Proveedor:** Supabase Auth (gestiona hashing de contraseñas, emisión/rotación de JWT y refresh tokens — no se reinventa).
- **Métodos:** email + contraseña (obligatorio) y Google OAuth (opcional, mismo flujo de Supabase).
- **Hashing de contraseñas:** delegado a Supabase Auth, que usa **bcrypt**. La app **nunca** ve ni almacena la contraseña en texto plano ni un hash propio.
- **Sesión:**
  - Tokens de sesión guardados en **cookies `HttpOnly`, `Secure`, `SameSite=Lax`** vía `@supabase/ssr` — nunca en `localStorage` (mitiga robo de token por XSS).
  - **Access token JWT** de corta duración (~1h) + **refresh token** de larga duración; renovación automática y transparente en el middleware de Next.js.
  - **Cierre de sesión automático** por inactividad: temporizador en cliente (ej. 15 min sin interacción) que invalida la sesión localmente y fuerza re-login; además expiración dura server-side vía configuración de Supabase.
  - Revocación de sesión disponible desde "Configuración → Seguridad → Cerrar todas las sesiones".
- **Recuperar contraseña:** flujo estándar de Supabase (email con link de un solo uso, expiración corta).
- **Multi-factor (recomendado a futuro):** Supabase soporta TOTP; se deja el hook de UI preparado en Fase 4 aunque no se active en v1.

## 2. Autorización de datos

- **Row Level Security en el 100% de las tablas** (ver `02-BASE-DE-DATOS.md`) — la autorización vive en PostgreSQL, no solo en el frontend. Aunque alguien llame a la API directamente con el `anon key`, RLS bloquea el acceso cruzado entre usuarios.
- **`service_role` key** (bypassa RLS) solo se usa en Edge Functions server-side para tareas administrativas (ej. jobs de recordatorios), **nunca** se expone al cliente ni se incluye en el bundle de Next.js.

## 3. Cifrado

- **En tránsito:** HTTPS obligatorio end-to-end (Netlify fuerza TLS; Supabase solo acepta conexiones TLS).
- **En reposo:**
  - PostgreSQL de Supabase ya cifra el disco a nivel de infraestructura.
  - Campos sensibles específicos (números de cuenta, notas de deuda) con **AES-256** vía `pgcrypto` (server-side) y, opcionalmente, una capa adicional de cifrado en cliente con Web Crypto API antes de enviarlos (ver detalle en `02-BASE-DE-DATOS.md` §5).
  - Backups exportados (JSON/CSV) desde "Configuración → Respaldo" se cifran con AES-256-GCM usando una contraseña que solo tú conoces, antes de guardarse en disco.

## 4. Validación de entradas y prevención de inyecciones

- **Zod** como única fuente de verdad de validación, compartida entre formularios (React Hook Form) y Server Actions/Route Handlers — nunca se confía en lo que llega del cliente sin re-validar en servidor.
- **SQL Injection:** imposible por diseño porque todo acceso a datos pasa por el cliente de Supabase (PostgREST/`supabase-js`), que usa *parameterized queries*; no se construyen strings SQL a mano en el cliente. Cualquier SQL crudo (Edge Functions) usa *prepared statements*.
- **XSS:**
  - React escapa por defecto todo lo que se renderiza (`{value}`), nunca se usa `dangerouslySetInnerHTML` con contenido de usuario.
  - Sanitización adicional (`DOMPurify`) para el único caso de HTML enriquecido (notas con formato, si se llega a implementar).
  - **Content-Security-Policy** estricta (ver §6) como segunda barrera aunque haya un fallo de sanitización.
- **CSRF:** Server Actions de Next.js 15 incluyen protección CSRF nativa (verificación de origen); Route Handlers adicionales validan el header `Origin`/`Referer` contra un allowlist.

## 5. Rate limiting y fuerza bruta

- **Login/registro/recuperar contraseña:** rate limiting nativo de Supabase Auth (por IP y por email) + una capa adicional en Netlify Edge Functions (ej. `@upstash/ratelimit` con Redis gratuito) para bloquear ráfagas antes de que lleguen a Supabase.
- **Bloqueo progresivo:** tras N intentos fallidos de login, backoff exponencial y, opcionalmente, CAPTCHA (hCaptcha, gratuito) antes del siguiente intento.
- **Endpoints de escritura** (crear transacción, importar CSV) con límite razonable por minuto para evitar abuso/errores en bucle.

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

- Variables sensibles (`SUPABASE_SERVICE_ROLE_KEY`, claves de cifrado, credenciales OAuth) solo en **variables de entorno de Netlify**, nunca commiteadas. `.env.example` documenta las variables sin valores reales; `.env.local` está en `.gitignore`.
- Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` viajan al cliente (por diseño son públicas y seguras de exponer *porque* RLS protege los datos).

## 8. Auditoría y monitoreo

- Tabla `audit_log` (ver DB doc) registra acciones sensibles: login, cambio de contraseña, creación/edición/eliminación de transacciones y cuentas, exportaciones. Se llena vía triggers de PostgreSQL + hooks de Auth.
- Alertas de actividad inusual (ej. login desde nueva ubicación) preparadas para Fase de notificaciones.

## 9. Seguridad en móvil (Capacitor/Android)

- El WebView de Capacitor solo carga contenido empaquetado localmente (o el dominio de producción vía HTTPS), nunca `http://`.
- Tokens de sesión persistidos con `@capacitor/preferences` respaldado por **Android Keystore** (cifrado a nivel de SO), no en `localStorage` plano.
- Bloqueo de captura de pantalla opcional en vistas con datos sensibles (`FLAG_SECURE` en Android) — configurable en Fase móvil.
- Firma del APK/AAB con keystore propio, gestionado fuera del repo.

## 10. Checklist OWASP (resumen de cobertura)

| Riesgo OWASP Top 10 | Mitigación |
|---|---|
| A01 Broken Access Control | RLS en cada tabla + verificación de sesión en middleware de Next.js |
| A02 Cryptographic Failures | TLS everywhere, AES-256 en campos sensibles, HttpOnly cookies |
| A03 Injection | Parameterized queries vía Supabase client, Zod en todos los inputs |
| A04 Insecure Design | Threat modeling en este documento, RLS por diseño, principio de menor privilegio |
| A05 Security Misconfiguration | CSP/headers declarativos, `service_role` nunca en cliente |
| A07 Identification/Auth Failures | Supabase Auth (bcrypt, JWT rotation), rate limiting, MFA preparado |
| A08 Software/Data Integrity | Dependencias auditadas (`npm audit`/Dependabot), CI con lint+test antes de deploy |
| A09 Logging Failures | `audit_log` + Netlify/Supabase logs |
| A10 SSRF | No hay fetch a URLs arbitrarias controladas por usuario |
