-- Extensiones necesarias para el resto del esquema:
--   pgcrypto -> cifrado AES-256 de campos sensibles (pgp_sym_encrypt/decrypt)
--   pg_trgm  -> búsqueda difusa de texto (buscador global, Fase 18)
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
