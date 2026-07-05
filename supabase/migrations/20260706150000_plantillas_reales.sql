-- ============================================================
-- PLATAFORMA LIVIU — Migración 10: 3 plantillas de rutina reales
-- Full Body Iniciación · Empuje/Tracción/Pierna Intermedio · Fuerza 5×5
-- Usa los nombres EXACTOS de tu biblioteca de ejercicios (439 items).
-- Si algún nombre no coincide, la transacción entera falla y no
-- deja nada a medias (gracias al RAISE EXCEPTION + transacción).
-- ============================================================

begin;

-- Función auxiliar temporal: busca el ejercicio por nombre exacto,
-- crea el rutina_ejercicio y sus series de un tirón.
create or replace function pg_temp.add_ejercicio(
  p_dia uuid, p_nombre text, p_orden int, p_descanso int, p_series jsonb
) returns void language plpgsql as $$
declare
  v_ej uuid;
  v_re uuid;
  s jsonb;
  i int := 0;
begin
  select id into v_ej from public.ejercicios
  where nombre = p_nombre and creado_por is null
  limit 1;

  if v_ej is null then
    raise exception 'Ejercicio no encontrado en la biblioteca: %', p_nombre;
  end if;

  insert into public.rutina_ejercicios (dia_id, ejercicio_id, orden, descanso_seg)
  values (p_dia, v_ej, p_orden, p_descanso)
  returning id into v_re;

  for s in select * from jsonb_array_elements(p_series) loop
    insert into public.series_prescritas (rutina_ejercicio_id, orden, tipo, reps, reps_max, rir)
    values (
      v_re, i,
      coalesce(s->>'tipo', 'efectiva'),
      nullif(s->>'reps', '')::int,
      nullif(s->>'reps_max', '')::int,
      nullif(s->>'rir', '')::int
    );
    i := i + 1;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- PLANTILLA 1 — Full Body 3 días · Iniciación
-- ------------------------------------------------------------
do $$
declare
  v_rutina uuid;
  v_dia uuid;
begin
  insert into public.rutinas (nombre, es_plantilla, cliente_id, activa, notas)
  values (
    'Full Body 3 días — Iniciación', true, null, false,
    'Para clientes nuevos sin base. 3 sesiones/semana con un día de descanso entre cada una. RIR alto (2-3) para aprender técnica sin acumular fatiga excesiva.'
  )
  returning id into v_rutina;

  -- Día A
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 0, 'Día A', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Press de banca plano con barra libre', 0, 120,
    '[{"tipo":"calentamiento","reps":12},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Jalón con agarre neutro y amplio', 1, 90,
    '[{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Sentadilla con barra libre', 2, 150,
    '[{"tipo":"calentamiento","reps":10},{"reps":8,"reps_max":10,"rir":3},{"reps":8,"reps_max":10,"rir":3},{"reps":8,"reps_max":10,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones de tronco en el suelo', 3, 60,
    '[{"reps":12,"reps_max":15,"rir":3},{"reps":12,"reps_max":15,"rir":3},{"reps":12,"reps_max":15,"rir":2}]'::jsonb);

  -- Día B
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 1, 'Día B', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Remo con barra libre y agarre prono y amplio', 0, 120,
    '[{"tipo":"calentamiento","reps":12},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Press militar sentado con mancuernas', 1, 90,
    '[{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Peso muerto piernas rígidas con barra libre', 2, 120,
    '[{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones de codos de pie con mancuernas', 3, 75,
    '[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":1}]'::jsonb);

  -- Día C
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 2, 'Día C', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Press en prensa 45º', 0, 120,
    '[{"tipo":"calentamiento","reps":12},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones de rodillas tumbado en máquina de placas', 1, 90,
    '[{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":3},{"reps":10,"reps_max":12,"rir":2}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Extensiones de codo desde polea alta', 2, 75,
    '[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones plantar de pie con mancuernas', 3, 60,
    '[{"reps":15,"rir":2},{"reps":15,"rir":2},{"reps":15,"rir":1}]'::jsonb);
end $$;

-- ------------------------------------------------------------
-- PLANTILLA 2 — Empuje / Tracción / Pierna · Intermedio
-- ------------------------------------------------------------
do $$
declare
  v_rutina uuid;
  v_dia uuid;
begin
  insert into public.rutinas (nombre, es_plantilla, cliente_id, activa, notas)
  values (
    'Empuje / Tracción / Pierna — Intermedio', true, null, false,
    'Intermedios con 3-6 sesiones/semana (repitiendo el ciclo). RIR 1-2 en accesorios, 2 en básicos.'
  )
  returning id into v_rutina;

  -- Empuje
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 0, 'Empuje', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Press de banca inclinado 30º con barra', 0, 150,
    '[{"tipo":"calentamiento","reps":10},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Press militar sentado con mancuernas', 1, 120,
    '[{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Aberturas en banco plano con mancuernas', 2, 90,
    '[{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Elevaciones laterales de pie con mancuernas', 3, 60,
    '[{"reps":12,"reps_max":15,"rir":1},{"reps":12,"reps_max":15,"rir":1},{"reps":12,"reps_max":15,"rir":1},{"reps":12,"reps_max":15,"rir":0}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Extensiones de codo desde polea alta', 4, 75,
    '[{"reps":10,"reps_max":12,"rir":1},{"reps":10,"reps_max":12,"rir":1},{"reps":10,"reps_max":12,"rir":0}]'::jsonb);

  -- Tracción
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 1, 'Tracción', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Dominadas con agarre prono y amplio', 0, 150,
    '[{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Remo con barra libre y agarre prono y amplio', 1, 120,
    '[{"tipo":"calentamiento","reps":10},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Jalón con agarre neutro y amplio', 2, 90,
    '[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Abducciones de hombros entre poleas', 3, 60,
    '[{"reps":15,"rir":1},{"reps":15,"rir":1},{"reps":15,"rir":0}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones de codos en banco Scott con barra Z', 4, 75,
    '[{"reps":8,"reps_max":10,"rir":1},{"reps":8,"reps_max":10,"rir":1},{"reps":8,"reps_max":10,"rir":0}]'::jsonb);

  -- Pierna
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 2, 'Pierna', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Sentadilla con barra libre', 0, 180,
    '[{"tipo":"calentamiento","reps":10},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Peso muerto rumano con barra libre', 1, 120,
    '[{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Press en prensa 45º', 2, 120,
    '[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones de rodillas tumbado en máquina de placas', 3, 90,
    '[{"reps":10,"reps_max":12,"rir":1},{"reps":10,"reps_max":12,"rir":1},{"reps":10,"reps_max":12,"rir":0}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Flexiones plantar de pie con mancuernas', 4, 60,
    '[{"reps":15,"rir":1},{"reps":15,"rir":1},{"reps":15,"rir":1},{"reps":15,"rir":0}]'::jsonb);
end $$;

-- ------------------------------------------------------------
-- PLANTILLA 3 — Fuerza 5×5
-- ------------------------------------------------------------
do $$
declare
  v_rutina uuid;
  v_dia uuid;
begin
  insert into public.rutinas (nombre, es_plantilla, cliente_id, activa, notas)
  values (
    'Fuerza 5×5', true, null, false,
    'Avanzados centrados en fuerza. Alternar Día A / Día B en cada sesión (A-B-A una semana, B-A-B la siguiente). Progresión de carga semanal, RIR bajo en los básicos.'
  )
  returning id into v_rutina;

  -- Día A
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 0, 'Día A', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Sentadilla con barra libre', 0, 180,
    '[{"tipo":"calentamiento","reps":5},{"tipo":"calentamiento","reps":5},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":1},{"reps":5,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Press de banca plano con barra libre', 1, 180,
    '[{"tipo":"calentamiento","reps":5},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":1},{"reps":5,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Remo con barra libre y agarre prono y amplio', 2, 150,
    '[{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":1},{"reps":5,"rir":1}]'::jsonb);

  -- Día B
  insert into public.rutina_dias (rutina_id, orden, nombre, semana)
  values (v_rutina, 1, 'Día B', 1) returning id into v_dia;

  perform pg_temp.add_ejercicio(v_dia, 'Sentadilla con barra libre', 0, 180,
    '[{"tipo":"calentamiento","reps":5},{"tipo":"calentamiento","reps":5},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":1},{"reps":5,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Press miltar de pie con barra', 1, 150,
    '[{"tipo":"calentamiento","reps":5},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":2},{"reps":5,"rir":1},{"reps":5,"rir":1}]'::jsonb);
  perform pg_temp.add_ejercicio(v_dia, 'Peso muerto convencional con barra', 2, 180,
    '[{"tipo":"calentamiento","reps":5},{"tipo":"calentamiento","reps":3},{"reps":5,"rir":1}]'::jsonb);
end $$;

commit;
