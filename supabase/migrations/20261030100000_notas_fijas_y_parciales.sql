-- Observaciones que caducan + reps parciales (30 oct 2026)
--
-- 1) Las notas propias de cada ejercicio ("3ª serie no hacer") se borran
--    solas al guardar la siguiente sesión con ese ejercicio, salvo las
--    marcadas como fijas ("respaldo en el 4").
alter table public.notas_ejercicio
  add column if not exists fija boolean not null default false;

-- 2) Reps parciales apuntadas entre corchetes: "8 [3]" → 8 reps
--    completas + 3 parciales (no cuentan para el rango ni el volumen).
alter table public.series_realizadas
  add column if not exists reps_parciales integer;
