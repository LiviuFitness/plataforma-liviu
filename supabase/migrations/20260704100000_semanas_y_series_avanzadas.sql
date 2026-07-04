-- ============================================================
-- PLATAFORMA LIVIU — Migración 5: el método real de Liviu
--  · Semanas (microciclos) dentro de la rutina, duplicables
--  · Series con rango de reps, técnica de intensidad y carga con texto
--  · PRS (pre) en las sesiones y rest-pause en lo realizado
-- ============================================================

-- Semana activa que ve el cliente
alter table public.rutinas
  add column if not exists semana_actual integer not null default 1;

-- Cada día pertenece a una semana del mesociclo
alter table public.rutina_dias
  add column if not exists semana integer not null default 1;

-- Series prescritas: rango de reps (reps = mínimo, reps_max = máximo),
-- técnica de intensidad ("P", "P+ISO HOLD", "myo"...) y carga con texto ("goma azul")
alter table public.series_prescritas
  add column if not exists reps_max integer,
  add column if not exists tecnica text,
  add column if not exists carga_texto text;

-- Series realizadas: reps extra de rest-pause ("8 (+3)") y los mismos extras
alter table public.series_realizadas
  add column if not exists reps_extra integer,
  add column if not exists tecnica text,
  add column if not exists carga_texto text;

-- Estado previo a la sesión (PRS 1-5), además de la sensación posterior
alter table public.sesiones
  add column if not exists prs_pre integer check (prs_pre between 1 and 5);

-- ------------------------------------------------------------
-- RPC: duplicar una semana completa de la rutina (días,
-- ejercicios y series) como nueva semana, y activarla.
-- ------------------------------------------------------------
create or replace function public.duplicar_semana(p_rutina uuid, p_semana int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nueva int;
  v_dia record;
  v_nuevo_dia uuid;
  v_ej record;
  v_nuevo_ej uuid;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede duplicar semanas.';
  end if;

  select coalesce(max(semana), 0) + 1 into v_nueva
  from public.rutina_dias where rutina_id = p_rutina;

  for v_dia in
    select * from public.rutina_dias
    where rutina_id = p_rutina and semana = p_semana
    order by orden
  loop
    insert into public.rutina_dias (rutina_id, orden, nombre, semana)
    values (p_rutina, v_dia.orden, v_dia.nombre, v_nueva)
    returning id into v_nuevo_dia;

    for v_ej in
      select * from public.rutina_ejercicios where dia_id = v_dia.id order by orden
    loop
      insert into public.rutina_ejercicios (dia_id, ejercicio_id, orden, descanso_seg, notas)
      values (v_nuevo_dia, v_ej.ejercicio_id, v_ej.orden, v_ej.descanso_seg, v_ej.notas)
      returning id into v_nuevo_ej;

      insert into public.series_prescritas
        (rutina_ejercicio_id, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto)
      select v_nuevo_ej, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto
      from public.series_prescritas
      where rutina_ejercicio_id = v_ej.id;
    end loop;
  end loop;

  update public.rutinas set semana_actual = v_nueva where id = p_rutina;
  return v_nueva;
end;
$$;

-- ------------------------------------------------------------
-- Actualizar la asignación de plantillas para copiar también
-- las semanas y los campos nuevos de las series.
-- ------------------------------------------------------------
create or replace function public.asignar_plantilla_rutina(p_plantilla uuid, p_cliente uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rutina uuid;
  v_dia record;
  v_nuevo_dia uuid;
  v_ej record;
  v_nuevo_ej uuid;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede asignar plantillas.';
  end if;

  update public.rutinas set activa = false where cliente_id = p_cliente;

  insert into public.rutinas (cliente_id, nombre, es_plantilla, activa, notas, semana_actual)
  select p_cliente, nombre, false, true, notas, 1
  from public.rutinas
  where id = p_plantilla and es_plantilla
  returning id into v_rutina;

  if v_rutina is null then
    raise exception 'Plantilla de rutina no encontrada.';
  end if;

  for v_dia in
    select * from public.rutina_dias where rutina_id = p_plantilla order by semana, orden
  loop
    insert into public.rutina_dias (rutina_id, orden, nombre, semana)
    values (v_rutina, v_dia.orden, v_dia.nombre, v_dia.semana)
    returning id into v_nuevo_dia;

    for v_ej in
      select * from public.rutina_ejercicios where dia_id = v_dia.id order by orden
    loop
      insert into public.rutina_ejercicios (dia_id, ejercicio_id, orden, descanso_seg, notas)
      values (v_nuevo_dia, v_ej.ejercicio_id, v_ej.orden, v_ej.descanso_seg, v_ej.notas)
      returning id into v_nuevo_ej;

      insert into public.series_prescritas
        (rutina_ejercicio_id, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto)
      select v_nuevo_ej, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto
      from public.series_prescritas
      where rutina_ejercicio_id = v_ej.id;
    end loop;
  end loop;

  return v_rutina;
end;
$$;
