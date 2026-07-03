-- ============================================================
-- PLATAFORMA LIVIU — Migración 4: datos físicos del cliente
-- Necesarios para el auto-cálculo de macros (Mifflin-St Jeor).
-- ============================================================

alter table public.profiles
  add column if not exists fecha_nacimiento date,
  add column if not exists altura_cm numeric(5, 1),
  add column if not exists sexo text check (sexo in ('hombre', 'mujer')),
  add column if not exists factor_actividad numeric(3, 2) not null default 1.55;

comment on column public.profiles.factor_actividad is
  'Multiplicador de actividad: 1.2 sedentario · 1.375 ligero · 1.55 moderado · 1.725 alto · 1.9 muy alto';
