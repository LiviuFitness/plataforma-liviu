-- ============================================================
-- PLATAFORMA LIVIU — Migración 8: revisión semanal
--  · Ritmo objetivo de peso configurable por cliente (%/semana)
--    ej.: -0,25 pérdida de grasa · +0,25 ganancia · 0 mantenimiento
--    (como en el REGISTRO SEMANAL del Excel de Liviu)
--  · PRS pre-sesión (cómo llega el cliente hoy, 1-5)
-- ============================================================

alter table public.profiles
  add column if not exists objetivo_ritmo_semanal_pct numeric(4,2);

comment on column public.profiles.objetivo_ritmo_semanal_pct is
  'Ritmo de cambio de peso deseado, %/semana. Negativo = pérdida, positivo = ganancia, 0 = mantenimiento. Si es null, se infiere del objetivo del cliente.';
