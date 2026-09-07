-- ============================================================
-- PLATAFORMA LIVIU — Migración 39: 3 ejercicios con el grupo
-- muscular fuera del catálogo.
--
-- La semilla original (migración 3) usaba otra taxonomía
-- ("Pecho", "Hombro", "Core"). Al importar la biblioteca real de
-- Liviu (migración 6, con los 16 grupos del método) casi toda
-- aquella semilla se retiró, pero sobrevivieron 3 ejercicios con
-- el grupo viejo:
--
--   · Press inclinado con mancuernas   (Pecho)
--   · Press de hombro en máquina       (Hombro)
--   · Crunch abdominal                 (Core)
--
-- Como GRUPOS_MUSCULARES (lib/tipos.ts) no reconoce esos tres
-- valores, esos ejercicios no aparecen en el mapa de recuperación
-- ni suman en el panel de volumen por músculo: si se eligen para
-- una rutina, ese trabajo no cuenta en ningún sitio.
--
-- No se borran (ninguno choca de nombre con un ejercicio de la
-- biblioteca real): se traducen al grupo equivalente. Cuando se
-- escribió esto ninguno estaba usado en ninguna rutina, así que
-- la corrección no cambia ningún historial.
-- ============================================================

update public.ejercicios set grupo_muscular = 'Pectoral'
  where grupo_muscular = 'Pecho';

update public.ejercicios set grupo_muscular = 'Deltoides Anterior'
  where grupo_muscular = 'Hombro';

update public.ejercicios set grupo_muscular = 'Abdomen'
  where grupo_muscular = 'Core';
