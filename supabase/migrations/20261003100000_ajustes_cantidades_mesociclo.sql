-- ============================================================
-- Ajuste de cantidades y aviso de fin de mesociclo.
--  · revisiones_kcal.cambios: qué alimentos cambiaron y cuánto al
--    aplicar un ajuste (el cliente lo ve en Mi dieta).
--  · rutinas.aviso_fin_meso_en: cuándo se avisó al entrenador de que
--    el cliente terminó la penúltima semana (para avisar una sola vez;
--    una rutina nueva empieza sin él).
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
alter table public.revisiones_kcal add column if not exists cambios jsonb;
alter table public.rutinas add column if not exists aviso_fin_meso_en timestamptz;
