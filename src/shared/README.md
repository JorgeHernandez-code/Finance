# shared

Código transversal sin lógica de negocio.

- `config/` — constantes (monedas soportadas, límites de rate limiting en cliente, feature flags).
- `lib/` — utilidades puras: `formatMoney()`, `formatDate()`, `cn()` (merge de clases Tailwind).
- `types/` — tipos TypeScript compartidos entre capas (ej. tipos generados por `supabase gen types typescript`).
