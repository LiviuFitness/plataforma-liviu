-- ============================================================
-- Copiar un día a las demás semanas de la rutina.
--
-- Las semanas son copias independientes (duplicar_semana crea filas
-- nuevas), cosa que está bien para progresar: la semana 2 tiene que
-- poder llevar más kilos que la 1. El problema es CORREGIR — si te
-- equivocaste de ejercicio en la semana 1, había que repetir el arreglo
-- semana por semana.
--
-- p_incluir_cargas decide qué se copia:
--   false → solo la estructura (ejercicios, orden, descansos, notas,
--           superseries). Las series de cada ejercicio que YA estaba en
--           la semana destino se conservan tal cual, así que no se
--           pierden las progresiones ya ajustadas. Los ejercicios nuevos
--           entran con las series del día de origen.
--   true  → el día se copia entero, cargas y reps incluidas, pisando
--           lo que hubiera.
-- ============================================================

create or replace function public.copiar_dia_a_semanas(
  p_dia uuid,
  p_semanas int[],
  p_incluir_cargas boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rutina uuid;
  v_orden int;
  v_nombre text;
  v_semana_origen int;
  v_destino int;
  v_dia_destino uuid;
  v_ej record;
  v_nuevo_ej uuid;
  v_series_previas jsonb;
  v_guardadas jsonb;
  v_copiadas int := 0;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede copiar días.';
  end if;

  select rutina_id, orden, nombre, semana
    into v_rutina, v_orden, v_nombre, v_semana_origen
  from public.rutina_dias where id = p_dia;

  if v_rutina is null then
    raise exception 'El día de origen no existe.';
  end if;

  foreach v_destino in array p_semanas loop
    continue when v_destino = v_semana_origen;

    /* El día equivalente se busca por posición (orden) y no por nombre:
     * renombrar un día es justo una de las correcciones que se quieren
     * propagar, así que el nombre no sirve para emparejar. */
    select id into v_dia_destino
    from public.rutina_dias
    where rutina_id = v_rutina and semana = v_destino and orden = v_orden
    limit 1;

    if v_dia_destino is null then
      insert into public.rutina_dias (rutina_id, orden, nombre, semana)
      values (v_rutina, v_orden, v_nombre, v_destino)
      returning id into v_dia_destino;
      v_series_previas := '{}'::jsonb;
    else
      /* Foto de las series que ya había, por ejercicio y por repetición
       * del mismo ejercicio dentro del día (un ejercicio puede salir dos
       * veces). Se usa para devolverlas después de rehacer el día. */
      select coalesce(jsonb_object_agg(clave, series), '{}'::jsonb)
        into v_series_previas
      from (
        select
          re.ejercicio_id::text || '#' ||
            row_number() over (partition by re.ejercicio_id order by re.orden)::text as clave,
          (
            select coalesce(jsonb_agg(to_jsonb(sp) order by sp.orden), '[]'::jsonb)
            from public.series_prescritas sp
            where sp.rutina_ejercicio_id = re.id
          ) as series
        from public.rutina_ejercicios re
        where re.dia_id = v_dia_destino
      ) previas;

      update public.rutina_dias set nombre = v_nombre where id = v_dia_destino;
      delete from public.rutina_ejercicios where dia_id = v_dia_destino;
    end if;

    for v_ej in
      select
        re.*,
        re.ejercicio_id::text || '#' ||
          row_number() over (partition by re.ejercicio_id order by re.orden)::text as clave
      from public.rutina_ejercicios re
      where re.dia_id = p_dia
      order by re.orden
    loop
      insert into public.rutina_ejercicios
        (dia_id, ejercicio_id, orden, descanso_seg, notas, grupo_superserie)
      values
        (v_dia_destino, v_ej.ejercicio_id, v_ej.orden, v_ej.descanso_seg,
         v_ej.notas, v_ej.grupo_superserie)
      returning id into v_nuevo_ej;

      v_guardadas := case
        when p_incluir_cargas then null
        else v_series_previas -> v_ej.clave
      end;

      if v_guardadas is not null and jsonb_array_length(v_guardadas) > 0 then
        -- Se conservan las series que el entrenador ya tenía ajustadas
        insert into public.series_prescritas
          (rutina_ejercicio_id, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto)
        select
          v_nuevo_ej,
          (s ->> 'orden')::int,
          s ->> 'tipo',
          (s ->> 'kg')::numeric,
          (s ->> 'reps')::int,
          (s ->> 'rir')::int,
          (s ->> 'reps_max')::int,
          s ->> 'tecnica',
          s ->> 'carga_texto'
        from jsonb_array_elements(v_guardadas) s;
      else
        insert into public.series_prescritas
          (rutina_ejercicio_id, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto)
        select v_nuevo_ej, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto
        from public.series_prescritas
        where rutina_ejercicio_id = v_ej.id
        order by orden;
      end if;
    end loop;

    v_copiadas := v_copiadas + 1;
  end loop;

  return v_copiadas;
end;
$$;

revoke all on function public.copiar_dia_a_semanas(uuid, int[], boolean) from public;
grant execute on function public.copiar_dia_a_semanas(uuid, int[], boolean) to authenticated;
