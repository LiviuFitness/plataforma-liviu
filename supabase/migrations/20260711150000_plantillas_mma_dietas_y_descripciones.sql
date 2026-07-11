-- ============================================================
-- PLATAFORMA LIVIU — Migración 31:
--  · Plantilla de entreno para deportes de combate (MMA/lucha/boxeo).
--  · 8 plantillas de dieta base (mujer/hombre × 4 niveles de kcal),
--    solo con objetivos de macros (el entrenador rellena las comidas
--    reales al asignarla, con el generador automático o a mano).
--  · Descripción (notas) para las plantillas de entreno que se
--    quedaron sin ella en migraciones anteriores.
-- Nombres de ejercicio verificados EXACTAMENTE contra
-- supabase/migrations/20260704120000_biblioteca_liviu.sql, mismo
-- criterio que las migraciones 26 y 28.
-- ============================================================

-- ------------------------------------------------------------
-- Descripciones que faltaban
-- ------------------------------------------------------------
update public.rutinas set notas =
  '4 días · sentadilla, banca y peso muerto en días separados para avanzados. 5×5/3-5 RIR 1 en el básico del día + accesorios RIR 2.'
where es_plantilla and nombre = 'Fuerza Powerlifting 4 días — Intermedio/Avanzado' and notas is null;

update public.rutinas set notas =
  '6 días · rotación empuje/tirón/pierna A-B de alto volumen para avanzados con buena recuperación. RIR 1-2.'
where es_plantilla and nombre = 'Push/Pull/Legs 6 días — Avanzado' and notas is null;

update public.rutinas set notas =
  '3 días · circuitos en superserie para maximizar densidad de entreno en fase de definición. RIR 2 en todas las series.'
where es_plantilla and nombre = 'Definición Full Body 3 días — Superseries' and notas is null;

update public.rutinas set notas =
  '3 días · énfasis en tren inferior y glúteo, con un día de torso completo de mantenimiento. RIR 2.'
where es_plantilla and nombre = 'Pierna & Glúteo 3 días — Énfasis inferior' and notas is null;

update public.rutinas set notas =
  '2 días · primer contacto con el gimnasio, ejercicios básicos de máquina y peso libre. RIR alto (3) para aprender técnica sin fatiga excesiva.'
where es_plantilla and nombre = 'Full Body 2 días — Principiante' and notas is null;

update public.rutinas set notas =
  '4 días · división torso/pierna clásica para intermedios. RIR 2 en accesorios, algo más bajo en los básicos.'
where es_plantilla and nombre = 'Torso/Pierna 4 días — Intermedio' and notas is null;

update public.rutinas set notas =
  'Plantilla personal de Liviu — mesociclo de ejemplo, no forma parte del catálogo general.'
where es_plantilla and nombre = 'MESOCICLO_01 LIVIU' and notas is null;

update public.rutinas set notas =
  'Plantilla personal de Liviu — 3 días de pierna y 2 de torso, no forma parte del catálogo general.'
where es_plantilla and nombre = 'Entreno 3 Pierna 2 Torso' and notas is null;

-- ------------------------------------------------------------
-- Plantilla de entreno: deportes de combate
-- ------------------------------------------------------------
do $$
declare
  v_datos jsonb := '[{"nombre":"MMA / Deportes de combate 4 días — Fuerza y Acondicionamiento","dias":[{"nombre":"TREN INFERIOR","ejercicios":[{"nombre":"Sentadilla con barra libre","series":[{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2}],"descanso":180,"ss":null},{"nombre":"Peso muerto convencional con barra","series":[{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2}],"descanso":180,"ss":null},{"nombre":"Zancadas dinámicas","series":[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2}],"descanso":120,"ss":null},{"nombre":"Extensiones de cadera con barra libre","series":[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2}],"descanso":90,"ss":null},{"nombre":"Flexiones plantares con rodillas y cadera extendidas","series":[{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2}],"descanso":60,"ss":null}]},{"nombre":"TREN SUPERIOR Y AGARRE","ejercicios":[{"nombre":"Press de banca plano con barra libre","series":[{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2}],"descanso":150,"ss":null},{"nombre":"Dominadas asistidas en máquina con agarre prono","series":[{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2}],"descanso":150,"ss":null},{"nombre":"Remo con barra libre y agarre prono y amplio","series":[{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2}],"descanso":150,"ss":null},{"nombre":"Press miltar de pie con barra","series":[{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2}],"descanso":120,"ss":null},{"nombre":"Extensiones de codo desde polea alta","series":[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2}],"descanso":60,"ss":null},{"nombre":"Curl martillo de pie alterno con mancuernas","series":[{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2},{"reps":10,"reps_max":12,"rir":2}],"descanso":60,"ss":null}]},{"nombre":"NÚCLEO Y POTENCIA","ejercicios":[{"nombre":"Sentadilla frontal con barra libre","series":[{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2},{"reps":6,"reps_max":8,"rir":2}],"descanso":150,"ss":null},{"nombre":"Rack pull","series":[{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2},{"reps":5,"reps_max":5,"rir":2}],"descanso":150,"ss":null},{"nombre":"Peso muerto rumano con barra libre","series":[{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2},{"reps":8,"reps_max":10,"rir":2}],"descanso":150,"ss":null},{"nombre":"Curl nórdico","series":[{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2},{"reps":6,"reps_max":10,"rir":2}],"descanso":90,"ss":null},{"nombre":"Elevaciones de rodillas colgado en barra","series":[{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2}],"descanso":60,"ss":null},{"nombre":"Flexiones de tronco arrodillado con rueda","series":[{"reps":10,"reps_max":15,"rir":2},{"reps":10,"reps_max":15,"rir":2},{"reps":10,"reps_max":15,"rir":2}],"descanso":60,"ss":null}]},{"nombre":"ACONDICIONAMIENTO METABÓLICO","ejercicios":[{"nombre":"Press en prensa 45º","series":[{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2}],"descanso":45,"ss":"A"},{"nombre":"Remo en máquina de placas para espalda alta","series":[{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2}],"descanso":45,"ss":"A"},{"nombre":"Sentadillas búlgaras con mancuernas","series":[{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2}],"descanso":45,"ss":"B"},{"nombre":"Press de banca plano con mancuernas","series":[{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2},{"reps":12,"reps_max":15,"rir":2}],"descanso":45,"ss":"B"},{"nombre":"Elevaciones de rodillas colgado en barra","series":[{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2}],"descanso":45,"ss":"C"},{"nombre":"Flexiones de tronco en máquina","series":[{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2},{"reps":15,"reps_max":20,"rir":2}],"descanso":45,"ss":"C"}]}],"notas":"4 días · fuerza base + acondicionamiento para deportes de combate (MMA, lucha, boxeo). RIR 2 en fuerza; el día de acondicionamiento va en circuito con descansos cortos."}]'::jsonb;
  v_plantilla jsonb;
  v_dia jsonb;
  v_ej jsonb;
  v_rutina uuid;
  v_dia_id uuid;
  v_rutejercicio_id uuid;
  v_ejercicio_id uuid;
  v_orden_dia int;
  v_orden_ej int;
begin
  for v_plantilla in select * from jsonb_array_elements(v_datos)
  loop
    insert into public.rutinas (nombre, es_plantilla, activa, semana_actual, notas)
    values (v_plantilla->>'nombre', true, true, 1, v_plantilla->>'notas')
    returning id into v_rutina;

    v_orden_dia := 0;
    for v_dia in select * from jsonb_array_elements(v_plantilla->'dias')
    loop
      insert into public.rutina_dias (rutina_id, orden, nombre, semana)
      values (v_rutina, v_orden_dia, v_dia->>'nombre', 1)
      returning id into v_dia_id;
      v_orden_dia := v_orden_dia + 1;

      v_orden_ej := 0;
      for v_ej in select * from jsonb_array_elements(v_dia->'ejercicios')
      loop
        select id into v_ejercicio_id from public.ejercicios
        where nombre = v_ej->>'nombre'
        limit 1;

        if v_ejercicio_id is null then
          raise exception 'Ejercicio no encontrado en la biblioteca: %', v_ej->>'nombre';
        end if;

        insert into public.rutina_ejercicios
          (dia_id, ejercicio_id, orden, descanso_seg, grupo_superserie)
        values
          (v_dia_id, v_ejercicio_id, v_orden_ej, (v_ej->>'descanso')::int, v_ej->>'ss')
        returning id into v_rutejercicio_id;
        v_orden_ej := v_orden_ej + 1;

        insert into public.series_prescritas
          (rutina_ejercicio_id, orden, tipo, reps, reps_max, rir)
        select
          v_rutejercicio_id, (ord - 1)::int, 'efectiva',
          (se->>'reps')::int, (se->>'reps_max')::int, (se->>'rir')::int
        from jsonb_array_elements(v_ej->'series') with ordinality as t(se, ord);
      end loop;
    end loop;

    raise notice 'Plantilla creada: %', v_plantilla->>'nombre';
  end loop;
end $$;

-- ------------------------------------------------------------
-- Plantillas de dieta base (solo objetivos, sin comidas: el
-- entrenador las rellena al asignarlas). Reparto 30% proteína /
-- 40% carbohidrato / 30% grasa, un punto de partida razonable
-- para ajustar después según cada cliente.
-- ------------------------------------------------------------
insert into public.dietas (nombre, es_plantilla, activa, tipo, kcal_obj, prot_obj, carb_obj, gras_obj) values
  ('Mujer — 1400 kcal (déficit)', true, true, 'entreno', 1400, 105, 140, 47),
  ('Mujer — 1700 kcal (mantenimiento ligero)', true, true, 'entreno', 1700, 128, 170, 57),
  ('Mujer — 2000 kcal (mantenimiento)', true, true, 'entreno', 2000, 150, 200, 67),
  ('Mujer — 2300 kcal (superávit)', true, true, 'entreno', 2300, 173, 230, 77),
  ('Hombre — 2000 kcal (déficit)', true, true, 'entreno', 2000, 150, 200, 67),
  ('Hombre — 2400 kcal (mantenimiento ligero)', true, true, 'entreno', 2400, 180, 240, 80),
  ('Hombre — 2800 kcal (mantenimiento)', true, true, 'entreno', 2800, 210, 280, 93),
  ('Hombre — 3200 kcal (superávit)', true, true, 'entreno', 3200, 240, 320, 107);
