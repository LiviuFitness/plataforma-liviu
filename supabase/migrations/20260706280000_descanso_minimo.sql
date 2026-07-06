-- ============================================================
-- PLATAFORMA LIVIU — Migración 21: garantiza que ningún ejercicio
-- se quede sin descanso configurado (0 o negativo).
-- ============================================================

update public.rutina_ejercicios set descanso_seg = 120 where descanso_seg <= 0;

alter table public.rutina_ejercicios
  add constraint descanso_seg_positivo check (descanso_seg > 0);
