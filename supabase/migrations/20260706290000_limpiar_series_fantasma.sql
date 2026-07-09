-- ============================================================
-- PLATAFORMA LIVIU — Migración 22: elimina las series "fantasma"
-- que dejó la importación del Excel (los huecos de serie sin usar
-- de cada ejercicio se importaron como series de 0 reps, sin carga,
-- sin RIR y sin técnica). En la sesión del cliente aparecían como
-- filas vacías con "0" reps.
-- ============================================================

delete from public.series_prescritas
where reps = 0
  and reps_max is null
  and kg is null
  and carga_texto is null
  and rir is null
  and tecnica is null;
