-- ============================================================
-- PLATAFORMA LIVIU — Migración 18: 3 ejercicios nuevos que
-- faltaban en la biblioteca, detectados al importar el entreno
-- "ENTRENO 3 PIERNA 2 TORSO".
-- ============================================================

insert into public.ejercicios (nombre, nombre_en, grupo_muscular) values
  ('STEP UP', null, 'Isquiosurales'),
  ('Press en prensa horizontal de placas', 'Horizontal plate leg press', 'Cuádriceps'),
  ('Remo gironda unilateral', 'Neutral grip landmine row', 'Dorsales');
